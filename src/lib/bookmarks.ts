/**
 * Persisted set of bookmarked file paths. Reactive — subscribe()
 * notifies the BookmarksPane on every mutation.
 *
 * Persistence: a single localStorage key holding a JSON string array.
 * Survives relaunch independent of vault open (so cross-vault
 * bookmarks remain visible until you delete them).
 */

const KEY = "markup.bookmarks";
let paths: string[] = readPersisted();
const listeners = new Set<() => void>();

function readPersisted(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((p) => typeof p === "string");
  } catch {
    /* ignore */
  }
  return [];
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(paths));
  } catch {
    /* ignore */
  }
}

function notify() {
  for (const l of listeners) l();
}

/** True when `path` is currently bookmarked. */
export function isBookmarked(path: string): boolean {
  return paths.includes(path);
}

/** Add a bookmark. No-op when already present. */
export function addBookmark(path: string): void {
  if (paths.includes(path)) return;
  paths = [...paths, path];
  persist();
  notify();
}

/** Remove a bookmark. No-op when not present. */
export function removeBookmark(path: string): void {
  if (!paths.includes(path)) return;
  paths = paths.filter((p) => p !== path);
  persist();
  notify();
}

/** Toggle the bookmark state of `path`. Returns the new state (true =
 *  now bookmarked, false = removed). */
export function toggleBookmark(path: string): boolean {
  if (paths.includes(path)) {
    removeBookmark(path);
    return false;
  }
  addBookmark(path);
  return true;
}

/** Current bookmarked paths (stable reference between calls; mutations
 *  produce a new array). Sorted by relPath would require the vault
 *  context — keep insertion order for now. */
export function getBookmarks(): string[] {
  return paths;
}

/** Reactive subscription for React useSyncExternalStore. */
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** For tests. */
export function _resetBookmarks(): void {
  paths = [];
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
