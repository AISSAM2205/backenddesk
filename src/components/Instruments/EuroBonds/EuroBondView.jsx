import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useTrading } from "../../../contexts/TradingContext";
import {
  AlertTriangle,
  Search,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
} from "lucide-react";

/* ─── Formatters ─────────────────────────────────────────────────── */
const fMAD = (v) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e6) return `${n >= 0 ? "" : "−"}${(Math.abs(n) / 1e6).toFixed(2)}M`;
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(n);
};
const fN = (v, d = 2) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};
const fPct = (v, d = 3) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`;
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

/* ─── Price flash hook ───────────────────────────────────────────── */
const useFlash = (value) => {
  const prev = useRef(value);
  const [cls, setCls] = useState("");
  useEffect(() => {
    const cur = parseFloat(value || 0),
      p = parseFloat(prev.current || 0);
    if (cur !== p && p !== 0) {
      setCls(cur > p ? "tick-up" : "tick-down");
      const t = setTimeout(() => setCls(""), 800);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return cls;
};

/* ─── Column groups ──────────────────────────────────────────────── */
const GROUPS = [
  { label: "IDENTIFICATION", span: 6, color: "rgba(30,127,255,0.6)" },
  { label: "NOMINAL", span: 1, color: "rgba(100,116,139,0.5)" },
  { label: "PRICING", span: 6, color: "rgba(99,102,241,0.6)" },
  { label: "P&L — CCY", span: 4, color: "rgba(20,188,164,0.6)" },
  { label: "P&L — MAD", span: 6, color: "rgba(0,232,153,0.6)" },
  { label: "G-SPREAD (bp)", span: 3, color: "rgba(234,179,8,0.6)" },
  { label: "RENDEMENT", span: 2, color: "rgba(251,146,60,0.6)" },
  { label: "SIGNAL", span: 1, color: "rgba(100,116,139,0.5)" },
  { label: "RISQUE", span: 3, color: "rgba(155,62,239,0.6)" },
  { label: "HEDGE", span: 2, color: "rgba(0,202,255,0.6)" },
];

const COLS = [
  /* Ident */ { key: "isin", label: "ISIN", right: false },
  /* Ident */ {
    key: "description",
    label: "Oblig.",
    right: false,
    noSort: true,
  },
  /* Ident */ { key: "subAsset", label: "Sub", right: false, noSort: true },
  /* Ident */ { key: "couponRate", label: "Cpn%", right: true },
  /* Ident */ {
    key: "maturityDate",
    label: "Échéance",
    right: false,
    noSort: true,
  },
  /* Ident */ { key: "currency", label: "CCY", right: false },
  /* Nominal */ { key: "netNominal", label: "Nominal M", right: true },
  /* Pricing */ { key: "cleanPrice", label: "Clean", right: true },
  /* Pricing */ { key: "accrued", label: "Accrued", right: true },
  /* Pricing */ { key: "lastWapClean", label: "WAP Clean", right: true },
  /* Pricing */ { key: "lastWapDirty", label: "WAP Dirty", right: true },
  /* Pricing */ { key: "dirtyMarket", label: "Px Mkt", right: true },
  /* Pricing */ { key: "perfWap", label: "Perf WAP", right: true },
  /* PnL CCY */ { key: "pnlLatentCcy", label: "Latent", right: true },
  /* PnL CCY */ { key: "pnlRealizedCcy", label: "Réalisé", right: true },
  /* PnL CCY */ { key: "couponsCcy", label: "Coupons", right: true },
  /* PnL CCY */ { key: "totalPnlCcy", label: "P&L Total", right: true },
  /* PnL MAD */ { key: "pnlAccountingMad", label: "Cmptb.", right: true },
  /* PnL MAD */ { key: "fundingCostMad", label: "Fin. MAD", right: true },
  /* PnL MAD */ {
    key: "pnlEconomicMad",
    label: "Éco MAD ★",
    right: true,
    star: true,
  },
  /* PnL MAD */ { key: "cpnThetaMad", label: "CpnΘ/j", right: true },
  /* PnL MAD */ { key: "dailyFundingMad", label: "Fin/j", right: true },
  /* PnL MAD */ {
    key: "netDailyMad",
    label: "Net Daily★",
    right: true,
    star: true,
  },
  /* Spread */ { key: "gSpreadBid", label: "Bid", right: true },
  /* Spread */ { key: "gSpreadMid", label: "Mid", right: true },
  /* Spread */ { key: "targetSpread", label: "Target", right: true },
  /* Rendmt */ { key: "yieldToMaturity", label: "YTM %", right: true },
  /* Rendmt */ { key: "assetSwapSpread", label: "ASW bp", right: true },
  /* Signal */ { key: "decision", label: "Signal", right: false, noSort: true },
  /* Risk */ { key: "modifiedDuration", label: "Dur.", right: true },
  /* Risk */ { key: "dv01Bond", label: "DV01 $", right: true },
  /* Risk */ { key: "convexity", label: "Convexité", right: true },
  /* Hedge */ {
    key: "hedgeFuture",
    label: "Future",
    right: false,
    noSort: true,
  },
  /* Hedge */ { key: "nbContractsToHedge", label: "Ctrts", right: true },
];

/* ─── Sub-asset badge ────────────────────────────────────────────── */
const SubBadge = ({ v }) => {
  if (!v) return null;
  const s = v.toLowerCase();
  const cls = s.includes("ocp")
    ? "badge-fut"
    : s.includes("cln")
      ? "badge-cln"
      : s.includes("egp") || s.includes("bill")
        ? "badge-egp"
        : "badge-eb";
  return <span className={`badge ${cls}`}>{v}</span>;
};

/* ─── Signal badge ───────────────────────────────────────────────── */
const Signal = ({ row }) => {
  const isBuy = row?.decision === "BUY";
  const spread =
    parseFloat(row?.targetSpread || 0) > 0
      ? (
          parseFloat(row?.gSpreadBid || 0) - parseFloat(row?.targetSpread || 0)
        ).toFixed(1)
      : null;
  if (isBuy)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <span className="badge badge-active">▲ BUY</span>
        {spread != null && (
          <span
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: "0.58rem",
              color: "var(--profit)",
            }}
          >
            +{spread}bp
          </span>
        )}
      </div>
    );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <span className="badge badge-closed">— HOLD</span>
      {spread != null && (
        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: "0.58rem",
            color: "var(--tx3)",
          }}
        >
          {spread}bp
        </span>
      )}
    </div>
  );
};

/* ─── Sort icon ──────────────────────────────────────────────────── */
const SortIcon = ({ active, dir }) => {
  if (!active)
    return (
      <ChevronsUpDown
        size={10}
        style={{ opacity: 0.25, marginLeft: 3, flexShrink: 0 }}
      />
    );
  return dir === "asc" ? (
    <ChevronUp
      size={10}
      style={{ color: "var(--cyan)", marginLeft: 3, flexShrink: 0 }}
    />
  ) : (
    <ChevronDown
      size={10}
      style={{ color: "var(--cyan)", marginLeft: 3, flexShrink: 0 }}
    />
  );
};

/* ─── Table Row ──────────────────────────────────────────────────── */
const Row = ({ r, idx }) => {
  const flash = useFlash(r.dirtyMarket);
  const isAlert = r.netDailyAlert;
  const td = {
    padding: "5px 8px",
    borderBottom: "1px solid var(--b0)",
    whiteSpace: "nowrap",
    transition: "background 0.1s",
  };
  const nb = {
    ...td,
    textAlign: "right",
    fontFamily: "var(--f-mono)",
    fontSize: "0.67rem",
    fontVariantNumeric: "tabular-nums",
  };

  const rowBg = isAlert
    ? "rgba(255,43,96,0.05)"
    : idx % 2 === 0
      ? "var(--tr-even-bg)"
      : "transparent";

  return (
    <tr
      className={flash}
      style={{ background: rowBg }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--tr-hover-bg)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
    >
      <td
        style={{
          ...td,
          fontFamily: "var(--f-mono)",
          fontSize: "0.67rem",
          color: "var(--cyan)",
          fontWeight: 500,
        }}
      >
        {r.isin}
      </td>
      <td
        style={{
          ...td,
          fontFamily: "var(--f-body)",
          fontSize: "0.70rem",
          color: "var(--tx1)",
          maxWidth: 150,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={r.description}
      >
        {r.description || "—"}
      </td>
      <td style={{ ...td, textAlign: "center" }}>
        <SubBadge v={r.subAsset} />
      </td>
      <td style={{ ...nb, color: "#FCD34D" }}>
        {r.couponRate != null ? `${parseFloat(r.couponRate).toFixed(3)}%` : "—"}
      </td>
      <td
        style={{
          ...td,
          fontFamily: "var(--f-mono)",
          fontSize: "0.67rem",
          color: "var(--tx2)",
        }}
      >
        {fMat(r.maturityDate)}
      </td>
      <td
        style={{
          ...td,
          fontFamily: "var(--f-mono)",
          fontSize: "0.67rem",
          color: "var(--tx3)",
          fontWeight: 600,
        }}
      >
        {r.currency || "—"}
      </td>
      <td style={{ ...nb }}>
        {fN(parseFloat(r.netNominal || 0) / 1e6, 1)}
        <span
          style={{ color: "var(--tx3)", fontSize: "0.58rem", marginLeft: 1 }}
        >
          M
        </span>
      </td>
      <td style={{ ...nb, color: "var(--tx2)" }}>{fN(r.cleanPrice, 4)}</td>
      <td style={{ ...nb, color: "var(--tx2)" }}>{fN(r.accrued, 4)}</td>
      <td style={{ ...nb, color: "var(--tx3)" }}>{fN(r.lastWapClean, 4)}</td>
      <td style={{ ...nb, color: "var(--tx2)" }}>{fN(r.lastWapDirty, 4)}</td>
      <td style={{ ...nb }}>{fN(r.dirtyMarket, 4)}</td>
      <td style={{ ...nb, color: pnlColor(parseFloat(r.perfWap || 0) * 100) }}>
        {r.perfWap != null ? fPct(parseFloat(r.perfWap) * 100, 3) : "—"}
      </td>
      <td style={{ ...nb, color: pnlColor(r.pnlLatentCcy) }}>
        {fN(r.pnlLatentCcy, 0)}
      </td>
      <td style={{ ...nb, color: pnlColor(r.pnlRealizedCcy) }}>
        {fN(r.pnlRealizedCcy, 0)}
      </td>
      <td style={{ ...nb, color: "var(--cyan)" }}>{fN(r.couponsCcy, 0)}</td>
      <td
        style={{
          ...nb,
          color: pnlColor(
            parseFloat(r.pnlLatentCcy || 0) +
              parseFloat(r.pnlRealizedCcy || 0) +
              parseFloat(r.couponsCcy || 0),
          ),
          fontWeight: 600,
        }}
      >
        {fN(
          parseFloat(r.pnlLatentCcy || 0) +
            parseFloat(r.pnlRealizedCcy || 0) +
            parseFloat(r.couponsCcy || 0),
          0,
        )}
      </td>
      <td style={{ ...nb, color: pnlColor(r.pnlAccountingMad) }}>
        {fMAD(r.pnlAccountingMad)}
      </td>
      <td style={{ ...nb, color: "var(--warn)" }}>{fMAD(r.fundingCostMad)}</td>
      <td style={{ ...nb, color: pnlColor(r.pnlEconomicMad), fontWeight: 700 }}>
        {fMAD(r.pnlEconomicMad)}
      </td>
      <td style={{ ...nb, color: "#60A5FA" }}>{fMAD(r.cpnThetaMad)}</td>
      <td style={{ ...nb, color: "var(--tx2)" }}>{fMAD(r.dailyFundingMad)}</td>
      <td style={{ ...nb, color: pnlColor(r.netDailyMad), fontWeight: 600 }}>
        {fMAD(r.netDailyMad)}
      </td>
      <td style={{ ...nb, color: "#FCD34D" }}>
        {fN(r.gSpreadBid, 1)}
        {r.gSpreadBid != null &&
          r.targetSpread != null &&
          parseFloat(r.targetSpread) > 0 &&
          (() => {
            const gap = parseFloat(r.gSpreadBid) - parseFloat(r.targetSpread);
            return (
              <span
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: "0.54rem",
                  marginLeft: 4,
                  color: gap > 0 ? "var(--profit)" : "var(--loss)",
                  opacity: 0.9,
                }}
              >
                {gap > 0 ? `+${gap.toFixed(0)}` : gap.toFixed(0)}
              </span>
            );
          })()}
      </td>
      <td style={{ ...nb, color: "#FCD34D" }}>{fN(r.gSpreadMid, 1)}</td>
      <td style={{ ...nb }}>
        {r.targetSpread != null ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              justifyContent: "flex-end",
            }}
          >
            <span style={{ color: "var(--tx2)" }}>{fN(r.targetSpread, 1)}</span>
            {r.gSpreadBid != null && (
              <div
                style={{
                  position: "relative",
                  width: 28,
                  height: 4,
                  background: "var(--elev)",
                  borderRadius: 2,
                  overflow: "visible",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: `${Math.min((parseFloat(r.gSpreadBid) / Math.max(parseFloat(r.gSpreadBid), parseFloat(r.targetSpread), 1)) * 100, 100)}%`,
                    background:
                      r.decision === "BUY" ? "var(--profit)" : "var(--cyan)",
                    borderRadius: 2,
                    opacity: 0.75,
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          "—"
        )}
      </td>
      <td style={{ ...nb, color: "#FCD34D" }}>
        {r.yieldToMaturity != null ? fN(r.yieldToMaturity, 3) + "%" : "—"}
      </td>
      <td style={{ ...nb, color: "#FCD34D" }}>{fN(r.assetSwapSpread, 1)}</td>
      <td style={{ ...td, textAlign: "center" }}>
        <Signal row={r} />
      </td>
      <td style={{ ...nb, color: "#C084FC" }}>{fN(r.modifiedDuration, 2)}</td>
      <td style={{ ...nb, color: "#60A5FA" }}>{fN(r.dv01Bond, 0)}</td>
      <td style={{ ...nb, color: "#C084FC" }}>{fN(r.convexity, 4)}</td>
      <td
        style={{
          ...td,
          fontFamily: "var(--f-body)",
          fontSize: "0.67rem",
          color: "var(--tx3)",
        }}
      >
        {r.hedgeFuture || "—"}
      </td>
      <td style={{ ...nb, color: "var(--tx2)" }}>
        {r.nbContractsToHedge || "—"}
      </td>
    </tr>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
const EuroBondView = () => {
  const { dashboardRows, loading, refresh, selectedDate, globalDashboard } =
    useTrading();
  const [search, setSearch] = useState("");
  const [filterSub, setFilterSub] = useState("ALL");
  const [filterCcy, setFilterCcy] = useState("ALL");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = useCallback((key) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("desc");
      return key;
    });
  }, []);

  const currencies = useMemo(
    () => [...new Set(dashboardRows.map((r) => r.currency).filter(Boolean))],
    [dashboardRows],
  );
  const subAssets = useMemo(
    () => [...new Set(dashboardRows.map((r) => r.subAsset).filter(Boolean))],
    [dashboardRows],
  );

  const filtered = useMemo(
    () =>
      dashboardRows.filter((r) => {
        const q = search.toLowerCase();
        return (
          (!q ||
            r.isin?.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q)) &&
          (filterCcy === "ALL" || r.currency === filterCcy) &&
          (filterSub === "ALL" || r.subAsset === filterSub)
        );
      }),
    [dashboardRows, search, filterCcy, filterSub],
  );

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const na = parseFloat(a[sortKey]),
        nb = parseFloat(b[sortKey]);
      if (!isNaN(na) && !isNaN(nb))
        return sortDir === "asc" ? na - nb : nb - na;
      return sortDir === "asc"
        ? String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""))
        : String(b[sortKey] ?? "").localeCompare(String(a[sortKey] ?? ""));
    });
  }, [filtered, sortKey, sortDir]);

  const totals = useMemo(
    () =>
      sorted.reduce(
        (acc, r) => ({
          nominal: acc.nominal + parseFloat(r.netNominal || 0),
          pnlEco: acc.pnlEco + parseFloat(r.pnlEconomicMad || 0),
          pnlAcct: acc.pnlAcct + parseFloat(r.pnlAccountingMad || 0),
          netDaily: acc.netDaily + parseFloat(r.netDailyMad || 0),
          dv01: acc.dv01 + parseFloat(r.dv01Bond || 0),
        }),
        { nominal: 0, pnlEco: 0, pnlAcct: 0, netDaily: 0, dv01: 0 },
      ),
    [sorted],
  );

  const fCompact = (v) => {
    if (!v) return "—";
    const n = parseFloat(v);
    if (isNaN(n)) return "—";
    const a = Math.abs(n),
      s = n >= 0 ? "+" : "−";
    if (a >= 1e6) return `${s}${(Math.abs(n) / 1e6).toFixed(2)}M`;
    return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  };

  const exportCsv = () => {
    const BOM = "﻿"; // UTF-8 BOM — required for Excel to handle accented chars correctly
    const TEXT_KEYS = new Set([
      "isin",
      "description",
      "subAsset",
      "maturityDate",
      "currency",
      "decision",
      "hedgeFuture",
    ]);
    const esc = (v) => {
      const s = String(v ?? "");
      return s.includes(";") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const headers = COLS.map((c) => esc(c.label)).join(";");
    const csvRows = sorted
      .map((r) =>
        COLS.map((c) => {
          const v = r[c.key];
          if (v == null || v === "") return "";
          if (!TEXT_KEYS.has(c.key)) {
            const n = parseFloat(v);
            if (!isNaN(n)) return String(n);
          }
          return esc(String(v));
        }).join(";"),
      )
      .join("\n");
    const blob = new Blob([`${BOM}${headers}\n${csvRows}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eurobonds_${selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--void)" }}>
      {/* ── Header ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--void)",
          borderBottom: "1px solid var(--b1)",
        }}
      >
        {/* Title row */}
        <div
          style={{
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 13,
                background: "var(--eb)",
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 className="view-title">Market Watch — EuroBonds</h2>
                <span className="tag tag-blue">
                  {sorted.length} / {dashboardRows.length} ISIN
                </span>
              </div>
              <p className="view-sub">
                {COLS.length} colonnes Bloomberg · {selectedDate}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={exportCsv} className="btn btn-ghost btn-sm">
              <Download size={10} />
              Export CSV
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="btn btn-ghost btn-sm"
            >
              <RefreshCw
                size={10}
                style={{
                  animation: loading ? "spin 1s linear infinite" : "none",
                }}
              />
              Actualiser
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div
          style={{
            padding: "6px 16px 8px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderTop: "1px solid var(--b0)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Search
              size={11}
              style={{
                position: "absolute",
                left: 9,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--tx3)",
                pointerEvents: "none",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ISIN ou description…"
              style={{
                background: "var(--surf)",
                border: "1px solid var(--b1)",
                borderRadius: 4,
                padding: "4px 9px 4px 26px",
                color: "var(--tx1)",
                fontFamily: "var(--f-body)",
                fontSize: "0.70rem",
                outline: "none",
                width: 200,
              }}
            />
          </div>

          <span className="sep-v" style={{ height: 18 }} />

          {["ALL", ...subAssets].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSub(s)}
              style={{
                padding: "2px 7px",
                borderRadius: 3,
                cursor: "pointer",
                fontFamily: "var(--f-disp)",
                fontSize: "0.57rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: filterSub === s ? "var(--eb)" : "transparent",
                color: filterSub === s ? "#fff" : "var(--tx3)",
                border: `1px solid ${filterSub === s ? "var(--eb)" : "var(--b1)"}`,
                transition: "all 0.12s",
              }}
            >
              {s === "ALL" ? "Tous" : s}
            </button>
          ))}

          {currencies.length > 1 && (
            <select
              value={filterCcy}
              onChange={(e) => setFilterCcy(e.target.value)}
              className="select"
              style={{ height: 24, borderRadius: 3 }}
            >
              <option value="ALL">Toutes CCY</option>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Intelligence Strip ── */}
      {sorted.length > 0 &&
        (() => {
          const buySignals = sorted.filter((r) => r.decision === "BUY");
          const totalCarry = sorted.reduce(
            (s, r) => s + parseFloat(r.netDailyMad || 0),
            0,
          );
          const ytmVals = sorted
            .map((r) => parseFloat(r.yieldToMaturity))
            .filter((n) => !isNaN(n) && n > 0);
          const avgYtm =
            ytmVals.length > 0
              ? ytmVals.reduce((s, v) => s + v, 0) / ytmVals.length
              : null;
          const bestOpp = sorted
            .filter(
              (r) =>
                r.gSpreadBid != null &&
                r.targetSpread != null &&
                parseFloat(r.targetSpread) > 0,
            )
            .map((r) => ({
              ...r,
              gap: parseFloat(r.gSpreadBid) - parseFloat(r.targetSpread),
            }))
            .sort((a, b) => b.gap - a.gap)[0];

          const Sep2 = () => (
            <span
              style={{
                width: 1,
                height: 22,
                background: "var(--b1)",
                flexShrink: 0,
              }}
            />
          );

          return (
            <div
              style={{
                padding: "6px 16px",
                background: "var(--surf)",
                borderBottom: "1px solid var(--b1)",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                overflowX: "auto",
              }}
            >
              {/* BUY signals */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  flexShrink: 0,
                }}
              >
                <span className="lbl">Opportunités</span>
                {buySignals.length > 0 ? (
                  <span className="badge badge-active">
                    ▲ {buySignals.length} BUY
                  </span>
                ) : (
                  <span className="badge badge-closed">— 0 BUY</span>
                )}
              </div>

              <Sep2 />

              {/* Best G-spread opportunity */}
              {bestOpp && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <span className="lbl">Meilleur écart</span>
                  <span
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.67rem",
                      fontWeight: 700,
                      color: bestOpp.gap > 0 ? "var(--profit)" : "var(--loss)",
                    }}
                  >
                    {bestOpp.gap > 0 ? "+" : ""}
                    {bestOpp.gap.toFixed(1)} bp
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--f-body)",
                      fontSize: "0.65rem",
                      color: "var(--tx3)",
                      maxWidth: 130,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={bestOpp.description}
                  >
                    {(bestOpp.description || bestOpp.isin)
                      .split(" ")
                      .slice(0, 3)
                      .join(" ")}
                  </span>
                </div>
              )}

              <Sep2 />

              {/* Total carry/day for filtered set */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <span className="lbl">Carry/j filtré</span>
                <span
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    color: totalCarry >= 0 ? "var(--profit)" : "var(--loss)",
                  }}
                >
                  {fCompact(totalCarry)} MAD
                </span>
              </div>

              <Sep2 />

              {/* Average YTM */}
              {avgYtm != null && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <span className="lbl">YTM moy.</span>
                  <span
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "#FCD34D",
                    }}
                  >
                    {avgYtm.toFixed(3)}%
                  </span>
                </div>
              )}

              {avgYtm != null && <Sep2 />}

              {/* DV01 for filtered set */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <span className="lbl">DV01 filtré</span>
                <span
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: "0.68rem",
                    color: "#60A5FA",
                  }}
                >
                  {fCompact(totals.dv01)} $/bp
                </span>
              </div>

              <Sep2 />

              {/* Total nominal filtered */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <span className="lbl">Nominal filtré</span>
                <span
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: "0.68rem",
                    color: "var(--tx1)",
                    fontWeight: 500,
                  }}
                >
                  {(totals.nominal / 1e6).toFixed(1)} M
                </span>
              </div>
            </div>
          );
        })()}

      {/* ── Table ── */}
      <div style={{ overflowX: "auto", padding: "0" }}>
        <table className="dtable">
          {/* Group headers */}
          <thead>
            <tr style={{ background: "var(--grphdr-bg)" }}>
              {GROUPS.map((g, i) => (
                <th
                  key={i}
                  colSpan={g.span}
                  style={{
                    padding: "5px 10px",
                    textAlign: "center",
                    borderBottom: "none",
                    borderRight:
                      i < GROUPS.length - 1 ? "1px solid var(--b1)" : "none",
                    fontFamily: "var(--f-disp)",
                    fontSize: "0.55rem",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: g.color,
                    background: "var(--grphdr-bg)",
                    cursor: "default",
                  }}
                >
                  {g.label}
                </th>
              ))}
            </tr>
            {/* Column headers */}
            <tr>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => !col.noSort && handleSort(col.key)}
                  style={{
                    textAlign: col.right ? "right" : "left",
                    cursor: col.noSort ? "default" : "pointer",
                    color: sortKey === col.key ? "var(--cyan)" : "var(--tx3)",
                    ...(col.star
                      ? {
                          color:
                            sortKey === col.key ? "var(--profit)" : "#3E7A5E",
                        }
                      : {}),
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: col.right ? "flex-end" : "flex-start",
                      gap: 2,
                    }}
                  >
                    {col.label}
                    {!col.noSort && (
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sorted.map((r, idx) => (
              <Row key={r.isin} r={r} idx={idx} />
            ))}
          </tbody>

          {sorted.length > 0 && (
            <tfoot>
              <tr>
                <td
                  colSpan={2}
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
                      color: "var(--cyan)",
                    }}
                  >
                    ({sorted.length})
                  </span>
                </td>
                <td colSpan={4} />
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--f-mono)",
                    color: "var(--tx1)",
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
                <td colSpan={10} />
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--f-mono)",
                    color: pnlColor(totals.pnlAcct),
                    fontWeight: 600,
                  }}
                >
                  {fCompact(totals.pnlAcct)}
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
                  {fCompact(totals.pnlEco)}
                </td>
                <td colSpan={2} />
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--f-mono)",
                    color: pnlColor(totals.netDaily),
                    fontWeight: 600,
                  }}
                >
                  {fCompact(totals.netDaily)}
                </td>
                <td colSpan={7} />
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--f-mono)",
                    color: "#60A5FA",
                  }}
                >
                  {totals.dv01.toLocaleString("fr-FR", {
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── G-Spread Relative Value Matrix ── */}
      {(() => {
        const eligible = sorted.filter(
          (r) =>
            r.gSpreadMid != null &&
            r.targetSpread != null &&
            parseFloat(r.targetSpread) > 0,
        );
        if (eligible.length < 2) return null;

        // Cheapness score = gSpreadMid − targetSpread (positive = cheap, buy candidate)
        const scored = eligible
          .map((r) => ({
            isin: r.isin,
            desc: (r.description || r.isin).split(" ").slice(0, 3).join(" "),
            mid: parseFloat(r.gSpreadMid),
            target: parseFloat(r.targetSpread),
            score: parseFloat(r.gSpreadMid) - parseFloat(r.targetSpread),
          }))
          .sort((a, b) => b.score - a.score); // cheapest first

        const maxAbs = scored.reduce(
          (m, r) => Math.max(m, Math.abs(r.score)),
          1,
        );
        const cellBg = (v) => {
          const t = Math.min(Math.abs(v) / maxAbs, 1);
          return v > 0
            ? `rgba(0,232,153,${(0.06 + t * 0.22).toFixed(2)})`
            : `rgba(255,43,96,${(0.06 + t * 0.22).toFixed(2)})`;
        };
        const cellCol = (v) => (v > 0 ? "var(--profit)" : "var(--loss)");

        return (
          <div style={{ padding: "0 16px 16px" }}>
            <div
              className="card"
              style={{ padding: "14px 16px", overflow: "hidden" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <p className="sect-ttl" style={{ margin: 0 }}>
                  Matrice G-Spread — Relative Value
                </p>
                <span
                  style={{
                    fontFamily: "var(--f-body)",
                    fontSize: "0.60rem",
                    color: "var(--tx3)",
                  }}
                >
                  Score = G-Spread − Target (bp) · vert = cheap · rouge = riche
                </span>
              </div>

              {/* Cheapness ranking table */}
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    minWidth: scored.length * 80 + 180,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "4px 8px",
                          fontFamily: "var(--f-disp)",
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          color: "var(--tx3)",
                          textTransform: "uppercase",
                          borderBottom: "1px solid var(--b1)",
                          minWidth: 160,
                        }}
                      >
                        ISIN
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 8px",
                          fontFamily: "var(--f-disp)",
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          color: "var(--tx3)",
                          textTransform: "uppercase",
                          borderBottom: "1px solid var(--b1)",
                        }}
                      >
                        G-Spd Mid
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 8px",
                          fontFamily: "var(--f-disp)",
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          color: "var(--tx3)",
                          textTransform: "uppercase",
                          borderBottom: "1px solid var(--b1)",
                        }}
                      >
                        Target
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 8px",
                          fontFamily: "var(--f-disp)",
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          color: "var(--tx3)",
                          textTransform: "uppercase",
                          borderBottom: "1px solid var(--b1)",
                          minWidth: 200,
                        }}
                      >
                        Cheapness Score (bp)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scored.map((r, i) => (
                      <tr
                        key={r.isin}
                        style={{
                          background:
                            i % 2 === 0 ? "var(--tr-even-bg)" : "transparent",
                        }}
                      >
                        <td
                          style={{
                            padding: "5px 8px",
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.66rem",
                            color: "var(--cyan)",
                            fontWeight: 500,
                          }}
                        >
                          <span>{r.isin}</span>
                          <span
                            style={{
                              fontFamily: "var(--f-body)",
                              fontSize: "0.58rem",
                              color: "var(--tx3)",
                              marginLeft: 6,
                            }}
                          >
                            {r.desc}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "5px 8px",
                            textAlign: "right",
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.66rem",
                            color: "#FCD34D",
                          }}
                        >
                          {r.mid.toFixed(1)}
                        </td>
                        <td
                          style={{
                            padding: "5px 8px",
                            textAlign: "right",
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.66rem",
                            color: "var(--tx2)",
                          }}
                        >
                          {r.target.toFixed(1)}
                        </td>
                        <td style={{ padding: "5px 8px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                height: 8,
                                background: "var(--b1)",
                                borderRadius: 4,
                                overflow: "hidden",
                                position: "relative",
                              }}
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  height: "100%",
                                  width: `${Math.min((Math.abs(r.score) / maxAbs) * 100, 100)}%`,
                                  background: cellCol(r.score),
                                  borderRadius: 4,
                                  opacity: 0.7,
                                  ...(r.score >= 0
                                    ? { left: 0 }
                                    : { right: 0 }),
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontFamily: "var(--f-mono)",
                                fontWeight: 700,
                                fontSize: "0.70rem",
                                color: cellCol(r.score),
                                minWidth: 52,
                                textAlign: "right",
                                flexShrink: 0,
                              }}
                            >
                              {r.score >= 0 ? "+" : ""}
                              {r.score.toFixed(1)} bp
                            </span>
                            {r.score > 0 && (
                              <span
                                style={{
                                  fontFamily: "var(--f-disp)",
                                  fontSize: "0.52rem",
                                  fontWeight: 700,
                                  color: "var(--profit)",
                                  background: "rgba(0,232,153,0.12)",
                                  border: "1px solid rgba(0,232,153,0.25)",
                                  borderRadius: 3,
                                  padding: "1px 5px",
                                  flexShrink: 0,
                                }}
                              >
                                CHEAP
                              </span>
                            )}
                            {r.score < -5 && (
                              <span
                                style={{
                                  fontFamily: "var(--f-disp)",
                                  fontSize: "0.52rem",
                                  fontWeight: 700,
                                  color: "var(--loss)",
                                  background: "rgba(255,43,96,0.12)",
                                  border: "1px solid rgba(255,43,96,0.25)",
                                  borderRadius: 3,
                                  padding: "1px 5px",
                                  flexShrink: 0,
                                }}
                              >
                                RICH
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Spread Analysis Panel ── */}
      {sorted.length > 0 &&
        (() => {
          const bonds = sorted.filter(
            (r) =>
              r.gSpreadMid != null ||
              r.iSpreadBid != null ||
              r.yieldToMaturity != null,
          );
          if (!bonds.length) return null;

          const today = new Date();

          const rows = bonds.map((r) => {
            const gMid = parseFloat(r.gSpreadMid || 0);
            const iBid = parseFloat(r.iSpreadBid || 0);
            const gBid = parseFloat(r.gSpreadBid || 0);
            const asw = parseFloat(r.assetSwapSpread || 0);
            const ytm = parseFloat(r.yieldToMaturity || 0);
            const dur = parseFloat(r.modifiedDuration || 0);
            const cpn = parseFloat(r.couponRate || 0);
            const nominal = parseFloat(r.netNominal || 0) * 1e6;

            // Roll-down: approx carry by moving 1 year down the curve (simplified)
            const rollYield = dur > 1 ? gMid * 0.02 + cpn * 0.005 : 0; // synthetic estimate

            // Days to next coupon (semi-annual assumed)
            const matDate = r.maturityDate ? new Date(r.maturityDate) : null;
            const daysToMat = matDate
              ? Math.max(0, Math.round((matDate - today) / 86400000))
              : null;
            const yearsToMat = daysToMat ? daysToMat / 365 : null;

            // Gap G vs I spread (difference reflects T-note vs UST basis)
            const spreadGap = iBid > 0 ? (gMid - iBid).toFixed(1) : null;

            return {
              ...r,
              gMid,
              iBid,
              gBid,
              asw,
              ytm,
              dur,
              cpn,
              nominal,
              rollYield,
              daysToMat,
              yearsToMat,
              spreadGap,
            };
          });

          const TH2 = {
            padding: "7px 10px",
            fontFamily: "var(--f-disp)",
            fontWeight: 700,
            fontSize: "0.52rem",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "var(--tx3)",
            borderBottom: "1px solid var(--b1)",
            whiteSpace: "nowrap",
          };
          const TD2 = {
            padding: "7px 10px",
            fontFamily: "var(--f-mono)",
            fontSize: "0.66rem",
            borderBottom: "1px solid var(--b0)",
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
            textAlign: "right",
          };

          return (
            <div style={{ padding: "0 16px 16px" }}>
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
                    Analyse Spread — I-Spread / G-Spread / Roll · {bonds.length}{" "}
                    ISINs
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--f-disp)",
                      fontSize: "0.52rem",
                      fontWeight: 700,
                      color: "rgba(232,154,32,0.70)",
                      letterSpacing: "0.06em",
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: "rgba(232,154,32,0.08)",
                      border: "1px solid rgba(232,154,32,0.20)",
                    }}
                  >
                    % Outstanding en attente Bloomberg
                  </span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--thead-bg)" }}>
                        <th style={{ ...TH2, textAlign: "left" }}>ISIN</th>
                        <th style={{ ...TH2, textAlign: "left" }}>
                          Description
                        </th>
                        <th style={TH2}>CCY</th>
                        <th style={TH2}>
                          G-Spread
                          <br />
                          <span style={{ fontWeight: 400, opacity: 0.6 }}>
                            Mid (bp)
                          </span>
                        </th>
                        <th style={TH2}>
                          I-Spread
                          <br />
                          <span style={{ fontWeight: 400, opacity: 0.6 }}>
                            Bid (bp)
                          </span>
                        </th>
                        <th style={TH2}>
                          ASW
                          <br />
                          <span style={{ fontWeight: 400, opacity: 0.6 }}>
                            (bp)
                          </span>
                        </th>
                        <th style={TH2}>
                          G−I
                          <br />
                          <span style={{ fontWeight: 400, opacity: 0.6 }}>
                            basis
                          </span>
                        </th>
                        <th style={TH2}>YTM %</th>
                        <th style={TH2}>
                          Dur.
                          <br />
                          <span style={{ fontWeight: 400, opacity: 0.6 }}>
                            mod (ans)
                          </span>
                        </th>
                        <th style={TH2}>J−Éch.</th>
                        <th style={TH2}>
                          Roll-down
                          <br />
                          <span style={{ fontWeight: 400, opacity: 0.6 }}>
                            estim. (bp)
                          </span>
                        </th>
                        <th style={TH2}>
                          % Encours
                          <br />
                          <span style={{ fontWeight: 400, opacity: 0.6 }}>
                            Outstanding
                          </span>
                        </th>
                        <th style={TH2}>Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const rowBg =
                          i % 2 === 0 ? "var(--tr-even-bg)" : "transparent";
                        const giBasis =
                          r.spreadGap !== null ? parseFloat(r.spreadGap) : null;
                        const giBasisCol =
                          giBasis === null
                            ? "var(--tx3)"
                            : Math.abs(giBasis) > 20
                              ? "var(--warn)"
                              : "var(--tx2)";
                        const cheapScore = r.targetSpread
                          ? (r.gBid - parseFloat(r.targetSpread)).toFixed(1)
                          : null;
                        const isCheap =
                          cheapScore !== null && parseFloat(cheapScore) > 5;
                        const isRich =
                          cheapScore !== null && parseFloat(cheapScore) < -5;
                        return (
                          <tr
                            key={r.isin + i}
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
                                ...TD2,
                                textAlign: "left",
                                color: "var(--cyan)",
                                fontWeight: 500,
                              }}
                            >
                              {r.isin}
                            </td>
                            <td
                              style={{
                                ...TD2,
                                textAlign: "left",
                                color: "var(--tx1)",
                                maxWidth: 130,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={r.description}
                            >
                              {(r.description || "")
                                .split(" ")
                                .slice(0, 4)
                                .join(" ") || "—"}
                            </td>
                            <td
                              style={{
                                ...TD2,
                                textAlign: "center",
                                color: "var(--tx3)",
                                fontFamily: "var(--f-disp)",
                                fontWeight: 700,
                                fontSize: "0.60rem",
                              }}
                            >
                              {r.currency || "—"}
                            </td>
                            <td
                              style={{
                                ...TD2,
                                color: "#FCD34D",
                                fontWeight: 600,
                              }}
                            >
                              {r.gMid > 0 ? r.gMid.toFixed(1) : "—"}
                            </td>
                            <td
                              style={{
                                ...TD2,
                                color: r.iBid > 0 ? "#C084FC" : "var(--tx3)",
                              }}
                            >
                              {r.iBid > 0 ? r.iBid.toFixed(1) : "—"}
                            </td>
                            <td
                              style={{
                                ...TD2,
                                color: r.asw !== 0 ? "#60A5FA" : "var(--tx3)",
                              }}
                            >
                              {r.asw !== 0 ? r.asw.toFixed(1) : "—"}
                            </td>
                            <td style={{ ...TD2, color: giBasisCol }}>
                              {giBasis !== null
                                ? giBasis >= 0
                                  ? `+${giBasis.toFixed(1)}`
                                  : giBasis.toFixed(1)
                                : "—"}
                            </td>
                            <td style={{ ...TD2, color: "#FCD34D" }}>
                              {r.ytm > 0 ? `${r.ytm.toFixed(3)}%` : "—"}
                            </td>
                            <td style={{ ...TD2, color: "#C084FC" }}>
                              {r.dur > 0 ? r.dur.toFixed(2) : "—"}
                            </td>
                            <td style={{ ...TD2, color: "var(--tx2)" }}>
                              {r.daysToMat !== null ? (
                                <span>
                                  {r.daysToMat}
                                  <span
                                    style={{
                                      color: "var(--tx3)",
                                      fontSize: "0.56rem",
                                      marginLeft: 3,
                                    }}
                                  >
                                    j
                                  </span>
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td style={{ ...TD2, color: "var(--profit)" }}>
                              {r.rollYield > 0
                                ? `+${r.rollYield.toFixed(1)}`
                                : "—"}
                            </td>
                            <td style={{ ...TD2, color: "var(--tx3)" }}>
                              <span
                                style={{
                                  fontFamily: "var(--f-disp)",
                                  fontSize: "0.52rem",
                                  color: "rgba(232,154,32,0.55)",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Bloomberg
                              </span>
                            </td>
                            <td style={{ ...TD2, textAlign: "center" }}>
                              {isCheap && (
                                <span
                                  style={{
                                    fontFamily: "var(--f-disp)",
                                    fontSize: "0.52rem",
                                    fontWeight: 700,
                                    color: "var(--profit)",
                                    background: "rgba(0,232,153,0.10)",
                                    border: "1px solid rgba(0,232,153,0.25)",
                                    borderRadius: 3,
                                    padding: "2px 5px",
                                  }}
                                >
                                  CHEAP
                                </span>
                              )}
                              {isRich && (
                                <span
                                  style={{
                                    fontFamily: "var(--f-disp)",
                                    fontSize: "0.52rem",
                                    fontWeight: 700,
                                    color: "var(--loss)",
                                    background: "rgba(255,43,96,0.10)",
                                    border: "1px solid rgba(255,43,96,0.25)",
                                    borderRadius: 3,
                                    padding: "2px 5px",
                                  }}
                                >
                                  RICH
                                </span>
                              )}
                              {!isCheap && !isRich && (
                                <span
                                  style={{
                                    color: "var(--tx3)",
                                    fontSize: "0.60rem",
                                  }}
                                >
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div
                  style={{
                    padding: "7px 14px",
                    borderTop: "1px solid var(--b0)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--f-body)",
                      fontSize: "0.57rem",
                      color: "var(--tx3)",
                    }}
                  >
                    G-Spread = spread vs UST courbe · I-Spread = spread vs swap
                    · ASW = asset swap spread · G−I basis : delta entre les deux
                    benchmarks · Roll-down = gain estimé en duration / maturité
                    · % Outstanding en attente flux Bloomberg BDP
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

      {sorted.length === 0 && !loading && (
        <div
          style={{ textAlign: "center", padding: "48px", color: "var(--tx3)" }}
        >
          <AlertTriangle
            size={28}
            style={{ margin: "0 auto 10px", opacity: 0.3 }}
          />
          <p style={{ fontFamily: "var(--f-body)", fontSize: "0.78rem" }}>
            Aucune donnée pour le {selectedDate}
          </p>
        </div>
      )}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <div
            style={{
              width: 28,
              height: 28,
              border: "2px solid var(--b1)",
              borderTopColor: "var(--cyan)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default EuroBondView;
