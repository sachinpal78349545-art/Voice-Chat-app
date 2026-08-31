import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0d001a 0%, #1a0030 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "'Poppins', 'Inter', sans-serif",
          color: "#fff",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🌌</div>
          <h2 style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#a78bfa",
            marginBottom: 8,
            textShadow: "0 0 20px rgba(139,92,246,0.6)",
          }}>
            Oops! Something went wrong
          </h2>
          <p style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.55)",
            maxWidth: 300,
            marginBottom: 28,
            lineHeight: 1.6,
          }}>
            Don't worry — your account is safe. Please try refreshing the page.
          </p>
          {this.state.error && (
            <div style={{
              background: "rgba(255,60,60,0.08)",
              border: "1px solid rgba(255,60,60,0.2)",
              borderRadius: 10,
              padding: "10px 16px",
              marginBottom: 24,
              maxWidth: 320,
              fontSize: 11,
              color: "rgba(255,120,120,0.8)",
              fontFamily: "monospace",
              wordBreak: "break-word",
              textAlign: "left",
            }}>
              {this.state.error.message}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={this.handleReset}
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                color: "#fff",
                border: "none",
                borderRadius: 24,
                padding: "12px 28px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 24,
                padding: "12px 28px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
