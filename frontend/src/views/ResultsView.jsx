import { useState, useEffect } from 'react';
import { theme } from '../theme';
import api from '../api';

export default function ResultsView({ league, leagueMembers, availableWeeks }) {
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
            className={`${theme.select} px-3 py-1 w-fit`}
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
              <tr className="border-b border-purple-500/30">
                <th className="text-left py-2 text-purple-300">Player</th>
                <th className="text-right py-2 text-purple-300">Points</th>
                <th className="text-right py-2 text-purple-300">Points Payout</th>
                <th className="text-right py-2 text-purple-300">Bonus Payout</th>
                <th className="text-right py-2 text-purple-300 font-bold">Total Weekly</th>
              </tr>
            </thead>
            <tbody>
              {weeklyPayouts.sort((a, b) => b.weekScore - a.weekScore).map((player, i) => (
                <tr key={player.id} className="border-b border-purple-500/20">
                  <td className="py-3">
                    <span className="text-purple-400 font-bold">#{i + 1}</span>
                    <span className="ml-2 font-semibold text-white">{player.name}</span>
                  </td>
                  <td className="text-right py-3 font-medium text-white">{player.weekScore}</td>
                  <td className={`text-right py-3 ${player.pointsPayout >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(player.pointsPayout)}
                  </td>
                  <td className={`text-right py-3 ${player.bonusPayout >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(player.bonusPayout)}
                  </td>
                  <td className={`text-right py-3 font-bold ${player.totalWeeklyPayout >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
            <div key={player.id} className="border border-purple-500/30 rounded-lg p-4 flex justify-between items-center bg-black/20">
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold text-purple-400">#{i + 1}</div>
                <div>
                  <div className="font-semibold text-white">{player.name}</div>
                  <div className="text-sm text-purple-300/60">Through {availableWeeks.length} weeks</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${player.seasonTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
