import React, { useState, useMemo, useCallback } from "react";
import { Button } from "antd";
import { useTrading } from "../../contexts/TradingContext";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target,
} from "lucide-react";

/* ─── Formatters ─────────────────────────────────────────── */
const fN = (v, d = 1) =>
  v == null || isNaN(parseFloat(v)) ? "—" : parseFloat(v).toFixed(d);
const fBp = (v, d = 1) =>
  v == null || isNaN(parseFloat(v))
    ? "—"
    : `${parseFloat(v) >= 0 ? "+" : ""}${parseFloat(v).toFixed(d)}`;
const fPx = (v) =>
  v == null || isNaN(parseFloat(v)) ? "—" : parseFloat(v).toFixed(3);
const fPct = (v, d = 2) =>
  v == null || isNaN(parseFloat(v)) ? "—" : `${parseFloat(v).toFixed(d)}%`;

/* ─── Signal chip ─────────────────────────────────────────── */
const SignalChip = ({ signal }) => {
  const cfg = {
    BUY: {
      bg: "rgba(0,232,153,0.12)",
      bd: "rgba(0,232,153,0.30)",
      col: "var(--profit)",
      lbl: "BUY",
      icon: TrendingUp,
    },
    SELL: {
      bg: "rgba(255,43,96,0.10)",
      bd: "rgba(255,43,96,0.28)",
      col: "var(--loss)",
      lbl: "SELL",
      icon: TrendingDown,
    },
    HOLD: {
      bg: "rgba(100,116,139,0.10)",
      bd: "rgba(100,116,139,0.25)",
      col: "var(--tx3)",
      lbl: "HOLD",
      icon: Minus,
    },
    CHEAP: {
      bg: "rgba(0,202,255,0.10)",
      bd: "rgba(0,202,255,0.28)",
      col: "var(--cyan)",
      lbl: "CHEAP",
      icon: TrendingUp,
    },
    RICH: {
      bg: "rgba(251,146,60,0.10)",
      bd: "rgba(251,146,60,0.28)",
      col: "var(--warn)",
      lbl: "RICH",
      icon: TrendingDown,
    },
  }[signal] || {
    bg: "rgba(100,116,139,0.08)",
    bd: "rgba(100,116,139,0.18)",
    col: "var(--tx3)",
    lbl: "—",
    icon: Minus,
  };
  const Icon = cfg.icon;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 4,
        background: cfg.bg,
        border: `1px solid ${cfg.bd}`,
      }}
    >
      <Icon size={9} style={{ color: cfg.col }} />
      <span
        style={{
          fontFamily: "var(--f-disp)",
          fontSize: "0.55rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
          color: cfg.col,
        }}
      >
        {cfg.lbl}
      </span>
    </div>
  );
};

/* ─── Spread bar ──────────────────────────────────────────── */
const SpreadBar = ({ bid, ask, mid, target, color }) => {
  if (!bid && !ask)
    return <span style={{ color: "var(--tx3)", fontSize: "0.62rem" }}>—</span>;
  const bv = parseFloat(bid || 0),
    av = parseFloat(ask || 0),
    mv = parseFloat(mid || (bv + av) / 2);
  const tv = parseFloat(target || mv);
  const range = Math.max(av - bv, 1);
  const midPct = (((mv - bv) / range) * 100).toFixed(0);
  const tgtPct = Math.max(0, Math.min(100, ((tv - bv) / range) * 100)).toFixed(
    0,
  );
  return (
    <div style={{ minWidth: 120 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 3,
        }}
      >
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: "0.58rem",
            color: "var(--loss)",
          }}
        >
          {fBp(bid)}
        </span>
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: "0.62rem",
            fontWeight: 700,
            color,
          }}
        >
          {fBp(mid || mv)}
        </span>
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: "0.58rem",
            color: "var(--profit)",
          }}
        >
          {fBp(ask)}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 4,
          borderRadius: 2,
          background: "var(--elev)",
          overflow: "visible",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: "100%",
            borderRadius: 2,
            background: `linear-gradient(90deg, rgba(255,43,96,0.3) 0%, ${color}60 50%, rgba(0,232,153,0.3) 100%)`,
          }}
        />
        {/* Mid tick */}
        <div
          style={{
            position: "absolute",
            top: -2,
            left: `${midPct}%`,
            transform: "translateX(-50%)",
            width: 2,
            height: 8,
            borderRadius: 1,
            background: color,
          }}
        />
        {/* Target tick */}
        {target != null && (
          <div
            style={{
              position: "absolute",
              top: -3,
              left: `${tgtPct}%`,
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: `5px solid var(--warn)`,
            }}
          />
        )}
      </div>
      {target != null && (
        <div style={{ textAlign: "center", marginTop: 2 }}>
          <span
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: "0.54rem",
              color: "var(--warn)",
            }}
          >
            ▲ cible {fBp(target)} bp
          </span>
        </div>
      )}
    </div>
  );
};

/* ─── Main ─────────────────────────────────────────────────── */
const PricingView = () => {
  const { dashboardRows, rates, loading, refresh } = useTrading();
  const [tab, setTab] = useState("gspread");
  const [filter, setFilter] = useState("");
  const [editTargets, setEditTargets] = useState({});

  /* Enrich rows with derived spread data */
  const pricingRows = useMemo(() => {
    const usdMad = parseFloat(rates?.usdMad || 9.251);
    const eurMad = parseFloat(rates?.eurMad || 10.418);

    return (dashboardRows || [])
      .filter(
        (r) =>
          (r.subAsset || "").toLowerCase().includes("bond") ||
          (r.subAsset || "").includes("Bond"),
      )
      .filter(
        (r) =>
          !filter ||
          r.isin?.includes(filter.toUpperCase()) ||
          (r.description || "").toLowerCase().includes(filter.toLowerCase()),
      )
      .map((r) => {
        const n = (v) => parseFloat(v ?? 0);
        const gMid = n(r.gSpreadMid);
        const gBid = n(r.gSpreadBid) || gMid - 5;
        const gAsk = n(r.gSpreadAsk) || gMid + 5;
        const iMid = n(r.iSpreadMid) || gMid - 15;
        const iBid = n(r.iSpreadBid) || iMid - 5;
        const iAsk = n(r.iSpreadAsk) || iMid + 5;
        const tgt = editTargets[r.isin] ?? n(r.targetSpread) ?? gMid - 10;
        const cheapness = gMid - tgt; // positive = cheap vs target
        const signal =
          cheapness > 15
            ? "CHEAP"
            : cheapness < -15
              ? "RICH"
              : cheapness > 5
                ? "BUY"
                : cheapness < -5
                  ? "SELL"
                  : "HOLD";

        return {
          ...r,
          gBid,
          gAsk,
          gMid,
          iBid,
          iAsk,
          iMid,
          targetSpreadCalc: tgt,
          cheapness,
          signal,
          yieldBid: n(r.yieldMarket) - 0.05,
          yieldAsk: n(r.yieldMarket) + 0.03,
          yieldMid: n(r.yieldMarket),
          priceBid: n(r.cleanPrice) - 0.25,
          priceAsk: n(r.cleanPrice) + 0.25,
          priceMid: n(r.cleanPrice),
          rollTime: r.maturityDate
            ? (
                (new Date(r.maturityDate) - new Date()) /
                (1000 * 60 * 60 * 24 * 365)
              ).toFixed(2)
            : null,
        };
      })
      .sort((a, b) => b.gMid - a.gMid);
  }, [dashboardRows, rates, filter, editTargets]);

  const updateTarget = useCallback((isin, val) => {
    setEditTargets((p) => ({ ...p, [isin]: parseFloat(val) }));
  }, []);

  const TABS = [
    { id: "gspread", label: "G-Spread Matrix" },
    { id: "ispread", label: "I-Spread & Yield" },
    { id: "pricing", label: "Pricing AWB" },
    { id: "relative", label: "Relative Value" },
  ];

  const TH = {
    padding: "7px 10px",
    fontFamily: "var(--f-disp)",
    fontWeight: 700,
    fontSize: "0.54rem",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    color: "var(--tx3)",
    borderBottom: "1px solid var(--b1)",
    whiteSpace: "nowrap",
    textAlign: "right",
    background: "var(--surf)",
  };
  const THL = { ...TH, textAlign: "left" };
  const TD = (col) => ({
    padding: "8px 10px",
    fontFamily: "var(--f-mono)",
    fontSize: "0.68rem",
    borderBottom: "1px solid var(--b0)",
    whiteSpace: "nowrap",
    color: col || "var(--tx1)",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  });
  const TDL = (col) => ({ ...TD(col), textAlign: "left" });

  /* ── Relative Value: cheapness heatmap (color scale) ── */
  const relColor = (v) => {
    const n = parseFloat(v || 0);
    if (n > 20) return { bg: "rgba(0,232,153,0.18)", col: "var(--profit)" };
    if (n > 8) return { bg: "rgba(0,232,153,0.08)", col: "var(--profit)" };
    if (n > 0) return { bg: "rgba(0,232,153,0.04)", col: "var(--profit)" };
    if (n > -8) return { bg: "rgba(255,43,96,0.04)", col: "var(--loss)" };
    return { bg: "rgba(255,43,96,0.14)", col: "var(--loss)" };
  };

  return (
    <div style={{ padding: "16px 20px", height: "100%", overflowY: "auto" }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--f-disp)",
              fontWeight: 800,
              fontSize: "1.0rem",
              color: "var(--tx1)",
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            Pricing Screen
          </h1>
          <div
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.70rem",
              color: "var(--tx3)",
              marginTop: 3,
            }}
          >
            G-Spread · I-Spread · Relative Value · Décisions AWB
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer ISIN / Titre…"
            style={{
              background: "var(--surf)",
              border: "1px solid var(--b1)",
              borderRadius: 5,
              padding: "6px 10px",
              fontFamily: "var(--f-body)",
              fontSize: "0.72rem",
              color: "var(--tx1)",
              outline: "none",
              width: 200,
            }}
          />
          <Button
            size="small"
            loading={loading}
            onClick={refresh}
            icon={<RefreshCw size={12} />}
          />
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {[
          {
            label: "G-Spread Moy.",
            value:
              fBp(
                pricingRows.reduce((s, r) => s + r.gMid, 0) /
                  Math.max(pricingRows.length, 1),
              ) + " bp",
            color: "var(--eb)",
          },
          {
            label: "I-Spread Moy.",
            value:
              fBp(
                pricingRows.reduce((s, r) => s + r.iMid, 0) /
                  Math.max(pricingRows.length, 1),
              ) + " bp",
            color: "var(--cyan)",
          },
          {
            label: "Lignes CHEAP",
            value: pricingRows.filter(
              (r) => r.signal === "CHEAP" || r.signal === "BUY",
            ).length,
            color: "var(--profit)",
          },
          {
            label: "Lignes RICH",
            value: pricingRows.filter(
              (r) => r.signal === "RICH" || r.signal === "SELL",
            ).length,
            color: "var(--loss)",
          },
        ].map((k) => (
          <div key={k.label} className="card" style={{ padding: "10px 13px" }}>
            <div
              style={{
                fontFamily: "var(--f-disp)",
                fontSize: "0.51rem",
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--tx3)",
                marginBottom: 5,
              }}
            >
              {k.label}
            </div>
            <div
              style={{
                fontFamily: "var(--f-mono)",
                fontWeight: 700,
                fontSize: "1.0rem",
                color: k.color,
                lineHeight: 1,
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 14,
          borderBottom: "1px solid var(--b1)",
          paddingBottom: 0,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "7px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--f-disp)",
              fontWeight: 700,
              fontSize: "0.62rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: tab === t.id ? "var(--tx1)" : "var(--tx3)",
              borderBottom:
                tab === t.id ? "2px solid var(--eb)" : "2px solid transparent",
              marginBottom: -1,
              transition: "all 0.12s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pricingRows.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: 200,
            gap: 10,
          }}
        >
          <AlertTriangle
            size={24}
            style={{ color: "var(--tx3)", opacity: 0.4 }}
          />
          <span
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.75rem",
              color: "var(--tx3)",
            }}
          >
            Aucune position obligataire disponible
          </span>
        </div>
      )}

      {/* ══════ G-SPREAD MATRIX ══════ */}
      {tab === "gspread" && pricingRows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={THL}>Titre</th>
                <th style={TH}>ISIN</th>
                <th style={TH}>Sub</th>
                <th style={TH}>Maturité</th>
                <th style={TH}>Roll (Y)</th>
                <th style={{ ...TH, minWidth: 140 }}>G-Spread Mkt (bp)</th>
                <th style={{ ...TH, minWidth: 120 }}>AWB Mid (bp)</th>
                <th style={TH}>Cible (bp)</th>
                <th style={TH}>Écart vs Cible</th>
                <th style={TH}>Signal</th>
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((r, i) => {
                const rc = relColor(r.cheapness);
                return (
                  <tr
                    key={r.isin}
                    style={{
                      background:
                        i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    }}
                  >
                    <td style={TDL("var(--tx2)")}>{r.description || "—"}</td>
                    <td style={TDL("var(--cyan)")}>{r.isin}</td>
                    <td style={TDL("var(--tx3)")}>{r.subAsset}</td>
                    <td style={TD("var(--tx2)")}>
                      {r.maturityDate?.substring(0, 7) || "—"}
                    </td>
                    <td style={TD("var(--tx3)")}>
                      {r.rollTime ? `${r.rollTime}Y` : "—"}
                    </td>
                    <td style={{ ...TD(), paddingTop: 6, paddingBottom: 6 }}>
                      <SpreadBar
                        bid={r.gBid}
                        ask={r.gAsk}
                        mid={r.gMid}
                        target={r.targetSpreadCalc}
                        color="var(--eb)"
                      />
                    </td>
                    <td style={TD(r.gMid > 0 ? "var(--tx1)" : "var(--tx3)")}>
                      {fBp(r.gMid)} bp
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <input
                        type="number"
                        value={
                          editTargets[r.isin] ?? Math.round(r.targetSpreadCalc)
                        }
                        onChange={(e) => updateTarget(r.isin, e.target.value)}
                        style={{
                          width: 60,
                          textAlign: "right",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid var(--b1)",
                          borderRadius: 3,
                          padding: "3px 6px",
                          color: "var(--warn)",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.65rem",
                          outline: "none",
                        }}
                      />
                    </td>
                    <td
                      style={{
                        ...TD(),
                        background: rc.bg,
                        color: rc.col,
                        fontWeight: 700,
                      }}
                    >
                      {r.cheapness >= 0 ? "+" : ""}
                      {fBp(r.cheapness)} bp
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <SignalChip signal={r.signal} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════ I-SPREAD & YIELD ══════ */}
      {tab === "ispread" && pricingRows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={THL}>Titre</th>
                <th style={TH}>ISIN</th>
                <th style={TH}>Coupon %</th>
                <th style={TH}>Roll (Y)</th>
                <th style={{ ...TH, minWidth: 140 }}>I-Spread (bp)</th>
                <th style={TH}>G-Spread Mid</th>
                <th style={TH}>I-Spread Mid</th>
                <th style={TH}>Yield Mid</th>
                <th style={TH}>Yield WAP</th>
                <th style={TH}>Spread I/G</th>
                <th style={TH}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((r, i) => {
                const spreadDiff = r.gMid - r.iMid;
                return (
                  <tr
                    key={r.isin}
                    style={{
                      background:
                        i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    }}
                  >
                    <td style={TDL("var(--tx2)")}>{r.description || "—"}</td>
                    <td style={TDL("var(--cyan)")}>{r.isin}</td>
                    <td style={TD("var(--profit)")}>{fPct(r.couponRate)}</td>
                    <td style={TD("var(--tx3)")}>
                      {r.rollTime ? `${r.rollTime}Y` : "—"}
                    </td>
                    <td style={{ ...TD(), paddingTop: 6, paddingBottom: 6 }}>
                      <SpreadBar
                        bid={r.iBid}
                        ask={r.iAsk}
                        mid={r.iMid}
                        color="var(--cyan)"
                      />
                    </td>
                    <td style={TD()}>{fBp(r.gMid)} bp</td>
                    <td style={TD("var(--cyan)")}>{fBp(r.iMid)} bp</td>
                    <td style={TD()}>{fPct(r.yieldMid, 3)}</td>
                    <td style={TD("var(--tx3)")}>{fPct(r.yieldWap, 3)}</td>
                    <td
                      style={TD(
                        spreadDiff > 0 ? "var(--profit)" : "var(--loss)",
                      )}
                    >
                      {fBp(spreadDiff)} bp
                    </td>
                    <td style={TD()}>{fN(r.modifiedDuration, 2)} Y</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════ PRICING AWB ══════ */}
      {tab === "pricing" && pricingRows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={THL}>Titre</th>
                <th style={TH}>ISIN</th>
                <th style={TH}>Prix BID</th>
                <th style={TH}>Prix Mid</th>
                <th style={TH}>Prix ASK</th>
                <th style={TH}>Accrued</th>
                <th style={TH}>WAP Clean</th>
                <th style={TH}>Perf WAP</th>
                <th style={TH}>G-Spd BID</th>
                <th style={TH}>G-Spd MID</th>
                <th style={TH}>G-Spd ASK</th>
                <th style={TH}>Signal</th>
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((r, i) => (
                <tr
                  key={r.isin}
                  style={{
                    background:
                      i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}
                >
                  <td style={TDL("var(--tx2)")}>{r.description || "—"}</td>
                  <td style={TDL("var(--cyan)")}>{r.isin}</td>
                  <td style={TD("var(--loss)")}>{fPx(r.priceBid)}</td>
                  <td style={{ ...TD("var(--tx1)"), fontWeight: 700 }}>
                    {fPx(r.priceMid)}
                  </td>
                  <td style={TD("var(--profit)")}>{fPx(r.priceAsk)}</td>
                  <td style={TD("var(--tx3)")}>{fPx(r.accrued)}</td>
                  <td style={TD()}>{fPx(r.lastWapClean)}</td>
                  <td
                    style={TD(
                      parseFloat(r.perfWap || 0) >= 0
                        ? "var(--profit)"
                        : "var(--loss)",
                    )}
                  >
                    {fBp(r.perfWap)} bp
                  </td>
                  <td style={TD("var(--loss)")}>{fBp(r.gBid)} bp</td>
                  <td style={{ ...TD(), fontWeight: 700 }}>{fBp(r.gMid)} bp</td>
                  <td style={TD("var(--profit)")}>{fBp(r.gAsk)} bp</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>
                    <SignalChip signal={r.signal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════ RELATIVE VALUE ══════ */}
      {tab === "relative" && pricingRows.length > 0 && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.68rem",
                color: "var(--tx3)",
                lineHeight: 1.5,
              }}
            >
              Écart G-Spread vs cible trader.{" "}
              <span style={{ color: "var(--profit)" }}>Vert = cheap</span>{" "}
              (G-Spread &gt; cible — opportunité achat).{" "}
              <span style={{ color: "var(--loss)" }}>Rouge = rich</span>{" "}
              (G-Spread &lt; cible — opportunité vente).
            </div>
          </div>

          {/* Cheapness ranking */}
          <div style={{ overflowX: "auto", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...THL, width: 32 }}>#</th>
                  <th style={THL}>Titre</th>
                  <th style={TH}>G-Spread</th>
                  <th style={TH}>Cible</th>
                  <th style={TH}>Cheapness</th>
                  <th style={{ ...TH, minWidth: 200 }}>Score Visuel</th>
                  <th style={TH}>Duration</th>
                  <th style={TH}>Nominal</th>
                  <th style={TH}>Signal</th>
                </tr>
              </thead>
              <tbody>
                {[...pricingRows]
                  .sort((a, b) => b.cheapness - a.cheapness)
                  .map((r, i) => {
                    const rc = relColor(r.cheapness);
                    const barW = Math.min(
                      (Math.abs(r.cheapness) / 40) * 100,
                      100,
                    );
                    return (
                      <tr key={r.isin}>
                        <td style={{ ...TDL("var(--tx3)"), fontWeight: 700 }}>
                          {i + 1}
                        </td>
                        <td style={TDL("var(--tx2)")}>
                          {r.description || r.isin}
                        </td>
                        <td style={TD()}>{fBp(r.gMid)} bp</td>
                        <td style={TD("var(--warn)")}>
                          {fBp(r.targetSpreadCalc)} bp
                        </td>
                        <td
                          style={{
                            ...TD(rc.col),
                            fontWeight: 700,
                            background: rc.bg,
                          }}
                        >
                          {r.cheapness >= 0 ? "+" : ""}
                          {fBp(r.cheapness)} bp
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {r.cheapness >= 0 ? (
                              <div
                                style={{
                                  width: `${barW}%`,
                                  maxWidth: 180,
                                  height: 6,
                                  borderRadius: 3,
                                  background: "var(--profit)",
                                  opacity: 0.7,
                                  marginLeft: "auto",
                                  direction: "rtl",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: `${barW}%`,
                                  maxWidth: 180,
                                  height: 6,
                                  borderRadius: 3,
                                  background: "var(--loss)",
                                  opacity: 0.7,
                                }}
                              />
                            )}
                          </div>
                        </td>
                        <td style={TD()}>{fN(r.modifiedDuration, 2)} Y</td>
                        <td style={TD()}>{fN(r.netNominal, 1)} M</td>
                        <td style={{ padding: "6px 10px", textAlign: "right" }}>
                          <SignalChip signal={r.signal} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingView;
