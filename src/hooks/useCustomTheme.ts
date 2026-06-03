import { useEffect } from "react";

/** id of the singleton <style> element holding the user's custom CSS. */
export const CUSTOM_CSS_STYLE_ID = "markup-custom-css";

/**
 * Injects the user's custom CSS snippet (Obsidian-snippet style) into the
 * document as a single `<style id="markup-custom-css">`, kept in sync with the
 * `customCss` setting. Empty CSS removes the element entirely.
 *
 * The snippet is injected verbatim — the author scopes their own selectors
 * (e.g. `.milkdown .editor h1 { … }`), matching how Obsidian CSS snippets work.
 * Extracted as a hook so it's behaviour-testable in isolation (jsdom).
 */
export function useCustomTheme(customCss: string) {
  useEffect(() => {
    applyCustomCss(customCss);
  }, [customCss]);
}

/** Create/update/remove the custom-CSS style element. Exported for tests. */
export function applyCustomCss(css: string): void {
  const existing = document.getElementById(CUSTOM_CSS_STYLE_ID);
  const trimmed = css.trim();

  if (!trimmed) {
    existing?.remove();
    return;
  }

  const el =
    existing instanceof HTMLStyleElement
      ? existing
      : (() => {
          const created = document.createElement("style");
          created.id = CUSTOM_CSS_STYLE_ID;
          document.head.appendChild(created);
          return created;
        })();
  if (el.textContent !== css) el.textContent = css;
}
