/**
 * Focus mode + Typewriter mode driver.
 *
 * Subscribes to `selectionchange` and updates:
 *   - For focus: marks the active block element with `data-active` so the CSS
 *     can dim siblings.
 *   - For typewriter: scrolls the editor host so the cursor sits at the
 *     vertical center of the editor's viewport.
 *
 * Both modes are independently toggleable. Returns a disposer.
 */
export function installFocusTypewriter(opts: {
  scrollContainer: () => HTMLElement | null;
  enabled: () => { focus: boolean; typewriter: boolean };
}): () => void {
  let lastActive: HTMLElement | null = null;

  function clear() {
    if (lastActive) {
      lastActive.removeAttribute("data-active");
      lastActive = null;
    }
  }

  function findBlock(node: Node | null): HTMLElement | null {
    let n: Node | null = node;
    while (n && n.nodeType !== 1) n = n.parentNode;
    let el = n as HTMLElement | null;
    while (el?.parentElement) {
      const tag = el.tagName;
      if (
        tag === "P" ||
        tag === "H1" ||
        tag === "H2" ||
        tag === "H3" ||
        tag === "H4" ||
        tag === "H5" ||
        tag === "H6" ||
        tag === "LI" ||
        tag === "BLOCKQUOTE" ||
        tag === "PRE" ||
        tag === "TABLE"
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function onSelectionChange() {
    const { focus, typewriter } = opts.enabled();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const block = findBlock(range.startContainer);

    if (focus) {
      if (lastActive && lastActive !== block) {
        lastActive.removeAttribute("data-active");
      }
      if (block) {
        block.setAttribute("data-active", "");
        lastActive = block;
      }
    } else {
      clear();
    }

    if (typewriter && block) {
      const container = opts.scrollContainer();
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const blockRect = block.getBoundingClientRect();
      const target =
        blockRect.top -
        containerRect.top +
        container.scrollTop -
        containerRect.height / 2 +
        blockRect.height / 2;
      // Avoid spammy scroll on tiny deltas (< 6px)
      if (Math.abs(container.scrollTop - target) > 6) {
        container.scrollTo({ top: target, behavior: "smooth" });
      }
    }
  }

  document.addEventListener("selectionchange", onSelectionChange);
  return () => {
    document.removeEventListener("selectionchange", onSelectionChange);
    clear();
  };
}
