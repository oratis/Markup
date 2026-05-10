import { insertMarkdown, wrapMarkdown } from "../lib/insert-md";
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

export function Toolbar({ onInsertLink }: ToolbarProps) {
  const tab = useAppStore(getActiveTab);
  const sourceMode = useAppStore((s) => s.sourceMode);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleSourceMode = useAppStore((s) => s.toggleSourceMode);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  const fileName = tab?.name ?? "Untitled";
  const dirty = tab?.status === "dirty" ? "● " : "";

  const fmtButtons: FormatButton[] = [
    { label: "B", title: "Bold (⌘B)", run: () => wrapMarkdown("**", "**") },
    { label: "I", title: "Italic (⌘I)", run: () => wrapMarkdown("*", "*") },
    { label: "<>", title: "Inline code (⌘E)", run: () => wrapMarkdown("`", "`") },
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
    <div className="titlebar-drag flex items-center gap-2 px-2 h-9 border-b border-black/5 dark:border-white/10 select-none bg-canvas-light dark:bg-canvas-dark">
      <div className="w-[68px] shrink-0" aria-hidden />
      <button
        type="button"
        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        onClick={toggleSidebar}
        className="titlebar-no-drag w-7 h-7 flex items-center justify-center text-sm rounded hover:bg-black/5 dark:hover:bg-white/10"
      >
        ☰
      </button>
      <div className="titlebar-no-drag flex items-center gap-0.5 px-1 border-l border-black/10 dark:border-white/15">
        {fmtButtons.map((b) => (
          <button
            type="button"
            key={b.label}
            title={b.title}
            aria-label={b.title}
            onClick={b.run}
            className="w-7 h-7 flex items-center justify-center text-[11px] font-mono rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="flex-1 text-center text-xs opacity-70 truncate">
        {dirty}
        {fileName}
      </div>
      <button
        type="button"
        title="Toggle source mode (⌘/)"
        onClick={toggleSourceMode}
        className={`titlebar-no-drag text-xs px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
          sourceMode ? "bg-black/10 dark:bg-white/15" : ""
        }`}
      >
        {sourceMode ? "Source" : "WYSIWYG"}
      </button>
    </div>
  );
}
