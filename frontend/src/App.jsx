import { useState, useEffect } from 'react';
import api from './api';
import { auth, loginWithGoogle, logout } from './firebase';
import { theme } from './theme';

// Views
import LeagueSetup from './views/LeagueSetup';
import JoinLeagueView from './views/JoinLeagueView';
import CreateLeagueView from './views/CreateLeagueView';
import LeagueView from './views/LeagueView';
import GamecenterView from './views/GamecenterView';
import GamesView from './views/GamesView';
import MyPicksView from './views/MyPicksView';
import OtherPicksView from './views/OtherPicksView';
import HowItWorksView from './views/HowItWorksView';
import ResultsView from './views/ResultsView';

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
                  <div className="fixed inset-0 z-40" onClick={() => setShowLeagueSwitcher(false)} />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-black/95 backdrop-blur rounded-xl border border-purple-500/30 z-50" style={{ boxShadow: '0 0 30px rgba(168,85,247,0.3)' }}>
                    <div className="p-2">
                      <div className="text-xs font-medium text-purple-400 px-3 py-2">YOUR LEAGUES</div>
                      {allLeagues.map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); selectLeague(l.id); }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all cursor-pointer ${l.id === activeLeagueId ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30' : 'hover:bg-white/10'}`}
                        >
                          <div className={`font-medium ${l.id === activeLeagueId ? 'text-pink-400' : 'text-white'}`}>{l.name}</div>
                          <div className="text-xs text-purple-300/60">{l.memberCount} members</div>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-purple-500/30 p-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowLeagueSwitcher(false); setView('joinLeague'); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-purple-300 cursor-pointer"
                      >
                        + Join a League
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowLeagueSwitcher(false); setView('createLeague'); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-purple-300 cursor-pointer"
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
