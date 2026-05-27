import { insertMarkdown, toggleWrap, wrapMarkdown } from "../lib/insert-md";
import { getActiveTab, useAppStore } from "../store";

interface ToolbarProps {
  /** Optional handler invoked when the user clicks the link icon. The
   * App owns the prompt-based fallback so the toolbar stays UI-only. */
  onInsertLink?: () => void;
}

interface FormatButton {
  label: string;
  title: string;
  run: () => void;
}

function vaultBasename(path: string | null): string | null {
  if (!path) return null;
  const parts = path.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || path;
}

export function Toolbar({ onInsertLink }: ToolbarProps) {
  const tab = useAppStore(getActiveTab);
  const vaultRoot = useAppStore((s) => s.vaultRoot);
  const sourceMode = useAppStore((s) => s.sourceMode);
  const readMode = useAppStore((s) => s.readMode);
  const setReadMode = useAppStore((s) => s.setReadMode);
  const toggleOutline = useAppStore((s) => s.toggleOutline);
  const toggleSourceMode = useAppStore((s) => s.toggleSourceMode);
  const outlineOpen = useAppStore((s) => s.outlineOpen);

  const mode: "read" | "edit" | "source" = sourceMode
    ? "source"
    : readMode
      ? "read"
      : "edit";
  const cycleMode = () => {
    // read → edit → source → read
    if (mode === "read") {
      setReadMode(false);
    } else if (mode === "edit") {
      toggleSourceMode();
    } else {
      toggleSourceMode();
      setReadMode(true);
    }
  };

  const fileName = tab?.name ?? "Untitled";
  const dirty = tab?.status === "dirty";
  const vaultName = vaultBasename(vaultRoot);

  const fmtButtons: FormatButton[] = [
    { label: "B", title: "Bold (⌘B)", run: () => toggleWrap("**", "**") },
    { label: "I", title: "Italic (⌘I)", run: () => toggleWrap("*", "*") },
    { label: "<>", title: "Inline code (⌘E)", run: () => toggleWrap("`", "`") },
    {
      label: "🔗",
      title: "Insert link (⌘K)",
      run: () => {
        if (onInsertLink) onInsertLink();
        else wrapMarkdown("[", "]()");
      },
    },
    { label: "—", title: "Horizontal rule", run: () => insertMarkdown("\n\n---\n\n") },
  ];

  return (
    <div className="mk-titlebar-wrap select-none">
      {/* Row 1 — Title bar: vault > file (breadcrumb), drag region.
          Sidebar toggle lives on the Ribbon (leftmost column) — it's
          already at the very-left of the window, no duplicate here. */}
      <div className="titlebar-drag mk-titlebar flex items-center gap-3 px-3 h-10 border-b border-black/5 dark:border-white/10 bg-canvas-light dark:bg-canvas-dark">
        <div className="w-[68px] shrink-0" aria-hidden />
        <div className="mk-breadcrumb flex items-center gap-1.5 min-w-0 flex-1">
          <span className="mk-app-mark" aria-hidden>◆</span>
          <span className="mk-app-name">Markup</span>
          {vaultName && (
            <>
              <span className="mk-sep">/</span>
              <span className="mk-vault-name truncate" title={vaultRoot ?? undefined}>{vaultName}</span>
            </>
          )}
          <span className="mk-sep">/</span>
          <span className="mk-file-name truncate" title={tab?.path ?? fileName}>
            {fileName}
            {dirty && <span className="mk-dirty" aria-label="Unsaved changes" />}
          </span>
        </div>
        <div className="titlebar-no-drag flex items-center gap-1">
          <button
            type="button"
            title={outlineOpen ? "Hide right panel (⌘⌥B)" : "Show right panel (⌘⌥B)"}
            onClick={toggleOutline}
            className="mk-icon-btn"
            aria-label="Toggle right panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="15" y1="4" x2="15" y2="20"/></svg>
          </button>
        </div>
      </div>

      {/* Row 2 — Format toolbar (no drag). Format buttons only make
          sense when there's an editable surface (Edit / Source). In
          Read mode they would insert raw markdown text into the DOM
          via window.getSelection() because Milkdown is read-only —
          producing visible `***` / `---` junk. So we suppress them. */}
      <div className="mk-toolbar titlebar-no-drag flex items-center gap-2 pl-2 pr-2 h-9 border-b border-black/5 dark:border-white/10 bg-canvas-light dark:bg-canvas-dark">
        {mode !== "read" && (
          <div className="flex items-center gap-0.5">
            {fmtButtons.map((b) => (
              <button
                type="button"
                key={b.label}
                title={b.title}
                aria-label={b.title}
                onClick={b.run}
                className="mk-format-btn w-7 h-7 flex items-center justify-center text-[11px] font-mono rounded"
              >
                {b.label}
              </button>
            ))}
          </div>
        )}
        {mode === "read" && (
          <div className="mk-toolbar-hint text-[11px] opacity-50 select-none pl-1">
            Read mode · press <kbd className="mk-kbd">E</kbd> to edit
          </div>
        )}
        <span className="flex-1" />
        <button
          type="button"
          title={
            mode === "read"
              ? "Read mode — press E or click to edit"
              : mode === "edit"
                ? "Edit mode — ⌘/ for source, Esc for read"
                : "Source mode (⌘/)"
          }
          onClick={cycleMode}
          className={`mk-mode-pill text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full is-${mode}`}
        >
          {mode === "read" ? "Read" : mode === "edit" ? "Edit" : "Source"}
        </button>
      </div>
    </div>
  );
}
