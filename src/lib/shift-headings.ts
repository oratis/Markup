/** Shift every ATX heading in `md` by `delta` levels. Heading lines whose
 *  new level would fall outside `[1, 6]` are left unchanged. Lines inside
 *  fenced code blocks are not treated as headings (so `# comment` inside
 *  ```bash``` won't get rewritten). Setext-style headings are not
 *  affected — they don't have a level marker to shift. */
export function shiftAllHeadings(md: string, delta: number): string {
  if (delta === 0 || !md) return md;
  const lines = md.split("\n");
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
    const m = line.match(/^(\s*)(#{1,6})(\s+.*)$/);
    if (!m) continue;
    const [, indent, hashes, rest] = m;
    const next = hashes.length + delta;
    if (next < 1 || next > 6) continue;
    lines[i] = `${indent}${"#".repeat(next)}${rest}`;
  }
  return lines.join("\n");
}
