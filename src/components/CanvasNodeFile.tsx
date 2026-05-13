/**
 * Embed-a-vault-file node. Loads `node.file` (vault-relative) on mount,
 * optionally slices on `node.subpath` (#Heading or ^block), and renders
 * the result through the same Markdown→HTML pipeline as text nodes.
 *
 * Click → open the file as a tab. Drag → move (same semantics as text
 * nodes — local state during drag, commit on pointer up).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { type DragStart, dragTo, exceededDragThreshold } from "../lib/canvas-drag";
import { resolveVaultPath } from "../lib/canvas-file-resolve";
import type { CanvasNode } from "../lib/canvas-format";
import { renderCanvasMarkdown } from "../lib/canvas-md-render";
import type { CanvasStore } from "../lib/canvas-store";
import { findBlock, findSectionByHeading } from "../lib/embed-slice";
import { readFile } from "../lib/tauri";
import { useAppStore } from "../store";

interface Props {
  node: CanvasNode;
  zoom: number;
  store: CanvasStore;
  selected?: boolean;
}

interface LoadState {
  status: "idle" | "loading" | "ok" | "missing" | "error";
  text: string;
  message: string;
  mtimeMs: number | null;
}

const INITIAL: LoadState = {
  status: "idle",
  text: "",
  message: "",
  mtimeMs: null,
};

export function CanvasNodeFile({ node, zoom, store, selected }: Props) {
  const vaultRoot = useAppStore((s) => s.vaultRoot);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);
  const [load, setLoad] = useState<LoadState>(INITIAL);
  const dragRef = useRef<DragStart | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  const absPath = useMemo(
    () => resolveVaultPath(vaultRoot, node.file ?? null),
    [vaultRoot, node.file],
  );

  // Load the file on mount and whenever the target path / vault changes.
  // No store coupling — the canvas store doesn't cache file contents.
  useEffect(() => {
    if (!absPath) {
      setLoad({
        status: "missing",
        text: "",
        message: "(no file)",
        mtimeMs: null,
      });
      return;
    }
    let cancelled = false;
    setLoad({ status: "loading", text: "", message: "", mtimeMs: null });
    readFile(absPath)
      .then((loaded) => {
        if (cancelled) return;
        setLoad({
          status: "ok",
          text: loaded.content,
          message: "",
          mtimeMs: loaded.mtime_ms,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setLoad({
          status: "error",
          text: "",
          message: String(e),
          mtimeMs: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [absPath]);

  const html = useMemo(() => {
    if (load.status !== "ok") return "";
    const slice = sliceByAnchor(load.text, node.subpath);
    return renderCanvasMarkdown(slice);
  }, [load, node.subpath]);

  const x = drag ? drag.x : node.x;
  const y = drag ? drag.y : node.y;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      screenX: e.clientX,
      screenY: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragRef.current;
    if (!ds) return;
    if (!drag && !exceededDragThreshold(ds, e.clientX, e.clientY)) return;
    setDrag(dragTo(ds, e.clientX, e.clientY, zoom));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragRef.current;
    if (!ds) return;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    dragRef.current = null;
    if (drag) {
      store.moveNode(node.id, drag.x, drag.y);
      setDrag(null);
      return;
    }
    store.toggleSelection(node.id, e.shiftKey);
  }

  function onDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    // Open the referenced file as a tab. Don't propagate to the
    // viewport's empty-area handlers (B212 reserves double-click for
    // text-node creation).
    e.stopPropagation();
    if (load.status !== "ok" || !absPath) return;
    openLoadedFile({
      path: absPath,
      content: load.text,
      mtime_ms: load.mtimeMs ?? 0,
    });
  }

  const cursor = dragRef.current ? "grabbing" : "grab";
  const fileLabel = node.file ?? "(no file)";

  return (
    <div
      data-testid={`canvas-node-${node.id}`}
      data-node-id={node.id}
      className={`absolute select-none rounded-md border bg-blue-50/60 dark:bg-blue-950/40 shadow-sm overflow-hidden flex flex-col ${
        selected
          ? "border-blue-500 ring-2 ring-blue-500/30"
          : "border-blue-300/60 dark:border-blue-700/50"
      }`}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: node.width,
        height: node.height,
        cursor,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="text-[10px] uppercase tracking-wider opacity-60 px-2 py-1 border-b border-blue-200/60 dark:border-blue-800/40 shrink-0 truncate pointer-events-none"
        data-testid={`canvas-node-${node.id}-title`}
      >
        📄 {fileLabel}
        {node.subpath ? <span className="opacity-70"> {node.subpath}</span> : null}
      </div>
      <div
        className="canvas-node-body flex-1 px-3 py-2 overflow-auto text-[13px] pointer-events-none"
        data-testid={`canvas-node-${node.id}-body`}
      >
        {load.status === "ok" ? (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML produced by canvas-md-render.
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : load.status === "loading" ? (
          <div className="opacity-50">Loading…</div>
        ) : load.status === "missing" ? (
          <div className="opacity-50">No file reference.</div>
        ) : (
          <div className="text-red-600 text-[12px]">Cannot load: {load.message}</div>
        )}
      </div>
    </div>
  );
}

/** Apply the Obsidian-style anchor in node.subpath to the loaded text.
 *  `#Section` → heading slice; `^block-id` → block slice; empty / no
 *  anchor → full content. */
function sliceByAnchor(text: string, subpath: string | undefined): string {
  if (!subpath || !subpath.length) return text;
  const raw =
    subpath.startsWith("#") || subpath.startsWith("^") ? subpath : `#${subpath}`;
  if (raw.startsWith("#")) {
    return findSectionByHeading(text, raw.slice(1).trim()) ?? text;
  }
  return findBlock(text, raw.slice(1).trim()) ?? text;
}
