import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      "[ErrorBoundary] caught:",
      error?.message,
      error,
      "\n",
      errorInfo?.componentStack,
    );
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const err = this.state.error;

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--void)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "var(--base)",
            border: "1px solid rgba(255,43,96,0.28)",
            borderRadius: 14,
            padding: "40px 36px",
            maxWidth: 540,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 8px 48px rgba(0,0,0,0.40)",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              margin: "0 auto 22px",
              background: "rgba(255,43,96,0.10)",
              border: "1px solid rgba(255,43,96,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={26} style={{ color: "var(--loss)" }} />
          </div>

          <h2
            style={{
              fontFamily: "var(--f-disp)",
              fontWeight: 800,
              fontSize: "0.88rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--tx1)",
              marginBottom: 10,
            }}
          >
            Erreur de rendu
          </h2>

          <p
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.82rem",
              color: "var(--tx2)",
              marginBottom: 24,
              lineHeight: 1.65,
            }}
          >
            Un problème inattendu est survenu dans cette section. Cliquez sur{" "}
            <strong style={{ color: "var(--tx1)" }}>Réessayer</strong> ou
            rafraîchissez la page.
          </p>

          {/* Error details — always visible so the exact crash can be diagnosed */}
          {err && (
            <div
              style={{
                background: "var(--surf)",
                border: "1px solid var(--b2)",
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 26,
                textAlign: "left",
                overflowX: "auto",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: "0.70rem",
                  fontWeight: 600,
                  color: "var(--loss)",
                  marginBottom: err.stack ? 8 : 0,
                }}
              >
                {err.name}: {err.message}
              </p>
              {err.stack && (
                <pre
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: "0.60rem",
                    color: "var(--tx3)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {err.stack.split("\n").slice(1, 8).join("\n")}
                </pre>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 18px",
                borderRadius: 7,
                background: "var(--surf)",
                border: "1px solid var(--b2)",
                fontFamily: "var(--f-disp)",
                fontWeight: 700,
                fontSize: "0.65rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--tx1)",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={12} />
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 18px",
                borderRadius: 7,
                background: "var(--cyan)",
                border: "none",
                fontFamily: "var(--f-disp)",
                fontWeight: 700,
                fontSize: "0.65rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--void)",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={12} />
              Rafraîchir
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
