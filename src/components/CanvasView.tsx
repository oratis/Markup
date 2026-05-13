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
import {
  type Viewport,
  applyPan,
  applyWheelZoom,
  defaultViewport,
  resetZoom,
  toCssTransform,
  zoomAtPoint,
} from "../lib/canvas-viewport";
import { getActiveTab, useAppStore } from "../store";
import { CanvasNodeText } from "./CanvasNodeText";

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
  const panRef = useRef<{ startX: number; startY: number; v: Viewport } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Spacebar held → pan cursor + click-drag pans. Released → normal cursor.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !isEditableTarget(e.target)) {
        // Only swallow the space if we're actually going to pan, so users
        // can still type spaces inside text-node editors (B210).
        e.preventDefault();
        setSpaceHeld(true);
      } else if (e.code === "Digit0" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setViewport(resetZoom);
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
  }, []);

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
    // Pan triggers: space+left-click, OR middle-click anywhere.
    const isMiddle = e.button === 1;
    const isPanGesture = (spaceHeld && e.button === 0) || isMiddle;
    if (!isPanGesture) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    panRef.current = { startX: e.clientX, startY: e.clientY, v: viewport };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (!pan) return;
    setViewport(applyPan(pan.v, e.clientX - pan.startX, e.clientY - pan.startY));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!panRef.current) return;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    panRef.current = null;
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
        {snapshot.doc.nodes.map((node) => {
          if (node.type === "text") {
            return (
              <CanvasNodeText
                key={node.id}
                node={node}
                zoom={viewport.zoom}
                store={store}
                selected={snapshot.selection.has(node.id)}
              />
            );
          }
          // file / link / group land in B207–B208. Render an outlined
          // placeholder so they're still visible.
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
              {node.type} — {node.file ?? node.url ?? node.label ?? node.id}
            </div>
          );
        })}
      </div>

      {/* HUD: zoom % + node count. Pure decoration, won't intercept
          pointer events. */}
      <div className="pointer-events-none absolute bottom-2 left-2 text-[11px] opacity-60 font-mono select-none">
        {snapshot.doc.nodes.length} nodes · {snapshot.doc.edges.length} edges ·{" "}
        {Math.round(viewport.zoom * 100)}%
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
