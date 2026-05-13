import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { _resetCanvasRegistry, getOrCreateCanvasStore } from "../lib/canvas-registry";
import { useAppStore } from "../store";
import { CanvasView } from "./CanvasView";

const TAB_ID = "/v/board.canvas";

function seedCanvasTab() {
  useAppStore.setState({
    tabs: [
      {
        id: TAB_ID,
        path: TAB_ID,
        name: "board.canvas",
        content: "{}",
        mtimeMs: 0,
        status: "saved",
        errorMessage: null,
        kind: "canvas",
      },
    ],
    activeTabId: TAB_ID,
  });
}

describe("CanvasView keyboard shortcuts", () => {
  beforeEach(() => {
    _resetCanvasRegistry();
    useAppStore.setState({ tabs: [], activeTabId: null });
  });

  it("Mod+Z undoes the last store mutation", () => {
    seedCanvasTab();
    render(<CanvasView />);
    const store = getOrCreateCanvasStore(TAB_ID, "{}");
    store.addNode({
      id: "n1",
      type: "text",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      text: "hi",
    });
    expect(store.getSnapshot().doc.nodes).toHaveLength(1);
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect(store.getSnapshot().doc.nodes).toHaveLength(0);
  });

  it("Mod+Shift+Z redoes after an undo", () => {
    seedCanvasTab();
    render(<CanvasView />);
    const store = getOrCreateCanvasStore(TAB_ID, "{}");
    store.addNode({
      id: "n1",
      type: "text",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      text: "hi",
    });
    store.undo();
    expect(store.getSnapshot().doc.nodes).toHaveLength(0);
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });
    expect(store.getSnapshot().doc.nodes).toHaveLength(1);
  });

  it("Ctrl+Y also redoes (Windows-style shortcut)", () => {
    seedCanvasTab();
    render(<CanvasView />);
    const store = getOrCreateCanvasStore(TAB_ID, "{}");
    store.addNode({
      id: "n",
      type: "text",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
    store.undo();
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(store.getSnapshot().doc.nodes).toHaveLength(1);
  });

  it("Delete removes selected nodes", () => {
    seedCanvasTab();
    render(<CanvasView />);
    const store = getOrCreateCanvasStore(TAB_ID, "{}");
    store.addNode({
      id: "n1",
      type: "text",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
    store.setSelection(["n1"]);
    fireEvent.keyDown(window, { key: "Delete" });
    expect(store.getSnapshot().doc.nodes).toHaveLength(0);
  });

  it("Esc clears selection without deleting", () => {
    seedCanvasTab();
    render(<CanvasView />);
    const store = getOrCreateCanvasStore(TAB_ID, "{}");
    store.addNode({
      id: "n",
      type: "text",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
    store.setSelection(["n"]);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(store.getSnapshot().selection.size).toBe(0);
    expect(store.getSnapshot().doc.nodes).toHaveLength(1);
  });
});
