import { describe, expect, it } from "vitest";
import type { CanvasNode } from "./canvas-format";
import { nodesInRect, rectFromPoints, rectsIntersect } from "./canvas-select";

const node = (id: string, x: number, y: number, w = 50, h = 30): CanvasNode => ({
  id,
  type: "text",
  x,
  y,
  width: w,
  height: h,
});

describe("rectFromPoints", () => {
  it("normalises corner order", () => {
    expect(rectFromPoints(10, 20, 30, 50)).toEqual({
      x: 10,
      y: 20,
      width: 20,
      height: 30,
    });
    expect(rectFromPoints(30, 50, 10, 20)).toEqual({
      x: 10,
      y: 20,
      width: 20,
      height: 30,
    });
  });

  it("handles zero extent (click without drag)", () => {
    expect(rectFromPoints(7, 7, 7, 7)).toEqual({ x: 7, y: 7, width: 0, height: 0 });
  });
});

describe("rectsIntersect", () => {
  it("returns true for overlapping rects", () => {
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 5, width: 10, height: 10 },
      ),
    ).toBe(true);
  });

  it("returns false for disjoint rects", () => {
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 },
      ),
    ).toBe(false);
  });

  it("returns false for touching-but-not-overlapping (open intervals)", () => {
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 0, width: 10, height: 10 },
      ),
    ).toBe(false);
  });

  it("returns true when one fully contains the other", () => {
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 30, y: 30, width: 10, height: 10 },
      ),
    ).toBe(true);
  });
});

describe("nodesInRect", () => {
  const nodes = [
    node("a", 0, 0),
    node("b", 100, 0),
    node("c", 0, 100),
    node("d", 100, 100),
  ];

  it("returns ids of nodes touching the rect", () => {
    expect(nodesInRect(nodes, { x: -10, y: -10, width: 30, height: 30 })).toEqual(["a"]);
  });

  it("returns multiple ids when the rect spans many nodes", () => {
    expect(nodesInRect(nodes, { x: -10, y: -10, width: 200, height: 200 })).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("returns empty when the rect is far away", () => {
    expect(nodesInRect(nodes, { x: 500, y: 500, width: 10, height: 10 })).toEqual([]);
  });

  it("preserves input order", () => {
    const shuffled = [node("z", 0, 0), node("a", 0, 0), node("m", 0, 0)];
    expect(nodesInRect(shuffled, { x: -1, y: -1, width: 100, height: 100 })).toEqual([
      "z",
      "a",
      "m",
    ]);
  });
});
