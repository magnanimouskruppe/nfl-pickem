import Database from 'better-sqlite3';

const db = new Database('pickem.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leagues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    invite_code TEXT UNIQUE,
    admin_id TEXT,
    dollar_per_point REAL DEFAULT 2,
    weekly_bonus REAL DEFAULT 5
  );

  CREATE TABLE IF NOT EXISTS league_members (
    league_id INTEGER,
    user_id TEXT,
    PRIMARY KEY (league_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week INTEGER,
    away_team TEXT,
    home_team TEXT,
    favorite TEXT,
    spread REAL,
    over_under REAL,
    start_time DATETIME,
    away_score INTEGER,
    home_score INTEGER,
    external_id TEXT
  );

  CREATE TABLE IF NOT EXISTS picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    game_id INTEGER,
    week INTEGER,
    pick_type TEXT,
    pick_value TEXT,
    confidence INTEGER,
    correct INTEGER,
    UNIQUE(user_id, week, confidence)
  );
`);

// Add columns if they don't exist (for existing databases)
const migrations = [
  `ALTER TABLE games ADD COLUMN external_id TEXT`,
  `ALTER TABLE leagues ADD COLUMN invite_code TEXT`,
  `ALTER TABLE leagues ADD COLUMN admin_id TEXT`,
];

for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* column exists */ }
}

export default db;
