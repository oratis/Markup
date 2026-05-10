/**
 * Persisted set of pinned-tab file paths. The store's `pinned` flag
 * lives only in memory (per-session); to survive a relaunch the App
 * mirrors path-backed pin state into localStorage via this helper.
 *
 * Scratch tabs (no path) are never persisted — they don't survive
 * restart on their own, so persisting the pin would dangle.
 */
const KEY = "markup.pinnedPaths";

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function write(set: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

/** Read the persisted set of pinned paths. */
export function getPinnedPaths(): Set<string> {
  return read();
}

/** Toggle a path's persisted pin state to match `pinned`. No-op for
 * empty paths (scratch tabs). */
export function persistPinnedPath(path: string | null, pinned: boolean): void {
  if (!path) return;
  const set = read();
  if (pinned) set.add(path);
  else set.delete(path);
  write(set);
}

/** For tests. */
export function _resetPinned(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
