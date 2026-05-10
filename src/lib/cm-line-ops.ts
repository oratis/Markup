import type { EditorState } from "@codemirror/state";
import { getActiveSourceView } from "./active-source-view";

interface LineRange {
  from: number;
  to: number;
  text: string;
  startLine: number;
  endLine: number;
}

/** Resolve the line range covering the current main selection. */
function selectedLines(state: EditorState): LineRange {
  const sel = state.selection.main;
  const start = state.doc.lineAt(sel.from);
  const end = state.doc.lineAt(sel.to);
  return {
    from: start.from,
    to: end.to,
    text: state.sliceDoc(start.from, end.to),
    startLine: start.number,
    endLine: end.number,
  };
}

/** Swap the selected line(s) with the line above. No-op at the top. */
export function moveLineUp(): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const block = selectedLines(view.state);
  if (block.startLine <= 1) return false;
  const prev = view.state.doc.line(block.startLine - 1);
  const insertAfter = `${block.text}\n${prev.text}`;
  view.dispatch({
    changes: { from: prev.from, to: block.to, insert: insertAfter },
    // Preserve relative selection by dropping it entirely; users typically
    // re-select via Cmd-L if needed.
    selection: { anchor: prev.from },
    userEvent: "move.line",
  });
  return true;
}

/** Swap the selected line(s) with the line below. No-op at the bottom. */
export function moveLineDown(): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const block = selectedLines(view.state);
  if (block.endLine >= view.state.doc.lines) return false;
  const next = view.state.doc.line(block.endLine + 1);
  const insertAfter = `${next.text}\n${block.text}`;
  view.dispatch({
    changes: { from: block.from, to: next.to, insert: insertAfter },
    selection: { anchor: block.from + next.text.length + 1 },
    userEvent: "move.line",
  });
  return true;
}

/** Duplicate the selected line(s) immediately below. */
export function duplicateLine(): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const block = selectedLines(view.state);
  view.dispatch({
    changes: { from: block.to, insert: `\n${block.text}` },
    userEvent: "input.duplicate",
  });
  return true;
}

/** Strip any leading bullet (`- `, `* `, `+ `), numbered (`1. `,
 * `12) `), task (`- [ ] `, `- [x] `), heading (`# ` … `###### `), or
 * blockquote (`> `) marker, returning the body. Indentation is
 * preserved. */
function stripLineMarker(text: string): string {
  // Leading whitespace pre-marker; e.g. "  - foo" → keep "  ".
  const lead = text.match(/^[\t ]*/)?.[0] ?? "";
  const body = text.slice(lead.length);
  const re = /^(?:#{1,6} |- \[[ xX]\] |[-*+] |\d+[.)] |> )/;
  const m = body.match(re);
  return m ? lead + body.slice(m[0].length) : text;
}

/** Set the heading level of every selected line to exactly `level`
 * (0 = no heading; 1..6 = H1..H6). Existing list markers / blockquote
 * markers are stripped when promoting to a heading. */
export function setHeadingLevel(level: 0 | 1 | 2 | 3 | 4 | 5 | 6): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const block = selectedLines(view.state);
  const lines: string[] = [];
  for (let i = block.startLine; i <= block.endLine; i++) {
    lines.push(view.state.doc.line(i).text);
  }
  const next = lines
    .map((l) => {
      const lead = l.match(/^[\t ]*/)?.[0] ?? "";
      const body = l.slice(lead.length);
      const m = body.match(/^(#{1,6}) +(.*)$/);
      const text = m ? m[2] : stripLineMarker(l).slice(lead.length);
      if (level === 0) return lead + text;
      return `${lead}${"#".repeat(level)} ${text}`;
    })
    .join("\n");
  view.dispatch({
    changes: { from: block.from, to: block.to, insert: next },
    userEvent: "input.heading",
  });
  return true;
}

/** Cycle the heading level of each selected line by `delta` (+1 / -1).
 * H0 (no heading) → H1 → H2 … → H6. Going below H1 strips the heading.
 * Existing list markers are removed when promoting a line to a heading. */
export function cycleHeadingLevel(delta: 1 | -1): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const block = selectedLines(view.state);
  const lines: string[] = [];
  for (let i = block.startLine; i <= block.endLine; i++) {
    lines.push(view.state.doc.line(i).text);
  }
  const next = lines
    .map((l) => {
      const lead = l.match(/^[\t ]*/)?.[0] ?? "";
      const body = l.slice(lead.length);
      const m = body.match(/^(#{1,6}) +(.*)$/);
      const level = m ? m[1].length : 0;
      const text = m ? m[2] : stripLineMarker(l).slice(lead.length);
      const nextLevel = Math.max(0, Math.min(6, level + delta));
      if (nextLevel === 0) return lead + text;
      return `${lead}${"#".repeat(nextLevel)} ${text}`;
    })
    .join("\n");
  view.dispatch({
    changes: { from: block.from, to: block.to, insert: next },
    userEvent: "input.heading",
  });
  return true;
}

export type ListKind = "bullet" | "ordered" | "task";

const LIST_PREFIX: Record<ListKind, (i: number) => string> = {
  bullet: () => "- ",
  ordered: (i) => `${i + 1}. `,
  task: () => "- [ ] ",
};

const LIST_MATCH: Record<ListKind, RegExp> = {
  bullet: /^[-*+] /,
  ordered: /^\d+[.)] /,
  task: /^- \[[ xX]\] /,
};

/** Toggle a list type on the selected lines. If every selected line is
 * already that kind of list, the markers are stripped; otherwise each
 * line gets the marker (replacing any other list / heading / quote
 * marker first). */
export function toggleList(kind: ListKind): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const block = selectedLines(view.state);
  const lines: string[] = [];
  for (let i = block.startLine; i <= block.endLine; i++) {
    lines.push(view.state.doc.line(i).text);
  }
  const matcher = LIST_MATCH[kind];
  const allMatch = lines.every((l) => {
    const lead = l.match(/^[\t ]*/)?.[0] ?? "";
    return matcher.test(l.slice(lead.length));
  });
  const next = lines
    .map((l, i) => {
      const lead = l.match(/^[\t ]*/)?.[0] ?? "";
      const body = l.slice(lead.length);
      if (allMatch) {
        return lead + body.replace(matcher, "");
      }
      const stripped = stripLineMarker(l);
      const strippedLead = stripped.match(/^[\t ]*/)?.[0] ?? "";
      return `${strippedLead}${LIST_PREFIX[kind](i)}${stripped.slice(strippedLead.length)}`;
    })
    .join("\n");
  view.dispatch({
    changes: { from: block.from, to: block.to, insert: next },
    userEvent: allMatch ? "delete.list" : "input.list",
  });
  return true;
}

/** Sort the selected lines case-insensitively. `direction` flips asc/desc.
 * No-op when fewer than two lines are selected. */
export function sortLines(direction: "asc" | "desc"): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const block = selectedLines(view.state);
  if (block.endLine - block.startLine < 1) return false;
  const lines: string[] = [];
  for (let i = block.startLine; i <= block.endLine; i++) {
    lines.push(view.state.doc.line(i).text);
  }
  const sorted = [...lines].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  if (direction === "desc") sorted.reverse();
  view.dispatch({
    changes: { from: block.from, to: block.to, insert: sorted.join("\n") },
    userEvent: "input.sort",
  });
  return true;
}

/** Add or remove a leading `> ` on each selected line. If every line in
 * the selection is already a blockquote, strip the prefix; otherwise add
 * it everywhere. */
export function toggleBlockquote(): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const block = selectedLines(view.state);
  const lines: string[] = [];
  for (let i = block.startLine; i <= block.endLine; i++) {
    lines.push(view.state.doc.line(i).text);
  }
  const allQuoted = lines.every((l) => l.startsWith("> ") || l === ">");
  const next = lines
    .map((l) => {
      if (allQuoted) {
        if (l.startsWith("> ")) return l.slice(2);
        if (l === ">") return "";
        return l;
      }
      return `> ${l}`;
    })
    .join("\n");
  view.dispatch({
    changes: { from: block.from, to: block.to, insert: next },
    userEvent: allQuoted ? "delete.blockquote" : "input.blockquote",
  });
  return true;
}
