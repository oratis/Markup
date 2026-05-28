import type { Node as ProseNode } from "@milkdown/prose/model";
import { Plugin, PluginKey } from "@milkdown/prose/state";
import type { NodeView } from "@milkdown/prose/view";
import { $prose } from "@milkdown/utils";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAppStore } from "../../store";

/**
 * Resolve a markdown image `src` to something the webview can load.
 *
 * - Absolute / remote / already-converted URLs pass through untouched.
 * - A relative path (e.g. `assets/x.jpeg`) is joined against the open
 *   vault root and run through Tauri's `convertFileSrc`, producing an
 *   `asset://localhost/<encoded-abs-path>` URL. The CSP already allows
 *   `asset:` for img-src, and under the App Sandbox the file is readable
 *   because it lives inside the user-granted vault scope.
 *
 * The markdown on disk keeps its clean relative path — this only affects
 * what the <img> element points at while rendered.
 */
export function resolveImageSrc(src: string | null | undefined): string {
  const s = (src ?? "").trim();
  if (!s) return s;
  if (/^(https?:|data:|blob:|asset:|tauri:|file:)/i.test(s)) return s;
  const root = useAppStore.getState().vaultRoot;
  if (!root) return s;
  const cleanRoot = root.replace(/\/+$/, "");
  const rel = s.replace(/^\.\//, "");
  const abs = rel.startsWith("/") ? rel : `${cleanRoot}/${rel}`;
  try {
    return convertFileSrc(abs);
  } catch {
    return s;
  }
}

class ImageNodeView implements NodeView {
  dom: HTMLImageElement;

  constructor(node: ProseNode) {
    const img = document.createElement("img");
    img.className = "milkdown-img";
    this.applyAttrs(img, node);
    this.dom = img;
  }

  private applyAttrs(img: HTMLImageElement, node: ProseNode) {
    img.src = resolveImageSrc(node.attrs.src);
    img.alt = node.attrs.alt ?? "";
    if (node.attrs.title) img.title = node.attrs.title;
    else img.removeAttribute("title");
  }

  update(node: ProseNode): boolean {
    if (node.type.name !== "image") return false;
    this.applyAttrs(this.dom, node);
    return true;
  }
}

const IMAGE_VIEW_KEY = new PluginKey("markup/image-view");

/**
 * Milkdown plugin: a nodeView for the `image` node that rewrites the
 * rendered <img src> from a vault-relative path to a loadable asset URL.
 * Makes pasted + pre-existing vault images actually display in WYSIWYG.
 */
export const imageView = $prose(
  () =>
    new Plugin({
      key: IMAGE_VIEW_KEY,
      props: {
        nodeViews: {
          image: (node) => new ImageNodeView(node),
        },
      },
    }),
);
