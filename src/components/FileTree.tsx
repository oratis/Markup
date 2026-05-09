import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppStore } from "../store";
import { readFile } from "../lib/tauri";

export function FileTree() {
  const vaultRoot = useAppStore((s) => s.vaultRoot);
  const files = useAppStore((s) => s.vaultFiles);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);
  const activeTabId = useAppStore((s) => s.activeTabId);

  const sorted = useMemo(
    () => [...files].sort((a, b) => a.relPath.localeCompare(b.relPath)),
    [files],
  );

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26,
    overscan: 12,
  });

  if (!vaultRoot) {
    return (
      <div className="text-xs opacity-60 px-3 py-3">
        No vault open.<br />Use ⌘⇧O to open one.
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="text-xs opacity-60 px-3 py-3">
        Empty vault.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wider opacity-50 truncate">
        {vaultRoot.split("/").pop() || vaultRoot}
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
            return (
              <button
                key={file.path}
                title={file.relPath}
                onClick={async () => {
                  try {
                    const loaded = await readFile(file.path);
                    openLoadedFile(loaded);
                  } catch (e) {
                    console.error("readFile failed", e);
                  }
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start}px)`,
                  height: vi.size,
                }}
                className={`flex items-center gap-1 text-left px-3 text-[12px] whitespace-nowrap overflow-hidden text-ellipsis hover:bg-black/5 dark:hover:bg-white/10 ${
                  isActive ? "bg-black/10 dark:bg-white/15 font-medium" : ""
                }`}
              >
                <span className="opacity-50">·</span>
                <span className="truncate">{file.relPath}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
