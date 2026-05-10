import { EditorView } from "@codemirror/view";

/**
 * CM6 input handler that fires `markup:wikilink-trigger` whenever the
 * user types `[` such that the resulting selection is preceded by `[[`.
 * App.tsx listens for this event and opens the wikilink picker in
 * "completion" mode (matching the WYSIWYG behaviour).
 *
 * We watch typed input rather than parsing the doc on every change —
 * cheaper, and we only need to fire on the second `[`.
 */
export function wikilinkTrigger() {
  return EditorView.inputHandler.of((view, _from, _to, text) => {
    if (text !== "[") return false;
    // Don't suppress the default insertion — let the `[` go in normally,
    // then check whether it now completes `[[`.
    queueMicrotask(() => {
      const head = view.state.selection.main.head;
      const before = view.state.sliceDoc(Math.max(0, head - 2), head);
      if (before === "[[") {
        window.dispatchEvent(new CustomEvent("markup:wikilink-trigger"));
      }
    });
    return false;
  });
}
