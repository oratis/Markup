/**
 * Singleton holder for the vault link index. Reactive: UI components
 * subscribe and re-render when the index mutates. Persisted to
 * localStorage keyed by vault root so the panel populates instantly on
 * relaunch without re-scanning the disk.
 *
 * The pure indexing primitives live in link-index.ts; this module is the
 * "live state" wrapper around them.
 *
 * Why localStorage instead of `.markup/cache/links.json` on disk:
 *  - localStorage is synchronous and read-on-mount; no async wait for UI
 *  - File-based cache would need a Tauri command + watcher invalidation
 *  - Index size is small (refs are short strings); a 1000-file vault is
 *    well under the 5 MB localStorage budget
 *  Filesystem cache is a follow-up if the budget becomes a problem.
 */

import {
  type LinkIndex,
  type LinkRef,
  buildBasenameMap,
  buildIndex,
  extractLinks,
  getBacklinks,
  resolveTarget,
} from "./link-index";

interface PersistedShape {
  vaultRoot: string;
  builtAt: number;
  paths: string[];
  index: LinkIndex;
}

const KEY = "markup.linkIndex";
const MAX_PERSIST_BYTES = 4 * 1024 * 1024; // generous; leaves room for other localStorage entries

let vaultRoot: string | null = null;
let allPaths: string[] = [];
let pathsByBasename = new Map<string, string[]>();
let index: LinkIndex = {};
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function loadPersisted(root: string): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as PersistedShape;
    if (!parsed || parsed.vaultRoot !== root) return false;
    if (!Array.isArray(parsed.paths) || typeof parsed.index !== "object") return false;
    allPaths = parsed.paths;
    pathsByBasename = buildBasenameMap(allPaths);
    index = parsed.index;
    return true;
  } catch {
    return false;
  }
}

function persist() {
  if (!vaultRoot) return;
  try {
    const payload: PersistedShape = {
      vaultRoot,
      builtAt: Date.now(),
      paths: allPaths,
      index,
    };
    const serialised = JSON.stringify(payload);
    if (serialised.length > MAX_PERSIST_BYTES) return; // skip; index too big
    localStorage.setItem(KEY, serialised);
  } catch {
    /* ignore */
  }
}

/** Set the active vault root. When the root changes vs the persisted
 *  cache, the in-memory index is cleared (callers should follow up with
 *  `rebuildFromFiles`). When it matches the cache, the cached index is
 *  restored so the UI populates immediately. */
export function setVaultRoot(root: string | null): void {
  if (vaultRoot === root) return;
  vaultRoot = root;
  if (root && loadPersisted(root)) {
    notify();
    return;
  }
  allPaths = [];
  pathsByBasename = new Map();
  index = {};
  notify();
}

/** Replace the entire index from the given `{path, content}` pairs.
 *  Use this on vault open or "Rebuild Link Index" command. */
export function rebuildFromFiles(files: { path: string; content: string }[]): void {
  allPaths = files.map((f) => f.path);
  pathsByBasename = buildBasenameMap(allPaths);
  index = buildIndex(files);
  persist();
  notify();
}

/** Update one file's outgoing refs after a save. The vault file list
 *  must already include `path` (callers must add new files via
 *  setVaultPaths before calling this). */
export function onFileSaved(path: string, content: string): void {
  if (!allPaths.includes(path)) {
    allPaths = [...allPaths, path];
    pathsByBasename = buildBasenameMap(allPaths);
  }
  // Strip stale refs from this file, then merge fresh ones.
  for (const target of Object.keys(index)) {
    const filtered = index[target].filter((r) => r.sourcePath !== path);
    if (filtered.length === 0) delete index[target];
    else index[target] = filtered;
  }
  const refs = extractLinks(content, path);
  for (const ref of refs) {
    const resolved = resolveTarget(ref.target, pathsByBasename, allPaths);
    if (!resolved) continue;
    const bucket = index[resolved] ?? (index[resolved] = []);
    bucket.push(ref);
  }
  persist();
  notify();
}

/** Refresh the known-paths list (e.g. when a file is created/deleted)
 *  without touching outgoing refs. */
export function setVaultPaths(paths: string[]): void {
  allPaths = paths;
  pathsByBasename = buildBasenameMap(paths);
  // Drop any backlink targets whose file no longer exists in the vault.
  const valid = new Set(paths);
  for (const target of Object.keys(index)) {
    if (!valid.has(target)) delete index[target];
  }
  persist();
  notify();
}

/** Forget refs that originated from `path` (file deleted/renamed). */
export function onFileRemoved(path: string): void {
  for (const target of Object.keys(index)) {
    const filtered = index[target].filter((r) => r.sourcePath !== path);
    if (filtered.length === 0) delete index[target];
    else index[target] = filtered;
  }
  allPaths = allPaths.filter((p) => p !== path);
  pathsByBasename = buildBasenameMap(allPaths);
  persist();
  notify();
}

/** Look up incoming refs for `targetPath`. Returns empty array, not null. */
export function getBacklinksFor(targetPath: string): LinkRef[] {
  return getBacklinks(index, targetPath);
}

/** Total number of indexed files (= unique sources currently pointing
 *  at any target). Useful for the "Rebuild" toast and debug UI. */
export function indexStats(): { targets: number; refs: number } {
  let refs = 0;
  for (const bucket of Object.values(index)) refs += bucket.length;
  return { targets: Object.keys(index).length, refs };
}

/** Reactive subscription for React useSyncExternalStore. */
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Reset everything — for tests. */
export function _resetLinkIndexStore(): void {
  vaultRoot = null;
  allPaths = [];
  pathsByBasename = new Map();
  index = {};
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
