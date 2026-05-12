/**
 * Vault-wide link index. Maps each note path to the list of incoming
 * references (other notes that link TO it via `[[name]]` or `![[name]]`).
 *
 * Design:
 *  - The index is a plain object so it's trivially JSON-serialisable for
 *    `.markup/cache/links.json` persistence later.
 *  - extractLinks() is the only place that parses wikilink syntax; the
 *    Outline / WikilinkPicker / paragraph-link code that already does its
 *    own parsing will be migrated to consume this in a follow-up batch.
 *  - Resolution from "wikilink target string" → "absolute vault path"
 *    lives at the index layer (resolveTarget), not in the parser, so the
 *    parser stays a pure string→AST transform.
 *
 * What's NOT in this file (intentionally, to keep the batch small):
 *  - The actual vault scan / file-read loop. That's the next batch.
 *  - Persistence to disk. Next batch.
 *  - UI. Next batch.
 *  - Unlinked-mentions detection. Separate batch — needs alias support
 *    (frontmatter properties), which isn't built yet.
 */

/** A single occurrence of `[[target]]` or `![[target]]` inside a source file. */
export interface LinkRef {
  /** Absolute path of the file containing the reference. */
  sourcePath: string;
  /** The raw target as written, e.g. "Foo" or "Foo#Section" or "dir/Foo". */
  target: string;
  /** 0-based line index of the reference inside its source file. */
  line: number;
  /** Trimmed text of the line, capped to a short snippet for UI display. */
  snippet: string;
  /** True when the link is an embed (`![[…]]`), false for a plain link. */
  isEmbed: boolean;
}

/** Index keyed by **resolved absolute path** of the target file. */
export type LinkIndex = Record<string, LinkRef[]>;

/** Maximum snippet length stored per LinkRef. UI typically clips further. */
const SNIPPET_CAP = 200;

const WIKILINK_RE = /(!?)\[\[([^\]|\n]+?)(?:\|[^\]\n]+?)?\]\]/g;

/** Strip `#heading` and `^block` suffixes from a wikilink target — those
 *  don't affect which file the link points to, only which anchor inside. */
export function stripAnchor(target: string): string {
  const hashIdx = target.indexOf("#");
  const caretIdx = target.indexOf("^");
  const firstAnchor = [hashIdx, caretIdx].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  return firstAnchor === undefined ? target : target.slice(0, firstAnchor);
}

/**
 * Parse `[[wikilink]]` and `![[embed]]` references out of one file's
 * content. Skips occurrences inside fenced code blocks (``` or ~~~) and
 * inline code spans (`` `…` ``). Returns the bare list — resolution
 * against a vault directory happens at the index layer.
 */
export function extractLinks(content: string, sourcePath: string): LinkRef[] {
  if (!content) return [];
  const out: LinkRef[] = [];
  const lines = content.split("\n");
  let inFence = false;
  let fenceMarker = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(```|~~~)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1];
      } else if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;

    // Strip inline-code spans before scanning so `` `[[fake]]` `` doesn't
    // produce a false link. Pairs of backticks define a span; unpaired
    // backticks are left alone.
    const scan = line.replace(/`([^`\n]*)`/g, (_m, inner) =>
      " ".repeat(inner.length + 2),
    );

    const reLocal = new RegExp(WIKILINK_RE.source, "g");
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic JS regex loop
    while ((m = reLocal.exec(scan)) !== null) {
      const isEmbed = m[1] === "!";
      const target = m[2].trim();
      if (!target) continue;
      const snippet = line.trim().slice(0, SNIPPET_CAP);
      out.push({ sourcePath, target, line: i, snippet, isEmbed });
    }
  }
  return out;
}

/**
 * Resolve a wikilink target string to an absolute vault path. Rules:
 *  - Anchors (`#…`, `^…`) stripped before resolution.
 *  - Exact match on `name` against any file's basename-without-extension
 *    wins (most Obsidian users rely on filename uniqueness).
 *  - Falls back to a path-suffix match (so `dir/Foo` finds `vault/dir/Foo.md`).
 *  - Returns null when no candidate matches.
 *
 * `pathsByBasename` is `Map<basename-without-ext, Array<absolute path>>`,
 * built once per index rebuild. Passing it in keeps resolveTarget O(1)
 * for the common case.
 */
export function resolveTarget(
  target: string,
  pathsByBasename: Map<string, string[]>,
  allPaths: string[],
): string | null {
  const bare = stripAnchor(target).trim();
  if (!bare) return null;

  // Try basename match first. We strip a trailing ".md" from the user's
  // link too so `[[Foo.md]]` resolves the same as `[[Foo]]`.
  const normalised = bare.replace(/\.md$/i, "");
  const candidates = pathsByBasename.get(normalised);
  if (candidates && candidates.length > 0) {
    return candidates[0];
  }

  // Path-suffix match. Compare with `.md` re-appended when the user
  // didn't write the extension.
  const needle = normalised.includes("/") ? `/${normalised}.md` : null;
  if (needle) {
    for (const p of allPaths) {
      if (p.toLowerCase().endsWith(needle.toLowerCase())) return p;
    }
  }
  return null;
}

/** Build the basename → paths lookup used by resolveTarget. */
export function buildBasenameMap(allPaths: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const p of allPaths) {
    const slash = p.lastIndexOf("/");
    const file = slash >= 0 ? p.slice(slash + 1) : p;
    const base = file.replace(/\.md$/i, "");
    const existing = map.get(base);
    if (existing) existing.push(p);
    else map.set(base, [p]);
  }
  return map;
}

/**
 * Build a complete LinkIndex from a list of `{path, content}` pairs.
 * Used on vault open and on "Rebuild link index" command. Per-file
 * incremental updates use {@link updateFileLinks}.
 */
export function buildIndex(files: { path: string; content: string }[]): LinkIndex {
  const allPaths = files.map((f) => f.path);
  const pathsByBasename = buildBasenameMap(allPaths);
  const index: LinkIndex = {};
  for (const { path, content } of files) {
    const refs = extractLinks(content, path);
    for (const ref of refs) {
      const resolved = resolveTarget(ref.target, pathsByBasename, allPaths);
      if (!resolved) continue;
      const bucket = index[resolved] ?? (index[resolved] = []);
      bucket.push(ref);
    }
  }
  return index;
}

/**
 * Re-scan a single file's links and patch the index in place. Removes
 * the file's stale outgoing references first, then adds the new ones.
 * O(refs in this file) for the parse, O(refs in vault) for the prune.
 */
export function updateFileLinks(
  index: LinkIndex,
  path: string,
  content: string,
  pathsByBasename: Map<string, string[]>,
  allPaths: string[],
): LinkIndex {
  // Strip every existing bucket of refs sourced from `path`.
  for (const target of Object.keys(index)) {
    const filtered = index[target].filter((r) => r.sourcePath !== path);
    if (filtered.length === 0) delete index[target];
    else index[target] = filtered;
  }
  // Re-extract and merge.
  const refs = extractLinks(content, path);
  for (const ref of refs) {
    const resolved = resolveTarget(ref.target, pathsByBasename, allPaths);
    if (!resolved) continue;
    const bucket = index[resolved] ?? (index[resolved] = []);
    bucket.push(ref);
  }
  return index;
}

/** Stable empty sentinel — callers using useSyncExternalStore need the
 *  reference to NOT change between renders when there are no backlinks,
 *  otherwise React thinks the snapshot mutated and re-renders forever. */
const EMPTY_REFS: LinkRef[] = [];

/** Look up incoming references for a given resolved path. Returns the
 *  stable empty sentinel (not a fresh `[]`) when there are no backlinks,
 *  so React subscribers don't see a new array reference every call. */
export function getBacklinks(index: LinkIndex, targetPath: string): LinkRef[] {
  return index[targetPath] ?? EMPTY_REFS;
}
