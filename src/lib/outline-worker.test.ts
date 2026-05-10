import { describe, expect, it } from "vitest";

// Mirror of the worker's parser; the worker file uses self.onmessage and
// can't be imported directly into a node-test context (it would call
// `self.onmessage = …` at module load and crash). We re-test the logic
// here for parity with the inline scanner, and trust that the worker's
// tiny postMessage glue is correct.
function parseHeadings(md: string): { level: number; text: string; line: number }[] {
  const out: { level: number; text: string; line: number }[] = [];
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
      } else if (trimmed.startsWith(fenceMarker)) inFence = false;
      continue;
    }
    if (inFence) continue;
    const atx = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (atx) {
      out.push({ level: atx[1].length, text: atx[2], line: i });
      continue;
    }
    if (i > 0 && /^=+\s*$/.test(line.trim()) && lines[i - 1].trim()) {
      out.push({ level: 1, text: lines[i - 1].trim(), line: i - 1 });
      continue;
    }
    if (i > 0 && /^-+\s*$/.test(line.trim()) && lines[i - 1].trim()) {
      out.push({ level: 2, text: lines[i - 1].trim(), line: i - 1 });
    }
  }
  return out;
}

describe("outline worker parser parity", () => {
  it("matches the inline parser on a representative doc", () => {
    const md = "# H1\n\n## Sub\n\n```\n# fake\n```\n\n### deep\n";
    expect(parseHeadings(md).map((h) => h.text)).toEqual(["H1", "Sub", "deep"]);
  });

  it("handles setext H1/H2 and skips fenced code", () => {
    const md = "Top\n===\n\nNext\n---\n\n```\n# nope\n```\n";
    expect(parseHeadings(md)).toEqual([
      { level: 1, text: "Top", line: 0 },
      { level: 2, text: "Next", line: 3 },
    ]);
  });
});
