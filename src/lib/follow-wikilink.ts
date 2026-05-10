import { getActiveSourceView } from "./active-source-view";

/**
 * Source-mode wikilink lookup at the active cursor / a given position.
 * Returns the matched `name` (without brackets, alias-stripped) or
 * null when the cursor isn't inside a `[[…]]` token.
 *
 * When `posOverride` is supplied (e.g. from a click event), that
 * position is used instead of the view's main selection head.
 */
export function wikilinkAtCursor(posOverride?: number): string | null {
  const view = getActiveSourceView();
  if (!view) return null;
  const pos = posOverride ?? view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  const text = line.text;
  const offsetInLine = pos - line.from;
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index <= offsetInLine && offsetInLine <= m.index + m[0].length) {
      return m[1];
    }
  }
  return null;
}
