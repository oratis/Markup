import "@testing-library/jest-dom/vitest";

// jsdom logs "Not implemented" for confirm/alert/prompt every call. Override
// to silent defaults; tests that care use vi.spyOn for explicit values.
if (typeof window !== "undefined") {
  window.confirm = () => true;
  window.alert = () => undefined;
  window.prompt = () => "";
}

// jsdom lacks ResizeObserver / IntersectionObserver — @tanstack/react-virtual
// uses ResizeObserver to measure the scroll container. Without it the
// virtual list renders 0 rows in tests. A minimal stub that pretends to
// observe is enough to let it produce its initial render based on the
// estimated row height + count.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
}
if (typeof window !== "undefined") {
  // biome-ignore lint/suspicious/noExplicitAny: jsdom test stubs
  (window as any).ResizeObserver = (window as any).ResizeObserver || ResizeObserverStub;
  // biome-ignore lint/suspicious/noExplicitAny: jsdom test stubs
  (window as any).IntersectionObserver =
    // biome-ignore lint/suspicious/noExplicitAny: jsdom test stubs
    (window as any).IntersectionObserver || IntersectionObserverStub;
}

// Force a non-zero clientHeight on every element so tanstack/react-virtual
// has a viewport size to render against.
Object.defineProperty(HTMLElement.prototype, "clientHeight", {
  configurable: true,
  get(): number {
    return 800;
  },
});
Object.defineProperty(HTMLElement.prototype, "clientWidth", {
  configurable: true,
  get(): number {
    return 600;
  },
});
