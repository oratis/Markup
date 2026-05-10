/**
 * Detect URLs that look safe to wrap as a markdown link target. We're
 * intentionally restrictive — only http(s) and a couple of common
 * markup-friendly schemes. Anything else falls through to native paste.
 */
const URL_RE = /^(https?:\/\/|mailto:|markup:\/\/)\S+$/i;

export function looksLikeUrl(s: string): boolean {
  return URL_RE.test(s.trim());
}

interface InstallOpts {
  /**
   * Called with the markdown text to insert when smart-paste fires.
   * Returns true if the editor accepted the insert (caller will then
   * preventDefault on the original paste); false to let native paste
   * happen.
   */
  insertLink: (markdown: string) => boolean;
  /**
   * Returns the currently-selected plain text, or "" if there's no
   * selection. Implementation differs between Milkdown (DOM Selection)
   * and CodeMirror (state.sliceDoc).
   */
  getSelectionText: () => string;
}

/**
 * Install a paste handler on `target` that intercepts plain-text URLs
 * pasted over a non-empty selection and wraps them as
 * `[selection](url)`. All other pastes (no selection, non-URL text,
 * binary data, image files) fall through to the editor's native
 * behaviour.
 */
export function installSmartPaste(target: HTMLElement, opts: InstallOpts): () => void {
  const onPaste = (e: ClipboardEvent) => {
    const dt = e.clipboardData;
    if (!dt) return;
    // Skip when an image is being pasted (image-paste handler will run).
    for (const item of Array.from(dt.items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) return;
    }
    const text = dt.getData("text/plain");
    if (!text || !looksLikeUrl(text)) return;

    const selected = opts.getSelectionText();
    if (!selected) return;

    e.preventDefault();
    e.stopPropagation();
    const md = `[${selected}](${text.trim()})`;
    opts.insertLink(md);
  };

  target.addEventListener("paste", onPaste);
  return () => target.removeEventListener("paste", onPaste);
}
