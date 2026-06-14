import { getActiveSourceView } from "./active-source-view";

/**
 * Scroll to a heading by its text / level / 0-based source line, in whichever
 * editor is live: CM6 in source mode (move + scroll the caret to the line), or
 * the Milkdown reader in WYSIWYG (match the rendered `H{level}` by text and
 * scroll it into view). Shared by the Outline panel and in-page `#anchor`
 * link navigation.
 */
export function scrollToHeading(text: string, level: number, line: number): void {
  // Source-mode path
  const view = getActiveSourceView();
  if (view) {
    const lineIdx = Math.max(1, line + 1); // CM6 lines are 1-based
    const doc = view.state.doc;
    if (lineIdx <= doc.lines) {
      const lineObj = doc.line(lineIdx);
      view.dispatch({
        selection: { anchor: lineObj.from, head: lineObj.from },
        effects: view.scrollSnapshot(),
      });
      view.dispatch({
        effects: [],
        scrollIntoView: true,
        selection: { anchor: lineObj.from, head: lineObj.from },
      } as Parameters<typeof view.dispatch>[0]);
      view.focus();
      return;
    }
  }
  // WYSIWYG / fallback path
  const tag = `H${level}`;
  const candidates = document.querySelectorAll(`.milkdown ${tag}`);
  for (const node of Array.from(candidates)) {
    if ((node.textContent ?? "").trim() === text) {
      (node as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }
}
