// src/components/Dashboard/LivePrice.jsx
//
// Cellule de prix temps réel : affiche le Last (ou Bid/Ask) issu du flux WebSocket
// et « flashe » en vert/rouge à chaque mouvement. Purement visuel — n'altère aucun
// calcul de P&L (les agrégats restent servis par le REST / TradingContext).
//
// Usage :
//   <LivePrice symbol={r.isin} fallback={r.pxMid * 100} />
//   <LivePrice symbol="FVZ5" mode="bidask" decimals={4} />

import React, { useEffect, useRef, useState } from "react";
import { useLiveQuote } from "../../contexts/MarketDataContext";

const UP = "#16C784";
const DOWN = "#F6465D";
const FLAT = "#D4E8F5";

const fmt = (v, d) =>
  v == null || isNaN(v) ? "—" : Number(v).toFixed(d);

/**
 * @param symbol   ISIN (bond) ou ticker (future)
 * @param mode     "last" (défaut) | "mid" | "bidask"
 * @param decimals nombre de décimales (3 bonds, 4 futures)
 * @param fallback valeur affichée tant qu'aucun tick n'est reçu (ex. px seedé)
 * @param showChange affiche la variation (pts + %) à côté du prix
 */
const LivePrice = ({
  symbol,
  mode = "last",
  decimals = 3,
  fallback = null,
  showChange = false,
  style,
}) => {
  const { tick, dir } = useLiveQuote(symbol);
  const [flash, setFlash] = useState(0);
  const prevRef = useRef(null);

  const value =
    tick == null
      ? fallback
      : mode === "bidask"
        ? null
        : mode === "mid"
          ? tick.mid
          : tick.last;

  // Flash bref à chaque changement de valeur publiée.
  useEffect(() => {
    if (!tick) return;
    const key = mode === "bidask" ? `${tick.bid}/${tick.ask}` : value;
    if (prevRef.current !== null && prevRef.current !== key) {
      setFlash(dir || 0);
      const id = setTimeout(() => setFlash(0), 280);
      return () => clearTimeout(id);
    }
    prevRef.current = key;
  }, [tick, value, dir, mode]);

  const color = flash === 1 ? UP : flash === -1 ? DOWN : FLAT;
  const arrow = dir === 1 ? "▲" : dir === -1 ? "▼" : "";
  const arrowColor = dir === 1 ? UP : dir === -1 ? DOWN : "transparent";

  const base = {
    fontFamily: "var(--f-mono)",
    fontVariantNumeric: "tabular-nums",
    transition: "color 0.18s ease",
    color,
    ...style,
  };

  if (mode === "bidask") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...base }}>
        <span style={{ color: DOWN }}>{tick ? fmt(tick.bid, decimals) : "—"}</span>
        <span style={{ opacity: 0.4 }}>/</span>
        <span style={{ color: UP }}>{tick ? fmt(tick.ask, decimals) : "—"}</span>
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...base }}>
      <span>{fmt(value, decimals)}</span>
      {arrow && (
        <span style={{ fontSize: "0.7em", color: arrowColor, lineHeight: 1 }}>
          {arrow}
        </span>
      )}
      {showChange && tick && (
        <span
          style={{
            fontSize: "0.78em",
            color: tick.netChange >= 0 ? UP : DOWN,
            opacity: 0.85,
          }}
        >
          {tick.netChange >= 0 ? "+" : ""}
          {fmt(tick.netChange, decimals)} ({tick.pctChange >= 0 ? "+" : ""}
          {fmt(tick.pctChange, 2)}%)
        </span>
      )}
    </span>
  );
};

export default LivePrice;
