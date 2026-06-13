import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../store";
import { DocPager } from "./DocPager";

vi.mock("../lib/tauri", () => ({
  readFile: vi.fn(async (path: string) => ({
    path,
    content: "x",
    mtimeMs: 1,
  })),
}));

function vf(relPath: string) {
  const name = relPath.slice(relPath.lastIndexOf("/") + 1);
  return { path: `/v/${relPath}`, relPath, name, mtimeMs: 0, size: 0 };
}

beforeEach(() => {
  useAppStore.setState({
    vaultSort: "name",
    vaultFiles: [vf("a.md"), vf("b.md"), vf("c.md")],
    tabs: [
      {
        id: "/v/b.md",
        path: "/v/b.md",
        name: "b.md",
        content: "x",
        mtimeMs: 1,
        status: "saved",
        errorMessage: null,
      },
    ],
    activeTabId: "/v/b.md",
  });
});

describe("DocPager", () => {
  it("shows the previous and next doc names (stemmed)", () => {
    render(<DocPager />);
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument();
  });

  it("renders nothing when the active doc has no neighbours", () => {
    useAppStore.setState({ vaultFiles: [vf("only.md")], activeTabId: "/v/only.md" });
    useAppStore.setState({
      tabs: [
        {
          id: "/v/only.md",
          path: "/v/only.md",
          name: "only.md",
          content: "x",
          mtimeMs: 1,
          status: "saved",
          errorMessage: null,
        },
      ],
    });
    const { container } = render(<DocPager />);
    expect(container.firstChild).toBeNull();
  });

  it("opens the next doc on click", async () => {
    const opened: string[] = [];
    useAppStore.setState({
      openLoadedFile: (l: { path: string }) => opened.push(l.path),
    });
    render(<DocPager />);
    fireEvent.click(screen.getByText("c"));
    await waitFor(() => expect(opened).toEqual(["/v/c.md"]));
  });
});
