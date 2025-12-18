import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Initialize tables
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS leagues (
      id SERIAL PRIMARY KEY,
      name TEXT,
      invite_code TEXT UNIQUE,
      admin_id TEXT,
      dollar_per_point REAL DEFAULT 2,
      weekly_bonus REAL DEFAULT 5
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS league_members (
      league_id INTEGER,
      user_id TEXT,
      PRIMARY KEY (league_id, user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      week INTEGER,
      away_team TEXT,
      home_team TEXT,
      favorite TEXT,
      spread REAL,
      over_under REAL,
      start_time TIMESTAMP,
      away_score INTEGER,
      home_score INTEGER,
      external_id TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS picks (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      game_id INTEGER,
      week INTEGER,
      pick_type TEXT,
      pick_value TEXT,
      confidence INTEGER,
      correct INTEGER,
      UNIQUE(user_id, week, confidence)
    )
  `);

  console.log('Database tables initialized');
}

init().catch(console.error);

export default pool;
