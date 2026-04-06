import { Component } from "react";

const C = {
  card: "#1f2937",
  border: "#374151",
  text: "#f9fafb",
  muted: "#9ca3af",
  red: "#ef4444",
  surface: "#111827",
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{
            display: "inline-block",
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "32px 48px",
            maxWidth: 480,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>Something went wrong</div>
            <div style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>
              This page encountered an error. Try refreshing or navigating to a different page.
            </div>
            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              color: C.red,
              fontFamily: "monospace",
              textAlign: "left",
              marginBottom: 16,
              maxHeight: 100,
              overflow: "auto",
            }}>
              {this.state.error?.message || "Unknown error"}
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
