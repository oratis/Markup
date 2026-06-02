import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Last-resort guard so a render-time throw degrades to a recoverable message
 * instead of a blank white window. The common trigger is a restored tab whose
 * content makes a plugin throw during render (e.g. a malformed `$…$` math
 * span); "Close restored tabs & reload" clears the persisted session so the
 * app can boot clean without DevTools.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Markup render error:", error, info);
  }

  private reload = () => {
    window.location.reload();
  };

  private resetSessionAndReload = () => {
    // The usual culprit is the restored open-tab session pointing at a doc
    // that throws on render. Drop it (keep settings/vault) and reload.
    try {
      localStorage.removeItem("markup.session");
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        style={{
          padding: "2rem",
          maxWidth: 640,
          margin: "10vh auto",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif",
          color: "#1f2328",
          lineHeight: 1.6,
        }}
      >
        <h2 style={{ margin: "0 0 0.5rem" }}>Markup hit a rendering error</h2>
        <p style={{ margin: "0 0 1rem", color: "#57606a" }}>
          Something in the current document failed to render. Your files on disk are
          untouched. Reloading without the restored tabs usually fixes it.
        </p>
        <pre
          style={{
            background: "#f6f8fa",
            padding: "0.75rem",
            borderRadius: 6,
            overflow: "auto",
            fontSize: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {error.message}
        </pre>
        <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
          <button
            type="button"
            onClick={this.resetSessionAndReload}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: "#0969da",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Close restored tabs &amp; reload
          </button>
          <button
            type="button"
            onClick={this.reload}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid #d0d7de",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Just reload
          </button>
        </div>
      </div>
    );
  }
}
