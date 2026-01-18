import { useState } from 'react';
import { theme } from '../theme';
import api from '../api';

function CreateLeagueView({ onComplete, onCancel }) {
  const [leagueName, setLeagueName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className={`${theme.cardBg} p-6 max-w-md mx-auto`} style={theme.cardGlow}>
      <h2 className={`text-xl ${theme.heading} mb-4`}>Create a League</h2>

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
            onClick={onCancel}
            className={`flex-1 ${theme.btnOutline} px-4 py-2`}
          >
            Cancel
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
    </div>
  );
}

export default CreateLeagueView;
