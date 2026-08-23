import type { Node as ProseNode } from "@milkdown/prose/model";
import { Plugin, PluginKey } from "@milkdown/prose/state";
import type { NodeView, ViewMutationRecord } from "@milkdown/prose/view";
import { $prose } from "@milkdown/utils";

/** Class on the scroll/bleed wrapper around every rendered table. */
export const TABLE_WRAP_CLASS = "mk-table-wrap";

/**
 * NodeView for the GFM `table` node: `div.mk-table-wrap > table > tbody`,
 * with the tbody as contentDOM — the same shape prosemirror-tables' own
 * `TableView` (used by columnResizing) produces, so `tableEditing`,
 * CellSelection and the align-keeper plugin are unaffected.
 *
 * The wrapper exists purely for layout (see docs/design/08-wide-tables.md):
 * it is what bleeds past the prose column via negative margins and what
 * scrolls horizontally when even the widened table cannot fit. A bare
 * `<table>` cannot do either — `display:block` on the table itself (the
 * GitHub trick) leaves an anonymous table box that can be neither centred
 * nor stretched to the column.
 */
export class TableNodeView implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLTableSectionElement;
  private table: HTMLTableElement;

  constructor() {
    const wrap = document.createElement("div");
    wrap.className = TABLE_WRAP_CLASS;
    const table = document.createElement("table");
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    wrap.appendChild(table);
    this.dom = wrap;
    this.table = table;
    this.contentDOM = tbody;
  }

  update(node: ProseNode): boolean {
    return node.type.name === "table";
  }

  /** Attribute churn on the wrapper/table (e.g. a scrollbar-driven style
   * tweak) is ours, not a content edit — don't make PM re-parse the node. */
  ignoreMutation(record: ViewMutationRecord): boolean {
    return (
      record.type === "attributes" &&
      (record.target === this.dom || record.target === this.table)
    );
  }
}

const TABLE_VIEW_KEY = new PluginKey("markup/table-view");

/**
 * Milkdown plugin: wraps each table in a layout container so wide tables can
 * use the pane width (bleed) and overflow into a horizontal scroll instead of
 * squeezing columns down to one character per line.
 */
export const tableView = $prose(
  () =>
    new Plugin({
      key: TABLE_VIEW_KEY,
      props: {
        nodeViews: {
          table: () => new TableNodeView(),
        },
      },
    }),
);
