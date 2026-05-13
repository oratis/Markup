/**
 * Static Markdown text node for the canvas. The actual text is rendered
 * as HTML via canvas-md-render; drag-to-move commits a single history
 * entry on pointer up (local state owns the in-flight position).
 *
 * Editing the markdown is deferred to B210 — for now, the node is
 * read-only. Double-click is reserved for that batch.
 */

import { useMemo, useRef, useState } from "react";
import { type DragStart, dragTo, exceededDragThreshold } from "../lib/canvas-drag";
import type { CanvasNode } from "../lib/canvas-format";
import { renderCanvasMarkdown } from "../lib/canvas-md-render";
import type { CanvasStore } from "../lib/canvas-store";

interface Props {
  node: CanvasNode;
  zoom: number;
  store: CanvasStore;
  selected?: boolean;
  onEdit?: (nodeId: string) => void;
}

export function CanvasNodeText({ node, zoom, store, selected, onEdit }: Props) {
  const dragRef = useRef<DragStart | null>(null);
  // While dragging, this overrides the doc's persisted x/y so the node
  // tracks the cursor without flooding history.
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  const html = useMemo(() => renderCanvasMarkdown(node.text ?? ""), [node.text]);

  const x = drag ? drag.x : node.x;
  const y = drag ? drag.y : node.y;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return; // left button only
    e.stopPropagation(); // don't trigger viewport pan
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
    } else {
      // Click without drag: select this node.
      store.toggleSelection(node.id, e.shiftKey);
    }
  }

  return (
    <div
      data-testid={`canvas-node-${node.id}`}
      data-node-id={node.id}
      className={`absolute select-none rounded-md border bg-white dark:bg-neutral-800 shadow-sm overflow-hidden ${
        selected
          ? "border-blue-500 ring-2 ring-blue-500/30"
          : "border-black/15 dark:border-white/15"
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
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit?.(node.id);
      }}
    >
      <div
        className="canvas-node-body px-3 py-2 h-full overflow-auto text-[13px] pointer-events-none"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is produced by marked + stripDangerousAttrs.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
