import { openUrl } from "@tauri-apps/plugin-opener";
import { type RefObject, useCallback, useEffect } from "react";
import { showToast } from "../components/Toast";
import { splitEmbedTarget } from "../lib/embed-slice";
import { wikilinkAtCursor } from "../lib/follow-wikilink";
import { headingLineIndex, jumpToSourceLine, parseHeadings } from "../lib/headings";
import { installHoverPreview } from "../lib/hover-preview";
import type { useT } from "../lib/i18n";
import { subscribe as subscribeIndex } from "../lib/link-index-store";
import { isExternalHref, resolveDocHref } from "../lib/relative-link";
import { scrollToHeading } from "../lib/scroll-to-heading";
import { readFile } from "../lib/tauri";
import { headingForAnchor } from "../lib/toc";
import type { LoadedFile } from "../lib/types";
import { findVaultFile, wikilinkAtClick } from "../lib/wikilink";
import { getActiveTab, useAppStore, type VaultFile } from "../store";

interface EditorInteractionArgs {
  /** Scroll container hosting the WYSIWYG / CM6 editor DOM. */
  editorScrollRef: RefObject<HTMLElement | null>;
  sourceMode: boolean;
  setSourceMode: (v: boolean) => void;
  showWikilinkPicker: boolean;
  wikilinkPickerMode: "full" | "completion";
  setShowWikilinkPicker: (v: boolean) => void;
  setWikilinkPickerMode: (v: "full" | "completion") => void;
  setSearchInitialQuery: (v: string) => void;
  setShowSearch: (v: boolean) => void;
  openLoadedFile: (loaded: LoadedFile) => void;
  tr: ReturnType<typeof useT>;
}

/**
 * The editor surface's link + navigation wiring: follow / click /
 * auto-trigger for `[[wikilinks]]`, embed and tag-chip clicks, hover
 * preview, and the `markup:open-search` / `markup:jump-to-line` window
 * events that other panels dispatch. Listener wiring only — every effect
 * is verbatim from App.tsx and runs in the same relative order; all state
 * stays with the caller / the store.
 */
export function useEditorInteractions({
  editorScrollRef,
  sourceMode,
  setSourceMode,
  showWikilinkPicker,
  wikilinkPickerMode,
  setShowWikilinkPicker,
  setWikilinkPickerMode,
  setSearchInitialQuery,
  setShowSearch,
  openLoadedFile,
  tr,
}: EditorInteractionArgs) {
  // Open a resolved vault file and, when given, scroll to a heading. Shared
  // by the source follow, the WYSIWYG wikilink click, the embed click, and
  // the relative-markdown-link handler so all navigate `file#heading` alike.
  const openResolved = useCallback(
    async (hit: VaultFile, heading: string | null) => {
      try {
        const loaded = await readFile(hit.path);
        openLoadedFile(loaded);
        if (heading) {
          const idx = headingLineIndex(loaded.content, heading);
          if (idx >= 0) {
            window.requestAnimationFrame(() => {
              window.dispatchEvent(
                new CustomEvent("markup:jump-to-line", { detail: { line: idx } }),
              );
            });
          }
        }
      } catch (err) {
        console.error("open target failed", err);
        showToast(tr("toast.openFailed", hit.name));
      }
    },
    [openLoadedFile, tr],
  );

  // Resolve a `[[name]]` / `![[name]]` target (basename match, optional
  // `#heading`) and open it.
  const openTargetByName = useCallback(
    async (raw: string) => {
      const { file, heading } = splitEmbedTarget(raw);
      const hit = findVaultFile(useAppStore.getState().vaultFiles, file);
      if (!hit) {
        showToast(tr("toast.wikilinkMiss", file || raw));
        return;
      }
      await openResolved(hit, heading);
    },
    [openResolved, tr],
  );

  // Cmd+click on a `[[wikilink]]` in source mode — SourceEditor dispatches
  // a window event with the click position; resolve + open the file.
  useEffect(() => {
    const onFollow = (e: Event) => {
      const detail = (e as CustomEvent<{ pos: number }>).detail;
      const name = wikilinkAtCursor(detail?.pos);
      if (name) void openTargetByName(name);
    };
    window.addEventListener("markup:follow-wikilink-at-pos", onFollow);
    return () => window.removeEventListener("markup:follow-wikilink-at-pos", onFollow);
  }, [openTargetByName]);

  // Source-mode `[[` trigger: SourceEditor's CM6 input handler dispatches
  // markup:wikilink-trigger; we open the picker in completion mode here.
  useEffect(() => {
    const onTrigger = () => {
      if (showWikilinkPicker) return;
      setWikilinkPickerMode("completion");
      setShowWikilinkPicker(true);
    };
    window.addEventListener("markup:wikilink-trigger", onTrigger);
    return () => window.removeEventListener("markup:wikilink-trigger", onTrigger);
  }, [showWikilinkPicker]);

  // TagsPane (and future filter consumers) dispatch markup:open-search
  // with a `query` to pre-fill the cross-vault SearchPanel.
  useEffect(() => {
    const onOpenSearch = (e: Event) => {
      const detail = (e as CustomEvent).detail as { query?: string } | undefined;
      setSearchInitialQuery(detail?.query ?? "");
      setShowSearch(true);
    };
    window.addEventListener("markup:open-search", onOpenSearch);
    return () => window.removeEventListener("markup:open-search", onOpenSearch);
  }, []);

  // BacklinksPanel + other consumers dispatch markup:jump-to-line when they
  // open a file and want the source editor to scroll to a specific line.
  // Source-mode only; in WYSIWYG we just open the file and let the user
  // scroll. If we're not yet in source mode, switch first.
  useEffect(() => {
    const onJump = (e: Event) => {
      const detail = (e as CustomEvent).detail as { line?: number } | undefined;
      const line = detail?.line;
      if (typeof line !== "number") return;
      if (!useAppStore.getState().sourceMode) setSourceMode(true);
      // CM6 mount runs in a microtask after source-mode flips — defer.
      window.requestAnimationFrame(() => {
        jumpToSourceLine(line);
      });
    };
    window.addEventListener("markup:jump-to-line", onJump);
    return () => window.removeEventListener("markup:jump-to-line", onJump);
  }, [setSourceMode]);

  // Auto-trigger the wikilink picker when the user types `[[`. Only fires in
  // WYSIWYG (Milkdown / contenteditable) — source mode handles its own
  // detection via the CM6 input handler above.
  useEffect(() => {
    if (sourceMode) return;
    const host = editorScrollRef.current;
    if (!host) return;
    const onInput = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;
      const offset = range.startOffset;
      const text = node.textContent ?? "";

      // Picker only opens in "completion" mode; close it again if the
      // user backspaced through the `[[`.
      if (
        showWikilinkPicker &&
        wikilinkPickerMode === "completion" &&
        (offset < 2 || text.slice(offset - 2, offset) !== "[[")
      ) {
        setShowWikilinkPicker(false);
        setWikilinkPickerMode("full");
        return;
      }

      if (offset < 2) return;
      if (text.slice(offset - 2, offset) === "[[") {
        if (showWikilinkPicker) return; // don't double-open
        setWikilinkPickerMode("completion");
        setShowWikilinkPicker(true);
      }
    };
    host.addEventListener("input", onInput);
    return () => host.removeEventListener("input", onInput);
  }, [sourceMode, showWikilinkPicker, wikilinkPickerMode]);

  // Wikilink click handler — works in both Milkdown WYSIWYG and CM6 source mode.
  // Detects a click landing inside `[[name]]` text and opens the matching
  // vault file.
  useEffect(() => {
    const host = editorScrollRef.current;
    if (!host) return;
    const onClick = async (e: MouseEvent) => {
      // For source mode CM6 also fires click; same DOM-text logic applies.
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const name = wikilinkAtClick(range.startContainer, range.startOffset);
      if (!name) return;
      e.preventDefault();
      e.stopPropagation();
      void openTargetByName(name);
    };
    host.addEventListener("click", onClick);
    return () => host.removeEventListener("click", onClick);
  }, [openTargetByName]);

  // Click on an `.embed` decoration (`![[target]]`) → open the target
  // file in a new tab; if an `#heading` anchor is present, dispatch a
  // jump-to-line. Block-id (`^id`) jumps are handled the same way once
  // we surface block lines through the heading-index store.
  useEffect(() => {
    const host = editorScrollRef.current;
    if (!host) return;
    const onEmbedClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.(".embed") as HTMLElement | null;
      if (!el) return;
      const raw = el.getAttribute("data-embed-target");
      if (!raw) return;
      e.preventDefault();
      e.stopPropagation();
      void openTargetByName(raw);
    };
    host.addEventListener("click", onEmbedClick);
    return () => host.removeEventListener("click", onEmbedClick);
  }, [openTargetByName]);

  // Click on a tag chip (`.tag` decoration in WYSIWYG) → open
  // SearchPanel filtered by that tag. Mirrors the TagsPane behaviour.
  useEffect(() => {
    const host = editorScrollRef.current;
    if (!host) return;
    const onTagClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.(".tag") as HTMLElement | null;
      if (!el) return;
      const name = el.getAttribute("data-tag-name");
      if (!name) return;
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(
        new CustomEvent("markup:open-search", { detail: { query: `#${name}` } }),
      );
    };
    host.addEventListener("click", onTagClick);
    return () => host.removeEventListener("click", onTagClick);
  }, []);

  // Standard Markdown links in the reader — `[text](./other.md)`,
  // `[x](../api/y.md#sec)`, `[home](https://…)`. Relative doc links resolve
  // against the current file and open in-app (with a #heading jump); external
  // links open in the browser instead of navigating the webview away.
  useEffect(() => {
    const host = editorScrollRef.current;
    if (!host) return;
    const onLinkClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.(
        "a",
      ) as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href) return;
      if (isExternalHref(href)) {
        e.preventDefault();
        e.stopPropagation();
        void openUrl(href);
        return;
      }
      const current = getActiveTab(useAppStore.getState());
      if (!current) return;
      // In-page `#heading` anchor (e.g. an inserted TOC link) — scroll to the
      // matching heading in the current doc rather than letting the webview
      // navigate (Milkdown headings carry no id, so the default does nothing).
      if (href.startsWith("#")) {
        const frag = decodeURIComponent(href.slice(1));
        const h = headingForAnchor(parseHeadings(current.content), frag);
        if (!h) return;
        e.preventDefault();
        e.stopPropagation();
        scrollToHeading(h.text, h.level, h.line);
        return;
      }
      if (!current.path) return;
      const resolved = resolveDocHref(href, current.path);
      if (!resolved) return; // asset / unknown — leave default
      e.preventDefault();
      e.stopPropagation();
      const hit = useAppStore.getState().vaultFiles.find((f) => f.path === resolved.path);
      if (!hit) {
        showToast(tr("toast.wikilinkMiss", href));
        return;
      }
      void openResolved(hit, resolved.heading);
    };
    host.addEventListener("click", onLinkClick);
    return () => host.removeEventListener("click", onLinkClick);
  }, [openResolved, tr]);

  // Hover preview on `.wikilink` / `.embed` decorations — fetches the
  // target file's first N chars (or slice for #/^ anchors) after a
  // short dwell, mounts a floating tooltip until mouseout. Cache is
  // invalidated on any link-index mutation.
  useEffect(() => {
    const host = editorScrollRef.current;
    if (!host) return;
    const handle = installHoverPreview(host, {
      getVaultFiles: () => useAppStore.getState().vaultFiles,
      readFile: async (path) => {
        const loaded = await readFile(path);
        return loaded.content;
      },
      subscribeInvalidate: subscribeIndex,
    });
    return () => handle.uninstall();
  }, []);
}
