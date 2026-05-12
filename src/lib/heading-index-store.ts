/**
 * Vault-wide heading index. Powers Quick Open's `#` mode — "find any
 * heading 'Setup' across all my notes". Mirrors the lifecycle of
 * link-index-store and tag-index-store: setVaultRoot / setVaultPaths /
 * onFileSaved / onFileRemoved / rebuildFromFiles, plus a cached
 * snapshot for React useSyncExternalStore stability.
 *
 * Persisted to localStorage keyed by vault root; cap at 4 MB.
 */

import { parseHeadings } from "./headings";

export interface HeadingEntry {
  path: string;
  line: number;
  level: number;
  text: string;
}

interface PersistedShape {
  vaultRoot: string;
  builtAt: number;
  entries: HeadingEntry[];
}

const KEY = "markup.headingIndex";
const MAX_PERSIST_BYTES = 4 * 1024 * 1024;

let vaultRoot: string | null = null;
let allPaths = new Set<string>();
/** Map<path, headings> for O(refs-in-file) updates on save. */
let perFile = new Map<string, HeadingEntry[]>();
let snapshot: HeadingEntry[] = [];
const listeners = new Set<() => void>();

function rebuildSnapshot() {
  const out: HeadingEntry[] = [];
  for (const list of perFile.values()) {
    for (const h of list) out.push(h);
  }
  // Stable order: by path then by line.
  out.sort((a, b) =>
    a.path === b.path ? a.line - b.line : a.path.localeCompare(b.path),
  );
  snapshot = out;
}

function notify() {
  rebuildSnapshot();
  for (const l of listeners) l();
}

function persist() {
  if (!vaultRoot) return;
  try {
    const payload: PersistedShape = {
      vaultRoot,
      builtAt: Date.now(),
      entries: snapshot,
    };
    const out = JSON.stringify(payload);
    if (out.length > MAX_PERSIST_BYTES) return;
    localStorage.setItem(KEY, out);
  } catch {
    /* ignore */
  }
}

function loadPersisted(root: string): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as PersistedShape;
    if (!parsed || parsed.vaultRoot !== root || !Array.isArray(parsed.entries)) {
      return false;
    }
    perFile = new Map();
    allPaths = new Set();
    for (const e of parsed.entries) {
      allPaths.add(e.path);
      const bucket = perFile.get(e.path) ?? [];
      bucket.push(e);
      perFile.set(e.path, bucket);
    }
    return true;
  } catch {
    return false;
  }
}

export function setVaultRoot(root: string | null): void {
  if (vaultRoot === root) return;
  vaultRoot = root;
  if (root && loadPersisted(root)) {
    notify();
    return;
  }
  perFile = new Map();
  allPaths = new Set();
  notify();
}

export function rebuildFromFiles(files: { path: string; content: string }[]): void {
  perFile = new Map();
  allPaths = new Set();
  for (const { path, content } of files) {
    allPaths.add(path);
    const hs = parseHeadings(content).map((h) => ({
      path,
      line: h.line,
      level: h.level,
      text: h.text,
    }));
    if (hs.length > 0) perFile.set(path, hs);
  }
  notify();
  persist();
}

export function onFileSaved(path: string, content: string): void {
  allPaths.add(path);
  const hs = parseHeadings(content).map((h) => ({
    path,
    line: h.line,
    level: h.level,
    text: h.text,
  }));
  if (hs.length === 0) perFile.delete(path);
  else perFile.set(path, hs);
  notify();
  persist();
}

export function setVaultPaths(paths: string[]): void {
  allPaths = new Set(paths);
  for (const path of perFile.keys()) {
    if (!allPaths.has(path)) perFile.delete(path);
  }
  notify();
  persist();
}

export function onFileRemoved(path: string): void {
  perFile.delete(path);
  allPaths.delete(path);
  notify();
  persist();
}

/** Stable sorted snapshot of every indexed heading. */
export function getAllHeadings(): HeadingEntry[] {
  return snapshot;
}

export function headingStats(): { headings: number; files: number } {
  return { headings: snapshot.length, files: perFile.size };
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function _resetHeadingIndexStore(): void {
  vaultRoot = null;
  allPaths = new Set();
  perFile = new Map();
  snapshot = [];
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
