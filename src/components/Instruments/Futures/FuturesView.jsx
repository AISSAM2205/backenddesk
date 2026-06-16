import React, { useEffect, useMemo, useState } from "react";
import { Button } from "antd";
import { useTrading } from "../../../contexts/TradingContext";
import LivePrice from "../../Dashboard/LivePrice";
import api from "../../../services/api";
import {
  TrendingUp,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  Shield,
} from "lucide-react";

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
  if (a >= 1e6) return `${s}${(Math.abs(n) / 1e6).toFixed(2)}M`;
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
};
const pnlColor = (v) =>
  parseFloat(v || 0) >= 0 ? "var(--profit)" : "var(--loss)";
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

const SortIcon = ({ active, dir }) => {
  if (!active)
    return (
      <ChevronsUpDown size={10} style={{ opacity: 0.25, marginLeft: 3 }} />
    );
  return dir === "asc" ? (
    <ChevronUp size={10} style={{ color: "var(--fut)", marginLeft: 3 }} />
  ) : (
    <ChevronDown size={10} style={{ color: "var(--fut)", marginLeft: 3 }} />
  );
};

const FuturesView = () => {
  const { dashboardRows, riskData, rates, loading, refresh, selectedDate } =
    useTrading();
  const [sortKey, setSortKey] = useState("dv01Bond");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (k) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  /* Book futures RÉEL — récupéré directement depuis la table trade.
     (le dashboard/v_position ne contient que des obligations, jamais les futures) */
  const [futuresTrades, setFuturesTrades] = useState([]);
  useEffect(() => {
    api.trades
      .getAll()
      .then((res) =>
        setFuturesTrades(
          (res.data || []).filter(
            (t) =>
              !t.isClosed &&
              (t.subAsset || "").toLowerCase().includes("future"),
          ),
        ),
      )
      .catch(() => setFuturesTrades([]));
  }, [selectedDate]);

  /* Agrégation par obligation couverte : contrats nets + MtM converti en MAD */
  const futuresByBond = useMemo(() => {
    const usdMad = parseFloat(rates?.usdMad) || 10.0347;
    const eurMad = parseFloat(rates?.eurMad) || 10.8891;
    const map = {};
    (futuresTrades || []).forEach((t) => {
      const isin = t.hedBondIsin;
      if (!isin) return;
      const n = parseInt(t.nbContracts, 10) || 0;
      const signed = (t.way === "SELL" ? -1 : 1) * n;
      // Bund/Bobl/Schatz (RX/OE/DU) + OAT/BTP en EUR, Treasuries (FV/TY/US) en USD
      const tkr = (t.assetIdentifier || "").toUpperCase();
      const fx = /^(RX|OE|DU|IK|OAT)/.test(tkr) ? eurMad : usdMad;
      const mtmMad = (parseFloat(t.mtmPnl) || 0) * fx;
      if (!map[isin]) map[isin] = { net: 0, mtmMad: 0 };
      map[isin].net += signed;
      map[isin].mtmMad += mtmMad;
    });
    return map;
  }, [futuresTrades, rates]);

  const futuresBook = useMemo(() => {
    let net = 0,
      mtmMad = 0;
    Object.values(futuresByBond).forEach((v) => {
      net += v.net;
      mtmMad += v.mtmMad;
    });
    return { net, mtmMad };
  }, [futuresByBond]);

  /* Bonds that have a hedge future assigned */
  const hedged = useMemo(() => {
    const riskMap = {};
    (riskData || []).forEach((r) => {
      riskMap[r.isin] = r;
    });
    return (dashboardRows || [])
      .filter((r) => {
        const sub = (r.subAsset || "").toLowerCase();
        return !sub.includes("future") && r.hedgeFuture;
      })
      .map((r) => {
        const merged = { ...r, ...(riskMap[r.isin] || {}) };
        // Position futures RÉELLE (depuis la table trade) — source de vérité
        const fb = futuresByBond[r.isin];
        if (fb) {
          merged.currentFuturesPosition = fb.net;
          merged.futuresMtmMad = fb.mtmMad;
        }
        return merged;
      });
  }, [dashboardRows, riskData, futuresByBond]);

  /* Pure futures positions (subAsset contains "future") */
  // Lignes de la table "Positions Futures Actives" = vrais contrats futures
  const futureRows = useMemo(() => {
    const usdMad = parseFloat(rates?.usdMad) || 10.0347;
    const eurMad = parseFloat(rates?.eurMad) || 10.8891;
    return (futuresTrades || []).map((t) => {
      const tkr = (t.assetIdentifier || "").toUpperCase();
      const fx = /^(RX|OE|DU|IK|OAT)/.test(tkr) ? eurMad : usdMad;
      const n = parseInt(t.nbContracts, 10) || 0;
      const signed = (t.way === "SELL" ? -1 : 1) * n;
      const mtmMad = (parseFloat(t.mtmPnl) || 0) * fx;
      return {
        isin: t.assetIdentifier,
        description: t.assetIdentifier,
        subAsset: t.subAsset || "Future",
        futuresNetPosition: signed,
        pnlEconomicMad: mtmMad,
        pnlAccountingMad: mtmMad,
        netDailyMad: 0,
        // dernier prix connu (fraction) — repli avant le premier tick live
        lastPrice: t.lastPrice != null ? parseFloat(t.lastPrice) : null,
        maturityDate: t.valueDate || t.maturityDate,
      };
    });
  }, [futuresTrades, rates]);

  const sorted = useMemo(() => {
    const arr = [...hedged];
    if (!sortKey) return arr;
    return arr.sort((a, b) => {
      const na = parseFloat(a[sortKey]),
        nb = parseFloat(b[sortKey]);
      if (!isNaN(na) && !isNaN(nb))
        return sortDir === "asc" ? na - nb : nb - na;
      return 0;
    });
  }, [hedged, sortKey, sortDir]);

  const totals = useMemo(
    () =>
      sorted.reduce(
        (acc, r) => ({
          nominal: acc.nominal + parseFloat(r.netNominal || 0),
          dv01: acc.dv01 + parseFloat(r.dv01Bond || 0),
          nbContractsNeeded:
            acc.nbContractsNeeded +
            Math.abs(parseInt(r.nbContractsToHedge, 10) || 0),
          pnlEco: acc.pnlEco + parseFloat(r.pnlEconomicMad || 0),
        }),
        { nominal: 0, dv01: 0, nbContractsNeeded: 0, pnlEco: 0 },
      ),
    [sorted],
  );

  // P&L du book futures = MtM réel (les futures n'ont pas de carry → net daily 0)
  const futTotals = useMemo(
    () => ({
      pnlEco: futuresBook.mtmMad,
      pnlAcct: futuresBook.mtmMad,
      netDaily: 0,
    }),
    [futuresBook],
  );

  const totalNetPos = futuresBook.net;

  // Couverture DIRECTIONNELLE : un future ne couvre que s'il est dans le bon
  // sens (signe opposé à l'expo obligataire — bond long ⇒ vendre futures).
  // Un hedge à l'envers (même signe) double le risque et ne compte PAS comme
  // couverture ; au-delà de la cible on est en sur-couverture (signalé).
  const hedge = useMemo(() => {
    let required = 0; // Σ |contrats cible|
    let effective = 0; // Σ contrats couvrants effectifs (bon sens, plafond cible)
    let overHedged = false;
    sorted.forEach((r) => {
      const need = parseInt(r.nbContractsToHedge, 10) || 0;
      const have = parseInt(r.currentFuturesPosition, 10) || 0;
      if (need === 0) return;
      required += Math.abs(need);
      if (need * have < 0) {
        // signes opposés = hedge dans le bon sens
        effective += Math.min(Math.abs(have), Math.abs(need));
        if (Math.abs(have) > Math.abs(need)) overHedged = true;
      }
    });
    const coverage =
      required > 0 ? Math.min((effective / required) * 100, 100) : 0;
    return { coverage, effective, required, overHedged };
  }, [sorted]);
  const hedgeCoverage = hedge.coverage;

  const Th = ({ k, label, right }) => (
    <th
      onClick={() => handleSort(k)}
      style={{
        textAlign: right ? "right" : "left",
        cursor: "pointer",
        color: sortKey === k ? "var(--fut)" : "var(--tx3)",
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

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--void)" }}>
      {/* Header */}
      <div className="view-hdr">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 13,
                background: "var(--fut)",
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
            <h2 className="view-title">Futures &amp; Couverture</h2>
          </div>
          <p className="view-sub" style={{ paddingLeft: 9 }}>
            {sorted.length} positions couvertes · {futureRows.length} contrats
            actifs · {selectedDate}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="tag">{sorted.length} pos.</span>
          <Button
            size="small"
            loading={loading}
            onClick={refresh}
            icon={<RefreshCw size={10} />}
          />
        </div>
      </div>

      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* KPI Row — Futures positions */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "stretch",
          }}
        >
          {[
            [
              "Position Nette",
              `${totalNetPos > 0 ? "+" : ""}${totalNetPos} cts`,
              "var(--fut)",
            ],
            [
              "P&L Éco Futures",
              fMAD(futTotals.pnlEco),
              pnlColor(futTotals.pnlEco),
            ],
            [
              "P&L Comptable",
              fMAD(futTotals.pnlAcct),
              pnlColor(futTotals.pnlAcct),
            ],
            [
              "Net Daily",
              fMAD(futTotals.netDaily),
              pnlColor(futTotals.netDaily),
            ],
            ["DV01 à couvrir", `${fN(totals.dv01, 0)} $/bp`, "#60A5FA"],
            [
              "Contrats nécessaires",
              `${totals.nbContractsNeeded} cts`,
              "var(--warn)",
            ],
          ].map(([label, value, valColor]) => (
            <div
              key={label}
              className="card"
              style={{ flex: "1 1 140px", padding: "8px 10px" }}
            >
              <div className="lbl" style={{ marginBottom: 5 }}>
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

          {/* Hedge Coverage Arc Gauge */}
          {hedge.required > 0 &&
            (() => {
              const coverColor =
                hedgeCoverage >= 90
                  ? "var(--profit)"
                  : hedgeCoverage >= 60
                    ? "var(--warn)"
                    : "var(--loss)";
              return (
                <div
                  className="card"
                  style={{
                    flex: "1 1 140px",
                    padding: "8px 10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    className="lbl"
                    style={{ marginBottom: 4, textAlign: "center" }}
                  >
                    Couverture Hedge
                  </div>
                  <svg
                    viewBox="0 0 100 58"
                    style={{ width: 110, maxHeight: 62 }}
                  >
                    <path
                      d="M 14,50 A 36,36 0 0,1 86,50"
                      fill="none"
                      stroke="var(--b2)"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    {/* pathLength=100 ⇒ le dash s'exprime en % de l'arc :
                        robuste à la géométrie, aucun artefact de répétition. */}
                    {hedgeCoverage > 0 && (
                      <path
                        d="M 14,50 A 36,36 0 0,1 86,50"
                        fill="none"
                        stroke={coverColor}
                        strokeWidth="6"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray={`${hedgeCoverage.toFixed(1)} 100`}
                        style={{ transition: "stroke-dasharray 0.9s ease" }}
                      />
                    )}
                    <text
                      x="50"
                      y="40"
                      textAnchor="middle"
                      fill={coverColor}
                      fontSize="13"
                      fontFamily="JetBrains Mono,monospace"
                      fontWeight="700"
                    >{`${hedgeCoverage.toFixed(0)}%`}</text>
                    <text
                      x="50"
                      y="51"
                      textAnchor="middle"
                      fill={hedge.overHedged ? "var(--warn)" : "var(--tx3)"}
                      fontSize="6.5"
                      fontFamily="Syne,sans-serif"
                    >
                      {hedge.overHedged
                        ? "sur-couverture"
                        : `${hedge.effective}/${hedge.required} cts`}
                    </text>
                  </svg>
                </div>
              );
            })()}
        </div>

        {/* Active futures positions block */}
        {futureRows.length > 0 && (
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
              <TrendingUp size={13} style={{ color: "var(--fut)" }} />
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
                Positions Futures Actives
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
                {futureRows.length}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="dtable">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Ticker / ISIN</th>
                    <th style={{ textAlign: "left" }}>Type</th>
                    <th style={{ textAlign: "right" }}>Pos. Nette</th>
                    <th style={{ textAlign: "right" }}>Dernier</th>
                    <th style={{ textAlign: "right" }}>P&L Éco MAD</th>
                    <th style={{ textAlign: "right" }}>P&L Cmptb.</th>
                    <th style={{ textAlign: "right" }}>Net Daily</th>
                    <th style={{ textAlign: "right" }}>Échéance</th>
                  </tr>
                </thead>
                <tbody>
                  {futureRows.map((r, idx) => {
                    const rowBg =
                      idx % 2 === 0 ? "rgba(8,24,41,0.50)" : "transparent";
                    return (
                      <tr
                        key={r.isin}
                        style={{ background: rowBg }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(12,31,58,0.70)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = rowBg)
                        }
                      >
                        <td
                          style={{
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.68rem",
                            color: "var(--fut)",
                            fontWeight: 500,
                          }}
                        >
                          {r.isin || r.description}
                        </td>
                        <td>
                          <span className="badge badge-fut">{r.subAsset}</span>
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.70rem",
                            color: "var(--fut)",
                            fontWeight: 700,
                          }}
                        >
                          {r.futuresNetPosition != null
                            ? `${r.futuresNetPosition > 0 ? "+" : ""}${r.futuresNetPosition}`
                            : "—"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.68rem",
                          }}
                        >
                          {/* Dernier prix — flux temps réel (flash up/down) */}
                          <LivePrice
                            symbol={r.isin}
                            decimals={4}
                            fallback={
                              r.lastPrice != null ? r.lastPrice * 100 : null
                            }
                          />
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.68rem",
                            color: pnlColor(r.pnlEconomicMad),
                            fontWeight: 700,
                          }}
                        >
                          {fMAD(r.pnlEconomicMad)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.68rem",
                            color: pnlColor(r.pnlAccountingMad),
                          }}
                        >
                          {fMAD(r.pnlAccountingMad)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.68rem",
                            color: pnlColor(r.netDailyMad),
                          }}
                        >
                          {fMAD(r.netDailyMad)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.68rem",
                            color: "var(--tx2)",
                          }}
                        >
                          {fMat(r.maturityDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Hedge Book — bonds needing futures coverage */}
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
            <Shield size={13} style={{ color: "#9B3EEF" }} />
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
              Hedge Book — Couverture Duration
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
              {sorted.length}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="dtable">
              <thead>
                <tr>
                  <Th k="isin" label="ISIN" />
                  <Th k="description" label="Obligation" />
                  <Th k="maturityDate" label="Échéance" />
                  <Th k="netNominal" label="Nominal M" right />
                  <Th k="modifiedDuration" label="Duration" right />
                  <Th k="dv01Bond" label="DV01 $/bp" right />
                  <Th k="hedgeFuture" label="Future Hedge" />
                  <Th k="hedgeRatio" label="Ratio Hedge" right />
                  <Th k="nbContractsToHedge" label="Hedge à Passer" right />
                  <Th k="currentFuturesPosition" label="Pos. Actuelle" right />
                  <Th k="pnlEconomicMad" label="P&L Éco ★" right />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, idx) => {
                  const rowBg =
                    idx % 2 === 0 ? "rgba(8,24,41,0.50)" : "transparent";
                  const needed = parseInt(r.nbContractsToHedge, 10) || 0;
                  const current = parseInt(r.currentFuturesPosition, 10) || 0;
                  // Hedge correct = signe opposé. Même signe ⇒ couverture nulle
                  // + alerte de sens (le future aggrave le risque).
                  const wrongDir =
                    needed !== 0 && current !== 0 && needed * current > 0;
                  const effHedged = wrongDir
                    ? 0
                    : Math.min(Math.abs(current), Math.abs(needed));
                  const gap = Math.abs(needed) - effHedged; // à passer (≥0)
                  return (
                    <tr
                      key={r.isin}
                      style={{ background: rowBg }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(12,31,58,0.70)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = rowBg)
                      }
                    >
                      <td
                        style={{
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: "var(--cyan)",
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
                          fontSize: "0.70rem",
                          color: "var(--tx1)",
                        }}
                        title={r.description}
                      >
                        {r.description || "—"}
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
                          fontWeight: 500,
                        }}
                      >
                        {fN(parseFloat(r.netNominal || 0) / 1e6, 1)}
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
                          color: "#60A5FA",
                        }}
                      >
                        {fN(r.modifiedDuration, 2)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: "#60A5FA",
                        }}
                      >
                        {fN(r.dv01Bond, 0)}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.66rem",
                          color: "var(--fut)",
                          fontWeight: 500,
                        }}
                      >
                        {r.hedgeFuture || "—"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: "var(--tx2)",
                        }}
                      >
                        {r.hedgeRatio != null
                          ? `${(parseFloat(r.hedgeRatio) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                        }}
                      >
                        {needed === 0 ? (
                          <span style={{ color: "var(--tx3)" }}>—</span>
                        ) : wrongDir ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 1,
                            }}
                          >
                            <span
                              style={{ fontWeight: 700, color: "var(--loss)" }}
                            >
                              ⚠ sens
                            </span>
                            <span
                              style={{
                                fontSize: "0.55rem",
                                color: "var(--tx3)",
                              }}
                            >
                              cible&nbsp;{Math.abs(needed)}
                            </span>
                          </div>
                        ) : gap === 0 ? (
                          <span
                            style={{ color: "var(--profit)", fontWeight: 700 }}
                          >
                            ✓
                          </span>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 1,
                            }}
                          >
                            <span
                              style={{ fontWeight: 700, color: "var(--warn)" }}
                            >
                              {gap}
                            </span>
                            <span
                              style={{
                                fontSize: "0.55rem",
                                color: "var(--tx3)",
                              }}
                            >
                              cible&nbsp;{Math.abs(needed)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: current !== 0 ? "var(--fut)" : "var(--tx3)",
                        }}
                      >
                        {current !== 0
                          ? `${current > 0 ? "+" : ""}${current}`
                          : "—"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.68rem",
                          color: pnlColor(r.pnlEconomicMad),
                          fontWeight: 700,
                        }}
                      >
                        {fMAD(r.pnlEconomicMad)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {sorted.length > 0 && (
                <tfoot>
                  <tr>
                    <td
                      colSpan={3}
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
                          color: "var(--fut)",
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
                      {(totals.nominal / 1e6).toFixed(1)}
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
                    <td />
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--f-mono)",
                        color: "#60A5FA",
                        fontWeight: 600,
                      }}
                    >
                      {fN(totals.dv01, 0)}
                    </td>
                    <td colSpan={2} />
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--f-mono)",
                        color: "var(--warn)",
                        fontWeight: 700,
                      }}
                    >
                      {totals.nbContractsNeeded}
                    </td>
                    <td />
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--f-mono)",
                        color: pnlColor(totals.pnlEco),
                        fontWeight: 700,
                      }}
                    >
                      {fMAD(totals.pnlEco)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {sorted.length === 0 && !loading && (
            <div
              style={{
                textAlign: "center",
                padding: "48px",
                color: "var(--tx3)",
              }}
            >
              <TrendingUp
                size={28}
                style={{ margin: "0 auto 10px", opacity: 0.3 }}
              />
              <p style={{ fontFamily: "var(--f-body)", fontSize: "0.78rem" }}>
                Aucune position couverte pour le {selectedDate}
              </p>
            </div>
          )}
        </div>

        {/* Alert when hedge gap is significant */}
        {sorted.some((r) => {
          const need = parseInt(r.nbContractsToHedge, 10) || 0;
          const have = parseInt(r.currentFuturesPosition, 10) || 0;
          if (need === 0) return false;
          // hedge à l'envers OU sous-couvert (en valeur absolue, bon sens)
          const wrongDir = have !== 0 && need * have > 0;
          const effHedged = wrongDir
            ? 0
            : Math.min(Math.abs(have), Math.abs(need));
          return wrongDir || effHedged < Math.abs(need);
        }) && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 10,
              background: "rgba(199,122,0,0.08)",
              border: "1px solid rgba(199,122,0,0.25)",
            }}
          >
            <AlertTriangle
              size={14}
              style={{ color: "var(--warn)", flexShrink: 0, marginTop: 1 }}
            />
            <div>
              <p
                style={{
                  fontFamily: "var(--f-disp)",
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--warn)",
                  marginBottom: 4,
                }}
              >
                Couverture Incomplète
              </p>
              <p
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "0.73rem",
                  color: "var(--tx2)",
                  lineHeight: 1.5,
                }}
              >
                Certaines positions ont un écart entre les contrats nécessaires
                et les contrats actuellement ouverts. Vérifier le hedge book.
              </p>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default FuturesView;
