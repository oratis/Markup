import { getActiveSourceView } from "./active-source-view";

export interface Heading {
  level: number;
  text: string;
  /** 0-based line index in the source markdown. */
  line: number;
}

/**
 * Cheap heading scanner: walks the doc line-by-line. Treats `# ` …
 * `###### ` and Setext-style underlines (==== / ----). Skips heading-like
 * lines inside fenced code blocks.
 *
 * The Outline component used to inline an identical scanner; pulled here
 * so other features (heading navigation, breadcrumb, …) can reuse it
 * without going through React. The Web Worker keeps its own copy so it
 * doesn't pull main-thread deps.
 */
export function parseHeadings(md: string): Heading[] {
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

/** Build the chain of ancestor headings for `cursorLine`. The result
 * is shallowest-first (e.g. [H1, H2, H3] for a cursor inside an H3
 * subsection of an H2 inside an H1). */
export function headingBreadcrumb(headings: Heading[], cursorLine: number): Heading[] {
  const stack: Heading[] = [];
  for (const h of headings) {
    if (h.line > cursorLine) break;
    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }
    stack.push(h);
  }
  return stack;
}

/** Find the next heading whose 0-based line index is strictly greater
 * than `cursorLine`, or null when there is none. */
export function nextHeadingFrom(headings: Heading[], cursorLine: number): Heading | null {
  for (const h of headings) {
    if (h.line > cursorLine) return h;
  }
  return null;
}

/** Find the previous heading whose 0-based line index is strictly less
 * than `cursorLine`, or null when there is none. */
export function prevHeadingFrom(headings: Heading[], cursorLine: number): Heading | null {
  let last: Heading | null = null;
  for (const h of headings) {
    if (h.line < cursorLine) last = h;
    else break;
  }
  return last;
}

/** Move the active source-mode editor selection to the start of the
 * given line and scroll it into view. Returns false when no source
 * view is mounted. */
export function jumpToSourceLine(line: number): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const lineIdx = Math.max(1, line + 1);
  if (lineIdx > view.state.doc.lines) return false;
  const lineObj = view.state.doc.line(lineIdx);
  view.dispatch({
    selection: { anchor: lineObj.from, head: lineObj.from },
    scrollIntoView: true,
  });
  view.focus();
  return true;
}
