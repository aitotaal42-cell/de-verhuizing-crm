const app = document.getElementById("app");
let currentUser = null;
let currentPage = "dashboard";
let allQuotes = [];
let allCallbacks = [];
let allMessages = [];
let selectedIds = new Set();
let sortConfig = { key: null, dir: "asc" };
let paginationConfig = { page: 1, perPage: 20 };
let filterState = { search: "", status: "" };

function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  return res;
}

function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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
        <div class="logo">
          <div class="logo-text">De <span>Verhuizing</span></div>
        </div>
        <h1>CRM Dashboard</h1>
        <p>Log in om leads en offertes te beheren</p>
        <form id="loginForm">
          <div class="form-group">
            <label>Gebruikersnaam</label>
            <input type="text" id="username" required autocomplete="username" placeholder="Voer gebruikersnaam in">
          </div>
          <div class="form-group">
            <label>Wachtwoord</label>
            <input type="password" id="password" required autocomplete="current-password" placeholder="Voer wachtwoord in">
          </div>
          <div id="loginError" class="error-msg" style="display:none"></div>
          <button type="submit" class="btn btn-primary" style="margin-top:16px">Inloggen</button>
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
  const res = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
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

function userInitials(name) {
  return name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
}

async function renderDashboard() {
  const initials = userInitials(currentUser.displayName || "U");
  app.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon">DV</div>
          <div class="brand-text">De Verhuizing<span>CRM Dashboard</span></div>
        </div>
        <nav>
          <div class="nav-label">Overzicht</div>
          <a href="#" class="active" data-page="dashboard" onclick="navigate(event,'dashboard')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
            <span>Dashboard</span>
          </a>
          <div class="nav-label">Leads</div>
          <a href="#" data-page="quotes" onclick="navigate(event,'quotes')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            <span>Offertes</span>
            <span class="nav-badge" id="navBadgeQuotes"></span>
          </a>
          <a href="#" data-page="callbacks" onclick="navigate(event,'callbacks')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>Terugbel</span>
            <span class="nav-badge" id="navBadgeCallbacks"></span>
          </a>
          <a href="#" data-page="messages" onclick="navigate(event,'messages')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Berichten</span>
          </a>
        </nav>
        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar">${initials}</div>
            <div class="user-details">
              <strong>${currentUser.displayName}</strong>
              <small>Beheerder</small>
            </div>
          </div>
          <button class="logout-btn" onclick="handleLogout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Uitloggen</span>
          </button>
        </div>
      </aside>
      <div class="main">
        <div class="topbar">
          <h2 id="pageTitle">Dashboard</h2>
          <div class="topbar-actions" id="topbarActions"></div>
        </div>
        <div class="content" id="pageContent"></div>
      </div>
    </div>
  `;
  navigate(null, "dashboard");
}

async function navigate(e, page) {
  if (e) e.preventDefault();
  currentPage = page;
  selectedIds.clear();
  sortConfig = { key: null, dir: "asc" };
  paginationConfig.page = 1;
  filterState = { search: "", status: "" };
  document.querySelectorAll(".sidebar nav a").forEach(a => {
    a.classList.toggle("active", a.dataset.page === page);
  });
  const title = document.getElementById("pageTitle");
  const content = document.getElementById("pageContent");
  const actions = document.getElementById("topbarActions");

  if (page === "dashboard") {
    title.textContent = "Dashboard";
    actions.innerHTML = "";
    await renderStats(content);
  } else if (page === "quotes") {
    title.textContent = "Offerte Aanvragen";
    actions.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="exportData('quotes','csv')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        CSV
      </button>
      <button class="btn btn-secondary btn-sm" onclick="exportData('quotes','xlsx')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        XLSX
      </button>
    `;
    await renderQuotes(content);
  } else if (page === "callbacks") {
    title.textContent = "Terugbelverzoeken";
    actions.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="exportData('callbacks','csv')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        CSV
      </button>
      <button class="btn btn-secondary btn-sm" onclick="exportData('callbacks','xlsx')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        XLSX
      </button>
    `;
    await renderCallbacks(content);
  } else if (page === "messages") {
    title.textContent = "Contactberichten";
    actions.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="exportData('messages','csv')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        CSV
      </button>
    `;
    await renderMessages(content);
  }
  updateNavBadges();
}

async function updateNavBadges() {
  try {
    const res = await api("/api/crm/stats");
    const stats = await res.json();
    const qBadge = document.getElementById("navBadgeQuotes");
    const cBadge = document.getElementById("navBadgeCallbacks");
    if (qBadge) qBadge.textContent = stats.newQuotes > 0 ? stats.newQuotes : "";
    if (cBadge) cBadge.textContent = stats.newCallbacks > 0 ? stats.newCallbacks : "";
  } catch (e) {}
}

async function renderStats(container) {
  const res = await api("/api/crm/stats");
  const stats = await res.json();

  const qRes = await api("/api/crm/quote-requests");
  allQuotes = await qRes.json();
  const cRes = await api("/api/crm/callback-requests");
  allCallbacks = await cRes.json();

  const recentQuotes = allQuotes.slice(0, 5);
  const recentCallbacks = allCallbacks.slice(0, 5);

  container.innerHTML = `
    <div class="stats">
      <div class="stat-card">
        <div class="stat-icon orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Totaal Offertes</div>
          <div class="stat-value">${stats.totalQuotes}</div>
          <div class="stat-sub">Alle offerte aanvragen</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Nieuwe Offertes</div>
          <div class="stat-value">${stats.newQuotes}</div>
          <div class="stat-sub">Wacht op verwerking</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Terugbelverzoeken</div>
          <div class="stat-value">${stats.totalCallbacks}</div>
          <div class="stat-sub">${stats.newCallbacks} nieuw</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Contactberichten</div>
          <div class="stat-value">${stats.totalMessages}</div>
          <div class="stat-sub">Alle berichten</div>
        </div>
      </div>
    </div>
    <div class="quick-stats">
      <div class="card">
        <h4>Recente Offertes</h4>
        ${recentQuotes.length === 0 ? '<p style="color:var(--gray-400);font-size:13px">Nog geen offertes</p>' : recentQuotes.map(q => `
          <div class="recent-item" style="cursor:pointer" onclick="navigate(null,'quotes');setTimeout(()=>openQuoteDetail('${q.id}'),300)">
            <div>
              <div class="name">${esc(q.firstName)} ${esc(q.lastName)}</div>
              <div class="meta">${esc(q.moveFromCity)} ${q.moveToCity ? '&rarr; ' + q.moveToCity : ''}</div>
            </div>
            ${statusBadge(q.status)}
          </div>
        `).join("")}
      </div>
      <div class="card">
        <h4>Recente Terugbelverzoeken</h4>
        ${recentCallbacks.length === 0 ? '<p style="color:var(--gray-400);font-size:13px">Nog geen terugbelverzoeken</p>' : recentCallbacks.map(c => `
          <div class="recent-item" style="cursor:pointer" onclick="navigate(null,'callbacks');setTimeout(()=>openCallbackDetail('${c.id}'),300)">
            <div>
              <div class="name">${esc(c.firstName)} ${esc(c.lastName)}</div>
              <div class="meta">${esc(c.phone)}</div>
            </div>
            ${statusBadge(c.status)}
          </div>
        `).join("")}
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

function formatDateShort(d) {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" });
}

function sortData(data, key, dir) {
  if (!key) return data;
  return [...data].sort((a, b) => {
    let va = a[key] ?? "";
    let vb = b[key] ?? "";
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

function toggleSort(key) {
  if (sortConfig.key === key) {
    sortConfig.dir = sortConfig.dir === "asc" ? "desc" : "asc";
  } else {
    sortConfig.key = key;
    sortConfig.dir = "asc";
  }
  paginationConfig.page = 1;
  refreshCurrentView();
}

function sortIcon(key) {
  if (sortConfig.key !== key) return '<span class="sort-icon">&udarr;</span>';
  return sortConfig.dir === "asc" ? '<span class="sort-icon">&uarr;</span>' : '<span class="sort-icon">&darr;</span>';
}

function sortClass(key) {
  if (sortConfig.key !== key) return "sortable";
  return `sortable sort-${sortConfig.dir}`;
}

function paginate(data) {
  const start = (paginationConfig.page - 1) * paginationConfig.perPage;
  const end = start + paginationConfig.perPage;
  return data.slice(start, end);
}

function renderPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / paginationConfig.perPage);
  if (totalItems === 0) return "";
  const start = (paginationConfig.page - 1) * paginationConfig.perPage + 1;
  const end = Math.min(paginationConfig.page * paginationConfig.perPage, totalItems);

  let pageButtons = "";
  const maxVisible = 5;
  let startPage = Math.max(1, paginationConfig.page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

  for (let i = startPage; i <= endPage; i++) {
    pageButtons += `<button class="page-btn ${i === paginationConfig.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }

  return `
    <div class="pagination">
      <div class="page-info">Toont <strong>${start}-${end}</strong> van <strong>${totalItems}</strong> resultaten</div>
      <div class="page-controls">
        <button class="page-btn" onclick="goToPage(${paginationConfig.page - 1})" ${paginationConfig.page <= 1 ? 'disabled' : ''}>&laquo;</button>
        ${pageButtons}
        <button class="page-btn" onclick="goToPage(${paginationConfig.page + 1})" ${paginationConfig.page >= totalPages ? 'disabled' : ''}>&raquo;</button>
      </div>
      <div class="per-page">
        <span>Per pagina:</span>
        <select onchange="changePerPage(this.value)">
          ${[20,40,60,80,100].map(n => `<option value="${n}" ${paginationConfig.perPage === n ? 'selected' : ''}>${n}</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

function goToPage(page) {
  paginationConfig.page = page;
  refreshCurrentView();
}

function changePerPage(val) {
  paginationConfig.perPage = parseInt(val);
  paginationConfig.page = 1;
  refreshCurrentView();
}

function refreshCurrentView() {
  const content = document.getElementById("pageContent");
  if (currentPage === "quotes") renderQuoteTable(content, getFilteredQuotes());
  else if (currentPage === "callbacks") renderCallbackTable(content, getFilteredCallbacks());
  else if (currentPage === "messages") renderMessageTable(content, getFilteredMessages());
}

function toggleSelectAll(checked) {
  const data = currentPage === "quotes" ? getFilteredQuotes() : currentPage === "callbacks" ? getFilteredCallbacks() : getFilteredMessages();
  const pageData = paginate(sortData(data, sortConfig.key, sortConfig.dir));
  if (checked) {
    pageData.forEach(item => selectedIds.add(item.id));
  } else {
    pageData.forEach(item => selectedIds.delete(item.id));
  }
  refreshCurrentView();
}

function toggleSelect(id, e) {
  e.stopPropagation();
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  refreshCurrentView();
}

async function bulkDelete() {
  if (selectedIds.size === 0) return;
  if (!confirm(`Weet je zeker dat je ${selectedIds.size} item(s) wilt verwijderen?`)) return;
  const ids = Array.from(selectedIds);
  let endpoint = "";
  if (currentPage === "quotes") endpoint = "/api/crm/quote-requests/bulk";
  else if (currentPage === "callbacks") endpoint = "/api/crm/callback-requests/bulk";
  else if (currentPage === "messages") endpoint = "/api/crm/contact-messages/bulk";

  const res = await api(endpoint, { method: "DELETE", body: JSON.stringify({ ids }) });
  if (res.ok) {
    const data = await res.json();
    showToast(`${data.deleted} item(s) verwijderd`);
    selectedIds.clear();
    if (currentPage === "quotes") await renderQuotes(document.getElementById("pageContent"));
    else if (currentPage === "callbacks") await renderCallbacks(document.getElementById("pageContent"));
    else if (currentPage === "messages") await renderMessages(document.getElementById("pageContent"));
  } else {
    showToast("Verwijderen mislukt", "error");
  }
}

function renderBulkActions() {
  if (selectedIds.size === 0) return "";
  return `
    <div class="bulk-actions">
      <span class="selected-count">${selectedIds.size} geselecteerd</span>
      <button class="btn btn-danger btn-sm" onclick="bulkDelete()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Verwijderen
      </button>
      <button class="btn btn-secondary btn-sm" onclick="selectedIds.clear();refreshCurrentView()">Deselecteren</button>
    </div>
  `;
}

function searchIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';
}

async function renderQuotes(container) {
  const res = await api("/api/crm/quote-requests");
  allQuotes = await res.json();
  renderQuoteTable(container, allQuotes);
}

function getFilteredQuotes() {
  let filtered = allQuotes;
  if (filterState.search) filtered = filtered.filter(q => `${q.firstName} ${q.lastName} ${q.email} ${q.phone} ${q.moveFromCity} ${q.moveToCity || ""}`.toLowerCase().includes(filterState.search));
  if (filterState.status) filtered = filtered.filter(q => q.status === filterState.status);
  return filtered;
}

function renderQuoteTable(container, data) {
  const sorted = sortData(data, sortConfig.key, sortConfig.dir);
  const pageData = paginate(sorted);
  const allChecked = pageData.length > 0 && pageData.every(q => selectedIds.has(q.id));

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Offerte Aanvragen <span class="count-badge">${data.length}</span></h3>
        <div class="toolbar">
          <div class="search-box">
            ${searchIcon()}
            <input type="text" placeholder="Zoeken op naam, email, stad..." id="quoteSearch" oninput="filterQuotes()" value="${esc(filterState.search)}">
          </div>
          <select id="quoteStatusFilter" onchange="filterQuotes()">
            <option value="">Alle statussen</option>
            <option value="nieuw" ${filterState.status==='nieuw'?'selected':''}>Nieuw</option>
            <option value="in_behandeling" ${filterState.status==='in_behandeling'?'selected':''}>In behandeling</option>
            <option value="offerte_verstuurd" ${filterState.status==='offerte_verstuurd'?'selected':''}>Offerte verstuurd</option>
            <option value="afgerond" ${filterState.status==='afgerond'?'selected':''}>Afgerond</option>
            <option value="geannuleerd" ${filterState.status==='geannuleerd'?'selected':''}>Geannuleerd</option>
          </select>
        </div>
      </div>
      ${renderBulkActions()}
      ${data.length === 0 ? '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg><p>Geen offerte aanvragen gevonden</p></div>' : `
      <table>
        <thead><tr>
          <th style="width:40px"><input type="checkbox" ${allChecked ? 'checked' : ''} onchange="toggleSelectAll(this.checked)"></th>
          <th class="${sortClass('firstName')}" onclick="toggleSort('firstName')">Naam ${sortIcon('firstName')}</th>
          <th class="${sortClass('email')}" onclick="toggleSort('email')">Contact ${sortIcon('email')}</th>
          <th class="${sortClass('moveFromCity')}" onclick="toggleSort('moveFromCity')">Van ${sortIcon('moveFromCity')}</th>
          <th class="${sortClass('moveToCity')}" onclick="toggleSort('moveToCity')">Naar ${sortIcon('moveToCity')}</th>
          <th class="${sortClass('moveDate')}" onclick="toggleSort('moveDate')">Verhuisdatum ${sortIcon('moveDate')}</th>
          <th class="${sortClass('status')}" onclick="toggleSort('status')">Status ${sortIcon('status')}</th>
          <th class="${sortClass('createdAt')}" onclick="toggleSort('createdAt')">Ontvangen ${sortIcon('createdAt')}</th>
        </tr></thead>
        <tbody>
          ${pageData.map(q => `
            <tr class="${selectedIds.has(q.id) ? 'selected' : ''}" onclick="openQuoteDetail('${q.id}')">
              <td><input type="checkbox" ${selectedIds.has(q.id) ? 'checked' : ''} onclick="toggleSelect('${q.id}',event)"></td>
              <td><strong>${esc(q.firstName)} ${esc(q.lastName)}</strong></td>
              <td>${esc(q.email)}<br><small style="color:var(--gray-400)">${esc(q.phone)}</small></td>
              <td>${esc(q.moveFromCity)}</td>
              <td>${esc(q.moveToCity) || "-"}</td>
              <td>${formatDateShort(q.moveDate)}</td>
              <td>${statusBadge(q.status)}</td>
              <td><small style="color:var(--gray-500)">${formatDate(q.createdAt)}</small></td>
            </tr>
          `).join("")}
        </tbody>
      </table>`}
      ${renderPagination(data.length)}
    </div>
  `;
  const statusEl = document.getElementById("quoteStatusFilter");
  const searchEl = document.getElementById("quoteSearch");
  if (statusEl) {
    const savedStatus = getFilteredQuotes === data ? "" : "";
  }
}

function filterQuotes() {
  paginationConfig.page = 1;
  filterState.search = (document.getElementById("quoteSearch")?.value || "").toLowerCase();
  filterState.status = document.getElementById("quoteStatusFilter")?.value || "";
  const filtered = getFilteredQuotes();
  renderQuoteTable(document.getElementById("pageContent"), filtered);
}

async function openQuoteDetail(id) {
  const q = allQuotes.find(x => x.id === id);
  if (!q) return;
  document.getElementById("detailTitle").textContent = `${esc(q.firstName)} ${esc(q.lastName)}`;

  const notesRes = await api(`/api/crm/notes/quote/${id}`);
  const notes = await notesRes.json();

  document.getElementById("detailBody").innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Status
      </div>
      <div class="detail-actions">
        <select id="statusSelect" onchange="updateQuoteStatus('${id}')">
          <option value="nieuw" ${q.status === "nieuw" ? "selected" : ""}>Nieuw</option>
          <option value="in_behandeling" ${q.status === "in_behandeling" ? "selected" : ""}>In behandeling</option>
          <option value="offerte_verstuurd" ${q.status === "offerte_verstuurd" ? "selected" : ""}>Offerte verstuurd</option>
          <option value="afgerond" ${q.status === "afgerond" ? "selected" : ""}>Afgerond</option>
          <option value="geannuleerd" ${q.status === "geannuleerd" ? "selected" : ""}>Geannuleerd</option>
        </select>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Contactgegevens
      </div>
      <div class="detail-row">
        <div class="detail-field"><div class="label">Email</div><div class="value"><a href="mailto:${esc(q.email)}">${esc(q.email)}</a></div></div>
        <div class="detail-field"><div class="label">Telefoon</div><div class="value"><a href="tel:${esc(q.phone)}">${esc(q.phone)}</a></div></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Verhuisgegevens
      </div>
      <div class="detail-row">
        <div class="detail-field"><div class="label">Type verhuizing</div><div class="value">${esc(q.moveType)}</div></div>
        <div class="detail-field"><div class="label">Verhuisdatum</div><div class="value">${formatDateShort(q.moveDate)}</div></div>
      </div>
      <div class="detail-field"><div class="label">Van adres</div><div class="value">${esc(q.moveFromAddress)}, ${esc(q.moveFromPostcode)} ${esc(q.moveFromCity)}</div></div>
      <div class="detail-field"><div class="label">Naar adres</div><div class="value">${q.moveToAddress ? `${esc(q.moveToAddress)}, ${esc(q.moveToPostcode)} ${esc(q.moveToCity)}` : "-"}</div></div>
      ${q.additionalNotes ? `<div class="detail-field"><div class="label">Opmerkingen klant</div><div class="value" style="background:var(--gray-50);padding:10px;border-radius:var(--radius);border:1px solid var(--gray-100)">${esc(q.additionalNotes)}</div></div>` : ""}
    </div>
    <div class="detail-section">
      <div class="detail-field"><div class="label">Ontvangen op</div><div class="value">${formatDate(q.createdAt)}</div></div>
    </div>
    <div class="detail-section notes-section">
      <div class="detail-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Notities (${notes.length})
      </div>
      ${notes.map(n => `<div class="note"><div class="note-meta">${esc(n.authorName)} &middot; ${formatDate(n.createdAt)}</div><div class="note-content">${esc(n.content)}</div></div>`).join("")}
      <div class="note-form">
        <textarea id="noteInput" placeholder="Schrijf een notitie..."></textarea>
        <button class="btn btn-primary btn-sm" style="width:auto;align-self:flex-end" onclick="addNote('${id}','quote')">Notitie opslaan</button>
      </div>
    </div>
  `;
  openDetail();
}

async function updateQuoteStatus(id) {
  const status = document.getElementById("statusSelect").value;
  await api(`/api/crm/quote-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  showToast("Status bijgewerkt");
  const idx = allQuotes.findIndex(q => q.id === id);
  if (idx !== -1) allQuotes[idx].status = status;
  refreshCurrentView();
}

async function renderCallbacks(container) {
  const res = await api("/api/crm/callback-requests");
  allCallbacks = await res.json();
  renderCallbackTable(container, allCallbacks);
}

function getFilteredCallbacks() {
  let filtered = allCallbacks;
  if (filterState.search) filtered = filtered.filter(c => `${c.firstName} ${c.lastName} ${c.phone} ${c.email}`.toLowerCase().includes(filterState.search));
  if (filterState.status) filtered = filtered.filter(c => c.status === filterState.status);
  return filtered;
}

function renderCallbackTable(container, data) {
  const sorted = sortData(data, sortConfig.key, sortConfig.dir);
  const pageData = paginate(sorted);
  const allChecked = pageData.length > 0 && pageData.every(c => selectedIds.has(c.id));

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Terugbelverzoeken <span class="count-badge">${data.length}</span></h3>
        <div class="toolbar">
          <div class="search-box">
            ${searchIcon()}
            <input type="text" placeholder="Zoeken op naam, telefoon..." id="cbSearch" oninput="filterCallbacks()" value="${esc(filterState.search)}">
          </div>
          <select id="cbStatusFilter" onchange="filterCallbacks()">
            <option value="">Alle statussen</option>
            <option value="nieuw" ${filterState.status==='nieuw'?'selected':''}>Nieuw</option>
            <option value="in_behandeling" ${filterState.status==='in_behandeling'?'selected':''}>In behandeling</option>
            <option value="afgerond" ${filterState.status==='afgerond'?'selected':''}>Afgerond</option>
            <option value="geannuleerd" ${filterState.status==='geannuleerd'?'selected':''}>Geannuleerd</option>
          </select>
        </div>
      </div>
      ${renderBulkActions()}
      ${data.length === 0 ? '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3"/></svg><p>Geen terugbelverzoeken gevonden</p></div>' : `
      <table>
        <thead><tr>
          <th style="width:40px"><input type="checkbox" ${allChecked ? 'checked' : ''} onchange="toggleSelectAll(this.checked)"></th>
          <th class="${sortClass('firstName')}" onclick="toggleSort('firstName')">Naam ${sortIcon('firstName')}</th>
          <th class="${sortClass('phone')}" onclick="toggleSort('phone')">Telefoon ${sortIcon('phone')}</th>
          <th class="${sortClass('email')}" onclick="toggleSort('email')">Email ${sortIcon('email')}</th>
          <th class="${sortClass('requestType')}" onclick="toggleSort('requestType')">Type ${sortIcon('requestType')}</th>
          <th class="${sortClass('status')}" onclick="toggleSort('status')">Status ${sortIcon('status')}</th>
          <th class="${sortClass('createdAt')}" onclick="toggleSort('createdAt')">Ontvangen ${sortIcon('createdAt')}</th>
        </tr></thead>
        <tbody>
          ${pageData.map(c => `
            <tr class="${selectedIds.has(c.id) ? 'selected' : ''}" onclick="openCallbackDetail('${c.id}')">
              <td><input type="checkbox" ${selectedIds.has(c.id) ? 'checked' : ''} onclick="toggleSelect('${c.id}',event)"></td>
              <td><strong>${esc(c.firstName)} ${esc(c.lastName)}</strong></td>
              <td>${esc(c.phone)}</td>
              <td>${esc(c.email)}</td>
              <td>${esc(c.requestType)}</td>
              <td>${statusBadge(c.status)}</td>
              <td><small style="color:var(--gray-500)">${formatDate(c.createdAt)}</small></td>
            </tr>
          `).join("")}
        </tbody>
      </table>`}
      ${renderPagination(data.length)}
    </div>
  `;
}

function filterCallbacks() {
  paginationConfig.page = 1;
  filterState.search = (document.getElementById("cbSearch")?.value || "").toLowerCase();
  filterState.status = document.getElementById("cbStatusFilter")?.value || "";
  const filtered = getFilteredCallbacks();
  renderCallbackTable(document.getElementById("pageContent"), filtered);
}

async function openCallbackDetail(id) {
  const c = allCallbacks.find(x => x.id === id);
  if (!c) return;
  document.getElementById("detailTitle").textContent = `${esc(c.firstName)} ${esc(c.lastName)}`;

  const notesRes = await api(`/api/crm/notes/callback/${id}`);
  const notes = await notesRes.json();

  document.getElementById("detailBody").innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Status
      </div>
      <div class="detail-actions">
        <select id="statusSelect" onchange="updateCallbackStatus('${id}')">
          <option value="nieuw" ${c.status === "nieuw" ? "selected" : ""}>Nieuw</option>
          <option value="in_behandeling" ${c.status === "in_behandeling" ? "selected" : ""}>In behandeling</option>
          <option value="afgerond" ${c.status === "afgerond" ? "selected" : ""}>Afgerond</option>
          <option value="geannuleerd" ${c.status === "geannuleerd" ? "selected" : ""}>Geannuleerd</option>
        </select>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Contactgegevens
      </div>
      <div class="detail-row">
        <div class="detail-field"><div class="label">Telefoon</div><div class="value"><a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></div></div>
        <div class="detail-field"><div class="label">Email</div><div class="value"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div></div>
      </div>
      <div class="detail-field"><div class="label">Type verzoek</div><div class="value">${esc(c.requestType)}</div></div>
    </div>
    <div class="detail-section">
      <div class="detail-field"><div class="label">Ontvangen op</div><div class="value">${formatDate(c.createdAt)}</div></div>
    </div>
    <div class="detail-section notes-section">
      <div class="detail-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Notities (${notes.length})
      </div>
      ${notes.map(n => `<div class="note"><div class="note-meta">${esc(n.authorName)} &middot; ${formatDate(n.createdAt)}</div><div class="note-content">${esc(n.content)}</div></div>`).join("")}
      <div class="note-form">
        <textarea id="noteInput" placeholder="Schrijf een notitie..."></textarea>
        <button class="btn btn-primary btn-sm" style="width:auto;align-self:flex-end" onclick="addNote('${id}','callback')">Notitie opslaan</button>
      </div>
    </div>
  `;
  openDetail();
}

async function updateCallbackStatus(id) {
  const status = document.getElementById("statusSelect").value;
  await api(`/api/crm/callback-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  showToast("Status bijgewerkt");
  const idx = allCallbacks.findIndex(c => c.id === id);
  if (idx !== -1) allCallbacks[idx].status = status;
  refreshCurrentView();
}

async function renderMessages(container) {
  const res = await api("/api/crm/contact-messages");
  allMessages = await res.json();
  renderMessageTable(container, allMessages);
}

function getFilteredMessages() {
  let filtered = allMessages;
  if (filterState.search) filtered = filtered.filter(m => `${m.name} ${m.email} ${m.subject}`.toLowerCase().includes(filterState.search));
  return filtered;
}

function renderMessageTable(container, data) {
  const sorted = sortData(data, sortConfig.key, sortConfig.dir);
  const pageData = paginate(sorted);
  const allChecked = pageData.length > 0 && pageData.every(m => selectedIds.has(m.id));

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Contactberichten <span class="count-badge">${data.length}</span></h3>
        <div class="toolbar">
          <div class="search-box">
            ${searchIcon()}
            <input type="text" placeholder="Zoeken op naam, email, onderwerp..." id="msgSearch" oninput="filterMessages()" value="${esc(filterState.search)}">
          </div>
        </div>
      </div>
      ${renderBulkActions()}
      ${data.length === 0 ? '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Geen berichten gevonden</p></div>' : `
      <table>
        <thead><tr>
          <th style="width:40px"><input type="checkbox" ${allChecked ? 'checked' : ''} onchange="toggleSelectAll(this.checked)"></th>
          <th class="${sortClass('name')}" onclick="toggleSort('name')">Naam ${sortIcon('name')}</th>
          <th class="${sortClass('email')}" onclick="toggleSort('email')">Email ${sortIcon('email')}</th>
          <th class="${sortClass('subject')}" onclick="toggleSort('subject')">Onderwerp ${sortIcon('subject')}</th>
          <th>Bericht</th>
          <th class="${sortClass('createdAt')}" onclick="toggleSort('createdAt')">Ontvangen ${sortIcon('createdAt')}</th>
        </tr></thead>
        <tbody>
          ${pageData.map(m => `
            <tr class="${selectedIds.has(m.id) ? 'selected' : ''}">
              <td><input type="checkbox" ${selectedIds.has(m.id) ? 'checked' : ''} onclick="toggleSelect('${m.id}',event)"></td>
              <td><strong>${esc(m.name)}</strong></td>
              <td><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></td>
              <td>${esc(m.subject)}</td>
              <td><small style="color:var(--gray-500)">${esc(m.message.substring(0, 100))}${m.message.length > 100 ? "..." : ""}</small></td>
              <td><small style="color:var(--gray-500)">${formatDate(m.createdAt)}</small></td>
            </tr>
          `).join("")}
        </tbody>
      </table>`}
      ${renderPagination(data.length)}
    </div>
  `;
}

function filterMessages() {
  paginationConfig.page = 1;
  filterState.search = (document.getElementById("msgSearch")?.value || "").toLowerCase();
  const filtered = getFilteredMessages();
  renderMessageTable(document.getElementById("pageContent"), filtered);
}

async function addNote(leadId, leadType) {
  const input = document.getElementById("noteInput");
  const content = input.value.trim();
  if (!content) return;
  await api("/api/crm/notes", { method: "POST", body: JSON.stringify({ leadId, leadType, content }) });
  showToast("Notitie toegevoegd");
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

function escapeCsv(val) {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function exportData(type, format) {
  let data, headers, filename;

  if (type === "quotes") {
    data = allQuotes;
    headers = ["Voornaam","Achternaam","Email","Telefoon","Van Adres","Van Postcode","Van Stad","Naar Adres","Naar Postcode","Naar Stad","Type","Verhuisdatum","Opmerkingen","Status","Ontvangen"];
    filename = "offerte-aanvragen";
  } else if (type === "callbacks") {
    data = allCallbacks;
    headers = ["Voornaam","Achternaam","Telefoon","Email","Type Verzoek","Status","Ontvangen"];
    filename = "terugbelverzoeken";
  } else if (type === "messages") {
    data = allMessages;
    headers = ["Naam","Email","Telefoon","Onderwerp","Bericht","Ontvangen"];
    filename = "contactberichten";
  }

  if (format === "csv") {
    let csv = headers.join(",") + "\n";
    data.forEach(row => {
      let values;
      if (type === "quotes") {
        values = [row.firstName,row.lastName,row.email,row.phone,row.moveFromAddress,row.moveFromPostcode,row.moveFromCity,row.moveToAddress,row.moveToPostcode,row.moveToCity,row.moveType,row.moveDate,row.additionalNotes,row.status,row.createdAt];
      } else if (type === "callbacks") {
        values = [row.firstName,row.lastName,row.phone,row.email,row.requestType,row.status,row.createdAt];
      } else {
        values = [row.name,row.email,row.phone,row.subject,row.message,row.createdAt];
      }
      csv += values.map(escapeCsv).join(",") + "\n";
    });
    downloadFile(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
    showToast(`${data.length} rijen geexporteerd als CSV`);
  } else if (format === "xlsx") {
    let rows = [];
    data.forEach(row => {
      if (type === "quotes") {
        rows.push([row.firstName,row.lastName,row.email,row.phone,row.moveFromAddress,row.moveFromPostcode,row.moveFromCity,row.moveToAddress||"",row.moveToPostcode||"",row.moveToCity||"",row.moveType,row.moveDate,row.additionalNotes||"",row.status,row.createdAt]);
      } else if (type === "callbacks") {
        rows.push([row.firstName,row.lastName,row.phone,row.email,row.requestType,row.status,row.createdAt]);
      } else {
        rows.push([row.name,row.email,row.phone||"",row.subject,row.message,row.createdAt]);
      }
    });
    const xlsxContent = generateXLSX(headers, rows);
    downloadFile(xlsxContent, `${filename}.xls`, "application/vnd.ms-excel");
    showToast(`${data.length} rijen geexporteerd als XLSX`);
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateXLSX(headers, rows) {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '<Styles><Style ss:ID="header"><Font ss:Bold="1"/><Interior ss:Color="#1a2d5a" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/></Style></Styles>\n';
  xml += '<Worksheet ss:Name="Data"><Table>\n';
  xml += '<Row>';
  headers.forEach(h => { xml += `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`; });
  xml += '</Row>\n';
  rows.forEach(row => {
    xml += '<Row>';
    row.forEach(cell => { xml += `<Cell><Data ss:Type="String">${escapeXml(String(cell || ""))}</Data></Cell>`; });
    xml += '</Row>\n';
  });
  xml += '</Table></Worksheet></Workbook>';
  return xml;
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

checkAuth();
