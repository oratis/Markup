/**
 * Build a wikilink-style copy target for the active paragraph.
 *
 * Output is a markdown wikilink referring to the file (and nearest preceding
 * heading) — clickable from any other markup file with our wikilink handler.
 *
 *   path = /vault/notes/foo.md, headings include "## Bar" before the cursor
 *   →  "[[foo#Bar]]"
 *
 * If there is no path (scratch buffer), copies the heading text or first 60
 * chars of the paragraph as plain text.
 */
export function buildParagraphLink(
  path: string | null,
  content: string,
  cursorLine: number,
): string {
  const fileName = path
    ? (path.split("/").pop() ?? path).replace(/\.(md|markdown|mdx|mkd)$/i, "")
    : null;

  const lines = content.split("\n");
  // walk upwards looking for a heading. Skip lines inside fenced code blocks.
  let inFence = false;
  let fenceMarker = "";
  for (let i = 0; i <= cursorLine && i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    const fenceMatch = trimmed.match(/^(```|~~~)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1];
      } else if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
      }
    }
  }

  // Now scan upwards from cursorLine, ignoring lines inside fences.
  inFence = false;
  let nearestHeading: string | null = null;
  for (let i = cursorLine; i >= 0; i--) {
    const trimmed = lines[i].trimStart();
    if (/^(```|~~~)/.test(trimmed)) inFence = !inFence;
    if (inFence) continue;
    const atx = trimmed.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (atx) {
      nearestHeading = atx[1].trim();
      break;
    }
  }

  if (fileName) {
    return nearestHeading ? `[[${fileName}#${nearestHeading}]]` : `[[${fileName}]]`;
  }
  if (nearestHeading) return `## ${nearestHeading}`;
  // Fallback: first 60 chars of the paragraph at cursorLine
  const para = lines[cursorLine] ?? "";
  return para.slice(0, 60).trim() || "(empty)";
}
