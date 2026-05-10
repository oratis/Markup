import type { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/**
 * Tiny auto-close-pairs extension for CodeMirror 6. Inserts the matching
 * closer when typing `(`, `[`, `{`, `"`, `` ` ``, and wraps non-empty
 * selections instead. Gated so we only fire when the next character is
 * whitespace, EOL, or another closer — typing `(` mid-word does NOT
 * auto-close, which would otherwise be obnoxious.
 *
 * We deliberately do NOT pull in `@codemirror/autocomplete`'s heavyweight
 * `closeBrackets` extension — that'd add ~30 KB gzipped and a feature
 * surface we don't need (snippet popups, etc.).
 */

const PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "`": "`",
};

function nextChar(state: EditorState, at: number): string {
  return at < state.doc.length ? state.sliceDoc(at, at + 1) : "";
}

export function autoClosePairs() {
  return EditorView.inputHandler.of((view, from, to, text) => {
    const close = PAIRS[text];
    if (!close) return false;
    if (from !== to) {
      // Wrap the selection: [ + selection + ]
      const sel = view.state.sliceDoc(from, to);
      view.dispatch({
        changes: { from, to, insert: text + sel + close },
        selection: { anchor: from + 1, head: from + 1 + sel.length },
        userEvent: "input.type",
      });
      return true;
    }
    // Empty selection — only auto-close if the next char isn't a "word"
    // character (so `(foo)` typed in the middle of `bar` doesn't insert
    // an unwanted closer).
    const after = nextChar(view.state, from);
    if (after && /[A-Za-z0-9_]/.test(after)) return false;
    view.dispatch({
      changes: { from, insert: text + close },
      selection: { anchor: from + 1 },
      userEvent: "input.type",
    });
    return true;
  });
}
