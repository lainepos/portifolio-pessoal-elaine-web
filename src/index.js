require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// Serve Bulma from node_modules so header can reference /bulma/bulma.min.css
app.use('/bulma', express.static(path.join(__dirname, '../node_modules/bulma/css')));

// Simple request logger for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Session setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
// Mount API proxy to forward calls to configured API (helps avoid CORS)
const apiProxy = require('./routes/apiProxy');
app.use('/api', apiProxy);

const indexRouter = require('./routes/index');
app.use('/', indexRouter);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});