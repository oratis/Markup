import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { type Tab, useAppStore } from "../store";
import { TabBar } from "./TabBar";

function makeTab(id: string, name: string, status: Tab["status"] = "saved"): Tab {
  return {
    id,
    path: id,
    name,
    content: "",
    mtimeMs: 1,
    status,
    errorMessage: null,
  };
}

beforeEach(() => {
  useAppStore.setState({ tabs: [], activeTabId: null });
});

describe("TabBar", () => {
  it("renders nothing for a single-tab state (no tab strip needed)", () => {
    useAppStore.setState({
      tabs: [makeTab("/a.md", "a.md")],
      activeTabId: "/a.md",
    });
    const { container } = render(<TabBar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one element per tab when there are >= 2", () => {
    useAppStore.setState({
      tabs: [makeTab("/a.md", "a.md"), makeTab("/b.md", "b.md")],
      activeTabId: "/a.md",
    });
    render(<TabBar />);
    expect(screen.getByText("a.md")).toBeInTheDocument();
    expect(screen.getByText("b.md")).toBeInTheDocument();
  });

  it("clicking an inactive tab makes it active", () => {
    useAppStore.setState({
      tabs: [makeTab("/a.md", "a.md"), makeTab("/b.md", "b.md")],
      activeTabId: "/a.md",
    });
    render(<TabBar />);
    fireEvent.click(screen.getByText("b.md"));
    expect(useAppStore.getState().activeTabId).toBe("/b.md");
  });

  it("dragging tab A onto tab B reorders A after B's index", () => {
    useAppStore.setState({
      tabs: [
        makeTab("/a.md", "a.md"),
        makeTab("/b.md", "b.md"),
        makeTab("/c.md", "c.md"),
      ],
      activeTabId: "/a.md",
    });
    render(<TabBar />);
    const aRow = screen.getByText("a.md").parentElement!;
    const cRow = screen.getByText("c.md").parentElement!;

    // Stub a tiny DataTransfer compatible enough for the handlers.
    const data = new Map<string, string>();
    const dt = {
      types: ["application/x-markup-tab"],
      effectAllowed: "move",
      dropEffect: "move",
      setData: (k: string, v: string) => data.set(k, v),
      getData: (k: string) => data.get(k) ?? "",
    };

    fireEvent.dragStart(aRow, { dataTransfer: dt });
    fireEvent.dragOver(cRow, { dataTransfer: dt });
    fireEvent.drop(cRow, { dataTransfer: dt });

    const ids = useAppStore.getState().tabs.map((t) => t.id);
    expect(ids).toEqual(["/b.md", "/c.md", "/a.md"]);
  });
});
