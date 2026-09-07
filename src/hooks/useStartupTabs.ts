import { useEffect, useRef } from "react";
import { readSession } from "../lib/session";
import { listenOpenFiles, readFile, takePendingFiles } from "../lib/tauri";
import { WELCOME_TAB_ID, useAppStore } from "../store";

interface Options {
  /** Called once with the number of tabs brought back from the last session. */
  onRestored?: (count: number) => void;
  /** Called for every path the OS asked us to open, after it lands as a tab. */
  onOpened?: (path: string) => void;
}

/**
 * Everything that decides which document is on screen a second after launch:
 * files the OS handed us (Finder double-click / "Open With" / `open x.md`),
 * live opens while the app keeps running, and the restored tab session.
 *
 * These used to be two independent effects, each finishing on its own async
 * schedule, and whichever landed last won `activeTabId`. Restoring a session
 * with a big file in it reliably landed last — so double-clicking a Markdown
 * file opened its tab and then snapped the view back to whatever had been
 * active in the previous session. They are one ordered flow now:
 *
 *   1. listen, so a live open during startup is never dropped;
 *   2. open what the user actually asked for, first and focused;
 *   3. restore the rest of the session in the background (`activate: false`),
 *      and only take focus if nobody has claimed it.
 */
export function useStartupTabs({ onRestored, onOpened }: Options = {}) {
  const onRestoredRef = useRef(onRestored);
  onRestoredRef.current = onRestored;
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    // Never gated on `disposed`: the tab store is global and these paths have
    // already been taken off the Rust-side buffer, so bailing out would drop
    // the file the user double-clicked. (StrictMode's mount/unmount/mount in
    // dev makes that an every-launch case, not a theoretical one.)
    const openPaths = async (paths: string[]) => {
      for (const p of paths) {
        try {
          const loaded = await readFile(p);
          useAppStore.getState().openLoadedFile(loaded);
          onOpenedRef.current?.(p);
        } catch (e) {
          console.warn("open-file failed:", p, e);
        }
      }
    };

    // Registered before anything is awaited: an open that arrives mid-restore
    // still lands, and still wins the focus (it runs after this effect body).
    listenOpenFiles(openPaths).then((u) => {
      if (disposed) u();
      else unlisten = u;
    });

    (async () => {
      // Cold start via Finder: the open event fired before the webview
      // existed, so Rust buffered it. Drain and honour it first — the user is
      // waiting on this file, not on last session's tabs.
      const pending = await takePendingFiles().catch(() => [] as string[]);
      if (Array.isArray(pending) && pending.length > 0) await openPaths(pending);
      if (disposed) return;

      const sess = readSession();
      if (sess.open.length === 0) return;
      const all = await Promise.all(sess.open.map((p) => readFile(p).catch(() => null)));
      if (disposed) return;

      // Snapshot before we touch the tabs: anything other than the boot
      // scratch buffer means a document is already on screen — the pending
      // open above, a click in the file tree, a drop on the window — and the
      // restore is not allowed to pull the user off it.
      const before = useAppStore.getState();
      const claimed =
        before.activeTabId !== WELCOME_TAB_ID &&
        before.tabs.some((t) => t.id === before.activeTabId);

      let restored = 0;
      for (const loaded of all) {
        if (!loaded) continue;
        useAppStore.getState().openLoadedFile(loaded, { activate: false });
        restored += 1;
      }
      // `setActiveTab` ignores a path whose file has since gone missing, so a
      // half-restorable session leaves us on the first tab rather than blank.
      if (!claimed && sess.active) useAppStore.getState().setActiveTab(sess.active);
      if (restored > 0) onRestoredRef.current?.(restored);
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}
