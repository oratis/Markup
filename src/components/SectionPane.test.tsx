import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../store";
import { SectionPane } from "./SectionPane";

vi.mock("../lib/tauri", () => ({
  readFile: vi.fn(async (path: string) => ({ path, content: "x", mtimeMs: 1 })),
}));

function vf(relPath: string) {
  const name = relPath.slice(relPath.lastIndexOf("/") + 1);
  return { path: `/v/${relPath}`, relPath, name, mtimeMs: 0, size: 0 };
}

function setActive(path: string) {
  const name = path.slice(path.lastIndexOf("/") + 1);
  useAppStore.setState({
    vaultSort: "name",
    vaultRoot: "/v",
    vaultFiles: [vf("docs/a.md"), vf("docs/b.md"), vf("docs/c.canvas"), vf("top.md")],
    tabs: [
      {
        id: path,
        path,
        name,
        content: "x",
        mtimeMs: 1,
        status: "saved",
        errorMessage: null,
      },
    ],
    activeTabId: path,
  });
}

beforeEach(() => setActive("/v/docs/a.md"));

describe("SectionPane", () => {
  it("lists the markdown siblings of the active doc's folder", () => {
    render(<SectionPane />);
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
    // canvas sibling is excluded; the root-level doc isn't in this folder.
    expect(screen.queryByText("c")).toBeNull();
    expect(screen.queryByText("top")).toBeNull();
  });

  it("shows the folder name as the header", () => {
    render(<SectionPane />);
    expect(screen.getByText("docs")).toBeInTheDocument();
  });

  it("opens a sibling on click (but not the already-active one)", async () => {
    const opened: string[] = [];
    useAppStore.setState({
      openLoadedFile: (l: { path: string }) => opened.push(l.path),
    });
    render(<SectionPane />);
    fireEvent.click(screen.getByText("b"));
    await waitFor(() => expect(opened).toEqual(["/v/docs/b.md"]));
  });

  it("renders an empty message when there's no active file", () => {
    useAppStore.setState({ tabs: [], activeTabId: null });
    render(<SectionPane />);
    expect(screen.getByText(/no documents in this folder/i)).toBeInTheDocument();
  });
});
