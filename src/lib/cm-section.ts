import { getActiveSourceView } from "./active-source-view";

interface SectionRange {
  /** 0-based line index of the section's heading line. */
  headingLine: number;
  /** Heading level (1..6). */
  level: number;
  /** 0-based line index of the last line owned by this section
   * (inclusive). The section ends at — but does not include — the next
   * heading whose level is <= this level. */
  endLine: number;
}

/** Locate the section whose heading line is at-or-above `cursorLine`.
 * Returns null when there is no enclosing heading (cursor in pre-amble). */
function findSection(lines: string[], cursorLine: number): SectionRange | null {
  let inFence = false;
  let fenceMarker = "";
  let headingLine = -1;
  let level = 0;
  // Walk down to cursorLine, tracking the most recent ATX heading we've
  // entered. We re-implement the fence skip so a `#` inside ```code```
  // doesn't fool us.
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
      continue;
    }
    if (inFence) continue;
    const m = trimmed.match(/^(#{1,6})\s+/);
    if (m) {
      headingLine = i;
      level = m[1].length;
    }
  }
  if (headingLine < 0) return null;

  // Walk forward from headingLine + 1 until we hit a heading whose level
  // is <= our level — that's the next section. Again skip fences.
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
    if (m && m[1].length <= level) {
      endLine = i - 1;
      break;
    }
  }
  return { headingLine, level, endLine };
}

/** Find the immediately-preceding sibling heading at exactly `level`,
 * stopping if a shallower-level heading appears in between (different
 * parent). Returns the line index or -1. */
function findPrevSibling(lines: string[], beforeLine: number, level: number): number {
  let inFence = false;
  let fenceMarker = "";
  for (let i = beforeLine; i >= 0; i--) {
    const trimmed = lines[i].trimStart();
    if (/^(```|~~~)/.test(trimmed)) {
      const m = trimmed.match(/^(```|~~~)/);
      if (m) {
        if (!inFence) {
          inFence = true;
          fenceMarker = m[1];
        } else if (trimmed.startsWith(fenceMarker)) {
          inFence = false;
        }
      }
      continue;
    }
    if (inFence) continue;
    const m = trimmed.match(/^(#{1,6})\s+/);
    if (!m) continue;
    const lv = m[1].length;
    if (lv === level) return i;
    if (lv < level) return -1; // hit a shallower parent — different scope
  }
  return -1;
}

/** Move the section enclosing the cursor up past the previous sibling
 * heading. No-op when there is no peer above or the cursor isn't inside
 * a section. */
export function moveSectionUp(): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const lines = view.state.doc.toString().split("\n");
  const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  const section = findSection(lines, cursorLine);
  if (!section) return false;
  const prevHeading = findPrevSibling(lines, section.headingLine - 1, section.level);
  if (prevHeading < 0) return false;
  const prev = findSection(lines, prevHeading);
  if (!prev) return false;
  // Build the reordered slice: section first, then prev section.
  const sectionLines = lines.slice(section.headingLine, section.endLine + 1);
  const prevLines = lines.slice(prev.headingLine, prev.endLine + 1);
  const newSlice = [...sectionLines, ...prevLines].join("\n");
  const startPos = view.state.doc.line(prev.headingLine + 1).from;
  const endPos = view.state.doc.line(section.endLine + 1).to;
  view.dispatch({
    changes: { from: startPos, to: endPos, insert: newSlice },
    // Anchor the cursor at the moved section's new heading line so
    // moveSectionToTop / iterative callers can re-find it cleanly.
    selection: { anchor: startPos },
    userEvent: "move.section",
  });
  return true;
}

/**
 * Move the section enclosing the cursor to the top of its parent's
 * scope — repeatedly moves it past previous siblings until none remain.
 * No-op when there are no previous siblings.
 */
export function moveSectionToTop(): boolean {
  let moved = false;
  // Bound the loop to prevent infinite recursion on pathological docs.
  for (let i = 0; i < 1000; i++) {
    if (!moveSectionUp()) break;
    moved = true;
  }
  return moved;
}

/**
 * Move the section enclosing the cursor to the bottom of its parent's
 * scope — repeatedly moves it past next siblings until none remain.
 * No-op when there are no next siblings.
 */
export function moveSectionToBottom(): boolean {
  let moved = false;
  for (let i = 0; i < 1000; i++) {
    if (!moveSectionDown()) break;
    moved = true;
  }
  return moved;
}

/** Move the section enclosing the cursor down past the next sibling.
 * No-op when there's no peer after or the cursor isn't in a section. */
export function moveSectionDown(): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const lines = view.state.doc.toString().split("\n");
  const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  const section = findSection(lines, cursorLine);
  if (!section) return false;
  const nextStart = section.endLine + 1;
  if (nextStart >= lines.length) return false;
  const next = findSection(lines, nextStart);
  // Only swap with a true peer at the same level. A shallower next
  // section would be the parent's next sibling (different scope).
  if (!next || next.headingLine !== nextStart || next.level !== section.level)
    return false;
  const sectionLines = lines.slice(section.headingLine, section.endLine + 1);
  const nextLines = lines.slice(next.headingLine, next.endLine + 1);
  const newSlice = [...nextLines, ...sectionLines].join("\n");
  const startPos = view.state.doc.line(section.headingLine + 1).from;
  const endPos = view.state.doc.line(next.endLine + 1).to;
  // The moved section's new heading line starts right after the
  // inserted prev-block (+1 for the joining "\n").
  const newSectionStart = startPos + nextLines.join("\n").length + 1;
  view.dispatch({
    changes: { from: startPos, to: endPos, insert: newSlice },
    selection: { anchor: newSectionStart },
    userEvent: "move.section",
  });
  return true;
}
