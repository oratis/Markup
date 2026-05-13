import { describe, expect, it } from "vitest";
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  applyPan,
  applyWheelZoom,
  clampZoom,
  defaultViewport,
  resetZoom,
  screenToWorld,
  toCssTransform,
  worldToScreen,
  zoomAtPoint,
} from "./canvas-viewport";

describe("defaultViewport", () => {
  it("is identity (0,0) at 100% zoom", () => {
    expect(defaultViewport()).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe("clampZoom", () => {
  it("clamps to [MIN_ZOOM, MAX_ZOOM]", () => {
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(MIN_ZOOM / 2)).toBe(MIN_ZOOM);
    expect(clampZoom(MAX_ZOOM * 10)).toBe(MAX_ZOOM);
    expect(clampZoom(2)).toBe(2);
  });

  it("falls back to DEFAULT_ZOOM for NaN / Infinity", () => {
    expect(clampZoom(Number.NaN)).toBe(DEFAULT_ZOOM);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NEGATIVE_INFINITY)).toBe(MIN_ZOOM);
  });
});

describe("screenToWorld / worldToScreen round-trip", () => {
  it("is an identity transform at the default viewport", () => {
    const v = defaultViewport();
    expect(screenToWorld(v, 100, 200)).toEqual({ x: 100, y: 200 });
    expect(worldToScreen(v, 100, 200)).toEqual({ x: 100, y: 200 });
  });

  it("round-trips through pan", () => {
    const v = { x: 50, y: -20, zoom: 1 };
    const s = worldToScreen(v, 7, 11);
    expect(s).toEqual({ x: 57, y: -9 });
    expect(screenToWorld(v, s.x, s.y)).toEqual({ x: 7, y: 11 });
  });

  it("round-trips through zoom", () => {
    const v = { x: 0, y: 0, zoom: 2 };
    const s = worldToScreen(v, 50, 100);
    expect(s).toEqual({ x: 100, y: 200 });
    expect(screenToWorld(v, s.x, s.y)).toEqual({ x: 50, y: 100 });
  });
});

describe("zoomAtPoint", () => {
  it("keeps the world point beneath the cursor fixed", () => {
    const v = defaultViewport();
    const focusX = 400;
    const focusY = 300;
    const worldBefore = screenToWorld(v, focusX, focusY);
    const next = zoomAtPoint(v, 2.5, focusX, focusY);
    const worldAfter = screenToWorld(next, focusX, focusY);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });

  it("clamps the target zoom level", () => {
    const v = defaultViewport();
    expect(zoomAtPoint(v, 100, 0, 0).zoom).toBe(MAX_ZOOM);
    expect(zoomAtPoint(v, 0.001, 0, 0).zoom).toBe(MIN_ZOOM);
  });

  it("is a no-op when the clamped target equals current zoom", () => {
    const v = defaultViewport();
    expect(zoomAtPoint(v, v.zoom, 100, 100)).toBe(v);
  });
});

describe("applyWheelZoom", () => {
  it("zooms in when deltaY is negative", () => {
    const v = defaultViewport();
    expect(applyWheelZoom(v, -1, 0, 0).zoom).toBeGreaterThan(v.zoom);
  });

  it("zooms out when deltaY is positive", () => {
    const v = defaultViewport();
    expect(applyWheelZoom(v, 1, 0, 0).zoom).toBeLessThan(v.zoom);
  });

  it("respects the zoom bounds across many consecutive zoom-ins", () => {
    let v = defaultViewport();
    for (let i = 0; i < 100; i++) v = applyWheelZoom(v, -1, 0, 0);
    expect(v.zoom).toBe(MAX_ZOOM);
  });

  it("respects the zoom bounds across many consecutive zoom-outs", () => {
    let v = defaultViewport();
    for (let i = 0; i < 100; i++) v = applyWheelZoom(v, 1, 0, 0);
    expect(v.zoom).toBe(MIN_ZOOM);
  });
});

describe("applyPan", () => {
  it("translates by the given delta", () => {
    const v = defaultViewport();
    expect(applyPan(v, 10, -5)).toEqual({ x: 10, y: -5, zoom: 1 });
  });

  it("is identity for zero delta", () => {
    const v = { x: 7, y: 9, zoom: 2 };
    expect(applyPan(v, 0, 0)).toBe(v);
  });

  it("accumulates", () => {
    let v = defaultViewport();
    v = applyPan(v, 10, 20);
    v = applyPan(v, -3, 8);
    expect(v).toEqual({ x: 7, y: 28, zoom: 1 });
  });
});

describe("resetZoom", () => {
  it("returns zoom to 100% while keeping the pan offset", () => {
    const v = { x: 50, y: 100, zoom: 2.5 };
    const r = resetZoom(v);
    expect(r.zoom).toBe(DEFAULT_ZOOM);
    expect(r.x).toBe(50);
    expect(r.y).toBe(100);
  });

  it("is identity when already at 100%", () => {
    const v = defaultViewport();
    expect(resetZoom(v)).toBe(v);
  });
});

describe("toCssTransform", () => {
  it("emits translate then scale (order matters for compounding)", () => {
    expect(toCssTransform({ x: 10, y: 20, zoom: 2 })).toBe(
      "translate(10px, 20px) scale(2)",
    );
  });
});
