import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LARGE_FILE_LIMIT_BYTES, useLargeFileGuard } from "./useLargeFileGuard";

const big = (mb: number) => "x".repeat(Math.ceil(mb * 1024 * 1024));

describe("useLargeFileGuard", () => {
  it("fires for a large file opened outside source mode", () => {
    const onLarge = vi.fn();
    renderHook(() => useLargeFileGuard({ id: "t1", content: big(6) }, false, onLarge));
    expect(onLarge).toHaveBeenCalledTimes(1);
    expect(onLarge).toHaveBeenCalledWith("6.0");
  });

  it("does not fire when already in source mode", () => {
    const onLarge = vi.fn();
    renderHook(() => useLargeFileGuard({ id: "t1", content: big(6) }, true, onLarge));
    expect(onLarge).not.toHaveBeenCalled();
  });

  it("does not fire for a small file", () => {
    const onLarge = vi.fn();
    renderHook(() => useLargeFileGuard({ id: "t1", content: "small" }, false, onLarge));
    expect(onLarge).not.toHaveBeenCalled();
  });

  it("does not re-fire on content growth within the same tab", () => {
    const onLarge = vi.fn();
    const { rerender } = renderHook(
      ({ tab, sm }) => useLargeFileGuard(tab, sm, onLarge),
      { initialProps: { tab: { id: "t1", content: "small" }, sm: false } },
    );
    expect(onLarge).not.toHaveBeenCalled();
    // Same tab id, content grows past the limit — guard stays quiet (it keys
    // on tab open, not keystrokes).
    rerender({ tab: { id: "t1", content: big(7) }, sm: false });
    expect(onLarge).not.toHaveBeenCalled();
  });

  it("fires again when a different large tab opens", () => {
    const onLarge = vi.fn();
    const { rerender } = renderHook(({ tab }) => useLargeFileGuard(tab, false, onLarge), {
      initialProps: { tab: { id: "t1", content: big(6) } },
    });
    expect(onLarge).toHaveBeenCalledTimes(1);
    rerender({ tab: { id: "t2", content: big(8) } });
    expect(onLarge).toHaveBeenCalledTimes(2);
    expect(onLarge).toHaveBeenLastCalledWith("8.0");
  });

  it("exports the documented 5 MB threshold", () => {
    expect(LARGE_FILE_LIMIT_BYTES).toBe(5 * 1024 * 1024);
  });
});
