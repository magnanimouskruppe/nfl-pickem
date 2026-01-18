import { useState } from 'react';
import { theme } from '../theme';
import api from '../api';

function JoinLeagueView({ onComplete, onCancel }) {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewLeague, setPreviewLeague] = useState(null);

  const handlePreview = async (code) => {
    if (code.length >= 6) {
      const data = await api.previewLeague(code);
      if (!data.error) setPreviewLeague(data);
      else setPreviewLeague(null);
    } else {
      setPreviewLeague(null);
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
      onComplete();
    }
  };

  return (
    <div className={`${theme.cardBg} p-6 max-w-md mx-auto`} style={theme.cardGlow}>
      <h2 className={`text-xl ${theme.heading} mb-4`}>Join a League</h2>

      {previewLeague && (
        <div className={`${theme.success} rounded-lg p-3 mb-4`}>
          Found: <strong>{previewLeague.name}</strong> ({previewLeague.memberCount} members)
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-purple-300 mb-1">Invite Code</label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setInviteCode(val);
              handlePreview(val);
            }}
            placeholder="e.g., ABC123XY"
            className={`w-full ${theme.input} px-3 py-2 uppercase`}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 ${theme.btnOutline} px-4 py-2`}
          >
            Cancel
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
    </div>
  );
}

export default JoinLeagueView;
