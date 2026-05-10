import type { EditorView } from "@codemirror/view";

/**
 * Single-window-scoped reference to the most recently mounted source-mode
 * EditorView. Used by Outline to scroll the source editor to a specific
 * heading line — DOM querying for "the H1 with this text" doesn't work in
 * CM6 because it renders flat .cm-line spans, not real <h1>.
 */
let active: EditorView | null = null;

export function setActiveSourceView(v: EditorView | null) {
  active = v;
}

export function getActiveSourceView(): EditorView | null {
  return active;
}
