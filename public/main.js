/* ==========================================================================
   FLAKE — Main Application
   SPA with hash-based routing, API integration, localStorage session management.
   ========================================================================== */

const API = '/api';
const app = document.getElementById('app');

// ---------------------------------------------------------------------------
// Session helpers — store tokens per room code in localStorage
// ---------------------------------------------------------------------------
function getSession(code) {
    try {
        return JSON.parse(localStorage.getItem(`flake:${code}`)) || null;
    } catch { return null; }
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
function getRoute() {
    const hash = window.location.hash.slice(1) || '/';
    return hash;
}

function navigate(path) {
    window.location.hash = path;
}

function matchRoute(route) {
    // #/room/ABCDEF/results
    let m = route.match(/^\/room\/([A-Z0-9]+)\/results$/i);
    if (m) return { view: 'results', code: m[1].toUpperCase() };

    // #/room/ABCDEF
    m = route.match(/^\/room\/([A-Z0-9]+)$/i);
    if (m) return { view: 'room', code: m[1].toUpperCase() };

    // #/join/ABCDEF
    m = route.match(/^\/join\/([A-Z0-9]+)$/i);
    if (m) return { view: 'join', code: m[1].toUpperCase() };

    if (route === '/create') return { view: 'create' };

    return { view: 'home' };
}

function router() {
    const route = getRoute();
    const { view, code } = matchRoute(route);

    switch (view) {
        case 'home': renderHome(); break;
        case 'create': renderCreate(); break;
        case 'join': renderJoin(code); break;
        case 'room': renderRoom(code); break;
        case 'results': renderResults(code); break;
        default: renderHome();
    }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------
const icons = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
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
          A blind vote for your friend group. If everyone secretly wants to cancel,
          you all find out. If it's just you — your secret is safe.
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary" id="btn-create">
            Create an Event
          </button>
          <div class="or-divider">or join with a code</div>
          <div class="code-input-row">
            <input
              type="text"
              class="form-input"
              id="join-code"
              placeholder="ABCDEF"
              maxlength="6"
              autocomplete="off"
              spellcheck="false"
            />
            <button class="btn btn-secondary btn-sm" id="btn-join-code">
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

    document.getElementById('btn-create').addEventListener('click', () => navigate('/create'));

    document.getElementById('btn-join-code').addEventListener('click', () => {
        const code = document.getElementById('join-code').value.trim().toUpperCase();
        if (code.length >= 4) {
            navigate(`/join/${code}`);
        }
    });

    document.getElementById('join-code').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('btn-join-code').click();
        }
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
          <p class="text-dim text-sm">Set up the vote. Share the code. See who really wants to go.</p>
        </div>
        <form id="create-form" class="form-stack">
          <div class="form-group">
            <label class="form-label" for="event-name">Event Name</label>
            <input class="form-input" id="event-name" type="text" placeholder="Friday Night Dinner" required autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="your-name">Your Name</label>
            <input class="form-input" id="your-name" type="text" placeholder="What should the group call you?" required autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="group-size">Group Size</label>
            <input class="form-input form-input-number" id="group-size" type="number" min="2" max="20" value="3" required />
            <span class="form-hint">Total people in the plan (including you)</span>
          </div>
          <div id="create-error"></div>
          <button class="btn btn-primary" type="submit" id="btn-submit-create">
            Create & Get Link
          </button>
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
        const creatorName = document.getElementById('your-name').value.trim();
        const groupSize = parseInt(document.getElementById('group-size').value, 10);

        if (!name || !creatorName || !groupSize) return;

        btn.disabled = true;
        btn.textContent = 'Creating...';

        try {
            const data = await api('/rooms', {
                method: 'POST',
                body: { name, creatorName, groupSize },
            });

            // Save session
            setSession(data.code, {
                token: data.creatorToken,
                participantId: data.participantId,
                name: creatorName,
            });

            navigate(`/room/${data.code}`);
        } catch (err) {
            errorEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
            btn.disabled = false;
            btn.textContent = 'Create & Get Link';
        }
    });
}

// ---------------------------------------------------------------------------
// VIEW: Join
// ---------------------------------------------------------------------------
function renderJoin(code) {
    // Check if already in this room
    const session = getSession(code);
    if (session) {
        navigate(`/room/${code}`);
        return;
    }

    app.innerHTML = `
    <nav class="nav">
      <button class="nav-back" id="nav-back">${icons.arrow} Back</button>
      <div class="brand">flake<span class="brand-accent">.</span></div>
    </nav>
    <div class="page">
      <div class="page-inner stagger">
        <div class="stack-sm" style="margin-bottom: 1.5rem;">
          <h2>Join the Vote</h2>
          <p class="text-dim text-sm">Enter your name to join room <span class="text-accent" style="font-weight:700;">${code}</span></p>
        </div>
        <div id="join-loading" class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
        <div id="join-content" style="display:none;">
          <div id="join-room-info" class="card card-snug" style="margin-bottom:1.5rem;"></div>
          <form id="join-form" class="form-stack">
            <div class="form-group">
              <label class="form-label" for="join-name">Your Name</label>
              <input class="form-input" id="join-name" type="text" placeholder="What should the group call you?" required autocomplete="off" />
            </div>
            <div id="join-error"></div>
            <button class="btn btn-primary" type="submit" id="btn-submit-join">
              Join Room
            </button>
          </form>
        </div>
        <div id="join-not-found" style="display:none;" class="text-center stack">
          <p class="text-dim">Room not found. Check the code and try again.</p>
          <button class="btn btn-secondary" id="btn-go-home-join">Go Home</button>
        </div>
      </div>
    </div>
  `;

    document.getElementById('nav-back').addEventListener('click', () => navigate('/'));

    // Fetch room info
    loadJoinRoomInfo(code);

    document.getElementById('join-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-join');
        const errorEl = document.getElementById('join-error');
        errorEl.innerHTML = '';

        const name = document.getElementById('join-name').value.trim();
        if (!name) return;

        btn.disabled = true;
        btn.textContent = 'Joining...';

        try {
            const data = await api(`/rooms/${code}/join`, {
                method: 'POST',
                body: { name },
            });

            setSession(code, {
                token: data.token,
                participantId: data.participantId,
                name,
            });

            navigate(`/room/${code}`);
        } catch (err) {
            errorEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
            btn.disabled = false;
            btn.textContent = 'Join Room';
        }
    });
}

async function loadJoinRoomInfo(code) {
    try {
        const data = await api(`/rooms/${code}`);
        document.getElementById('join-loading').style.display = 'none';

        if (data.participantCount >= data.groupSize) {
            document.getElementById('join-content').style.display = 'none';
            document.getElementById('join-not-found').style.display = 'flex';
            document.getElementById('join-not-found').querySelector('p').textContent = 'This room is full.';
            document.getElementById('btn-go-home-join')?.addEventListener('click', () => navigate('/'));
            return;
        }

        document.getElementById('join-content').style.display = 'block';
        document.getElementById('join-room-info').innerHTML = `
      <div class="stack-xs">
        <span class="section-label">Event</span>
        <h3>${escapeHtml(data.name)}</h3>
        <span class="text-sm text-muted">${data.participantCount} of ${data.groupSize} joined</span>
      </div>
    `;
    } catch {
        document.getElementById('join-loading').style.display = 'none';
        document.getElementById('join-not-found').style.display = 'flex';
        document.getElementById('btn-go-home-join')?.addEventListener('click', () => navigate('/'));
    }
}

// ---------------------------------------------------------------------------
// VIEW: Room
// ---------------------------------------------------------------------------
let roomPollTimer = null;

function renderRoom(code) {
    const session = getSession(code);
    if (!session) {
        navigate(`/join/${code}`);
        return;
    }

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
      </div>
    </div>
  `;

    document.getElementById('nav-back').addEventListener('click', () => {
        clearInterval(roomPollTimer);
        navigate('/');
    });

    loadRoom(code, session);
}

async function loadRoom(code, session) {
    try {
        const data = await api(`/rooms/${code}?token=${session.token}`);
        document.getElementById('room-loading').style.display = 'none';
        const content = document.getElementById('room-content');
        content.style.display = 'block';

        const shareUrl = `${window.location.origin}/#/join/${code}`;
        const hasVoted = data.myVote !== null;
        const allVoted = data.allVoted;

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

        <!-- Participants -->
        <div class="stack-sm">
          <span class="section-label">Participants (${data.participantCount}/${data.groupSize})</span>
          <ul class="participant-list">
            ${data.participants.map(p => `
              <li class="participant-item">
                <div>
                  <span class="participant-name">${escapeHtml(p.name)}</span>
                  ${p.id === data.myId ? '<span class="participant-you"> (you)</span>' : ''}
                </div>
                <span class="participant-status ${p.hasVoted ? 'voted' : ''}">
                  ${p.hasVoted ? 'Voted' : 'Waiting...'}
                </span>
              </li>
            `).join('')}
            ${Array.from({ length: data.groupSize - data.participantCount }, () => `
              <li class="waiting-slot">Waiting for someone to join...</li>
            `).join('')}
          </ul>
        </div>

        <!-- Vote section -->
        ${!hasVoted && data.participantCount === data.groupSize ? `
          <div class="stack-sm">
            <span class="section-label">Cast your vote</span>
            <p class="text-sm text-muted">Your vote is secret. Nobody sees it unless the rules reveal it.</p>
            <div class="row">
              <button class="btn btn-vote btn-in" id="btn-vote-in">I'm in</button>
              <button class="btn btn-vote btn-out" id="btn-vote-out">I want out</button>
            </div>
          </div>
        ` : !hasVoted && data.participantCount < data.groupSize ? `
          <div class="card card-snug text-center">
            <p class="text-sm text-muted">Waiting for everyone to join before voting opens.</p>
          </div>
        ` : hasVoted && !allVoted ? `
          <div class="card card-snug text-center stack-xs">
            <p class="text-sm text-dim">You've voted. Waiting for everyone else...</p>
            <p class="text-xs text-muted">${data.votedCount} of ${data.groupSize} votes cast</p>
          </div>
        ` : allVoted ? `
          <div class="stack-sm">
            <button class="btn btn-primary" id="btn-results">
              See Results
            </button>
          </div>
        ` : ''}
      </div>
    `;

        // Event listeners
        document.getElementById('btn-copy')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareUrl);
                const btn = document.getElementById('btn-copy');
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy Link'; }, 1500);
            } catch {
                toast('Could not copy link');
            }
        });

        document.getElementById('btn-vote-in')?.addEventListener('click', () => castVote(code, session, 'in'));
        document.getElementById('btn-vote-out')?.addEventListener('click', () => castVote(code, session, 'out'));
        document.getElementById('btn-results')?.addEventListener('click', () => navigate(`/room/${code}/results`));

        // Poll for updates every 4s if waiting
        clearInterval(roomPollTimer);
        if (!allVoted) {
            roomPollTimer = setInterval(() => {
                refreshRoom(code, session);
            }, 4000);
        }

    } catch (err) {
        document.getElementById('room-loading').style.display = 'none';
        document.getElementById('room-content').style.display = 'block';
        document.getElementById('room-content').innerHTML = `
      <div class="text-center stack">
        <p class="text-dim">Could not load room. ${err.message}</p>
        <button class="btn btn-secondary" onclick="location.hash='/'">Go Home</button>
      </div>
    `;
    }
}

async function refreshRoom(code, session) {
    try {
        const data = await api(`/rooms/${code}?token=${session.token}`);
        // Update participant statuses without full re-render
        const items = document.querySelectorAll('.participant-item');
        data.participants.forEach((p, i) => {
            if (items[i]) {
                const status = items[i].querySelector('.participant-status');
                if (status) {
                    status.textContent = p.hasVoted ? 'Voted' : 'Waiting...';
                    status.className = `participant-status ${p.hasVoted ? 'voted' : ''}`;
                }
            }
        });

        // Check if new participants joined (need full re-render)
        const currentCount = items.length;
        if (data.participantCount !== currentCount || data.allVoted) {
            clearInterval(roomPollTimer);
            loadRoom(code, session);
        }
    } catch { /* silently retry on next poll */ }
}

async function castVote(code, session, vote) {
    const btnIn = document.getElementById('btn-vote-in');
    const btnOut = document.getElementById('btn-vote-out');
    if (btnIn) btnIn.disabled = true;
    if (btnOut) btnOut.disabled = true;

    try {
        await api(`/rooms/${code}/vote`, {
            method: 'POST',
            body: { token: session.token, vote },
        });

        toast(vote === 'in' ? "You're in!" : 'Vote cast. Your secret is safe.');
        // Reload room to show updated state
        clearInterval(roomPollTimer);
        loadRoom(code, session);
    } catch (err) {
        toast(err.message);
        if (btnIn) btnIn.disabled = false;
        if (btnOut) btnOut.disabled = false;
    }
}

// ---------------------------------------------------------------------------
// VIEW: Results
// ---------------------------------------------------------------------------
function renderResults(code) {
    const session = getSession(code);
    if (!session) {
        navigate(`/join/${code}`);
        return;
    }

    app.innerHTML = `
    <nav class="nav">
      <button class="nav-back" id="nav-back">${icons.arrow} Room</button>
      <div class="brand">flake<span class="brand-accent">.</span></div>
    </nav>
    <div class="page">
      <div class="page-inner">
        <div id="results-loading" class="text-center stack">
          <p class="text-dim text-sm">Counting the votes...</p>
          <div class="loading-dots">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
          </div>
        </div>
        <div id="results-content" style="display:none;"></div>
      </div>
    </div>
  `;

    document.getElementById('nav-back').addEventListener('click', () => navigate(`/room/${code}`));

    // Dramatic delay before fetching results
    setTimeout(() => loadResults(code, session), 1200);
}

async function loadResults(code, session) {
    try {
        const data = await api(`/rooms/${code}/results?token=${session.token}`);
        document.getElementById('results-loading').style.display = 'none';
        const content = document.getElementById('results-content');
        content.style.display = 'block';

        if (data.status === 'waiting') {
            content.innerHTML = `
        <div class="result-container reveal-mask">
          <p class="text-dim">Not everyone has voted yet. Head back to the room to see progress.</p>
          <button class="btn btn-secondary" style="margin-top:1.5rem;" id="btn-back-room">Back to Room</button>
        </div>
      `;
            document.getElementById('btn-back-room').addEventListener('click', () => navigate(`/room/${code}`));
            return;
        }

        let iconHtml = '';
        let headlineHtml = '';
        let messageHtml = '';
        let flakersHtml = '';
        let extraHtml = '';

        switch (data.outcome) {
            case 'cancelled':
                iconHtml = `<div class="result-icon" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="var(--accent)" stroke-width="3"/>
            <path d="M20 28c0-2 2-5 5-5s5 3 5 5M34 28c0-2 2-5 5-5s5 3 5 5" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M22 40c2 4 6 6 10 6s8-2 10-6" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>`;
                headlineHtml = '<h2 class="result-headline">Plans Cancelled!</h2>';
                messageHtml = `<p class="result-message">${escapeHtml(data.message)}</p>`;
                flakersHtml = renderFlakers(data.flakers, 'Fellow flakers');
                break;

            case 'safe':
                iconHtml = `<div class="result-icon" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="var(--text-muted)" stroke-width="3"/>
            <path d="M24 26h0M40 26h0" stroke="var(--text-dim)" stroke-width="3" stroke-linecap="round"/>
            <path d="M24 40c2-3 5-4 8-4s6 1 8 4" stroke="var(--text-dim)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>`;
                headlineHtml = '<h2 class="result-headline">Plans Are On</h2>';
                messageHtml = `<p class="result-message">${escapeHtml(data.message)}</p>`;
                break;

            case 'partial':
                iconHtml = `<div class="result-icon" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="var(--accent)" stroke-width="3"/>
            <path d="M22 28c0-2 2-4 4-4s4 2 4 4M34 28c0-2 2-4 4-4s4 2 4 4" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="22" y1="40" x2="42" y2="40" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>`;
                headlineHtml = '<h2 class="result-headline">It\'s Complicated</h2>';
                messageHtml = `<p class="result-message">${escapeHtml(data.message)}</p>`;
                flakersHtml = renderFlakers(data.flakers, 'Who wants out');
                extraHtml = `<p class="text-xs text-muted" style="margin-top:1rem;text-align:center;">
          Only those who voted "out" can see this. Your group\'s yes-voters have no idea.
        </p>`;
                break;

            case 'on':
            default:
                iconHtml = `<div class="result-icon" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="var(--success)" stroke-width="3"/>
            <path d="M20 28c0-2 2-5 5-5s5 3 5 5M34 28c0-2 2-5 5-5s5 3 5 5" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M22 38c2 4 6 6 10 6s8-2 10-6" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>`;
                headlineHtml = '<h2 class="result-headline">Plans Are On!</h2>';
                messageHtml = `<p class="result-message">${escapeHtml(data.message || 'Everyone\'s in. Have a great time!')}</p>`;
                break;
        }

        content.innerHTML = `
      <div class="result-container reveal-mask">
        ${iconHtml}
        ${headlineHtml}
        ${messageHtml}
        ${flakersHtml}
        ${extraHtml}
        <button class="btn btn-secondary" style="margin-top:2rem;" id="btn-new">
          Create a New Event
        </button>
      </div>
    `;

        document.getElementById('btn-new').addEventListener('click', () => navigate('/create'));

    } catch (err) {
        document.getElementById('results-loading').style.display = 'none';
        const content = document.getElementById('results-content');
        content.style.display = 'block';
        content.innerHTML = `
      <div class="text-center stack">
        <p class="text-dim">${err.message}</p>
        <button class="btn btn-secondary" id="btn-back-err">Back to Room</button>
      </div>
    `;
        document.getElementById('btn-back-err').addEventListener('click', () => navigate(`/room/${code}`));
    }
}

function renderFlakers(flakers, title) {
    if (!flakers || flakers.length === 0) return '';
    return `
    <div class="result-flakers">
      <div class="result-flakers-title">${escapeHtml(title)}</div>
      <div>
        ${flakers.map(f => `<span class="flaker-tag">${escapeHtml(f.name)}</span>`).join('')}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
