/**
 * Pure pan/zoom math for the canvas viewport.
 *
 * The viewport stores world-space coordinates and a zoom level. Screen-
 * to-world conversion: `world = (screen - offset) / zoom`. The canvas
 * pan/zoom container in CanvasView.tsx applies the inverse as a CSS
 * transform — keeping the math in one pure module so we can unit-test
 * coordinate conversion and clamping without jsdom layout.
 */

export interface Viewport {
  /** Pan offset in screen pixels (translation applied before scale). */
  x: number;
  y: number;
  /** Zoom factor. 1.0 = 100%, 2.0 = 200%, etc. */
  zoom: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4.0;
export const DEFAULT_ZOOM = 1.0;
const ZOOM_STEP = 1.1; // multiplicative — feels even across the range

export function defaultViewport(): Viewport {
  return { x: 0, y: 0, zoom: DEFAULT_ZOOM };
}

export function clampZoom(z: number): number {
  if (Number.isNaN(z)) return DEFAULT_ZOOM;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

/** Zoom in/out around a screen-space focus point so the world position
 *  beneath the cursor stays put (the canonical "pinch around the
 *  pointer" feel). Negative deltaY zooms in (matching wheel-event
 *  convention on macOS trackpads). */
export function applyWheelZoom(
  v: Viewport,
  deltaY: number,
  focusX: number,
  focusY: number,
): Viewport {
  const factor = deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
  return zoomAtPoint(v, v.zoom * factor, focusX, focusY);
}

/** Zoom directly to a target level around a screen-space focus point. */
export function zoomAtPoint(
  v: Viewport,
  targetZoom: number,
  focusX: number,
  focusY: number,
): Viewport {
  const next = clampZoom(targetZoom);
  if (next === v.zoom) return v;
  // World position currently under the cursor — must stay there after zoom.
  const worldX = (focusX - v.x) / v.zoom;
  const worldY = (focusY - v.y) / v.zoom;
  return {
    zoom: next,
    x: focusX - worldX * next,
    y: focusY - worldY * next,
  };
}

/** Translate the viewport by a screen-space delta. */
export function applyPan(v: Viewport, dx: number, dy: number): Viewport {
  if (dx === 0 && dy === 0) return v;
  return { ...v, x: v.x + dx, y: v.y + dy };
}

/** Convert a screen-space coordinate to world space. */
export function screenToWorld(
  v: Viewport,
  sx: number,
  sy: number,
): { x: number; y: number } {
  return { x: (sx - v.x) / v.zoom, y: (sy - v.y) / v.zoom };
}

/** Convert a world-space coordinate to screen space. */
export function worldToScreen(
  v: Viewport,
  wx: number,
  wy: number,
): { x: number; y: number } {
  return { x: wx * v.zoom + v.x, y: wy * v.zoom + v.y };
}

/** CSS transform string equivalent to the viewport. Apply to a parent
 *  whose children sit in world coordinates (`translate(x, y)` per node)
 *  — the outer scale handles zoom, the outer translate handles pan. */
export function toCssTransform(v: Viewport): string {
  return `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;
}

/** Reset zoom to 100% while keeping the world origin at the same screen
 *  position. Used by the "Zoom to 100%" command. */
export function resetZoom(v: Viewport): Viewport {
  if (v.zoom === DEFAULT_ZOOM) return v;
  return { ...v, zoom: DEFAULT_ZOOM };
}
