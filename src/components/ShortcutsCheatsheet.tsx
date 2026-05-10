import { useSyncExternalStore } from "react";
import { useT } from "../lib/i18n";
import {
  type ShortcutId,
  currentBindings,
  defaults,
  labels,
  subscribe,
} from "../lib/shortcuts";

interface Props {
  onClose: () => void;
}

const IDS = Object.keys(defaults) as ShortcutId[];

function prettify(s: string): string {
  return s
    .replace(/Mod/g, "⌘")
    .replace(/Shift/g, "⇧")
    .replace(/Alt/g, "⌥")
    .replace(/ArrowLeft/g, "←")
    .replace(/ArrowRight/g, "→")
    .replace(/ArrowUp/g, "↑")
    .replace(/ArrowDown/g, "↓")
    .replace(/\+/g, "");
}

/**
 * Read-only popup that lists every registered shortcut + its current
 * binding. Mirrors the editor in the Settings dialog but doesn't allow
 * editing — meant for quick reference when a user can't remember a
 * binding.
 */
export function ShortcutsCheatsheet({ onClose }: Props) {
  const t = useT();
  const bindings = useSyncExternalStore(subscribe, currentBindings, currentBindings);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] max-w-[92vw] max-h-[80vh] flex flex-col rounded-lg shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15"
      >
        <div className="px-5 pt-4 pb-2 text-base font-semibold">
          {t("cheatsheet.title")}
        </div>
        <div className="flex-1 overflow-auto no-scrollbar px-5 pb-2 text-[12px]">
          {IDS.map((id) => (
            <div
              key={id}
              className="flex items-center gap-3 py-1 border-b border-black/5 dark:border-white/10 last:border-0"
            >
              <div className="flex-1 truncate opacity-80">{labels[id]}</div>
              <span className="font-mono text-[11px] opacity-70">
                {prettify(bindings[id])}
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-[12px] rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("about.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
