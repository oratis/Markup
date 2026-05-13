# V2 — Canvas (Obsidian-compatible whiteboard) — ✅ SHIPPED

**Single goal**: render + edit + persist `.canvas` JSON files in vault.
Compatible with Obsidian 1.4+ official `.canvas` schema. No new file format.

> Status: **All 18 batches green on `main`** (B201–B218). Markup now reads,
> edits, and writes Obsidian-format canvases. See STATUS.md → "v2 —
> Obsidian-compatible Canvas" for the per-batch landing log.

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

## Batch plan — final landing log

Numbering: v1 stops at B135; v2 starts at **B201** (100-batch reserve
for v1 hotfixes). Each batch landed: implement + tests → biome → tsc →
vitest → vite build → push → `gh run watch` green → next. All 18
batches followed the cadence without exception.

### Phase 1 — Data layer (B201–B204) ✅
- ✅ **B201** `canvas-format.ts` — pure parse/serialize/validate
  with unknown-field preservation; 32 tests
- ✅ **B202** `canvas-store.ts` + `canvas-registry.ts` — factory
  store + snapshot-based undo (100-cap); 45 tests
- ✅ **B203** Rust `read_file` accepts `.canvas` + dialog filter;
  6 new Rust tests including a tokio round-trip
- ✅ **B204** `Tab.kind` discriminant + `canvas-path.ts` + FileTree
  icon; 12 new tests

### Phase 2 — Rendering (B205–B210) ✅
- ✅ **B205** `CanvasView.tsx` skeleton + `canvas-viewport.ts`
  (pan/zoom math); viewport tests + view smoke tests
- ✅ **B206** `CanvasNodeText.tsx` + `canvas-md-render.ts` + drag
  helpers; promoted `marked` to a direct dep
- ✅ **B207** `CanvasNodeFile.tsx` + `canvas-file-resolve.ts` +
  click-to-open behaviour
- ✅ **B208** `CanvasNodeLink.tsx` + `CanvasNodeGroup.tsx` —
  emerald link card / amber group frame
- ✅ **B209** `CanvasEdgesLayer.tsx` + `canvas-edge-geom.ts` —
  Bezier paths + label rendering
- ✅ **B210** `CanvasTextOverlay.tsx` — single shared Milkdown
  editor mounted on double-click

### Phase 3 — Interactions (B211–B215) ✅
- ✅ **B211** Selection rect + Delete + Esc + `canvas-select.ts`
- ✅ **B212** Double-click creates a text node; Shift+drag draws
  one sized; `canvas-ids.ts` for short hex ids
- ✅ **B213** Anchor handles + drag-to-create edges + draft path
  ghost (`CanvasInteractionLayer` + `CanvasAnchorHandles`)
- ✅ **B214** Mod+Z / Mod+Shift+Z / Ctrl+Y → store.undo/redo
- ✅ **B215** `useCanvasAutosave` — debounced writeFile through the
  existing tab save lifecycle

### Phase 4 — Integration (B216–B218) ✅
- ✅ **B216** Palette command "New Canvas in Vault…"
- ✅ **B217** Scanner picks up `.canvas` for FileTree / QuickOpen;
  Tantivy still scoped to markdown so canvases don't pollute search
- ✅ **B218** STATUS.md + this doc flipped to shipped

## Resolved decisions

These were locked before B201 via the decision matrix; the
implementation matched the picks exactly.

1. **Tab.kind discriminant** — picked discriminant. Tab gained an
   optional `kind: "markdown" | "canvas"` field; absent → markdown.
2. **Render tech** — picked HTML+CSS nodes + SVG edges. Confirmed by
   B209's SVG layer + per-node-type div components.
3. **Text-node editing** — picked shared Milkdown overlay. One editor
   instance regardless of node count (B210 `CanvasTextOverlay`).
4. **Per-canvas store** — picked factory + registry. `canvas-registry`
   keys per tab id; App.tsx disposes on tab close.
5. **Undo/redo scope** — picked per-canvas stack. Mod+Z inside the
   text-overlay editor is forwarded to Milkdown's own history; outside,
   Mod+Z runs canvas-store undo.
6. **Phase 0 spike** — skipped per recommendation. GraphView already
   proved the SVG approach; no rework needed.
