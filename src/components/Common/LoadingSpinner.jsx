import React from "react";
import { Activity } from "lucide-react";

const LoadingSpinner = ({ message = "Chargement…" }) => (
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
    <div style={{ position: "relative", width: 52, height: 52 }}>
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
        size={14}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          color: "var(--cyan)",
        }}
      />
    </div>
    <p
      style={{
        fontFamily: "var(--f-disp)",
        fontSize: "0.72rem",
        fontWeight: 600,
        color: "var(--tx2)",
        letterSpacing: "0.04em",
      }}
    >
      {message}
    </p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default LoadingSpinner;
