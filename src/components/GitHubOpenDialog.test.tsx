import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The dialog only imports these two from lib/tauri; a focused mock keeps the
// test off the network and away from the Tauri IPC bridge.
vi.mock("../lib/tauri", () => ({
  openGitHubRepoVault: vi.fn(
    async () => "/Users/test/Library/Caches/markup/github/octocat/main/hello",
  ),
  listenGitHubVaultProgress: vi.fn(async () => () => {}),
}));

import { openGitHubRepoVault } from "../lib/tauri";
import { GitHubOpenDialog } from "./GitHubOpenDialog";

beforeEach(() => {
  vi.mocked(openGitHubRepoVault).mockClear();
  // enterDir() fetches the repo contents; an empty array is a valid dir.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => [] })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GitHubOpenDialog — open repo as vault", () => {
  it("surfaces 'Open as vault' as the primary action once a repo URL is entered", () => {
    render(
      <GitHubOpenDialog onClose={() => {}} onOpen={() => {}} onOpenVault={() => {}} />,
    );
    // Nothing typed yet → no vault action.
    expect(screen.queryByText("Open as vault")).toBeNull();

    const input = screen.getByPlaceholderText(/owner\/repo/i);
    fireEvent.change(input, { target: { value: "octocat/hello" } });

    // A bare repo root makes "Open as vault" the primary action, with a
    // secondary "Browse" — no need to drill in first.
    expect(screen.getByText("Open as vault")).toBeTruthy();
    expect(screen.getByText("Browse")).toBeTruthy();
  });

  it("materializes the repo and hands the local dir to onOpenVault", async () => {
    const onOpenVault = vi.fn();
    const onClose = vi.fn();
    render(
      <GitHubOpenDialog onClose={onClose} onOpen={() => {}} onOpenVault={onOpenVault} />,
    );

    const input = screen.getByPlaceholderText(/owner\/repo/i);
    fireEvent.change(input, { target: { value: "octocat/hello" } });
    fireEvent.click(screen.getByText("Open as vault"));

    await waitFor(() => expect(onOpenVault).toHaveBeenCalledTimes(1));
    // ref + token are absent for a bare owner/repo and a signed-out session.
    expect(openGitHubRepoVault).toHaveBeenCalledWith(
      "octocat",
      "hello",
      undefined,
      undefined,
    );
    expect(onOpenVault).toHaveBeenCalledWith(
      "/Users/test/Library/Caches/markup/github/octocat/main/hello",
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("Enter on a repo URL opens it as a vault directly (no extra browse step)", async () => {
    const onOpenVault = vi.fn();
    render(
      <GitHubOpenDialog onClose={() => {}} onOpen={() => {}} onOpenVault={onOpenVault} />,
    );

    const input = screen.getByPlaceholderText(/owner\/repo/i);
    fireEvent.change(input, { target: { value: "octocat/hello" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(onOpenVault).toHaveBeenCalledTimes(1));
  });
});
