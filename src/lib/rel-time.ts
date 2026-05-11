/**
 * Human-readable relative time string for a past timestamp ("5s ago",
 * "2m ago", "3h ago", "4d ago"). Intentionally coarse — we only use
 * this in the status bar for "last saved" hints.
 */
export function relTime(ms: number, nowMs: number = Date.now()): string {
  const diff = Math.max(0, nowMs - ms);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
