import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  getBookmarks,
  isBookmarked,
  subscribe as subscribeBookmarks,
  toggleBookmark,
} from "../lib/bookmarks";
import { liveSelection, useAppStore } from "../store";

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
  const closeTabsToLeft = useAppStore((s) => s.closeTabsToLeft);
  const closeAllTabs = useAppStore((s) => s.closeAllTabs);
  const closeTabs = useAppStore((s) => s.closeTabs);
  const toggleTabPinned = useAppStore((s) => s.toggleTabPinned);
  const reorderTab = useAppStore((s) => s.reorderTab);
  const selectedIds = useAppStore((s) => s.selectedTabIds);
  const toggleTabSelection = useAppStore((s) => s.toggleTabSelection);
  const selectTabRange = useAppStore((s) => s.selectTabRange);
  const clearTabSelection = useAppStore((s) => s.clearTabSelection);

  // Subscribe so star indicators refresh on bookmark toggle. The
  // returned array reference is stable as the bookmarks store mutates
  // in place + replaces; subscribe re-emits to trigger a render.
  useSyncExternalStore(subscribeBookmarks, getBookmarks);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<CtxState | null>(null);
  // Anchor for ⇧-click ranges. Pure pointer state — it never needs to leave
  // this component, unlike the selection itself (App reads that for ⌘W).
  const [anchorId, setAnchorId] = useState<string | null>(null);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  // What a "Close N Tabs" would really remove — never counts pinned tabs.
  const live = useMemo(
    () => liveSelection({ tabs, selectedTabIds: selectedIds }),
    [tabs, selectedIds],
  );

  // Esc drops the selection. One of the three guards that make it safe for
  // ⌘W to close a selection instead of the active tab — see
  // docs/design/10-close-many-tabs.md §3 (辩题二). Esc inside an input (the
  // find bar, the palette) belongs to that input, not to the strip.
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")
      ) {
        return;
      }
      clearTabSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds.length, clearTabSelection]);

  if (tabs.length <= 1) return null;

  const ctxIdx = ctx ? tabs.findIndex((t) => t.id === ctx.id) : -1;

  return (
    <div className="flex items-stretch border-b border-black/5 dark:border-white/10 overflow-x-auto no-scrollbar bg-canvas-light dark:bg-canvas-dark">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isSelected = selected.has(tab.id);
        const indicator = tab.status === "dirty" ? "●" : "";
        const isDragging = draggingId === tab.id;
        const isOver = overId === tab.id && draggingId && draggingId !== tab.id;
        // A selected tab stays at full opacity — the marking has to be
        // obvious enough that nobody forgets a selection is live.
        const tone = isActive
          ? "bg-canvas-light dark:bg-canvas-dark text-ink-light dark:text-ink-dark"
          : isSelected
            ? ""
            : "opacity-60 hover:opacity-90";
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
              // Right-clicking outside the selection moves focus to that tab,
              // so the menu never describes tabs the user isn't pointing at.
              if (!isSelected) clearTabSelection();
              setCtx({ id: tab.id, x: e.clientX, y: e.clientY });
            }}
            onMouseDown={(e) => {
              // Middle-click closes the tab (browser convention).
              // Pinned tabs ignore the gesture; explicit unpin first.
              if (e.button === 1 && !tab.pinned) {
                e.preventDefault();
                closeTab(tab.id);
              }
            }}
            data-selected={isSelected ? "true" : undefined}
            className={`group titlebar-no-drag relative flex items-center gap-2 pl-3 pr-1 py-1.5 text-[12px] cursor-pointer border-r border-black/5 dark:border-white/10 select-none ${tone} ${
              isSelected ? "bg-blue-500/10 ring-1 ring-inset ring-blue-500/60" : ""
            } ${isDragging ? "opacity-30" : ""} ${
              isOver ? "ring-2 ring-blue-500/50 ring-inset" : ""
            }`}
            onClick={(e) => {
              // ⇧ extends a range from the anchor, ⌘/Ctrl toggles one tab
              // (without moving the active doc), a plain click does what it
              // always did — activate, and drop any selection.
              if (e.shiftKey) {
                // The anchor may have been closed since it was set; fall
                // back to the active tab rather than selecting one tab.
                const anchorLive = anchorId && tabs.some((t) => t.id === anchorId);
                selectTabRange(anchorLive ? anchorId : activeTabId, tab.id);
                return;
              }
              if (e.metaKey || e.ctrlKey) {
                toggleTabSelection(tab.id);
                setAnchorId(tab.id);
                return;
              }
              clearTabSelection();
              setAnchorId(tab.id);
              setActiveTab(tab.id);
            }}
          >
            {tab.pinned && (
              <span aria-label="Pinned" title="Pinned" className="text-[10px] opacity-70">
                📌
              </span>
            )}
            {tab.path && isBookmarked(tab.path) && (
              <span
                aria-label="Bookmarked"
                title="Bookmarked"
                className="text-[11px] text-amber-500"
              >
                ★
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
              <span className="mk-tab-indicator absolute left-0 right-0 top-0 h-[2px]" />
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
            ...(selected.has(ctx.id) && live.length > 0
              ? [
                  {
                    label:
                      live.length === 1 ? "Close 1 Tab" : `Close ${live.length} Tabs`,
                    run: () => closeTabs(live),
                  },
                  { label: "Clear Selection", run: () => clearTabSelection() },
                ]
              : []),
            {
              label: tabs.find((t) => t.id === ctx.id)?.pinned ? "Unpin" : "Pin",
              run: () => toggleTabPinned(ctx.id),
            },
            {
              label: (() => {
                const p = tabs.find((t) => t.id === ctx.id)?.path;
                if (!p) return "Bookmark";
                return isBookmarked(p) ? "Remove Bookmark" : "Bookmark";
              })(),
              run: () => {
                const p = tabs.find((t) => t.id === ctx.id)?.path;
                if (p) toggleBookmark(p);
              },
              disabled: !tabs.find((t) => t.id === ctx.id)?.path,
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
            {
              label: "Close Others",
              run: () => closeOtherTabs(ctx.id),
              disabled: !tabs.some((t) => t.id !== ctx.id && !t.pinned),
            },
            // Pinned tabs sit out of every bulk close, so an item is greyed
            // out when nothing on that side would actually go — not merely
            // when there is nothing on that side.
            {
              label: "Close to the Left",
              run: () => closeTabsToLeft(ctx.id),
              disabled: !tabs.slice(0, ctxIdx).some((t) => !t.pinned),
            },
            {
              label: "Close to the Right",
              run: () => closeTabsToRight(ctx.id),
              disabled: !tabs.slice(ctxIdx + 1).some((t) => !t.pinned),
            },
            {
              label: "Close All",
              run: () => closeAllTabs(),
              disabled: !tabs.some((t) => !t.pinned),
            },
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
        // flex-col so the panel's max-content width is the widest item, not
        // the sum of them — inline-block buttons made it grow with the item
        // count (~700px before this feature added two more entries).
        className="absolute flex flex-col min-w-[160px] py-1 rounded-md shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15"
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
