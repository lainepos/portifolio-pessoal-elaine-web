const express = require('express');
const router = express.Router();
const apiService = require('../services/api');

// Helper to set auth token from incoming request (if present)
function setTokenFromReq(req) {
    const auth = req.headers['authorization'] || req.headers['Authorization'];
    if (auth && auth.startsWith('Bearer ')) {
        try {
            apiService.setAuthToken(auth.replace(/^Bearer\s+/i, ''));
        } catch (e) {
            console.warn('Could not set token on apiService:', e.message);
        }
    }
}

// Auth
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await apiService.login(username, password);
        res.json(result);
    } catch (err) {
        console.error('Proxy /auth/login error', err.message || err);
        res.status(err.status || 500).json({ message: err.message || 'Erro no proxy de autenticação' });
    }
});

// Ministries
router.get('/ministries', async (req, res) => {
    try {
        setTokenFromReq(req);
        const list = await apiService.getMinistries();
        res.json(list);
    } catch (err) {
        console.error('Proxy /ministries error', err.message || err);
        res.status(err.status || 500).json({ message: err.message || 'Erro ao listar ministérios' });
    }
});

router.post('/ministries', async (req, res) => {
    try {
        setTokenFromReq(req);
        const created = await apiService.createMinistry(req.body);
        res.json(created);
    } catch (err) {
        console.error('Proxy POST /ministries error', err.message || err);
        res.status(err.status || 500).json({ message: err.message || 'Erro ao criar ministério' });
    }
});

// People
router.get('/people', async (req, res) => {
    try {
        setTokenFromReq(req);
        const list = await apiService.getPeople();
        res.json(list);
    } catch (err) {
        console.error('Proxy /people error', err.message || err);
        res.status(err.status || 500).json({ message: err.message || 'Erro ao listar pessoas' });
    }
});

router.post('/people', async (req, res) => {
    try {
        setTokenFromReq(req);
        const created = await apiService.createPerson(req.body);
        res.json(created);
    } catch (err) {
        console.error('Proxy POST /people error', err.message || err);
        res.status(err.status || 500).json({ message: err.message || 'Erro ao criar pessoa' });
    }
});

// Events
router.get('/events', async (req, res) => {
    try {
        setTokenFromReq(req);
        const list = await apiService.getEvents();
        res.json(list);
    } catch (err) {
        console.error('Proxy /events error', err.message || err);
        res.status(err.status || 500).json({ message: err.message || 'Erro ao listar eventos' });
    }
});

router.post('/events', async (req, res) => {
    try {
        setTokenFromReq(req);
        const created = await apiService.createEvent(req.body);
        res.json(created);
    } catch (err) {
        console.error('Proxy POST /events error', err.message || err);
        res.status(err.status || 500).json({ message: err.message || 'Erro ao criar evento' });
    }
});

module.exports = router;
