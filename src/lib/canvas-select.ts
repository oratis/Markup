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

/** Hit-test a world-space point against the node list. Iterates in
 *  reverse order so the visually top-most node (last in the array) wins
 *  ties — matches DOM stacking order. Returns null when the point is
 *  in empty space. Group nodes are skipped so a click in a group's
 *  interior falls through to whatever's drawn on top. */
export function nodeAtPoint(
  nodes: ReadonlyArray<CanvasNode>,
  worldX: number,
  worldY: number,
): CanvasNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.type === "group") continue;
    if (
      worldX >= n.x &&
      worldX <= n.x + n.width &&
      worldY >= n.y &&
      worldY <= n.y + n.height
    ) {
      return n;
    }
  }
  return null;
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
