import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../store";
import { Outline } from "./Outline";

const SAMPLE = `# Top

intro

## Section A

\`\`\`
# fake heading inside fence
\`\`\`

### Sub A1

## Section B
`;

beforeEach(() => {
  // Replace the welcome tab with one containing our sample so Outline reads it.
  useAppStore.setState({
    tabs: [
      {
        id: "/sample.md",
        path: "/sample.md",
        name: "sample.md",
        content: SAMPLE,
        mtimeMs: 1,
        status: "saved",
        errorMessage: null,
      },
    ],
    activeTabId: "/sample.md",
  });
});

describe("Outline (rendered)", () => {
  it("renders all real headings, skipping ones in fenced code", () => {
    render(<Outline />);
    expect(screen.getByText("Top")).toBeInTheDocument();
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Sub A1")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
    expect(screen.queryByText("fake heading inside fence")).toBeNull();
  });

  it("filters headings by the input substring (case-insensitive)", () => {
    render(<Outline />);
    const input = screen.getByPlaceholderText(/filter/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "section" } });
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
    expect(screen.queryByText("Top")).toBeNull();
    expect(screen.queryByText("Sub A1")).toBeNull();
  });

  it("shows the no-match hint when the filter excludes everything", () => {
    render(<Outline />);
    const input = screen.getByPlaceholderText(/filter/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "zzzzzzz" } });
    expect(screen.getByText(/no matching headings/i)).toBeInTheDocument();
  });

  it("right-clicking a heading row opens a context menu", () => {
    render(<Outline />);
    fireEvent.contextMenu(screen.getByText("Section A"));
    expect(screen.getByText(/copy wikilink to heading/i)).toBeInTheDocument();
    expect(screen.getByText(/copy heading text/i)).toBeInTheDocument();
  });

  it("level chips cap the rendered depth and toggle off on a second click", () => {
    render(<Outline />);
    // Cap to H1: chip text is "H1".
    const h1Chip = screen.getByRole("button", { name: "H1" });
    fireEvent.click(h1Chip);
    expect(screen.getByText("Top")).toBeInTheDocument();
    expect(screen.queryByText("Section A")).toBeNull();
    expect(screen.queryByText("Sub A1")).toBeNull();
    // Click the same chip again → back to all levels
    fireEvent.click(h1Chip);
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Sub A1")).toBeInTheDocument();
  });

  it('shows "No headings." when active tab has no headings', () => {
    useAppStore.setState({
      tabs: [
        {
          id: "/empty.md",
          path: "/empty.md",
          name: "empty.md",
          content: "just paragraphs\nno headings here",
          mtimeMs: 1,
          status: "saved",
          errorMessage: null,
        },
      ],
      activeTabId: "/empty.md",
    });
    render(<Outline />);
    expect(screen.getByText(/no headings/i)).toBeInTheDocument();
  });
});
