/* ==========================================================================
   FLAKE — Main Application
   SPA with hash-based routing. Only one vote action: flake.
   ========================================================================== */

const API = '/api';
const app = document.getElementById('app');

// ---------------------------------------------------------------------------
// Session helpers — store tokens per room code in localStorage
// ---------------------------------------------------------------------------
function getSession(code) {
  try { return JSON.parse(localStorage.getItem(`flake:${code}`)) || null; }
  catch { return null; }
}

function setSession(code, data) {
  localStorage.setItem(`flake:${code}`, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function toast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
function getRoute() { return window.location.hash.slice(1) || '/'; }
function navigate(path) { window.location.hash = path; }

function matchRoute(route) {
  let m = route.match(/^\/room\/([A-Z0-9]+)$/i);
  if (m) return { view: 'room', code: m[1].toUpperCase() };

  if (route === '/create') return { view: 'create' };

  return { view: 'home' };
}

let pollTimer = null;

function router() {
  clearInterval(pollTimer);
  const route = getRoute();
  const { view, code } = matchRoute(route);

  switch (view) {
    case 'home': renderHome(); break;
    case 'create': renderCreate(); break;
    case 'room': renderRoom(code); break;
    default: renderHome();
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// ---------------------------------------------------------------------------
// SVG Icons (inline, no deps)
// ---------------------------------------------------------------------------
const icons = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
};

// ---------------------------------------------------------------------------
// VIEW: Home
// ---------------------------------------------------------------------------
function renderHome() {
  app.innerHTML = `
    <div class="page">
      <div class="hero stagger">
        <div class="brand" style="margin-bottom: 2rem;">
          flake<span class="brand-accent">.</span>
        </div>
        <h1>Cancel plans,<br/>guilt-free.</h1>
        <p class="tagline">
          A blind vote for your friend group. If everyone secretly wants to bail,
          you all find out. If it's just you — your secret is safe.
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary" id="btn-create">Create an Event</button>
          <div class="or-divider">or join with a code</div>
          <div class="code-input-row">
            <input type="text" class="form-input" id="join-code" placeholder="ABCDEF"
              maxlength="6" autocomplete="off" spellcheck="false" />
            <button class="btn btn-secondary btn-sm" id="btn-join-code">Join</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-create').addEventListener('click', () => navigate('/create'));

  document.getElementById('btn-join-code').addEventListener('click', () => {
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (code.length >= 4) navigate(`/room/${code}`);
  });

  document.getElementById('join-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-join-code').click();
  });
}

// ---------------------------------------------------------------------------
// VIEW: Create
// ---------------------------------------------------------------------------
function renderCreate() {
  app.innerHTML = `
    <nav class="nav">
      <button class="nav-back" id="nav-back">${icons.arrow} Back</button>
      <div class="brand">flake<span class="brand-accent">.</span></div>
    </nav>
    <div class="page">
      <div class="page-inner stagger">
        <div class="stack-sm" style="margin-bottom: 2rem;">
          <h2>Create an Event</h2>
          <p class="text-dim text-sm">Set up the blind vote. Share the code. See who really wants to bail.</p>
        </div>
        <form id="create-form" class="form-stack">
          <div class="form-group">
            <label class="form-label" for="event-name">Event Name</label>
            <input class="form-input" id="event-name" type="text" placeholder="Friday Night Dinner" required autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="group-size">How many people in the plan?</label>
            <input class="form-input form-input-number" id="group-size" type="number" min="2" max="50" value="3" required />
            <span class="form-hint">This can be changed later by anyone in the group.</span>
          </div>
          <div id="create-error"></div>
          <button class="btn btn-primary" type="submit" id="btn-submit-create">Create & Get Link</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('nav-back').addEventListener('click', () => navigate('/'));

  document.getElementById('create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-create');
    const errorEl = document.getElementById('create-error');
    errorEl.innerHTML = '';

    const name = document.getElementById('event-name').value.trim();
    const groupSize = parseInt(document.getElementById('group-size').value, 10);
    if (!name || !groupSize) return;

    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
      const data = await api('/rooms', { method: 'POST', body: { name, groupSize } });
      navigate(`/room/${data.code}`);
    } catch (err) {
      errorEl.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = 'Create & Get Link';
    }
  });
}

// ---------------------------------------------------------------------------
// VIEW: Room — The main experience
// ---------------------------------------------------------------------------
function renderRoom(code) {
  app.innerHTML = `
    <nav class="nav">
      <button class="nav-back" id="nav-back">${icons.arrow} Home</button>
      <div class="brand">flake<span class="brand-accent">.</span></div>
    </nav>
    <div class="page">
      <div class="page-inner page-wide">
        <div id="room-loading" class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
        <div id="room-content" style="display:none;"></div>
        <div id="room-error" style="display:none;"></div>
      </div>
    </div>
  `;

  document.getElementById('nav-back').addEventListener('click', () => {
    clearInterval(pollTimer);
    navigate('/');
  });

  loadRoom(code);
}

async function loadRoom(code) {
  const session = getSession(code);
  const tokenParam = session ? `?token=${session.token}` : '';

  try {
    const data = await api(`/rooms/${code}${tokenParam}`);

    document.getElementById('room-loading').style.display = 'none';
    document.getElementById('room-error').style.display = 'none';
    const content = document.getElementById('room-content');
    content.style.display = 'block';

    const shareUrl = `${window.location.origin}/#/room/${code}`;
    const isFlaker = data.isFlaker;

    content.innerHTML = `
      <div class="stack-lg stagger">
        <!-- Event header -->
        <div class="stack-xs">
          <span class="section-label">Event</span>
          <h2>${escapeHtml(data.name)}</h2>
        </div>

        <!-- Share section -->
        <div class="stack-sm">
          <span class="section-label">Share with your group</span>
          <div class="room-code">
            ${code.split('').map(c => `<span class="room-code-char">${c}</span>`).join('')}
          </div>
          <div class="share-link">
            <div class="share-link-url" id="share-url">${shareUrl}</div>
            <button class="share-link-copy" id="btn-copy">Copy Link</button>
          </div>
        </div>

        <!-- Group size (editable) -->
        <div class="stack-sm">
          <span class="section-label">Group Size</span>
          <div class="group-size-row">
            <div class="group-size-display">
              <span class="group-size-number" id="group-size-val">${data.groupSize}</span>
              <span class="group-size-label">people in the plan</span>
            </div>
            <div class="group-size-controls">
              <button class="btn-round" id="btn-size-down" ${data.groupSize <= 2 ? 'disabled' : ''}>-</button>
              <button class="btn-round" id="btn-size-up" ${data.groupSize >= 50 ? 'disabled' : ''}>+</button>
            </div>
          </div>
        </div>

        <!-- Flake status -->
        <div class="flake-status-section stack-sm">
          ${renderFlakeStatus(data, isFlaker, code)}
        </div>

        <!-- Flake action or flaker list -->
        ${!isFlaker ? renderFlakeAction(code) : renderFlakerView(data)}
      </div>
    `;

    bindRoomEvents(code, data);

    // Poll for updates every 5s
    clearInterval(pollTimer);
    pollTimer = setInterval(() => refreshRoom(code), 5000);

  } catch (err) {
    document.getElementById('room-loading').style.display = 'none';
    document.getElementById('room-error').style.display = 'block';
    document.getElementById('room-error').innerHTML = `
      <div class="text-center stack">
        <h2>Room not found</h2>
        <p class="text-dim">Check the code and try again.</p>
        <button class="btn btn-secondary" onclick="location.hash='/'">Go Home</button>
      </div>
    `;
  }
}

function renderFlakeStatus(data, isFlaker, code) {
  const { flakeCount, groupSize, allFlaked } = data;

  if (allFlaked) {
    return `
      <div class="flake-revelation card">
        <div class="flake-revelation-inner text-center stack-sm">
          <div class="revelation-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="var(--accent)" stroke-width="2.5"/>
              <path d="M15 21c0-1.5 1.5-3.5 3.5-3.5S22 19.5 22 21M26 21c0-1.5 1.5-3.5 3.5-3.5S33 19.5 33 21" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
              <path d="M16 30c1.5 3 4.5 5 8 5s6.5-2 8-5" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h2>Everyone wants to flake!</h2>
          <p class="text-dim">All ${groupSize} of ${groupSize} want out. Plans cancelled. Stay cozy.</p>
        </div>
      </div>
    `;
  }

  // Only show status to flakers
  if (!isFlaker) {
    return '';
  }

  // Progress bar
  const pct = Math.min((flakeCount / groupSize) * 100, 100);

  return `
    <span class="section-label">Flake Status</span>
    <div class="flake-meter">
      <div class="flake-meter-bar" style="width: ${pct}%"></div>
    </div>
    <div class="flake-meter-label">
      <span>${flakeCount} of ${groupSize} want to flake</span>
    </div>
  `;
}

function renderFlakeAction(code) {
  return `
    <div class="stack-sm">
      <div class="card flake-card">
        <div class="stack-sm">
          <h3>Want to bail?</h3>
          <p class="text-sm text-dim">Your vote is invisible to anyone who doesn't also vote to flake.</p>
          <div class="form-group">
            <label class="form-label" for="flake-name">Your Name</label>
            <input class="form-input" id="flake-name" type="text" placeholder="What should the group call you?" autocomplete="off" />
          </div>
          <button class="btn btn-flake" id="btn-flake">I want to flake</button>
        </div>
      </div>
    </div>
  `;
}

function renderFlakerView(data) {
  if (!data.flakers) return '';

  return `
    <div class="stack-sm">
      <div class="card flaker-reveal-card">
        <div class="stack-sm">
          <div class="flaker-reveal-header">
            <span class="section-label">Fellow Flakers</span>
            <span class="text-xs text-muted">Only visible to other flakers</span>
          </div>
          <ul class="flaker-list">
            ${data.flakers.map(f => `
              <li class="flaker-item">
                <span class="flaker-name">${escapeHtml(f.name)}${f.name === data.myName ? ' <span class="participant-you">(you)</span>' : ''}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;
}

function bindRoomEvents(code, data) {
  // Copy link
  document.getElementById('btn-copy')?.addEventListener('click', async () => {
    const shareUrl = `${window.location.origin}/#/room/${code}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      const btn = document.getElementById('btn-copy');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy Link'; }, 1500);
    } catch { toast('Could not copy link'); }
  });

  // Group size controls
  document.getElementById('btn-size-down')?.addEventListener('click', () => updateGroupSize(code, data.groupSize - 1));
  document.getElementById('btn-size-up')?.addEventListener('click', () => updateGroupSize(code, data.groupSize + 1));

  // Flake vote
  document.getElementById('btn-flake')?.addEventListener('click', () => castFlakeVote(code));

  // Enter key on name input
  document.getElementById('flake-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); castFlakeVote(code); }
  });
}

async function updateGroupSize(code, newSize) {
  if (newSize < 2 || newSize > 50) return;

  try {
    await api(`/rooms/${code}/size`, { method: 'POST', body: { groupSize: newSize } });
    loadRoom(code);
  } catch (err) {
    toast(err.message);
  }
}

async function castFlakeVote(code) {
  const nameInput = document.getElementById('flake-name');
  const btn = document.getElementById('btn-flake');
  const name = nameInput?.value.trim();

  if (!name) {
    nameInput?.focus();
    toast('Enter your name first');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Voting...';

  try {
    const data = await api(`/rooms/${code}/vote`, {
      method: 'POST',
      body: { name },
    });

    setSession(code, { token: data.token, name });
    toast('You voted to flake. Your secret is safe.');
    clearInterval(pollTimer);
    loadRoom(code);
  } catch (err) {
    toast(err.message);
    btn.disabled = false;
    btn.textContent = 'I want to flake';
  }
}

async function refreshRoom(code) {
  const session = getSession(code);
  const tokenParam = session ? `?token=${session.token}` : '';

  try {
    const data = await api(`/rooms/${code}${tokenParam}`);

    // Update flake meter without full re-render (only if we are a flaker or all flaked)
    const meterBar = document.querySelector('.flake-meter-bar');
    const meterLabel = document.querySelector('.flake-meter-label span');
    const sizeVal = document.getElementById('group-size-val');

    if (meterBar && meterLabel && (data.isFlaker || data.allFlaked)) {
      const pct = Math.min((data.flakeCount / data.groupSize) * 100, 100);
      meterBar.style.width = `${pct}%`;
      meterLabel.textContent = `${data.flakeCount} of ${data.groupSize} want to flake`;
    }

    if (sizeVal) {
      sizeVal.textContent = data.groupSize;
    }

    // If status changed dramatically (allFlaked), full re-render
    if (data.allFlaked && !document.querySelector('.flake-revelation')) {
      clearInterval(pollTimer);
      loadRoom(code);
    }

    // Update flaker list if we're a flaker
    if (data.isFlaker && data.flakers) {
      const list = document.querySelector('.flaker-list');
      if (list) {
        const currentCount = list.querySelectorAll('.flaker-item').length;
        if (currentCount !== data.flakers.length) {
          clearInterval(pollTimer);
          loadRoom(code);
        }
      }
    }
  } catch { /* retry on next poll */ }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
