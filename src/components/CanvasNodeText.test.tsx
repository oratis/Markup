import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CanvasNode } from "../lib/canvas-format";
import { createEmptyCanvasStore } from "../lib/canvas-store";
import { CanvasNodeText } from "./CanvasNodeText";

function textNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: "n1",
    type: "text",
    x: 40,
    y: 60,
    width: 200,
    height: 100,
    text: "# Title\n\nBody **bold**",
    ...overrides,
  };
}

describe("CanvasNodeText", () => {
  it("renders markdown to HTML inside the node", () => {
    const store = createEmptyCanvasStore();
    render(<CanvasNodeText node={textNode()} zoom={1} store={store} />);
    const el = screen.getByTestId("canvas-node-n1");
    expect(el.innerHTML).toContain("<h1");
    expect(el.innerHTML).toContain("<strong>bold</strong>");
  });

  it("positions the node via translate3d using its world coords", () => {
    const store = createEmptyCanvasStore();
    render(<CanvasNodeText node={textNode()} zoom={1} store={store} />);
    const el = screen.getByTestId("canvas-node-n1");
    expect(el.style.transform).toContain("translate3d(40px, 60px, 0");
  });

  it("uses node width/height for the box size", () => {
    const store = createEmptyCanvasStore();
    render(
      <CanvasNodeText
        node={textNode({ width: 300, height: 150 })}
        zoom={1}
        store={store}
      />,
    );
    const el = screen.getByTestId("canvas-node-n1");
    expect(el.style.width).toBe("300px");
    expect(el.style.height).toBe("150px");
  });

  it("applies selected styling when selected=true", () => {
    const store = createEmptyCanvasStore();
    const { rerender } = render(
      <CanvasNodeText node={textNode()} zoom={1} store={store} />,
    );
    let el = screen.getByTestId("canvas-node-n1");
    expect(el.className).not.toContain("border-blue-500");
    rerender(<CanvasNodeText node={textNode()} zoom={1} store={store} selected />);
    el = screen.getByTestId("canvas-node-n1");
    expect(el.className).toContain("border-blue-500");
  });

  it("a plain click (no drag) toggles selection rather than moving", () => {
    const store = createEmptyCanvasStore();
    const node = textNode();
    store.addNode(node);
    const toggle = vi.spyOn(store, "toggleSelection");
    const move = vi.spyOn(store, "moveNode");
    render(<CanvasNodeText node={node} zoom={1} store={store} />);
    const el = screen.getByTestId("canvas-node-n1");
    // Mock pointer capture API which jsdom doesn't implement.
    el.setPointerCapture = () => {};
    el.releasePointerCapture = () => {};
    fireEvent.pointerDown(el, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(el, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    expect(toggle).toHaveBeenCalledWith("n1", false);
    expect(move).not.toHaveBeenCalled();
  });

  it("non-left-button clicks are ignored", () => {
    const store = createEmptyCanvasStore();
    const toggle = vi.spyOn(store, "toggleSelection");
    render(<CanvasNodeText node={textNode()} zoom={1} store={store} />);
    const el = screen.getByTestId("canvas-node-n1");
    el.setPointerCapture = () => {};
    el.releasePointerCapture = () => {};
    fireEvent.pointerDown(el, { button: 2, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(el, { button: 2, clientX: 100, clientY: 100, pointerId: 1 });
    expect(toggle).not.toHaveBeenCalled();
  });
});
