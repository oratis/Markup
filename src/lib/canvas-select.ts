/**
 * Pure helpers for the canvas drag-rectangle selection. Given a screen-
 * space rectangle (after pan/zoom), convert it to world space and
 * decide which nodes intersect.
 */

import type { CanvasNode } from "./canvas-format";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Build a rect from two corner points (any order). */
export function rectFromPoints(ax: number, ay: number, bx: number, by: number): Rect {
  return {
    x: Math.min(ax, bx),
    y: Math.min(ay, by),
    width: Math.abs(bx - ax),
    height: Math.abs(by - ay),
  };
}

/** Axis-aligned bounding-box overlap test. */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Return the ids of nodes whose bounding box overlaps the given world-
 *  space rect. Order matches the input nodes array. */
export function nodesInRect(nodes: ReadonlyArray<CanvasNode>, rect: Rect): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    if (
      rectsIntersect(rect, {
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
      })
    ) {
      out.push(n.id);
    }
  }
  return out;
}
