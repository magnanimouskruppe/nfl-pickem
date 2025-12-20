const api = {
  userId: null,
  
  async fetch(path, opts = {}) {
    const res = await fetch(`/api${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', 'x-user-id': this.userId, ...opts.headers },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    return res.json();
  },
  
  getCurrentWeek: () => api.fetch('/current-week'),
  getWeeks: () => api.fetch('/weeks'),
  getGames: (week) => api.fetch(`/games/${week}`),
  getPicks: (week) => api.fetch(`/picks/${week}`),
  submitPick: (data) => api.fetch('/picks', { method: 'POST', body: data }),
  deletePick: (week, confidence) => api.fetch(`/picks/${week}/${confidence}`, { method: 'DELETE' }),
  getLeaderboard: (leagueId) => api.fetch(`/leaderboard/${leagueId}`),
  login: (user) => api.fetch('/auth/login', { method: 'POST', body: user }),
  seed: () => api.fetch('/seed', { method: 'POST' }),
  fetchOdds: () => api.fetch('/fetch-odds', { method: 'POST' }),
  fetchScores: () => api.fetch('/fetch-scores', { method: 'POST' }),
  
  // League management
  getMyLeague: () => api.fetch('/my-league'),
  createLeague: (name) => api.fetch('/leagues', { method: 'POST', body: { name } }),
  joinLeague: (inviteCode) => api.fetch('/leagues/join', { method: 'POST', body: { inviteCode } }),
  previewLeague: (inviteCode) => api.fetch(`/leagues/preview/${inviteCode}`),
  updateLeague: (leagueId, settings) => api.fetch(`/leagues/${leagueId}`, { method: 'PUT', body: settings }),
  removeMember: (leagueId, memberId) => api.fetch(`/leagues/${leagueId}/members/${memberId}`, { method: 'DELETE' }),
};

export default api;
