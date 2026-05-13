import { describe, expect, it } from "vitest";
import { newCanvasId } from "./canvas-ids";

describe("newCanvasId", () => {
  it("returns a 16-character lowercase hex string", () => {
    const id = newCanvasId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it("produces unique values across many calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(newCanvasId());
    expect(ids.size).toBe(1000);
  });
});
