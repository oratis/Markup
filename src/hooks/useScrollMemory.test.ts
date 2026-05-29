import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { _resetScrollCache, getScroll, setScroll } from "../lib/scroll-memory";
import { useScrollMemory } from "./useScrollMemory";

afterEach(() => _resetScrollCache());

function hostRef() {
  const el = document.createElement("div");
  return { ref: { current: el as HTMLElement | null }, el };
}

describe("useScrollMemory", () => {
  it("captures scroll offsets for the active tab", () => {
    const { ref, el } = hostRef();
    renderHook(() => useScrollMemory(ref, "tab-1", false));
    el.scrollTop = 250;
    el.dispatchEvent(new Event("scroll"));
    expect(getScroll("tab-1")).toBe(250);
  });

  it("restores the saved offset on mount", async () => {
    setScroll("tab-2", 480);
    const { ref, el } = hostRef();
    renderHook(() => useScrollMemory(ref, "tab-2", false));
    await waitFor(() => expect(el.scrollTop).toBe(480));
  });

  it("is inert in source mode", () => {
    const { ref, el } = hostRef();
    renderHook(() => useScrollMemory(ref, "tab-3", true));
    el.scrollTop = 99;
    el.dispatchEvent(new Event("scroll"));
    expect(getScroll("tab-3")).toBe(0);
  });

  it("stops capturing after unmount", () => {
    const { ref, el } = hostRef();
    const { unmount } = renderHook(() => useScrollMemory(ref, "tab-4", false));
    unmount();
    el.scrollTop = 123;
    el.dispatchEvent(new Event("scroll"));
    expect(getScroll("tab-4")).toBe(0);
  });
});
