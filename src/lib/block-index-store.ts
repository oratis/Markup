/**
 * Vault-wide block-marker index. Same lifecycle as the heading
 * index. Powers QuickOpen's `^` mode.
 *
 * Block markers are vault-rare (most users only use a handful for
 * embed targets), so the snapshot stays tiny — no persistence cap
 * concerns in typical use.
 */

import { type BlockEntry, extractBlocks } from "./block-extract";

export interface BlockIndexEntry extends BlockEntry {
  path: string;
}

interface PersistedShape {
  vaultRoot: string;
  builtAt: number;
  entries: BlockIndexEntry[];
}

const KEY = "markup.blockIndex";
const MAX_PERSIST_BYTES = 4 * 1024 * 1024;

let vaultRoot: string | null = null;
let allPaths = new Set<string>();
let perFile = new Map<string, BlockIndexEntry[]>();
let snapshot: BlockIndexEntry[] = [];
const listeners = new Set<() => void>();

function rebuildSnapshot() {
  const out: BlockIndexEntry[] = [];
  for (const list of perFile.values()) for (const b of list) out.push(b);
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
    const out = JSON.stringify({
      vaultRoot,
      builtAt: Date.now(),
      entries: snapshot,
    } satisfies PersistedShape);
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
    const entries = extractBlocks(content).map((b) => ({ path, ...b }));
    if (entries.length > 0) perFile.set(path, entries);
  }
  notify();
  persist();
}

export function onFileSaved(path: string, content: string): void {
  allPaths.add(path);
  const entries = extractBlocks(content).map((b) => ({ path, ...b }));
  if (entries.length === 0) perFile.delete(path);
  else perFile.set(path, entries);
  notify();
  persist();
}

export function setVaultPaths(paths: string[]): void {
  allPaths = new Set(paths);
  for (const p of perFile.keys()) if (!allPaths.has(p)) perFile.delete(p);
  notify();
  persist();
}

export function onFileRemoved(path: string): void {
  perFile.delete(path);
  allPaths.delete(path);
  notify();
  persist();
}

export function getAllBlocks(): BlockIndexEntry[] {
  return snapshot;
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function _resetBlockIndexStore(): void {
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
