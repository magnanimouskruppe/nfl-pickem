import { useState } from 'react';
import { theme } from '../theme';
import { getPickLabel } from '../utils/pickLabel';

function MyPicksView({ games, myPicks, onPick, onClear, week, availableWeeks, onWeekChange }) {
  const [selections, setSelections] = useState({});

  // Filter to only show games that haven't started yet
  const availableGames = games.filter(g => new Date(g.start_time) > new Date());

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
            className={`${theme.select} px-3 py-1 text-base font-medium w-fit`}
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
            <div className="text-sm font-bold text-purple-300">Points</div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 ml-4">
            <div className="text-sm font-bold text-purple-300 text-center">Select Game</div>
            <div className="text-sm font-bold text-purple-300 text-center">Select Pick</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[10,9,8,7,6,5,4,3,2,1].map((conf) => {
          const pick = myPicks[conf];
          const selGame = selections[conf];
          const props = getPropsForGame(selGame);

          return (
            <div key={conf} className="border border-purple-500/30 rounded-lg p-4 bg-black/20">
              <div className="flex items-center">
                <div className="w-16 flex justify-center">
                  <div className="text-2xl font-bold text-purple-400">{conf}</div>
                </div>
                {pick ? (
                  <>
                    <div className="flex-1 ml-4 mr-3">
                      <div className={`rounded-lg p-3 ${hasGameStarted(pick) ? 'bg-gray-800/50 border border-gray-600/30' : 'bg-purple-500/20 border border-purple-500/30'}`}>
                        <div className="font-semibold text-sm text-white">{pick.game?.away_team} @ {pick.game?.home_team}</div>
                        <div className={`font-bold ${hasGameStarted(pick) ? 'text-gray-400' : 'text-pink-400'}`}>{getPickLabel(pick.game, pick.pickType, pick.pickValue)}</div>
                        {hasGameStarted(pick) && <div className="text-xs text-gray-500 mt-1">Game started - locked</div>}
                      </div>
                    </div>
                    {!hasGameStarted(pick) && (
                      <button onClick={() => onClear(conf)} className="text-red-400 hover:text-red-300 text-sm">
                        Clear
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex-1 grid grid-cols-2 gap-3 ml-4">
                    <select
                      className={`w-full ${theme.select} px-3 py-2 text-sm`}
                      value={selGame || ''}
                      onChange={(e) => setSelections({ ...selections, [conf]: +e.target.value })}
                    >
                      <option value="">Game...</option>
                      {availableGames.map((g) => (
                        <option key={g.id} value={g.id}>{g.away_team} @ {g.home_team}</option>
                      ))}
                    </select>
                    <select
                      className={`w-full ${theme.select} px-3 py-2 text-sm ${!selGame ? 'opacity-50' : ''}`}
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

export default MyPicksView;
