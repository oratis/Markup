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

/** Transaction meta key: "recompute your decorations now" — fired once
 * after a composition ends so plugins refresh against the final text. */
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
          compositionend: (view) => {
            composing = false;
            // Composition committed; nudge decoration plugins to refresh
            // against the now-final document. docChanged is false here, so
            // they key off RECOMPUTE_META instead.
            view.dispatch(view.state.tr.setMeta(RECOMPUTE_META, true));
            return false;
          },
        },
      },
    }),
);
