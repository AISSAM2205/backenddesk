import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "antd";
import { useTrading } from "../../../contexts/TradingContext";
import { AlertTriangle, TrendingUp, DollarSign, RefreshCw } from "lucide-react";
import api from "../../../services/api";

/* ─── Formatters ─────────────────────────────────────────────── */
const fM = (v, ccy = "USD") => {
  if (v == null || isNaN(parseFloat(v))) return "—";
  const n = parseFloat(v),
    a = Math.abs(n),
    s = n >= 0 ? "+" : "−";
  const str =
    a >= 1e9
      ? `${(a / 1e9).toFixed(2)} Md`
      : a >= 1e6
        ? `${(a / 1e6).toFixed(2)} M`
        : a >= 1e3
          ? `${(a / 1e3).toFixed(1)} k`
          : a.toFixed(0);
  return `${s}${str} ${ccy}`;
};
const fPct = (v, d = 2) =>
  v == null || isNaN(v)
    ? "—"
    : `${parseFloat(v) >= 0 ? "+" : ""}${parseFloat(v).toFixed(d)}%`;
const fN = (v, d = 3) =>
  v == null || isNaN(v) ? "—" : parseFloat(v).toFixed(d);
const pCol = (v) => (parseFloat(v || 0) >= 0 ? "var(--profit)" : "var(--loss)");

/* ─── Données fallback (affichées si le backend n'est pas encore disponible) ── */
const FALLBACK_TBILLS = [
  {
    id: "T-USD-1",
    isin: "US912796ZT70",
    emetteur: "US Treasury",
    nominal: 50e6,
    devise: "USD",
    yieldNet: 5.42,
    yieldBrut: 5.85,
    duration: 0.25,
    plYieldUsd: 680000,
    plFxUsd: -45000,
    plEcoUsd: 635000,
    fundingUsd: -210000,
    fxMoyen: 9.92,
    fxCurrent: 10.035,
    fxBreakevenAvec: 9.785,
    fxBreakevenSans: 9.83,
    fxStopLoss: 9.5,
    maturityDate: "2025-06-17",
    dateInitiation: "2024-12-17",
    limitNominal: 100e6,
  },
  {
    id: "T-USD-2",
    isin: "US912796YH08",
    emetteur: "US Treasury",
    nominal: 30e6,
    devise: "USD",
    yieldNet: 5.28,
    yieldBrut: 5.7,
    duration: 0.5,
    plYieldUsd: 396000,
    plFxUsd: -28000,
    plEcoUsd: 368000,
    fundingUsd: -126000,
    fxMoyen: 9.875,
    fxCurrent: 10.035,
    fxBreakevenAvec: 9.735,
    fxBreakevenSans: 9.79,
    fxStopLoss: 9.5,
    maturityDate: "2025-09-15",
    dateInitiation: "2024-09-15",
    limitNominal: 100e6,
  },
  {
    id: "T-EUR-1",
    isin: "FR0013519668",
    emetteur: "Trésor Français (BTF)",
    nominal: 20e6,
    devise: "EUR",
    yieldNet: 3.15,
    yieldBrut: 3.8,
    duration: 0.25,
    plYieldUsd: 157500,
    plFxUsd: 12000,
    plEcoUsd: 169500,
    fundingUsd: -63000,
    fxMoyen: 10.65,
    fxCurrent: 10.889,
    fxBreakevenAvec: 10.52,
    fxBreakevenSans: 10.57,
    fxStopLoss: 10.2,
    maturityDate: "2025-07-10",
    dateInitiation: "2025-01-10",
    limitNominal: 50e6,
  },
];

/* ─── KPI Card ──────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, color = "var(--cyan)", alert }) => (
  <div className="card" style={{ padding: "10px 13px" }}>
    <div
      style={{
        fontFamily: "var(--f-disp)",
        fontSize: "0.52rem",
        fontWeight: 700,
        letterSpacing: "0.11em",
        textTransform: "uppercase",
        color: "var(--tx3)",
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: "var(--f-mono)",
        fontWeight: 700,
        fontSize: "0.95rem",
        color: alert ? "var(--loss)" : color,
        lineHeight: 1,
        letterSpacing: "-0.02em",
      }}
    >
      {value}
    </div>
    {sub && (
      <div
        style={{
          fontFamily: "var(--f-body)",
          fontSize: "0.60rem",
          color: "var(--tx3)",
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

/* ─── Limit Gauge ───────────────────────────────────────────── */
const LimitGauge = ({ label, used, limit, currency, color }) => {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const over = pct > 90,
    warn = pct > 75;
  const c = over ? "var(--loss)" : warn ? "var(--warn)" : color;
  return (
    <div
      style={{
        padding: "9px 13px",
        borderRadius: 7,
        background: "var(--surf)",
        border: `1px solid ${over ? "rgba(255,43,96,0.25)" : "var(--b1)"}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.65rem",
            color: "var(--tx2)",
          }}
        >
          {label}
        </span>
        {over && (
          <span
            style={{
              fontFamily: "var(--f-disp)",
              fontSize: "0.50rem",
              fontWeight: 800,
              color: "var(--loss)",
              padding: "1px 5px",
              background: "rgba(255,43,96,0.10)",
              borderRadius: 3,
              letterSpacing: "0.08em",
            }}
          >
            LIMITE
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: "0.80rem",
            fontWeight: 700,
            color: c,
          }}
        >
          {(used / 1e6).toFixed(1)} M
        </span>
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: "0.60rem",
            color: "var(--tx3)",
          }}
        >
          / {(limit / 1e6).toFixed(0)} M {currency}
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "var(--elev)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 2,
            background: c,
            transition: "width 0.8s ease",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 3,
        }}
      >
        <span
          style={{ fontFamily: "var(--f-mono)", fontSize: "0.57rem", color: c }}
        >
          {pct.toFixed(1)}% consommé
        </span>
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: "0.57rem",
            color: "var(--tx3)",
          }}
        >
          reste {((limit - used) / 1e6).toFixed(1)} M
        </span>
      </div>
    </div>
  );
};

/* ─── FX Breakeven Row ──────────────────────────────────────── */
const FxBkRow = ({ label, value, current, isStopLoss }) => {
  const breached = isStopLoss ? current < value : false;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px 0",
        borderBottom: "1px solid var(--b0)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--f-body)",
          fontSize: "0.65rem",
          color: "var(--tx2)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: "0.70rem",
          fontWeight: 600,
          color: breached
            ? "var(--loss)"
            : isStopLoss
              ? "var(--warn)"
              : "var(--tx1)",
        }}
      >
        {fN(value, 4)}
        {breached && (
          <span
            style={{
              marginLeft: 5,
              fontSize: "0.55rem",
              color: "var(--loss)",
              fontWeight: 800,
              letterSpacing: "0.06em",
            }}
          >
            ⚠ BREACHED
          </span>
        )}
      </span>
    </div>
  );
};

/* ─── Main Component ────────────────────────────────────────── */
const TBillsView = () => {
  const { rates, loading: ctxLoading } = useTrading();
  const [tab, setTab] = useState("position");
  const [selectedId, setSelectedId] = useState(null);
  const [allTbills, setAllTbills] = useState(FALLBACK_TBILLS);
  const [apiLoading, setApiLoading] = useState(false);
  const [fromApi, setFromApi] = useState(false);

  const usdMad = parseFloat(rates?.usdMad || 10.035);
  const eurMad = parseFloat(rates?.eurMad || 10.889);

  const loadTBills = useCallback(async () => {
    setApiLoading(true);
    try {
      const res = await api.tbills.getAll();
      if (res.data && res.data.length > 0) {
        setAllTbills(res.data);
        setFromApi(true);
      }
    } catch {
      // backend absent — on garde les données fallback, pas d'erreur visible
    } finally {
      setApiLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTBills();
  }, [loadTBills]);

  const loading = ctxLoading || apiLoading;

  const totals = useMemo(() => {
    const r = (v) => parseFloat(v || 0);
    const totalNomUsd = allTbills
      .filter((t) => t.devise === "USD")
      .reduce((s, t) => s + r(t.nominal), 0);
    const totalNomEur = allTbills
      .filter((t) => t.devise === "EUR")
      .reduce((s, t) => s + r(t.nominal), 0);
    const totalPlEcoUsd = allTbills.reduce((s, t) => s + r(t.plEcoUsd), 0);
    const totalPlFxUsd = allTbills.reduce((s, t) => s + r(t.plFxUsd), 0);
    const totalPlYld = allTbills.reduce((s, t) => s + r(t.plYieldUsd), 0);
    const totalFundUsd = allTbills.reduce((s, t) => s + r(t.fundingUsd), 0);
    const yieldMoyen =
      allTbills.reduce((s, t) => s + r(t.yieldNet) * r(t.nominal), 0) /
      Math.max(
        allTbills.reduce((s, t) => s + r(t.nominal), 0),
        1,
      );
    return {
      totalNomUsd,
      totalNomEur,
      totalPlEcoUsd,
      totalPlFxUsd,
      totalPlYld,
      totalFundUsd,
      yieldMoyen,
    };
  }, [allTbills]);

  const TABS = [
    { id: "position", label: "Positions" },
    { id: "breakeven", label: "FX Breakeven" },
    { id: "limites", label: "Limites" },
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
  };
  const THL = { ...TH, textAlign: "left" };
  const TD = (color) => ({
    padding: "8px 10px",
    fontFamily: "var(--f-mono)",
    fontSize: "0.68rem",
    borderBottom: "1px solid var(--b0)",
    whiteSpace: "nowrap",
    color: color || "var(--tx1)",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  });
  const TDL = (color) => ({ ...TD(color), textAlign: "left" });

  return (
    <div style={{ padding: "16px 20px", height: "100%", overflowY: "auto" }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
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
              lineHeight: 1.2,
            }}
          >
            T-Bills / CPs
          </h1>
          <div
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.70rem",
              color: "var(--tx3)",
              marginTop: 3,
            }}
          >
            Titres offshore · Bills Gouvernementaux & Corpo · USD + EUR
          </div>
        </div>
        <Button
          size="small"
          loading={loading}
          onClick={loadTBills}
          icon={<RefreshCw size={12} />}
        >
          Actualiser
        </Button>
      </div>

      {/* ── Mock data warning ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          background: "rgba(251,191,36,0.06)",
          border: "1px solid rgba(251,191,36,0.18)",
          borderRadius: 5,
          marginBottom: 14,
        }}
      >
        <AlertTriangle
          size={12}
          style={{ color: "var(--warn)", flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.67rem",
            color: "var(--tx2)",
          }}
        >
          {fromApi
            ? "Données chargées depuis le backend — connexion Bloomberg en attente (mock actif)."
            : "Backend non disponible — données de référence affichées. Positions et P&L seront mis à jour automatiquement."}
        </span>
      </div>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <KpiCard
          label="Encours USD"
          value={`${(totals.totalNomUsd / 1e6).toFixed(1)} M`}
          sub="Nominal USD"
          color="var(--cyan)"
        />
        <KpiCard
          label="Encours EUR"
          value={`${(totals.totalNomEur / 1e6).toFixed(1)} M`}
          sub="Nominal EUR"
          color="#60A5FA"
        />
        <KpiCard
          label="P&L Yield TTC"
          value={fM(totals.totalPlYld)}
          color={pCol(totals.totalPlYld)}
        />
        <KpiCard
          label="P&L FX"
          value={fM(totals.totalPlFxUsd)}
          color={pCol(totals.totalPlFxUsd)}
          alert={totals.totalPlFxUsd < 0}
        />
        <KpiCard
          label="Yield Net Moyen"
          value={fPct(totals.yieldMoyen)}
          sub="Pondéré nominal"
          color="var(--profit)"
        />
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
                tab === t.id
                  ? "2px solid var(--cyan)"
                  : "2px solid transparent",
              marginBottom: -1,
              transition: "all 0.12s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════ TAB: POSITIONS ══════ */}
      {tab === "position" && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "auto",
            }}
          >
            <thead>
              <tr style={{ background: "var(--surf)" }}>
                <th style={THL}>ISIN</th>
                <th style={THL}>Émetteur</th>
                <th style={TH}>CCY</th>
                <th style={TH}>Nominal</th>
                <th style={TH}>Échéance</th>
                <th style={TH}>Yield Net</th>
                <th style={TH}>Yield Brut</th>
                <th style={TH}>Duration</th>
                <th style={TH}>P&L Yield</th>
                <th style={TH}>P&L FX</th>
                <th style={TH}>Funding</th>
                <th style={TH}>P&L Éco $</th>
                <th style={TH}>FX Moy.</th>
                <th style={TH}>FX Spot</th>
              </tr>
            </thead>
            <tbody>
              {allTbills.map((t, i) => (
                <tr
                  key={t.id}
                  onClick={() =>
                    setSelectedId(selectedId === t.id ? null : t.id)
                  }
                  style={{
                    background:
                      selectedId === t.id
                        ? "rgba(0,202,255,0.05)"
                        : i % 2 === 0
                          ? "transparent"
                          : "rgba(255,255,255,0.015)",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                >
                  <td style={TDL()}>{t.isin}</td>
                  <td style={TDL("var(--tx2)")}>{t.emetteur}</td>
                  <td style={TD()}>{t.devise}</td>
                  <td style={TD()}>{(t.nominal / 1e6).toFixed(0)} M</td>
                  <td style={TD("var(--tx2)")}>{t.maturityDate}</td>
                  <td style={TD("var(--profit)")}>{fPct(t.yieldNet)}</td>
                  <td style={TD("var(--tx2)")}>{fPct(t.yieldBrut)}</td>
                  <td style={TD()}>{t.duration.toFixed(2)} Y</td>
                  <td style={TD(pCol(t.plYieldUsd))}>{fM(t.plYieldUsd)}</td>
                  <td style={TD(pCol(t.plFxUsd))}>{fM(t.plFxUsd)}</td>
                  <td style={TD("var(--loss)")}>{fM(t.fundingUsd)}</td>
                  <td style={{ ...TD(pCol(t.plEcoUsd)), fontWeight: 700 }}>
                    {fM(t.plEcoUsd)}
                  </td>
                  <td style={TD("var(--tx2)")}>{fN(t.fxMoyen, 4)}</td>
                  <td style={TD()}>{fN(t.fxCurrent, 4)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  background: "rgba(0,202,255,0.05)",
                  borderTop: "1px solid var(--b1)",
                }}
              >
                <td
                  colSpan={3}
                  style={{
                    ...TDL("var(--tx1)"),
                    fontWeight: 700,
                    fontSize: "0.62rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  TOTAL
                </td>
                <td style={{ ...TD("var(--tx1)"), fontWeight: 700 }}>
                  {(totals.totalNomUsd / 1e6).toFixed(0)}M USD +{" "}
                  {(totals.totalNomEur / 1e6).toFixed(0)}M EUR
                </td>
                <td colSpan={4} />
                <td style={{ ...TD(pCol(totals.totalPlYld)), fontWeight: 700 }}>
                  {fM(totals.totalPlYld)}
                </td>
                <td
                  style={{ ...TD(pCol(totals.totalPlFxUsd)), fontWeight: 700 }}
                >
                  {fM(totals.totalPlFxUsd)}
                </td>
                <td style={{ ...TD("var(--loss)"), fontWeight: 700 }}>
                  {fM(totals.totalFundUsd)}
                </td>
                <td
                  style={{ ...TD(pCol(totals.totalPlEcoUsd)), fontWeight: 700 }}
                >
                  {fM(totals.totalPlEcoUsd)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ══════ TAB: FX BREAKEVEN ══════ */}
      {tab === "breakeven" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
          }}
        >
          {allTbills.map((t) => (
            <div key={t.id} className="card" style={{ padding: "14px 16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--b1)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--f-disp)",
                      fontWeight: 700,
                      fontSize: "0.65rem",
                      color: "var(--tx1)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {t.isin}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--f-body)",
                      fontSize: "0.60rem",
                      color: "var(--tx3)",
                      marginTop: 2,
                    }}
                  >
                    {t.emetteur} · {t.devise} · Nominal{" "}
                    {(t.nominal / 1e6).toFixed(0)}M
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    color: "var(--profit)",
                    padding: "2px 8px",
                    background: "rgba(0,232,153,0.08)",
                    border: "1px solid rgba(0,232,153,0.18)",
                    borderRadius: 3,
                  }}
                >
                  Yield {fPct(t.yieldNet)}
                </span>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontFamily: "var(--f-disp)",
                    fontSize: "0.52rem",
                    fontWeight: 700,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "var(--tx3)",
                    marginBottom: 6,
                  }}
                >
                  Niveaux FX {t.devise === "USD" ? "USD/MAD" : "EUR/MAD"}
                </div>
                <FxBkRow
                  label="FX Breakeven (avec financement)"
                  value={t.fxBreakevenAvec}
                  current={t.fxCurrent}
                />
                <FxBkRow
                  label="FX Breakeven (sans financement)"
                  value={t.fxBreakevenSans}
                  current={t.fxCurrent}
                />
                <FxBkRow
                  label="FX Stop Loss"
                  value={t.fxStopLoss}
                  current={t.fxCurrent}
                  isStopLoss
                />
                <FxBkRow
                  label="FX Moyen d'acquisition"
                  value={t.fxMoyen}
                  current={t.fxCurrent}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 8,
                    marginTop: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--f-body)",
                      fontSize: "0.65rem",
                      color: "var(--tx2)",
                    }}
                  >
                    FX Spot actuel
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--cyan)",
                    }}
                  >
                    {fN(t.fxCurrent, 4)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    padding: "8px",
                    borderRadius: 5,
                    background: "var(--surf)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--f-disp)",
                      fontSize: "0.50rem",
                      fontWeight: 700,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--tx3)",
                      marginBottom: 4,
                    }}
                  >
                    P&L Yield
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontWeight: 700,
                      color: pCol(t.plYieldUsd),
                      fontSize: "0.72rem",
                    }}
                  >
                    {fM(t.plYieldUsd)}
                  </div>
                </div>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: 5,
                    background: "var(--surf)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--f-disp)",
                      fontSize: "0.50rem",
                      fontWeight: 700,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--tx3)",
                      marginBottom: 4,
                    }}
                  >
                    P&L FX
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontWeight: 700,
                      color: pCol(t.plFxUsd),
                      fontSize: "0.72rem",
                    }}
                  >
                    {fM(t.plFxUsd)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════ TAB: LIMITES ══════ */}
      {tab === "limites" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div
              style={{
                fontFamily: "var(--f-disp)",
                fontWeight: 700,
                fontSize: "0.58rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--tx3)",
                marginBottom: 10,
              }}
            >
              Limites d'Exposition (selon Excel)
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 10,
              }}
            >
              <LimitGauge
                label="US Treasury Bills (USD)"
                used={totals.totalNomUsd}
                limit={100e6}
                currency="USD"
                color="var(--cyan)"
              />
              <LimitGauge
                label="BTF / Bons du Trésor (EUR)"
                used={totals.totalNomEur}
                limit={50e6}
                currency="EUR"
                color="#60A5FA"
              />
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: "var(--f-disp)",
                fontWeight: 700,
                fontSize: "0.58rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--tx3)",
                marginBottom: 10,
              }}
            >
              Récapitulatif P&L par catégorie
            </div>
            <div className="card" style={{ overflowX: "auto", padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surf)" }}>
                    <th style={THL}>Catégorie</th>
                    <th style={TH}>Encours</th>
                    <th style={TH}>Yield Net Moy.</th>
                    <th style={TH}>P&L Yield TTC</th>
                    <th style={TH}>P&L FX</th>
                    <th style={TH}>Funding</th>
                    <th style={TH}>P&L Éco $</th>
                    <th style={TH}>% Limite</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "US Treasury (USD)",
                      bills: allTbills.filter((t) => t.devise === "USD"),
                      limit: 100e6,
                      ccy: "USD",
                    },
                    {
                      label: "BTF France (EUR)",
                      bills: allTbills.filter((t) => t.devise === "EUR"),
                      limit: 50e6,
                      ccy: "EUR",
                    },
                  ].map(({ label, bills, limit, ccy }) => {
                    const nom = bills.reduce((s, t) => s + t.nominal, 0);
                    const plyld = bills.reduce((s, t) => s + t.plYieldUsd, 0);
                    const plfx = bills.reduce((s, t) => s + t.plFxUsd, 0);
                    const plfnd = bills.reduce((s, t) => s + t.fundingUsd, 0);
                    const pleco = bills.reduce((s, t) => s + t.plEcoUsd, 0);
                    const yld =
                      bills.reduce((s, t) => s + t.yieldNet * t.nominal, 0) /
                      Math.max(nom, 1);
                    return (
                      <tr key={label}>
                        <td style={TDL("var(--tx2)")}>{label}</td>
                        <td style={TD()}>
                          {(nom / 1e6).toFixed(1)} M {ccy}
                        </td>
                        <td style={TD("var(--profit)")}>{fPct(yld)}</td>
                        <td style={TD(pCol(plyld))}>{fM(plyld)}</td>
                        <td style={TD(pCol(plfx))}>{fM(plfx)}</td>
                        <td style={TD("var(--loss)")}>{fM(plfnd)}</td>
                        <td style={{ ...TD(pCol(pleco)), fontWeight: 700 }}>
                          {fM(pleco)}
                        </td>
                        <td
                          style={TD(
                            (nom / limit) * 100 > 90
                              ? "var(--loss)"
                              : "var(--warn)",
                          )}
                        >
                          {((nom / limit) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TBillsView;
