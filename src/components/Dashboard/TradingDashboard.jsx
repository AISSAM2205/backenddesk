import React from "react";
import { useTrading } from "../../contexts/TradingContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MainContent from "./MainContent";
import TickerBar from "./TickerBar";
import { RefreshCw, AlertTriangle, Activity } from "lucide-react";

const TradingDashboard = () => {
  const { loading, error, refresh } = useTrading();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--void)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {/* Animated logo placeholder */}
        <div style={{ position: "relative", width: 56, height: 56 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "2px solid var(--b1)",
              borderTopColor: "var(--cyan)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 8,
              border: "1px solid var(--b0)",
              borderTopColor: "var(--profit)",
              borderRadius: "50%",
              animation: "spin 1.5s linear infinite reverse",
            }}
          />
          <Activity
            size={16}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              color: "var(--cyan)",
            }}
          />
        </div>

        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--f-disp)",
              fontWeight: 600,
              fontSize: "0.82rem",
              color: "var(--tx1)",
              letterSpacing: "0.04em",
            }}
          >
            Chargement du Trading Desk
          </p>
          <p
            style={{
              fontFamily: "var(--f-disp)",
              fontSize: "0.60rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--tx3)",
              marginTop: 6,
            }}
          >
            Fixed Income — Desk International
          </p>
        </div>

        {/* Loading dots */}
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--cyan)",
                animation: `pulse-live 1.2s ease infinite ${i * 0.3}s`,
              }}
            />
          ))}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--void)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(255,43,96,0.10)",
            border: "1px solid rgba(255,43,96,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertTriangle size={24} style={{ color: "var(--loss)" }} />
        </div>
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <h2
            style={{
              fontFamily: "var(--f-disp)",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "var(--loss)",
              marginBottom: 8,
            }}
          >
            Erreur de connexion
          </h2>
          <p
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.78rem",
              color: "var(--tx2)",
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            {error}
          </p>
          <button
            onClick={refresh}
            className="btn btn-ghost btn-sm"
            style={{ margin: "0 auto", display: "inline-flex" }}
          >
            <RefreshCw size={12} /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        background: "var(--void)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TopBar />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Sidebar />
        <MainContent />
      </div>
      <TickerBar />
    </div>
  );
};

export default TradingDashboard;
