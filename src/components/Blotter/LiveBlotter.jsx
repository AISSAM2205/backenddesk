// src/components/Blotter/LiveBlotter.jsx
//
// Grille de marché TEMPS RÉEL, fixe (non défilante) — l'outil de travail du trader.
// Une ligne par instrument coté ; colonnes Bid / Ask / Last / Δ / Δ% / G-Spd / MtM.
// Chaque ligne « flashe » vert/rouge à chaque tick. Toutes les valeurs dérivent du
// flux WebSocket via useLiveDesk (le P&L respire avec les prix, sans toucher au
// baseline calibré).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTrading } from "../../contexts/TradingContext";
import useLiveDesk from "../../hooks/useLiveDesk";

const UP = "#16C784";
const DOWN = "#F6465D";
const TX = "#D4E8F5";

const fmt = (v, d = 3) =>
  v == null || isNaN(v) ? "—" : Number(v).toFixed(d);

const fMad = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  const a = Math.abs(n);
  const s = n >= 0 ? "+" : "−";
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)} M`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(1)}k`;
  return `${s}${a.toFixed(0)}`;
};

const TH = ({ children, align = "right" }) => (
  <th
    style={{
      textAlign: align,
      padding: "7px 12px",
      fontFamily: "var(--f-disp)",
      fontWeight: 700,
      fontSize: "0.56rem",
      letterSpacing: "0.10em",
      textTransform: "uppercase",
      color: "var(--tx3)",
      borderBottom: "1px solid var(--b1)",
      position: "sticky",
      top: 0,
      background: "var(--base)",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </th>
);

const Td = ({ children, color = TX, align = "right", bold, mono = true }) => (
  <td
    style={{
      textAlign: align,
      padding: "6px 12px",
      fontFamily: mono ? "var(--f-mono)" : "var(--f-body)",
      fontVariantNumeric: "tabular-nums",
      fontSize: "0.72rem",
      fontWeight: bold ? 700 : 500,
      color,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </td>
);

/* ─── Une ligne — flashe à chaque changement de Last ───────────────── */
const BlotterRow = ({ r }) => {
  const last = r.liveLast;
  const dir = r._dir || 0;
  const [flash, setFlash] = useState(null);
  const prev = useRef(last);

  useEffect(() => {
    if (last != null && prev.current != null && last !== prev.current) {
      setFlash(last > prev.current ? UP : DOWN);
      const id = setTimeout(() => setFlash(null), 320);
      prev.current = last;
      return () => clearTimeout(id);
    }
    prev.current = last;
  }, [last]);

  const chg = r.liveNetChange ?? 0;
  const pct = r.livePctChange ?? 0;
  const chgColor = chg > 0 ? UP : chg < 0 ? DOWN : "var(--tx3)";
  const mtm = parseFloat(r.pnlLatentMad ?? 0);
  const desc = (r.description || "").split(" ").slice(0, 4).join(" ");

  return (
    <tr
      style={{
        background: flash ? `${flash}1F` : "transparent",
        transition: "background 0.28s ease",
        borderBottom: "1px solid var(--b0)",
      }}
    >
      <Td align="left" mono={false} bold color="var(--tx1)">
        <span style={{ fontFamily: "var(--f-mono)", color: "#FF7A7A" }}>
          {r.isin}
        </span>
        <span style={{ color: "var(--tx3)", marginLeft: 8, fontSize: "0.66rem" }}>
          {desc}
        </span>
      </Td>
      <Td color={DOWN}>{fmt(r.liveBid)}</Td>
      <Td color={UP}>{fmt(r.liveAsk)}</Td>
      <Td bold color={dir > 0 ? UP : dir < 0 ? DOWN : TX}>
        {fmt(last)}
        {dir !== 0 && (
          <span style={{ fontSize: "0.62rem", marginLeft: 3 }}>
            {dir > 0 ? "▲" : "▼"}
          </span>
        )}
      </Td>
      <Td color={chgColor}>
        {chg >= 0 ? "+" : ""}
        {fmt(chg)}
      </Td>
      <Td color={chgColor}>
        {pct >= 0 ? "+" : ""}
        {fmt(pct, 2)}%
      </Td>
      <Td color="#F0C060">{fmt(r.gSpreadBid, 1)}</Td>
      <Td bold color={mtm >= 0 ? UP : DOWN}>
        {fMad(mtm)}
      </Td>
    </tr>
  );
};

/* ─── Grille ───────────────────────────────────────────────────────── */
const LiveBlotter = () => {
  const { connectionStatus } = useTrading();
  const { rows, totals } = useLiveDesk();

  // Lignes cotées (obligations avec position). Ordre stable par ISIN → pas de saut.
  const quoted = useMemo(
    () =>
      (rows || [])
        .filter((r) => r.isin && (parseFloat(r.netNominal || 0) > 0 || r._live))
        .sort((a, b) => (a.isin > b.isin ? 1 : -1)),
    [rows],
  );

  const live = connectionStatus === "connected";
  const liveCount = totals?._liveCount || 0;
  const deltaMad = parseFloat(totals?._liveDeltaMad || 0);

  return (
    <div style={{ padding: "16px 18px", height: "100%", overflow: "auto" }}>
      {/* En-tête */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--f-disp)",
              fontWeight: 800,
              fontSize: "0.98rem",
              color: "var(--tx1)",
              letterSpacing: "0.02em",
            }}
          >
            Marché Live
          </h2>
          <p
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.68rem",
              color: "var(--tx3)",
              marginTop: 2,
            }}
          >
            Bid / Ask / Last temps réel — MtM ré-évaluée à chaque tick
          </p>
        </div>
        <div style={{ flex: 1 }} />
        {/* Delta P&L intraday live */}
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--f-disp)",
              fontSize: "0.5rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--tx3)",
            }}
          >
            Δ MtM intraday
          </div>
          <div
            style={{
              fontFamily: "var(--f-mono)",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: deltaMad >= 0 ? UP : DOWN,
            }}
          >
            {fMad(deltaMad)} MAD
          </div>
        </div>
        {/* Statut flux */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 6,
            background: live ? "rgba(22,199,132,0.10)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${live ? "rgba(22,199,132,0.28)" : "var(--b1)"}`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: live ? UP : "var(--tx3)",
              boxShadow: live ? `0 0 6px ${UP}` : "none",
              animation: live ? "pulse-live 2s ease infinite" : "none",
            }}
          />
          <span
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: "0.6rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: live ? UP : "var(--tx3)",
            }}
          >
            {live ? `LIVE · ${liveCount} lignes` : "DÉCONNECTÉ"}
          </span>
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          border: "1px solid var(--b1)",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--base)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <TH align="left">Instrument</TH>
              <TH>Bid</TH>
              <TH>Ask</TH>
              <TH>Last</TH>
              <TH>Δ</TH>
              <TH>Δ %</TH>
              <TH>G-Spd (bp)</TH>
              <TH>MtM (MAD)</TH>
            </tr>
          </thead>
          <tbody>
            {quoted.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: "28px 12px",
                    textAlign: "center",
                    fontFamily: "var(--f-body)",
                    fontSize: "0.74rem",
                    color: "var(--tx3)",
                  }}
                >
                  En attente du flux de marché…
                </td>
              </tr>
            ) : (
              quoted.map((r) => <BlotterRow key={r.isin} r={r} />)
            )}
          </tbody>
        </table>
      </div>

      <p
        style={{
          marginTop: 10,
          fontFamily: "var(--f-body)",
          fontSize: "0.62rem",
          color: "var(--tx3)",
          lineHeight: 1.5,
        }}
      >
        Flux simulé corrélé (facteur de taux commun). Les prix oscillent autour de la
        référence Bloomberg — la MtM respire sans dériver. Bascule production :
        <span style={{ fontFamily: "var(--f-mono)", color: "var(--tx2)" }}>
          {" "}marketdata.provider=bloomberg
        </span>
        .
      </p>
    </div>
  );
};

export default LiveBlotter;
