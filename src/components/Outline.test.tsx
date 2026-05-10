import { describe, it, expect } from "vitest";

function parseHeadings(md: string) {
  const out: { level: number; text: string; line: number }[] = [];
  const lines = md.split("\n");
  let inFence = false;
  let fenceMarker = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(```|~~~)/);
    if (fenceMatch) {
      if (!inFence) { inFence = true; fenceMarker = fenceMatch[1]; }
      else if (trimmed.startsWith(fenceMarker)) inFence = false;
      continue;
    }
    if (inFence) continue;
    const atx = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (atx) out.push({ level: atx[1].length, text: atx[2], line: i });
    else if (i > 0 && /^=+\s*$/.test(line.trim()) && lines[i - 1].trim()) {
      out.push({ level: 1, text: lines[i - 1].trim(), line: i - 1 });
    } else if (i > 0 && /^-+\s*$/.test(line.trim()) && lines[i - 1].trim()) {
      out.push({ level: 2, text: lines[i - 1].trim(), line: i - 1 });
    }
  }
  return out;
}

describe("outline parser", () => {
  it("captures ATX headings with correct levels", () => {
    const md = "# A\n\nbody\n\n## B\n\n### C\n\n#### D\n";
    const out = parseHeadings(md);
    expect(out).toEqual([
      { level: 1, text: "A", line: 0 },
      { level: 2, text: "B", line: 4 },
      { level: 3, text: "C", line: 6 },
      { level: 4, text: "D", line: 8 },
    ]);
  });

  it("skips heading-like lines inside fenced code blocks", () => {
    const md = "# real\n\n```\n# fake heading\n```\n\n## also real\n";
    const out = parseHeadings(md);
    expect(out.map((h) => h.text)).toEqual(["real", "also real"]);
  });

  it("recognizes setext-style H1 (===) and H2 (---)", () => {
    const md = "Top\n===\n\nNext\n---\n\nbody\n";
    const out = parseHeadings(md);
    expect(out).toEqual([
      { level: 1, text: "Top", line: 0 },
      { level: 2, text: "Next", line: 3 },
    ]);
  });

  it("handles trailing # in ATX headings", () => {
    const out = parseHeadings("## title ##\n");
    expect(out[0]).toEqual({ level: 2, text: "title", line: 0 });
  });
});
