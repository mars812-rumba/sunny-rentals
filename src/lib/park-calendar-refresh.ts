// Per-mounted-calendar snapshots only; no shared/private-data or persistent cache.
export function retainCalendarSnapshot<T>(previous: T[], incoming: T[]): T[] {
  return JSON.stringify(previous) === JSON.stringify(incoming) ? previous : incoming;
}

export const PARK_CALENDAR_REFRESH_MS = 60_000;

/** Call only while this screen is active and no booking editor is open. */
export function startParkCalendarPolling(refresh: () => void): () => void {
  const tick = () => { if (document.visibilityState !== 'hidden') refresh(); };
  const timer = window.setInterval(tick, PARK_CALENDAR_REFRESH_MS);
  window.addEventListener('focus', tick);
  document.addEventListener('visibilitychange', tick);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('focus', tick);
    document.removeEventListener('visibilitychange', tick);
  };
}
