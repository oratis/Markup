import type { Node as ProseNode } from "@milkdown/prose/model";
import { Plugin, PluginKey } from "@milkdown/prose/state";
import { Decoration, DecorationSet } from "@milkdown/prose/view";
import { $prose } from "@milkdown/utils";

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;

function decorationsFor(doc: ProseNode): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    WIKILINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null = WIKILINK_RE.exec(node.text);
    while (m !== null) {
      decos.push(
        Decoration.inline(pos + m.index, pos + m.index + m[0].length, {
          class: "wikilink",
          "data-wikilink-name": m[1].trim(),
        }),
      );
      m = WIKILINK_RE.exec(node.text);
    }
    return true;
  });
  return DecorationSet.create(doc, decos);
}

const WIKILINK_KEY = new PluginKey("markup/wikilink-decorate");

/**
 * Milkdown plugin that adds an inline decoration with class "wikilink"
 * around every `[[name]]` (or `[[name|label]]`) span in the document.
 * Pure styling — clicks are still handled by the editor-host listener
 * in App.tsx (wikilinkAtClick).
 */
export const wikilinkDecorate = $prose(
  () =>
    new Plugin({
      key: WIKILINK_KEY,
      state: {
        init(_, { doc }) {
          return decorationsFor(doc);
        },
        apply(tr, old, _oldState, newState) {
          if (tr.docChanged) return decorationsFor(newState.doc);
          return old.map(tr.mapping, tr.doc);
        },
      },
      props: {
        decorations(state) {
          return WIKILINK_KEY.getState(state);
        },
      },
    }),
);
