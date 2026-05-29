import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCanvasStoreCleanup } from "./useCanvasStoreCleanup";

describe("useCanvasStoreCleanup", () => {
  it("disposes a canvas store when its tab closes", () => {
    const dispose = vi.fn();
    const { rerender } = renderHook(({ tabs }) => useCanvasStoreCleanup(tabs, dispose), {
      initialProps: {
        tabs: [
          { id: "c1", kind: "canvas" as const },
          { id: "m1", kind: "markdown" as const },
        ],
      },
    });
    expect(dispose).not.toHaveBeenCalled();
    // Close the canvas tab.
    rerender({ tabs: [{ id: "m1", kind: "markdown" as const }] });
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledWith("c1");
  });

  it("ignores closed markdown tabs", () => {
    const dispose = vi.fn();
    const { rerender } = renderHook(({ tabs }) => useCanvasStoreCleanup(tabs, dispose), {
      initialProps: {
        tabs: [
          { id: "m1", kind: "markdown" as const },
          { id: "m2", kind: "markdown" as const },
        ],
      },
    });
    rerender({ tabs: [{ id: "m1", kind: "markdown" as const }] });
    expect(dispose).not.toHaveBeenCalled();
  });

  it("does not dispose a canvas tab that stays open", () => {
    const dispose = vi.fn();
    const tabs = [{ id: "c1", kind: "canvas" as const }];
    const { rerender } = renderHook(({ t }) => useCanvasStoreCleanup(t, dispose), {
      initialProps: { t: tabs },
    });
    rerender({ t: [...tabs, { id: "c2", kind: "canvas" as const }] });
    expect(dispose).not.toHaveBeenCalled();
  });
});
