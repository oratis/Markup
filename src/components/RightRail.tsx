import { useEffect, useState } from "react";
import { BacklinksPanel } from "./BacklinksPanel";
import { BookmarksPane } from "./BookmarksPane";
import { Outline } from "./Outline";
import { SectionPane } from "./SectionPane";
import { TagsPane } from "./TagsPane";

type RailTab = "outline" | "section" | "backlinks" | "tags" | "bookmarks";

const STORAGE_KEY = "markup.rightRail.tab";

const TABS: { key: RailTab; label: string; title: string }[] = [
  { key: "outline", label: "Outline", title: "Outline (⌘⌥O)" },
  { key: "section", label: "Section", title: "Documents in this folder" },
  { key: "backlinks", label: "Backlinks", title: "Backlinks" },
  { key: "tags", label: "Tags", title: "Tags" },
  { key: "bookmarks", label: "Bookmarks", title: "Bookmarks" },
];

function loadInitial(): RailTab {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (
      v === "outline" ||
      v === "section" ||
      v === "backlinks" ||
      v === "tags" ||
      v === "bookmarks"
    )
      return v;
  } catch {
    /* ignore */
  }
  return "outline";
}

export function RightRail() {
  const [active, setActive] = useState<RailTab>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, active);
    } catch {
      /* ignore */
    }
  }, [active]);

  return (
    <div className="mk-rail flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <div className="mk-rail-tabs flex items-center gap-0.5 px-2 py-1.5 border-b overflow-x-auto no-scrollbar shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            title={t.title}
            onClick={() => setActive(t.key)}
            className={`mk-rail-tab shrink-0 ${active === t.key ? "is-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
        {active === "outline" && <Outline />}
        {active === "section" && <SectionPane />}
        {active === "backlinks" && <BacklinksPanel />}
        {active === "tags" && <TagsPane />}
        {active === "bookmarks" && <BookmarksPane />}
      </div>
    </div>
  );
}
