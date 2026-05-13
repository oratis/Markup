import { describe, expect, it } from "vitest";
import {
  type NodeBox,
  anchorAt,
  buildEdgePath,
  closestSide,
  edgeMidpoint,
  edgePath,
  resolveAnchors,
} from "./canvas-edge-geom";
import type { CanvasNode } from "./canvas-format";

const box = (x: number, y: number, w = 100, h = 60): NodeBox => ({
  x,
  y,
  width: w,
  height: h,
});

const node = (id: string, x: number, y: number, w = 100, h = 60): CanvasNode => ({
  id,
  type: "text",
  x,
  y,
  width: w,
  height: h,
});

describe("anchorAt", () => {
  it("computes mid-side coordinates", () => {
    const b = box(100, 200, 200, 100);
    expect(anchorAt(b, "top")).toEqual({ x: 200, y: 200, side: "top" });
    expect(anchorAt(b, "right")).toEqual({ x: 300, y: 250, side: "right" });
    expect(anchorAt(b, "bottom")).toEqual({ x: 200, y: 300, side: "bottom" });
    expect(anchorAt(b, "left")).toEqual({ x: 100, y: 250, side: "left" });
  });
});

describe("closestSide", () => {
  it("picks right when target is to the east", () => {
    expect(closestSide(box(0, 0), box(500, 0))).toBe("right");
  });
  it("picks left when target is to the west", () => {
    expect(closestSide(box(500, 0), box(0, 0))).toBe("left");
  });
  it("picks bottom when target is south", () => {
    expect(closestSide(box(0, 0), box(0, 500))).toBe("bottom");
  });
  it("picks top when target is north", () => {
    expect(closestSide(box(0, 500), box(0, 0))).toBe("top");
  });
  it("ties go to the horizontal axis", () => {
    // |dx| === |dy| → horizontal wins per implementation choice.
    expect(closestSide(box(0, 0), box(100, 100))).toBe("right");
  });
});

describe("resolveAnchors", () => {
  it("uses explicit sides when provided", () => {
    const a = resolveAnchors(box(0, 0), box(500, 0), "left", "right");
    expect(a.from.side).toBe("left");
    expect(a.to.side).toBe("right");
  });

  it("auto-picks closest sides when missing", () => {
    const a = resolveAnchors(box(0, 0), box(500, 0));
    expect(a.from.side).toBe("right");
    expect(a.to.side).toBe("left");
  });

  it("mixes explicit + implicit (one side given)", () => {
    const a = resolveAnchors(box(0, 0), box(500, 0), undefined, "top");
    expect(a.from.side).toBe("right");
    expect(a.to.side).toBe("top");
  });
});

describe("edgePath", () => {
  it("starts at the from-anchor and ends at the to-anchor", () => {
    const d = edgePath({ x: 0, y: 0, side: "right" }, { x: 200, y: 100, side: "left" });
    expect(d.startsWith("M 0 0")).toBe(true);
    expect(d.endsWith("200 100")).toBe(true);
    expect(d).toContain(" C ");
  });

  it("is a cubic Bezier with two control points", () => {
    const d = edgePath({ x: 0, y: 0, side: "right" }, { x: 200, y: 0, side: "left" });
    const cIdx = d.indexOf(" C ");
    const tail = d.slice(cIdx + 3);
    expect(tail.split(",").length).toBe(3);
  });
});

describe("edgeMidpoint", () => {
  it("returns a point between the two anchors", () => {
    const from = { x: 0, y: 0, side: "right" as const };
    const to = { x: 200, y: 0, side: "left" as const };
    const m = edgeMidpoint(from, to);
    // Curve is symmetric for this geometry; midpoint should sit on
    // the joining straight line.
    expect(m.y).toBeCloseTo(0);
    expect(m.x).toBeGreaterThan(0);
    expect(m.x).toBeLessThan(200);
  });
});

describe("buildEdgePath", () => {
  it("returns d + mid + resolved anchors", () => {
    const r = buildEdgePath(node("a", 0, 0), node("b", 400, 0));
    expect(r.d.startsWith("M ")).toBe(true);
    expect(r.from.side).toBe("right");
    expect(r.to.side).toBe("left");
    expect(typeof r.mid.x).toBe("number");
  });
});
