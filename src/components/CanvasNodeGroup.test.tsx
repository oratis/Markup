import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CanvasNode } from "../lib/canvas-format";
import { createEmptyCanvasStore } from "../lib/canvas-store";
import { CanvasNodeGroup } from "./CanvasNodeGroup";

function groupNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: "g1",
    type: "group",
    x: -20,
    y: -20,
    width: 600,
    height: 300,
    label: "Section A",
    ...overrides,
  };
}

describe("CanvasNodeGroup", () => {
  it("renders the frame at world coords", () => {
    const store = createEmptyCanvasStore();
    render(<CanvasNodeGroup node={groupNode()} zoom={1} store={store} />);
    const el = screen.getByTestId("canvas-node-g1");
    expect(el.style.transform).toContain("translate3d(-20px, -20px, 0");
    expect(el.style.width).toBe("600px");
    expect(el.style.height).toBe("300px");
  });

  it("shows the label", () => {
    const store = createEmptyCanvasStore();
    render(<CanvasNodeGroup node={groupNode()} zoom={1} store={store} />);
    expect(screen.getByTestId("canvas-node-g1-label")).toHaveTextContent("Section A");
  });

  it('falls back to "Group" when label is missing', () => {
    const store = createEmptyCanvasStore();
    render(
      <CanvasNodeGroup node={groupNode({ label: undefined })} zoom={1} store={store} />,
    );
    expect(screen.getByTestId("canvas-node-g1-label")).toHaveTextContent("Group");
  });

  it("selecting state adds the blue border on the frame", () => {
    const store = createEmptyCanvasStore();
    const { rerender } = render(
      <CanvasNodeGroup node={groupNode()} zoom={1} store={store} />,
    );
    expect(screen.getByTestId("canvas-node-g1").className).not.toContain(
      "border-blue-500",
    );
    rerender(<CanvasNodeGroup node={groupNode()} zoom={1} store={store} selected />);
    expect(screen.getByTestId("canvas-node-g1").className).toContain("border-blue-500");
  });

  it("click on the label band toggles selection", () => {
    const store = createEmptyCanvasStore();
    const toggle = vi.spyOn(store, "toggleSelection");
    render(<CanvasNodeGroup node={groupNode()} zoom={1} store={store} />);
    const band = screen.getByTestId("canvas-node-g1-label");
    band.setPointerCapture = () => {};
    band.releasePointerCapture = () => {};
    fireEvent.pointerDown(band, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerUp(band, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    expect(toggle).toHaveBeenCalledWith("g1", false);
  });
});
