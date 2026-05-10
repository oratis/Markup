/**
 * Per-tab scroll-position cache. Maps a tab id to the scroll offset we
 * last saw on its editor host. The Editor mount restores the saved
 * value (after first paint) and writes back on scroll.
 *
 * Path-backed tabs (id === absolute path) get persisted to localStorage
 * so the offset survives a relaunch — which works because the store
 * regenerates path-backed ids deterministically. Scratch buffers are
 * memory-only (their ids are fresh per session, so persisting would
 * just leak entries).
 *
 * Capped at 200 entries; oldest dropped when full so the localStorage
 * footprint stays bounded for users who churn through many files.
 */
const KEY = "markup.scrollMemory";
const CAP = 200;

function isPersistable(id: string): boolean {
  return id.startsWith("/");
}

function loadPersisted(): Map<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return new Map();
    const m = new Map<string, number>();
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && Number.isFinite(v)) m.set(k, v);
    }
    return m;
  } catch {
    return new Map();
  }
}

function savePersisted(map: Map<string, number>): void {
  try {
    // Drop oldest entries if we exceed CAP.
    let toWrite = map;
    if (map.size > CAP) {
      const trimmed = new Map<string, number>();
      const entries = [...map.entries()].slice(-CAP);
      for (const [k, v] of entries) trimmed.set(k, v);
      toWrite = trimmed;
    }
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(toWrite)));
  } catch {
    /* ignore */
  }
}

const cache = loadPersisted();

export function getScroll(id: string): number {
  return cache.get(id) ?? 0;
}

export function setScroll(id: string, offset: number): void {
  cache.set(id, offset);
  if (isPersistable(id)) savePersisted(cache);
}

export function clearScroll(id: string): void {
  cache.delete(id);
  if (isPersistable(id)) savePersisted(cache);
}

/** For tests. */
export function _resetScrollCache(): void {
  cache.clear();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
