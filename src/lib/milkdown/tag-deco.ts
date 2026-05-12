import type { Node as ProseNode } from "@milkdown/prose/model";
import { Plugin, PluginKey } from "@milkdown/prose/state";
import { Decoration, DecorationSet } from "@milkdown/prose/view";
import { $prose } from "@milkdown/utils";

/**
 * Inline tag chip decoration for WYSIWYG. Same shape as wikilink-deco
 * but matches `#tag` (and nested `#tag/sub`) in text nodes — skips
 * code spans (Milkdown stores code as a separate node), heading
 * markers (matching `#` followed by a space at start of a heading
 * text node would be a false positive, but heading lines never carry
 * the leading `#` in ProseMirror — the heading is a node, the body
 * text doesn't include the marker).
 *
 * Click handling stays at the App.tsx layer via the existing
 * tag/search wiring (markup:open-search). The decoration adds the
 * `tag` class so styling + cursor are applied.
 */

const TAG_RE = /(?:^|[^\p{L}\p{N}_])(#[\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu;

function decorationsFor(doc: ProseNode): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (!node.isText || !node.text) return true;
    // Skip text inside code marks.
    if (node.marks.some((m) => m.type.name === "code")) return false;
    // Skip text inside code_block.
    if (parent && parent.type.name === "code_block") return false;

    const text = node.text;
    const re = new RegExp(TAG_RE.source, "gu");
    let m: RegExpExecArray | null = re.exec(text);
    while (m !== null) {
      // m[1] contains "#tag"; its position within text is m.index + (length-of-leading-char) or m.index if `^` matched.
      const leadOffset = m[0].length - m[1].length;
      const start = pos + m.index + leadOffset;
      const end = start + m[1].length;
      const tagName = m[1].slice(1);
      // Skip pure-numeric "tags".
      if (!/^\d+$/.test(tagName)) {
        decos.push(
          Decoration.inline(start, end, {
            class: "tag",
            "data-tag-name": tagName,
          }),
        );
      }
      m = re.exec(text);
    }
    return true;
  });
  return DecorationSet.create(doc, decos);
}

const TAG_KEY = new PluginKey("markup/tag-decorate");

export const tagDecorate = $prose(
  () =>
    new Plugin({
      key: TAG_KEY,
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
          return TAG_KEY.getState(state);
        },
      },
    }),
);
