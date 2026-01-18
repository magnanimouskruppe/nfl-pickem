/**
 * Generate a display label for a pick based on the game, pick type, and pick value.
 *
 * @param {Object} game - The game object containing favorite, home_team, away_team, spread, over_under
 * @param {string} pickType - Either 'spread' or 'total'
 * @param {string} pickValue - For spread: 'fav' or 'dog'. For total: 'over' or 'under'
 * @returns {string} The formatted label for the pick
 */
export function getPickLabel(game, pickType, pickValue) {
  if (!game) return '';

  const underdog = game.favorite === game.home_team ? game.away_team : game.home_team;

  if (pickType === 'spread' && pickValue === 'fav') return `${game.favorite} -${game.spread}`;
  if (pickType === 'spread' && pickValue === 'dog') return `${underdog} +${game.spread}`;
  if (pickType === 'total' && pickValue === 'over') return `Over ${game.over_under}`;
  if (pickType === 'total' && pickValue === 'under') return `Under ${game.over_under}`;

  return '';
}
