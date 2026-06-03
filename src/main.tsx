import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
// KaTeX CSS is imported here, NOT via `@import` in index.css: an `@import`
// placed after the `@tailwind` directives is a CSS-spec violation that Vite
// silently DROPS from the production build (the dev server tolerates it).
// That left release builds with no KaTeX fonts/metrics, so in-app math
// rendered unstyled. A JS import bundles it reliably, after index.css so it
// still layers on top of the Tailwind base.
import "katex/dist/katex.min.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
