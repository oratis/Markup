import { useAppStore } from "../store";
import { openFileDialog } from "../lib/tauri";

export function Toolbar() {
  const file = useAppStore((s) => s.file);
  const status = useAppStore((s) => s.status);
  const errorMessage = useAppStore((s) => s.errorMessage);
  const setFile = useAppStore((s) => s.setFile);

  async function handleOpen() {
    try {
      const result = await openFileDialog();
      if (result) setFile(result);
    } catch (e) {
      console.error("open_file failed", e);
    }
  }

  const fileName = file
    ? file.path.split("/").pop() || file.path
    : "No file";

  const statusLabel =
    status === "saved"
      ? "Saved"
      : status === "dirty"
        ? "Unsaved changes"
        : status === "saving"
          ? "Saving…"
          : `Error: ${errorMessage ?? "unknown"}`;

  return (
    <div className="titlebar-drag flex items-center gap-3 px-4 h-9 border-b border-black/5 dark:border-white/10 select-none">
      {/* macOS traffic-light spacer */}
      <div className="w-[68px] shrink-0" aria-hidden />

      <div className="flex-1 text-center text-xs opacity-70 truncate">
        {fileName}
      </div>

      <div className="titlebar-no-drag flex items-center gap-2">
        <button
          onClick={handleOpen}
          className="text-xs px-2 py-0.5 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Open…
        </button>
        <span
          className="statusbar text-[11px] opacity-60"
          aria-live="polite"
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
