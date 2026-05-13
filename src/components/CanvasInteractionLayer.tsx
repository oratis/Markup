/**
 * SVG overlay for transient interaction graphics:
 *  - Anchor handles on selected nodes (B213)
 *  - Edge-draft ghost path while the user drags from one anchor (B213)
 *
 * Mounted inside the world layer so the SVG transforms together with
 * the nodes; each anchor counter-scales itself so the hit target stays
 * a constant pixel size regardless of zoom.
 */

import { anchorAt, edgePath } from "../lib/canvas-edge-geom";
import type { CanvasDoc, CanvasNode, CanvasSide } from "../lib/canvas-format";
import { CanvasAnchorHandles } from "./CanvasAnchorHandles";

export interface EdgeDraft {
  fromNodeId: string;
  fromSide: CanvasSide;
  /** World-space coordinates of the pointer right now. */
  pointerX: number;
  pointerY: number;
}

interface Props {
  doc: CanvasDoc;
  selection: ReadonlySet<string>;
  zoom: number;
  edgeDraft: EdgeDraft | null;
  onAnchorPointerDown: (
    e: React.PointerEvent<SVGElement>,
    nodeId: string,
    side: CanvasSide,
  ) => void;
}

export function CanvasInteractionLayer({
  doc,
  selection,
  zoom,
  edgeDraft,
  onAnchorPointerDown,
}: Props) {
  return (
    <svg
      data-testid="canvas-interaction-svg"
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: "visible" }}
    >
      <title>Canvas interactions</title>
      {/* Anchor handles on every selected non-group node. */}
      {doc.nodes
        .filter((n) => n.type !== "group" && selection.has(n.id))
        .map((node) => (
          <CanvasAnchorHandles
            key={node.id}
            node={node}
            zoom={zoom}
            onAnchorPointerDown={onAnchorPointerDown}
          />
        ))}
      {/* Edge-draft ghost while the user drags from an anchor. */}
      {edgeDraft ? <EdgeDraftGhost doc={doc} draft={edgeDraft} /> : null}
    </svg>
  );
}

function EdgeDraftGhost({
  doc,
  draft,
}: {
  doc: CanvasDoc;
  draft: EdgeDraft;
}) {
  const from = doc.nodes.find((n) => n.id === draft.fromNodeId);
  if (!from) return null;
  const fromAnchor = anchorAt(asBox(from), draft.fromSide);
  // Treat the pointer location as a tiny target box centred on the
  // cursor, with an implicit side opposite to the from-side so the
  // ghost curves naturally.
  const toAnchor = {
    x: draft.pointerX,
    y: draft.pointerY,
    side: oppositeSide(draft.fromSide),
  };
  const d = edgePath(fromAnchor, toAnchor);
  return (
    <path
      d={d}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={2}
      strokeDasharray="6 4"
      data-testid="canvas-edge-draft"
    />
  );
}

function asBox(n: CanvasNode) {
  return { x: n.x, y: n.y, width: n.width, height: n.height };
}

function oppositeSide(s: CanvasSide): CanvasSide {
  switch (s) {
    case "top":
      return "bottom";
    case "right":
      return "left";
    case "bottom":
      return "top";
    case "left":
      return "right";
  }
}
