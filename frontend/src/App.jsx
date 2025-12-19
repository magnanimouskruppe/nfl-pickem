import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from './api';
import { auth, loginWithGoogle, logout } from './firebase';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('games');
  const [games, setGames] = useState([]);
  const [allPicks, setAllPicks] = useState([]);
  const [myPicks, setMyPicks] = useState({});
  const [users, setUsers] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [league, setLeague] = useState(null);
  const [leagueMembers, setLeagueMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leagueLoading, setLeagueLoading] = useState(true);

  useEffect(() => {
    return auth.onAuthStateChanged(async (u) => {
      if (u) {
        api.userId = u.uid;
        await api.login({ id: u.uid, email: u.email, name: u.displayName });
        setUser(u);
      } else {
        api.userId = null;
        setUser(null);
      }
    });
  }, []);

  // Load league info on startup
  useEffect(() => {
    if (!user) return;
    loadLeague();
  }, [user]);

  const loadLeague = async () => {
    setLeagueLoading(true);
    const data = await api.getMyLeague();
    setLeague(data.league);
    setLeagueMembers(data.members || []);
    setIsAdmin(data.isAdmin || false);
    setLeagueLoading(false);
  };

  // Load current week on startup
  useEffect(() => {
    if (!user || !league) return;
    api.getCurrentWeek().then(data => setCurrentWeek(data.week));
    api.getWeeks().then(setAvailableWeeks);
  }, [user, league]);

  const loadData = async () => {
    if (!user || !currentWeek || !league) return;
    const g = await api.getGames(currentWeek);
    setGames(g);
    const p = await api.getPicks(currentWeek);
    setAllPicks(p);
    
    const mine = {};
    p.filter(x => x.user_id === user.uid).forEach(x => {
      mine[x.confidence] = { 
        gameId: x.game_id, 
        pickType: x.pick_type, 
        pickValue: x.pick_value,
        game: g.find(game => game.id === x.game_id)
      };
    });
    setMyPicks(mine);

    const uniqueUsers = [...new Map(p.map(x => [x.user_id, { id: x.user_id, name: x.user_name }])).values()];
    setUsers(uniqueUsers);
  };

  useEffect(() => { loadData(); }, [user, currentWeek, league]);

  const handlePick = async (confidence, gameId, pickType, pickValue) => {
    await api.submitPick({ gameId, week: currentWeek, pickType, pickValue, confidence });
    loadData();
  };

  const clearPick = async (confidence) => {
    await api.deletePick(currentWeek, confidence);
    const copy = { ...myPicks };
    delete copy[confidence];
    setMyPicks(copy);
  };

  if (!user) {
    // Check for invite code in URL
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('join');

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <h1 className="text-3xl font-bold mb-4">NFL Pickem</h1>
          {inviteCode && <p className="text-gray-600 mb-4">Sign in to join the league</p>}
          <button onClick={loginWithGoogle} className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (leagueLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Not in a league - show create/join screen
  if (!league) {
    return <LeagueSetup user={user} onComplete={loadLeague} />;
  }

  if (!currentWeek) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading games...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900">{league.name}</h1>
              {availableWeeks.length > 0 && (
                <select 
                  className="border rounded px-3 py-1 text-lg font-medium"
                  value={currentWeek}
                  onChange={(e) => setCurrentWeek(parseInt(e.target.value))}
                >
                  {availableWeeks.map(w => (
                    <option key={w} value={w}>Week {w}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user.displayName}</span>
              <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Logout</button>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {[
              { id: 'games', label: "This Week's Games" },
              { id: 'gamecenter', label: 'Weekly Gamecenter' },
              { id: 'myPicks', label: 'My Picks' },
              { id: 'otherPicks', label: "Other Player's Picks" },
              { id: 'results', label: 'Season Results' },
              { id: 'league', label: 'League' },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setView(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium ${view === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {view === 'games' && <GamesView games={games} week={currentWeek} />}
        {view === 'gamecenter' && <GamecenterView games={games} allPicks={allPicks} users={users} currentUserId={user.uid} week={currentWeek} />}
        {view === 'myPicks' && (
          <MyPicksView games={games} myPicks={myPicks} onPick={handlePick} onClear={clearPick} week={currentWeek} />
        )}
        {view === 'otherPicks' && (
          <OtherPicksView games={games} allPicks={allPicks} users={users} currentUserId={user.uid} />
        )}
        {view === 'results' && <ResultsView />}
        {view === 'league' && <LeagueView league={league} members={leagueMembers} isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

function LeagueSetup({ user, onComplete }) {
  const [mode, setMode] = useState(null); // 'create' or 'join'
  const [leagueName, setLeagueName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewLeague, setPreviewLeague] = useState(null);

  // Check URL for invite code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      setInviteCode(code);
      setMode('join');
      // Preview the league
      api.previewLeague(code).then(data => {
        if (!data.error) setPreviewLeague(data);
      });
    }
  }, []);

  const handleCreate = async () => {
    if (!leagueName.trim()) {
      setError('Please enter a league name');
      return;
    }
    setLoading(true);
    setError('');
    const result = await api.createLeague(leagueName.trim());
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onComplete();
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }
    setLoading(true);
    setError('');
    const result = await api.joinLeague(inviteCode.trim());
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      // Clear URL param
      window.history.replaceState({}, '', window.location.pathname);
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user.displayName}!</h1>
        <p className="text-gray-600 mb-6">You're not in a league yet. Create one or join an existing league.</p>

        {!mode && (
          <div className="space-y-3">
            <button 
              onClick={() => setMode('create')}
              className="w-full bg-blue-500 text-white px-6 py-3 rounded font-medium hover:bg-blue-600"
            >
              Create a New League
            </button>
            <button 
              onClick={() => setMode('join')}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded font-medium hover:bg-gray-200"
            >
              Join an Existing League
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">League Name</label>
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                placeholder="e.g., Playoffs 2025"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button 
                onClick={() => setMode(null)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded font-medium"
              >
                Back
              </button>
              <button 
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create League'}
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4">
            {previewLeague && (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-green-800">
                Joining: <strong>{previewLeague.name}</strong> ({previewLeague.memberCount} members)
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g., ABC123XY"
                className="w-full border rounded px-3 py-2 uppercase"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button 
                onClick={() => { setMode(null); setPreviewLeague(null); }}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded font-medium"
              >
                Back
              </button>
              <button 
                onClick={handleJoin}
                disabled={loading}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join League'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t text-center">
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function LeagueView({ league, members, isAdmin }) {
  const [copied, setCopied] = useState(false);
  
  const inviteUrl = `${window.location.origin}?join=${league.inviteCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">League Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">League Name</label>
            <div className="text-lg font-medium">{league.name}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">Scoring</label>
            <div className="text-lg">${league.dollarPerPoint} per point â€¢ ${league.weeklyBonus} weekly bonus</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Invite Link</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={inviteUrl}
                className="flex-1 border rounded px-3 py-2 bg-gray-50 text-sm"
              />
              <button 
                onClick={copyLink}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">Share this link with friends to invite them</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Members ({members.length})</h2>
        <div className="space-y-2">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <div className="font-medium">{member.name}</div>
                <div className="text-sm text-gray-500">{member.email}</div>
              </div>
              {member.id === league.adminId && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Admin</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GamecenterView({ games, allPicks, users, currentUserId, week }) {
  const getPickLabel = (game, pickType, pickValue) => {
    if (!game) return '';
    const underdog = game.favorite === game.home_team ? game.away_team : game.home_team;
    if (pickType === 'spread' && pickValue === 'fav') return `${game.favorite} -${game.spread}`;
    if (pickType === 'spread' && pickValue === 'dog') return `${underdog} +${game.spread}`;
    if (pickType === 'total' && pickValue === 'over') return `${game.away_team}/${game.home_team} O ${game.over_under}`;
    if (pickType === 'total' && pickValue === 'under') return `${game.away_team}/${game.home_team} U ${game.over_under}`;
    return '';
  };

  // Calculate scores for each user
  const playerScores = users.map(user => {
    const userPicks = allPicks.filter(p => p.user_id === user.id);
    let current = 0;
    let potential = 55; // Max possible points (10+9+8+7+6+5+4+3+2+1)

    userPicks.forEach(pick => {
      if (pick.correct === 1) {
        current += pick.confidence;
      } else if (pick.correct === 0) {
        potential -= pick.confidence;
      }
    });

    // Calculate remaining (potential points not yet decided)
    const remaining = potential - current;

    return {
      id: user.id,
      name: user.name,
      current,
      potential,
      remaining: remaining > 0 ? remaining : 0,
      picks: userPicks
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Calculate averages
  const avgCurrent = playerScores.length > 0 
    ? (playerScores.reduce((sum, p) => sum + p.current, 0) / playerScores.length).toFixed(1)
    : 0;
  const avgPotential = playerScores.length > 0
    ? (playerScores.reduce((sum, p) => sum + p.potential, 0) / playerScores.length).toFixed(1)
    : 0;

  // Prepare chart data
  const chartData = playerScores.map(p => ({
    name: p.name.split(' ')[0], // First name only for chart
    Current: p.current,
    Remaining: p.remaining,
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Week {week} Scoreboard</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis domain={[0, 55]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Current" stackId="a" fill="#3B82F6" />
            <Bar dataKey="Remaining" stackId="a" fill="#FCD34D" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-2 font-bold">Player</th>
              <th className="text-center py-2 px-2 font-bold" colSpan={2}>Point Results</th>
              <th className="text-center py-2 px-2 font-bold" colSpan={2}>Points vs Avg</th>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(conf => (
                <th key={conf} className="text-center py-2 px-1 font-bold min-w-[80px]">{conf}</th>
              ))}
            </tr>
            <tr className="border-b border-gray-200 text-gray-500 text-xs">
              <th></th>
              <th className="py-1 px-2">Current</th>
              <th className="py-1 px-2">Pot'l Max</th>
              <th className="py-1 px-2">Current</th>
              <th className="py-1 px-2">Pot'l Max</th>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(conf => (
                <th key={conf}></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {playerScores.map(player => {
              const vsAvgCurrent = (player.current - parseFloat(avgCurrent)).toFixed(0);
              const vsAvgPotential = (player.potential - parseFloat(avgPotential)).toFixed(0);

              return (
                <tr key={player.id} className="border-b border-gray-100">
                  <td className="py-2 px-2 font-semibold whitespace-nowrap">{player.name}</td>
                  <td className="py-2 px-2 text-center">{player.current}</td>
                  <td className="py-2 px-2 text-center">{player.potential}</td>
                  <td className={`py-2 px-2 text-center ${parseFloat(vsAvgCurrent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(vsAvgCurrent) >= 0 ? '+' : ''}{vsAvgCurrent}
                  </td>
                  <td className={`py-2 px-2 text-center ${parseFloat(vsAvgPotential) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(vsAvgPotential) >= 0 ? '+' : ''}{vsAvgPotential}
                  </td>
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(conf => {
                    const pick = player.picks.find(p => p.confidence === conf);
                    const game = pick ? games.find(g => g.id === pick.game_id) : null;
                    const isHidden = pick && !pick.pick_type;
                    const isCurrentUser = player.id === currentUserId;

                    let bgColor = 'bg-gray-50';
                    let textColor = 'text-gray-400';
                    let content = '-';

                    if (isHidden && !isCurrentUser) {
                      content = '?';
                      bgColor = 'bg-gray-100';
                      textColor = 'text-gray-400';
                    } else if (pick) {
                      content = getPickLabel(game, pick.pick_type, pick.pick_value);
                      if (pick.correct === 1) {
                        bgColor = 'bg-green-100';
                        textColor = 'text-green-700';
                      } else if (pick.correct === 0) {
                        bgColor = 'bg-red-100';
                        textColor = 'text-red-700';
                      } else {
                        bgColor = 'bg-blue-50';
                        textColor = 'text-blue-700';
                      }
                    }

                    return (
                      <td key={conf} className={`py-2 px-1 text-center ${bgColor} ${textColor} text-xs`}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Average row */}
            <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
              <td className="py-2 px-2">Average</td>
              <td className="py-2 px-2 text-center">{avgCurrent}</td>
              <td className="py-2 px-2 text-center">{avgPotential}</td>
              <td className="py-2 px-2 text-center">-</td>
              <td className="py-2 px-2 text-center">-</td>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(conf => (
                <td key={conf} className="py-2 px-1"></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GamesView({ games, week }) {
  const formatSpread = (game) => {
    const underdogSpread = `+${game.spread}`;
    const favSpread = `-${game.spread}`;
    if (game.favorite === game.home_team) {
      return { away: underdogSpread, home: favSpread };
    }
    return { away: favSpread, home: underdogSpread };
  };

  const formatScore = (game) => {
    if (game.away_score === null || game.home_score === null) return null;
    return `${game.away_team} ${game.away_score}, ${game.home_team} ${game.home_score}`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Week {week} Games</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-2">Matchup</th>
              <th className="text-center py-3 px-2">Spread</th>
              <th className="text-center py-3 px-2">Over/Under</th>
              <th className="text-center py-3 px-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              const spreads = formatSpread(game);
              const score = formatScore(game);
              return (
                <tr key={game.id} className="border-b border-gray-100">
                  <td className="py-3 px-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{game.away_team}</span>
                      <span className="text-gray-500">@ {game.home_team}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    <div className="flex flex-col">
                      <span>{game.away_team} {spreads.away}</span>
                      <span>{game.home_team} {spreads.home}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    <div className="flex flex-col">
                      <span>O {game.over_under}</span>
                      <span>U {game.over_under}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    {score ? (
                      <span className="font-medium">{score}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MyPicksView({ games, myPicks, onPick, onClear, week }) {
  const [selections, setSelections] = useState({});

  const getPickLabel = (game, pickType, pickValue) => {
    if (!game) return '';
    const underdog = game.favorite === game.home_team ? game.away_team : game.home_team;
    if (pickType === 'spread' && pickValue === 'fav') return `${game.favorite} -${game.spread}`;
    if (pickType === 'spread' && pickValue === 'dog') return `${underdog} +${game.spread}`;
    if (pickType === 'total' && pickValue === 'over') return `Over ${game.over_under}`;
    if (pickType === 'total' && pickValue === 'under') return `Under ${game.over_under}`;
    return '';
  };

  const getPropsForGame = (gameId) => {
    const g = games.find(x => x.id === gameId);
    if (!g) return [];
    const underdog = g.favorite === g.home_team ? g.away_team : g.home_team;
    
    const allProps = [
      { type: 'spread', value: 'fav', label: `${g.favorite} -${g.spread}` },
      { type: 'spread', value: 'dog', label: `${underdog} +${g.spread}` },
      { type: 'total', value: 'over', label: `Over ${g.over_under}` },
      { type: 'total', value: 'under', label: `Under ${g.over_under}` },
    ];

    // Filter out props that conflict with existing picks
    return allProps.filter(prop => {
      for (const [conf, pick] of Object.entries(myPicks)) {
        if (!pick || pick.gameId !== gameId) continue;
        // Can't pick same type (spread/total) from same game twice
        if (pick.pickType === prop.type) return false;
      }
      return true;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Week {week} Picks</h2>
      
      <div className="border-b-2 border-gray-200 pb-3 mb-4">
        <div className="flex items-center">
          <div className="w-16 text-center">
            <div className="text-sm font-bold text-gray-700">Points</div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 ml-4">
            <div className="text-sm font-bold text-gray-700 text-center">Select Game</div>
            <div className="text-sm font-bold text-gray-700 text-center">Select Pick</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[10,9,8,7,6,5,4,3,2,1].map((conf) => {
          const pick = myPicks[conf];
          const selGame = selections[conf];
          const props = getPropsForGame(selGame);

          return (
            <div key={conf} className="border rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-16 flex justify-center">
                  <div className="text-2xl font-bold text-gray-800">{conf}</div>
                </div>
                {pick ? (
                  <>
                    <div className="flex-1 ml-4 mr-3">
                      <div className="bg-blue-50 rounded p-3">
                        <div className="font-semibold text-sm">{pick.game?.away_team} @ {pick.game?.home_team}</div>
                        <div className="text-blue-600 font-bold">{getPickLabel(pick.game, pick.pickType, pick.pickValue)}</div>
                      </div>
                    </div>
                    <button onClick={() => onClear(conf)} className="text-red-500 hover:text-red-700 text-sm">
                      Clear
                    </button>
                  </>
                ) : (
                  <div className="flex-1 grid grid-cols-2 gap-3 ml-4">
                    <select 
                      className="w-full border rounded px-3 py-2 bg-white text-sm"
                      value={selGame || ''}
                      onChange={(e) => setSelections({ ...selections, [conf]: +e.target.value })}
                    >
                      <option value="">Game...</option>
                      {games.map((g) => (
                        <option key={g.id} value={g.id}>{g.away_team} @ {g.home_team}</option>
                      ))}
                    </select>
                    <select 
                      className={`w-full border rounded px-3 py-2 bg-white text-sm ${!selGame ? 'bg-gray-100' : ''}`}
                      disabled={!selGame}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const [type, value] = e.target.value.split('|');
                        onPick(conf, selGame, type, value);
                        setSelections({ ...selections, [conf]: null });
                      }}
                    >
                      <option value="">Pick...</option>
                      {props.map((p) => (
                        <option key={p.value} value={`${p.type}|${p.value}`}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OtherPicksView({ games, allPicks, users, currentUserId }) {
  const [selectedPlayer, setSelectedPlayer] = useState(currentUserId);

  const getPickLabel = (game, pickType, pickValue) => {
    if (!game) return '';
    const underdog = game.favorite === game.home_team ? game.away_team : game.home_team;
    if (pickType === 'spread' && pickValue === 'fav') return `${game.favorite} -${game.spread}`;
    if (pickType === 'spread' && pickValue === 'dog') return `${underdog} +${game.spread}`;
    if (pickType === 'total' && pickValue === 'over') return `Over ${game.over_under}`;
    if (pickType === 'total' && pickValue === 'under') return `Under ${game.over_under}`;
    return '';
  };

  const playerPicks = allPicks.filter(p => p.user_id === selectedPlayer);
  const picksByConfidence = {};
  playerPicks.forEach(p => {
    picksByConfidence[p.confidence] = p;
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Weekly Picks</h2>
        <select 
          className="border rounded px-3 py-1"
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
        >
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}{u.id === currentUserId ? ' (me)' : ''}</option>
          ))}
        </select>
      </div>

      <div className="border-b-2 border-gray-200 pb-3 mb-4">
        <div className="flex items-center">
          <div className="w-16 text-center">
            <div className="text-sm font-bold text-gray-700">Points</div>
          </div>
          <div className="flex-1 ml-4">
            <div className="text-sm font-bold text-gray-700 text-center">Pick Details</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[10,9,8,7,6,5,4,3,2,1].map((conf) => {
          const pick = picksByConfidence[conf];
          const game = pick ? games.find(g => g.id === pick.game_id) : null;
          const isHidden = pick && !pick.pick_type;

          let bgColor = 'bg-gray-50';
          let borderColor = 'border-gray-200';
          let textColor = 'text-gray-500';

          if (pick?.correct === 1) {
            bgColor = 'bg-green-50';
            borderColor = 'border-green-200';
            textColor = 'text-green-600';
          } else if (pick?.correct === 0) {
            bgColor = 'bg-red-50';
            borderColor = 'border-red-200';
            textColor = 'text-red-600';
          } else if (pick && !isHidden) {
            bgColor = 'bg-blue-50';
            borderColor = 'border-blue-200';
            textColor = 'text-blue-600';
          }

          return (
            <div key={conf} className={`border rounded-lg p-4 ${borderColor}`}>
              <div className="flex items-center">
                <div className="w-16 flex justify-center">
                  <div className="text-2xl font-bold text-gray-800">{conf}</div>
                </div>
                <div className="flex-1 ml-4">
                  {isHidden ? (
                    <div className="bg-gray-100 rounded p-3 text-center text-gray-500">
                      Pick hidden until game starts
                    </div>
                  ) : !pick ? (
                    <div className="bg-gray-50 rounded p-3 text-center text-gray-400">
                      No pick selected
                    </div>
                  ) : (
                    <div className={`rounded p-3 ${bgColor}`}>
                      <div className="font-semibold text-sm">{game?.away_team} @ {game?.home_team}</div>
                      <div className={`font-bold ${textColor}`}>{getPickLabel(game, pick.pick_type, pick.pick_value)}</div>
                      {pick.correct === 1 && (
                        <div className="text-green-600 font-bold text-sm mt-1">âœ“ Won - {conf} points</div>
                      )}
                      {pick.correct === 0 && (
                        <div className="text-red-600 font-bold text-sm mt-1">âœ— Lost - 0 points</div>
                      )}
                    </div>
                  )}
                </div>
                {pick?.correct === 1 && <div className="text-green-600 font-bold ml-4">+{conf}</div>}
                {pick?.correct === 0 && <div className="text-red-600 font-bold ml-4">+0</div>}
                {pick && pick.correct === null && !isHidden && <div className="text-blue-600 font-bold ml-4">?</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultsView() {
  const mockData = {
    currentWeek: 4,
    dollarPerPoint: 2,
    weeklyBonus: 5,
    players: [
      { id: 1, name: "Josh Milian", weeklyScores: [22, 31, 18, 29] },
      { id: 2, name: "Player B", weeklyScores: [32, 25, 34, 27] },
      { id: 3, name: "Player C", weeklyScores: [26, 28, 22, 31] },
      { id: 4, name: "Player D", weeklyScores: [20, 30, 26, 25] },
    ]
  };

  const [selectedWeek, setSelectedWeek] = useState(mockData.currentWeek);

  const calculateWeeklyPayouts = (weekNumber) => {
    const weekScores = mockData.players.map(player => ({
      ...player,
      weekScore: player.weeklyScores[weekNumber - 1] || 0
    }));
    
    const totalPoints = weekScores.reduce((sum, player) => sum + player.weekScore, 0);
    const average = totalPoints / weekScores.length;
    
    const highestScore = Math.max(...weekScores.map(p => p.weekScore));
    const winners = weekScores.filter(p => p.weekScore === highestScore);
    const losers = weekScores.filter(p => p.weekScore !== highestScore);
    
    const totalBonusPool = losers.length * mockData.weeklyBonus;
    const bonusPerWinner = totalBonusPool / winners.length;
    
    return weekScores.map(player => {
      const pointsPayout = (player.weekScore - average) * mockData.dollarPerPoint;
      const isWinner = player.weekScore === highestScore;
      const bonusPayout = isWinner ? bonusPerWinner : -mockData.weeklyBonus;
      return { ...player, pointsPayout, bonusPayout, totalWeeklyPayout: pointsPayout + bonusPayout };
    });
  };

  const calculateSeasonTotals = () => {
    return mockData.players.map(player => {
      let seasonTotal = 0;
      for (let week = 1; week <= mockData.currentWeek; week++) {
        const weeklyPayouts = calculateWeeklyPayouts(week);
        const playerPayout = weeklyPayouts.find(p => p.id === player.id);
        if (playerPayout) seasonTotal += playerPayout.totalWeeklyPayout;
      }
      return { ...player, seasonTotal };
    });
  };

  const formatCurrency = (amount) => {
    const prefix = amount >= 0 ? '+' : '';
    return `${prefix}$${Math.abs(amount).toFixed(0)}`;
  };

  const weeklyPayouts = calculateWeeklyPayouts(selectedWeek);
  const seasonTotals = calculateSeasonTotals();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Week Results</h2>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Week:</label>
            <select 
              className="border rounded px-3 py-1 bg-white"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            >
              {Array.from({ length: mockData.currentWeek }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>Week {week}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mb-4">
          ${mockData.dollarPerPoint} per point â€¢ ${mockData.weeklyBonus} weekly bonus per player
        </div>
        
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Player</th>
              <th className="text-right py-2">Points</th>
              <th className="text-right py-2">Points Payout</th>
              <th className="text-right py-2">Bonus Payout</th>
              <th className="text-right py-2 font-bold">Total Weekly</th>
            </tr>
          </thead>
          <tbody>
            {weeklyPayouts.sort((a, b) => b.weekScore - a.weekScore).map((player, i) => (
              <tr key={player.id} className="border-b">
                <td className="py-3">
                  <span className="text-gray-400 font-bold">#{i + 1}</span>
                  <span className="ml-2 font-semibold">{player.name}</span>
                </td>
                <td className="text-right py-3 font-medium">{player.weekScore}</td>
                <td className={`text-right py-3 ${player.pointsPayout >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(player.pointsPayout)}
                </td>
                <td className={`text-right py-3 ${player.bonusPayout >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(player.bonusPayout)}
                </td>
                <td className={`text-right py-3 font-bold ${player.totalWeeklyPayout >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(player.totalWeeklyPayout)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Season Totals</h2>
        <div className="space-y-3">
          {seasonTotals.sort((a, b) => b.seasonTotal - a.seasonTotal).map((player, i) => (
            <div key={player.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold text-gray-400">#{i + 1}</div>
                <div>
                  <div className="font-semibold">{player.name}</div>
                  <div className="text-sm text-gray-600">Through {mockData.currentWeek} weeks</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${player.seasonTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(player.seasonTotal)}
                </div>
                <div className="text-sm text-gray-500">Season Total</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
