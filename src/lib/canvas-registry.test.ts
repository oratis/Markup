import { beforeEach, describe, expect, it } from "vitest";
import {
  _canvasRegistrySize,
  _resetCanvasRegistry,
  disposeCanvasStore,
  getCanvasStore,
  getOrCreateCanvasStore,
  renameCanvasStore,
} from "./canvas-registry";

describe("canvas-registry", () => {
  beforeEach(() => {
    _resetCanvasRegistry();
  });

  it("creates a new store for an unseen tab id", () => {
    const s = getOrCreateCanvasStore("tab-1", "{}");
    expect(s).toBeDefined();
    expect(_canvasRegistrySize()).toBe(1);
  });

  it("returns the same instance on subsequent calls", () => {
    const a = getOrCreateCanvasStore("tab-1", "{}");
    const b = getOrCreateCanvasStore("tab-1", "{}");
    expect(a).toBe(b);
  });

  it("ignores initialJson on cache hit (keeps the existing doc)", () => {
    const a = getOrCreateCanvasStore("tab-1", "{}");
    a.addNode({
      id: "n",
      type: "text",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      text: "x",
    });
    const b = getOrCreateCanvasStore(
      "tab-1",
      JSON.stringify({
        nodes: [{ id: "z", type: "text", x: 0, y: 0, width: 1, height: 1, text: "z" }],
        edges: [],
      }),
    );
    // Same store — the "z" seed is ignored, the in-progress "n" stays.
    expect(b.getSnapshot().doc.nodes.map((n) => n.id)).toEqual(["n"]);
  });

  it("getCanvasStore returns undefined when nothing is registered", () => {
    expect(getCanvasStore("missing")).toBeUndefined();
  });

  it("disposeCanvasStore removes the entry", () => {
    getOrCreateCanvasStore("tab-1", "{}");
    expect(_canvasRegistrySize()).toBe(1);
    disposeCanvasStore("tab-1");
    expect(_canvasRegistrySize()).toBe(0);
    expect(getCanvasStore("tab-1")).toBeUndefined();
  });

  it("disposeCanvasStore on unknown id is a no-op", () => {
    expect(() => disposeCanvasStore("never-existed")).not.toThrow();
    expect(_canvasRegistrySize()).toBe(0);
  });

  it("renameCanvasStore moves the store under a new key", () => {
    const a = getOrCreateCanvasStore("tab-old", "{}");
    a.addNode({
      id: "n",
      type: "text",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      text: "x",
    });
    renameCanvasStore("tab-old", "tab-new");
    expect(getCanvasStore("tab-old")).toBeUndefined();
    const b = getCanvasStore("tab-new");
    expect(b).toBe(a);
    expect(b?.getSnapshot().doc.nodes).toHaveLength(1);
  });

  it("renameCanvasStore is a no-op when source key is unknown", () => {
    expect(() => renameCanvasStore("missing", "new")).not.toThrow();
    expect(_canvasRegistrySize()).toBe(0);
  });

  it("renameCanvasStore old===new is a no-op", () => {
    const a = getOrCreateCanvasStore("tab-1", "{}");
    renameCanvasStore("tab-1", "tab-1");
    expect(getCanvasStore("tab-1")).toBe(a);
  });
});
