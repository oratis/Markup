import { useState } from "react";
import { useAppStore } from "../store";

const DRAG_MIME = "application/x-markup-tab";

interface CtxState {
  id: string;
  x: number;
  y: number;
}

export function TabBar() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const closeOtherTabs = useAppStore((s) => s.closeOtherTabs);
  const closeTabsToRight = useAppStore((s) => s.closeTabsToRight);
  const closeAllTabs = useAppStore((s) => s.closeAllTabs);
  const toggleTabPinned = useAppStore((s) => s.toggleTabPinned);
  const reorderTab = useAppStore((s) => s.reorderTab);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<CtxState | null>(null);

  if (tabs.length <= 1) return null;

  return (
    <div className="flex items-stretch border-b border-black/5 dark:border-white/10 overflow-x-auto no-scrollbar bg-canvas-light dark:bg-canvas-dark">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const indicator = tab.status === "dirty" ? "●" : "";
        const isDragging = draggingId === tab.id;
        const isOver = overId === tab.id && draggingId && draggingId !== tab.id;
        return (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_MIME, tab.id);
              e.dataTransfer.effectAllowed = "move";
              setDraggingId(tab.id);
            }}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverId(tab.id);
            }}
            onDragLeave={() => {
              if (overId === tab.id) setOverId(null);
            }}
            onDrop={(e) => {
              const fromId = e.dataTransfer.getData(DRAG_MIME);
              if (fromId) {
                e.preventDefault();
                reorderTab(fromId, tab.id);
              }
              setDraggingId(null);
              setOverId(null);
            }}
            onDragEnd={() => {
              setDraggingId(null);
              setOverId(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtx({ id: tab.id, x: e.clientX, y: e.clientY });
            }}
            className={`group titlebar-no-drag relative flex items-center gap-2 pl-3 pr-1 py-1.5 text-[12px] cursor-pointer border-r border-black/5 dark:border-white/10 select-none ${
              isActive
                ? "bg-canvas-light dark:bg-canvas-dark text-ink-light dark:text-ink-dark"
                : "opacity-60 hover:opacity-90"
            } ${isDragging ? "opacity-30" : ""} ${
              isOver ? "ring-2 ring-blue-500/50 ring-inset" : ""
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.pinned && (
              <span aria-label="Pinned" title="Pinned" className="text-[10px] opacity-70">
                📌
              </span>
            )}
            <span className="max-w-[180px] truncate">{tab.name}</span>
            <span className="text-[10px] opacity-70 w-2">{indicator}</span>
            {!tab.pinned && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/15 opacity-0 group-hover:opacity-100"
                aria-label="Close tab"
              >
                ×
              </button>
            )}
            {isActive && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-blue-500" />
            )}
          </div>
        );
      })}
      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          onClose={() => setCtx(null)}
          items={[
            {
              label: tabs.find((t) => t.id === ctx.id)?.pinned ? "Unpin" : "Pin",
              run: () => toggleTabPinned(ctx.id),
            },
            {
              label: "Copy Path",
              run: () => {
                const path = tabs.find((t) => t.id === ctx.id)?.path;
                if (path) navigator.clipboard.writeText(path).catch(() => {});
              },
              disabled: !tabs.find((t) => t.id === ctx.id)?.path,
            },
            {
              label: "Reveal in File Tree",
              run: () => {
                const tab = tabs.find((t) => t.id === ctx.id);
                if (!tab?.path) return;
                const s = useAppStore.getState();
                if (s.activeTabId !== ctx.id) s.setActiveTab(ctx.id);
                if (!s.sidebarOpen) s.toggleSidebar();
                window.setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("markup:reveal-active"));
                }, 0);
              },
              disabled: !tabs.find((t) => t.id === ctx.id)?.path,
            },
            { label: "Close", run: () => closeTab(ctx.id) },
            { label: "Close Others", run: () => closeOtherTabs(ctx.id) },
            {
              label: "Close to the Right",
              run: () => closeTabsToRight(ctx.id),
              disabled: tabs.findIndex((t) => t.id === ctx.id) === tabs.length - 1,
            },
            { label: "Close All", run: () => closeAllTabs() },
          ]}
        />
      )}
    </div>
  );
}

interface MenuItem {
  label: string;
  run: () => void;
  disabled?: boolean;
}

function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        style={{ left: x, top: y }}
        className="absolute min-w-[160px] py-1 rounded-md shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((it) => (
          <button
            key={it.label}
            disabled={it.disabled}
            onClick={() => {
              if (it.disabled) return;
              onClose();
              it.run();
            }}
            className={`w-full text-left px-3 py-1 text-[12px] ${
              it.disabled
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
