import { Plugin, PluginKey } from "@milkdown/prose/state";
import { $prose } from "@milkdown/utils";

/**
 * IME composition tracking.
 *
 * CJK input (Chinese/Japanese/Korean) goes through a composition session:
 * compositionstart → compositionupdate* → compositionend. ProseMirror
 * renders the in-progress composed text directly in the contenteditable.
 * If anything mutates the editor's **decorations** during that window,
 * ProseMirror tears down and rebuilds the composing range, which aborts
 * the IME — dropping characters, jumping the caret, and mangling line
 * breaks. This was the "中文换行错误" bug.
 *
 * The app runs a single editor at a time, so a module-level flag is fine.
 * Decoration plugins must consult `isComposing()` and skip recomputation
 * while it's true, then recompute once on the `RECOMPUTE_META` transaction
 * we dispatch at compositionend.
 */
let composing = false;

export function isComposing(): boolean {
  return composing;
}

/** Transaction meta key kept for the decoration plugins' API. We no
 * longer dispatch it (see below); decorations refresh on the next real
 * edit after a composition. */
export const RECOMPUTE_META = "markup/recompute-decos";

const COMPOSITION_KEY = new PluginKey("markup/composition");

export const compositionTracker = $prose(
  () =>
    new Plugin({
      key: COMPOSITION_KEY,
      props: {
        handleDOMEvents: {
          compositionstart: () => {
            composing = true;
            return false; // observe only — let ProseMirror handle it
          },
          compositionend: () => {
            // Observe only. Do NOT dispatch a transaction here:
            // mutating editor state during ProseMirror's own
            // compositionend handling makes it re-read the DOM and
            // double-count the composed text — inserting a spurious
            // newline on every CJK keystroke. Decorations recompute on
            // the next real edit (isComposing() is false by then).
            composing = false;
            return false;
          },
        },
      },
    }),
);
