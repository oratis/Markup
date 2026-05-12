import { useMemo, useState, useSyncExternalStore } from "react";
import { useT } from "../lib/i18n";
import { allTagsWithCounts, subscribe as subscribeTags } from "../lib/tag-index-store";

interface TagSummary {
  tag: string;
  count: number;
}

function useTagSnapshot(): TagSummary[] {
  return useSyncExternalStore(subscribeTags, allTagsWithCounts, () => EMPTY);
}
const EMPTY: TagSummary[] = [];

/** Vault-wide tag pane stacked under the BacklinksPanel in the right
 *  aside. Lists every tag alphabetically with its file count; a filter
 *  input narrows the list (substring, case-insensitive). Clicking a tag
 *  opens the cross-vault search panel pre-filled with the tag text so
 *  the user lands on every file that uses it. */
export function TagsPane() {
  const t = useT();
  const tags = useTagSnapshot();
  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    if (!filter.trim()) return tags;
    const q = filter.toLowerCase();
    return tags.filter((x) => x.tag.toLowerCase().includes(q));
  }, [tags, filter]);

  function openTagSearch(tag: string) {
    window.dispatchEvent(
      new CustomEvent("markup:open-search", { detail: { query: `#${tag}` } }),
    );
  }

  return (
    <div className="flex flex-col border-t border-black/5 dark:border-white/10 min-h-0">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wide opacity-60 flex items-center justify-between">
        <span>{t("tags.title")}</span>
        <span className="opacity-60">{tags.length}</span>
      </div>
      {tags.length > 0 && (
        <div className="px-3 pb-1">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("tags.filter")}
            className="w-full px-2 py-0.5 text-[11px] rounded border border-black/10 dark:border-white/20 bg-transparent outline-none focus:border-blue-500"
          />
        </div>
      )}
      <div className="overflow-y-auto no-scrollbar text-[12px] flex-1 min-h-0">
        {tags.length === 0 && (
          <div className="px-3 py-2 opacity-50 text-[11px]">{t("tags.empty")}</div>
        )}
        {visible.map(({ tag, count }) => (
          <button
            key={tag}
            type="button"
            onClick={() => openTagSearch(tag)}
            title={tag}
            className="w-full text-left px-3 py-1 flex items-center justify-between opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <span className="truncate">#{tag}</span>
            <span className="opacity-50 ml-2 shrink-0">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
