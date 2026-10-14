// Shared park UI palette. The legacy Sunny views keep their existing styles.
export const parkBookingColors = {
  pending: { badge: 'bg-purple-300 text-purple-950', text: 'text-purple-700', dot: 'bg-purple-500', bar: '#d8b4fe' },
  blocked: { badge: 'bg-slate-200 text-slate-900', text: 'text-slate-700', dot: 'bg-slate-400', bar: '#e2e8f0' },
  confirmed: { badge: 'bg-green-400 text-green-950', text: 'text-green-700', dot: 'bg-emerald-500', bar: '#86efac' },
  pickup: { badge: 'bg-green-400 text-green-950', dot: 'bg-green-500' },
  return: { badge: 'bg-yellow-400 text-yellow-950', dot: 'bg-yellow-400' },
} as const;
