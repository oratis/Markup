/**
 * Pure helpers for dragging a canvas node. Kept module-level so the
 * geometry can be unit-tested without React rendering.
 *
 * Drag mental model:
 *  - On pointer down, capture the node's current world position and the
 *    pointer's screen position.
 *  - On every pointer move, compute the screen delta, divide by zoom
 *    to get the world delta, and add to the captured base position.
 *  - On pointer up, commit the final position to the store (which
 *    short-circuits no-op moves, so a click-without-drag doesn't
 *    bloat the undo stack).
 */

export interface DragStart {
  screenX: number;
  screenY: number;
  nodeX: number;
  nodeY: number;
}

/** Compute a node's new world position given the drag start anchor,
 *  current pointer screen position, and the active viewport zoom. */
export function dragTo(
  start: DragStart,
  screenX: number,
  screenY: number,
  zoom: number,
): { x: number; y: number } {
  const dz = zoom <= 0 ? 1 : zoom;
  return {
    x: start.nodeX + (screenX - start.screenX) / dz,
    y: start.nodeY + (screenY - start.screenY) / dz,
  };
}

/** Convenience: did the pointer move far enough to count as a drag?
 *  Useful for distinguishing a click (no drag) from a tiny drag. */
export function exceededDragThreshold(
  start: DragStart,
  screenX: number,
  screenY: number,
  thresholdPx = 3,
): boolean {
  const dx = screenX - start.screenX;
  const dy = screenY - start.screenY;
  return Math.abs(dx) > thresholdPx || Math.abs(dy) > thresholdPx;
}
