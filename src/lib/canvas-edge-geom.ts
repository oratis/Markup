/**
 * Pure geometry helpers for canvas edges. Given a from/to node box and
 * optional anchor sides, produce screen coordinates for the endpoints
 * and a cubic Bezier path string ready to drop into an SVG `<path d>`.
 *
 * Kept purely numeric (no React, no DOM) so the math is unit-testable
 * and reusable from any rendering layer.
 */

import type { CanvasNode, CanvasSide } from "./canvas-format";

export interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Anchor {
  x: number;
  y: number;
  side: CanvasSide;
}

/** Return the world-space anchor point on a node's given side. */
export function anchorAt(node: NodeBox, side: CanvasSide): Anchor {
  switch (side) {
    case "top":
      return { x: node.x + node.width / 2, y: node.y, side };
    case "right":
      return { x: node.x + node.width, y: node.y + node.height / 2, side };
    case "bottom":
      return { x: node.x + node.width / 2, y: node.y + node.height, side };
    case "left":
      return { x: node.x, y: node.y + node.height / 2, side };
  }
}

/** Pick the side of `from` that points most directly at `to`'s centre. */
export function closestSide(from: NodeBox, to: NodeBox): CanvasSide {
  const fcx = from.x + from.width / 2;
  const fcy = from.y + from.height / 2;
  const tcx = to.x + to.width / 2;
  const tcy = to.y + to.height / 2;
  const dx = tcx - fcx;
  const dy = tcy - fcy;
  // Pick the dominant axis, then whether the target is on the
  // positive or negative side along it.
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}

/** Resolve from/to anchors honoring explicit sides when present, else
 *  auto-picking the closest side based on node centres. */
export function resolveAnchors(
  from: NodeBox,
  to: NodeBox,
  fromSide?: CanvasSide,
  toSide?: CanvasSide,
): { from: Anchor; to: Anchor } {
  const fSide = fromSide ?? closestSide(from, to);
  const tSide = toSide ?? closestSide(to, from);
  return { from: anchorAt(from, fSide), to: anchorAt(to, tSide) };
}

/** Outward unit vector for a side — used to push control points away
 *  from the node so the curve doesn't dive into its own box. */
function sideVector(side: CanvasSide): { dx: number; dy: number } {
  switch (side) {
    case "top":
      return { dx: 0, dy: -1 };
    case "right":
      return { dx: 1, dy: 0 };
    case "bottom":
      return { dx: 0, dy: 1 };
    case "left":
      return { dx: -1, dy: 0 };
  }
}

/** Build an SVG path-data string for a cubic Bezier between two
 *  anchors. Control points sit on the outward direction of each
 *  anchor's side, with magnitude scaled by half the endpoint distance
 *  (so close nodes get tight curves and far ones get long sweeps). */
export function edgePath(from: Anchor, to: Anchor): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  // Minimum 40px so even overlapping nodes get a visible curve.
  const reach = Math.max(40, dist * 0.4);
  const fv = sideVector(from.side);
  const tv = sideVector(to.side);
  const c1x = from.x + fv.dx * reach;
  const c1y = from.y + fv.dy * reach;
  const c2x = to.x + tv.dx * reach;
  const c2y = to.y + tv.dy * reach;
  return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`;
}

/** Midpoint of the cubic Bezier — used for label placement. Computed
 *  via the analytic t=0.5 formula. */
export function edgeMidpoint(from: Anchor, to: Anchor): { x: number; y: number } {
  const fv = sideVector(from.side);
  const tv = sideVector(to.side);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const reach = Math.max(40, Math.hypot(dx, dy) * 0.4);
  const c1x = from.x + fv.dx * reach;
  const c1y = from.y + fv.dy * reach;
  const c2x = to.x + tv.dx * reach;
  const c2y = to.y + tv.dy * reach;
  // Cubic Bezier at t=0.5: 1/8*(P0 + 3*P1 + 3*P2 + P3).
  return {
    x: (from.x + 3 * c1x + 3 * c2x + to.x) / 8,
    y: (from.y + 3 * c1y + 3 * c2y + to.y) / 8,
  };
}

/** Convenience: take two CanvasNode-shaped boxes and the optional
 *  fromSide/toSide hints; return path + midpoint together. */
export function buildEdgePath(
  from: CanvasNode,
  to: CanvasNode,
  fromSide?: CanvasSide,
  toSide?: CanvasSide,
): {
  d: string;
  mid: { x: number; y: number };
  from: Anchor;
  to: Anchor;
} {
  const anchors = resolveAnchors(from, to, fromSide, toSide);
  return {
    d: edgePath(anchors.from, anchors.to),
    mid: edgeMidpoint(anchors.from, anchors.to),
    from: anchors.from,
    to: anchors.to,
  };
}
