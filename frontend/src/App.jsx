import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from './api';
import { auth, loginWithGoogle, logout } from './firebase';

// Synthwave Theme Styles
const theme = {
  // Backgrounds
  pageBg: 'min-h-screen bg-gradient-to-b from-[#1a0533] via-[#0d0d1a] to-[#1a0a2e]',
  cardBg: 'bg-black/40 backdrop-blur border border-purple-500/30 rounded-xl',
  cardGlow: { boxShadow: '0 0 30px rgba(168,85,247,0.15), inset 0 0 30px rgba(168,85,247,0.05)' },
  
  // Text
  heading: 'font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent',
  subtext: 'text-purple-300/60',
  
  // Buttons
  btnPrimary: 'bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-400 hover:to-purple-400 transition-all',
  btnSecondary: 'text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all',
  btnOutline: 'border border-purple-500/50 text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all',
  
  // Inputs
  input: 'bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/30',
  select: 'bg-black/50 border border-purple-500/30 rounded-lg text-purple-300 focus:border-pink-500/50 focus:outline-none',
  
  // Status colors
  success: 'bg-green-500/20 text-green-400 border border-green-500/50',
  error: 'bg-red-500/20 text-red-400 border border-red-500/50',
  warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  pending: 'bg-purple-500/20 text-purple-400 border border-purple-500/50',
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('howItWorks');
  const [games, setGames] = useState([]);
  const [allPicks, setAllPicks] = useState([]);
  const [myPicks, setMyPicks] = useState({});
  const [users, setUsers] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  
  // Multi-league state
  const [allLeagues, setAllLeagues] = useState([]);
  const [activeLeagueId, setActiveLeagueId] = useState(null);
  const [league, setLeague] = useState(null);
  const [leagueMembers, setLeagueMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leagueLoading, setLeagueLoading] = useState(true);
  const [showLeagueSwitcher, setShowLeagueSwitcher] = useState(false);

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

  // Load all leagues on startup
  useEffect(() => {
    if (!user) return;
    loadAllLeagues();
  }, [user]);

  const loadAllLeagues = async () => {
    setLeagueLoading(true);
    const data = await api.getMyLeagues();
    setAllLeagues(data.leagues || []);
    
    // If user has leagues, select the first one (or previously selected)
    if (data.leagues && data.leagues.length > 0) {
      const savedLeagueId = localStorage.getItem('activeLeagueId');
      const savedLeague = data.leagues.find(l => l.id === parseInt(savedLeagueId));
      const leagueToSelect = savedLeague || data.leagues[0];
      await selectLeague(leagueToSelect.id);
    } else {
      setLeague(null);
      setLeagueLoading(false);
    }
  };

  const selectLeague = async (leagueId) => {
    setLeagueLoading(true);
    setActiveLeagueId(leagueId);
    localStorage.setItem('activeLeagueId', leagueId);
    
    const data = await api.getLeague(leagueId);
    setLeague(data.league);
    setLeagueMembers(data.members || []);
    setIsAdmin(data.isAdmin || false);
    setLeagueLoading(false);
    setShowLeagueSwitcher(false);
  };

  const handleLeagueCreatedOrJoined = async () => {
    await loadAllLeagues();
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

    // Detect embedded browsers (in-app browsers from Messages, Mail, etc.)
    const isEmbeddedBrowser = /FBAN|FBAV|Instagram|Twitter|LinkedIn|Snapchat|Line|KAKAOTALK|Naver|Daum|Baidu/i.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') && navigator.userAgent.includes('Mobile') && !navigator.standalone && window.navigator.standalone === undefined && document.referrer.includes('facebook.com')) ||
      (/iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone && !/Safari/i.test(navigator.userAgent)) ||
      (navigator.userAgent.includes('wv') || navigator.userAgent.includes('WebView'));
    
    // iOS in-app browser detection (Messages, Mail, etc.)
    const isIOSInApp = /iPhone|iPad|iPod/.test(navigator.userAgent) && 
      !navigator.standalone && 
      !/CriOS|FxiOS|OPiOS|mercury/i.test(navigator.userAgent) &&
      window.webkit && window.webkit.messageHandlers;

    const showBrowserWarning = isEmbeddedBrowser || isIOSInApp;

    return (
      <div className={`${theme.pageBg} flex items-center justify-center p-4`}>
        <div className={`${theme.cardBg} p-8 text-center max-w-md`} style={theme.cardGlow}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏈</span>
          </div>
          <h1 className={`text-3xl ${theme.heading} mb-2`}>NFL PICK'EM</h1>
          <p className={`${theme.subtext} text-sm mb-6`}>Confidence-based picks competition</p>
          {inviteCode && <p className="text-purple-300 mb-4">Sign in to join the league</p>}
          
          {showBrowserWarning ? (
            <div className="text-left">
              <div className={`${theme.warning} rounded-lg p-4 mb-4`}>
                <p className="font-medium mb-2">Open in Safari to sign in</p>
                <p className="text-sm mb-3 opacity-80">
                  Google sign-in doesn't work in this browser. Please open this page in Safari or Chrome.
                </p>
                <p className="text-sm font-medium">On iPhone:</p>
                <ol className="text-sm list-decimal ml-4 space-y-1 opacity-80">
                  <li>Tap the share button <span className="inline-block">&#xFEFF;↗</span> at the bottom</li>
                  <li>Select "Open in Safari"</li>
                </ol>
              </div>
              <button onClick={loginWithGoogle} className="w-full bg-gray-700 text-gray-400 px-6 py-3 rounded-lg cursor-not-allowed">
                Sign in with Google
              </button>
              <p className="text-xs text-purple-300/60 mt-2">Or try anyway - it might work in some browsers</p>
            </div>
          ) : (
            <button onClick={loginWithGoogle} className={`${theme.btnPrimary} w-full px-6 py-3`}>
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    );
  }

  if (leagueLoading) {
    return (
      <div className={`${theme.pageBg} flex items-center justify-center`}>
        <div className="text-purple-300">Loading...</div>
      </div>
    );
  }

  // Not in a league - show create/join screen
  if (!league) {
    return <LeagueSetup user={user} onComplete={handleLeagueCreatedOrJoined} allLeagues={allLeagues} />;
  }

  if (!currentWeek) {
    return (
      <div className={`${theme.pageBg} flex items-center justify-center`}>
        <div className="text-purple-300">Loading games...</div>
      </div>
    );
  }

  return (
    <div className={`${theme.pageBg} p-2 sm:p-4`}>
      <div className="max-w-6xl mx-auto">
        <header className={`${theme.cardBg} mb-4 sm:mb-6 p-4 sm:p-6`} style={theme.cardGlow}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 mb-4">
            {/* League Switcher */}
            <div className="relative">
              <button 
                onClick={() => setShowLeagueSwitcher(!showLeagueSwitcher)}
                className={`flex items-center gap-2 text-2xl sm:text-3xl ${theme.heading}`}
              >
                {league.name}
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <p className={`${theme.subtext} text-xs mt-1`}>{leagueMembers.length} members</p>
              
              {showLeagueSwitcher && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLeagueSwitcher(false)} />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-black/90 backdrop-blur rounded-xl border border-purple-500/30 z-20" style={{ boxShadow: '0 0 30px rgba(168,85,247,0.3)' }}>
                    <div className="p-2">
                      <div className="text-xs font-medium text-purple-400 px-3 py-2">YOUR LEAGUES</div>
                      {allLeagues.map(l => (
                        <button
                          key={l.id}
                          onClick={() => selectLeague(l.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all ${l.id === activeLeagueId ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30' : 'hover:bg-white/5'}`}
                        >
                          <div className={`font-medium ${l.id === activeLeagueId ? 'text-pink-400' : 'text-white'}`}>{l.name}</div>
                          <div className="text-xs text-purple-300/60">{l.memberCount} members</div>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-purple-500/30 p-2">
                      <button
                        onClick={() => { setShowLeagueSwitcher(false); setView('joinLeague'); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-purple-300"
                      >
                        + Join a League
                      </button>
                      <button
                        onClick={() => { setShowLeagueSwitcher(false); setView('createLeague'); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-purple-300"
                      >
                        + Create a League
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-white font-semibold">{user.displayName}</p>
                <p className={`${theme.subtext} text-xs`}>Week {currentWeek}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {user.displayName?.charAt(0) || '?'}
              </div>
              <button onClick={logout} className={`${theme.btnOutline} text-sm px-3 py-1`}>Logout</button>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1 sm:gap-2 bg-black/30 p-1 rounded-lg">
            {[
              { id: 'howItWorks', label: 'How It Works', fullLabel: 'How It Works' },
              { id: 'games', label: "Games", fullLabel: "This Week's Games" },
              { id: 'gamecenter', label: 'Gamecenter', fullLabel: 'Weekly Gamecenter' },
              { id: 'myPicks', label: 'My Picks', fullLabel: 'My Picks' },
              { id: 'otherPicks', label: 'Others', fullLabel: "Other Player's Picks" },
              { id: 'results', label: 'Results', fullLabel: 'Season Results' },
              { id: 'league', label: 'League', fullLabel: 'League' },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setView(tab.id)}
                className={`px-2 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${view === tab.id ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <span className="sm:hidden">{tab.label}</span>
                <span className="hidden sm:inline">{tab.fullLabel}</span>
              </button>
            ))}
          </nav>
        </header>

        {view === 'howItWorks' && <HowItWorksView league={league} />}
        {view === 'games' && <GamesView games={games} week={currentWeek} availableWeeks={availableWeeks} onWeekChange={setCurrentWeek} />}
        {view === 'gamecenter' && <GamecenterView games={games} allPicks={allPicks} users={users} currentUserId={user.uid} week={currentWeek} availableWeeks={availableWeeks} onWeekChange={setCurrentWeek} />}
        {view === 'myPicks' && (
          <MyPicksView games={games} myPicks={myPicks} onPick={handlePick} onClear={clearPick} week={currentWeek} availableWeeks={availableWeeks} onWeekChange={setCurrentWeek} />
        )}
        {view === 'otherPicks' && (
          <OtherPicksView games={games} allPicks={allPicks} users={users} currentUserId={user.uid} week={currentWeek} availableWeeks={availableWeeks} onWeekChange={setCurrentWeek} />
        )}
        {view === 'results' && <ResultsView league={league} leagueMembers={leagueMembers} availableWeeks={availableWeeks} />}
        {view === 'league' && <LeagueView league={league} members={leagueMembers} isAdmin={isAdmin} onLeagueUpdate={() => selectLeague(activeLeagueId)} />}
        {view === 'joinLeague' && <JoinLeagueView onComplete={handleLeagueCreatedOrJoined} onCancel={() => setView('howItWorks')} />}
        {view === 'createLeague' && <CreateLeagueView onComplete={handleLeagueCreatedOrJoined} onCancel={() => setView('howItWorks')} />}
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
    <div className={`${theme.pageBg} flex items-center justify-center p-4`}>
      <div className={`${theme.cardBg} p-8 max-w-md w-full`} style={theme.cardGlow}>
        <h1 className={`text-2xl ${theme.heading} mb-2`}>Welcome, {user.displayName}!</h1>
        <p className={`${theme.subtext} mb-6`}>You're not in a league yet. Create one or join an existing league.</p>

        {!mode && (
          <div className="space-y-3">
            <button 
              onClick={() => setMode('create')}
              className={`w-full ${theme.btnPrimary} px-6 py-3`}
            >
              Create a New League
            </button>
            <button 
              onClick={() => setMode('join')}
              className={`w-full ${theme.btnOutline} px-6 py-3`}
            >
              Join an Existing League
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">League Name</label>
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                placeholder="e.g., Playoffs 2025"
                className={`w-full ${theme.input} px-3 py-2`}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button 
                onClick={() => setMode(null)}
                className={`flex-1 ${theme.btnOutline} px-4 py-2`}
              >
                Back
              </button>
              <button 
                onClick={handleCreate}
                disabled={loading}
                className={`flex-1 ${theme.btnPrimary} px-4 py-2 disabled:opacity-50`}
              >
                {loading ? 'Creating...' : 'Create League'}
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4">
            {previewLeague && (
              <div className={`${theme.success} rounded-lg p-3`}>
                Joining: <strong>{previewLeague.name}</strong> ({previewLeague.memberCount} members)
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g., ABC123XY"
                className={`w-full ${theme.input} px-3 py-2 uppercase`}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button 
                onClick={() => { setMode(null); setPreviewLeague(null); }}
                className={`flex-1 ${theme.btnOutline} px-4 py-2`}
              >
                Back
              </button>
              <button 
                onClick={handleJoin}
                disabled={loading}
                className={`flex-1 ${theme.btnPrimary} px-4 py-2 disabled:opacity-50`}
              >
                {loading ? 'Joining...' : 'Join League'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-purple-500/30 text-center">
          <button onClick={logout} className="text-sm text-purple-400 hover:text-purple-300">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline Join League view (when user clicks from switcher)
function JoinLeagueView({ onComplete, onCancel }) {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewLeague, setPreviewLeague] = useState(null);

  const handlePreview = async (code) => {
    if (code.length >= 6) {
      const data = await api.previewLeague(code);
      if (!data.error) setPreviewLeague(data);
      else setPreviewLeague(null);
    } else {
      setPreviewLeague(null);
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
      onComplete();
    }
  };

  return (
    <div className={`${theme.cardBg} p-6 max-w-md mx-auto`} style={theme.cardGlow}>
      <h2 className={`text-xl ${theme.heading} mb-4`}>Join a League</h2>
      
      {previewLeague && (
        <div className={`${theme.success} rounded-lg p-3 mb-4`}>
          Found: <strong>{previewLeague.name}</strong> ({previewLeague.memberCount} members)
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-purple-300 mb-1">Invite Code</label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setInviteCode(val);
              handlePreview(val);
            }}
            placeholder="e.g., ABC123XY"
            className={`w-full ${theme.input} px-3 py-2 uppercase`}
          />
        </div>
        
        {error && <p className="text-red-400 text-sm">{error}</p>}
        
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className={`flex-1 ${theme.btnOutline} px-4 py-2`}
          >
            Cancel
          </button>
          <button 
            onClick={handleJoin}
            disabled={loading}
            className={`flex-1 ${theme.btnPrimary} px-4 py-2 disabled:opacity-50`}
          >
            {loading ? 'Joining...' : 'Join League'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline Create League view (when user clicks from switcher)
function CreateLeagueView({ onComplete, onCancel }) {
  const [leagueName, setLeagueName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className={`${theme.cardBg} p-6 max-w-md mx-auto`} style={theme.cardGlow}>
      <h2 className={`text-xl ${theme.heading} mb-4`}>Create a League</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-purple-300 mb-1">League Name</label>
          <input
            type="text"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder="e.g., Playoffs 2025"
            className={`w-full ${theme.input} px-3 py-2`}
          />
        </div>
        
        {error && <p className="text-red-400 text-sm">{error}</p>}
        
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className={`flex-1 ${theme.btnOutline} px-4 py-2`}
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            disabled={loading}
            className={`flex-1 ${theme.btnPrimary} px-4 py-2 disabled:opacity-50`}
          >
            {loading ? 'Creating...' : 'Create League'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeagueView({ league, members, isAdmin, onLeagueUpdate }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingOdds, setRefreshingOdds] = useState(false);
  const [refreshingScores, setRefreshingScores] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(null);
  const [settings, setSettings] = useState({
    name: league.name,
    dollarPerPoint: league.dollarPerPoint,
    weeklyBonus: league.weeklyBonus,
  });
  
  const inviteUrl = `${window.location.origin}?join=${league.inviteCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await api.updateLeague(league.id, settings);
    if (result.ok) {
      setEditing(false);
      onLeagueUpdate();
    }
    setSaving(false);
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from the league?`)) return;
    const result = await api.removeMember(league.id, memberId);
    if (result.ok) {
      onLeagueUpdate();
    }
  };

  const handleRefreshOdds = async () => {
    setRefreshingOdds(true);
    setRefreshMessage(null);
    try {
      const result = await api.fetchOdds();
      if (result.ok) {
        setRefreshMessage({ type: 'success', text: `Updated ${result.gamesAdded} games` });
      } else {
        setRefreshMessage({ type: 'error', text: result.error || 'Failed to fetch odds' });
      }
    } catch (err) {
      setRefreshMessage({ type: 'error', text: 'Failed to fetch odds' });
    }
    setRefreshingOdds(false);
    setTimeout(() => setRefreshMessage(null), 5000);
  };

  const handleRefreshScores = async () => {
    setRefreshingScores(true);
    setRefreshMessage(null);
    try {
      const result = await api.fetchScores();
      if (result.ok) {
        setRefreshMessage({ type: 'success', text: `Updated ${result.gamesUpdated} game scores` });
      } else {
        setRefreshMessage({ type: 'error', text: result.error || 'Failed to fetch scores' });
      }
    } catch (err) {
      setRefreshMessage({ type: 'error', text: 'Failed to fetch scores' });
    }
    setRefreshingScores(false);
    setTimeout(() => setRefreshMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl ${theme.heading}`}>League Settings</h2>
          {isAdmin && !editing && (
            <button 
              onClick={() => setEditing(true)}
              className="text-pink-400 hover:text-pink-300 text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${theme.subtext} mb-1`}>League Name</label>
            {editing ? (
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className={`w-full ${theme.input} px-3 py-2`}
              />
            ) : (
              <div className="text-lg font-medium text-white">{league.name}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${theme.subtext} mb-1`}>$ Per Point</label>
              {editing ? (
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings.dollarPerPoint}
                  onChange={(e) => setSettings({ ...settings, dollarPerPoint: parseFloat(e.target.value) })}
                  className={`w-full ${theme.input} px-3 py-2`}
                />
              ) : (
                <div className="text-lg text-white">${league.dollarPerPoint}</div>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium ${theme.subtext} mb-1`}>Weekly Bonus</label>
              {editing ? (
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings.weeklyBonus}
                  onChange={(e) => setSettings({ ...settings, weeklyBonus: parseFloat(e.target.value) })}
                  className={`w-full ${theme.input} px-3 py-2`}
                />
              ) : (
                <div className="text-lg text-white">${league.weeklyBonus}</div>
              )}
            </div>
          </div>

          {editing && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`${theme.btnPrimary} px-4 py-2 disabled:opacity-50`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setSettings({
                    name: league.name,
                    dollarPerPoint: league.dollarPerPoint,
                    weeklyBonus: league.weeklyBonus,
                  });
                }}
                className={`${theme.btnOutline} px-4 py-2`}
              >
                Cancel
              </button>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium ${theme.subtext} mb-2`}>Invite Link</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={inviteUrl}
                className={`flex-1 ${theme.input} px-3 py-2 text-sm`}
              />
              <button 
                onClick={copyLink}
                className={`${theme.btnPrimary} px-4 py-2`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className={`text-sm ${theme.subtext} mt-1`}>Share this link with friends to invite them</p>
          </div>
        </div>
      </div>

      <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
        <h2 className={`text-xl ${theme.heading} mb-4`}>Members ({members.length})</h2>
        <div className="space-y-2">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between py-2 border-b border-purple-500/20 last:border-0">
              <div>
                <div className="font-medium text-white">{member.name}</div>
                <div className={`text-sm ${theme.subtext}`}>{member.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {member.id === league.adminId && (
                  <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-1 rounded border border-pink-500/50">Admin</span>
                )}
                {isAdmin && member.id !== league.adminId && (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
          <h2 className={`text-xl ${theme.heading} mb-4`}>Admin Tools</h2>
          <p className={`text-sm ${theme.subtext} mb-4`}>
            Refresh game data from the odds provider. Use sparingly - API has limited requests per month.
          </p>
          
          {refreshMessage && (
            <div className={`mb-4 p-3 rounded text-sm ${
              refreshMessage.type === 'success' 
                ? theme.success
                : theme.error
            }`}>
              {refreshMessage.text}
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefreshOdds}
              disabled={refreshingOdds}
              className={`${theme.btnOutline} px-4 py-2 disabled:opacity-50`}
            >
              {refreshingOdds ? 'Refreshing...' : 'Refresh Lines/Odds'}
            </button>
            <button
              onClick={handleRefreshScores}
              disabled={refreshingScores}
              className={`${theme.btnOutline} px-4 py-2 disabled:opacity-50`}
            >
              {refreshingScores ? 'Refreshing...' : 'Refresh Scores'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GamecenterView({ games, allPicks, users, currentUserId, week, availableWeeks, onWeekChange }) {
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
      <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-xl font-bold text-white">Week {week} Scoreboard</h2>
          {availableWeeks.length > 0 && (
            <select 
              className="border rounded px-3 py-1 text-base font-medium w-fit"
              value={week}
              onChange={(e) => onWeekChange(parseInt(e.target.value))}
            >
              {availableWeeks.map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          )}
        </div>
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
      <div className={`${theme.cardBg} p-4 sm:p-6 overflow-x-auto`} style={theme.cardGlow}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-purple-500/30">
              <th className="text-left py-2 px-2 font-bold">Player</th>
              <th className="text-center py-2 px-2 font-bold" colSpan={2}>Point Results</th>
              <th className="text-center py-2 px-2 font-bold" colSpan={2}>Points vs Avg</th>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(conf => (
                <th key={conf} className="text-center py-2 px-1 font-bold min-w-[80px]">{conf}</th>
              ))}
            </tr>
            <tr className="border-b border-purple-500/30 text-purple-300/60 text-xs">
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
                <tr key={player.id} className="border-b border-purple-500/20">
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

                    let bgColor = 'bg-black/30';
                    let textColor = 'text-gray-400';
                    let content = '-';

                    if (isHidden && !isCurrentUser) {
                      content = '?';
                      bgColor = 'bg-gray-100';
                      textColor = 'text-gray-400';
                    } else if (pick) {
                      content = getPickLabel(game, pick.pick_type, pick.pick_value);
                      if (pick.correct === 1) {
                        bgColor = 'bg-green-500/20';
                        textColor = 'text-green-400';
                      } else if (pick.correct === 0) {
                        bgColor = 'bg-red-500/20';
                        textColor = 'text-red-400';
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
            <tr className="border-t-2 border-gray-300 bg-black/30 font-semibold">
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

function GamesView({ games, week, availableWeeks, onWeekChange }) {
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
    <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-xl font-bold text-white">Week {week} Games</h2>
        {availableWeeks.length > 0 && (
          <select 
            className="border rounded px-3 py-1 text-base font-medium w-fit"
            value={week}
            onChange={(e) => onWeekChange(parseInt(e.target.value))}
          >
            {availableWeeks.map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-purple-500/30">
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
                <tr key={game.id} className="border-b border-purple-500/20">
                  <td className="py-3 px-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{game.away_team}</span>
                      <span className="text-purple-300/60">@ {game.home_team}</span>
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

function MyPicksView({ games, myPicks, onPick, onClear, week, availableWeeks, onWeekChange }) {
  const [selections, setSelections] = useState({});

  // Filter to only show games that haven't started yet
  const availableGames = games.filter(g => new Date(g.start_time) > new Date());

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
    const g = availableGames.find(x => x.id === gameId);
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

  // Check if a pick's game has already started (can't clear it)
  const hasGameStarted = (pick) => {
    if (!pick?.game?.start_time) return false;
    return new Date(pick.game.start_time) <= new Date();
  };

  return (
    <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-xl font-bold text-white">Week {week} Picks</h2>
        {availableWeeks.length > 0 && (
          <select 
            className="border rounded px-3 py-1 text-base font-medium w-fit"
            value={week}
            onChange={(e) => onWeekChange(parseInt(e.target.value))}
          >
            {availableWeeks.map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        )}
      </div>
      
      <div className="border-b-2 border-purple-500/30 pb-3 mb-4 hidden sm:block">
        <div className="flex items-center">
          <div className="w-16 text-center">
            <div className="text-sm font-bold text-gray-300">Points</div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 ml-4">
            <div className="text-sm font-bold text-gray-300 text-center">Select Game</div>
            <div className="text-sm font-bold text-gray-300 text-center">Select Pick</div>
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
                      <div className={`rounded p-3 ${hasGameStarted(pick) ? 'bg-gray-100' : 'bg-blue-50'}`}>
                        <div className="font-semibold text-sm">{pick.game?.away_team} @ {pick.game?.home_team}</div>
                        <div className={`font-bold ${hasGameStarted(pick) ? 'text-purple-300/60' : 'text-blue-600'}`}>{getPickLabel(pick.game, pick.pickType, pick.pickValue)}</div>
                        {hasGameStarted(pick) && <div className="text-xs text-purple-300/60 mt-1">Game started - locked</div>}
                      </div>
                    </div>
                    {!hasGameStarted(pick) && (
                      <button onClick={() => onClear(conf)} className="text-red-500 hover:text-red-400 text-sm">
                        Clear
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex-1 grid grid-cols-2 gap-3 ml-4">
                    <select 
                      className="w-full border rounded px-3 py-2 bg-white text-sm"
                      value={selGame || ''}
                      onChange={(e) => setSelections({ ...selections, [conf]: +e.target.value })}
                    >
                      <option value="">Game...</option>
                      {availableGames.map((g) => (
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

function OtherPicksView({ games, allPicks, users, currentUserId, week, availableWeeks, onWeekChange }) {
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
    <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-xl font-bold text-white">Week {week} Picks</h2>
        <div className="flex flex-wrap gap-2">
          {availableWeeks.length > 0 && (
            <select 
              className="border rounded px-3 py-1 text-base font-medium"
              value={week}
              onChange={(e) => onWeekChange(parseInt(e.target.value))}
            >
              {availableWeeks.map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          )}
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
      </div>

      <div className="border-b-2 border-purple-500/30 pb-3 mb-4 hidden sm:block">
        <div className="flex items-center">
          <div className="w-16 text-center">
            <div className="text-sm font-bold text-gray-300">Points</div>
          </div>
          <div className="flex-1 ml-4">
            <div className="text-sm font-bold text-gray-300 text-center">Pick Details</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[10,9,8,7,6,5,4,3,2,1].map((conf) => {
          const pick = picksByConfidence[conf];
          const game = pick ? games.find(g => g.id === pick.game_id) : null;
          const isHidden = pick && !pick.pick_type;

          let bgColor = 'bg-black/30';
          let borderColor = 'border-purple-500/30';
          let textColor = 'text-purple-300/60';

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
                    <div className="bg-gray-100 rounded p-3 text-center text-purple-300/60">
                      Pick hidden until game starts
                    </div>
                  ) : !pick ? (
                    <div className="bg-black/30 rounded p-3 text-center text-gray-400">
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

function HowItWorksView({ league }) {
  return (
    <div className="space-y-6">
      <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
        <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">The Basics</h3>
            <p className="text-purple-300/60">
              Each week, you make <strong>10 picks</strong> against the spread or on over/unders. 
              You assign each pick a <strong>confidence level from 1-10</strong> (each number used exactly once). 
              If your pick is correct, you earn that many points.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Making Picks</h3>
            <ul className="text-purple-300/60 space-y-1">
              <li>• <strong>Spread picks:</strong> Pick the favorite to win by more than the spread, or the underdog to cover</li>
              <li>• <strong>Over/Under picks:</strong> Pick whether the total points scored will be over or under the line</li>
              <li>• You can make up to 2 picks per game (one spread, one over/under)</li>
              <li>• Picks lock when the game starts</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Scoring</h3>
            <ul className="text-purple-300/60 space-y-1">
              <li>• Correct pick = confidence points earned (1-10)</li>
              <li>• Wrong pick = 0 points</li>
              <li>• Maximum possible per week = 55 points (10+9+8+...+1)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Weekly Payouts</h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <ul className="text-gray-300 space-y-1">
                <li>• <strong>Points payout:</strong> ${league.dollarPerPoint} for every point above/below the weekly average</li>
                <li>• <strong>Weekly bonus:</strong> Winner(s) collect ${league.weeklyBonus} from each non-winner</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Example</h3>
            <div className="bg-black/30 rounded-lg p-4 space-y-2 text-purple-300/60">
              <p>
                <span className="text-green-600">✓</span> You pick <strong>Chiefs -3.5</strong> with <strong>10 confidence</strong>. 
                Chiefs win by 7. <span className="text-green-600 font-semibold">You earn 10 points!</span>
              </p>
              <p>
                <span className="text-red-600">✗</span> You pick <strong>Over 45.5</strong> with <strong>2 confidence</strong>. 
                Final score is 20-17 (37 total). <span className="text-red-600 font-semibold">You earn 0 points.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
        <h2 className="text-xl font-bold text-white mb-4">Quick Tips</h2>
        <ul className="text-purple-300/60 space-y-2">
          <li>• Put high confidence on picks you feel strongest about</li>
          <li>• You can't pick both sides of the same spread or total</li>
          <li>• Check the Gamecenter tab to see live standings during games</li>
          <li>• Other players' picks are hidden until each game starts</li>
        </ul>
      </div>
    </div>
  );
}

function ResultsView({ league, leagueMembers, availableWeeks }) {
  const [selectedWeek, setSelectedWeek] = useState(availableWeeks[0] || 1);
  const [weeklyScores, setWeeklyScores] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch scores for all available weeks
  useEffect(() => {
    const fetchAllScores = async () => {
      setLoading(true);
      const scores = {};
      
      for (const week of availableWeeks) {
        const picks = await api.getPicks(week);
        scores[week] = {};
        
        // Calculate score for each member
        leagueMembers.forEach(member => {
          const memberPicks = picks.filter(p => p.user_id === member.id);
          const weekScore = memberPicks.reduce((sum, pick) => {
            if (pick.correct === 1) return sum + pick.confidence;
            return sum;
          }, 0);
          scores[week][member.id] = weekScore;
        });
      }
      
      setWeeklyScores(scores);
      setLoading(false);
    };

    if (availableWeeks.length > 0 && leagueMembers.length > 0) {
      fetchAllScores();
    }
  }, [availableWeeks, leagueMembers]);

  const calculateWeeklyPayouts = (weekNumber) => {
    const weekData = weeklyScores[weekNumber] || {};
    
    const weekScores = leagueMembers.map(member => ({
      id: member.id,
      name: member.name,
      weekScore: weekData[member.id] || 0
    }));
    
    if (weekScores.length === 0) return [];
    
    const totalPoints = weekScores.reduce((sum, player) => sum + player.weekScore, 0);
    const average = totalPoints / weekScores.length;
    
    const highestScore = Math.max(...weekScores.map(p => p.weekScore));
    const winners = weekScores.filter(p => p.weekScore === highestScore);
    const losers = weekScores.filter(p => p.weekScore !== highestScore);
    
    const totalBonusPool = losers.length * league.weeklyBonus;
    const bonusPerWinner = winners.length > 0 ? totalBonusPool / winners.length : 0;
    
    return weekScores.map(player => {
      const pointsPayout = (player.weekScore - average) * league.dollarPerPoint;
      const isWinner = player.weekScore === highestScore;
      const bonusPayout = isWinner ? bonusPerWinner : -league.weeklyBonus;
      return { ...player, pointsPayout, bonusPayout, totalWeeklyPayout: pointsPayout + bonusPayout };
    });
  };

  const calculateSeasonTotals = () => {
    return leagueMembers.map(member => {
      let seasonTotal = 0;
      for (const week of availableWeeks) {
        const weeklyPayouts = calculateWeeklyPayouts(week);
        const playerPayout = weeklyPayouts.find(p => p.id === member.id);
        if (playerPayout) seasonTotal += playerPayout.totalWeeklyPayout;
      }
      return { id: member.id, name: member.name, seasonTotal };
    });
  };

  const formatCurrency = (amount) => {
    const prefix = amount >= 0 ? '+' : '';
    return `${prefix}$${Math.abs(amount).toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className={`${theme.cardBg} p-6 text-center text-purple-300/60`} style={theme.cardGlow}>
        Loading results...
      </div>
    );
  }

  const weeklyPayouts = calculateWeeklyPayouts(selectedWeek);
  const seasonTotals = calculateSeasonTotals();

  return (
    <div className="space-y-6">
      <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-xl font-bold text-white">Week Results</h2>
          <select 
            className="border rounded px-3 py-1 bg-white w-fit"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
          >
            {availableWeeks.map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>
        
        <div className="text-sm text-purple-300/60 mb-4">
          ${league.dollarPerPoint} per point • ${league.weeklyBonus} weekly bonus per player
        </div>
        
        <div className="overflow-x-auto">
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
      </div>

      <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
        <h2 className="text-xl font-bold text-white mb-4">Season Totals</h2>
        <div className="space-y-3">
          {seasonTotals.sort((a, b) => b.seasonTotal - a.seasonTotal).map((player, i) => (
            <div key={player.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold text-gray-400">#{i + 1}</div>
                <div>
                  <div className="font-semibold">{player.name}</div>
                  <div className="text-sm text-purple-300/60">Through {availableWeeks.length} weeks</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${player.seasonTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(player.seasonTotal)}
                </div>
                <div className="text-sm text-purple-300/60">Season Total</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
