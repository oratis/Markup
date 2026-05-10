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

function parseHeadings(md: string): Heading[] {
  const out: Heading[] = [];
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

    const atx = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (atx) {
      out.push({ level: atx[1].length, text: atx[2], line: i });
      continue;
    }
    if (i > 0 && /^=+\s*$/.test(line.trim())) {
      const prev = lines[i - 1].trim();
      if (prev) out.push({ level: 1, text: prev, line: i - 1 });
      continue;
    }
    if (i > 0 && /^-+\s*$/.test(line.trim()) && lines[i - 1].trim()) {
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
