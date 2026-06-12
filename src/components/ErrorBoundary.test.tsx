import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("kaboom from render");
}

beforeEach(() => {
  // React logs caught render errors loudly; keep test output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
  // jsdom's location.reload is unimplemented (navigation); neuter it when the
  // environment allows so clicking the recovery buttons stays quiet.
  try {
    window.location.reload = vi.fn() as unknown as typeof window.location.reload;
  } catch {
    /* non-writable in this jsdom — the not-implemented warning is harmless */
  }
});

describe("ErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("catches a render-time throw and shows the recovery UI with the message", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/hit a rendering error/i)).toBeInTheDocument();
    expect(screen.getByText("kaboom from render")).toBeInTheDocument();
    expect(screen.getByText(/Close restored tabs/)).toBeInTheDocument();
    expect(screen.getByText("Just reload")).toBeInTheDocument();
  });

  it("'Close restored tabs & reload' clears the persisted session", () => {
    localStorage.setItem("markup.session", '{"open":["/gone.md"]}');
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByText(/Close restored tabs/));
    expect(localStorage.getItem("markup.session")).toBeNull();
  });

  it("'Just reload' leaves the persisted session in place", () => {
    localStorage.setItem("markup.session", '{"open":["/keep.md"]}');
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByText("Just reload"));
    expect(localStorage.getItem("markup.session")).toBe('{"open":["/keep.md"]}');
  });
});
