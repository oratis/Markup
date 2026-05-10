import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Resizer } from "./Resizer";

describe("Resizer", () => {
  it("renders a separator with the given aria-label", () => {
    render(<Resizer side="right" width={200} onChange={() => {}} label="Sidebar" />);
    expect(screen.getByRole("separator", { name: "Sidebar" })).toBeInTheDocument();
  });

  it("dragging the right-side handle right grows the panel", () => {
    const onChange = vi.fn();
    render(<Resizer side="right" width={200} onChange={onChange} />);
    const handle = screen.getByRole("separator");
    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 150 });
    expect(onChange).toHaveBeenLastCalledWith(250);
    fireEvent.pointerUp(window);
  });

  it("dragging the left-side handle right shrinks the panel", () => {
    const onChange = vi.fn();
    render(<Resizer side="left" width={200} onChange={onChange} />);
    const handle = screen.getByRole("separator");
    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 150 });
    expect(onChange).toHaveBeenLastCalledWith(160); // 200 - 50, clamped to min
    fireEvent.pointerUp(window);
  });

  it("clamps to the configured min/max", () => {
    const onChange = vi.fn();
    render(<Resizer side="right" width={200} onChange={onChange} min={150} max={300} />);
    fireEvent.pointerDown(screen.getByRole("separator"), { clientX: 100 });
    // Drag way left → would be 50, clamped to 150
    fireEvent.pointerMove(window, { clientX: -200 });
    expect(onChange).toHaveBeenLastCalledWith(150);
    // Drag way right → would be 600, clamped to 300
    fireEvent.pointerMove(window, { clientX: 600 });
    expect(onChange).toHaveBeenLastCalledWith(300);
    fireEvent.pointerUp(window);
  });

  it("removes the global pointermove listener after pointerup", () => {
    const onChange = vi.fn();
    render(<Resizer side="right" width={200} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByRole("separator"), { clientX: 100 });
    fireEvent.pointerUp(window);
    onChange.mockClear();
    fireEvent.pointerMove(window, { clientX: 200 });
    expect(onChange).not.toHaveBeenCalled();
  });
});
