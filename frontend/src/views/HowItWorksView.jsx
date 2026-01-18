import { theme } from '../theme';

function HowItWorksView({ league }) {
  return (
    <div className="space-y-6">
      <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
        <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-purple-400 mb-2">The Basics</h3>
            <p className="text-purple-300/60">
              Each week, you make <strong>10 picks</strong> against the spread or on over/unders.
              You assign each pick a <strong>confidence level from 1-10</strong> (each number used exactly once).
              If your pick is correct, you earn that many points.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-purple-400 mb-2">Making Picks</h3>
            <ul className="text-purple-300/60 space-y-1">
              <li>• <strong>Spread picks:</strong> Pick the favorite to win by more than the spread, or the underdog to cover</li>
              <li>• <strong>Over/Under picks:</strong> Pick whether the total points scored will be over or under the line</li>
              <li>• You can make up to 2 picks per game (one spread, one over/under)</li>
              <li>• Picks lock when the game starts</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-purple-400 mb-2">Scoring</h3>
            <ul className="text-purple-300/60 space-y-1">
              <li>• Correct pick = confidence points earned (1-10)</li>
              <li>• Wrong pick = 0 points</li>
              <li>• Maximum possible per week = 55 points (10+9+8+...+1)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-purple-400 mb-2">Weekly Payouts</h3>
            <div className="bg-yellow-500/20 rounded-lg p-4">
              <ul className="text-gray-300 space-y-1">
                <li>• <strong>Points payout:</strong> ${league.dollarPerPoint} for every point above/below the weekly average</li>
                <li>• <strong>Weekly bonus:</strong> Winner(s) collect ${league.weeklyBonus} from each non-winner</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-purple-400 mb-2">Example</h3>
            <div className="bg-black/30 rounded-lg p-4 space-y-2 text-purple-300/60">
              <p>
                <span className="text-green-400">✓</span> You pick <strong>Chiefs -3.5</strong> with <strong>10 confidence</strong>.
                Chiefs win by 7. <span className="text-green-400 font-semibold">You earn 10 points!</span>
              </p>
              <p>
                <span className="text-red-400">✗</span> You pick <strong>Over 45.5</strong> with <strong>2 confidence</strong>.
                Final score is 20-17 (37 total). <span className="text-red-400 font-semibold">You earn 0 points.</span>
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

export default HowItWorksView;
