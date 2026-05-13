/**
 * Group frame. Renders behind all other nodes in z-order — that's
 * enforced at the CanvasView level (groups iterated first when mapping
 * doc.nodes). The frame has a label band at the top.
 *
 * Group geometry is independent of child membership in this MVP — the
 * user just positions a group and any node visually inside it appears
 * inside. Obsidian's spec doesn't store group membership either; the
 * containment is purely geometric.
 */

import { useRef, useState } from "react";
import { type DragStart, dragTo, exceededDragThreshold } from "../lib/canvas-drag";
import type { CanvasNode } from "../lib/canvas-format";
import type { CanvasStore } from "../lib/canvas-store";

interface Props {
  node: CanvasNode;
  zoom: number;
  store: CanvasStore;
  selected?: boolean;
}

export function CanvasNodeGroup({ node, zoom, store, selected }: Props) {
  const dragRef = useRef<DragStart | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  const x = drag ? drag.x : node.x;
  const y = drag ? drag.y : node.y;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    // Drag the group when the user grabs the frame band itself; clicks
    // on the empty interior fall through to the viewport (so users can
    // start a drag-rect selection across nodes that sit inside).
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

  return (
    <div
      data-testid={`canvas-node-${node.id}`}
      data-node-id={node.id}
      className={`absolute rounded-lg border-2 border-dashed bg-amber-50/30 dark:bg-amber-950/20 ${
        selected ? "border-blue-500" : "border-amber-400/70 dark:border-amber-600/50"
      }`}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: node.width,
        height: node.height,
      }}
    >
      {/* Label band on the frame top — only this strip catches pointer
          events; the rest of the rectangle is hit-transparent so users
          can interact with the nodes visually contained by the group. */}
      <div
        data-testid={`canvas-node-${node.id}-label`}
        className="absolute -top-5 left-0 px-2 py-0.5 text-[11px] font-medium opacity-80 select-none rounded-t-md bg-amber-200/80 dark:bg-amber-700/60"
        style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {node.label ?? "Group"}
      </div>
    </div>
  );
}
