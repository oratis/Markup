/**
 * Hover preview for wikilinks and embeds in WYSIWYG. Installs
 * mouseover/mouseout listeners on a host element; when the pointer
 * settles on an `.wikilink` or `.embed` decoration for the dwell
 * timeout, fetches the target file and pops a small tooltip showing
 * its first ~280 chars (or the slice for `#heading`/`^block` anchors).
 *
 * Cache: per-target-path file content, keyed by path. Invalidated by
 * the link-index store's subscribe — when any save happens, we drop
 * the whole cache (cheap; ~100 entries max in typical use).
 *
 * Why DOM events instead of pure CSS `:hover` + `::after`: tooltip
 * needs file content which is async, and we want the dwell debounce
 * to avoid spamming readFile on quick mouse passes.
 */

import type { VaultFile } from "../store";
import { findBlock, findSectionByHeading, splitEmbedTarget } from "./embed-slice";
import { findVaultFile } from "./wikilink";

interface HoverPreviewOptions {
  /** Source of truth for the vault file list, called fresh each hover
   *  so vault rebuilds are reflected without re-installing. */
  getVaultFiles: () => VaultFile[];
  /** Read a file's content from disk. */
  readFile: (path: string) => Promise<string>;
  /** Called when the index changes — used to invalidate the cache. */
  subscribeInvalidate: (cb: () => void) => () => void;
}

const DWELL_MS = 320;
const SNIPPET_CAP = 280;

interface InstallHandle {
  uninstall: () => void;
}

export function installHoverPreview(
  host: HTMLElement,
  opts: HoverPreviewOptions,
): InstallHandle {
  const cache = new Map<string, string>();
  const unsubInvalidate = opts.subscribeInvalidate(() => cache.clear());

  let tooltip: HTMLDivElement | null = null;
  let dwellTimer: number | null = null;
  let lastEl: HTMLElement | null = null;
  let abortGen = 0;

  function hideTooltip() {
    if (tooltip?.parentNode) tooltip.parentNode.removeChild(tooltip);
    tooltip = null;
  }

  function ensureTooltip(): HTMLDivElement {
    if (tooltip) return tooltip;
    const el = document.createElement("div");
    el.setAttribute("data-markup-hover-preview", "");
    el.className = "markup-hover-preview";
    document.body.appendChild(el);
    tooltip = el;
    return el;
  }

  function placeTooltip(target: HTMLElement) {
    const el = ensureTooltip();
    const rect = target.getBoundingClientRect();
    const top = window.scrollY + rect.bottom + 6;
    const left = window.scrollX + rect.left;
    el.style.position = "absolute";
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.maxWidth = "340px";
    el.style.zIndex = "60";
  }

  async function loadAndShow(el: HTMLElement) {
    const gen = ++abortGen;
    const isEmbed = el.classList.contains("embed");
    const raw =
      el.getAttribute(isEmbed ? "data-embed-target" : "data-wikilink-name") ?? "";
    if (!raw) return;
    const { file, heading, blockId } = splitEmbedTarget(raw);
    const vault = opts.getVaultFiles();
    const hit = findVaultFile(vault, file);
    if (!hit) {
      const t = ensureTooltip();
      placeTooltip(el);
      t.textContent = `No match: ${file}`;
      return;
    }

    let content = cache.get(hit.path);
    if (content === undefined) {
      try {
        content = await opts.readFile(hit.path);
        if (gen !== abortGen) return; // a newer hover started
        cache.set(hit.path, content);
      } catch {
        const t = ensureTooltip();
        placeTooltip(el);
        t.textContent = `Failed to read ${file}`;
        return;
      }
    }

    let snippet: string;
    if (heading) {
      snippet =
        findSectionByHeading(content, heading) ?? `(heading "${heading}" missing)`;
    } else if (blockId) {
      snippet = findBlock(content, blockId) ?? `(block ^${blockId} missing)`;
    } else {
      snippet = content;
    }
    snippet = snippet.trim().slice(0, SNIPPET_CAP);
    if (gen !== abortGen) return;
    const t = ensureTooltip();
    placeTooltip(el);
    t.textContent = snippet || "(empty)";
  }

  function onMouseOver(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    const el = target?.closest?.(".wikilink, .embed") as HTMLElement | null;
    if (!el || el === lastEl) return;
    lastEl = el;
    if (dwellTimer !== null) {
      window.clearTimeout(dwellTimer);
    }
    dwellTimer = window.setTimeout(() => {
      dwellTimer = null;
      loadAndShow(el);
    }, DWELL_MS);
  }

  function onMouseOut(e: MouseEvent) {
    const related = e.relatedTarget as HTMLElement | null;
    if (related && lastEl?.contains(related)) return;
    lastEl = null;
    if (dwellTimer !== null) {
      window.clearTimeout(dwellTimer);
      dwellTimer = null;
    }
    abortGen++;
    hideTooltip();
  }

  host.addEventListener("mouseover", onMouseOver);
  host.addEventListener("mouseout", onMouseOut);

  return {
    uninstall: () => {
      host.removeEventListener("mouseover", onMouseOver);
      host.removeEventListener("mouseout", onMouseOut);
      if (dwellTimer !== null) window.clearTimeout(dwellTimer);
      hideTooltip();
      unsubInvalidate();
    },
  };
}
