/**
 * Four small circles on a node's four mid-sides. Mounted by CanvasView
 * for every selected node so the user can drag from an anchor to
 * create an edge.
 *
 * Anchors live inside the world layer (so pan/zoom scales them), but
 * counter-scale themselves so they stay a constant ~10px on screen
 * regardless of zoom level — otherwise zooming out shrinks them to
 * un-clickable dots.
 */

import type { CanvasNode, CanvasSide } from "../lib/canvas-format";

interface Props {
  node: CanvasNode;
  zoom: number;
  onAnchorPointerDown: (
    e: React.PointerEvent<SVGElement>,
    nodeId: string,
    side: CanvasSide,
  ) => void;
}

const SIDES: CanvasSide[] = ["top", "right", "bottom", "left"];

export function CanvasAnchorHandles({ node, zoom, onAnchorPointerDown }: Props) {
  const r = 6 / zoom; // ≈12px on screen regardless of zoom
  const stroke = 1.5 / zoom;

  return (
    <g data-testid={`canvas-anchors-${node.id}`}>
      {SIDES.map((side) => {
        const p = anchorScreenCoord(node, side);
        return (
          <circle
            key={side}
            cx={p.x}
            cy={p.y}
            r={r}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={stroke}
            className="cursor-crosshair pointer-events-auto"
            data-testid={`canvas-anchor-${node.id}-${side}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              onAnchorPointerDown(e, node.id, side);
            }}
          />
        );
      })}
    </g>
  );
}

function anchorScreenCoord(node: CanvasNode, side: CanvasSide): { x: number; y: number } {
  switch (side) {
    case "top":
      return { x: node.x + node.width / 2, y: node.y };
    case "right":
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    case "bottom":
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case "left":
      return { x: node.x, y: node.y + node.height / 2 };
  }
}
