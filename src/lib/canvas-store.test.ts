import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CanvasEdge, CanvasNode } from "./canvas-format";
import {
  type CanvasStore,
  createCanvasStore,
  createEmptyCanvasStore,
} from "./canvas-store";

const textNode = (id: string, overrides: Partial<CanvasNode> = {}): CanvasNode => ({
  id,
  type: "text",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  text: `node ${id}`,
  ...overrides,
});

const edge = (id: string, from: string, to: string): CanvasEdge => ({
  id,
  fromNode: from,
  toNode: to,
});

describe("createCanvasStore — seed", () => {
  it("starts empty with no undo / redo when given empty input", () => {
    const s = createEmptyCanvasStore();
    const snap = s.getSnapshot();
    expect(snap.doc.nodes).toEqual([]);
    expect(snap.doc.edges).toEqual([]);
    expect(snap.canUndo).toBe(false);
    expect(snap.canRedo).toBe(false);
    expect(snap.selection.size).toBe(0);
  });

  it("seeds from JSON with existing nodes / edges", () => {
    const s = createCanvasStore(
      JSON.stringify({
        nodes: [{ id: "n", type: "text", x: 1, y: 2, width: 3, height: 4, text: "x" }],
        edges: [{ id: "e", fromNode: "n", toNode: "n" }],
      }),
    );
    const snap = s.getSnapshot();
    expect(snap.doc.nodes).toHaveLength(1);
    expect(snap.doc.edges).toHaveLength(1);
  });

  it("treats malformed JSON as an empty canvas (no throw)", () => {
    const s = createCanvasStore("{ not json");
    expect(s.getSnapshot().doc.nodes).toEqual([]);
  });
});

describe("subscribe / notify", () => {
  let store: CanvasStore;
  beforeEach(() => {
    store = createEmptyCanvasStore();
  });

  it("calls listener on mutation", () => {
    const cb = vi.fn();
    store.subscribe(cb);
    store.addNode(textNode("a"));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("calls listener on selection change", () => {
    store.addNode(textNode("a"));
    const cb = vi.fn();
    store.subscribe(cb);
    store.setSelection(["a"]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops further notifications", () => {
    const cb = vi.fn();
    const off = store.subscribe(cb);
    off();
    store.addNode(textNode("a"));
    expect(cb).not.toHaveBeenCalled();
  });

  it("snapshot identity changes when the doc mutates", () => {
    const before = store.getSnapshot().doc;
    store.addNode(textNode("a"));
    const after = store.getSnapshot().doc;
    expect(after).not.toBe(before);
  });
});

describe("node mutations", () => {
  let store: CanvasStore;
  beforeEach(() => {
    store = createEmptyCanvasStore();
  });

  it("addNode appends to the nodes list", () => {
    store.addNode(textNode("a"));
    store.addNode(textNode("b"));
    expect(store.getSnapshot().doc.nodes.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("removeNode drops the node and any edges referencing it", () => {
    store.addNode(textNode("a"));
    store.addNode(textNode("b"));
    store.addEdge(edge("e1", "a", "b"));
    store.addEdge(edge("e2", "b", "a"));
    store.removeNode("a");
    expect(store.getSnapshot().doc.nodes.map((n) => n.id)).toEqual(["b"]);
    expect(store.getSnapshot().doc.edges).toEqual([]);
  });

  it("removeNode is a no-op for unknown ids (no history entry)", () => {
    store.addNode(textNode("a"));
    const before = store.getSnapshot();
    store.removeNode("nope");
    const after = store.getSnapshot();
    expect(after.doc).toBe(before.doc);
    expect(after.canUndo).toBe(before.canUndo);
  });

  it("updateNode merges patch but keeps id immutable", () => {
    store.addNode(textNode("a", { text: "first" }));
    store.updateNode("a", { text: "second", id: "evil" } as Partial<CanvasNode>);
    const n = store.getSnapshot().doc.nodes[0];
    expect(n.id).toBe("a");
    expect(n.text).toBe("second");
  });

  it("moveNode short-circuits when coords unchanged (no history entry)", () => {
    store.addNode(textNode("a", { x: 5, y: 6 }));
    const before = store.getSnapshot();
    store.moveNode("a", 5, 6);
    const after = store.getSnapshot();
    expect(after.doc).toBe(before.doc);
  });

  it("moveNode records history on real movement", () => {
    store.addNode(textNode("a", { x: 0, y: 0 }));
    store.moveNode("a", 100, 200);
    expect(store.getSnapshot().doc.nodes[0].x).toBe(100);
    expect(store.getSnapshot().doc.nodes[0].y).toBe(200);
    expect(store.getSnapshot().canUndo).toBe(true);
  });

  it("resizeNode short-circuits when size unchanged", () => {
    store.addNode(textNode("a"));
    const before = store.getSnapshot();
    store.resizeNode("a", 100, 100);
    expect(store.getSnapshot().doc).toBe(before.doc);
  });

  it("resizeNode updates width/height", () => {
    store.addNode(textNode("a"));
    store.resizeNode("a", 300, 200);
    const n = store.getSnapshot().doc.nodes[0];
    expect(n.width).toBe(300);
    expect(n.height).toBe(200);
  });

  it("removeMany drops nodes + their edges in a single history entry", () => {
    store.addNode(textNode("a"));
    store.addNode(textNode("b"));
    store.addNode(textNode("c"));
    store.addEdge(edge("e1", "a", "b"));
    store.addEdge(edge("e2", "b", "c"));
    const undoCountBefore = store.getSnapshot().canUndo;
    expect(undoCountBefore).toBe(true);
    store.removeMany(["a", "b"]);
    const snap = store.getSnapshot();
    expect(snap.doc.nodes.map((n) => n.id)).toEqual(["c"]);
    expect(snap.doc.edges).toEqual([]);
    // Single undo restores both nodes (one history entry).
    store.undo();
    const restored = store.getSnapshot().doc;
    expect(restored.nodes.map((n) => n.id)).toEqual(["a", "b", "c"]);
    expect(restored.edges.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("removeMany is a no-op when nothing matches", () => {
    store.addNode(textNode("a"));
    const before = store.getSnapshot();
    store.removeMany(["x", "y"]);
    expect(store.getSnapshot().doc).toBe(before.doc);
  });
});

describe("edge mutations", () => {
  let store: CanvasStore;
  beforeEach(() => {
    store = createEmptyCanvasStore();
    store.addNode(textNode("a"));
    store.addNode(textNode("b"));
  });

  it("addEdge appends", () => {
    store.addEdge(edge("e1", "a", "b"));
    expect(store.getSnapshot().doc.edges.map((e) => e.id)).toEqual(["e1"]);
  });

  it("removeEdge removes a single edge", () => {
    store.addEdge(edge("e1", "a", "b"));
    store.addEdge(edge("e2", "b", "a"));
    store.removeEdge("e1");
    expect(store.getSnapshot().doc.edges.map((e) => e.id)).toEqual(["e2"]);
  });

  it("updateEdge merges patch but keeps id immutable", () => {
    store.addEdge(edge("e1", "a", "b"));
    store.updateEdge("e1", { label: "x", id: "evil" } as Partial<CanvasEdge>);
    const e = store.getSnapshot().doc.edges[0];
    expect(e.id).toBe("e1");
    expect(e.label).toBe("x");
  });

  it("removeEdge is a no-op for unknown ids", () => {
    const before = store.getSnapshot();
    store.removeEdge("missing");
    expect(store.getSnapshot().doc).toBe(before.doc);
  });
});

describe("selection (not recorded in history)", () => {
  let store: CanvasStore;
  beforeEach(() => {
    store = createEmptyCanvasStore();
    store.addNode(textNode("a"));
    store.addNode(textNode("b"));
  });

  it("setSelection replaces selection", () => {
    store.setSelection(["a"]);
    expect(Array.from(store.getSnapshot().selection)).toEqual(["a"]);
    store.setSelection(["b"]);
    expect(Array.from(store.getSnapshot().selection)).toEqual(["b"]);
  });

  it("toggleSelection non-additive replaces with the single id", () => {
    store.toggleSelection("a");
    expect(Array.from(store.getSnapshot().selection)).toEqual(["a"]);
    store.toggleSelection("b");
    expect(Array.from(store.getSnapshot().selection)).toEqual(["b"]);
  });

  it("toggleSelection additive toggles membership", () => {
    store.toggleSelection("a", true);
    store.toggleSelection("b", true);
    expect(store.getSnapshot().selection.has("a")).toBe(true);
    expect(store.getSnapshot().selection.has("b")).toBe(true);
    store.toggleSelection("a", true);
    expect(store.getSnapshot().selection.has("a")).toBe(false);
    expect(store.getSnapshot().selection.has("b")).toBe(true);
  });

  it("clearSelection clears", () => {
    store.setSelection(["a", "b"]);
    store.clearSelection();
    expect(store.getSnapshot().selection.size).toBe(0);
  });

  it("clearSelection on empty selection is a no-op (no notify)", () => {
    const cb = vi.fn();
    store.subscribe(cb);
    store.clearSelection();
    expect(cb).not.toHaveBeenCalled();
  });

  it("does not record undo for selection changes", () => {
    const undoBefore = store.getSnapshot().canUndo;
    store.setSelection(["a"]);
    store.clearSelection();
    expect(store.getSnapshot().canUndo).toBe(undoBefore);
  });

  it("removing a node drops it from selection", () => {
    store.setSelection(["a", "b"]);
    store.removeNode("a");
    expect(Array.from(store.getSnapshot().selection)).toEqual(["b"]);
  });

  it("removing an edge drops it from selection", () => {
    store.addEdge(edge("e1", "a", "b"));
    store.setSelection(["e1"]);
    store.removeEdge("e1");
    expect(store.getSnapshot().selection.has("e1")).toBe(false);
  });

  // Regression: useSyncExternalStore reads getSnapshot() synchronously from
  // inside the notify() the mutation fires, which caches the snapshot. If the
  // selection is pruned AFTER the mutation, that cached snapshot stays pinned
  // to the stale selection (deleted id still "selected") until the next
  // notify. A subscriber that reads during notify reproduces it.
  it("removeNode prunes selection in the snapshot read during notify", () => {
    store.setSelection(["a", "b"]);
    store.subscribe(() => {
      store.getSnapshot();
    });
    store.removeNode("a");
    expect(store.getSnapshot().selection.has("a")).toBe(false);
    expect(Array.from(store.getSnapshot().selection)).toEqual(["b"]);
  });

  it("removeMany prunes selection in the snapshot read during notify", () => {
    store.setSelection(["a", "b"]);
    store.subscribe(() => {
      store.getSnapshot();
    });
    store.removeMany(["a"]);
    expect(store.getSnapshot().selection.has("a")).toBe(false);
    expect(Array.from(store.getSnapshot().selection)).toEqual(["b"]);
  });

  it("removeEdge prunes selection in the snapshot read during notify", () => {
    store.addEdge(edge("e1", "a", "b"));
    store.setSelection(["e1"]);
    store.subscribe(() => {
      store.getSnapshot();
    });
    store.removeEdge("e1");
    expect(store.getSnapshot().selection.has("e1")).toBe(false);
  });
});

describe("undo / redo", () => {
  let store: CanvasStore;
  beforeEach(() => {
    store = createEmptyCanvasStore();
  });

  it("returns false when there's nothing to undo / redo", () => {
    expect(store.undo()).toBe(false);
    expect(store.redo()).toBe(false);
  });

  it("undo reverts last mutation; redo reapplies", () => {
    store.addNode(textNode("a"));
    expect(store.getSnapshot().doc.nodes).toHaveLength(1);
    expect(store.undo()).toBe(true);
    expect(store.getSnapshot().doc.nodes).toHaveLength(0);
    expect(store.redo()).toBe(true);
    expect(store.getSnapshot().doc.nodes).toHaveLength(1);
  });

  it("a fresh mutation clears the redo stack", () => {
    store.addNode(textNode("a"));
    store.undo();
    expect(store.getSnapshot().canRedo).toBe(true);
    store.addNode(textNode("b"));
    expect(store.getSnapshot().canRedo).toBe(false);
  });

  it("history cap is enforced (oldest dropped)", () => {
    // Push HISTORY_CAP + 5 mutations; oldest entries fall off the past stack
    // so when we undo HISTORY_CAP times we should still have entries left.
    for (let i = 0; i < 105; i++) {
      store.addNode(textNode(`n${i}`));
    }
    let undone = 0;
    while (store.undo() && undone < 200) undone++;
    expect(undone).toBe(100);
    // At least the first 5 nodes (the oldest, dropped from history)
    // remain in place — they can't be undone.
    expect(store.getSnapshot().doc.nodes.length).toBeGreaterThanOrEqual(5);
  });
});

describe("toJson / reset", () => {
  it("toJson round-trips through parseCanvas (idempotent)", () => {
    const s = createEmptyCanvasStore();
    s.addNode(textNode("a", { x: 10, y: 20 }));
    s.addEdge(edge("e", "a", "a"));
    const json1 = s.toJson();
    const s2 = createCanvasStore(json1);
    expect(s2.toJson()).toBe(json1);
  });

  it("toJson(false) emits compact JSON", () => {
    const s = createEmptyCanvasStore();
    s.addNode(textNode("a"));
    expect(s.toJson(false)).not.toContain("\n");
  });

  it("reset replaces doc and clears history + selection", () => {
    const s = createEmptyCanvasStore();
    s.addNode(textNode("a"));
    s.setSelection(["a"]);
    expect(s.getSnapshot().canUndo).toBe(true);
    s.reset(
      JSON.stringify({
        nodes: [{ id: "z", type: "text", x: 0, y: 0, width: 1, height: 1 }],
        edges: [],
      }),
    );
    const snap = s.getSnapshot();
    expect(snap.doc.nodes.map((n) => n.id)).toEqual(["z"]);
    expect(snap.canUndo).toBe(false);
    expect(snap.canRedo).toBe(false);
    expect(snap.selection.size).toBe(0);
  });
});
