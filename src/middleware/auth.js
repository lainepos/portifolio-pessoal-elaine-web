const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        // Check if we have a token in the session
        if (!req.session.token) {
            return res.redirect('/login');
        }

        // Verify the token
        const decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);
        req.user = decoded;
        
        // Add token to service calls
        req.token = req.session.token;
        
        next();
    } catch (error) {
        req.session.destroy();
        res.redirect('/login');
    }
};

module.exports = authMiddleware;