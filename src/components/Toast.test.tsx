import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showToast, ToastHost } from "./Toast";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastHost", () => {
  it("renders nothing until a toast is shown", () => {
    const { container } = render(<ToastHost />);
    expect(container.firstChild).toBeNull();
  });

  it("shows a toast and auto-dismisses it after its duration", () => {
    render(<ToastHost />);
    act(() => {
      showToast("saved!", 1000);
    });
    expect(screen.getByText("saved!")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000 + 200 + 10); // ms + EXIT_MS + slack
    });
    expect(screen.queryByText("saved!")).toBeNull();
  });

  it("caps the stack at three visible toasts, dropping the oldest", () => {
    render(<ToastHost />);
    act(() => {
      showToast("t1", 5000);
      showToast("t2", 5000);
      showToast("t3", 5000);
      showToast("t4", 5000);
    });
    expect(screen.queryByText("t1")).toBeNull();
    expect(screen.getByText("t2")).toBeInTheDocument();
    expect(screen.getByText("t3")).toBeInTheDocument();
    expect(screen.getByText("t4")).toBeInTheDocument();
  });

  it("is safe to call showToast with no host mounted", () => {
    expect(() => showToast("orphan")).not.toThrow();
  });
});
