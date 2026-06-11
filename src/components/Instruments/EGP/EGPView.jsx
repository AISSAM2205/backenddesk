import React, { useMemo, useState, useEffect } from "react";
import { Button, Input } from "antd";
import { useTrading } from "../../../contexts/TradingContext";
import { useAuth } from "../../../contexts/AuthContext";
import {
  Coins,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Calendar,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

/* Courbe NDF EGP/USD retirée — jugée non pertinente pour le desk EGP. */

/* ─── Formatters ─────────────────────────────────────────────────── */
const fN = (v, d = 2) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};
const fMAD = (v) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  const a = Math.abs(n),
    s = n >= 0 ? "+" : "−";
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)}M`;
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
};
const fUSD = (v) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  const a = Math.abs(n),
    s = n >= 0 ? "+" : "";
  if (a >= 1e6) return `${s}${(n / 1e6).toFixed(2)}M`;
  return `${s}${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`;
};
const fMat = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      month: "short",
      year: "2-digit",
    });
  } catch {
    return d;
  }
};
const pnlColor = (v) =>
  parseFloat(v || 0) >= 0 ? "var(--profit)" : "var(--loss)";

/* ─── Maturity Ladder ────────────────────────────────────────────── */
const BUCKETS = [
  { label: "0–3M", maxDays: 90 },
  { label: "3–6M", maxDays: 180 },
  { label: "6–9M", maxDays: 270 },
  { label: "9–12M", maxDays: 365 },
  { label: "> 12M", maxDays: Infinity },
];

const MaturityLadder = ({ positions }) => {
  const today = new Date();
  const buckets = BUCKETS.map((b) => ({
    ...b,
    items: [],
    nominalUsd: 0,
    plEcoMad: 0,
  }));
  (positions || []).forEach((r) => {
    if (!r.maturityDate) return;
    const days = Math.round((new Date(r.maturityDate) - today) / 86400000);
    const b = buckets.find((bk) => days <= bk.maxDays);
    if (b) {
      b.items.push(r);
      b.nominalUsd += parseFloat(r.nominalUsd || 0);
      b.plEcoMad += parseFloat(r.plEcoMad || 0);
    }
  });
  const maxNom = Math.max(...buckets.map((b) => b.nominalUsd), 1);
  if (!positions?.length) return null;
  return (
    <div className="card slide-up stagger-2" style={{ padding: "14px 16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <Calendar size={12} style={{ color: "#FCD34D" }} />
        <span
          style={{
            fontFamily: "var(--f-disp)",
            fontWeight: 700,
            fontSize: "0.64rem",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--tx1)",
          }}
        >
          Échéancier — Profil de Maturité
        </span>
      </div>
      <div
        style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}
      >
        {buckets.map((b) => {
          const pct = maxNom > 0 ? (b.nominalUsd / maxNom) * 100 : 0;
          const hasItems = b.items.length > 0;
          const pnlPos = b.plEcoMad >= 0;
          return (
            <div
              key={b.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              {hasItems && (
                <div
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: "0.58rem",
                    color: pnlPos ? "var(--profit)" : "var(--loss)",
                    fontWeight: 600,
                  }}
                >
                  {b.nominalUsd >= 1e6
                    ? `${(b.nominalUsd / 1e6).toFixed(0)}M`
                    : `${(b.nominalUsd / 1e3).toFixed(0)}k`}
                </div>
              )}
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(pct, hasItems ? 6 : 2)}%`,
                  minHeight: hasItems ? 8 : 3,
                  background: hasItems
                    ? `linear-gradient(to top, rgba(232,154,32,0.80), rgba(232,154,32,0.30))`
                    : "var(--b1)",
                  borderRadius: "4px 4px 0 0",
                  border: hasItems ? "1px solid rgba(232,154,32,0.40)" : "none",
                  borderBottom: "none",
                  transition: "height 0.7s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              />
              <div
                style={{ width: "100%", height: 1, background: "var(--b1)" }}
              />
              <div
                style={{
                  fontFamily: "var(--f-disp)",
                  fontWeight: 700,
                  fontSize: "0.52rem",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: hasItems ? "#FCD34D" : "var(--tx3)",
                  textAlign: "center",
                }}
              >
                {b.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: "0.53rem",
                  color: "var(--tx3)",
                  textAlign: "center",
                }}
              >
                {hasItems ? `${b.items.length} pos.` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SortIcon = ({ active, dir }) => {
  if (!active)
    return (
      <ChevronsUpDown size={10} style={{ opacity: 0.25, marginLeft: 3 }} />
    );
  return dir === "asc" ? (
    <ChevronUp size={10} style={{ color: "var(--cyan)", marginLeft: 3 }} />
  ) : (
    <ChevronDown size={10} style={{ color: "var(--cyan)", marginLeft: 3 }} />
  );
};

const EGP_SL_KEY = (uid) => `egp_stoploss_${uid || "default"}`;

const EGPView = () => {
  const { egpList, rates, loading, refresh, selectedDate } = useTrading();
  const { user } = useAuth();
  const [sortKey, setSortKey] = useState("maturityDate");
  const [sortDir, setSortDir] = useState("asc");
  const [stopLoss, setStopLoss] = useState(0);
  const [slInput, setSlInput] = useState("");
  const [showSlInput, setShowSlInput] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(EGP_SL_KEY(user?.id));
    const val = raw ? parseFloat(raw) : 0;
    if (!isNaN(val) && val > 0) {
      setStopLoss(val);
      setSlInput(String(val / 1e6));
    }
  }, [user?.id]);

  const saveStopLoss = () => {
    const val = parseFloat(slInput) * 1e6;
    if (!isNaN(val) && val >= 0) {
      setStopLoss(val);
      localStorage.setItem(EGP_SL_KEY(user?.id), String(val));
      setShowSlInput(false);
    }
  };

  const handleSort = (k) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return egpList;
    return [...egpList].sort((a, b) => {
      const na = parseFloat(a[sortKey]),
        nb = parseFloat(b[sortKey]);
      if (!isNaN(na) && !isNaN(nb))
        return sortDir === "asc" ? na - nb : nb - na;
      const sa = String(a[sortKey] ?? ""),
        sb = String(b[sortKey] ?? "");
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [egpList, sortKey, sortDir]);

  const totals = useMemo(
    () =>
      sorted.reduce(
        (acc, r) => ({
          nominalUsd: acc.nominalUsd + parseFloat(r.nominalUsd || 0),
          plEcoMad: acc.plEcoMad + parseFloat(r.plEcoMad || 0),
          plRealizedUsd: acc.plRealizedUsd + parseFloat(r.plRealizedUsd || 0),
          plLatentUsd: acc.plLatentUsd + parseFloat(r.plLatentUsd || 0),
          fundingUsd: acc.fundingUsd + parseFloat(r.fundingUsd || 0),
        }),
        {
          nominalUsd: 0,
          plEcoMad: 0,
          plRealizedUsd: 0,
          plLatentUsd: 0,
          fundingUsd: 0,
        },
      ),
    [sorted],
  );

  const Th = ({ k, label, right }) => (
    <th
      onClick={() => handleSort(k)}
      style={{
        textAlign: right ? "right" : "left",
        cursor: "pointer",
        color: sortKey === k ? "var(--cyan)" : "var(--tx3)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: right ? "flex-end" : "flex-start",
        }}
      >
        {label}
        <SortIcon active={sortKey === k} dir={sortDir} />
      </span>
    </th>
  );

  const snapshotDate = egpList.length > 0 ? egpList[0].snapshotDate : null;

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--void)" }}>
      <div className="view-hdr">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 13,
                background: "var(--egp)",
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
            <h2 className="view-title">EGP Bills — Bons du Trésor Égypte</h2>
            <span
              className="tag"
              style={{
                marginLeft: 2,
                color: "#FCD34D",
                borderColor: "rgba(232,154,32,0.3)",
                background: "rgba(232,154,32,0.06)",
              }}
            >
              Trésorerie Ext.
            </span>
          </div>
          <p className="view-sub" style={{ paddingLeft: 9 }}>
            {egpList.length} position{egpList.length !== 1 ? "s" : ""}
            {snapshotDate && (
              <span style={{ marginLeft: 8, color: "var(--tx3)" }}>
                snapshot {snapshotDate}
              </span>
            )}
          </p>
        </div>
        <Button
          size="small"
          loading={loading}
          onClick={refresh}
          icon={<RefreshCw size={10} />}
        />
      </div>

      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* KPI Row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            [
              "P&L Économique (MAD)",
              fMAD(totals.plEcoMad),
              pnlColor(totals.plEcoMad),
            ],
            [
              "P&L Réalisé (USD)",
              fUSD(totals.plRealizedUsd),
              pnlColor(totals.plRealizedUsd),
            ],
            [
              "P&L Latent (USD)",
              fUSD(totals.plLatentUsd),
              pnlColor(totals.plLatentUsd),
            ],
            [
              "Nominal Total (USD)",
              `${fN(totals.nominalUsd / 1e6, 0)} M`,
              "var(--tx1)",
            ],
            ["Financement (USD)", fUSD(totals.fundingUsd), "var(--warn)"],
            ["Nb Positions", egpList.length.toString(), "#FCD34D"],
          ].map(([label, value, valColor]) => (
            <div
              key={label}
              className="card"
              style={{ flex: "1 1 130px", padding: "8px 10px" }}
            >
              <div
                className="lbl"
                style={{
                  marginBottom: 5,
                  fontSize: "0.53rem",
                  letterSpacing: "0.12em",
                }}
              >
                {label}
              </div>
              <div
                className="n"
                style={{
                  fontSize: "1.10rem",
                  fontWeight: 600,
                  lineHeight: 1,
                  color: valColor,
                  letterSpacing: "-0.02em",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Stop-Loss Banner ── */}
        {stopLoss > 0 && totals.plEcoMad < -stopLoss && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 8,
              background: "rgba(255,43,96,0.10)",
              border: "1px solid rgba(255,43,96,0.35)",
              animation: "pulse-live 2s ease infinite",
            }}
          >
            <AlertTriangle
              size={14}
              style={{ color: "var(--loss)", flexShrink: 0, marginTop: 1 }}
            />
            <div>
              <p
                style={{
                  fontFamily: "var(--f-disp)",
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--loss)",
                  marginBottom: 4,
                }}
              >
                ⚠ STOP-LOSS EGP DÉCLENCHÉ
              </p>
              <p
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "0.72rem",
                  color: "#FC8FA0",
                }}
              >
                P&L Éco {fMAD(totals.plEcoMad)} MAD — Limite : −
                {(stopLoss / 1e6).toFixed(1)}M MAD
              </p>
            </div>
          </div>
        )}

        {/* ── Stop-Loss Config ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--f-disp)",
              fontSize: "0.60rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--tx3)",
            }}
          >
            Stop-Loss EGP :
          </span>
          {showSlInput ? (
            <>
              <Input
                type="number"
                value={slInput}
                onChange={(e) => setSlInput(e.target.value)}
                placeholder="ex: 5 (M MAD)"
                size="small"
                style={{ width: 120 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveStopLoss();
                  if (e.key === "Escape") setShowSlInput(false);
                }}
                autoFocus
              />
              <span
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "0.60rem",
                  color: "var(--tx3)",
                }}
              >
                M MAD
              </span>
              <Button
                type="primary"
                size="small"
                onClick={saveStopLoss}
              >
                OK
              </Button>
              <Button
                size="small"
                onClick={() => setShowSlInput(false)}
              >
                ×
              </Button>
            </>
          ) : (
            <>
              <span
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: stopLoss > 0 ? "var(--loss)" : "var(--tx3)",
                }}
              >
                {stopLoss > 0
                  ? `−${(stopLoss / 1e6).toFixed(1)}M MAD`
                  : "— Non configuré"}
              </span>
              <Button
                size="small"
                onClick={() => {
                  setSlInput(stopLoss > 0 ? String(stopLoss / 1e6) : "");
                  setShowSlInput(true);
                }}
              >
                Configurer
              </Button>
            </>
          )}
        </div>

        {/* ── FX Breakeven Panel ── */}
        {egpList.length > 0 &&
          (() => {
            const spot = parseFloat(rates?.usdEgp || 50.85);
            const sofr = parseFloat(rates?.sofr || 5.3) / 100;
            const today = new Date();

            const deals = sorted.map((r) => {
              const yieldRate =
                parseFloat(r.couponRate || 0) < 1
                  ? parseFloat(r.couponRate || 0)
                  : parseFloat(r.couponRate || 0) / 100;
              const daysRem = r.maturityDate
                ? Math.max(
                    0,
                    Math.round((new Date(r.maturityDate) - today) / 86400000),
                  )
                : 90;
              // wapFxEntry = USD/EGP au jour d'entrée en position (depuis ExternalPnlSnapshot)
              // Fallback conservateur : spot actuel (pas de gain/perte FX latente → breakeven = spot)
              const fxEntry =
                parseFloat(r.wapFxEntry || r.fxEntry || 0) || spot;
              const bkvSansFin = fxEntry * (1 + (yieldRate * daysRem) / 360);
              const netCarry = yieldRate - sofr;
              const bkvAvecFin = fxEntry * (1 + (netCarry * daysRem) / 360);
              const cushionSans = ((bkvSansFin - spot) / spot) * 100;
              const cushionAvec = ((bkvAvecFin - spot) / spot) * 100;
              const plFxApprox =
                ((spot - fxEntry) *
                  parseFloat(r.nominalUsd || 0) *
                  parseFloat(rates?.usdMad || 9.251)) /
                spot;
              return {
                ...r,
                fxEntry,
                bkvSansFin,
                bkvAvecFin,
                cushionSans,
                cushionAvec,
                daysRem,
                yieldRate,
                plFxApprox,
              };
            });

            return (
              <div className="card" style={{ overflow: "hidden" }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--b1)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={12} style={{ color: "#FCD34D" }} />
                  <span
                    style={{
                      fontFamily: "var(--f-disp)",
                      fontWeight: 700,
                      fontSize: "0.65rem",
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--tx1)",
                    }}
                  >
                    FX Breakeven — Seuils de Rentabilité par Deal
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.58rem",
                      color: "var(--tx3)",
                      padding: "2px 7px",
                      background: "var(--elev)",
                      borderRadius: 4,
                      border: "1px solid var(--b1)",
                    }}
                  >
                    Spot USD/EGP : {spot.toFixed(2)} · SOFR :{" "}
                    {(sofr * 100).toFixed(2)}%
                  </span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--thead-bg)" }}>
                        {[
                          ["ISIN", false],
                          ["Échéance / Jours", false],
                          ["Nominal M USD", true],
                          ["Rendement %", true],
                          ["FX Entrée (WAP)", true],
                          ["BKV s/fin", true],
                          ["BKV a/fin", true],
                          ["Coussin s/fin", true],
                          ["Coussin a/fin", true],
                          ["P&L FX approx.", true],
                        ].map(([h, right]) => (
                          <th
                            key={h}
                            style={{
                              padding: "8px 12px",
                              fontFamily: "var(--f-disp)",
                              fontWeight: 700,
                              fontSize: "0.54rem",
                              letterSpacing: "0.09em",
                              textTransform: "uppercase",
                              color: "var(--tx3)",
                              borderBottom: "1px solid var(--b1)",
                              textAlign: right ? "right" : "left",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map((d, i) => {
                        const rowBg =
                          i % 2 === 0 ? "var(--tr-even-bg)" : "transparent";
                        const safe = d.cushionSans > 5;
                        const warn = d.cushionSans > 0 && d.cushionSans <= 5;
                        const broken = d.cushionSans <= 0;
                        const cushCol = broken
                          ? "var(--loss)"
                          : warn
                            ? "var(--warn)"
                            : "var(--profit)";
                        const tdS = {
                          padding: "8px 12px",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          borderBottom: "1px solid var(--b0)",
                          whiteSpace: "nowrap",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        };
                        return (
                          <tr
                            key={d.isin + i}
                            style={{ background: rowBg }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "var(--tr-hover-bg)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = rowBg)
                            }
                          >
                            <td
                              style={{
                                ...tdS,
                                textAlign: "left",
                                color: "#FCD34D",
                                fontWeight: 500,
                              }}
                            >
                              {d.isin}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                textAlign: "left",
                                color: "var(--tx2)",
                              }}
                            >
                              {fMat(d.maturityDate)}
                              <span
                                style={{
                                  color: "var(--tx3)",
                                  fontSize: "0.58rem",
                                  marginLeft: 5,
                                }}
                              >
                                {d.daysRem}j
                              </span>
                            </td>
                            <td style={{ ...tdS }}>
                              {fN(parseFloat(d.nominalUsd || 0) / 1e6, 1)}
                            </td>
                            <td style={{ ...tdS, color: "#FCD34D" }}>
                              {(d.yieldRate * 100).toFixed(2)}%
                            </td>
                            <td style={{ ...tdS, color: "var(--tx2)" }}>
                              {d.fxEntry.toFixed(2)}
                            </td>
                            <td style={{ ...tdS, color: "var(--cyan)" }}>
                              {d.bkvSansFin.toFixed(2)}
                            </td>
                            <td style={{ ...tdS, color: "var(--eb)" }}>
                              {d.bkvAvecFin.toFixed(2)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                color: cushCol,
                                fontWeight: 700,
                              }}
                            >
                              {d.cushionSans >= 0 ? "+" : ""}
                              {d.cushionSans.toFixed(1)}%
                              {broken && (
                                <span
                                  style={{ marginLeft: 4, fontSize: "0.56rem" }}
                                >
                                  ⚠
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                color:
                                  d.cushionAvec >= 0
                                    ? "var(--profit)"
                                    : "var(--loss)",
                              }}
                            >
                              {d.cushionAvec >= 0 ? "+" : ""}
                              {d.cushionAvec.toFixed(1)}%
                            </td>
                            <td
                              style={{
                                ...tdS,
                                color:
                                  d.plFxApprox >= 0
                                    ? "var(--profit)"
                                    : "var(--loss)",
                                fontWeight: 600,
                              }}
                            >
                              {fMAD(d.plFxApprox)} MAD
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div
                  style={{
                    padding: "8px 14px",
                    borderTop: "1px solid var(--b0)",
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--f-body)",
                      fontSize: "0.57rem",
                      color: "var(--tx3)",
                    }}
                  >
                    BKV s/fin = FX_entrée × (1 + yield × jours/360) · BKV a/fin
                    = FX_entrée × (1 + (yield − SOFR) × jours/360)
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--f-disp)",
                      fontSize: "0.54rem",
                      fontWeight: 700,
                      color: "rgba(232,154,32,0.70)",
                      letterSpacing: "0.07em",
                      marginLeft: "auto",
                    }}
                  >
                    FX entrée = WAP USD/EGP au jour d'achat
                  </span>
                </div>
              </div>
            );
          })()}

        {/* Maturity Ladder */}
        <MaturityLadder positions={egpList} />

        {/* Table */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--b1)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Coins size={13} style={{ color: "#E89A20" }} />
            <h3
              style={{
                fontFamily: "var(--f-disp)",
                fontWeight: 700,
                fontSize: "0.68rem",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--tx1)",
              }}
            >
              Positions EGP Bills
            </h3>
            <span
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: "0.65rem",
                color: "var(--tx3)",
                padding: "2px 7px",
                background: "var(--elev)",
                borderRadius: 4,
                border: "1px solid var(--b1)",
              }}
            >
              {egpList.length}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="dtable">
              <thead>
                <tr>
                  <Th k="isin" label="ISIN" />
                  <Th k="description" label="Description" />
                  <Th k="counterparty" label="Contrepartie" />
                  <Th k="maturityDate" label="Échéance" />
                  <Th k="couponRate" label="Rendement %" right />
                  <Th k="nominalUsd" label="Nominal M" right />
                  <Th k="plRealizedUsd" label="P&L Réalisé $" right />
                  <Th k="plLatentUsd" label="P&L Latent $" right />
                  <Th k="plEcoMad" label="P&L Éco ★ MAD" right />
                  <Th k="fundingUsd" label="Funding $" right />
                  <Th k="duration" label="Duration" right />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, idx) => {
                  const rowBg =
                    idx % 2 === 0 ? "var(--tr-even-bg)" : "transparent";
                  return (
                    <tr
                      key={r.isin + idx}
                      style={{ background: rowBg }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--tr-hover-bg)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = rowBg)
                      }
                    >
                      <td
                        style={{
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: "#FCD34D",
                          fontWeight: 500,
                        }}
                      >
                        {r.isin}
                      </td>
                      <td
                        style={{
                          textAlign: "left",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.70rem",
                          color: "var(--tx1)",
                        }}
                        title={r.description}
                      >
                        {r.description || "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--f-body)",
                          fontSize: "0.68rem",
                          color: "var(--tx2)",
                        }}
                      >
                        {r.counterparty || "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: "var(--tx2)",
                        }}
                      >
                        {fMat(r.maturityDate)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: "#FCD34D",
                        }}
                      >
                        {r.couponRate != null
                          ? `${(parseFloat(r.couponRate) * 100).toFixed(2)}%`
                          : "—"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          fontWeight: 500,
                        }}
                      >
                        {fN(parseFloat(r.nominalUsd || 0) / 1e6, 0)}
                        <span
                          style={{
                            color: "var(--tx3)",
                            fontSize: "0.58rem",
                            marginLeft: 1,
                          }}
                        >
                          M
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: pnlColor(r.plRealizedUsd),
                        }}
                      >
                        {fUSD(r.plRealizedUsd)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: pnlColor(r.plLatentUsd),
                        }}
                      >
                        {fUSD(r.plLatentUsd)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: pnlColor(r.plEcoMad),
                          fontWeight: 700,
                        }}
                      >
                        {fMAD(r.plEcoMad)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: "var(--warn)",
                        }}
                      >
                        {fUSD(r.fundingUsd)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: "#FCD34D",
                        }}
                      >
                        {fN(r.duration, 4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {sorted.length > 0 && (
                <tfoot>
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "left",
                        fontFamily: "var(--f-disp)",
                        fontWeight: 700,
                        fontSize: "0.60rem",
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "var(--tx3)",
                      }}
                    >
                      Total{" "}
                      <span
                        style={{
                          fontFamily: "var(--f-mono)",
                          color: "#FCD34D",
                        }}
                      >
                        ({sorted.length})
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--f-mono)",
                        fontWeight: 600,
                      }}
                    >
                      {(totals.nominalUsd / 1e6).toFixed(0)}
                      <span
                        style={{
                          color: "var(--tx3)",
                          fontSize: "0.58rem",
                          marginLeft: 1,
                        }}
                      >
                        M
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--f-mono)",
                        color: pnlColor(totals.plRealizedUsd),
                        fontWeight: 600,
                      }}
                    >
                      {fUSD(totals.plRealizedUsd)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--f-mono)",
                        color: pnlColor(totals.plLatentUsd),
                        fontWeight: 600,
                      }}
                    >
                      {fUSD(totals.plLatentUsd)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--f-mono)",
                        color: pnlColor(totals.plEcoMad),
                        fontWeight: 700,
                      }}
                    >
                      {fMAD(totals.plEcoMad)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--f-mono)",
                        color: "var(--warn)",
                      }}
                    >
                      {fUSD(totals.fundingUsd)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {egpList.length === 0 && !loading && (
            <div
              style={{
                textAlign: "center",
                padding: "48px",
                color: "var(--tx3)",
              }}
            >
              <Coins
                size={28}
                style={{ margin: "0 auto 10px", opacity: 0.3 }}
              />
              <p style={{ fontFamily: "var(--f-body)", fontSize: "0.78rem" }}>
                Aucun snapshot EGP disponible
              </p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default EGPView;
