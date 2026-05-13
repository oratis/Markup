/**
 * Editing overlay for a canvas text node. Mounts a Milkdown instance
 * sized + positioned to match the node, seeded with the node's text.
 * Esc / outside-click / blur commits the current markdown to the store
 * via updateNode and dismisses the overlay.
 *
 * Per the B210 design choice (one shared overlay vs one editor per
 * node), exactly one of these mounts at a time — driven by
 * CanvasView's editingNodeId state. That keeps memory and editor-init
 * cost flat regardless of canvas size.
 */

import { Editor, defaultValueCtx, rootCtx } from "@milkdown/core";
import { history } from "@milkdown/plugin-history";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { useEffect, useRef } from "react";
import type { CanvasNode } from "../lib/canvas-format";
import type { CanvasStore } from "../lib/canvas-store";

interface Props {
  node: CanvasNode;
  store: CanvasStore;
  onClose: () => void;
}

export function CanvasTextOverlay(props: Props) {
  return (
    <MilkdownProvider>
      <CanvasTextOverlayInner {...props} />
    </MilkdownProvider>
  );
}

function CanvasTextOverlayInner({ node, store, onClose }: Props) {
  // Keep the latest markdown in a ref so blur/Esc can commit without
  // needing a re-render-driven state update.
  const latestRef = useRef(node.text ?? "");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, node.text ?? "");
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          latestRef.current = markdown;
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener),
  );

  function commit() {
    if (latestRef.current === (node.text ?? "")) {
      onClose();
      return;
    }
    store.updateNode(node.id, { text: latestRef.current });
    onClose();
  }

  // Esc commits + closes. Outside-click is handled by the parent.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        commit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // commit reads refs, no deps needed
    // biome-ignore lint/correctness/useExhaustiveDependencies: refs only.
  }, []);

  // Focus the editor on mount so the user can type immediately.
  useEffect(() => {
    const el = wrapperRef.current?.querySelector<HTMLElement>(
      ".milkdown [contenteditable=true]",
    );
    el?.focus();
  }, []);

  return (
    <div
      ref={wrapperRef}
      data-testid={`canvas-text-overlay-${node.id}`}
      className="absolute z-10 rounded-md border-2 border-blue-500 bg-white dark:bg-neutral-800 shadow-lg overflow-hidden"
      style={{
        transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
        width: node.width,
        height: node.height,
      }}
      onBlur={(e) => {
        // Commit when focus leaves the entire overlay subtree.
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        commit();
      }}
      // Don't let the canvas pan/select handlers see these events.
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 text-[10px] uppercase tracking-wider opacity-60 border-b border-black/10 dark:border-white/10 select-none">
        Editing — Esc to commit
      </div>
      <div className="px-2 py-1 h-[calc(100%-1.6rem)] overflow-auto text-[13px]">
        <Milkdown />
      </div>
    </div>
  );
}
