import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, 'public')));

const ODDS_API_KEY = process.env.ODDS_API_KEY || '848c08ba37269c2c27ab631d2ccbe786';

// Helper to fetch from Odds API
async function fetchOddsAPI(endpoint) {
  const res = await fetch(`https://api.the-odds-api.com/v4/${endpoint}&apiKey=${ODDS_API_KEY}`);
  return res.json();
}

// Team name mapping (Odds API uses full names, we use short names)
const teamNameMap = {
  'Arizona Cardinals': 'Cardinals',
  'Atlanta Falcons': 'Falcons',
  'Baltimore Ravens': 'Ravens',
  'Buffalo Bills': 'Bills',
  'Carolina Panthers': 'Panthers',
  'Chicago Bears': 'Bears',
  'Cincinnati Bengals': 'Bengals',
  'Cleveland Browns': 'Browns',
  'Dallas Cowboys': 'Cowboys',
  'Denver Broncos': 'Broncos',
  'Detroit Lions': 'Lions',
  'Green Bay Packers': 'Packers',
  'Houston Texans': 'Texans',
  'Indianapolis Colts': 'Colts',
  'Jacksonville Jaguars': 'Jaguars',
  'Kansas City Chiefs': 'Chiefs',
  'Las Vegas Raiders': 'Raiders',
  'Los Angeles Chargers': 'Chargers',
  'Los Angeles Rams': 'Rams',
  'Miami Dolphins': 'Dolphins',
  'Minnesota Vikings': 'Vikings',
  'New England Patriots': 'Patriots',
  'New Orleans Saints': 'Saints',
  'New York Giants': 'Giants',
  'New York Jets': 'Jets',
  'Philadelphia Eagles': 'Eagles',
  'Pittsburgh Steelers': 'Steelers',
  'San Francisco 49ers': '49ers',
  'Seattle Seahawks': 'Seahawks',
  'Tampa Bay Buccaneers': 'Buccaneers',
  'Tennessee Titans': 'Titans',
  'Washington Commanders': 'Commanders',
};

function shortName(fullName) {
  return teamNameMap[fullName] || fullName;
}

app.use((req, res, next) => {
  req.userId = req.headers['x-user-id'] || null;
  next();
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { id, email, name } = req.body;
  db.prepare(`INSERT OR REPLACE INTO users (id, email, name) VALUES (?, ?, ?)`).run(id, email, name);
  res.json({ ok: true });
});

// Generate random invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// === LEAGUE MANAGEMENT ===

app.get('/api/my-league', (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json({ league: null });

  const membership = db.prepare(`
    SELECT l.*, lm.user_id 
    FROM leagues l
    JOIN league_members lm ON l.id = lm.league_id
    WHERE lm.user_id = ?
  `).get(userId);

  if (!membership) return res.json({ league: null });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email
    FROM users u
    JOIN league_members lm ON u.id = lm.user_id
    WHERE lm.league_id = ?
  `).all(membership.id);

  res.json({ 
    league: {
      id: membership.id,
      name: membership.name,
      inviteCode: membership.invite_code,
      adminId: membership.admin_id,
      dollarPerPoint: membership.dollar_per_point,
      weeklyBonus: membership.weekly_bonus,
    },
    members,
    isAdmin: membership.admin_id === userId
  });
});

app.post('/api/leagues', (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'League name required' });

  const existing = db.prepare(`SELECT * FROM league_members WHERE user_id = ?`).get(userId);
  if (existing) return res.status(400).json({ error: 'You are already in a league' });

  const inviteCode = generateInviteCode();

  const result = db.prepare(`
    INSERT INTO leagues (name, invite_code, admin_id) VALUES (?, ?, ?)
  `).run(name, inviteCode, userId);

  db.prepare(`INSERT INTO league_members (league_id, user_id) VALUES (?, ?)`).run(result.lastInsertRowid, userId);

  res.json({ 
    ok: true, 
    leagueId: result.lastInsertRowid,
    inviteCode 
  });
});

app.post('/api/leagues/join', (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  const { inviteCode } = req.body;
  if (!inviteCode) return res.status(400).json({ error: 'Invite code required' });

  const existing = db.prepare(`SELECT * FROM league_members WHERE user_id = ?`).get(userId);
  if (existing) return res.status(400).json({ error: 'You are already in a league' });

  const league = db.prepare(`SELECT * FROM leagues WHERE invite_code = ?`).get(inviteCode.toUpperCase());
  if (!league) return res.status(404).json({ error: 'Invalid invite code' });

  db.prepare(`INSERT INTO league_members (league_id, user_id) VALUES (?, ?)`).run(league.id, userId);

  res.json({ ok: true, leagueId: league.id, leagueName: league.name });
});

app.get('/api/leagues/preview/:inviteCode', (req, res) => {
  const league = db.prepare(`SELECT id, name FROM leagues WHERE invite_code = ?`).get(req.params.inviteCode.toUpperCase());
  if (!league) return res.status(404).json({ error: 'Invalid invite code' });

  const memberCount = db.prepare(`SELECT COUNT(*) as count FROM league_members WHERE league_id = ?`).get(league.id);

  res.json({ name: league.name, memberCount: memberCount.count });
});

app.get('/api/current-week', (req, res) => {
  const result = db.prepare(`SELECT MAX(week) as week FROM games`).get();
  res.json({ week: result?.week || 1 });
});

app.get('/api/weeks', (req, res) => {
  const weeks = db.prepare(`SELECT DISTINCT week FROM games ORDER BY week`).all();
  res.json(weeks.map(w => w.week));
});

app.get('/api/games/:week', (req, res) => {
  const games = db.prepare(`SELECT * FROM games WHERE week = ?`).all(req.params.week);
  res.json(games);
});

app.post('/api/fetch-odds', async (req, res) => {
  try {
    const data = await fetchOddsAPI('sports/americanfootball_nfl/odds/?regions=us&markets=spreads,totals&oddsFormat=american');
    
    if (!Array.isArray(data)) {
      return res.status(500).json({ error: 'Invalid response from Odds API', data });
    }

    const now = new Date();
    const seasonStart = new Date('2025-09-04');
    const weekNum = Math.ceil((now - seasonStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const currentWeek = Math.max(1, Math.min(weekNum, 18));

    db.prepare(`DELETE FROM games WHERE week = ?`).run(currentWeek);

    const insertGame = db.prepare(`
      INSERT INTO games (week, away_team, home_team, favorite, spread, over_under, start_time, external_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let gamesAdded = 0;

    for (const game of data) {
      const homeTeam = shortName(game.home_team);
      const awayTeam = shortName(game.away_team);
      const startTime = game.commence_time;
      const externalId = game.id;

      const bookmaker = game.bookmakers?.find(b => b.key === 'draftkings') || game.bookmakers?.[0];
      if (!bookmaker) continue;

      const spreadMarket = bookmaker.markets?.find(m => m.key === 'spreads');
      const homeSpreadOutcome = spreadMarket?.outcomes?.find(o => shortName(o.name) === homeTeam);
      const spread = homeSpreadOutcome?.point;

      const totalMarket = bookmaker.markets?.find(m => m.key === 'totals');
      const overOutcome = totalMarket?.outcomes?.find(o => o.name === 'Over');
      const total = overOutcome?.point;

      if (spread === undefined || total === undefined) continue;

      const favorite = spread < 0 ? homeTeam : awayTeam;
      const spreadAbs = Math.abs(spread);

      insertGame.run(currentWeek, awayTeam, homeTeam, favorite, spreadAbs, total, startTime, externalId);
      gamesAdded++;
    }

    res.json({ ok: true, week: currentWeek, gamesAdded });
  } catch (err) {
    console.error('Error fetching odds:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fetch-scores', async (req, res) => {
  try {
    const data = await fetchOddsAPI('sports/americanfootball_nfl/scores/?daysFrom=3');

    if (!Array.isArray(data)) {
      return res.status(500).json({ error: 'Invalid response from Odds API', data });
    }

    let gamesUpdated = 0;

    for (const game of data) {
      if (!game.completed) continue;

      const homeTeam = shortName(game.home_team);
      const awayTeam = shortName(game.away_team);

      const homeScore = game.scores?.find(s => shortName(s.name) === homeTeam)?.score;
      const awayScore = game.scores?.find(s => shortName(s.name) === awayTeam)?.score;

      if (homeScore === undefined || awayScore === undefined) continue;

      const result = db.prepare(`
        UPDATE games SET home_score = ?, away_score = ? 
        WHERE external_id = ?
      `).run(parseInt(homeScore), parseInt(awayScore), game.id);

      if (result.changes > 0) {
        gamesUpdated++;

        const dbGame = db.prepare(`SELECT * FROM games WHERE external_id = ?`).get(game.id);
        if (dbGame) {
          resolvePicksForGame(dbGame, parseInt(homeScore), parseInt(awayScore));
        }
      }
    }

    res.json({ ok: true, gamesUpdated });
  } catch (err) {
    console.error('Error fetching scores:', err);
    res.status(500).json({ error: err.message });
  }
});

function resolvePicksForGame(game, homeScore, awayScore) {
  const picks = db.prepare(`SELECT * FROM picks WHERE game_id = ? AND correct IS NULL`).all(game.id);
  
  const totalPoints = homeScore + awayScore;
  const homeMargin = homeScore - awayScore;
  
  const homeCovered = game.favorite === game.home_team
    ? homeMargin > game.spread
    : homeMargin > -game.spread;

  for (const pick of picks) {
    let correct = null;

    if (pick.pick_type === 'spread') {
      if (pick.pick_value === 'fav') {
        correct = (game.favorite === game.home_team ? homeCovered : !homeCovered) ? 1 : 0;
      } else {
        correct = (game.favorite === game.home_team ? !homeCovered : homeCovered) ? 1 : 0;
      }
    } else if (pick.pick_type === 'total') {
      if (pick.pick_value === 'over') {
        correct = totalPoints > game.over_under ? 1 : 0;
      } else {
        correct = totalPoints < game.over_under ? 1 : 0;
      }
    }

    if (correct !== null) {
      db.prepare(`UPDATE picks SET correct = ? WHERE id = ?`).run(correct, pick.id);
    }
  }
}

app.get('/api/picks/:week', (req, res) => {
  const { week } = req.params;
  const userId = req.userId;

  const membership = db.prepare(`SELECT league_id FROM league_members WHERE user_id = ?`).get(userId);
  if (!membership) return res.json([]);

  const picks = db.prepare(`
    SELECT p.*, u.name as user_name, g.start_time
    FROM picks p
    JOIN users u ON p.user_id = u.id
    JOIN games g ON p.game_id = g.id
    JOIN league_members lm ON p.user_id = lm.user_id
    WHERE p.week = ? AND lm.league_id = ?
  `).all(week, membership.league_id);
  
  const now = new Date().toISOString();
  
  const filtered = picks.map(p => {
    if (p.user_id === userId || p.start_time <= now) return p;
    return { ...p, pick_type: null, pick_value: null, game_id: null };
  });
  
  res.json(filtered);
});

app.post('/api/picks', (req, res) => {
  const { gameId, week, pickType, pickValue, confidence } = req.body;
  const userId = req.userId;
  
  if (!userId) return res.status(401).json({ error: 'Not logged in' });
  
  const game = db.prepare(`SELECT * FROM games WHERE id = ?`).get(gameId);
  if (!game) {
    return res.status(400).json({ error: 'Game not found' });
  }
  if (new Date(game.start_time) <= new Date()) {
    return res.status(400).json({ error: 'Game already started' });
  }
  
  db.prepare(`
    INSERT INTO picks (user_id, game_id, week, pick_type, pick_value, confidence)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, week, confidence) DO UPDATE SET
      game_id = excluded.game_id,
      pick_type = excluded.pick_type,
      pick_value = excluded.pick_value
  `).run(userId, gameId, week, pickType, pickValue, confidence);
  
  res.json({ ok: true });
});

app.delete('/api/picks/:week/:confidence', (req, res) => {
  const { week, confidence } = req.params;
  db.prepare(`DELETE FROM picks WHERE user_id = ? AND week = ? AND confidence = ?`)
    .run(req.userId, week, confidence);
  res.json({ ok: true });
});

app.get('/api/leaderboard/:leagueId', (req, res) => {
  const league = db.prepare(`SELECT * FROM leagues WHERE id = ?`).get(req.params.leagueId);
  
  const scores = db.prepare(`
    SELECT u.id, u.name, p.week, SUM(CASE WHEN p.correct = 1 THEN p.confidence ELSE 0 END) as points
    FROM users u
    JOIN league_members lm ON u.id = lm.user_id
    LEFT JOIN picks p ON u.id = p.user_id
    WHERE lm.league_id = ?
    GROUP BY u.id, p.week
  `).all(req.params.leagueId);
  
  res.json({ league, scores });
});

app.post('/api/seed', (req, res) => {
  db.prepare(`DELETE FROM picks`).run();
  db.prepare(`DELETE FROM games`).run();
  db.prepare(`DELETE FROM users WHERE id LIKE 'fake-%'`).run();
  
  db.prepare(`INSERT OR IGNORE INTO leagues (id, name) VALUES (1, 'Test League')`).run();
  
  const fakePlayers = [
    { id: 'fake-player-b', email: 'playerb@test.com', name: 'Mike Johnson' },
    { id: 'fake-player-c', email: 'playerc@test.com', name: 'Sarah Williams' },
    { id: 'fake-player-d', email: 'playerd@test.com', name: 'Chris Davis' },
  ];
  
  const insertUser = db.prepare(`INSERT OR REPLACE INTO users (id, email, name) VALUES (?, ?, ?)`);
  fakePlayers.forEach(p => insertUser.run(p.id, p.email, p.name));
  
  res.json({ ok: true, message: 'Fake players created. Run /api/fetch-odds to get live games.' });
});

// Catch-all: serve frontend for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
