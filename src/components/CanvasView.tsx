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
import { getOrCreateCanvasStore } from "../lib/canvas-registry";
import { type Rect, nodesInRect, rectFromPoints } from "../lib/canvas-select";
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
  const panRef = useRef<{ startX: number; startY: number; v: Viewport } | null>(null);
  const selectRef = useRef<{ startSX: number; startSY: number } | null>(null);
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
  // Mod+0 resets zoom.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return; // don't hijack overlay editor keys
      if (e.code === "Space") {
        e.preventDefault();
        setSpaceHeld(true);
      } else if (e.code === "Digit0" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setViewport(resetZoom);
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
    // Plain left-click on empty area starts a drag-rect selection. The
    // node components stop-propagation their own pointer-down so this
    // only fires when the user actually clicked the canvas background.
    if (e.button === 0) {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      selectRef.current = { startSX: e.clientX, startSY: e.clientY };
      setSelectRect({ x: 0, y: 0, width: 0, height: 0 });
      // Clear selection up-front; the drag-rect will fill it back in.
      if (!e.shiftKey) store.clearSelection();
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (pan) {
      setViewport(applyPan(pan.v, e.clientX - pan.startX, e.clientY - pan.startY));
      return;
    }
    const sel = selectRef.current;
    if (sel) {
      const rect = containerRef.current?.getBoundingClientRect();
      const offX = rect?.left ?? 0;
      const offY = rect?.top ?? 0;
      setSelectRect(
        rectFromPoints(
          sel.startSX - offX,
          sel.startSY - offY,
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
    if (selectRef.current && selectRect) {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      // Convert the screen-space rect to world space and compute the
      // overlapping node ids.
      const wTopLeft = screenToWorld(viewport, selectRect.x, selectRect.y);
      const wBotRight = screenToWorld(
        viewport,
        selectRect.x + selectRect.width,
        selectRect.y + selectRect.height,
      );
      const worldRect: Rect = {
        x: wTopLeft.x,
        y: wTopLeft.y,
        width: wBotRight.x - wTopLeft.x,
        height: wBotRight.y - wTopLeft.y,
      };
      // Tiny rect = click without drag → already cleared selection above.
      if (worldRect.width > 2 && worldRect.height > 2) {
        const ids = nodesInRect(store.getSnapshot().doc.nodes, worldRect);
        store.setSelection(ids);
      }
      selectRef.current = null;
      setSelectRect(null);
    }
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
