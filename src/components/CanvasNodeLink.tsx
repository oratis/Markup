/**
 * External-URL node. Shows the URL prominently and a hostname pill.
 * Double-click opens the URL in a new window (the OS will route to the
 * default browser per the webview's navigation policy).
 *
 * No live page preview / thumbnail in MVP — those need a network fetch
 * and image extraction, both out of scope for v2 batch 8.
 */

import { useRef, useState } from "react";
import { type DragStart, dragTo, exceededDragThreshold } from "../lib/canvas-drag";
import type { CanvasNode } from "../lib/canvas-format";
import { isExternalUrl } from "../lib/canvas-md-render";
import type { CanvasStore } from "../lib/canvas-store";

interface Props {
  node: CanvasNode;
  zoom: number;
  store: CanvasStore;
  selected?: boolean;
}

export function CanvasNodeLink({ node, zoom, store, selected }: Props) {
  const dragRef = useRef<DragStart | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const url = node.url ?? "";

  const x = drag ? drag.x : node.x;
  const y = drag ? drag.y : node.y;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      screenX: e.clientX,
      screenY: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragRef.current;
    if (!ds) return;
    if (!drag && !exceededDragThreshold(ds, e.clientX, e.clientY)) return;
    setDrag(dragTo(ds, e.clientX, e.clientY, zoom));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragRef.current;
    if (!ds) return;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    dragRef.current = null;
    if (drag) {
      store.moveNode(node.id, drag.x, drag.y);
      setDrag(null);
      return;
    }
    store.toggleSelection(node.id, e.shiftKey);
  }

  function onDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!isExternalUrl(url)) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const host = safeHost(url);

  return (
    <div
      data-testid={`canvas-node-${node.id}`}
      data-node-id={node.id}
      className={`absolute select-none rounded-md border bg-emerald-50/60 dark:bg-emerald-950/30 shadow-sm overflow-hidden flex flex-col ${
        selected
          ? "border-blue-500 ring-2 ring-blue-500/30"
          : "border-emerald-300/60 dark:border-emerald-700/50"
      }`}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: node.width,
        height: node.height,
        cursor: dragRef.current ? "grabbing" : "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="text-[10px] uppercase tracking-wider opacity-70 px-2 py-1 border-b border-emerald-200/60 dark:border-emerald-800/40 shrink-0 truncate pointer-events-none"
        data-testid={`canvas-node-${node.id}-host`}
      >
        🔗 {host}
      </div>
      <div
        className="flex-1 px-3 py-2 overflow-auto text-[13px] break-all pointer-events-none"
        data-testid={`canvas-node-${node.id}-url`}
      >
        {url || <span className="opacity-50">(no URL)</span>}
      </div>
    </div>
  );
}

/** Extract a host string from an http(s) URL. Falls back to the raw
 *  URL string when parsing fails (mailto, malformed, etc). */
function safeHost(url: string): string {
  if (!url) return "(no URL)";
  try {
    if (/^https?:/i.test(url)) {
      return new URL(url).host;
    }
  } catch {
    /* fall through */
  }
  return url;
}
