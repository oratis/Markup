import type { Node as ProseNode } from "@milkdown/prose/model";
import { Plugin, PluginKey } from "@milkdown/prose/state";
import { Decoration, DecorationSet } from "@milkdown/prose/view";
import { $prose } from "@milkdown/utils";
import { RECOMPUTE_META, isComposing } from "./composition";

/**
 * GitHub-style alert / callout decoration for the WYSIWYG editor.
 *
 * A blockquote whose first line is `[!NOTE]` (or TIP / IMPORTANT / WARNING /
 * CAUTION) is styled inline as a callout: the `<blockquote>` gets the
 * `markdown-alert markdown-alert-<type>` classes and the `[!TYPE]` marker text
 * gets `markdown-alert-title`. This is purely decorative — the document keeps
 * the plain blockquote, so markdown round-trips unchanged and the desktop
 * export (comrak `alerts`) and the iOS reader render the same `.markdown-alert`
 * markup. Mirrors the decoration pattern used by tag/wikilink/embed.
 */

/** Recognised alert types (lowercased). Matches comrak + the reader. */
export const CALLOUT_TYPES = ["note", "tip", "important", "warning", "caution"] as const;

const TYPE_SET = new Set<string>(CALLOUT_TYPES);

/**
 * If `firstLine` begins with a recognised `[!TYPE]` marker, return the
 * lowercased type plus the marker's character span within the line (so the
 * title decoration can target just `[!TYPE]`). Otherwise `null`.
 */
export function calloutMarker(
  firstLine: string,
): { type: string; start: number; end: number } | null {
  const m = /^(\s*)\[!(\w+)\]/.exec(firstLine);
  if (!m) return null;
  const type = m[2].toLowerCase();
  if (!TYPE_SET.has(type)) return null;
  return { type, start: m[1].length, end: m[0].length };
}

function decorationsFor(doc: ProseNode): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== "blockquote") return true;
    const firstPara = node.firstChild;
    if (!firstPara || !firstPara.isTextblock) return true;
    const firstText = firstPara.firstChild;
    if (!firstText || !firstText.isText || !firstText.text) return true;

    const marker = calloutMarker(firstText.text);
    if (!marker) return true;

    // Node decoration on the blockquote element itself.
    decos.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: `markdown-alert markdown-alert-${marker.type}`,
      }),
    );
    // Inline decoration on the `[!TYPE]` marker. The blockquote's first text
    // content starts at pos + 2 (enter blockquote, then enter paragraph).
    const textStart = pos + 2;
    decos.push(
      Decoration.inline(textStart + marker.start, textStart + marker.end, {
        class: "markdown-alert-title",
      }),
    );
    return true;
  });
  return DecorationSet.create(doc, decos);
}

const CALLOUT_KEY = new PluginKey("markup/callout-decorate");

export const calloutDecorate = $prose(
  () =>
    new Plugin({
      key: CALLOUT_KEY,
      state: {
        init(_, { doc }) {
          return decorationsFor(doc);
        },
        apply(tr, old, _oldState, newState) {
          if (isComposing()) return old.map(tr.mapping, tr.doc);
          if (tr.getMeta(RECOMPUTE_META) || tr.docChanged) {
            return decorationsFor(newState.doc);
          }
          return old.map(tr.mapping, tr.doc);
        },
      },
      props: {
        decorations(state) {
          return CALLOUT_KEY.getState(state);
        },
      },
    }),
);
