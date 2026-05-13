import { describe, expect, it } from "vitest";
import { type DragStart, dragTo, exceededDragThreshold } from "./canvas-drag";

const start: DragStart = {
  screenX: 100,
  screenY: 200,
  nodeX: 50,
  nodeY: 75,
};

describe("dragTo", () => {
  it("matches the start anchor when pointer hasn't moved", () => {
    expect(dragTo(start, 100, 200, 1)).toEqual({ x: 50, y: 75 });
  });

  it("translates by screen delta at zoom=1", () => {
    expect(dragTo(start, 110, 220, 1)).toEqual({ x: 60, y: 95 });
  });

  it("scales the world delta by inverse zoom", () => {
    expect(dragTo(start, 200, 200, 2)).toEqual({ x: 100, y: 75 });
    expect(dragTo(start, 100, 400, 0.5)).toEqual({ x: 50, y: 475 });
  });

  it("handles negative deltas (dragging up/left)", () => {
    expect(dragTo(start, 80, 180, 1)).toEqual({ x: 30, y: 55 });
  });

  it("falls back to zoom=1 if zoom is zero or negative", () => {
    expect(dragTo(start, 110, 200, 0)).toEqual({ x: 60, y: 75 });
    expect(dragTo(start, 110, 200, -1)).toEqual({ x: 60, y: 75 });
  });
});

describe("exceededDragThreshold", () => {
  it("returns false for movements under the threshold", () => {
    expect(exceededDragThreshold(start, 102, 202)).toBe(false);
  });

  it("returns true once movement exceeds the threshold on either axis", () => {
    expect(exceededDragThreshold(start, 110, 200)).toBe(true);
    expect(exceededDragThreshold(start, 100, 210)).toBe(true);
  });

  it("accepts a custom threshold", () => {
    expect(exceededDragThreshold(start, 105, 200, 10)).toBe(false);
    expect(exceededDragThreshold(start, 115, 200, 10)).toBe(true);
  });
});
