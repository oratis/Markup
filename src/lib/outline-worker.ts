/// <reference lib="webworker" />

/**
 * Worker-side heading extractor. Identical algorithm to the inline parser
 * in components/Outline.tsx; ported here so big documents don't block the
 * main thread.
 *
 * Protocol: receive { id, text }, reply { id, headings }.
 */

export interface Heading {
  level: number;
  text: string;
  line: number;
}

interface RequestMsg {
  id: number;
  text: string;
}
interface ReplyMsg {
  id: number;
  headings: Heading[];
}

// Keep in sync with src/lib/headings.ts (this worker copy stays dep-free).
function isSetextParagraph(prev: string | undefined): boolean {
  const t = prev?.trim();
  if (!t) return false;
  if (/^#{1,6}\s/.test(t)) return false; // ATX heading
  if (/^[-*+]\s/.test(t)) return false; // bullet list item
  if (/^\d+[.)]\s/.test(t)) return false; // ordered list item
  return true;
}

function parseHeadings(md: string): Heading[] {
  const out: Heading[] = [];
  const lines = md.split("\n");
  let inFence = false;
  let fenceMarker = "";

  // Skip a leading YAML frontmatter block so its closing "---" isn't read as a
  // Setext underline (phantom heading). Mirrors src/lib/headings.ts.
  let start = 0;
  if (lines[0]?.trim() === "---") {
    for (let k = 1; k < lines.length; k++) {
      if (lines[k]?.trim() === "---") {
        start = k + 1;
        break;
      }
    }
  }

  for (let i = start; i < lines.length; i++) {
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

    const atx = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (atx) {
      out.push({ level: atx[1].length, text: atx[2], line: i });
      continue;
    }
    if (i > start && /^=+\s*$/.test(line.trim()) && isSetextParagraph(lines[i - 1])) {
      out.push({ level: 1, text: lines[i - 1].trim(), line: i - 1 });
      continue;
    }
    if (i > start && /^-+\s*$/.test(line.trim()) && isSetextParagraph(lines[i - 1])) {
      out.push({ level: 2, text: lines[i - 1].trim(), line: i - 1 });
    }
  }
  return out;
}

self.onmessage = (e: MessageEvent<RequestMsg>) => {
  const { id, text } = e.data;
  const reply: ReplyMsg = { id, headings: parseHeadings(text) };
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(reply);
};

export type { ReplyMsg, RequestMsg };
