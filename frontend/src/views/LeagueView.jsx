import { useState } from 'react';
import { theme } from '../theme';
import api from '../api';

function LeagueView({ league, members, isAdmin, onLeagueUpdate }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingOdds, setRefreshingOdds] = useState(false);
  const [refreshingScores, setRefreshingScores] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(null);
  const [settings, setSettings] = useState({
    name: league.name,
    dollarPerPoint: league.dollarPerPoint,
    weeklyBonus: league.weeklyBonus,
  });

  const inviteUrl = `${window.location.origin}?join=${league.inviteCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await api.updateLeague(league.id, settings);
    if (result.ok) {
      setEditing(false);
      onLeagueUpdate();
    }
    setSaving(false);
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from the league?`)) return;
    const result = await api.removeMember(league.id, memberId);
    if (result.ok) {
      onLeagueUpdate();
    }
  };

  const handleRefreshOdds = async () => {
    setRefreshingOdds(true);
    setRefreshMessage(null);
    try {
      const result = await api.fetchOdds();
      if (result.ok) {
        setRefreshMessage({ type: 'success', text: `Updated ${result.gamesAdded} games` });
      } else {
        setRefreshMessage({ type: 'error', text: result.error || 'Failed to fetch odds' });
      }
    } catch (err) {
      setRefreshMessage({ type: 'error', text: 'Failed to fetch odds' });
    }
    setRefreshingOdds(false);
    setTimeout(() => setRefreshMessage(null), 5000);
  };

  const handleRefreshScores = async () => {
    setRefreshingScores(true);
    setRefreshMessage(null);
    try {
      const result = await api.fetchScores();
      if (result.ok) {
        setRefreshMessage({ type: 'success', text: `Updated ${result.gamesUpdated} game scores` });
      } else {
        setRefreshMessage({ type: 'error', text: result.error || 'Failed to fetch scores' });
      }
    } catch (err) {
      setRefreshMessage({ type: 'error', text: 'Failed to fetch scores' });
    }
    setRefreshingScores(false);
    setTimeout(() => setRefreshMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl ${theme.heading}`}>League Settings</h2>
          {isAdmin && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-pink-400 hover:text-pink-300 text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${theme.subtext} mb-1`}>League Name</label>
            {editing ? (
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className={`w-full ${theme.input} px-3 py-2`}
              />
            ) : (
              <div className="text-lg font-medium text-white">{league.name}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${theme.subtext} mb-1`}>$ Per Point</label>
              {editing ? (
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings.dollarPerPoint}
                  onChange={(e) => setSettings({ ...settings, dollarPerPoint: parseFloat(e.target.value) })}
                  className={`w-full ${theme.input} px-3 py-2`}
                />
              ) : (
                <div className="text-lg text-white">${league.dollarPerPoint}</div>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium ${theme.subtext} mb-1`}>Weekly Bonus</label>
              {editing ? (
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings.weeklyBonus}
                  onChange={(e) => setSettings({ ...settings, weeklyBonus: parseFloat(e.target.value) })}
                  className={`w-full ${theme.input} px-3 py-2`}
                />
              ) : (
                <div className="text-lg text-white">${league.weeklyBonus}</div>
              )}
            </div>
          </div>

          {editing && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`${theme.btnPrimary} px-4 py-2 disabled:opacity-50`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setSettings({
                    name: league.name,
                    dollarPerPoint: league.dollarPerPoint,
                    weeklyBonus: league.weeklyBonus,
                  });
                }}
                className={`${theme.btnOutline} px-4 py-2`}
              >
                Cancel
              </button>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium ${theme.subtext} mb-2`}>Invite Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className={`flex-1 ${theme.input} px-3 py-2 text-sm`}
              />
              <button
                onClick={copyLink}
                className={`${theme.btnPrimary} px-4 py-2`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className={`text-sm ${theme.subtext} mt-1`}>Share this link with friends to invite them</p>
          </div>
        </div>
      </div>

      <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
        <h2 className={`text-xl ${theme.heading} mb-4`}>Members ({members.length})</h2>
        <div className="space-y-2">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between py-2 border-b border-purple-500/20 last:border-0">
              <div>
                <div className="font-medium text-white">{member.name}</div>
                <div className={`text-sm ${theme.subtext}`}>{member.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {member.id === league.adminId && (
                  <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-1 rounded border border-pink-500/50">Admin</span>
                )}
                {isAdmin && member.id !== league.adminId && (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className={`${theme.cardBg} p-4 sm:p-6`} style={theme.cardGlow}>
          <h2 className={`text-xl ${theme.heading} mb-4`}>Admin Tools</h2>
          <p className={`text-sm ${theme.subtext} mb-4`}>
            Refresh game data from the odds provider. Use sparingly - API has limited requests per month.
          </p>

          {refreshMessage && (
            <div className={`mb-4 p-3 rounded text-sm ${
              refreshMessage.type === 'success'
                ? theme.success
                : theme.error
            }`}>
              {refreshMessage.text}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefreshOdds}
              disabled={refreshingOdds}
              className={`${theme.btnOutline} px-4 py-2 disabled:opacity-50`}
            >
              {refreshingOdds ? 'Refreshing...' : 'Refresh Lines/Odds'}
            </button>
            <button
              onClick={handleRefreshScores}
              disabled={refreshingScores}
              className={`${theme.btnOutline} px-4 py-2 disabled:opacity-50`}
            >
              {refreshingScores ? 'Refreshing...' : 'Refresh Scores'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeagueView;
