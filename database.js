const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "crm.db");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    displayName TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quote_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    firstName TEXT NOT NULL,
    lastName TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    moveFromAddress TEXT,
    moveFromPostcode TEXT,
    moveFromCity TEXT,
    moveToAddress TEXT,
    moveToPostcode TEXT,
    moveToCity TEXT,
    moveType TEXT,
    moveDate TEXT,
    additionalNotes TEXT,
    status TEXT NOT NULL DEFAULT 'nieuw',
    assignee TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS callback_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    firstName TEXT NOT NULL,
    lastName TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    requestType TEXT,
    status TEXT NOT NULL DEFAULT 'nieuw',
    assignee TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lead_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    leadId TEXT NOT NULL,
    leadType TEXT NOT NULL,
    content TEXT NOT NULL,
    authorName TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
