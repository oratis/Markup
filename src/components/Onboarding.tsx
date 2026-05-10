import { useT } from "../lib/i18n";

interface Props {
  onOpenVault: () => void;
  onOpenFile: () => void;
  onSkip: () => void;
}

const SHORTCUTS: { key: keyof import("../lib/locales/en").Strings; acc: string }[] = [
  { key: "onboard.kb.openFile", acc: "⌘O" },
  { key: "onboard.kb.openVault", acc: "⌘⇧O" },
  { key: "onboard.kb.toggleMode", acc: "⌘/" },
  { key: "onboard.kb.quickOpen", acc: "⌘P" },
  { key: "onboard.kb.searchVault", acc: "⌘⇧F" },
  { key: "onboard.kb.commandPalette", acc: "⌘⇧P" },
  { key: "onboard.kb.find", acc: "⌘F" },
  { key: "onboard.kb.settings", acc: "⌘," },
];

export function Onboarding({ onOpenVault, onOpenFile, onSkip }: Props) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onSkip}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] max-w-[92vw] rounded-lg shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 p-6"
      >
        <div className="text-center">
          <div className="text-2xl font-semibold">{t("onboard.title")}</div>
          <div className="text-xs opacity-70 mt-1">{t("onboard.subtitle")}</div>
        </div>

        <div className="mt-6 text-[11px] uppercase tracking-wider opacity-50">
          {t("onboard.shortcuts")}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
          {SHORTCUTS.map((s) => (
            <div
              key={s.acc}
              className="flex items-center justify-between border-b border-black/5 dark:border-white/5 py-1"
            >
              <span>{t(s.key)}</span>
              <kbd className="text-[11px] font-mono opacity-70">{s.acc}</kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 text-[12px]">
          <button
            onClick={onSkip}
            className="px-3 py-1 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("onboard.skip")}
          </button>
          <button
            onClick={onOpenFile}
            className="px-3 py-1 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("onboard.openFile")}
          </button>
          <button
            onClick={onOpenVault}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {t("onboard.openVault")}
          </button>
        </div>
      </div>
    </div>
  );
}
