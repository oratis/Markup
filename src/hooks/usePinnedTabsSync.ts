import { useEffect } from "react";
import { getPinnedPaths, persistPinnedPath } from "../lib/pinned-paths";
import { useAppStore } from "../store";

interface TabLike {
  path: string | null;
  pinned?: boolean;
}

/**
 * Two-way bridge between the persisted pinned-path set and the in-memory tab
 * `pinned` flags. On mount, marks any open path-backed tab whose path is in
 * the persisted set as pinned. Thereafter, mirrors pin/unpin changes back to
 * the persisted set (diffs only).
 *
 * Behaviour-preserving extraction of the two pinned-tab effects from App.tsx.
 */
export function usePinnedTabsSync(tabs: ReadonlyArray<TabLike>) {
  // Apply persisted pins to the current tabs once on mount.
  useEffect(() => {
    const persisted = getPinnedPaths();
    if (persisted.size === 0) return;
    useAppStore.setState((s) => ({
      tabs: s.tabs.map((t) =>
        !t.pinned && t.path && persisted.has(t.path) ? { ...t, pinned: true } : t,
      ),
    }));
  }, []);

  // Mirror current pinned state back to the persisted set whenever tabs
  // change. Only path-backed tabs participate; persist diffs only.
  useEffect(() => {
    const known = getPinnedPaths();
    const wantPinned = new Set(
      tabs.filter((t) => t.pinned && t.path).map((t) => t.path as string),
    );
    for (const t of tabs) {
      if (!t.path) continue;
      const isPinned = wantPinned.has(t.path);
      const wasPinned = known.has(t.path);
      if (isPinned !== wasPinned) persistPinnedPath(t.path, isPinned);
    }
  }, [tabs]);
}
