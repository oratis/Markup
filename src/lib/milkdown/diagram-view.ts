import type { Node as ProseNode } from "@milkdown/prose/model";
import { Plugin, PluginKey } from "@milkdown/prose/state";
import type { NodeView, ViewMutationRecord } from "@milkdown/prose/view";
import { $prose } from "@milkdown/utils";

/** Class on the bleed/scroll wrapper around every rendered diagram. */
export const DIAGRAM_WRAP_CLASS = "mk-diagram-wrap";

/** Mermaid's built-in theme that best matches each of our app themes. */
export function mermaidTheme(htmlClass: string): "default" | "dark" | "neutral" {
  if (htmlClass.includes("theme-dark")) return "dark";
  if (htmlClass.includes("theme-sepia")) return "neutral";
  return "default";
}

/** The resolved app theme, read from the class the app puts on <html>. */
function currentTheme(): "default" | "dark" | "neutral" {
  if (typeof document === "undefined") return "default";
  return mermaidTheme(document.documentElement.className);
}

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void;
  parse: (
    text: string,
    opts?: { suppressErrors?: boolean },
  ) => Promise<boolean | undefined | { diagramType: string }>;
  render: (id: string, text: string) => Promise<{ svg: string }>;
};

let mermaidPromise: Promise<MermaidApi> | null = null;
let initialisedFor: string | null = null;

/**
 * Load mermaid on first use and (re)configure it for `theme`.
 *
 * Dynamic import so documents without diagrams never pay for it — mermaid
 * splits itself into a small core plus one chunk per diagram type (see the
 * manualChunks note in vite.config.ts).
 *
 * `suppressErrorRendering` is what keeps a malformed diagram from injecting
 * mermaid's own error graphic into <body>; combined with the parse-first
 * check below, a bad diagram can never escape its own node. That matters
 * here for the same reason e2e/render-resilience.spec.ts exists: an uncaught
 * throw from a renderer once white-screened the whole app.
 */
async function getMermaid(theme: string): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => m.default as unknown as MermaidApi);
  }
  const mermaid = await mermaidPromise;
  if (initialisedFor !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      theme,
      fontFamily: "inherit",
    });
    initialisedFor = theme;
  }
  return mermaid;
}

/** Every mounted view, so a theme flip can re-render all of them at once. */
const liveViews = new Set<DiagramNodeView>();
let themeObserver: MutationObserver | null = null;

function watchTheme() {
  if (themeObserver || typeof document === "undefined") return;
  let last = currentTheme();
  themeObserver = new MutationObserver(() => {
    const now = currentTheme();
    if (now === last) return;
    last = now;
    // mermaid.initialize() is global, so the theme must be re-applied and
    // every mounted diagram re-rendered — an already-drawn SVG keeps the
    // palette it was drawn with.
    for (const view of liveViews) view.rerender();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

let seq = 0;

/**
 * NodeView for the `diagram` node: renders the mermaid source to SVG.
 *
 * @milkdown/plugin-diagram ships the schema and the markdown round-trip but
 * no view — its own toDOM emits a bare div with the source as text, which is
 * why diagrams used to show up as source in Read mode while the exported
 * HTML rendered them properly.
 *
 * The node is `atom: true, isolating: true` and its source lives in
 * `attrs.value`, not in content — so there is no contentDOM, and clicking
 * the toggle is the in-place way to read the source (⌘/ source mode is
 * still where you edit it).
 */
export class DiagramNodeView implements NodeView {
  dom: HTMLDivElement;
  private figure: HTMLDivElement;
  private toggle: HTMLButtonElement;
  private source: string;
  private id = `mk-mmd-${++seq}`;
  /** Bumped on every render request; a slower earlier render is discarded. */
  private generation = 0;
  private showingSource = false;

  constructor(node: ProseNode) {
    this.source = String(node.attrs.value ?? "");

    const wrap = document.createElement("div");
    wrap.className = DIAGRAM_WRAP_CLASS;
    // Own containing block for the toggle: `container-type` on `.milkdown`
    // means an absolutely-positioned descendant would otherwise resolve
    // against the whole editor pane (see docs/design/08-wide-tables.md §4.2).
    wrap.style.position = "relative";

    const figure = document.createElement("div");
    figure.className = "mk-diagram-figure";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mk-diagram-source-toggle";
    toggle.textContent = "源码";
    toggle.title = "Show Mermaid source";
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showingSource = !this.showingSource;
      toggle.textContent = this.showingSource ? "图" : "源码";
      toggle.title = this.showingSource ? "Show diagram" : "Show Mermaid source";
      this.paint();
    });

    wrap.append(figure, toggle);
    this.dom = wrap;
    this.figure = figure;
    this.toggle = toggle;

    watchTheme();
    liveViews.add(this);
    this.paint();
  }

  /** Re-run the render for the current source and theme. */
  rerender() {
    this.paint();
  }

  private renderSource() {
    const pre = document.createElement("pre");
    pre.className = "mk-diagram-source";
    pre.textContent = this.source;
    this.figure.replaceChildren(pre);
  }

  private renderError(message: string) {
    const box = document.createElement("div");
    box.className = "mk-diagram-error";
    const note = document.createElement("p");
    note.className = "mk-diagram-error-note";
    note.textContent = `Mermaid: ${message}`;
    const pre = document.createElement("pre");
    pre.className = "mk-diagram-source";
    pre.textContent = this.source;
    box.append(note, pre);
    this.figure.replaceChildren(box);
  }

  private async paint() {
    const gen = ++this.generation;
    const src = this.source.trim();

    if (this.showingSource) {
      this.renderSource();
      return;
    }
    if (!src) {
      this.figure.replaceChildren();
      return;
    }

    try {
      const theme = currentTheme();
      const mermaid = await getMermaid(theme);
      // Stale already? Don't even render.
      if (gen !== this.generation) return;

      const parsed = await mermaid.parse(src, { suppressErrors: true });
      if (gen !== this.generation) return;
      if (parsed === false) {
        this.renderError("could not parse this diagram");
        return;
      }

      const { svg } = await mermaid.render(`${this.id}-${gen}`, src);
      if (gen !== this.generation) return;

      // mermaid returns a complete <svg> string; it carries an inline
      // `max-width: <natural>px`, which is exactly the cap we want — the
      // diagram draws at its natural size and shrinks to fit a narrower
      // container, rather than being stretched to fill the bleed width.
      const holder = document.createElement("div");
      holder.innerHTML = svg;
      const el = holder.firstElementChild;
      if (el) this.figure.replaceChildren(el);
      else this.renderError("rendered nothing");
    } catch (err) {
      if (gen !== this.generation) return;
      this.renderError(err instanceof Error ? err.message : String(err));
    }
  }

  update(node: ProseNode): boolean {
    if (node.type.name !== "diagram") return false;
    const next = String(node.attrs.value ?? "");
    if (next !== this.source) {
      this.source = next;
      this.paint();
    }
    return true;
  }

  selectNode() {
    this.dom.classList.add("mk-diagram-selected");
  }

  deselectNode() {
    this.dom.classList.remove("mk-diagram-selected");
  }

  /** The toggle is ours; ProseMirror should not treat it as editor input. */
  stopEvent(event: Event): boolean {
    return event.target instanceof Node && this.toggle.contains(event.target);
  }

  /** Every mutation in here is our own async SVG swap, never a content edit —
   * Read and Edit share one DOM, so this happens under a live cursor. */
  ignoreMutation(_record: ViewMutationRecord): boolean {
    return true;
  }

  destroy() {
    // Invalidate any in-flight render so it cannot touch a detached DOM.
    this.generation++;
    liveViews.delete(this);
  }
}

const DIAGRAM_VIEW_KEY = new PluginKey("markup/diagram-view");

/**
 * Milkdown plugin: renders ```mermaid blocks as SVG inside the editor, in a
 * wrapper that reuses the bleed system so a wide diagram can use the pane
 * width instead of being capped at the prose column.
 */
export const diagramView = $prose(
  () =>
    new Plugin({
      key: DIAGRAM_VIEW_KEY,
      props: {
        nodeViews: {
          diagram: (node) => new DiagramNodeView(node),
        },
      },
    }),
);
