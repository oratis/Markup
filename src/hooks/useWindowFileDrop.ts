import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect } from "react";
import { isEditablePath } from "../lib/canvas-path";

/**
 * Opens Markdown / Canvas / HTML files dropped onto the app window.
 *
 * Tauri intercepts OS file drops at the window level (`dragDropEnabled`), so
 * HTML5 drop events never see them — we listen to Tauri's drag-drop event,
 * which gives real absolute paths. Non-editable files (images, PDFs, …) are
 * ignored. Works with or without a vault open; `onPaths` is called with the
 * editable paths in drop order.
 */
export function useWindowFileDrop(onPaths: (paths: string[]) => void) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type !== "drop") return;
        const editable = event.payload.paths.filter(isEditablePath);
        if (editable.length > 0) onPaths(editable);
      })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      })
      .catch((e) => console.warn("drag-drop listen failed:", e));

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [onPaths]);
}
