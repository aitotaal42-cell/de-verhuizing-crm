const app = document.getElementById("app");
let currentUser = null;
let currentTab = "quotes";
let allQuotes = [];
let allCallbacks = [];
let allMessages = [];

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  return res;
}

async function checkAuth() {
  const res = await api("/api/auth/me");
  if (res.ok) {
    currentUser = await res.json();
    renderDashboard();
  } else {
    renderLogin();
  }
}

function renderLogin() {
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="logo"><strong style="font-size:20px;color:#1a2d5a">De Verhuizing</strong></div>
        <h1>CRM Login</h1>
        <p>Log in om leads te beheren</p>
        <form id="loginForm">
          <div class="form-group">
            <label>Gebruikersnaam</label>
            <input type="text" id="username" required autocomplete="username">
          </div>
          <div class="form-group">
            <label>Wachtwoord</label>
            <input type="password" id="password" required autocomplete="current-password">
          </div>
          <div id="loginError" class="error-msg" style="display:none"></div>
          <button type="submit" class="btn btn-primary" style="margin-top:12px">Inloggen</button>
        </form>
      </div>
    </div>
  `;
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errEl = document.getElementById("loginError");
  errEl.style.display = "none";

  const res = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  if (res.ok) {
    const data = await res.json();
    currentUser = data.user;
    renderDashboard();
  } else {
    const data = await res.json();
    errEl.textContent = data.error || "Inloggen mislukt";
    errEl.style.display = "block";
  }
}

async function handleLogout() {
  await api("/api/auth/logout", { method: "POST" });
  currentUser = null;
  renderLogin();
}

async function renderDashboard() {
  app.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <div class="logo"><strong style="color:#fff;font-size:16px">De Verhuizing</strong></div>
        <nav>
          <a href="#" class="active" data-page="dashboard" onclick="navigate(event,'dashboard')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
            <span>Dashboard</span>
          </a>
          <a href="#" data-page="quotes" onclick="navigate(event,'quotes')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            <span>Offertes</span>
          </a>
          <a href="#" data-page="callbacks" onclick="navigate(event,'callbacks')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>Terugbel</span>
          </a>
          <a href="#" data-page="messages" onclick="navigate(event,'messages')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Berichten</span>
          </a>
        </nav>
        <div class="user-info">
          <strong>${currentUser.displayName}</strong>
          Ingelogd
        </div>
        <button class="logout-btn" onclick="handleLogout()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;margin-right:6px"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Uitloggen</span>
        </button>
      </aside>
      <div class="main">
        <div class="topbar"><h2 id="pageTitle">Dashboard</h2></div>
        <div class="content" id="pageContent"></div>
      </div>
    </div>
  `;
  navigate(null, "dashboard");
}

async function navigate(e, page) {
  if (e) e.preventDefault();
  document.querySelectorAll(".sidebar nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === page);
  });
  const title = document.getElementById("pageTitle");
  const content = document.getElementById("pageContent");

  if (page === "dashboard") {
    title.textContent = "Dashboard";
    await renderStats(content);
  } else if (page === "quotes") {
    title.textContent = "Offerte Aanvragen";
    await renderQuotes(content);
  } else if (page === "callbacks") {
    title.textContent = "Terugbelverzoeken";
    await renderCallbacks(content);
  } else if (page === "messages") {
    title.textContent = "Contactberichten";
    await renderMessages(content);
  }
}

async function renderStats(container) {
  const res = await api("/api/crm/stats");
  const stats = await res.json();
  container.innerHTML = `
    <div class="stats">
      <div class="stat-card">
        <div class="label">Totaal Offertes</div>
        <div class="value">${stats.totalQuotes}</div>
      </div>
      <div class="stat-card green">
        <div class="label">Nieuwe Offertes</div>
        <div class="value">${stats.newQuotes}</div>
      </div>
      <div class="stat-card blue">
        <div class="label">Totaal Terugbel</div>
        <div class="value">${stats.totalCallbacks}</div>
      </div>
      <div class="stat-card yellow">
        <div class="label">Nieuwe Terugbel</div>
        <div class="value">${stats.newCallbacks}</div>
      </div>
    </div>
    <div class="stats" style="margin-bottom:0">
      <div class="stat-card">
        <div class="label">Contactberichten</div>
        <div class="value">${stats.totalMessages}</div>
      </div>
    </div>
  `;
}

function statusBadge(status) {
  const labels = {
    nieuw: "Nieuw",
    in_behandeling: "In behandeling",
    offerte_verstuurd: "Offerte verstuurd",
    afgerond: "Afgerond",
    geannuleerd: "Geannuleerd",
  };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

function formatDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function renderQuotes(container) {
  const res = await api("/api/crm/quote-requests");
  allQuotes = await res.json();
  renderQuoteTable(container, allQuotes);
}

function renderQuoteTable(container, data) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Offerte Aanvragen (${data.length})</h3>
        <div class="filters">
          <input type="text" placeholder="Zoeken op naam/email..." id="quoteSearch" oninput="filterQuotes()">
          <select id="quoteStatusFilter" onchange="filterQuotes()">
            <option value="">Alle statussen</option>
            <option value="nieuw">Nieuw</option>
            <option value="in_behandeling">In behandeling</option>
            <option value="offerte_verstuurd">Offerte verstuurd</option>
            <option value="afgerond">Afgerond</option>
            <option value="geannuleerd">Geannuleerd</option>
          </select>
        </div>
      </div>
      ${data.length === 0 ? '<div class="empty">Geen offerte aanvragen gevonden</div>' : `
      <table>
        <thead><tr><th>Naam</th><th>Contact</th><th>Van</th><th>Naar</th><th>Datum</th><th>Status</th><th>Ontvangen</th></tr></thead>
        <tbody>
          ${data.map((q) => `
            <tr onclick="openQuoteDetail('${q.id}')">
              <td><strong>${q.firstName} ${q.lastName}</strong></td>
              <td>${q.email}<br><small>${q.phone}</small></td>
              <td><small>${q.moveFromCity}</small></td>
              <td><small>${q.moveToCity || "-"}</small></td>
              <td><small>${q.moveDate}</small></td>
              <td>${statusBadge(q.status)}</td>
              <td><small>${formatDate(q.createdAt)}</small></td>
            </tr>
          `).join("")}
        </tbody>
      </table>`}
    </div>
  `;
}

function filterQuotes() {
  const search = document.getElementById("quoteSearch").value.toLowerCase();
  const status = document.getElementById("quoteStatusFilter").value;
  let filtered = allQuotes;
  if (search) filtered = filtered.filter((q) => `${q.firstName} ${q.lastName} ${q.email}`.toLowerCase().includes(search));
  if (status) filtered = filtered.filter((q) => q.status === status);
  const container = document.getElementById("pageContent");
  renderQuoteTable(container, filtered);
  document.getElementById("quoteSearch").value = search;
  document.getElementById("quoteStatusFilter").value = status;
}

async function openQuoteDetail(id) {
  const q = allQuotes.find((x) => x.id === id);
  if (!q) return;
  document.getElementById("detailTitle").textContent = `${q.firstName} ${q.lastName}`;

  const notesRes = await api(`/api/crm/notes/quote/${id}`);
  const notes = await notesRes.json();

  document.getElementById("detailBody").innerHTML = `
    <div class="detail-actions">
      <select id="statusSelect" onchange="updateQuoteStatus('${id}')">
        <option value="nieuw" ${q.status === "nieuw" ? "selected" : ""}>Nieuw</option>
        <option value="in_behandeling" ${q.status === "in_behandeling" ? "selected" : ""}>In behandeling</option>
        <option value="offerte_verstuurd" ${q.status === "offerte_verstuurd" ? "selected" : ""}>Offerte verstuurd</option>
        <option value="afgerond" ${q.status === "afgerond" ? "selected" : ""}>Afgerond</option>
        <option value="geannuleerd" ${q.status === "geannuleerd" ? "selected" : ""}>Geannuleerd</option>
      </select>
    </div>
    <div class="detail-row">
      <div class="detail-field"><div class="label">Email</div><div class="value">${q.email}</div></div>
      <div class="detail-field"><div class="label">Telefoon</div><div class="value">${q.phone}</div></div>
    </div>
    <div class="detail-row">
      <div class="detail-field"><div class="label">Type verhuizing</div><div class="value">${q.moveType}</div></div>
      <div class="detail-field"><div class="label">Verhuisdatum</div><div class="value">${q.moveDate}</div></div>
    </div>
    <div class="detail-field"><div class="label">Van</div><div class="value">${q.moveFromAddress}, ${q.moveFromPostcode} ${q.moveFromCity}</div></div>
    <div class="detail-field"><div class="label">Naar</div><div class="value">${q.moveToAddress ? `${q.moveToAddress}, ${q.moveToPostcode} ${q.moveToCity}` : "-"}</div></div>
    ${q.additionalNotes ? `<div class="detail-field"><div class="label">Opmerkingen</div><div class="value">${q.additionalNotes}</div></div>` : ""}
    <div class="detail-field"><div class="label">Ontvangen</div><div class="value">${formatDate(q.createdAt)}</div></div>
    <div class="notes-section">
      <h4>Notities (${notes.length})</h4>
      ${notes.map((n) => `<div class="note"><div class="note-meta">${n.authorName} - ${formatDate(n.createdAt)}</div><div class="note-content">${n.content}</div></div>`).join("")}
      <div class="note-form">
        <textarea id="noteInput" placeholder="Notitie toevoegen..."></textarea>
        <button class="btn btn-primary btn-sm" style="width:auto;align-self:flex-end" onclick="addNote('${id}','quote')">Opslaan</button>
      </div>
    </div>
  `;
  openDetail();
}

async function updateQuoteStatus(id) {
  const status = document.getElementById("statusSelect").value;
  await api(`/api/crm/quote-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  await renderQuotes(document.getElementById("pageContent"));
}

async function renderCallbacks(container) {
  const res = await api("/api/crm/callback-requests");
  allCallbacks = await res.json();
  renderCallbackTable(container, allCallbacks);
}

function renderCallbackTable(container, data) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Terugbelverzoeken (${data.length})</h3>
        <div class="filters">
          <input type="text" placeholder="Zoeken op naam..." id="cbSearch" oninput="filterCallbacks()">
          <select id="cbStatusFilter" onchange="filterCallbacks()">
            <option value="">Alle statussen</option>
            <option value="nieuw">Nieuw</option>
            <option value="in_behandeling">In behandeling</option>
            <option value="afgerond">Afgerond</option>
            <option value="geannuleerd">Geannuleerd</option>
          </select>
        </div>
      </div>
      ${data.length === 0 ? '<div class="empty">Geen terugbelverzoeken gevonden</div>' : `
      <table>
        <thead><tr><th>Naam</th><th>Telefoon</th><th>Email</th><th>Type</th><th>Status</th><th>Ontvangen</th></tr></thead>
        <tbody>
          ${data.map((c) => `
            <tr onclick="openCallbackDetail('${c.id}')">
              <td><strong>${c.firstName} ${c.lastName}</strong></td>
              <td>${c.phone}</td>
              <td>${c.email}</td>
              <td><small>${c.requestType}</small></td>
              <td>${statusBadge(c.status)}</td>
              <td><small>${formatDate(c.createdAt)}</small></td>
            </tr>
          `).join("")}
        </tbody>
      </table>`}
    </div>
  `;
}

function filterCallbacks() {
  const search = document.getElementById("cbSearch").value.toLowerCase();
  const status = document.getElementById("cbStatusFilter").value;
  let filtered = allCallbacks;
  if (search) filtered = filtered.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(search));
  if (status) filtered = filtered.filter((c) => c.status === status);
  const container = document.getElementById("pageContent");
  renderCallbackTable(container, filtered);
  document.getElementById("cbSearch").value = search;
  document.getElementById("cbStatusFilter").value = status;
}

async function openCallbackDetail(id) {
  const c = allCallbacks.find((x) => x.id === id);
  if (!c) return;
  document.getElementById("detailTitle").textContent = `${c.firstName} ${c.lastName}`;

  const notesRes = await api(`/api/crm/notes/callback/${id}`);
  const notes = await notesRes.json();

  document.getElementById("detailBody").innerHTML = `
    <div class="detail-actions">
      <select id="statusSelect" onchange="updateCallbackStatus('${id}')">
        <option value="nieuw" ${c.status === "nieuw" ? "selected" : ""}>Nieuw</option>
        <option value="in_behandeling" ${c.status === "in_behandeling" ? "selected" : ""}>In behandeling</option>
        <option value="afgerond" ${c.status === "afgerond" ? "selected" : ""}>Afgerond</option>
        <option value="geannuleerd" ${c.status === "geannuleerd" ? "selected" : ""}>Geannuleerd</option>
      </select>
    </div>
    <div class="detail-row">
      <div class="detail-field"><div class="label">Telefoon</div><div class="value">${c.phone}</div></div>
      <div class="detail-field"><div class="label">Email</div><div class="value">${c.email}</div></div>
    </div>
    <div class="detail-field"><div class="label">Type verzoek</div><div class="value">${c.requestType}</div></div>
    <div class="detail-field"><div class="label">Ontvangen</div><div class="value">${formatDate(c.createdAt)}</div></div>
    <div class="notes-section">
      <h4>Notities (${notes.length})</h4>
      ${notes.map((n) => `<div class="note"><div class="note-meta">${n.authorName} - ${formatDate(n.createdAt)}</div><div class="note-content">${n.content}</div></div>`).join("")}
      <div class="note-form">
        <textarea id="noteInput" placeholder="Notitie toevoegen..."></textarea>
        <button class="btn btn-primary btn-sm" style="width:auto;align-self:flex-end" onclick="addNote('${id}','callback')">Opslaan</button>
      </div>
    </div>
  `;
  openDetail();
}

async function updateCallbackStatus(id) {
  const status = document.getElementById("statusSelect").value;
  await api(`/api/crm/callback-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  await renderCallbacks(document.getElementById("pageContent"));
}

async function renderMessages(container) {
  const res = await api("/api/crm/contact-messages");
  allMessages = await res.json();
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Contactberichten (${allMessages.length})</h3>
      </div>
      ${allMessages.length === 0 ? '<div class="empty">Geen berichten gevonden</div>' : `
      <table>
        <thead><tr><th>Naam</th><th>Email</th><th>Onderwerp</th><th>Bericht</th><th>Ontvangen</th></tr></thead>
        <tbody>
          ${allMessages.map((m) => `
            <tr>
              <td><strong>${m.name}</strong></td>
              <td>${m.email}</td>
              <td>${m.subject}</td>
              <td><small>${m.message.substring(0, 80)}${m.message.length > 80 ? "..." : ""}</small></td>
              <td><small>${formatDate(m.createdAt)}</small></td>
            </tr>
          `).join("")}
        </tbody>
      </table>`}
    </div>
  `;
}

async function addNote(leadId, leadType) {
  const input = document.getElementById("noteInput");
  const content = input.value.trim();
  if (!content) return;
  await api("/api/crm/notes", { method: "POST", body: JSON.stringify({ leadId, leadType, content }) });
  if (leadType === "quote") openQuoteDetail(leadId);
  else openCallbackDetail(leadId);
}

function openDetail() {
  document.getElementById("detailPanel").classList.add("open");
  document.getElementById("overlay").classList.add("open");
}

function closeDetail() {
  document.getElementById("detailPanel").classList.remove("open");
  document.getElementById("overlay").classList.remove("open");
}

checkAuth();
