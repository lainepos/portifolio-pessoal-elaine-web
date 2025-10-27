const express = require('express');
const router = express.Router();
const authService = require('../services/auth');
const apiService = require('../services/api');

// Auth middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// Login routes
router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Allow client to set a server session after client-side login (POST { token, user })
router.post('/session', (req, res) => {
    try {
        const { token, user } = req.body || {};
        if (!token) return res.status(400).json({ message: 'token required' });
        req.session.token = token;
        // if API returned user info, store it; otherwise decode later if necessary
        req.session.user = user || { username: 'unknown' };
        try {
            apiService.setAuthToken(token);
        } catch (e) {
            console.warn('Could not set API auth token from /session:', e.message);
        }
        return res.json({ ok: true });
    } catch (err) {
        console.error('Error setting session:', err.message || err);
        return res.status(500).json({ message: 'Could not set session' });
    }
});

router.post('/login', async (req, res) => {
    try {
        console.log('POST /login body:', req.body);
        const { username, password } = req.body;
        const result = await authService.login(username, password);
        console.log('Auth result:', result);
        
        // Store user info and token in session
        req.session.user = result.user;
        req.session.token = result.token;
        // If API service exists, set token for subsequent API calls
        try {
            apiService.setAuthToken(result.token);
        } catch (e) {
            console.warn('Could not set API auth token:', e.message);
        }
        
        res.redirect('/');
    } catch (error) {
        console.error('Login error:', error.message);
        res.render('login', { error: error.message });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// People page (protected)
router.get('/pessoas', async (req, res) => {
    // render view; client JS will populate list and handle creation
    res.render('people');
});

// Protected routes
router.use(requireAuth);

router.get('/', async (req, res) => {
    // Try to fetch ministries and events from API, fall back to empty arrays
    let ministries = [];
    let events = [];
    try {
        if (req.session.token) apiService.setAuthToken(req.session.token);
        ministries = await apiService.getMinistries();
    } catch (e) {
        console.warn('Could not fetch ministries:', e.message);
        ministries = [];
    }

    try {
        if (req.session.token) apiService.setAuthToken(req.session.token);
        events = await apiService.getEvents();
    } catch (e) {
        console.warn('Could not fetch events:', e.message);
        events = [];
    }

    res.render('home', { user: req.session.user, ministries, events });
});

router.get('/ministerios', async (req, res) => {
    let ministries = [];
    try {
        if (req.session.token) apiService.setAuthToken(req.session.token);
        ministries = await apiService.getMinistries();
    } catch (e) {
        console.warn('Could not fetch ministries:', e.message);
        ministries = [];
    }
    res.render('ministries', { user: req.session.user, ministries });
});

router.get('/eventos', async (req, res) => {
    let events = [];
    let ministries = [];
    let people = [];
    try {
        if (req.session.token) apiService.setAuthToken(req.session.token);
        events = await apiService.getEvents();
    } catch (e) {
        console.warn('Could not fetch events:', e.message);
        events = [];
    }
    try {
        if (req.session.token) apiService.setAuthToken(req.session.token);
        ministries = await apiService.getMinistries();
    } catch (e) {
        ministries = [];
    }
    try {
        if (req.session.token) apiService.setAuthToken(req.session.token);
        people = await apiService.getPeople();
    } catch (e) {
        people = [];
    }
    res.render('events', { user: req.session.user, events, ministries, people });
});

module.exports = router;