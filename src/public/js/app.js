// Use same-origin proxy endpoint; server will forward to external API_URL
const API_BASE = '/api';

// Debug: indicate file loaded
console.log('app.js loaded');

// Auth
async function apiLogin(username, password) {
    try {
        const url = `${API_BASE}/auth/login`;
        console.log('apiLogin -> sending', { url, username });
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Login failed');
        }
        const json = await res.json();
        console.log('apiLogin <- response', json);
        return json;
    } catch (err) {
        // Network errors (e.g., CORS or API down) surface here
        console.error('apiLogin network/error', err);
        throw err;
    }
}

function saveToken(token) {
    localStorage.setItem('apiToken', token);
}

function getToken() {
    return localStorage.getItem('apiToken');
}

function clearToken() {
    localStorage.removeItem('apiToken');
}

async function fetchWithAuth(path, opts = {}) {
    const token = getToken();
    opts.headers = opts.headers || {};
    opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    console.log('fetchWithAuth ->', { url: API_BASE + path, headers: opts.headers, method: opts.method || 'GET' });
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Request failed ${res.status}`);
    }
    return await res.json();
}

// Data fetchers
async function loadMinistries() {
    return await fetchWithAuth('/ministries');
}

async function loadEvents() {
    return await fetchWithAuth('/events');
}

async function createEventClient(data) {
    return await fetchWithAuth('/events', { method: 'POST', body: JSON.stringify(data) });
}

async function loadPeople() {
    return await fetchWithAuth('/people');
}

// UI helpers
async function handleLoginForm(e) {
    console.log('handleLoginForm triggered');
    e.preventDefault();
    const username = document.querySelector('input[name="username"]').value;
    const password = document.querySelector('input[name="password"]').value;
    try {
        const data = await apiLogin(username, password);
        saveToken(data.token);
        // Also set server session so protected pages work with server-side requireAuth
        try {
            console.log('Setting server session');
            const sessRes = await fetch('/session', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: data.token, user: data.user })
            });
            const sessJson = await sessRes.json().catch(()=>null);
            console.log('session set response', sessRes.status, sessJson, sessRes.headers);
        } catch (e) {
            console.warn('Could not set server session:', e);
        }
        window.location = '/';
    } catch (err) {
        console.error('Login failed', err);
        // show inline error if element exists
        const errEl = document.querySelector('#login-error');
        if (errEl) {
            errEl.textContent = err.message || String(err);
            errEl.style.display = 'block';
        } else {
            alert('Erro no login: ' + (err.message || String(err)));
        }
    }
}

// Attach login form listener if present
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - app.js');
    const loginForm = document.querySelector('#login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginForm);
        // mark form so QA/dev can see the listener is attached
        try { loginForm.dataset.jsAttached = 'true'; } catch(e){}
        console.log('login form listener attached');
    }
    // Fallback: also attach to button click in case form submission behaves unexpectedly
    const loginBtn = document.querySelector('#login-button');
    if (loginBtn) {
        loginBtn.addEventListener('click', (ev) => {
            // if handler already prevented default via submit, this will do the same
            handleLoginForm(ev);
        });
        console.log('login button click listener attached');
    }

    // Example: auto-load ministries on home
    const ministriesContainer = document.querySelector('#ministries-list');
    if (ministriesContainer) {
        loadMinistries().then(list => {
            ministriesContainer.innerHTML = '';
            if (Array.isArray(list) && list.length) {
                list.forEach(m => {
                    const li = document.createElement('li');
                    li.textContent = m.name || JSON.stringify(m);
                    ministriesContainer.appendChild(li);
                });
            } else {
                ministriesContainer.innerHTML = '<p>Nenhum ministério cadastrado.</p>';
            }
        }).catch(err => {
            console.error('loadMinistries error', err);
            ministriesContainer.innerHTML = '<p>Não foi possível carregar ministérios.</p>';
        });
    }

    const eventsContainer = document.querySelector('#events-list');
    if (eventsContainer) {
        loadEvents().then(list => {
            eventsContainer.innerHTML = '';
            if (Array.isArray(list) && list.length) {
                list.forEach(ev => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${new Date(ev.date).toLocaleDateString()}</td><td>${ev.title || ev.name || ''}</td><td>${ev.ministryId || ev.ministry || ''}</td><td>${(ev.assignments||[]).map(a=>a.personId).join(', ')}</td>`;
                    eventsContainer.appendChild(tr);
                });
            } else {
                eventsContainer.innerHTML = '<tr><td colspan="4">Nenhum evento cadastrado</td></tr>';
            }
        }).catch(err => {
            console.error('loadEvents error', err);
            eventsContainer.innerHTML = '<tr><td colspan="4">Não foi possível carregar eventos.</td></tr>';
        });
    }
});
