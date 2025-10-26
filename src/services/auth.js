const jwt = require('jsonwebtoken');
const users = require('../config/users');

class AuthService {
    async login(username, password) {
        console.log('Auth attempt:', { username, password }); // Debug log
        const user = users.find(u => u.username === username && u.password === password);
        
        console.log('Found user:', user); // Debug log
        
        if (!user) {
            throw new Error('Credenciais inválidas');
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        };
    }
}

module.exports = new AuthService();