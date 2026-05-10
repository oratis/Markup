import { getActiveTab, useAppStore } from "../store";
import { readFile } from "../lib/tauri";

interface Props {
  onReload?: () => void;
  onDismiss?: () => void;
}

/**
 * Banner shown when the active tab's on-disk mtime is newer than the
 * in-memory mtime (someone edited the file outside Markup). User can
 * reload or dismiss (and risk overwriting on next save).
 */
export function ReloadPrompt({ onReload, onDismiss }: Props) {
  const tab = useAppStore(getActiveTab);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);
  const setActiveStatus = useAppStore((s) => s.setActiveStatus);

  if (!tab?.path) return null;

  async function reload() {
    if (!tab?.path) return;
    try {
      const loaded = await readFile(tab.path);
      openLoadedFile(loaded);
      onReload?.();
    } catch (e) {
      setActiveStatus("error", String(e));
    }
  }

  return (
    <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border-b border-amber-300 dark:border-amber-700 px-4 py-2 flex items-center gap-3 text-[12px]">
      <span className="flex-1">
        File changed on disk since you opened it. Reload to see the latest
        version (your unsaved edits will be discarded).
      </span>
      <button
        onClick={reload}
        className="px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-700"
      >
        Reload
      </button>
      <button
        onClick={onDismiss}
        className="px-2 py-0.5 rounded hover:bg-amber-200 dark:hover:bg-amber-800"
      >
        Dismiss
      </button>
    </div>
  );
}
