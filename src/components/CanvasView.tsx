/**
 * Top-level whiteboard view. Mounted via App.tsx when the active tab's
 * `kind === "canvas"`. This batch (B205) wires:
 *
 *  - Per-tab CanvasStore lookup via the registry
 *  - Pan (space + drag, middle-mouse drag) and zoom (wheel) on the
 *    viewport, math lives in canvas-viewport.ts
 *  - A pan/zoom container with a single inner "world" div that holds
 *    node and edge layers (both empty for now — B206 adds CanvasNodeText
 *    rendering, B209 adds CanvasEdge)
 *  - A tiny status overlay showing node count / zoom %
 *
 * Drag-to-move, selection, edge creation, undo wiring, and autosave
 * are intentionally deferred to later batches so each can be reviewed
 * and tested independently.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { closestSide } from "../lib/canvas-edge-geom";
import type { CanvasSide } from "../lib/canvas-format";
import { newCanvasId } from "../lib/canvas-ids";
import { getOrCreateCanvasStore } from "../lib/canvas-registry";
import {
  type Rect,
  nodeAtPoint,
  nodesInRect,
  rectFromPoints,
} from "../lib/canvas-select";
import {
  type Viewport,
  applyPan,
  applyWheelZoom,
  defaultViewport,
  resetZoom,
  screenToWorld,
  toCssTransform,
  zoomAtPoint,
} from "../lib/canvas-viewport";
import { getActiveTab, useAppStore } from "../store";
import { CanvasEdgesLayer } from "./CanvasEdgesLayer";
import { CanvasInteractionLayer, type EdgeDraft } from "./CanvasInteractionLayer";
import { CanvasNodeFile } from "./CanvasNodeFile";
import { CanvasNodeGroup } from "./CanvasNodeGroup";
import { CanvasNodeLink } from "./CanvasNodeLink";
import { CanvasNodeText } from "./CanvasNodeText";
import { CanvasTextOverlay } from "./CanvasTextOverlay";

export function CanvasView() {
  const tab = useAppStore(getActiveTab);
  // The render branch in App.tsx already guards on tab?.kind === "canvas",
  // so the falsy/wrong-kind path here is purely defensive.
  if (!tab || tab.kind !== "canvas") {
    return null;
  }
  return <CanvasViewInner tabId={tab.id} initialJson={tab.content} />;
}

function CanvasViewInner({
  tabId,
  initialJson,
}: {
  tabId: string;
  initialJson: string;
}) {
  const store = useMemo(
    () => getOrCreateCanvasStore(tabId, initialJson),
    [tabId, initialJson],
  );
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  const [viewport, setViewport] = useState<Viewport>(defaultViewport);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selectRect, setSelectRect] = useState<Rect | null>(null);
  // Same shape as selectRect but rendered with a different style + a
  // different commit action (createNode rather than setSelection).
  const [newNodeRect, setNewNodeRect] = useState<Rect | null>(null);
  const [edgeDraft, setEdgeDraft] = useState<EdgeDraft | null>(null);
  const panRef = useRef<{ startX: number; startY: number; v: Viewport } | null>(null);
  const selectRef = useRef<{ startSX: number; startSY: number } | null>(null);
  const newNodeRef = useRef<{ startSX: number; startSY: number } | null>(null);
  const edgeDraftRef = useRef<EdgeDraft | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Resolve the editing node from the live doc — if the user undoes
  // their way past the node's creation, drop the overlay.
  const editingNode = editingNodeId
    ? (snapshot.doc.nodes.find((n) => n.id === editingNodeId && n.type === "text") ??
      null)
    : null;
  if (editingNodeId && !editingNode) {
    // Defer the state update — running it during render is a React anti-
    // pattern. queueMicrotask hands it to the next tick.
    queueMicrotask(() => setEditingNodeId(null));
  }

  // Spacebar held → pan cursor + click-drag pans. Released → normal cursor.
  // Delete / Backspace clears the current selection (canvas-wide).
  // Mod+Z / Mod+Shift+Z drive the per-canvas history stack.
  // Mod+0 resets zoom.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return; // don't hijack overlay editor keys
      const mod = e.metaKey || e.ctrlKey;
      if (e.code === "Space") {
        e.preventDefault();
        setSpaceHeld(true);
      } else if (mod && e.code === "Digit0") {
        e.preventDefault();
        setViewport(resetZoom);
      } else if (mod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
      } else if (mod && (e.key === "y" || e.key === "Y")) {
        // Ctrl+Y is the Windows-style redo shortcut; macOS users get
        // Cmd+Shift+Z. Both are wired so muscle-memory works on either OS.
        e.preventDefault();
        store.redo();
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        store.getSnapshot().selection.size > 0
      ) {
        e.preventDefault();
        store.removeMany(Array.from(store.getSnapshot().selection));
      } else if (e.key === "Escape") {
        store.clearSelection();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [store]);

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    // Only intercept zoom when modifier or pinch — Obsidian uses
    // ctrl/cmd-scroll for zoom and bare-wheel for pan. macOS trackpads
    // synthesise ctrlKey on pinch.
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      const fx = rect ? e.clientX - rect.left : e.clientX;
      const fy = rect ? e.clientY - rect.top : e.clientY;
      setViewport((v) => applyWheelZoom(v, e.deltaY, fx, fy));
    } else {
      e.preventDefault();
      setViewport((v) => applyPan(v, -e.deltaX, -e.deltaY));
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const isMiddle = e.button === 1;
    const isPanGesture = (spaceHeld && e.button === 0) || isMiddle;
    if (isPanGesture) {
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      panRef.current = { startX: e.clientX, startY: e.clientY, v: viewport };
      return;
    }
    if (e.button !== 0) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (e.shiftKey) {
      // Shift+drag draws out a new text node. Tracked separately from
      // the selection marquee so the visuals + commit action differ.
      newNodeRef.current = { startSX: e.clientX, startSY: e.clientY };
      setNewNodeRect({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }
    // Plain left-click on empty area starts a drag-rect selection.
    selectRef.current = { startSX: e.clientX, startSY: e.clientY };
    setSelectRect({ x: 0, y: 0, width: 0, height: 0 });
    store.clearSelection();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (pan) {
      setViewport(applyPan(pan.v, e.clientX - pan.startX, e.clientY - pan.startY));
      return;
    }
    const containerRect = containerRef.current?.getBoundingClientRect();
    const offX = containerRect?.left ?? 0;
    const offY = containerRect?.top ?? 0;
    if (edgeDraftRef.current) {
      const w = screenToWorld(viewport, e.clientX - offX, e.clientY - offY);
      const next: EdgeDraft = {
        ...edgeDraftRef.current,
        pointerX: w.x,
        pointerY: w.y,
      };
      edgeDraftRef.current = next;
      setEdgeDraft(next);
      return;
    }
    const sel = selectRef.current;
    if (sel) {
      setSelectRect(
        rectFromPoints(
          sel.startSX - offX,
          sel.startSY - offY,
          e.clientX - offX,
          e.clientY - offY,
        ),
      );
      return;
    }
    const nn = newNodeRef.current;
    if (nn) {
      setNewNodeRect(
        rectFromPoints(
          nn.startSX - offX,
          nn.startSY - offY,
          e.clientX - offX,
          e.clientY - offY,
        ),
      );
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (panRef.current) {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      panRef.current = null;
      return;
    }
    if (edgeDraftRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      const offX = rect?.left ?? 0;
      const offY = rect?.top ?? 0;
      const w = screenToWorld(viewport, e.clientX - offX, e.clientY - offY);
      const target = nodeAtPoint(store.getSnapshot().doc.nodes, w.x, w.y);
      if (target && target.id !== edgeDraftRef.current.fromNodeId) {
        const from = store
          .getSnapshot()
          .doc.nodes.find((n) => n.id === edgeDraftRef.current?.fromNodeId);
        const toSide = from ? closestSide(asBox(target), asBox(from)) : "left";
        store.addEdge({
          id: newCanvasId(),
          fromNode: edgeDraftRef.current.fromNodeId,
          toNode: target.id,
          fromSide: edgeDraftRef.current.fromSide,
          toSide,
        });
      }
      edgeDraftRef.current = null;
      setEdgeDraft(null);
      return;
    }
    if (selectRef.current && selectRect) {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      const worldRect = toWorldRect(viewport, selectRect);
      if (worldRect.width > 2 && worldRect.height > 2) {
        const ids = nodesInRect(store.getSnapshot().doc.nodes, worldRect);
        store.setSelection(ids);
      }
      selectRef.current = null;
      setSelectRect(null);
      return;
    }
    if (newNodeRef.current && newNodeRect) {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      const worldRect = toWorldRect(viewport, newNodeRect);
      // Tiny drag → fall back to a default-sized node at the start point
      // so a stray click-and-release still produces something usable.
      const w = Math.max(160, worldRect.width);
      const h = Math.max(80, worldRect.height);
      const id = newCanvasId();
      store.addNode({
        id,
        type: "text",
        x: worldRect.x,
        y: worldRect.y,
        width: w,
        height: h,
        text: "",
      });
      store.setSelection([id]);
      setEditingNodeId(id);
      newNodeRef.current = null;
      setNewNodeRect(null);
    }
  }

  function onAnchorPointerDown(
    e: React.PointerEvent<SVGElement>,
    nodeId: string,
    side: CanvasSide,
  ) {
    const rect = containerRef.current?.getBoundingClientRect();
    const offX = rect?.left ?? 0;
    const offY = rect?.top ?? 0;
    const w = screenToWorld(viewport, e.clientX - offX, e.clientY - offY);
    const draft: EdgeDraft = {
      fromNodeId: nodeId,
      fromSide: side,
      pointerX: w.x,
      pointerY: w.y,
    };
    edgeDraftRef.current = draft;
    setEdgeDraft(draft);
  }

  function onBackgroundDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    // Don't fire when the dblclick bubbles from a node; nodes
    // stop-propagation their own dblclick handlers.
    const rect = containerRef.current?.getBoundingClientRect();
    const offX = rect?.left ?? 0;
    const offY = rect?.top ?? 0;
    const world = screenToWorld(viewport, e.clientX - offX, e.clientY - offY);
    const id = newCanvasId();
    const width = 200;
    const height = 100;
    store.addNode({
      id,
      type: "text",
      x: world.x - width / 2,
      y: world.y - height / 2,
      width,
      height,
      text: "",
    });
    store.setSelection([id]);
    setEditingNodeId(id);
  }

  const cursor = panRef.current ? "grabbing" : spaceHeld ? "grab" : "default";

  return (
    <div
      ref={containerRef}
      data-testid="canvas-view"
      className="relative w-full h-full overflow-hidden bg-[color:var(--canvas-bg,#fafafa)] dark:bg-neutral-900"
      style={{ cursor }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onBackgroundDoubleClick}
    >
      {/* world layer — children sit in canvas coords; outer transform
          handles pan/zoom together. */}
      <div
        data-testid="canvas-world"
        className="absolute inset-0 origin-top-left will-change-transform"
        style={{ transform: toCssTransform(viewport) }}
      >
        {/* Edges between nodes. SVG overlay; pointer-events on the SVG
            itself are off — only the path strokes catch clicks (B211). */}
        <CanvasEdgesLayer doc={snapshot.doc} selection={snapshot.selection} />
        {/* Anchor handles on selected nodes + edge-draft ghost. */}
        <CanvasInteractionLayer
          doc={snapshot.doc}
          selection={snapshot.selection}
          zoom={viewport.zoom}
          edgeDraft={edgeDraft}
          onAnchorPointerDown={onAnchorPointerDown}
        />
        {/* Groups render first so they sit BEHIND every other node in
            DOM order — pointer-events on the frame interior fall through
            to the viewport, so nodes visually inside a group remain
            clickable. */}
        {snapshot.doc.nodes
          .filter((n) => n.type === "group")
          .map((node) => (
            <CanvasNodeGroup
              key={node.id}
              node={node}
              zoom={viewport.zoom}
              store={store}
              selected={snapshot.selection.has(node.id)}
            />
          ))}
        {snapshot.doc.nodes
          .filter((n) => n.type !== "group")
          .map((node) => {
            if (node.type === "text") {
              // Hide the underlying read-only node while it's being
              // edited — the overlay sits in the same spot.
              if (editingNodeId === node.id) return null;
              return (
                <CanvasNodeText
                  key={node.id}
                  node={node}
                  zoom={viewport.zoom}
                  store={store}
                  selected={snapshot.selection.has(node.id)}
                  onEdit={setEditingNodeId}
                />
              );
            }
            if (node.type === "file") {
              return (
                <CanvasNodeFile
                  key={node.id}
                  node={node}
                  zoom={viewport.zoom}
                  store={store}
                  selected={snapshot.selection.has(node.id)}
                />
              );
            }
            if (node.type === "link") {
              return (
                <CanvasNodeLink
                  key={node.id}
                  node={node}
                  zoom={viewport.zoom}
                  store={store}
                  selected={snapshot.selection.has(node.id)}
                />
              );
            }
            // Unknown future node type (forwards-compat): render a
            // labelled placeholder so the data isn't invisible.
            return (
              <div
                key={node.id}
                data-testid={`canvas-node-${node.id}`}
                data-node-id={node.id}
                className="absolute rounded-md border-2 border-dashed border-black/20 dark:border-white/20 bg-white/50 dark:bg-neutral-800/50 text-[11px] opacity-70 px-2 py-1"
                style={{
                  transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                  width: node.width,
                  height: node.height,
                }}
              >
                {node.type} — {node.id}
              </div>
            );
          })}
        {editingNode ? (
          <CanvasTextOverlay
            key={`overlay-${editingNode.id}`}
            node={editingNode}
            store={store}
            onClose={() => setEditingNodeId(null)}
          />
        ) : null}
      </div>

      {/* Drag-rect selection overlay — drawn in screen space so the
          marquee stays cursor-aligned regardless of zoom. */}
      {selectRect && selectRect.width > 0 && selectRect.height > 0 ? (
        <div
          data-testid="canvas-select-rect"
          className="pointer-events-none absolute border border-blue-500/70 bg-blue-500/10"
          style={{
            left: selectRect.x,
            top: selectRect.y,
            width: selectRect.width,
            height: selectRect.height,
          }}
        />
      ) : null}
      {/* New-node ghost rect — same screen space, distinct dashed style. */}
      {newNodeRect && newNodeRect.width > 0 && newNodeRect.height > 0 ? (
        <div
          data-testid="canvas-new-node-rect"
          className="pointer-events-none absolute border-2 border-dashed border-emerald-500/80 bg-emerald-500/10"
          style={{
            left: newNodeRect.x,
            top: newNodeRect.y,
            width: newNodeRect.width,
            height: newNodeRect.height,
          }}
        />
      ) : null}
      {/* HUD: zoom % + node count. Pure decoration, won't intercept
          pointer events. */}
      <div className="pointer-events-none absolute bottom-2 left-2 text-[11px] opacity-60 font-mono select-none">
        {snapshot.doc.nodes.length} nodes · {snapshot.doc.edges.length} edges ·{" "}
        {Math.round(viewport.zoom * 100)}%
        {snapshot.selection.size > 0 ? ` · ${snapshot.selection.size} selected` : ""}
      </div>
      <ZoomControls
        viewport={viewport}
        onZoomIn={() =>
          setViewport((v) =>
            zoomAtPoint(v, v.zoom * 1.2, centerX(containerRef), centerY(containerRef)),
          )
        }
        onZoomOut={() =>
          setViewport((v) =>
            zoomAtPoint(v, v.zoom / 1.2, centerX(containerRef), centerY(containerRef)),
          )
        }
        onReset={() => setViewport(resetZoom)}
      />
    </div>
  );
}

function ZoomControls({
  viewport,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  viewport: Viewport;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[11px] font-mono">
      <button
        type="button"
        onClick={onZoomOut}
        className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20"
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        type="button"
        onClick={onReset}
        className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 min-w-[3.5em] text-center"
        aria-label="Reset zoom"
      >
        {Math.round(viewport.zoom * 100)}%
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20"
        aria-label="Zoom in"
      >
        +
      </button>
    </div>
  );
}

function asBox(n: { x: number; y: number; width: number; height: number }) {
  return { x: n.x, y: n.y, width: n.width, height: n.height };
}

function toWorldRect(v: Viewport, screen: Rect): Rect {
  const tl = screenToWorld(v, screen.x, screen.y);
  const br = screenToWorld(v, screen.x + screen.width, screen.y + screen.height);
  return { x: tl.x, y: tl.y, width: br.x - tl.x, height: br.y - tl.y };
}

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  return t.isContentEditable;
}

function centerX(ref: React.RefObject<HTMLDivElement | null>): number {
  const rect = ref.current?.getBoundingClientRect();
  return rect ? rect.width / 2 : 0;
}

function centerY(ref: React.RefObject<HTMLDivElement | null>): number {
  const rect = ref.current?.getBoundingClientRect();
  return rect ? rect.height / 2 : 0;
}
