/**
 * Per-tab scroll-position cache. Maps a tab id to the scroll offset we
 * last saw on its editor host. The Editor mount restores the saved
 * value (after first paint) and writes back on scroll. Module-level so
 * the cache survives editor remounts during tab switches.
 *
 * Lives only in memory — restoring across an app relaunch is intentionally
 * out of scope (we'd need to track per-path, not per-tab, since tab ids
 * regenerate).
 */
const cache = new Map<string, number>();

export function getScroll(id: string): number {
  return cache.get(id) ?? 0;
}

export function setScroll(id: string, offset: number): void {
  cache.set(id, offset);
}

export function clearScroll(id: string): void {
  cache.delete(id);
}

/** For tests. */
export function _resetScrollCache(): void {
  cache.clear();
}
