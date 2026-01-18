import { theme } from '../theme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getPickLabel as baseGetPickLabel } from '../utils/pickLabel';

// Wrapper for getPickLabel that includes team names for total picks
const getPickLabel = (game, pickType, pickValue) => {
  if (!game) return '';

  // For total picks, include team names in the format used by GamecenterView
  if (pickType === 'total') {
    if (pickValue === 'over') return `${game.away_team}/${game.home_team} O ${game.over_under}`;
    if (pickValue === 'under') return `${game.away_team}/${game.home_team} U ${game.over_under}`;
  }

  // For spread picks, use the base utility function
  return baseGetPickLabel(game, pickType, pickValue);
};

function GamecenterView({ games, allPicks, users, currentUserId, week, availableWeeks, onWeekChange }) {
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
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="#a855f7" />
            <YAxis domain={[0, 55]} stroke="#a855f7" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a0533', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Bar dataKey="Current" stackId="a" fill="#a855f7" />
            <Bar dataKey="Remaining" stackId="a" fill="#ec4899" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className={`${theme.cardBg} p-4 sm:p-6 overflow-x-auto`} style={theme.cardGlow}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-purple-500/30">
              <th className="text-left py-2 px-2 font-bold text-purple-300">Player</th>
              <th className="text-center py-2 px-2 font-bold text-purple-300" colSpan={2}>Point Results</th>
              <th className="text-center py-2 px-2 font-bold text-purple-300" colSpan={2}>Points vs Avg</th>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(conf => (
                <th key={conf} className="text-center py-2 px-1 font-bold text-purple-300 min-w-[80px]">{conf}</th>
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
                  <td className="py-2 px-2 font-semibold whitespace-nowrap text-white">{player.name}</td>
                  <td className="py-2 px-2 text-center text-white">{player.current}</td>
                  <td className="py-2 px-2 text-center text-gray-400">{player.potential}</td>
                  <td className={`py-2 px-2 text-center ${parseFloat(vsAvgCurrent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {parseFloat(vsAvgCurrent) >= 0 ? '+' : ''}{vsAvgCurrent}
                  </td>
                  <td className={`py-2 px-2 text-center ${parseFloat(vsAvgPotential) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {parseFloat(vsAvgPotential) >= 0 ? '+' : ''}{vsAvgPotential}
                  </td>
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(conf => {
                    const pick = player.picks.find(p => p.confidence === conf);
                    const game = pick ? games.find(g => g.id === pick.game_id) : null;
                    const isHidden = pick && !pick.pick_type;
                    const isCurrentUser = player.id === currentUserId;

                    let bgColor = 'bg-black/30';
                    let textColor = 'text-gray-500';
                    let content = '-';

                    if (isHidden && !isCurrentUser) {
                      content = '?';
                      bgColor = 'bg-purple-500/20';
                      textColor = 'text-purple-400';
                    } else if (pick) {
                      content = getPickLabel(game, pick.pick_type, pick.pick_value);
                      if (pick.correct === 1) {
                        bgColor = 'bg-green-500/200/20';
                        textColor = 'text-green-400';
                      } else if (pick.correct === 0) {
                        bgColor = 'bg-red-500/200/20';
                        textColor = 'text-red-400';
                      } else {
                        bgColor = 'bg-yellow-500/20';
                        textColor = 'text-yellow-400';
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
            <tr className="border-t-2 border-purple-500/30 bg-black/30 font-semibold">
              <td className="py-2 px-2 text-purple-300">Average</td>
              <td className="py-2 px-2 text-center text-white">{avgCurrent}</td>
              <td className="py-2 px-2 text-center text-gray-400">{avgPotential}</td>
              <td className="py-2 px-2 text-center text-gray-500">-</td>
              <td className="py-2 px-2 text-center text-gray-500">-</td>
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

export default GamecenterView;
