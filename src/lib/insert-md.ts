import { getActiveSourceView } from "./active-source-view";

/**
 * Insert markdown text at the user's current caret/selection in whichever
 * editor is active. Returns true on success, false if neither editor is
 * focused or the host can't accept input. The caller is responsible for
 * dispatching app-store updates — this only writes to the editor surface.
 *
 * - Source mode (CM6): dispatch a transaction at the main selection.
 * - WYSIWYG (Milkdown / contenteditable): use the DOM Selection API.
 */
export function insertMarkdown(md: string): boolean {
  const view = getActiveSourceView();
  if (view) {
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: md },
      selection: { anchor: from + md.length },
      userEvent: "input.type",
    });
    return true;
  }
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(md));
  sel.collapseToEnd();
  return true;
}

/** Build a minimal `rows × cols` GFM table skeleton (header + separator + body). */
export function buildTableMarkdown(rows: number, cols: number): string {
  const r = Math.max(1, Math.min(50, Math.floor(rows)));
  const c = Math.max(1, Math.min(20, Math.floor(cols)));
  const header = `| ${Array.from({ length: c }, (_, i) => `Col ${i + 1}`).join(" | ")} |`;
  const sep = `|${Array.from({ length: c }, () => "---").join("|")}|`;
  const blank = `| ${Array.from({ length: c }, () => " ").join(" | ")} |`;
  const body = Array.from({ length: r }, () => blank).join("\n");
  return `${header}\n${sep}\n${body}\n`;
}
