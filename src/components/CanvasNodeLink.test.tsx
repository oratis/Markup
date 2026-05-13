import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CanvasNode } from "../lib/canvas-format";
import { createEmptyCanvasStore } from "../lib/canvas-store";
import { CanvasNodeLink } from "./CanvasNodeLink";

function linkNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: "l1",
    type: "link",
    x: 0,
    y: 0,
    width: 320,
    height: 200,
    url: "https://example.com/path",
    ...overrides,
  };
}

describe("CanvasNodeLink", () => {
  it("shows the parsed hostname for an http URL", () => {
    const store = createEmptyCanvasStore();
    render(<CanvasNodeLink node={linkNode()} zoom={1} store={store} />);
    expect(screen.getByTestId("canvas-node-l1-host")).toHaveTextContent("example.com");
  });

  it("shows the full URL body", () => {
    const store = createEmptyCanvasStore();
    render(<CanvasNodeLink node={linkNode()} zoom={1} store={store} />);
    expect(screen.getByTestId("canvas-node-l1-url")).toHaveTextContent(
      "https://example.com/path",
    );
  });

  it("falls back to raw url string when parsing fails", () => {
    const store = createEmptyCanvasStore();
    render(
      <CanvasNodeLink
        node={linkNode({ url: "mailto:foo@bar.com" })}
        zoom={1}
        store={store}
      />,
    );
    expect(screen.getByTestId("canvas-node-l1-host")).toHaveTextContent(
      "mailto:foo@bar.com",
    );
  });

  it('shows "(no URL)" when node.url is missing', () => {
    const store = createEmptyCanvasStore();
    render(<CanvasNodeLink node={linkNode({ url: undefined })} zoom={1} store={store} />);
    expect(screen.getByTestId("canvas-node-l1-host")).toHaveTextContent("(no URL)");
    expect(screen.getByTestId("canvas-node-l1-url")).toHaveTextContent("(no URL)");
  });

  it("double-click on a valid URL calls window.open", () => {
    const store = createEmptyCanvasStore();
    const spy = vi.spyOn(window, "open").mockReturnValue(null);
    render(<CanvasNodeLink node={linkNode()} zoom={1} store={store} />);
    const root = screen.getByTestId("canvas-node-l1");
    root.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(spy).toHaveBeenCalledWith(
      "https://example.com/path",
      "_blank",
      "noopener,noreferrer",
    );
    spy.mockRestore();
  });

  it("double-click on a dangerous URL is ignored", () => {
    const store = createEmptyCanvasStore();
    const spy = vi.spyOn(window, "open").mockReturnValue(null);
    render(
      <CanvasNodeLink
        node={linkNode({ url: "javascript:alert(1)" })}
        zoom={1}
        store={store}
      />,
    );
    const root = screen.getByTestId("canvas-node-l1");
    root.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
