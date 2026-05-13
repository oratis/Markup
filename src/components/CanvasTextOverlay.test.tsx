import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CanvasNode } from "../lib/canvas-format";
import { createEmptyCanvasStore } from "../lib/canvas-store";
import { CanvasTextOverlay } from "./CanvasTextOverlay";

function textNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: "n1",
    type: "text",
    x: 10,
    y: 20,
    width: 200,
    height: 100,
    text: "original",
    ...overrides,
  };
}

describe("CanvasTextOverlay", () => {
  it("renders an overlay aligned to the node coords + size", () => {
    const store = createEmptyCanvasStore();
    render(<CanvasTextOverlay node={textNode()} store={store} onClose={() => {}} />);
    const overlay = screen.getByTestId("canvas-text-overlay-n1");
    expect(overlay.style.transform).toContain("translate3d(10px, 20px, 0");
    expect(overlay.style.width).toBe("200px");
    expect(overlay.style.height).toBe("100px");
  });

  it("Esc closes the overlay (commit path)", () => {
    const store = createEmptyCanvasStore();
    const onClose = vi.fn();
    render(<CanvasTextOverlay node={textNode()} store={store} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("contains the Editing hint banner", () => {
    const store = createEmptyCanvasStore();
    render(<CanvasTextOverlay node={textNode()} store={store} onClose={() => {}} />);
    expect(screen.getByText(/Editing/i)).toBeInTheDocument();
  });
});
