import { useMemo } from "react";
import { getActiveTab, useAppStore } from "../store";

function countWords(text: string): number {
  // CJK characters each count as a word; runs of non-whitespace as one word.
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) ?? []).length;
  const nonCjk = text.replace(/[㐀-鿿豈-﫿]/g, " ");
  const words = nonCjk.trim().length === 0 ? 0 : nonCjk.trim().split(/\s+/).length;
  return cjk + words;
}

export function StatusBar() {
  const tab = useAppStore(getActiveTab);
  const sourceMode = useAppStore((s) => s.sourceMode);
  const vaultRoot = useAppStore((s) => s.vaultRoot);

  const stats = useMemo(() => {
    if (!tab) return { words: 0, chars: 0, lines: 0 };
    return {
      words: countWords(tab.content),
      chars: tab.content.length,
      lines: tab.content.split("\n").length,
    };
  }, [tab?.content]);

  const status = tab?.status ?? "saved";
  const statusLabel =
    status === "saved"
      ? "Saved"
      : status === "dirty"
        ? "Unsaved changes"
        : status === "saving"
          ? "Saving…"
          : `Error: ${tab?.errorMessage ?? "unknown"}`;

  return (
    <div className="statusbar flex items-center gap-3 h-6 px-3 text-[11px] opacity-70 border-t border-black/5 dark:border-white/10 select-none">
      <span>{sourceMode ? "Source" : "WYSIWYG"}</span>
      <span className="opacity-30">|</span>
      <span>{stats.words} words</span>
      <span>{stats.chars} chars</span>
      <span>{stats.lines} lines</span>
      <span className="flex-1" />
      {vaultRoot && <span className="truncate max-w-[260px]">{vaultRoot}</span>}
      <span className="opacity-30">|</span>
      <span aria-live="polite">{statusLabel}</span>
    </div>
  );
}
