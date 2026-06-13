import { useMemo } from "react";
import { useT } from "../lib/i18n";
import { readFile } from "../lib/tauri";
import { parentDir, siblingDocs } from "../lib/vault-order";
import { getActiveTab, useAppStore } from "../store";

function stem(name: string): string {
  return name.replace(/\.(md|markdown|mdx|mkd)$/i, "");
}

/**
 * "This section" — the Markdown docs sitting alongside the active file in its
 * folder, in file-tree order, with the current one highlighted. A focused
 * companion to the whole-vault FileTree for reading a folder of docs.
 */
export function SectionPane() {
  const t = useT();
  const vaultFiles = useAppStore((s) => s.vaultFiles);
  const vaultSort = useAppStore((s) => s.vaultSort);
  const vaultRoot = useAppStore((s) => s.vaultRoot);
  const tab = useAppStore(getActiveTab);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);
  const active = tab?.path ?? null;

  const sibs = useMemo(
    () => siblingDocs(vaultFiles, vaultSort, active),
    [vaultFiles, vaultSort, active],
  );

  if (sibs.length === 0) {
    return <div className="px-3 py-4 text-[12px] opacity-60">{t("section.empty")}</div>;
  }

  const dir = active ? parentDir(active) : "";
  const folder =
    dir && dir !== vaultRoot ? dir.slice(dir.lastIndexOf("/") + 1) : t("section.root");

  const open = async (path: string) => {
    if (path === active) return;
    try {
      openLoadedFile(await readFile(path));
    } catch (e) {
      console.error("section open failed", e);
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      <div
        className="px-3 py-2 text-[11px] uppercase tracking-wide opacity-60 truncate"
        title={dir}
      >
        {folder}
      </div>
      <div className="overflow-y-auto no-scrollbar text-[12px] flex-1 min-h-0">
        {sibs.map((f) => {
          const isActive = f.path === active;
          return (
            <button
              key={f.path}
              type="button"
              onClick={() => open(f.path)}
              title={f.relPath}
              className={`block w-full text-left px-3 py-1 truncate hover:bg-black/5 dark:hover:bg-white/10 ${
                isActive ? "font-medium opacity-100" : "opacity-80 hover:opacity-100"
              }`}
            >
              {stem(f.name)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
