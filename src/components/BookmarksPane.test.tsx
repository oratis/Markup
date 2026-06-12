import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { _resetBookmarks, addBookmark, getBookmarks } from "../lib/bookmarks";
import { BookmarksPane } from "./BookmarksPane";

beforeEach(() => {
  _resetBookmarks();
});

describe("BookmarksPane", () => {
  it("renders nothing when there are no bookmarks", () => {
    const { container } = render(<BookmarksPane />);
    expect(container.firstChild).toBeNull();
  });

  it("lists bookmarked files by basename with a count", () => {
    addBookmark("/vault/notes/alpha.md");
    addBookmark("/vault/beta.md");
    render(<BookmarksPane />);
    expect(screen.getByText(/alpha\.md/)).toBeInTheDocument();
    expect(screen.getByText(/beta\.md/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("the × button unbookmarks just that file", () => {
    addBookmark("/vault/a.md");
    addBookmark("/vault/b.md");
    render(<BookmarksPane />);
    const removeButtons = screen.getAllByLabelText("Remove bookmark");
    fireEvent.click(removeButtons[0]);
    expect(getBookmarks()).toEqual(["/vault/b.md"]);
    expect(screen.queryByText(/a\.md/)).toBeNull();
    expect(screen.getByText(/b\.md/)).toBeInTheDocument();
  });

  it("reacts to bookmarks added while mounted", () => {
    const { container } = render(<BookmarksPane />);
    expect(container.firstChild).toBeNull();
    act(() => {
      addBookmark("/vault/late.md");
    });
    expect(screen.getByText(/late\.md/)).toBeInTheDocument();
  });
});
