import { useSyncExternalStore } from "react";
import {
  getBookmarks,
  removeBookmark,
  subscribe as subscribeBookmarks,
} from "../lib/bookmarks";
import { useT } from "../lib/i18n";
import { readFile } from "../lib/tauri";
import { useAppStore } from "../store";

function basename(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(slash + 1) : path;
}

/** Pinned-files pane in the right aside. Click a row to open the file;
 *  × to unstar. Empty until the user runs "Toggle Bookmark for Active
 *  File" (or the future star button in the tab bar). */
export function BookmarksPane() {
  const t = useT();
  const paths = useSyncExternalStore(subscribeBookmarks, getBookmarks, () => EMPTY);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);

  async function open(path: string) {
    try {
      const loaded = await readFile(path);
      openLoadedFile(loaded);
    } catch (e) {
      console.error("bookmark open failed", e);
    }
  }

  if (paths.length === 0) return null;

  return (
    <div className="flex flex-col border-t border-black/5 dark:border-white/10 min-h-0">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wide opacity-60 flex items-center justify-between">
        <span>{t("bookmarks.title")}</span>
        <span className="opacity-60">{paths.length}</span>
      </div>
      <div className="overflow-y-auto no-scrollbar text-[12px] flex-1 min-h-0">
        {paths.map((path) => (
          <div
            key={path}
            className="flex items-center hover:bg-black/5 dark:hover:bg-white/10"
          >
            <button
              type="button"
              onClick={() => open(path)}
              title={path}
              className="flex-1 text-left px-3 py-1 opacity-80 hover:opacity-100 truncate"
            >
              ★ {basename(path)}
            </button>
            <button
              type="button"
              onClick={() => removeBookmark(path)}
              title={t("bookmarks.remove")}
              aria-label={t("bookmarks.remove")}
              className="opacity-40 hover:opacity-100 text-[11px] pr-3"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY: string[] = [];
