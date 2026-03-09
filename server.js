const express = require("express");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3001;
const SESSION_SECRET = process.env.SESSION_SECRET || "de-verhuizing-crm-secret-change-me";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
}));

app.use(express.static(path.join(__dirname, "public")));

function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: "Niet ingelogd" });
}

const VALID_STATUSES = ["nieuw", "in_behandeling", "offerte_verstuurd", "afgerond", "geannuleerd"];

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Vul alle velden in" });

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Onjuiste inloggegevens" });
  }

  req.session.userId = user.id;
  req.session.displayName = user.displayName;
  res.json({ success: true, user: { id: user.id, displayName: user.displayName } });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: "Niet ingelogd" });
  res.json({ id: req.session.userId, displayName: req.session.displayName });
});

app.post("/api/quote-requests", (req, res) => {
  try {
    const { firstName, lastName, email, phone, moveFromAddress, moveFromPostcode, moveFromCity, moveToAddress, moveToPostcode, moveToCity, moveType, moveDate, additionalNotes } = req.body;
    if (!firstName || !phone) {
      return res.status(400).json({ error: "Naam en telefoonnummer zijn verplicht" });
    }
    const stmt = db.prepare(`INSERT INTO quote_requests (firstName, lastName, email, phone, moveFromAddress, moveFromPostcode, moveFromCity, moveToAddress, moveToPostcode, moveToCity, moveType, moveDate, additionalNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(firstName, lastName || null, email || null, phone, moveFromAddress || null, moveFromPostcode || null, moveFromCity || null, moveToAddress || null, moveToPostcode || null, moveToCity || null, moveType || null, moveDate || null, additionalNotes || null);
    res.json({ success: true, message: "Offerte aanvraag ontvangen" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/callback-requests", (req, res) => {
  try {
    const { firstName, lastName, phone, email, requestType, preferredTime } = req.body;
    if (!firstName || !phone) {
      return res.status(400).json({ error: "Naam en telefoonnummer zijn verplicht" });
    }
    const stmt = db.prepare(`INSERT INTO callback_requests (firstName, lastName, phone, email, requestType) VALUES (?, ?, ?, ?, ?)`);
    stmt.run(firstName, lastName || null, phone, email || null, preferredTime || requestType || null);
    res.json({ success: true, message: "Terugbelverzoek ontvangen" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/contact-messages", (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Verplichte velden ontbreken" });
    }
    const stmt = db.prepare(`INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)`);
    stmt.run(name, email, phone || null, subject, message);
    res.json({ success: true, message: "Bericht ontvangen" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/crm/stats", isAuthenticated, (req, res) => {
  const totalQuotes = db.prepare("SELECT COUNT(*) as count FROM quote_requests").get().count;
  const newQuotes = db.prepare("SELECT COUNT(*) as count FROM quote_requests WHERE status = 'nieuw'").get().count;
  const totalCallbacks = db.prepare("SELECT COUNT(*) as count FROM callback_requests").get().count;
  const newCallbacks = db.prepare("SELECT COUNT(*) as count FROM callback_requests WHERE status = 'nieuw'").get().count;
  const totalMessages = db.prepare("SELECT COUNT(*) as count FROM contact_messages").get().count;
  res.json({ totalQuotes, newQuotes, totalCallbacks, newCallbacks, totalMessages });
});

app.get("/api/crm/quote-requests", isAuthenticated, (req, res) => {
  const rows = db.prepare("SELECT * FROM quote_requests ORDER BY createdAt DESC").all();
  res.json(rows);
});

app.patch("/api/crm/quote-requests/:id", isAuthenticated, (req, res) => {
  const { status, assignee } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Ongeldige status" });
  }
  const existing = db.prepare("SELECT * FROM quote_requests WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Niet gevonden" });

  if (status) db.prepare("UPDATE quote_requests SET status = ? WHERE id = ?").run(status, req.params.id);
  if (assignee !== undefined) db.prepare("UPDATE quote_requests SET assignee = ? WHERE id = ?").run(assignee, req.params.id);

  const updated = db.prepare("SELECT * FROM quote_requests WHERE id = ?").get(req.params.id);
  res.json(updated);
});

app.get("/api/crm/callback-requests", isAuthenticated, (req, res) => {
  const rows = db.prepare("SELECT * FROM callback_requests ORDER BY createdAt DESC").all();
  res.json(rows);
});

app.patch("/api/crm/callback-requests/:id", isAuthenticated, (req, res) => {
  const { status, assignee } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Ongeldige status" });
  }
  const existing = db.prepare("SELECT * FROM callback_requests WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Niet gevonden" });

  if (status) db.prepare("UPDATE callback_requests SET status = ? WHERE id = ?").run(status, req.params.id);
  if (assignee !== undefined) db.prepare("UPDATE callback_requests SET assignee = ? WHERE id = ?").run(assignee, req.params.id);

  const updated = db.prepare("SELECT * FROM callback_requests WHERE id = ?").get(req.params.id);
  res.json(updated);
});

app.get("/api/crm/contact-messages", isAuthenticated, (req, res) => {
  const rows = db.prepare("SELECT * FROM contact_messages ORDER BY createdAt DESC").all();
  res.json(rows);
});

app.delete("/api/crm/quote-requests/bulk", isAuthenticated, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Geen IDs opgegeven" });
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`DELETE FROM lead_notes WHERE leadType = 'quote' AND leadId IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM quote_requests WHERE id IN (${placeholders})`).run(...ids);
  res.json({ success: true, deleted: ids.length });
});

app.delete("/api/crm/callback-requests/bulk", isAuthenticated, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Geen IDs opgegeven" });
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`DELETE FROM lead_notes WHERE leadType = 'callback' AND leadId IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM callback_requests WHERE id IN (${placeholders})`).run(...ids);
  res.json({ success: true, deleted: ids.length });
});

app.delete("/api/crm/contact-messages/bulk", isAuthenticated, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Geen IDs opgegeven" });
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`DELETE FROM contact_messages WHERE id IN (${placeholders})`).run(...ids);
  res.json({ success: true, deleted: ids.length });
});

app.get("/api/crm/notes/:leadType/:leadId", isAuthenticated, (req, res) => {
  const rows = db.prepare("SELECT * FROM lead_notes WHERE leadType = ? AND leadId = ? ORDER BY createdAt DESC").all(req.params.leadType, req.params.leadId);
  res.json(rows);
});

app.post("/api/crm/notes", isAuthenticated, (req, res) => {
  const { leadId, leadType, content } = req.body;
  if (!leadId || !leadType || !content) return res.status(400).json({ error: "Verplichte velden ontbreken" });

  const stmt = db.prepare("INSERT INTO lead_notes (leadId, leadType, content, authorName) VALUES (?, ?, ?, ?)");
  stmt.run(leadId, leadType, content, req.session.displayName || "Onbekend");
  res.json({ success: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CRM server draait op http://localhost:${PORT}`);
});
