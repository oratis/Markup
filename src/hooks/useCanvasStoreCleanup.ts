import { useEffect, useRef } from "react";
import { disposeCanvasStore } from "../lib/canvas-registry";

interface TabLike {
  id: string;
  kind?: "markdown" | "canvas" | "html";
}

/**
 * Disposes a canvas tab's per-canvas store when its tab closes. Without this
 * the registry leaks one store per opened-then-closed canvas for the session
 * lifetime, and a re-opened tab would silently inherit the stale in-memory
 * state instead of fresh disk content.
 *
 * Behaviour-preserving extraction from App.tsx. `dispose` is injectable for
 * testing.
 */
export function useCanvasStoreCleanup(
  tabs: ReadonlyArray<TabLike>,
  dispose: (id: string) => void = disposeCanvasStore,
) {
  const prevCanvasTabIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(tabs.filter((t) => t.kind === "canvas").map((t) => t.id));
    for (const id of prevCanvasTabIdsRef.current) {
      if (!current.has(id)) dispose(id);
    }
    prevCanvasTabIdsRef.current = current;
  }, [tabs, dispose]);
}
