# V2 — Canvas (Obsidian-compatible whiteboard)

**Single goal**: render + edit + persist `.canvas` JSON files in vault.
Compatible with Obsidian 1.4+ official `.canvas` schema. No new file format.

## File format (Obsidian-compatible)

```jsonc
{
  "nodes": [
    { "id": "abc", "type": "text",
      "x": 0, "y": 0, "width": 240, "height": 120,
      "text": "# Hello\n\nBody",
      "color": "1" /* optional */ },
    { "id": "def", "type": "file",
      "x": 300, "y": 0, "width": 320, "height": 200,
      "file": "Notes/Foo.md",
      "subpath": "#Section" /* optional */ },
    { "id": "hij", "type": "link",
      "x": 0, "y": 300, "width": 320, "height": 200,
      "url": "https://example.com" },
    { "id": "ghi", "type": "group",
      "x": -20, "y": -20, "width": 700, "height": 300,
      "label": "Section A" }
  ],
  "edges": [
    { "id": "e1",
      "fromNode": "abc", "fromSide": "right",
      "toNode": "def",   "toSide": "left",
      "label": "links to", "color": "1" }
  ]
}
```

**Round-trip rule**: unknown fields preserved on parse/serialize. Never
silently drop data Obsidian wrote (forwards-compat).

## Layered architecture

```
┌─ CanvasView.tsx ──── pan/zoom container, mouse/keyboard root
│   ├─ CanvasNodeText / NodeFile / NodeLink / NodeGroup
│   ├─ CanvasEdge (SVG overlay)
│   └─ CanvasOverlay (selection box, snap guides, anchor handles)
├─ canvas-store.ts ─── per-tab Zustand store, undo/redo command stack
└─ canvas-format.ts ── pure parseCanvas / serializeCanvas / validateCanvas
```

Pure layer (`canvas-format.ts`) testable without DOM, mirrors how
`link-index.ts` is split from `link-index-store.ts`.

## Tab routing

Add `kind: "markdown" | "canvas"` discriminant to `Tab`. Default
`"markdown"` (back-compat). `openLoadedFile` inspects extension; `.canvas`
→ `kind: "canvas"`. App.tsx picks `<CanvasView>` vs `<MarkupEditor>`
based on `tab.kind`. Tab.content stays a string (raw JSON for canvas).
Reuse status / autosave / dirty / mtime infrastructure unchanged.

## Rendering tech

- **Nodes**: HTML `<div>` with `transform: translate3d(x, y, 0)` inside
  a pan/zoom wrapper that applies `transform: scale(z) translate(...)`.
  Reason: Markdown rendering inside text nodes wants HTML/CSS; SVG
  `<foreignObject>` is buggy in Safari + harder to test in jsdom.
- **Edges**: single SVG layer absolutely positioned over the node layer,
  rendering Bezier paths. Hit-testing via SVG `pointer-events` per path.
- **No canvas2d / no react-flow / no D3** — same "library-light" stance
  as GraphView (which is pure-SVG force-directed).

## Text-node editing strategy

Render text nodes as **static HTML** via existing Milkdown serializer
output. On double-click, mount a **single shared Milkdown instance** as
an overlay aligned to the node's box; commit on blur / Esc. One editor
at a time, regardless of node count — keeps memory linear.

## Per-canvas store shape

```ts
// canvas-store.ts — factory, one store per open canvas tab
createCanvasStore(initialJson: string) → ZustandStore<{
  doc: CanvasDoc,                  // parsed nodes + edges + unknown
  selection: Set<NodeId|EdgeId>,
  history: { past: Op[], future: Op[] },
  // actions:
  addNode, removeNode, updateNode, moveNode, resizeNode,
  addEdge, removeEdge, updateEdge,
  setSelection, undo, redo,
  toJson(): string,                // for autosave
}>
```

Stores keyed in a `Map<tabId, store>` registry (`canvas-registry.ts`).
Tab close → store disposed. **Not** a singleton like link-index because
canvases are per-document, not vault-global.

## Persistence

Reuse existing `read_file` / `write_file` Tauri commands — verified
they accept any extension. Save path: same autosave debounce (settings
`autosaveMs`) → `serializeCanvas(store.doc)` → `write_file`.

## Batch plan (continuing the established cadence)

Numbering: v1 stops at B135; v2 starts at **B201** (100-batch reserve
for v1 hotfixes). Each batch: implement + tests → biome → tsc → vitest
→ vite build → push → `gh run watch` green → next.

### Phase 1 — Data layer (B201–B204)
- **B201** `canvas-format.ts` — pure parse/serialize/validate +
  unit tests (round-trip, unknown-field preservation, malformed JSON).
- **B202** `canvas-store.ts` + `canvas-registry.ts` — factory store,
  undo/redo via inverse-op stack, tests for every action.
- **B203** Tab.kind discriminant + `openLoadedFile` extension routing
  + canvas-tab tests in store.test.ts.
- **B204** Read/write smoke test: verify Tauri commands handle
  `.canvas` extension; add integration test on JSON round-trip.

### Phase 2 — Rendering (B205–B210)
- **B205** `CanvasView.tsx` skeleton — pan (space+drag, middle-click),
  zoom (wheel + pinch), viewport state. Empty doc renders.
- **B206** `CanvasNodeText.tsx` — static Markdown-rendered HTML node,
  drag-to-move (mouse events, store action), tests on geometry.
- **B207** `CanvasNodeFile.tsx` — embeds vault file (readFile + slice),
  click-to-open-as-tab.
- **B208** `CanvasNodeLink.tsx` + `CanvasNodeGroup.tsx` — external link
  preview placeholder + group frame with label.
- **B209** `CanvasEdge.tsx` — Bezier path per edge, anchor by
  fromSide/toSide, optional label centered on path midpoint.
- **B210** Inline Milkdown overlay editor for text nodes (double-click
  to edit, blur to commit).

### Phase 3 — Interactions (B211–B215)
- **B211** Selection: click, shift-click, drag-rectangle, Delete to remove.
- **B212** Node creation: double-click empty canvas (text node),
  Shift+Drag to draw a new node.
- **B213** Edge creation: 4 anchor handles on hover, drag from one
  anchor to another node's anchor.
- **B214** Undo/redo: Mod+Z / Mod+Shift+Z command-stack wiring.
- **B215** Autosave wiring: store change → debounced serializeCanvas →
  writeFile + setActiveStatus.

### Phase 4 — Integration (B216–B218)
- **B216** Command palette: "New Canvas", "Open Canvas" commands.
- **B217** FileTree icon differentiation + QuickOpen recognition.
- **B218** STATUS.md refresh + V2_CANVAS.md updated to "shipped" log.

## Open decisions for confirmation

These choices touch the rest of v2, so locking them now avoids rework.

1. **Tab.kind discriminant** — add to existing Tab vs separate
   CanvasTab array. (Recommend: discriminant.)
2. **Render tech** — HTML+CSS nodes + SVG edges vs SVG-only vs canvas2d.
   (Recommend: HTML+CSS nodes + SVG edges.)
3. **Text-node editing** — single shared Milkdown overlay vs N
   inline Milkdown instances vs textarea+preview. (Recommend: shared
   overlay.)
4. **Per-canvas store** — factory + registry vs singleton-with-Map vs
   one-store-per-component-instance via React Context. (Recommend:
   factory + registry, disposed on tab close.)
5. **Undo/redo scope** — per-canvas command stack vs share with global
   editor undo. (Recommend: per-canvas stack, isolated from MD editor.)
6. **Phase 1 starts now or do you want Phase 0 spike first** — e.g. a
   throwaway prototype of pan/zoom before committing to the structure.
   (Recommend: skip spike; the architecture mirrors GraphView which
   already proved the SVG approach.)
