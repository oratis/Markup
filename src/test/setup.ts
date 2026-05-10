import "@testing-library/jest-dom/vitest";

// jsdom logs "Not implemented" for confirm/alert/prompt every call. Override
// to silent defaults; tests that care use vi.spyOn for explicit values.
if (typeof window !== "undefined") {
  window.confirm = () => true;
  window.alert = () => undefined;
  window.prompt = () => "";
}
