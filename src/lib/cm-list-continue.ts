import type { KeyBinding } from "@codemirror/view";

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

export const continueListKeymap: KeyBinding[] = [
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
