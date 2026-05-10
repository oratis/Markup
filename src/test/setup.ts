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

// jsdom doesn't implement Range.getClientRects / getBoundingClientRect.
// CM6 uses both in its scroll-into-view + selection-painting paths; the
// missing methods crash asynchronously and Vitest surfaces those as
// unhandled errors. Empty rects are a safe stand-in (no layout in jsdom).
if (typeof Range !== "undefined") {
  if (typeof Range.prototype.getClientRects !== "function") {
    Range.prototype.getClientRects = () =>
      ({
        length: 0,
        item: () => null,
        [Symbol.iterator]: function* () {},
      }) as unknown as DOMRectList;
  }
  if (typeof Range.prototype.getBoundingClientRect !== "function") {
    Range.prototype.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }) as DOMRect;
  }
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
