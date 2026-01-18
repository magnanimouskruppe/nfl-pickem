import { useState } from 'react';
import { theme } from '../theme';
import { getPickLabel } from '../utils/pickLabel';

function OtherPicksView({ games, allPicks, users, currentUserId, week, availableWeeks, onWeekChange }) {
  const [selectedPlayer, setSelectedPlayer] = useState(currentUserId);

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
            className={`${theme.select} px-3 py-1`}
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
            bgColor = 'bg-green-500/20';
            borderColor = 'border-green-500/50';
            textColor = 'text-green-400';
          } else if (pick?.correct === 0) {
            bgColor = 'bg-red-500/20';
            borderColor = 'border-red-500/50';
            textColor = 'text-red-400';
          } else if (pick && !isHidden) {
            bgColor = 'bg-yellow-500/20';
            borderColor = 'border-yellow-500/50';
            textColor = 'text-yellow-400';
          }

          return (
            <div key={conf} className={`border rounded-lg p-4 ${borderColor}`}>
              <div className="flex items-center">
                <div className="w-16 flex justify-center">
                  <div className="text-2xl font-bold text-purple-400">{conf}</div>
                </div>
                <div className="flex-1 ml-4">
                  {isHidden ? (
                    <div className="bg-purple-500/20 rounded p-3 text-center text-purple-300/60">
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
                        <div className="text-green-400 font-bold text-sm mt-1">Won - {conf} points</div>
                      )}
                      {pick.correct === 0 && (
                        <div className="text-red-400 font-bold text-sm mt-1">Lost - 0 points</div>
                      )}
                    </div>
                  )}
                </div>
                {pick?.correct === 1 && <div className="text-green-400 font-bold ml-4">+{conf}</div>}
                {pick?.correct === 0 && <div className="text-red-400 font-bold ml-4">+0</div>}
                {pick && pick.correct === null && !isHidden && <div className="text-yellow-400 font-bold ml-4">?</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OtherPicksView;
