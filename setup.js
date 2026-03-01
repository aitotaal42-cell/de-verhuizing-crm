const db = require("./database");
const bcrypt = require("bcryptjs");

const username = process.argv[2] || "admin";
const password = process.argv[3] || "admin123";
const displayName = process.argv[4] || "Beheerder";

const hash = bcrypt.hashSync(password, 10);

const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
if (existing) {
  db.prepare("UPDATE users SET password = ?, displayName = ? WHERE username = ?").run(hash, displayName, username);
  console.log(`Gebruiker '${username}' bijgewerkt.`);
} else {
  db.prepare("INSERT INTO users (username, password, displayName) VALUES (?, ?, ?)").run(username, hash, displayName);
  console.log(`Gebruiker '${username}' aangemaakt.`);
}

console.log(`\nInloggegevens:`);
console.log(`  Gebruikersnaam: ${username}`);
console.log(`  Wachtwoord: ${password}`);
console.log(`\nWijzig het wachtwoord: node setup.js <gebruikersnaam> <wachtwoord> <naam>`);
