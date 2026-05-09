import { useAppStore } from "../store";

export function TabBar() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const closeTab = useAppStore((s) => s.closeTab);

  if (tabs.length <= 1) return null;

  return (
    <div className="flex items-stretch border-b border-black/5 dark:border-white/10 overflow-x-auto no-scrollbar bg-canvas-light dark:bg-canvas-dark">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const indicator = tab.status === "dirty" ? "●" : "";
        return (
          <div
            key={tab.id}
            className={`group titlebar-no-drag relative flex items-center gap-2 pl-3 pr-1 py-1.5 text-[12px] cursor-pointer border-r border-black/5 dark:border-white/10 select-none ${
              isActive
                ? "bg-canvas-light dark:bg-canvas-dark text-ink-light dark:text-ink-dark"
                : "opacity-60 hover:opacity-90"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="max-w-[180px] truncate">{tab.name}</span>
            <span className="text-[10px] opacity-70 w-2">{indicator}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/15 opacity-0 group-hover:opacity-100"
              aria-label="Close tab"
            >
              ×
            </button>
            {isActive && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-blue-500" />
            )}
          </div>
        );
      })}
    </div>
  );
}
