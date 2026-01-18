import { theme } from '../theme';

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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-purple-500/30">
              <th className="text-left py-3 px-2 text-purple-300">Matchup</th>
              <th className="text-center py-3 px-2 text-purple-300">Spread</th>
              <th className="text-center py-3 px-2 text-purple-300">Over/Under</th>
              <th className="text-center py-3 px-2 text-purple-300">Score</th>
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
                      <span className="font-medium text-white">{game.away_team}</span>
                      <span className="text-purple-300/60">@ {game.home_team}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    <div className="flex flex-col text-gray-300">
                      <span>{game.away_team} {spreads.away}</span>
                      <span>{game.home_team} {spreads.home}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    <div className="flex flex-col text-gray-300">
                      <span>O {game.over_under}</span>
                      <span>U {game.over_under}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    {score ? (
                      <span className="font-medium text-cyan-400">{score}</span>
                    ) : (
                      <span className="text-gray-500">-</span>
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

export default GamesView;
