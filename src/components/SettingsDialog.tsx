import { useState } from "react";
import { type Settings, useAppStore } from "../store";

interface Props {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: Props) {
  const fontSize = useAppStore((s) => s.fontSize);
  const proseMaxWidth = useAppStore((s) => s.proseMaxWidth);
  const autosaveMs = useAppStore((s) => s.autosaveMs);
  const imagePasteDir = useAppStore((s) => s.imagePasteDir);
  const setSettings = useAppStore((s) => s.setSettings);

  const [draft, setDraft] = useState<Settings>({
    fontSize,
    proseMaxWidth,
    autosaveMs,
    imagePasteDir,
  });

  function commit(patch: Partial<Settings>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setSettings(patch); // live-apply
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] max-w-[92vw] rounded-lg shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 p-5"
      >
        <div className="text-base font-semibold mb-4">Settings</div>

        <div className="space-y-4 text-[12px]">
          <Row label="Font size" hint={`${draft.fontSize}px`}>
            <input
              type="range"
              min={11}
              max={24}
              value={draft.fontSize}
              onChange={(e) => commit({ fontSize: Number(e.target.value) })}
              className="flex-1"
            />
          </Row>

          <Row label="Prose width" hint={`${draft.proseMaxWidth}px`}>
            <input
              type="range"
              min={480}
              max={1200}
              step={20}
              value={draft.proseMaxWidth}
              onChange={(e) => commit({ proseMaxWidth: Number(e.target.value) })}
              className="flex-1"
            />
          </Row>

          <Row
            label="Autosave delay"
            hint={draft.autosaveMs === 0 ? "Disabled" : `${draft.autosaveMs}ms`}
          >
            <input
              type="range"
              min={0}
              max={2000}
              step={50}
              value={draft.autosaveMs}
              onChange={(e) => commit({ autosaveMs: Number(e.target.value) })}
              className="flex-1"
            />
          </Row>

          <Row label="Image paste folder" hint="(relative to vault root)">
            <input
              type="text"
              value={draft.imagePasteDir}
              onChange={(e) => commit({ imagePasteDir: e.target.value })}
              placeholder="assets"
              className="flex-1 px-2 py-1 rounded border border-black/10 dark:border-white/20 bg-transparent outline-none focus:border-blue-500"
            />
          </Row>
        </div>

        <div className="mt-6 flex items-center justify-between text-[11px]">
          <button
            onClick={() => {
              const defaults = {
                fontSize: 16,
                proseMaxWidth: 720,
                autosaveMs: 300,
                imagePasteDir: "assets",
              };
              commit(defaults);
            }}
            className="opacity-70 hover:opacity-100 underline"
          >
            Restore defaults
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-[120px] shrink-0 opacity-80">{label}</div>
      <div className="flex-1 flex items-center gap-3">{children}</div>
      {hint && (
        <div className="shrink-0 text-[11px] opacity-60 w-[80px] text-right">{hint}</div>
      )}
    </div>
  );
}
