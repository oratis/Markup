import { describe, expect, it } from "vitest";
import { TABLE_WRAP_CLASS, TableNodeView } from "./table-view";

describe("TableNodeView", () => {
  it("renders wrapper > table > tbody, with the tbody as contentDOM", () => {
    const view = new TableNodeView();

    expect(view.dom.tagName).toBe("DIV");
    expect(view.dom.className).toBe(TABLE_WRAP_CLASS);
    const table = view.dom.firstElementChild as HTMLTableElement;
    expect(table.tagName).toBe("TABLE");
    // ProseMirror renders cells into contentDOM — it must be the tbody
    // inside the table, or rows would land outside the table box.
    expect(view.contentDOM.tagName).toBe("TBODY");
    expect(view.contentDOM.parentElement).toBe(table);
  });

  it("keeps handling the node as long as it is still a table", () => {
    const view = new TableNodeView();
    // biome-ignore lint/suspicious/noExplicitAny: minimal ProseMirror node stub
    const node = (name: string) => ({ type: { name } }) as any;

    expect(view.update(node("table"))).toBe(true);
    expect(view.update(node("paragraph"))).toBe(false);
  });

  it("ignores attribute mutations on its own chrome, not on content", () => {
    const view = new TableNodeView();
    const table = view.dom.firstElementChild as HTMLTableElement;
    // biome-ignore lint/suspicious/noExplicitAny: minimal MutationRecord stub
    const record = (type: string, target: Node) => ({ type, target }) as any;

    expect(view.ignoreMutation(record("attributes", view.dom))).toBe(true);
    expect(view.ignoreMutation(record("attributes", table))).toBe(true);
    // A real edit inside the table must still reach ProseMirror.
    expect(view.ignoreMutation(record("childList", view.contentDOM))).toBe(false);
    expect(view.ignoreMutation(record("attributes", view.contentDOM))).toBe(false);
  });
});
