export const theme = {
  // Backgrounds
  pageBg: 'min-h-screen bg-gradient-to-b from-[#1a0533] via-[#0d0d1a] to-[#1a0a2e]',
  cardBg: 'bg-black/40 backdrop-blur border border-purple-500/30 rounded-xl',
  cardGlow: { boxShadow: '0 0 30px rgba(168,85,247,0.15), inset 0 0 30px rgba(168,85,247,0.05)' },

  // Text
  heading: 'font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent',
  subtext: 'text-purple-300/60',

  // Buttons
  btnPrimary: 'bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-400 hover:to-purple-400 transition-all',
  btnSecondary: 'text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all',
  btnOutline: 'border border-purple-500/50 text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all',

  // Inputs
  input: 'bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/30',
  select: 'bg-black/50 border border-purple-500/30 rounded-lg text-purple-300 focus:border-pink-500/50 focus:outline-none',

  // Status colors
  success: 'bg-green-500/200/20 text-green-400 border border-green-500/50',
  error: 'bg-red-500/200/20 text-red-400 border border-red-500/50',
  warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  pending: 'bg-purple-500/20 text-purple-400 border border-purple-500/50',
};
