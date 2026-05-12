/**
 * Singleton tag index: keeps a vault-wide `Map<tag, Set<filePath>>` plus
 * the inverse (per-file tag set). Reactive via subscribe() so the
 * upcoming TagsPane can use useSyncExternalStore.
 *
 * Mirrors the shape of link-index-store: same lifecycle hooks
 * (setVaultRoot / setVaultPaths / onFileSaved / onFileRemoved /
 * rebuildFromFiles), same localStorage persistence pattern. Shipping
 * both with parallel APIs lets the next batch wire both into the same
 * App.tsx save/load effects.
 */

import { extractTags } from "./tag-extract";

interface PersistedShape {
  vaultRoot: string;
  builtAt: number;
  /** tag → array of file paths (Set isn't JSON-native). */
  tags: Record<string, string[]>;
}

const KEY = "markup.tagIndex";
const MAX_PERSIST_BYTES = 4 * 1024 * 1024;

let vaultRoot: string | null = null;
let allPaths = new Set<string>();
let tagToFiles = new Map<string, Set<string>>();
let fileToTags = new Map<string, Set<string>>();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function serialise(): string {
  const obj: Record<string, string[]> = {};
  for (const [tag, files] of tagToFiles) {
    obj[tag] = [...files];
  }
  return JSON.stringify({
    vaultRoot: vaultRoot ?? "",
    builtAt: Date.now(),
    tags: obj,
  } satisfies PersistedShape);
}

function loadPersisted(root: string): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as PersistedShape;
    if (!parsed || parsed.vaultRoot !== root) return false;
    tagToFiles = new Map();
    fileToTags = new Map();
    allPaths = new Set();
    for (const [tag, files] of Object.entries(parsed.tags)) {
      if (!Array.isArray(files)) continue;
      const set = new Set(files);
      tagToFiles.set(tag, set);
      for (const f of files) {
        allPaths.add(f);
        const fileSet = fileToTags.get(f) ?? new Set();
        fileSet.add(tag);
        fileToTags.set(f, fileSet);
      }
    }
    return true;
  } catch {
    return false;
  }
}

function persist() {
  if (!vaultRoot) return;
  try {
    const out = serialise();
    if (out.length > MAX_PERSIST_BYTES) return;
    localStorage.setItem(KEY, out);
  } catch {
    /* ignore */
  }
}

/** Switch the active vault root. Matching cache → restore; mismatch →
 *  wipe in-memory state (caller follows with rebuildFromFiles). */
export function setVaultRoot(root: string | null): void {
  if (vaultRoot === root) return;
  vaultRoot = root;
  if (root && loadPersisted(root)) {
    notify();
    return;
  }
  tagToFiles = new Map();
  fileToTags = new Map();
  allPaths = new Set();
  notify();
}

/** Replace the entire index from `{path, content}` pairs. */
export function rebuildFromFiles(files: { path: string; content: string }[]): void {
  tagToFiles = new Map();
  fileToTags = new Map();
  allPaths = new Set();
  for (const { path, content } of files) {
    allPaths.add(path);
    const tags = extractTags(content);
    if (tags.size === 0) continue;
    fileToTags.set(path, tags);
    for (const tag of tags) {
      const bucket = tagToFiles.get(tag) ?? new Set<string>();
      bucket.add(path);
      tagToFiles.set(tag, bucket);
    }
  }
  persist();
  notify();
}

/** Re-extract tags for one file after a save. */
export function onFileSaved(path: string, content: string): void {
  allPaths.add(path);
  // Remove the file from every tag bucket it currently sits in.
  const oldTags = fileToTags.get(path);
  if (oldTags) {
    for (const tag of oldTags) {
      const bucket = tagToFiles.get(tag);
      if (!bucket) continue;
      bucket.delete(path);
      if (bucket.size === 0) tagToFiles.delete(tag);
    }
  }
  // Add the file to its new tag buckets.
  const newTags = extractTags(content);
  if (newTags.size === 0) {
    fileToTags.delete(path);
  } else {
    fileToTags.set(path, newTags);
    for (const tag of newTags) {
      const bucket = tagToFiles.get(tag) ?? new Set<string>();
      bucket.add(path);
      tagToFiles.set(tag, bucket);
    }
  }
  persist();
  notify();
}

/** Refresh known-paths from the vault file list. Files no longer in the
 *  vault have their tag buckets cleaned up. */
export function setVaultPaths(paths: string[]): void {
  allPaths = new Set(paths);
  for (const [path, tags] of fileToTags) {
    if (allPaths.has(path)) continue;
    for (const tag of tags) {
      const bucket = tagToFiles.get(tag);
      if (!bucket) continue;
      bucket.delete(path);
      if (bucket.size === 0) tagToFiles.delete(tag);
    }
    fileToTags.delete(path);
  }
  persist();
  notify();
}

/** Forget all tags coming from `path` (file deleted/renamed). */
export function onFileRemoved(path: string): void {
  const tags = fileToTags.get(path);
  if (tags) {
    for (const tag of tags) {
      const bucket = tagToFiles.get(tag);
      if (!bucket) continue;
      bucket.delete(path);
      if (bucket.size === 0) tagToFiles.delete(tag);
    }
    fileToTags.delete(path);
  }
  allPaths.delete(path);
  persist();
  notify();
}

/** All tags currently in the vault, with file counts. Sorted alpha. */
export function allTagsWithCounts(): { tag: string; count: number }[] {
  const out: { tag: string; count: number }[] = [];
  for (const [tag, files] of tagToFiles) {
    out.push({ tag, count: files.size });
  }
  out.sort((a, b) => a.tag.localeCompare(b.tag));
  return out;
}

/** Files carrying the given tag. */
export function filesForTag(tag: string): string[] {
  const bucket = tagToFiles.get(tag);
  return bucket ? [...bucket].sort() : [];
}

/** Tag count summary. */
export function tagStats(): { tags: number; files: number } {
  return { tags: tagToFiles.size, files: fileToTags.size };
}

/** Reactive subscription. */
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** For tests. */
export function _resetTagIndexStore(): void {
  vaultRoot = null;
  allPaths = new Set();
  tagToFiles = new Map();
  fileToTags = new Map();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
