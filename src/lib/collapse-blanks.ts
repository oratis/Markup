/** Collapse runs of 2+ consecutive blank lines to a single blank line.
 *  Lines inside fenced code blocks (``` or ~~~) are left untouched so
 *  intentional blank lines inside code samples aren't lost.
 *
 *  A "blank line" is one whose trim() is empty (so whitespace-only lines
 *  count as blanks). The first blank in a run is preserved verbatim;
 *  subsequent blanks are dropped.
 */
export function collapseBlankLines(md: string): string {
  if (!md) return md;
  const lines = md.split("\n");
  const out: string[] = [];
  let inFence = false;
  let fenceMarker = "";
  let blankRun = 0;
  for (const line of lines) {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(```|~~~)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1];
      } else if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
      }
      blankRun = 0;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    if (line.trim() === "") {
      blankRun++;
      if (blankRun <= 1) out.push(line);
    } else {
      blankRun = 0;
      out.push(line);
    }
  }
  return out.join("\n");
}
