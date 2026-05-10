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
