/**
 * Pure helper: find every `^blockid` block-reference marker in a doc.
 *
 * Markers conventionally sit at end-of-line, separated from prose by
 * whitespace, e.g.
 *
 *     This is a block. ^abc123
 *
 * Returns one entry per marker with the line index and the paragraph
 * text the marker belongs to (snippet for UI listing). Fenced code
 * blocks are skipped so `^id` in a shell example isn't indexed.
 */

export interface BlockEntry {
  /** The block-id, without the leading `^`. */
  id: string;
  /** 0-based line index where the marker appears. */
  line: number;
  /** Up to 200 chars of the line, marker stripped. */
  snippet: string;
}

const BLOCK_RE = /(?:^|\s)\^([\p{L}\p{N}_-]+)\s*$/u;

export function extractBlocks(content: string): BlockEntry[] {
  if (!content) return [];
  const out: BlockEntry[] = [];
  const lines = content.split("\n");
  let inFence = false;
  let fenceMarker = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedStart = line.trimStart();
    const fence = trimmedStart.match(/^(```|~~~)/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (trimmedStart.startsWith(fenceMarker)) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    const m = line.trimEnd().match(BLOCK_RE);
    if (!m) continue;
    const snippet = line
      .trimEnd()
      .replace(new RegExp(`\\s*\\^${m[1]}\\s*$`), "")
      .slice(0, 200);
    out.push({ id: m[1], line: i, snippet });
  }
  return out;
}
