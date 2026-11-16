import { useEffect, useId, useMemo, useRef, useState } from "react";
import { scoreSubsequence } from "../lib/fuzzy";
import { useT } from "../lib/i18n";
import { hasUnsavedChanges, useAppStore } from "../store";

export function OpenTabsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const [query, setQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(activeTabId);
  const [includePinned, setIncludePinned] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    const previous = document.activeElement;
    inputRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tabs;
    return tabs
      .map((tab) => ({
        tab,
        score: Math.max(
          scoreSubsequence(tab.name.toLowerCase(), q),
          scoreSubsequence((tab.path ?? "").toLowerCase(), q),
        ),
      }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => b.score - a.score)
      .map(({ tab }) => tab);
  }, [tabs, query]);
  const selectedIndex = Math.max(
    0,
    matches.findIndex((tab) => tab.id === highlightedId),
  );
  const selectedId = matches[selectedIndex]?.id;
  const active = tabs.find((tab) => tab.id === activeTabId);
  const pinnedCount = tabs.filter((tab) => tab.pinned).length;
  const eligible = tabs.filter((tab) => includePinned || !tab.pinned);
  const otherCount = eligible.filter((tab) => tab.id !== activeTabId).length;
  const keepsOtherPins =
    !includePinned && tabs.some((tab) => tab.pinned && tab.id !== activeTabId);

  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [selectedId, query, matches.length]);

  function activate(tabId: string) {
    const state = useAppStore.getState();
    if (!state.tabs.some((tab) => tab.id === tabId)) return;
    state.clearTabSelection();
    state.setActiveTab(tabId);
    onClose();
  }

  function closeBatch(keepCurrent: boolean) {
    // Search only narrows navigation. Bulk actions always use the full, live
    // tab list and current active id, including files opened while this is up.
    const state = useAppStore.getState();
    if (keepCurrent && !state.tabs.some((tab) => tab.id === state.activeTabId)) return;
    const victims = state.tabs.filter(
      (tab) =>
        (!keepCurrent || tab.id !== state.activeTabId) && (includePinned || !tab.pinned),
    );
    if (!victims.length) return;
    const closing = state.closeTabs(
      victims.map((tab) => tab.id),
      { includePinned },
    );
    // The store reports the outcome, including replacing Welcome with a new
    // Welcome of the same id. Native cancellation also restores search focus.
    const finish = (closed: boolean) => {
      if (closed) onClose();
      else inputRef.current?.focus();
    };
    if (typeof closing === "boolean") finish(closing);
    else void closing.then(finish);
  }

  return (
    <div
      className="mk-open-tabs-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="mk-open-tabs-dialog"
        onKeyDown={(event) => {
          // App-wide editor shortcuts must not act on the document behind
          // this modal while the user is typing or confirming a close.
          event.stopPropagation();
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "Tab") {
            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled):not([tabindex="-1"]), input:not(:disabled)',
            );
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <header className="mk-open-tabs-header">
          <h2 id={`${id}-title`}>
            {t("openTabs.title")}{" "}
            <span className="mk-open-tabs-total">{tabs.length}</span>
          </h2>
          <button
            type="button"
            className="mk-icon-btn"
            aria-label={t("openTabs.dismiss")}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="mk-open-tabs-search">
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4 4" />
          </svg>
          <input
            ref={inputRef}
            role="combobox"
            aria-label={t("openTabs.search")}
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={`${id}-results`}
            aria-activedescendant={
              selectedId ? `${id}-option-${selectedIndex}` : undefined
            }
            placeholder={t("openTabs.search")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlightedId(null);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
                return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const next = Math.max(
                  0,
                  Math.min(
                    matches.length - 1,
                    selectedIndex + (event.key === "ArrowDown" ? 1 : -1),
                  ),
                );
                setHighlightedId(matches[next]?.id ?? null);
              } else if (event.key === "Enter" && selectedId) {
                event.preventDefault();
                activate(selectedId);
              }
            }}
          />
          <span className="mk-open-tabs-result-count" aria-live="polite">
            {t("openTabs.results", matches.length, tabs.length)}
          </span>
        </div>
        <div
          className="mk-open-tabs-results"
          id={`${id}-results`}
          role="listbox"
          aria-label={t("openTabs.title")}
        >
          {matches.map((tab, index) => (
            <button
              key={tab.id}
              id={`${id}-option-${index}`}
              ref={index === selectedIndex ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              tabIndex={-1}
              className="mk-open-tabs-row"
              title={tab.path ?? t("openTabs.scratch")}
              onMouseEnter={() => setHighlightedId(tab.id)}
              onClick={() => activate(tab.id)}
            >
              <span className="mk-open-tabs-file-icon" aria-hidden="true">
                {tab.kind === "canvas" ? "◈" : tab.kind === "html" ? "‹›" : "▤"}
              </span>
              <span className="mk-open-tabs-file">
                <span className="mk-open-tabs-name">{tab.name}</span>
                <span className="mk-open-tabs-path">
                  {tab.path ?? t("openTabs.scratch")}
                </span>
              </span>
              {hasUnsavedChanges(tab) && (
                <span
                  className="mk-open-tabs-unsaved"
                  aria-label={t("status.dirty")}
                  title={t("status.dirty")}
                >
                  ●
                </span>
              )}
              {tab.pinned && (
                <span className="mk-open-tabs-badge">{t("openTabs.pinned")}</span>
              )}
              {tab.id === activeTabId && (
                <span className="mk-open-tabs-badge is-current">
                  {t("openTabs.current")}
                </span>
              )}
            </button>
          ))}
          {!matches.length && <p className="mk-open-tabs-empty">{t("openTabs.empty")}</p>}
        </div>
        <footer className="mk-open-tabs-footer">
          <div className="mk-open-tabs-current" title={active?.path ?? active?.name}>
            {t("openTabs.currentDocument", active?.name ?? "—")}
          </div>
          {pinnedCount > 0 && (
            <label className="mk-open-tabs-pins">
              <input
                type="checkbox"
                checked={includePinned}
                onChange={(event) => setIncludePinned(event.target.checked)}
              />
              {t("openTabs.includePinned", pinnedCount)}
            </label>
          )}
          <div className="mk-open-tabs-actions">
            <button
              type="button"
              disabled={!active || otherCount === 0}
              onClick={() => closeBatch(true)}
            >
              {t(
                keepsOtherPins
                  ? "openTabs.keepCurrentAndPinned"
                  : "openTabs.keepOnlyCurrent",
              )}
            </button>
            <button
              type="button"
              className="is-destructive"
              disabled={eligible.length === 0}
              onClick={() => closeBatch(false)}
            >
              {t(
                pinnedCount > 0 && !includePinned
                  ? "openTabs.closeUnpinned"
                  : "openTabs.closeAll",
                eligible.length,
              )}
            </button>
          </div>
          <div className="mk-open-tabs-footnote">
            <span>{t("openTabs.scope")}</span>
            <span>{t("openTabs.keyboard")}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
