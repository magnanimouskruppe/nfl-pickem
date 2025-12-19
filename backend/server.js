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

const ODDS_API_KEY = process.env.ODDS_API_KEY;

// Helper to fetch from Odds API
async function fetchOddsAPI(endpoint) {
  const res = await fetch(`https://api.the-odds-api.com/v4/${endpoint}&apiKey=${ODDS_API_KEY}`);
  return res.json();
}

// 2025-26 NFL season week start dates (Wednesday before games start)
// Season runs Sep 4, 2025 - Jan 4, 2026
const NFL_WEEK_STARTS = {
  1: '2025-09-03',
  2: '2025-09-10',
  3: '2025-09-17',
  4: '2025-09-24',
  5: '2025-10-01',
  6: '2025-10-08',
  7: '2025-10-15',
  8: '2025-10-22',
  9: '2025-10-29',
  10: '2025-11-05',
  11: '2025-11-12',
  12: '2025-11-19',
  13: '2025-11-26',
  14: '2025-12-03',
  15: '2025-12-10',
  16: '2025-12-17',
  17: '2025-12-24',
  18: '2025-12-31',
};

// Determine NFL week from a game's start time
function getWeekFromDate(gameDate) {
  const date = new Date(gameDate);
  
  // Go through weeks in reverse to find which week this game belongs to
  for (let week = 18; week >= 1; week--) {
    const weekStart = new Date(NFL_WEEK_STARTS[week] + 'T00:00:00Z');
    if (date >= weekStart) {
      return week;
    }
  }
  return 1; // Default to week 1 if before season
}

// Team name mapping
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
app.post('/api/auth/login', async (req, res) => {
  const { id, email, name } = req.body;
  await db.query(
    `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET email = $2, name = $3`,
    [id, email, name]
  );
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

app.get('/api/my-league', async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json({ league: null });

  const membership = await db.query(
    `SELECT l.*, lm.user_id 
     FROM leagues l
     JOIN league_members lm ON l.id = lm.league_id
     WHERE lm.user_id = $1`,
    [userId]
  );

  if (membership.rows.length === 0) return res.json({ league: null });

  const league = membership.rows[0];
  const members = await db.query(
    `SELECT u.id, u.name, u.email
     FROM users u
     JOIN league_members lm ON u.id = lm.user_id
     WHERE lm.league_id = $1`,
    [league.id]
  );

  res.json({ 
    league: {
      id: league.id,
      name: league.name,
      inviteCode: league.invite_code,
      adminId: league.admin_id,
      dollarPerPoint: league.dollar_per_point,
      weeklyBonus: league.weekly_bonus,
    },
    members: members.rows,
    isAdmin: league.admin_id === userId
  });
});

app.post('/api/leagues', async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'League name required' });

  const existing = await db.query(`SELECT * FROM league_members WHERE user_id = $1`, [userId]);
  if (existing.rows.length > 0) return res.status(400).json({ error: 'You are already in a league' });

  const inviteCode = generateInviteCode();

  const result = await db.query(
    `INSERT INTO leagues (name, invite_code, admin_id) VALUES ($1, $2, $3) RETURNING id`,
    [name, inviteCode, userId]
  );

  await db.query(
    `INSERT INTO league_members (league_id, user_id) VALUES ($1, $2)`,
    [result.rows[0].id, userId]
  );

  res.json({ ok: true, leagueId: result.rows[0].id, inviteCode });
});

app.post('/api/leagues/join', async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  const { inviteCode } = req.body;
  if (!inviteCode) return res.status(400).json({ error: 'Invite code required' });

  const existing = await db.query(`SELECT * FROM league_members WHERE user_id = $1`, [userId]);
  if (existing.rows.length > 0) return res.status(400).json({ error: 'You are already in a league' });

  const league = await db.query(`SELECT * FROM leagues WHERE invite_code = $1`, [inviteCode.toUpperCase()]);
  if (league.rows.length === 0) return res.status(404).json({ error: 'Invalid invite code' });

  await db.query(
    `INSERT INTO league_members (league_id, user_id) VALUES ($1, $2)`,
    [league.rows[0].id, userId]
  );

  res.json({ ok: true, leagueId: league.rows[0].id, leagueName: league.rows[0].name });
});

app.get('/api/leagues/preview/:inviteCode', async (req, res) => {
  const league = await db.query(
    `SELECT id, name FROM leagues WHERE invite_code = $1`,
    [req.params.inviteCode.toUpperCase()]
  );
  if (league.rows.length === 0) return res.status(404).json({ error: 'Invalid invite code' });

  const memberCount = await db.query(
    `SELECT COUNT(*) as count FROM league_members WHERE league_id = $1`,
    [league.rows[0].id]
  );

  res.json({ name: league.rows[0].name, memberCount: parseInt(memberCount.rows[0].count) });
});

app.get('/api/current-week', async (req, res) => {
  // Return the current NFL week based on today's date
  const currentWeek = getWeekFromDate(new Date());
  res.json({ week: currentWeek });
});

app.get('/api/weeks', async (req, res) => {
  const weeks = await db.query(`SELECT DISTINCT week FROM games ORDER BY week`);
  res.json(weeks.rows.map(w => w.week));
});

app.get('/api/games/:week', async (req, res) => {
  const games = await db.query(`SELECT * FROM games WHERE week = $1 ORDER BY start_time`, [req.params.week]);
  res.json(games.rows);
});

app.post('/api/fetch-odds', async (req, res) => {
  try {
    const data = await fetchOddsAPI('sports/americanfootball_nfl/odds/?regions=us&markets=spreads,totals&oddsFormat=american');
    
    if (!Array.isArray(data)) {
      return res.status(500).json({ error: 'Invalid response from Odds API', data });
    }

    // Track which weeks we're updating
    const weeksToUpdate = new Set();
    const gamesToInsert = [];

    // First pass: determine weeks and prepare game data
    for (const game of data) {
      const startTime = game.commence_time;
      const week = getWeekFromDate(startTime);
      weeksToUpdate.add(week);

      const homeTeam = shortName(game.home_team);
      const awayTeam = shortName(game.away_team);
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

      gamesToInsert.push({
        week,
        awayTeam,
        homeTeam,
        favorite,
        spreadAbs,
        total,
        startTime,
        externalId
      });
    }

    // Delete existing games for the weeks we're updating
    for (const week of weeksToUpdate) {
      await db.query(`DELETE FROM games WHERE week = $1`, [week]);
    }

    // Insert all games
    let gamesAdded = 0;
    for (const game of gamesToInsert) {
      await db.query(
        `INSERT INTO games (week, away_team, home_team, favorite, spread, over_under, start_time, external_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [game.week, game.awayTeam, game.homeTeam, game.favorite, game.spreadAbs, game.total, game.startTime, game.externalId]
      );
      gamesAdded++;
    }

    // Return summary by week
    const weekSummary = {};
    for (const game of gamesToInsert) {
      weekSummary[game.week] = (weekSummary[game.week] || 0) + 1;
    }

    res.json({ ok: true, gamesAdded, weekSummary });
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

      const result = await db.query(
        `UPDATE games SET home_score = $1, away_score = $2 WHERE external_id = $3`,
        [parseInt(homeScore), parseInt(awayScore), game.id]
      );

      if (result.rowCount > 0) {
        gamesUpdated++;

        const dbGame = await db.query(`SELECT * FROM games WHERE external_id = $1`, [game.id]);
        if (dbGame.rows[0]) {
          await resolvePicksForGame(dbGame.rows[0], parseInt(homeScore), parseInt(awayScore));
        }
      }
    }

    res.json({ ok: true, gamesUpdated });
  } catch (err) {
    console.error('Error fetching scores:', err);
    res.status(500).json({ error: err.message });
  }
});

async function resolvePicksForGame(game, homeScore, awayScore) {
  const picks = await db.query(
    `SELECT * FROM picks WHERE game_id = $1 AND correct IS NULL`,
    [game.id]
  );
  
  const totalPoints = homeScore + awayScore;
  const homeMargin = homeScore - awayScore;
  
  const homeCovered = game.favorite === game.home_team
    ? homeMargin > game.spread
    : homeMargin > -game.spread;

  for (const pick of picks.rows) {
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
      await db.query(`UPDATE picks SET correct = $1 WHERE id = $2`, [correct, pick.id]);
    }
  }
}

app.get('/api/picks/:week', async (req, res) => {
  const { week } = req.params;
  const userId = req.userId;

  const membership = await db.query(
    `SELECT league_id FROM league_members WHERE user_id = $1`,
    [userId]
  );
  if (membership.rows.length === 0) return res.json([]);

  const picks = await db.query(
    `SELECT p.*, u.name as user_name, g.start_time
     FROM picks p
     JOIN users u ON p.user_id = u.id
     JOIN games g ON p.game_id = g.id
     JOIN league_members lm ON p.user_id = lm.user_id
     WHERE p.week = $1 AND lm.league_id = $2`,
    [week, membership.rows[0].league_id]
  );
  
  const now = new Date().toISOString();
  
  const filtered = picks.rows.map(p => {
    if (p.user_id === userId || p.start_time <= now) return p;
    return { ...p, pick_type: null, pick_value: null, game_id: null };
  });
  
  res.json(filtered);
});

app.post('/api/picks', async (req, res) => {
  const { gameId, week, pickType, pickValue, confidence } = req.body;
  const userId = req.userId;
  
  if (!userId) return res.status(401).json({ error: 'Not logged in' });
  
  const game = await db.query(`SELECT * FROM games WHERE id = $1`, [gameId]);
  if (game.rows.length === 0) {
    return res.status(400).json({ error: 'Game not found' });
  }
  if (new Date(game.rows[0].start_time) <= new Date()) {
    return res.status(400).json({ error: 'Game already started' });
  }
  
  await db.query(
    `INSERT INTO picks (user_id, game_id, week, pick_type, pick_value, confidence)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, week, confidence) DO UPDATE SET
       game_id = $2,
       pick_type = $4,
       pick_value = $5`,
    [userId, gameId, week, pickType, pickValue, confidence]
  );
  
  res.json({ ok: true });
});

app.delete('/api/picks/:week/:confidence', async (req, res) => {
  const { week, confidence } = req.params;
  await db.query(
    `DELETE FROM picks WHERE user_id = $1 AND week = $2 AND confidence = $3`,
    [req.userId, week, confidence]
  );
  res.json({ ok: true });
});

app.get('/api/leaderboard/:leagueId', async (req, res) => {
  const league = await db.query(`SELECT * FROM leagues WHERE id = $1`, [req.params.leagueId]);
  
  const scores = await db.query(
    `SELECT u.id, u.name, p.week, SUM(CASE WHEN p.correct = 1 THEN p.confidence ELSE 0 END) as points
     FROM users u
     JOIN league_members lm ON u.id = lm.user_id
     LEFT JOIN picks p ON u.id = p.user_id
     WHERE lm.league_id = $1
     GROUP BY u.id, u.name, p.week`,
    [req.params.leagueId]
  );
  
  res.json({ league: league.rows[0], scores: scores.rows });
});

app.post('/api/seed', async (req, res) => {
  await db.query(`DELETE FROM picks`);
  await db.query(`DELETE FROM games`);
  await db.query(`DELETE FROM users WHERE id LIKE 'fake-%'`);
  
  res.json({ ok: true, message: 'Data cleared. Run /api/fetch-odds to get live games.' });
});

// Catch-all: serve frontend for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
