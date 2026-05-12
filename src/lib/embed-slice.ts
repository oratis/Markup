/**
 * Pure helpers for resolving Obsidian-style embeds. The UI batch will
 * use these to render `![[file]]` / `![[file#heading]]` / `![[file^block]]`
 * as inline transcluded content.
 *
 * The link-index module already handles `[[…]]` extraction including
 * the embed `!` prefix and the `target` string (including `#…` / `^…`
 * suffixes). This file adds the slicing primitives that turn a
 * suffix + a target document into the substring to display.
 *
 * Performance note: each slice walks the target document once. For
 * docs with N headings and an embed addressing the K-th, that's O(N).
 * For typical PKM-sized files this is well below 1ms; we'll add
 * memoisation in the index store if heavy renderers expose latency.
 */

/** Strip a `#` / `^` anchor off a wikilink target. Mirrors stripAnchor
 *  in link-index.ts but exposed here for callers that already know the
 *  link is an embed and want the anchor part out. */
export function splitEmbedTarget(target: string): {
  file: string;
  heading: string | null;
  blockId: string | null;
} {
  const hashIdx = target.indexOf("#");
  const caretIdx = target.indexOf("^");
  const valid = [hashIdx, caretIdx].filter((i) => i >= 0).sort((a, b) => a - b);
  if (valid.length === 0) {
    return { file: target.trim(), heading: null, blockId: null };
  }
  const first = valid[0];
  const file = target.slice(0, first).trim();
  if (target[first] === "#") {
    return {
      file,
      heading: target
        .slice(first + 1)
        .split("^")[0]
        .trim(),
      blockId: null,
    };
  }
  return {
    file,
    heading: null,
    blockId: target
      .slice(first + 1)
      .split("#")[0]
      .trim(),
  };
}

/**
 * Return the text of the section whose ATX heading text matches `heading`
 * (exact match after trimming surrounding `#` markers). The section
 * spans from the heading line through the last line before the next
 * heading at the same or shallower level. Heading detection skips fences.
 *
 * Returns null when no matching heading exists.
 */
export function findSectionByHeading(content: string, heading: string): string | null {
  if (!content || !heading) return null;
  const lines = content.split("\n");
  let inFence = false;
  let fenceMarker = "";
  let headingLine = -1;
  let headingLevel = 0;

  // Pass 1: locate the heading.
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
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
    const m = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m && m[2].trim() === heading) {
      headingLine = i;
      headingLevel = m[1].length;
      break;
    }
  }
  if (headingLine < 0) return null;

  // Pass 2: find end of the section.
  inFence = false;
  fenceMarker = "";
  let endLine = lines.length - 1;
  for (let i = headingLine + 1; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
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
    const m = trimmed.match(/^(#{1,6})\s+/);
    if (m && m[1].length <= headingLevel) {
      endLine = i - 1;
      break;
    }
  }
  return lines.slice(headingLine, endLine + 1).join("\n");
}

/**
 * Return the text of the block (paragraph or list-item) tagged with
 * `^blockId` — Obsidian's "block reference" marker. The block marker
 * conventionally appears at end-of-line, separated by a space, e.g.
 *
 *     This is a block. ^abc123
 *
 * The returned text is the paragraph that contains the marker (line
 * with the marker plus any contiguous non-blank lines above it, up to
 * the previous blank line or block boundary). The `^blockId` marker
 * itself is stripped from the output.
 *
 * Returns null when no marker matches.
 */
export function findBlock(content: string, blockId: string): string | null {
  if (!content || !blockId) return null;
  const lines = content.split("\n");
  const marker = `^${blockId}`;
  // Locate the marker (must be preceded by whitespace, must be end of trimmed line).
  let hit = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmedEnd = lines[i].trimEnd();
    if (trimmedEnd.endsWith(marker)) {
      const before = trimmedEnd.slice(0, trimmedEnd.length - marker.length);
      if (before === "" || /\s$/.test(before)) {
        hit = i;
        break;
      }
    }
  }
  if (hit < 0) return null;

  // Walk back to the start of the paragraph. Stop at blank line, BOF,
  // or a heading line — block markers belong to the content below the
  // heading, not to the heading itself.
  let start = hit;
  while (start > 0) {
    const prev = lines[start - 1];
    if (prev.trim() === "") break;
    if (/^\s*#{1,6}\s/.test(prev)) break;
    start--;
  }
  const block = lines.slice(start, hit + 1).join("\n");
  // Strip the trailing `^id` marker (including the preceding space).
  return block.replace(new RegExp(`\\s*\\^${blockId}\\s*$`), "");
}

/**
 * Resolve a whole embed against a target document. Calls
 * findSectionByHeading / findBlock as appropriate. When there's no
 * anchor, returns the entire document content.
 *
 * Returns null only when an anchor was specified and didn't match.
 */
export function sliceEmbed(
  targetContent: string,
  heading: string | null,
  blockId: string | null,
): string | null {
  if (heading) return findSectionByHeading(targetContent, heading);
  if (blockId) return findBlock(targetContent, blockId);
  return targetContent;
}
