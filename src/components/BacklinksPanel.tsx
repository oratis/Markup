import { useSyncExternalStore } from "react";
import { useT } from "../lib/i18n";
import type { LinkRef } from "../lib/link-index";
import { getBacklinksFor, subscribe as subscribeIndex } from "../lib/link-index-store";
import { readFile } from "../lib/tauri";
import { getActiveTab, useAppStore } from "../store";

/** Subscribe a component to the link index for one specific target path. */
function useBacklinks(targetPath: string | null): LinkRef[] {
  return useSyncExternalStore(
    subscribeIndex,
    () => (targetPath ? getBacklinksFor(targetPath) : EMPTY),
    () => EMPTY,
  );
}
const EMPTY: LinkRef[] = [];

function basename(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(slash + 1) : path;
}

/** Right-pane backlinks list for the active tab. Grouped by source file;
 *  click a row to open that file. Empty when no incoming refs (or when
 *  the active tab is a scratch buffer without a vault path). */
export function BacklinksPanel() {
  const t = useT();
  const tab = useAppStore(getActiveTab);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);
  const refs = useBacklinks(tab?.path ?? null);

  // Group refs by their source file.
  const groups = new Map<string, LinkRef[]>();
  for (const r of refs) {
    const list = groups.get(r.sourcePath);
    if (list) list.push(r);
    else groups.set(r.sourcePath, [r]);
  }

  async function openRef(ref: LinkRef) {
    try {
      const loaded = await readFile(ref.sourcePath);
      openLoadedFile(loaded);
      // Defer the jump so the new tab's editor has time to mount.
      window.requestAnimationFrame(() => {
        window.dispatchEvent(
          new CustomEvent("markup:jump-to-line", { detail: { line: ref.line } }),
        );
      });
    } catch (e) {
      console.error("backlinks open failed", e);
    }
  }

  return (
    <div className="flex flex-col border-t border-black/5 dark:border-white/10 min-h-0">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wide opacity-60 flex items-center justify-between">
        <span>{t("backlinks.title")}</span>
        <span className="opacity-60">{refs.length}</span>
      </div>
      <div className="overflow-y-auto no-scrollbar text-[12px] flex-1 min-h-0">
        {refs.length === 0 && (
          <div className="px-3 py-2 opacity-50 text-[11px]">{t("backlinks.empty")}</div>
        )}
        {Array.from(groups.entries()).map(([sourcePath, list]) => (
          <div key={sourcePath} className="py-1.5">
            <div className="px-3 text-[11px] font-medium opacity-80 truncate">
              {basename(sourcePath)}
            </div>
            {list.map((ref, i) => (
              <button
                key={`${ref.sourcePath}:${ref.line}:${i}`}
                type="button"
                onClick={() => openRef(ref)}
                title={ref.snippet}
                className="block w-full text-left px-3 py-1 opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 truncate"
              >
                <span className="opacity-50 mr-2">L{ref.line + 1}</span>
                {ref.snippet}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
