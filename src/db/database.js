const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'smartfit.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    avatar TEXT, age INTEGER, poids REAL, taille REAL, sexe TEXT,
    objectif TEXT, niveau TEXT, jours TEXT, restrictions TEXT,
    google_id TEXT, morphotype TEXT, dob TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS programmes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    semaine INTEGER DEFAULT 1, data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS suivi (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    semaine INTEGER NOT NULL, poids REAL, calories_avg REAL,
    seances_faites INTEGER DEFAULT 0, seances_total INTEGER DEFAULT 0,
    notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS seances_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    semaine INTEGER NOT NULL, jour TEXT NOT NULL, type_seance TEXT,
    completee INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
});

// Async helper methods
db.get2 = (sql, params) => new Promise((resolve, reject) => {
  db.get(sql, params || [], (err, row) => { if (err) reject(err); else resolve(row); });
});
db.all2 = (sql, params) => new Promise((resolve, reject) => {
  db.all(sql, params || [], (err, rows) => { if (err) reject(err); else resolve(rows || []); });
});
db.run2 = (sql, params) => new Promise((resolve, reject) => {
  db.run(sql, params || [], function(err) { if (err) reject(err); else resolve(this); });
});

// Add missing columns if not exist (migration)
setTimeout(() => {
  db.run("ALTER TABLE users ADD COLUMN google_id TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN morphotype TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN dob TEXT", () => {});
}, 500);

console.log('✅ Database initialized');
module.exports = db;
