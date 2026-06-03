import { afterEach, describe, expect, it, vi } from "vitest";
import { createSaveScheduler, planSaveFinalize } from "./save-scheduler";

afterEach(() => vi.useRealTimers());

describe("createSaveScheduler — per-tab debounce", () => {
  it("runs each tab's save independently (editing B doesn't cancel A)", () => {
    vi.useFakeTimers();
    const ran: string[] = [];
    const s = createSaveScheduler();
    s.schedule("A", 300, () => ran.push("A"));
    s.schedule("B", 300, () => ran.push("B"));
    vi.advanceTimersByTime(300);
    expect(ran.sort()).toEqual(["A", "B"]);
  });

  it("debounces re-scheduling the same tab (only the latest fires)", () => {
    vi.useFakeTimers();
    const ran: string[] = [];
    const s = createSaveScheduler();
    s.schedule("A", 300, () => ran.push("first"));
    vi.advanceTimersByTime(100);
    s.schedule("A", 300, () => ran.push("second"));
    vi.advanceTimersByTime(300);
    expect(ran).toEqual(["second"]);
  });

  it("cancel / cancelAll stop pending saves", () => {
    vi.useFakeTimers();
    const ran: string[] = [];
    const s = createSaveScheduler();
    s.schedule("A", 300, () => ran.push("A"));
    s.schedule("B", 300, () => ran.push("B"));
    s.cancel("A");
    expect(s.pending("A")).toBe(false);
    expect(s.pending("B")).toBe(true);
    s.cancelAll();
    vi.advanceTimersByTime(300);
    expect(ran).toEqual([]);
  });

  it("clears the pending flag once a save fires", () => {
    vi.useFakeTimers();
    const s = createSaveScheduler();
    s.schedule("A", 300, () => {});
    expect(s.pending("A")).toBe(true);
    vi.advanceTimersByTime(300);
    expect(s.pending("A")).toBe(false);
  });
});

describe("planSaveFinalize", () => {
  it("marks saved when content is unchanged during the write", () => {
    expect(
      planSaveFinalize({
        snapshotContent: "x",
        currentContent: "x",
        written: "x",
        newMtime: 5,
        trim: false,
      }),
    ).toEqual({ status: "saved", mtimeMs: 5, errorMessage: null });
  });

  it("writes back trimmed content when trimming and unchanged", () => {
    expect(
      planSaveFinalize({
        snapshotContent: "x ",
        currentContent: "x ",
        written: "x",
        newMtime: 5,
        trim: true,
      }),
    ).toEqual({ status: "saved", mtimeMs: 5, content: "x", errorMessage: null });
  });

  it("leaves the tab dirty and never overwrites an edit made during the write", () => {
    const p = planSaveFinalize({
      snapshotContent: "x",
      currentContent: "x2",
      written: "x",
      newMtime: 5,
      trim: true,
    });
    expect(p).toEqual({ status: "dirty", mtimeMs: 5, errorMessage: null });
    expect(p.content).toBeUndefined();
  });
});
