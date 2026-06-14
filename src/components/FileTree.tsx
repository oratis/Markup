import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { isCanvasPath, isHtmlPath } from "../lib/canvas-path";
import { useT } from "../lib/i18n";
import { listVaultFiles, readFile, renameFile, trashFile } from "../lib/tauri";
import { sortVaultFiles } from "../lib/vault-order";
import { type VaultFile, useAppStore } from "../store";

interface ContextState {
  file: VaultFile;
  x: number;
  y: number;
}

export function FileTree() {
  const t = useT();
  const vaultRoot = useAppStore((s) => s.vaultRoot);
  const files = useAppStore((s) => s.vaultFiles);
  const setVaultFiles = useAppStore((s) => s.setVaultFiles);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);
  const closeTab = useAppStore((s) => s.closeTab);
  const activeTabId = useAppStore((s) => s.activeTabId);

  const [ctx, setCtx] = useState<ContextState | null>(null);
  const [renaming, setRenaming] = useState<{ file: VaultFile; value: string } | null>(
    null,
  );

  const vaultSort = useAppStore((s) => s.vaultSort);
  const setSettings = useAppStore((s) => s.setSettings);
  const sorted = useMemo(() => sortVaultFiles(files, vaultSort), [files, vaultSort]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26,
    overscan: 12,
  });

  // Listen for "Reveal in Tree" palette command — scroll to the active
  // file's row and centre it. The active row's bold styling does the
  // visual highlight, so no extra flash needed.
  useEffect(() => {
    const onReveal = () => {
      const id = useAppStore.getState().activeTabId;
      if (!id) return;
      const idx = sorted.findIndex((f) => f.path === id);
      if (idx < 0) return;
      // Defer one frame so the sidebar has time to mount if it just opened.
      window.requestAnimationFrame(() => {
        rowVirtualizer.scrollToIndex(idx, { align: "center" });
      });
    };
    window.addEventListener("markup:reveal-active", onReveal);
    return () => window.removeEventListener("markup:reveal-active", onReveal);
  }, [sorted, rowVirtualizer]);

  async function refresh() {
    try {
      const list = await listVaultFiles();
      setVaultFiles(list.map(toVaultFileTs));
    } catch (e) {
      console.error("listVaultFiles failed", e);
    }
  }

  async function openFile(f: VaultFile) {
    try {
      const loaded = await readFile(f.path);
      openLoadedFile(loaded);
    } catch (e) {
      console.error("readFile failed", e);
    }
  }

  async function commitRename() {
    if (!renaming) return;
    const newName = renaming.value.trim();
    setRenaming(null);
    if (!newName || newName === renaming.file.name) return;
    const lastSlash = renaming.file.path.lastIndexOf("/");
    const dir = lastSlash >= 0 ? renaming.file.path.slice(0, lastSlash + 1) : "";
    const newPath = dir + newName;
    try {
      await renameFile(renaming.file.path, newPath);
      // If the renamed file was open, replace the tab path quickly.
      const a = useAppStore.getState();
      const tab = a.tabs.find((t) => t.path === renaming.file.path);
      if (tab) {
        a.closeTab(tab.id);
        try {
          const loaded = await readFile(newPath);
          a.openLoadedFile(loaded);
        } catch {
          /*ignore*/
        }
      }
      await refresh();
    } catch (e) {
      console.error("rename failed", e);
    }
  }

  async function deleteFile(f: VaultFile) {
    if (!window.confirm(`Move "${f.name}" to Trash?`)) return;
    try {
      await trashFile(f.path);
      // If the deleted file was open, close its tab
      const a = useAppStore.getState();
      const tab = a.tabs.find((t) => t.path === f.path);
      if (tab) closeTab(tab.id);
      await refresh();
    } catch (e) {
      console.error("trashFile failed", e);
      window.alert(`Failed to move to Trash: ${e}`);
    }
  }

  if (!vaultRoot) {
    return <div className="text-xs opacity-60 px-3 py-3">{t("filetree.noVault")}</div>;
  }

  if (sorted.length === 0) {
    return <div className="text-xs opacity-60 px-3 py-3">{t("filetree.empty")}</div>;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wider opacity-50 flex items-center gap-2">
        <span className="flex-1 truncate">{vaultRoot.split("/").pop() || vaultRoot}</span>
        <button
          type="button"
          title={vaultSort === "name" ? t("filetree.sortName") : t("filetree.sortMtime")}
          onClick={() =>
            setSettings({ vaultSort: vaultSort === "name" ? "mtime" : "name" })
          }
          className="text-[10px] font-mono opacity-70 hover:opacity-100"
        >
          {vaultSort === "name" ? "A↓" : "⏱"}
        </button>
      </div>
      <div ref={parentRef} className="flex-1 min-h-0 overflow-auto no-scrollbar">
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            position: "relative",
            width: "100%",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((vi) => {
            const file = sorted[vi.index];
            const isActive = activeTabId === file.path;
            const isRenaming = renaming?.file.path === file.path;
            return (
              <div
                key={file.path}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start}px)`,
                  height: vi.size,
                }}
                className={`flex items-center gap-1 px-3 text-[12px] hover:bg-black/5 dark:hover:bg-white/10 ${
                  isActive ? "bg-black/10 dark:bg-white/15 font-medium" : ""
                }`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtx({ file, x: e.clientX, y: e.clientY });
                }}
              >
                <span
                  className={`shrink-0 w-3 text-center ${
                    isCanvasPath(file.path)
                      ? "text-amber-600 dark:text-amber-400 opacity-90"
                      : isHtmlPath(file.path)
                        ? "text-sky-600 dark:text-sky-400 opacity-90"
                        : "opacity-50"
                  }`}
                  aria-hidden="true"
                  data-testid={
                    isCanvasPath(file.path)
                      ? "filetree-canvas-icon"
                      : isHtmlPath(file.path)
                        ? "filetree-html-icon"
                        : "filetree-md-icon"
                  }
                  title={
                    isCanvasPath(file.path)
                      ? "Canvas"
                      : isHtmlPath(file.path)
                        ? "HTML"
                        : "Markdown"
                  }
                >
                  {isCanvasPath(file.path) ? "◈" : isHtmlPath(file.path) ? "◍" : "·"}
                </span>
                {isRenaming ? (
                  <input
                    value={renaming.value}
                    onChange={(e) => setRenaming({ file, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      else if (e.key === "Escape") setRenaming(null);
                    }}
                    onBlur={commitRename}
                    className="flex-1 bg-transparent outline-none border border-blue-500 rounded px-1"
                  />
                ) : (
                  <button
                    title={file.relPath}
                    onClick={() => openFile(file)}
                    className="flex-1 text-left truncate"
                  >
                    {file.relPath}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          onClose={() => setCtx(null)}
          items={[
            {
              label: "Open",
              run: () => {
                openFile(ctx.file);
              },
            },
            {
              label: "Rename…",
              run: () => setRenaming({ file: ctx.file, value: ctx.file.name }),
            },
            {
              label: "Move to Trash",
              run: () => deleteFile(ctx.file),
              danger: true,
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
  danger?: boolean;
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
            onClick={() => {
              onClose();
              it.run();
            }}
            className={`w-full text-left px-3 py-1 text-[12px] hover:bg-black/5 dark:hover:bg-white/10 ${
              it.danger ? "text-red-600" : ""
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

import type { VaultFile as RustVaultFile } from "../lib/types";
function toVaultFileTs(f: RustVaultFile): VaultFile {
  return {
    path: f.path,
    relPath: f.rel_path,
    name: f.name,
    mtimeMs: f.mtime_ms,
    size: f.size,
  };
}
