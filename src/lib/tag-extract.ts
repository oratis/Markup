/**
 * Tag extraction from a Markdown document. Pure string→Set<string>; no
 * I/O, no React. Used by the tag-index store (next batch) for
 * vault-wide tag aggregation.
 *
 * Sources of tags:
 *   1. YAML frontmatter `tags: [a, b]` (inline array)
 *   2. YAML frontmatter `tags:` block list (`  - a` per line)
 *   3. Inline `#tag` (and nested `#tag/sub`) anywhere in the body
 *
 * Exclusions:
 *   - The leading ATX heading marker (`#` / `##` / …) is NOT a tag
 *   - Tags inside fenced code blocks (``` or ~~~) — code samples often
 *     contain `#include`, `#pragma`, etc.
 *   - Tags inside inline code spans (`` `…` ``)
 *   - Pure-numeric tags (`#1`, `#42`) — these are almost always page-anchor
 *     references or list ordinals in plain prose
 *
 * Allowed tag characters: Unicode letters, digits, `_`, with `-` and `/`
 * permitted only after the first character. `/` enables Obsidian-style
 * nested tags (`#projects/markup`).
 */

const TAG_BODY_RE = /(?:^|[^\p{L}\p{N}_])#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu;

/** Match opening fence with `optional ws + ``` (or ~~~)` + anything */
const FENCE_RE = /^(```|~~~)/;

/** Strip a single ' or " surround pair from a YAML scalar. Trims
 *  surrounding whitespace first so a stray space after the comma
 *  doesn't prevent the leading-quote anchor from matching. */
function unquote(s: string): string {
  return s.trim().replace(/^['"]|['"]$/g, "");
}

/** Drop a trailing `-` or `/` (could leak in from "#tag-" at end of word). */
function trimTrailingSep(tag: string): string {
  return tag.replace(/[-/]+$/, "");
}

function isPureNumeric(tag: string): boolean {
  return /^\d+$/.test(tag);
}

/** Parse frontmatter (only the leading `---\n…\n---` block) for tag
 *  declarations. Handles both inline-array and block-list YAML forms.
 *  Unknown keys / malformed YAML → empty set; we don't surface errors. */
function extractFrontmatterTags(content: string): {
  tags: Set<string>;
  bodyOffset: number;
} {
  const out = new Set<string>();
  // Must start exactly with "---\n" (don't accidentally match a horizontal rule).
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return { tags: out, bodyOffset: 0 };
  }
  const close = content.indexOf("\n---", 4);
  if (close < 0) return { tags: out, bodyOffset: 0 };
  const fm = content.slice(4, close);
  // Body starts after the closing "---" + newline.
  const afterClose = content.indexOf("\n", close + 1);
  const bodyOffset = afterClose >= 0 ? afterClose + 1 : content.length;

  // Inline array: tags: [a, b, "c d"]
  const inline = fm.match(/^tags:\s*\[(.*)\]\s*$/m);
  if (inline) {
    for (const raw of inline[1].split(",")) {
      const tag = unquote(raw).replace(/^#/, ""); // YAML allows leading '#' optionally
      if (tag) out.add(tag);
    }
  }

  // Block list:
  //   tags:
  //     - a
  //     - "b"
  const blockHeader = fm.match(/^tags:\s*$\n((?:[ \t]+-[ \t]+[^\n]+\n?)+)/m);
  if (blockHeader) {
    for (const line of blockHeader[1].split("\n")) {
      const m = line.match(/^[ \t]+-[ \t]+(.+)$/);
      if (!m) continue;
      const tag = unquote(m[1]).replace(/^#/, "");
      if (tag) out.add(tag);
    }
  }

  return { tags: out, bodyOffset };
}

/** Strip ATX heading prefix (`#`, `##`, …, `######` + required space)
 *  so the heading marker doesn't get scanned as a tag, but trailing
 *  tags on the heading line (`## Section #review`) DO match. Preserves
 *  line length by substituting spaces, so column-based features that
 *  consume the result still work.
 */
function stripHeadingPrefix(line: string): string {
  return line.replace(/^\s*#{1,6}\s/, (m) => " ".repeat(m.length));
}

/** Extract all tags from a markdown document. Returns a Set so order
 *  and duplicates don't matter to callers; sort/normalise at the UI
 *  layer if needed. */
export function extractTags(content: string): Set<string> {
  if (!content) return new Set();
  const { tags, bodyOffset } = extractFrontmatterTags(content);
  const body = content.slice(bodyOffset);
  const lines = body.split("\n");

  let inFence = false;
  let fenceMarker = "";
  for (const rawLine of lines) {
    const trimmed = rawLine.trimStart();
    const fenceMatch = trimmed.match(FENCE_RE);
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

    // Mask out inline code spans then the heading prefix.
    const masked = stripHeadingPrefix(rawLine).replace(/`[^`\n]*`/g, (m) =>
      " ".repeat(m.length),
    );

    const re = new RegExp(TAG_BODY_RE.source, "gu");
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex loop
    while ((m = re.exec(masked)) !== null) {
      const tag = trimTrailingSep(m[1]);
      if (!tag) continue;
      if (isPureNumeric(tag)) continue;
      tags.add(tag);
    }
  }
  return tags;
}

/** All nested-tag ancestors of `tag`. `projects/markup/v2` → ["projects",
 *  "projects/markup", "projects/markup/v2"]. Useful for tree views and
 *  for counting a parent's descendants by tag prefix. */
export function tagAncestors(tag: string): string[] {
  const parts = tag.split("/").filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    out.push(parts.slice(0, i + 1).join("/"));
  }
  return out;
}
