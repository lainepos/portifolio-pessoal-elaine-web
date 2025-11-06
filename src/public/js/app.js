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

// cache people list in-memory for faster name lookups
let _peopleCache = null;
async function ensurePeopleCache() {
    if (_peopleCache) return _peopleCache;
    try {
        _peopleCache = await fetchWithAuth('/people');
    } catch (e) {
        console.warn('Could not load people for name mapping', e);
        _peopleCache = [];
    }
    return _peopleCache;
}

function buildPeopleMap(peopleList) {
    const map = {};
    (peopleList || []).forEach(p => {
        const id = p.id || p._id || p.personId || p.id;
        const name = p.name || p.fullName || (p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : p.username) || id;
        if (id) map[id] = name;
    });
    return map;
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

    // small people list on home
    const membersEl = document.querySelector('#people-home-members');
    const leadersEl = document.querySelector('#people-home-leaders');
    if (membersEl || leadersEl) {
        loadPeople().then(list => {
            const members = (list||[]).filter(p => (p.role || '').toLowerCase() !== 'leader');
            const leaders = (list||[]).filter(p => (p.role || '').toLowerCase() === 'leader');

            if (membersEl) {
                membersEl.innerHTML = '';
                if (members.length) {
                    const ul = document.createElement('ul');
                    members.forEach(p => { const li = document.createElement('li'); li.textContent = p.name; ul.appendChild(li); });
                    membersEl.appendChild(ul);
                } else membersEl.innerHTML = '<p>Nenhum membro cadastrado.</p>';
            }

            if (leadersEl) {
                leadersEl.innerHTML = '';
                if (leaders.length) {
                    const ul = document.createElement('ul');
                    leaders.forEach(p => { const li = document.createElement('li'); li.textContent = p.name; ul.appendChild(li); });
                    leadersEl.appendChild(ul);
                } else leadersEl.innerHTML = '<p>Nenhum líder cadastrado.</p>';
            }
        }).catch(err => {
            console.error('loadPeople error', err);
            if (membersEl) membersEl.innerHTML = '<p>Não foi possível carregar pessoas.</p>';
            if (leadersEl) leadersEl.innerHTML = '<p>Não foi possível carregar pessoas.</p>';
        });
    }

    // Ministries page: render grid and wire modal
    const ministriesGrid = document.getElementById('ministries-grid');
    if (ministriesGrid) {
        // render once
        (async () => {
            try {
                await renderMinistriesGrid();
            } catch (e) {
                console.error('renderMinistriesGrid error', e);
                ministriesGrid.innerHTML = '<div class="notification is-warning">Não foi possível carregar ministérios.</div>';
            }
        })();
    }

    const eventsContainer = document.querySelector('#events-list');
    if (eventsContainer) {
        loadEvents().then(async list => {
            eventsContainer.innerHTML = '';
            if (Array.isArray(list) && list.length) {
                const people = await ensurePeopleCache();
                const peopleMap = buildPeopleMap(people);
                list.forEach(ev => {
                    const assignedNames = (ev.assignments || []).map(a => {
                        const pid = a.personId || a.person || a.person_id || a.id;
                        return peopleMap[pid] || pid || '---';
                    }).join(', ');
                        const tr = document.createElement('tr');
                        const ministryDisplay = ev.ministryName || ev.ministry || ev.ministryId || '';
                        tr.innerHTML = `<td>${new Date(ev.date).toLocaleDateString()}</td><td>${ev.title || ev.name || ''}</td><td>${ministryDisplay}</td><td>${assignedNames}</td>`;
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

    // People page: render list and wire modal/filter
    const peopleListEl = document.getElementById('people-list');
    if (peopleListEl) {
        (async () => {
            try {
                await renderPeopleList();
                const filter = document.getElementById('people-filter');
                if (filter) {
                    filter.addEventListener('input', debounce(() => renderPeopleList(filter.value), 250));
                }
            } catch (e) {
                console.error('renderPeopleList error', e);
                peopleListEl.innerHTML = '<div class="notification is-warning">Não foi possível carregar pessoas.</div>';
            }
        })();
    }
});

// debounce helper
function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function renderPeopleList(filter = '') {
    const el = document.getElementById('people-list');
    if (!el) return;
    let list = [];
    try { list = await loadPeople(); } catch (e) { console.error(e); }
    const q = (filter || '').toLowerCase().trim();
    el.innerHTML = '';
    (list || []).filter(p => {
        if (!q) return true;
        return (p.name || '').toLowerCase().includes(q) || (p.phone || '').includes(q) || ((p.ministries||[]).join(', ').toLowerCase().includes(q));
    }).forEach(p => {
        const col = document.createElement('div');
        col.className = 'column is-one-quarter';
        const box = document.createElement('div');
        box.className = 'box';
        box.innerHTML = `<strong>${p.name}</strong><div>${p.phone || ''}</div><div>${(p.ministries||[]).join(', ')}</div><div><em>${p.role}</em></div>`;
        col.appendChild(box);
        el.appendChild(col);
    });
}

function openNewPersonModal() { const m = document.getElementById('newPersonModal'); if (m) m.classList.add('is-active'); }
function closeNewPersonModal() { const m = document.getElementById('newPersonModal'); if (m) m.classList.remove('is-active'); }

async function createPerson(ev) {
    ev.preventDefault();
    const form = ev.target;
    const ministries = (form.ministries.value || '').split(',').map(s=>s.trim()).filter(Boolean);
    const data = { name: form.name.value, phone: form.phone.value, ministries, role: form.role.value };
    try {
        await fetchWithAuth('/people', { method: 'POST', body: JSON.stringify(data) });
        closeNewPersonModal();
        const filterInput = document.getElementById('people-filter');
        await renderPeopleList(filterInput ? filterInput.value : '');
    } catch (err) {
        console.error('createPerson error', err);
        alert('Erro ao criar pessoa: ' + (err.message || String(err)));
    }
}

// Ministries helpers
async function renderMinistriesGrid() {
    const grid = document.getElementById('ministries-grid');
    if (!grid) return;
    const list = await loadMinistries();
    grid.innerHTML = '';
    if (!Array.isArray(list) || !list.length) {
        grid.innerHTML = '<div class="column"><div class="box">Nenhum ministério cadastrado</div></div>';
        return;
    }
    list.forEach(m => {
        const col = document.createElement('div');
        col.className = 'column is-one-quarter';
        const box = document.createElement('div');
        box.className = 'box';
        box.innerHTML = `<strong>${m.name || m.title || m.id}</strong><div>${m.description || ''}</div>`;
        col.appendChild(box);
        grid.appendChild(col);
    });
}

// Calendar rendering
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function endOfMonth(date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0); }

// calendar state
let _calendarYear = (new Date()).getFullYear();
let _calendarMonth = (new Date()).getMonth(); // 0-based

const CAL_MAX_YEAR = 2026;
const CAL_MAX_MONTH = 11; // December 2026

function monthLabel(year, month) {
    return new Date(year, month, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

async function renderCalendar(containerId = 'calendar-container', year = _calendarYear, month = _calendarMonth) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let events = [];
    try { events = await loadEvents(); } catch (e) { console.warn('Could not load events for calendar', e); }

    // reference date for this month
    const ref = new Date(year, month, 1);

    // find first day to display (start of week containing start)
    const start = startOfMonth(ref);
    const startDay = new Date(start);
    startDay.setDate(start.getDate() - ((start.getDay()+6)%7)); // Monday-first

    const totalDays = 42; // 6 weeks
    const dayCells = [];
    for (let i=0;i<totalDays;i++) {
        const d = new Date(startDay);
        d.setDate(startDay.getDate() + i);
        dayCells.push(d);
    }

    const eventDates = new Set((events||[]).map(ev => new Date(ev.date).toISOString().slice(0,10)));

    container.innerHTML = '';
    const cal = document.createElement('div');
    cal.className = 'calendar';
    // headers
    const headers = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    headers.forEach(h => { const hd = document.createElement('div'); hd.className='day header'; hd.textContent = h; cal.appendChild(hd); });

    dayCells.forEach(d => {
        const iso = d.toISOString().slice(0,10);
        const dayEl = document.createElement('div');
        dayEl.className = 'day' + ((d.getMonth() !== month) ? ' other-month' : '') + (eventDates.has(iso) ? ' has-event' : '');
        const dateEl = document.createElement('div'); dateEl.className='date'; dateEl.textContent = d.getDate();
        dayEl.appendChild(dateEl);
        // add native tooltip with event names when there are events on this day
        if (eventDates.has(iso)) {
            const evs = (events || []).filter(ev => ev.date && ev.date.slice(0,10) === iso);
            const titles = evs.map(ev => ev.title || ev.name || '').filter(Boolean);
            if (titles.length) {
                dayEl.title = titles.join(', ');
            }
        }
        cal.appendChild(dayEl);
    });

    container.appendChild(cal);

    // set month label if present
    const label = document.getElementById('calendar-month-label');
    if (label) label.textContent = monthLabel(year, month);

    // wire prev/next buttons
    const prevBtn = document.getElementById('cal-prev');
    const nextBtn = document.getElementById('cal-next');
    if (prevBtn) {
        prevBtn.onclick = () => {
            // move back one month
            let y = _calendarYear;
            let m = _calendarMonth - 1;
            if (m < 0) { m = 11; y -= 1; }
            _calendarYear = y; _calendarMonth = m;
            renderCalendar(containerId, _calendarYear, _calendarMonth);
        };
    }
    if (nextBtn) {
        nextBtn.onclick = () => {
            // prevent advancing beyond Dec 2026
            let y = _calendarYear;
            let m = _calendarMonth + 1;
            if (m > 11) { m = 0; y += 1; }
            if (y > CAL_MAX_YEAR || (y === CAL_MAX_YEAR && m > CAL_MAX_MONTH)) {
                // do not advance
                return;
            }
            _calendarYear = y; _calendarMonth = m;
            renderCalendar(containerId, _calendarYear, _calendarMonth);
        };
    }
}

// auto-render calendar on home if container present
(function autoRenderCalendar(){
    if (document.getElementById('calendar-container')) {
        const now = new Date();
        _calendarYear = now.getFullYear();
        _calendarMonth = now.getMonth();
        renderCalendar('calendar-container', _calendarYear, _calendarMonth);
    }
})();

function openNewMinistryModal() {
    const modal = document.getElementById('newMinistryModal');
    if (modal) modal.classList.add('is-active');
}

function closeNewMinistryModal() {
    const modal = document.getElementById('newMinistryModal');
    if (modal) modal.classList.remove('is-active');
}

async function createMinistry(ev) {
    ev.preventDefault();
    const form = ev.target;
    const data = {
        name: form.name.value,
        description: form.description.value
    };
    try {
        await fetchWithAuth('/ministries', { method: 'POST', body: JSON.stringify(data) });
        closeNewMinistryModal();
        await renderMinistriesGrid();
    } catch (err) {
        console.error('createMinistry error', err);
        alert('Erro ao criar ministério: ' + (err.message || String(err)));
    }
}
