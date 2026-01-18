import { useState, useEffect } from 'react';
import { theme } from '../theme';
import api from '../api';
import { logout } from '../firebase';

export default function LeagueSetup({ user, onComplete }) {
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
