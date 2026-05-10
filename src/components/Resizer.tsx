import { useCallback, useEffect, useRef } from "react";

interface ResizerProps {
  /** Current width of the panel being resized, in px. */
  width: number;
  /** Called with the new width while dragging. */
  onChange: (next: number) => void;
  /** "right" = handle sits on the right edge (resizes a left-side panel
   * like the file tree). "left" = handle sits on the left edge (resizes
   * a right-side panel like the outline). The drag direction is mirrored
   * accordingly. */
  side: "right" | "left";
  /** Min width in px (clamped). */
  min?: number;
  /** Max width in px (clamped). */
  max?: number;
  /** Optional aria-label for the handle. */
  label?: string;
}

/**
 * 4px-wide vertical drag handle for resizing a side panel. Tracks
 * pointer movement using window listeners so the user can drag past the
 * handle's own bounds without losing the gesture.
 */
export function Resizer({
  width,
  onChange,
  side,
  min = 160,
  max = 600,
  label,
}: ResizerProps) {
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const dx = e.clientX - startXRef.current;
      // For a left-side panel (handle on its right edge), dragging right
      // grows the panel. For a right-side panel, dragging right shrinks it.
      const delta = side === "right" ? dx : -dx;
      const next = Math.max(min, Math.min(max, startWidthRef.current + delta));
      onChangeRef.current(next);
    },
    [min, max, side],
  );

  const onPointerUp = useCallback(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [onPointerMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label ?? "Resize panel"}
      tabIndex={-1}
      onPointerDown={onPointerDown}
      className={`shrink-0 w-1 cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500/60 ${
        side === "right" ? "" : ""
      }`}
    />
  );
}
