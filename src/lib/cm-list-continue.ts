import type { EditorView, KeyBinding } from "@codemirror/view";

/**
 * On Enter at the end of a list line, auto-insert the next marker:
 *   - "- item" + Enter → next line starts with "- "
 *   - "1. item" + Enter → next line starts with "2. "
 *   - "- [ ] item" + Enter → next line starts with "- [ ] "
 *
 * Pressing Enter on an *empty* list line ("- " with nothing after it)
 * strips the marker on the current line instead — the standard
 * Markdown editor "exit list" gesture.
 *
 * Indentation in the leading whitespace is preserved.
 */
const BULLET_RE = /^(\s*)([-*+])\s+(.*)$/;
const NUMBERED_RE = /^(\s*)(\d+)([.)])\s+(.*)$/;
const TASK_RE = /^(\s*)([-*+])\s+\[[ xX]\]\s+(.*)$/;
const INDENT = "  ";

/** Detect whether a line looks like any flavour of list item. */
function isListLine(text: string): boolean {
  return TASK_RE.test(text) || NUMBERED_RE.test(text) || BULLET_RE.test(text);
}

/** Add or remove one level of indentation on the current list line.
 * No-op when the cursor isn't on a list line. */
function changeListIndent(view: EditorView, direction: "in" | "out"): boolean {
  const sel = view.state.selection.main;
  if (sel.from !== sel.to) return false;
  const line = view.state.doc.lineAt(sel.from);
  if (!isListLine(line.text)) return false;
  if (direction === "in") {
    view.dispatch({
      changes: { from: line.from, insert: INDENT },
      selection: { anchor: sel.from + INDENT.length },
      userEvent: "input.indent",
    });
    return true;
  }
  // Outdent: strip up to INDENT.length leading spaces.
  const lead = line.text.match(/^[\t ]*/)?.[0] ?? "";
  if (lead.length === 0) return false;
  const removeCount = lead.startsWith(INDENT) ? INDENT.length : 1;
  view.dispatch({
    changes: { from: line.from, to: line.from + removeCount, insert: "" },
    selection: { anchor: Math.max(line.from, sel.from - removeCount) },
    userEvent: "delete.outdent",
  });
  return true;
}

export const continueListKeymap: KeyBinding[] = [
  {
    key: "Tab",
    run: (view) => changeListIndent(view, "in"),
  },
  {
    key: "Shift-Tab",
    run: (view) => changeListIndent(view, "out"),
  },
  {
    key: "Backspace",
    run: (view) => {
      // Outdent when Backspace is pressed at the very start of an
      // indented list line. Falls through everywhere else.
      const sel = view.state.selection.main;
      if (sel.from !== sel.to) return false;
      const line = view.state.doc.lineAt(sel.from);
      if (!isListLine(line.text)) return false;
      const lead = line.text.match(/^[\t ]*/)?.[0] ?? "";
      if (lead.length === 0) return false;
      // Cursor must be at the first non-whitespace position.
      if (sel.from !== line.from + lead.length) return false;
      return changeListIndent(view, "out");
    },
  },
  {
    key: "Enter",
    run: (view) => {
      const sel = view.state.selection.main;
      // Only act on a simple caret (no selection range).
      if (sel.from !== sel.to) return false;
      const line = view.state.doc.lineAt(sel.from);
      const before = view.state.sliceDoc(line.from, sel.from);
      // We only want to inject on Enter at end of line.
      if (sel.from !== line.to) return false;

      const taskMatch = before.match(TASK_RE);
      if (taskMatch) {
        const [, lead, , body] = taskMatch;
        if (body.length === 0) {
          // Empty task → strip marker on this line.
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: lead },
            selection: { anchor: line.from + lead.length },
            userEvent: "input",
          });
          return true;
        }
        const insert = `\n${lead}- [ ] `;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert },
          selection: { anchor: sel.from + insert.length },
          userEvent: "input",
        });
        return true;
      }

      const numMatch = before.match(NUMBERED_RE);
      if (numMatch) {
        const [, lead, num, sep, body] = numMatch;
        if (body.length === 0) {
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: lead },
            selection: { anchor: line.from + lead.length },
            userEvent: "input",
          });
          return true;
        }
        const next = `${Number(num) + 1}${sep} `;
        const insert = `\n${lead}${next}`;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert },
          selection: { anchor: sel.from + insert.length },
          userEvent: "input",
        });
        return true;
      }

      const bulletMatch = before.match(BULLET_RE);
      if (bulletMatch) {
        const [, lead, marker, body] = bulletMatch;
        if (body.length === 0) {
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: lead },
            selection: { anchor: line.from + lead.length },
            userEvent: "input",
          });
          return true;
        }
        const insert = `\n${lead}${marker} `;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert },
          selection: { anchor: sel.from + insert.length },
          userEvent: "input",
        });
        return true;
      }
      return false;
    },
  },
];
