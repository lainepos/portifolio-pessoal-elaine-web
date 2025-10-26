const axios = require('axios');

class ApiService {
    constructor() {
        this.api = axios.create({
            baseURL: process.env.API_URL,
            timeout: 5000
        });

        // Add response interceptor for error handling
        this.api.interceptors.response.use(
            response => response.data,
            error => {
                const status = error.response?.status || 500;
                const message = error.response?.data?.message || 'Um erro ocorreu';
                const err = new Error(message);
                err.status = status;
                throw err;
            }
        );
    }

    setAuthToken(token) {
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Auth endpoints
    async login(username, password) {
        const response = await this.api.post('/api/auth/login', { username, password });
        if (response.token) {
            this.setAuthToken(response.token);
        }
        return response;
    }

    // Ministries endpoints
    async getMinistries() {
        return await this.api.get('/api/ministries');
    }

    async createMinistry(data) {
        return await this.api.post('/api/ministries', data);
    }

    // People endpoints
    async getPeople() {
        return await this.api.get('/api/people');
    }

    async createPerson(data) {
        return await this.api.post('/api/people', data);
    }

    // Events endpoints
    async getEvents() {
        return await this.api.get('/api/events');
    }

    async createEvent(data) {
        return await this.api.post('/api/events', data);
    }
}

module.exports = new ApiService();