import { describe, expect, it } from "vitest";
import { getActiveSourceView, setActiveSourceView } from "./active-source-view";

describe("active-source-view ref", () => {
  it("starts null and accepts set/clear", () => {
    setActiveSourceView(null);
    expect(getActiveSourceView()).toBeNull();
    // Use a structurally-typed stand-in; we never actually invoke editor
    // methods in these tests.
    const fake = { id: "fake-view" } as unknown as Parameters<
      typeof setActiveSourceView
    >[0];
    setActiveSourceView(fake);
    expect(getActiveSourceView()).toBe(fake);
    setActiveSourceView(null);
    expect(getActiveSourceView()).toBeNull();
  });

  it("overwrites the previous view rather than stacking", () => {
    const a = { id: "a" } as unknown as Parameters<typeof setActiveSourceView>[0];
    const b = { id: "b" } as unknown as Parameters<typeof setActiveSourceView>[0];
    setActiveSourceView(a);
    setActiveSourceView(b);
    expect(getActiveSourceView()).toBe(b);
    setActiveSourceView(null);
  });
});
