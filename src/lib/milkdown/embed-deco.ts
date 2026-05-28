import type { Node as ProseNode } from "@milkdown/prose/model";
import { Plugin, PluginKey } from "@milkdown/prose/state";
import { Decoration, DecorationSet } from "@milkdown/prose/view";
import { $prose } from "@milkdown/utils";
import { RECOMPUTE_META, isComposing } from "./composition";

/**
 * Inline decoration for `![[file]]` / `![[file#heading]]` / `![[file^block]]`
 * embeds. Distinct visual treatment from the plain wikilink — embeds
 * are transcluded references, not navigational links, so they get
 * their own class with a dashed-border block-like look.
 *
 * Click handling dispatches `markup:open-embed-target` with the target
 * name so App.tsx can resolve via the vault and open the source.
 */

const EMBED_RE = /(!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\])/g;

function decorationsFor(doc: ProseNode): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (!node.isText || !node.text) return true;
    if (node.marks.some((m) => m.type.name === "code")) return false;
    if (parent && parent.type.name === "code_block") return false;
    const re = new RegExp(EMBED_RE.source, "g");
    let m: RegExpExecArray | null = re.exec(node.text);
    while (m !== null) {
      const start = pos + m.index;
      const end = start + m[1].length;
      decos.push(
        Decoration.inline(start, end, {
          class: "embed",
          "data-embed-target": m[2].trim(),
        }),
      );
      m = re.exec(node.text);
    }
    return true;
  });
  return DecorationSet.create(doc, decos);
}

const EMBED_KEY = new PluginKey("markup/embed-decorate");

export const embedDecorate = $prose(
  () =>
    new Plugin({
      key: EMBED_KEY,
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
          return EMBED_KEY.getState(state);
        },
      },
    }),
);
