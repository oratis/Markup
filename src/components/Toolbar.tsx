import { getActiveTab, useAppStore } from "../store";

export function Toolbar() {
  const tab = useAppStore(getActiveTab);
  const sourceMode = useAppStore((s) => s.sourceMode);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleSourceMode = useAppStore((s) => s.toggleSourceMode);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  const fileName = tab?.name ?? "Untitled";
  const dirty = tab?.status === "dirty" ? "● " : "";

  return (
    <div className="titlebar-drag flex items-center gap-2 px-2 h-9 border-b border-black/5 dark:border-white/10 select-none bg-canvas-light dark:bg-canvas-dark">
      <div className="w-[68px] shrink-0" aria-hidden />
      <button
        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        onClick={toggleSidebar}
        className="titlebar-no-drag w-7 h-7 flex items-center justify-center text-sm rounded hover:bg-black/5 dark:hover:bg-white/10"
      >
        ☰
      </button>
      <div className="flex-1 text-center text-xs opacity-70 truncate">
        {dirty}
        {fileName}
      </div>
      <button
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
