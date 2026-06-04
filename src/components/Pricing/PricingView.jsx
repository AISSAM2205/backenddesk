import React, { useState, useMemo, useCallback } from "react";
import { Button, Card, Tabs, Input, Tag, Tooltip, Select, message } from "antd";
import { useTrading } from "../../contexts/TradingContext";
import api from "../../services/api";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  BarChart2,
  Activity,
  Layers,
  Target,
} from "lucide-react";

/* ─── Formatters ─────────────────────────────────────────── */
const fN = (v, d = 1) =>
  v == null || isNaN(parseFloat(v)) ? "—" : parseFloat(v).toFixed(d);
const fBp = (v, d = 1) => {
  if (v == null || isNaN(parseFloat(v))) return "—";
  const n = parseFloat(v);
  return `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;
};
const fPx = (v) =>
  v == null || isNaN(parseFloat(v)) ? "—" : (parseFloat(v) * 100).toFixed(3);
const fPct = (v, d = 2) =>
  v == null || isNaN(parseFloat(v)) ? "—" : `${parseFloat(v).toFixed(d)}%`;

/* ─── Signal chip ─────────────────────────────────────────── */
const SIGNAL_CFG = {
  BUY:  { bg: "rgba(0,232,153,0.12)",  bd: "rgba(0,232,153,0.30)",  col: "var(--profit)", lbl: "BUY",  icon: TrendingUp },
  SELL: { bg: "rgba(255,43,96,0.10)",  bd: "rgba(255,43,96,0.28)",  col: "var(--loss)",   lbl: "SELL", icon: TrendingDown },
  HOLD: { bg: "rgba(100,116,139,0.10)",bd: "rgba(100,116,139,0.25)",col: "var(--tx3)",   lbl: "HOLD", icon: Minus },
  CHEAP:{ bg: "rgba(0,202,255,0.10)",  bd: "rgba(0,202,255,0.28)",  col: "var(--cyan)",  lbl: "CHEAP",icon: TrendingUp },
  RICH: { bg: "rgba(251,146,60,0.10)", bd: "rgba(251,146,60,0.28)", col: "var(--warn)",  lbl: "RICH", icon: TrendingDown },
};
const SignalChip = ({ signal }) => {
  const cfg = SIGNAL_CFG[signal] || { bg:"rgba(100,116,139,0.08)", bd:"rgba(100,116,139,0.18)", col:"var(--tx3)", lbl:"—", icon: Minus };
  const Icon = cfg.icon;
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 7px", borderRadius:4, background:cfg.bg, border:`1px solid ${cfg.bd}` }}>
      <Icon size={9} style={{ color: cfg.col }} />
      <span style={{ fontFamily:"var(--f-disp)", fontSize:"0.55rem", fontWeight:800, letterSpacing:"0.08em", color:cfg.col }}>{cfg.lbl}</span>
    </div>
  );
};

/* ─── Decision Select ─────────────────────────────────────── */
const DECISION_OPTIONS = [
  { value: "BUY",  label: <span style={{ color:"var(--profit)", fontFamily:"var(--f-disp)", fontWeight:800, fontSize:"0.62rem" }}>▲ BUY</span> },
  { value: "HOLD", label: <span style={{ color:"var(--tx3)",   fontFamily:"var(--f-disp)", fontWeight:700, fontSize:"0.62rem" }}>— HOLD</span> },
  { value: "SELL", label: <span style={{ color:"var(--loss)",  fontFamily:"var(--f-disp)", fontWeight:800, fontSize:"0.62rem" }}>▼ SELL</span> },
];

/* ─── Spread bar ──────────────────────────────────────────────
   Normalise min/max indépendamment de la convention bid/ask.
   Pour les spreads en bp : bid > ask (ex: gBid=141, gAsk=131).
   Pour les prix : bid < ask.
   Dans les deux cas, lo est affiché à gauche, hi à droite.
────────────────────────────────────────────────────────────── */
const SpreadBar = ({ bid, ask, mid, target, color }) => {
  const bv = parseFloat(bid);
  const av = parseFloat(ask);
  if (isNaN(bv) && isNaN(av))
    return <span style={{ color:"var(--tx3)", fontSize:"0.62rem" }}>—</span>;

  const lo  = isNaN(bv) || isNaN(av) ? (isNaN(bv) ? av : bv) : Math.min(bv, av);
  const hi  = isNaN(bv) || isNaN(av) ? lo + 10                : Math.max(bv, av);
  const mv  = !isNaN(parseFloat(mid)) ? parseFloat(mid) : (lo + hi) / 2;
  const tv  = target != null && !isNaN(parseFloat(target)) ? parseFloat(target) : null;
  const range = hi - lo || 1;

  const midPct = Math.max(0, Math.min(100, ((mv - lo) / range) * 100));
  const tgtPct = tv != null ? Math.max(0, Math.min(100, ((tv - lo) / range) * 100)) : null;

  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontFamily:"var(--f-mono)", fontSize:"0.58rem", color:"var(--tx3)" }}>{fBp(lo)}</span>
        <span style={{ fontFamily:"var(--f-mono)", fontSize:"0.62rem", fontWeight:700, color }}>{fBp(mv)}</span>
        <span style={{ fontFamily:"var(--f-mono)", fontSize:"0.58rem", color:"var(--tx3)" }}>{fBp(hi)}</span>
      </div>
      <div style={{ position:"relative", height:4, borderRadius:2, background:"var(--elev)", overflow:"visible" }}>
        <div style={{ position:"absolute", left:0, top:0, height:"100%", width:"100%", borderRadius:2, background:`linear-gradient(90deg, var(--elev) 0%, ${color}55 50%, var(--elev) 100%)` }} />
        {/* Mid tick */}
        <div style={{ position:"absolute", top:-2, left:`${midPct.toFixed(0)}%`, transform:"translateX(-50%)", width:2, height:8, borderRadius:1, background:color }} />
        {/* Target tick */}
        {tgtPct != null && (
          <div style={{ position:"absolute", top:-3, left:`${tgtPct.toFixed(0)}%`, transform:"translateX(-50%)", width:0, height:0, borderLeft:"4px solid transparent", borderRight:"4px solid transparent", borderTop:"5px solid var(--warn)" }} />
        )}
      </div>
      {tgtPct != null && (
        <div style={{ textAlign:"center", marginTop:2 }}>
          <span style={{ fontFamily:"var(--f-mono)", fontSize:"0.54rem", color:"var(--warn)" }}>▲ {fBp(tv)} bp</span>
        </div>
      )}
    </div>
  );
};

/* ─── Cheapness center-origin bar ─────────────────────────── */
const CheapBar = ({ value, maxAbs = 40 }) => {
  if (value == null || isNaN(parseFloat(value))) return <span style={{ color:"var(--tx3)" }}>—</span>;
  const v = parseFloat(value);
  const pct = Math.min(Math.abs(v) / maxAbs * 50, 50);
  const pos = v >= 0;
  return (
    <div style={{ position:"relative", width:"100%", height:6, background:"var(--elev)", borderRadius:3 }}>
      {/* center line */}
      <div style={{ position:"absolute", left:"50%", top:0, height:"100%", width:1, background:"var(--b2)", transform:"translateX(-50%)" }} />
      {pos ? (
        <div style={{ position:"absolute", left:"50%", top:0, height:"100%", width:`${pct}%`, background:"var(--profit)", borderRadius:"0 3px 3px 0", opacity:0.75, transition:"width 0.5s ease" }} />
      ) : (
        <div style={{ position:"absolute", right:"50%", top:0, height:"100%", width:`${pct}%`, background:"var(--loss)", borderRadius:"3px 0 0 3px", opacity:0.75, transition:"width 0.5s ease" }} />
      )}
    </div>
  );
};

/* ─── Heatmap color ───────────────────────────────────────── */
const relColor = (v) => {
  const n = parseFloat(v || 0);
  if (n > 20) return { bg:"rgba(0,232,153,0.18)", col:"var(--profit)" };
  if (n >  8) return { bg:"rgba(0,232,153,0.08)", col:"var(--profit)" };
  if (n >  0) return { bg:"rgba(0,232,153,0.04)", col:"var(--profit)" };
  if (n > -8) return { bg:"rgba(255,43,96,0.04)", col:"var(--loss)" };
  return           { bg:"rgba(255,43,96,0.14)",   col:"var(--loss)" };
};

/* ─── Table styles ────────────────────────────────────────── */
const TH = { padding:"7px 10px", fontFamily:"var(--f-disp)", fontWeight:700, fontSize:"0.54rem", letterSpacing:"0.10em", textTransform:"uppercase", color:"var(--tx3)", borderBottom:"1px solid var(--b1)", whiteSpace:"nowrap", textAlign:"right", background:"var(--surf)" };
const THL = { ...TH, textAlign:"left" };
const TD  = (col) => ({ padding:"8px 10px", fontFamily:"var(--f-mono)", fontSize:"0.68rem", borderBottom:"1px solid var(--b0)", whiteSpace:"nowrap", color:col||"var(--tx1)", textAlign:"right", fontVariantNumeric:"tabular-nums" });
const TDL = (col) => ({ ...TD(col), textAlign:"left" });

/* ─── Static (non-sortable) header cell ──────────────────── */
const Th = ({ label, tip, right = true }) => (
  <th style={right ? TH : THL}>
    {tip ? (
      <Tooltip title={<span style={{ fontFamily:"var(--f-body)", fontSize:"0.70rem" }}>{tip}</span>} placement="top">
        <span style={{ cursor:"help", borderBottom:"1px dashed var(--b2)" }}>{label}</span>
      </Tooltip>
    ) : label}
  </th>
);

/* ─── Sortable header cell — receives tabSort state ─────── */
const SortIcon = ({ active, dir }) => (
  <span style={{ marginLeft:3, opacity: active ? 1 : 0.28, fontSize:"0.62rem", fontFamily:"monospace" }}>
    {active ? (dir === "desc" ? "↓" : "↑") : "↕"}
  </span>
);

const STh = ({ label, colKey, tip, tabId, tabSort, onSort, right = true }) => {
  const cur = tabSort[tabId] || {};
  const active = cur.key === colKey;
  return (
    <th
      style={{ ...(right ? TH : THL), cursor:"pointer", color: active ? "var(--cyan)" : "var(--tx3)", userSelect:"none" }}
      onClick={() => onSort(tabId, colKey)}
    >
      {tip ? (
        <Tooltip title={<span style={{ fontFamily:"var(--f-body)", fontSize:"0.70rem" }}>{tip}</span>} placement="top">
          <span style={{ borderBottom:"1px dashed var(--b2)" }}>{label}</span>
        </Tooltip>
      ) : label}
      <SortIcon active={active} dir={cur.dir} />
    </th>
  );
};

/* ─── Main Component ──────────────────────────────────────── */
const PricingView = () => {
  const { dashboardRows, rates, loading, refresh, selectedDate } = useTrading();
  const [tab, setTab]                     = useState("gspread");
  const [filter, setFilter]               = useState("");
  const [editTargets, setEditTargets]     = useState({});
  const [localDecisions, setLocalDecisions]   = useState({});
  const [savingDecision, setSavingDecision]   = useState({});
  const [savingTarget,   setSavingTarget]     = useState({});
  const [tabSort, setTabSort] = useState({
    gspread:  { key: "gMid",      dir: "desc" },
    ispread:  { key: "iBid",      dir: "desc" },
    pricing:  { key: "gMid",      dir: "desc" },
    relative: { key: "cheapness", dir: "desc" },
  });

  const handleSort = useCallback((tabId, key) => {
    setTabSort(prev => {
      const cur = prev[tabId] || { key: "", dir: "desc" };
      return { ...prev, [tabId]: { key, dir: cur.key === key && cur.dir === "desc" ? "asc" : "desc" } };
    });
  }, []);

  const sortRows = useCallback((rows, tabId) => {
    const { key, dir } = tabSort[tabId] || { key: "gMid", dir: "desc" };
    return [...rows].sort((a, b) => {
      const va = parseFloat(a[key]);
      const vb = parseFloat(b[key]);
      if (isNaN(va) && isNaN(vb)) return 0;
      if (isNaN(va)) return 1;
      if (isNaN(vb)) return -1;
      return dir === "desc" ? vb - va : va - vb;
    });
  }, [tabSort]);

  /* ── Decision update → backend PATCH ── */
  const handleDecisionChange = useCallback(async (isin, newDecision, prevDecision) => {
    setLocalDecisions(prev => ({ ...prev, [isin]: newDecision }));
    setSavingDecision(prev => ({ ...prev, [isin]: true }));
    try {
      await api.pricing.updateDecision(isin, newDecision);
      message.success({ content: `${isin.slice(-8)} → ${newDecision}`, duration: 2 });
    } catch {
      message.error("Erreur — décision non sauvegardée");
      setLocalDecisions(prev => ({ ...prev, [isin]: prevDecision }));
    } finally {
      setSavingDecision(prev => ({ ...prev, [isin]: false }));
    }
  }, []);

  /* ── Target spread update on blur → backend PATCH ── */
  const handleTargetBlur = useCallback(async (isin, rawVal, prevVal) => {
    const val = parseFloat(rawVal);
    if (isNaN(val) || val === prevVal) return;
    setSavingTarget(prev => ({ ...prev, [isin]: true }));
    try {
      await api.pricing.updateTargetSpread(isin, val);
      message.success({ content: `Cible ${isin.slice(-8)} → ${val} bp`, duration: 2 });
    } catch {
      message.error("Erreur — cible non sauvegardée");
      setEditTargets(prev => { const n = { ...prev }; delete n[isin]; return n; });
    } finally {
      setSavingTarget(prev => ({ ...prev, [isin]: false }));
    }
  }, []);

  const updateTarget = useCallback((isin, val) => {
    setEditTargets(p => ({ ...p, [isin]: val })); // store raw string while editing
  }, []);

  /* ── Rows enrichment ── */
  const pricingRows = useMemo(() => {
    const n = (v) => (v == null || isNaN(parseFloat(v)) ? null : parseFloat(v));
    return (dashboardRows || [])
      .filter(r => {
        const sub = (r.subAsset || "").toLowerCase();
        return sub.includes("bond") || sub.includes("cln") || sub.includes("bill");
      })
      .filter(r =>
        !filter ||
        r.isin?.includes(filter.toUpperCase()) ||
        (r.description || "").toLowerCase().includes(filter.toLowerCase())
      )
      .map(r => {
        const gBid = n(r.gSpreadBid);
        const gMid = n(r.gSpreadMid);
        const gAsk = n(r.gSpreadAsk);
        const iBid = n(r.iSpreadBid);
        const iMid = n(r.iSpreadMid);
        const iAsk = n(r.iSpreadAsk);
        const asw     = n(r.assetSwapSpread);
        const histAvg = n(r.historicalAvgSpread);
        const tgtRaw  = editTargets[r.isin];
        const tgt     = tgtRaw != null ? parseFloat(tgtRaw) : n(r.targetSpread);
        const refSpread = gMid ?? gBid;
        const cheapness = refSpread != null && tgt != null ? refSpread - tgt : null;
        const autoSignal =
          cheapness == null ? "—"
          : cheapness > 15  ? "CHEAP"
          : cheapness < -15 ? "RICH"
          : cheapness > 5   ? "BUY"
          : cheapness < -5  ? "SELL"
          :                   "HOLD";
        const storedDecision = localDecisions[r.isin] ?? r.decision ?? "HOLD";
        return {
          ...r,
          gBid, gAsk, gMid,
          iBid, iAsk, iMid, asw, histAvg,
          targetSpreadCalc: tgt,
          cheapness, signal: autoSignal,
          storedDecision,
          spreadDiff: (gMid != null && iBid != null) ? gMid - iBid : null,
          ytm: n(r.yieldToMaturity),
          priceBid: n(r.pxBid),
          priceMid: n(r.pxMid) ?? n(r.cleanPrice),
          priceAsk: n(r.pxAsk),
          // perfWap is a decimal ratio (e.g. 0.0025) → convert to bps (×10000)
          perfWapBp: r.perfWap != null ? parseFloat(r.perfWap) * 10000 : null,
          rollTime: r.maturityDate
            ? ((new Date(r.maturityDate) - new Date()) / (1000*60*60*24*365)).toFixed(2)
            : null,
        };
      })
  }, [dashboardRows, filter, editTargets, localDecisions]);

  /* ── Summary KPIs ── */
  const kpis = useMemo(() => {
    const gVals = pricingRows.map(r => r.gMid).filter(v => v != null);
    const iVals = pricingRows.map(r => r.iBid).filter(v => v != null);
    const cheap = pricingRows.filter(r => r.signal === "CHEAP" || r.signal === "BUY").length;
    const rich  = pricingRows.filter(r => r.signal === "RICH"  || r.signal === "SELL").length;
    return [
      { label: "G-Spread Moyen",  value: gVals.length > 0 ? fBp(gVals.reduce((s,v)=>s+v,0)/gVals.length) + " bp" : "—", color:"var(--eb)" },
      { label: "I-Spread Moyen",  value: iVals.length > 0 ? fBp(iVals.reduce((s,v)=>s+v,0)/iVals.length) + " bp" : "—", color:"var(--cyan)" },
      { label: "Signaux CHEAP/BUY", value: cheap, color:"var(--profit)" },
      { label: "Signaux RICH/SELL", value: rich,  color:"var(--loss)" },
    ];
  }, [pricingRows]);

  /* ── Tab content ── */
  const tabItems = [
    {
      key: "gspread",
      label: (
        <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontFamily:"var(--f-disp)", fontWeight:700, fontSize:"0.60rem", letterSpacing:"0.07em", textTransform:"uppercase" }}>
          <BarChart2 size={11} />G-Spread Matrix
        </span>
      ),
      children: pricingRows.length === 0 ? null : (() => {
        const rows = sortRows(pricingRows, "gspread");
        return (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <Th label="Titre"   right={false} />
                  <Th label="ISIN"    right={false} />
                  <STh label="Coupon"     colKey="couponRate"   tabId="gspread" tabSort={tabSort} onSort={handleSort} tip="Taux de coupon annuel" />
                  <STh label="Maturité"   colKey="rollTime"     tabId="gspread" tabSort={tabSort} onSort={handleSort} tip="Durée résiduelle en années" />
                  <STh label="YTM"        colKey="ytm"          tabId="gspread" tabSort={tabSort} onSort={handleSort} tip="Yield to Maturity" />
                  <STh label="Convexité"  colKey="convexity"    tabId="gspread" tabSort={tabSort} onSort={handleSort} tip="Convexité du bond — gain de convexité pour les mouvements de taux larges" />
                  <Th  label="G-Spread"   tip="Spread vs courbe gouvernementale — visuel Lo/Mid/Hi + cible" />
                  <STh label="Mid (bp)"   colKey="gMid"         tabId="gspread" tabSort={tabSort} onSort={handleSort} />
                  <STh label="Hist. Avg"  colKey="histAvg"      tabId="gspread" tabSort={tabSort} onSort={handleSort} tip="Moyenne historique du G-Spread — référence" />
                  <STh label="Cible (bp)" colKey="targetSpreadCalc" tabId="gspread" tabSort={tabSort} onSort={handleSort} tip="Cible trader — auto-sauvegarde on blur" />
                  <STh label="Écart"      colKey="cheapness"    tabId="gspread" tabSort={tabSort} onSort={handleSort} tip="Cheapness = G-Spread Mid − Cible. Vert = cheap" />
                  <Th  label="Signal"     tip="Signal auto calculé depuis cheapness" />
                  <Th  label="Décision"   tip="Décision AWB officielle — sauvegardée en base" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const rc = relColor(r.cheapness);
                  const rowBg = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)";
                  return (
                    <tr key={r.isin} style={{ background: rowBg }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--tr-hover-bg)"}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}
                    >
                      <td style={{ ...TDL("var(--tx1)"), maxWidth:180, overflow:"hidden", textOverflow:"ellipsis" }} title={r.description}>{r.description || "—"}</td>
                      <td style={TDL("var(--cyan)")}>{r.isin}</td>
                      <td style={TD("var(--profit)")}>{fPct(r.couponRate)}</td>
                      <td style={TD("var(--tx3)")}>{r.rollTime ? `${r.rollTime}Y` : "—"}</td>
                      <td style={TD("#FCD34D")}>{r.ytm != null ? fPct(r.ytm, 3) : "—"}</td>
                      <td style={TD("#C084FC")}>{r.convexity != null ? fN(r.convexity, 2) : "—"}</td>
                      <td style={{ ...TD(), paddingTop:6, paddingBottom:6 }}>
                        <SpreadBar bid={r.gBid} ask={r.gAsk} mid={r.gMid} target={r.targetSpreadCalc} color="var(--eb)" />
                      </td>
                      <td style={TD(r.gMid != null ? "var(--tx1)" : "var(--tx3)")}>
                        {r.gMid != null ? `${fBp(r.gMid)} bp` : "—"}
                      </td>
                      <td style={TD("var(--tx3)")}>{r.histAvg != null ? `${fBp(r.histAvg)} bp` : "—"}</td>
                      <td style={{ padding:"6px 10px", textAlign:"right" }}>
                        <Tooltip title={savingTarget[r.isin] ? "Sauvegarde…" : "Tab ou clic ailleurs pour sauvegarder"} placement="top">
                          <input
                            type="number"
                            value={editTargets[r.isin] ?? (r.targetSpreadCalc != null ? Math.round(r.targetSpreadCalc) : "")}
                            onChange={e => updateTarget(r.isin, e.target.value)}
                            onBlur={e => handleTargetBlur(r.isin, e.target.value, r.targetSpreadCalc)}
                            style={{ width:60, textAlign:"right", background: savingTarget[r.isin] ? "rgba(0,202,255,0.08)" : "rgba(255,255,255,0.04)", border:`1px solid ${savingTarget[r.isin] ? "rgba(0,202,255,0.4)" : "var(--b1)"}`, borderRadius:3, padding:"3px 6px", color:"var(--warn)", fontFamily:"var(--f-mono)", fontSize:"0.65rem", outline:"none", transition:"border 0.2s" }}
                          />
                        </Tooltip>
                      </td>
                      <td style={{ ...TD(rc.col), background:rc.bg, fontWeight:700 }}>
                        {r.cheapness != null ? `${r.cheapness >= 0 ? "+" : ""}${fBp(r.cheapness)} bp` : "—"}
                      </td>
                      <td style={{ padding:"6px 10px", textAlign:"right" }}>
                        <SignalChip signal={r.signal} />
                      </td>
                      <td style={{ padding:"4px 10px", textAlign:"right" }}>
                        <Select
                          value={r.storedDecision}
                          size="small"
                          loading={savingDecision[r.isin]}
                          onChange={val => handleDecisionChange(r.isin, val, r.storedDecision)}
                          options={DECISION_OPTIONS}
                          style={{ width:90 }}
                          popupMatchSelectWidth={false}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })(),
    },
    {
      key: "ispread",
      label: (
        <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontFamily:"var(--f-disp)", fontWeight:700, fontSize:"0.60rem", letterSpacing:"0.07em", textTransform:"uppercase" }}>
          <Activity size={11} />I-Spread & Yield
        </span>
      ),
      children: pricingRows.length === 0 ? null : (() => {
        const rows = sortRows(pricingRows, "ispread");
        return (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <Th  label="Titre"       right={false} />
                  <Th  label="ISIN"        right={false} />
                  <STh label="Coupon"      colKey="couponRate"        tabId="ispread" tabSort={tabSort} onSort={handleSort} tip="Taux de coupon annuel" />
                  <STh label="Roll (Y)"    colKey="rollTime"          tabId="ispread" tabSort={tabSort} onSort={handleSort} tip="Durée résiduelle en années" />
                  <STh label="Duration"    colKey="modifiedDuration"  tabId="ispread" tabSort={tabSort} onSort={handleSort} tip="Duration modifiée — sensibilité aux taux" />
                  <Th  label="I-Spread"    tip="Spread vs courbe swap — visuel Lo/Mid/Hi" />
                  <STh label="G-Spd Mid"   colKey="gMid"              tabId="ispread" tabSort={tabSort} onSort={handleSort} tip="G-Spread mid — spread vs courbe gouvernementale" />
                  <STh label="I-Spd Bid"   colKey="iBid"              tabId="ispread" tabSort={tabSort} onSort={handleSort} tip="I-Spread côté bid" />
                  <STh label="ASW"         colKey="asw"               tabId="ispread" tabSort={tabSort} onSort={handleSort} tip="Asset Swap Spread — spread vs SOFR/ESTR swap" />
                  <STh label="YTM %"       colKey="ytm"               tabId="ispread" tabSort={tabSort} onSort={handleSort} tip="Yield to Maturity — rendement actuariel" />
                  <STh label="G/I Delta"   colKey="spreadDiff"        tabId="ispread" tabSort={tabSort} onSort={handleSort} tip="G-Spread − I-Spread. Positif = basis gouvernementale > 0" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const spreadDiff = r.gMid != null && r.iBid != null ? r.gMid - r.iBid : null;
                  const rowBg = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)";
                  return (
                    <tr key={r.isin} style={{ background: rowBg }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--tr-hover-bg)"}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}
                    >
                      <td style={{ ...TDL("var(--tx1)"), maxWidth:180, overflow:"hidden", textOverflow:"ellipsis" }} title={r.description}>{r.description || "—"}</td>
                      <td style={TDL("var(--cyan)")}>{r.isin}</td>
                      <td style={TD("var(--profit)")}>{fPct(r.couponRate)}</td>
                      <td style={TD("var(--tx3)")}>{r.rollTime ? `${r.rollTime}Y` : "—"}</td>
                      <td style={TD("var(--tx2)")}>{fN(r.modifiedDuration, 2)} Y</td>
                      <td style={{ ...TD(), paddingTop:6, paddingBottom:6 }}>
                        <SpreadBar bid={r.iBid} ask={r.iAsk} mid={r.iMid} color="var(--cyan)" />
                      </td>
                      <td style={TD()}>{r.gMid != null ? `${fBp(r.gMid)} bp` : "—"}</td>
                      <td style={TD("var(--cyan)")}>{r.iBid != null ? `${fBp(r.iBid)} bp` : "—"}</td>
                      <td style={TD("#C084FC")}>{r.asw != null ? `${fBp(r.asw)} bp` : "—"}</td>
                      <td style={TD("#FCD34D")}>{fPct(r.ytm, 3)}</td>
                      <td style={TD(spreadDiff == null ? "var(--tx3)" : spreadDiff > 0 ? "var(--profit)" : "var(--loss)")}>
                        {spreadDiff != null ? `${fBp(spreadDiff)} bp` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })(),
    },
    {
      key: "pricing",
      label: (
        <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontFamily:"var(--f-disp)", fontWeight:700, fontSize:"0.60rem", letterSpacing:"0.07em", textTransform:"uppercase" }}>
          <Target size={11} />Pricing AWB
        </span>
      ),
      children: pricingRows.length === 0 ? null : (() => {
        const rows = sortRows(pricingRows, "pricing");
        return (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <Th  label="Titre"      right={false} />
                  <Th  label="ISIN"       right={false} />
                  <STh label="Prix BID"   colKey="priceBid"  tabId="pricing" tabSort={tabSort} onSort={handleSort} tip="Prix bid AWB (×100 = % du pair)" />
                  <STh label="Prix Mid"   colKey="priceMid"  tabId="pricing" tabSort={tabSort} onSort={handleSort} tip="Prix mid Bloomberg" />
                  <STh label="Prix ASK"   colKey="priceAsk"  tabId="pricing" tabSort={tabSort} onSort={handleSort} tip="Prix ask AWB" />
                  <STh label="Accrued"    colKey="accrued"   tabId="pricing" tabSort={tabSort} onSort={handleSort} tip="Intérêts courus Bloomberg (% du pair)" />
                  <STh label="WAP Clean"  colKey="lastWapClean" tabId="pricing" tabSort={tabSort} onSort={handleSort} tip="Prix moyen pondéré clean des trades BUY ouverts" />
                  <STh label="Perf WAP"   colKey="perfWapBp" tabId="pricing" tabSort={tabSort} onSort={handleSort} tip="Dirty marché − WAP dirty en bp (perfWap × 10 000). Positif = gain latent" />
                  <STh label="G-Spd BID"  colKey="gBid"      tabId="pricing" tabSort={tabSort} onSort={handleSort} />
                  <STh label="G-Spd MID"  colKey="gMid"      tabId="pricing" tabSort={tabSort} onSort={handleSort} />
                  <STh label="G-Spd ASK"  colKey="gAsk"      tabId="pricing" tabSort={tabSort} onSort={handleSort} />
                  <Th  label="Décision" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const rowBg = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)";
                  return (
                    <tr key={r.isin} style={{ background: rowBg }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--tr-hover-bg)"}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}
                    >
                      <td style={{ ...TDL("var(--tx1)"), maxWidth:180, overflow:"hidden", textOverflow:"ellipsis" }} title={r.description}>{r.description || "—"}</td>
                      <td style={TDL("var(--cyan)")}>{r.isin}</td>
                      <td style={TD("var(--loss)")}>{fPx(r.priceBid)}</td>
                      <td style={{ ...TD("var(--tx1)"), fontWeight:700 }}>{fPx(r.priceMid)}</td>
                      <td style={TD("var(--profit)")}>{fPx(r.priceAsk)}</td>
                      <td style={TD("var(--tx3)")}>{fPx(r.accrued)}</td>
                      <td style={TD()}>{fPx(r.lastWapClean)}</td>
                      <td style={TD(r.perfWapBp != null && r.perfWapBp >= 0 ? "var(--profit)" : "var(--loss)")}>
                        {r.perfWapBp != null ? `${fBp(r.perfWapBp)} bp` : "—"}
                      </td>
                      <td style={TD("var(--tx2)")}>{r.gBid != null ? `${fBp(r.gBid)} bp` : "—"}</td>
                      <td style={{ ...TD(), fontWeight:700 }}>{r.gMid != null ? `${fBp(r.gMid)} bp` : "—"}</td>
                      <td style={TD("var(--tx2)")}>{r.gAsk != null ? `${fBp(r.gAsk)} bp` : "—"}</td>
                      <td style={{ padding:"4px 10px", textAlign:"right" }}>
                        <SignalChip signal={r.storedDecision || r.signal} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })(),
    },
    {
      key: "relative",
      label: (
        <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontFamily:"var(--f-disp)", fontWeight:700, fontSize:"0.60rem", letterSpacing:"0.07em", textTransform:"uppercase" }}>
          <Layers size={11} />Relative Value
        </span>
      ),
      children: pricingRows.length === 0 ? null : (() => {
        const rows = sortRows(pricingRows, "relative");
        const maxAbs = Math.max(...rows.map(r => Math.abs(r.cheapness ?? 0)), 1);
        return (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...THL, width:32 }}>#</th>
                  <Th  label="Titre"       right={false} />
                  <STh label="G-Spread"    colKey="gMid"              tabId="relative" tabSort={tabSort} onSort={handleSort} tip="G-Spread Mid actuel" />
                  <STh label="Cible"       colKey="targetSpreadCalc"  tabId="relative" tabSort={tabSort} onSort={handleSort} tip="Cible trader" />
                  <STh label="Cheapness"   colKey="cheapness"         tabId="relative" tabSort={tabSort} onSort={handleSort} tip="G-Spread − Cible. >0 = cheap, <0 = rich" />
                  <Th  label="Score"       tip="Barre centrée : vert à droite = cheap, rouge à gauche = rich" />
                  <STh label="Duration"    colKey="modifiedDuration"  tabId="relative" tabSort={tabSort} onSort={handleSort} tip="Duration modifiée" />
                  <STh label="Convexité"   colKey="convexity"         tabId="relative" tabSort={tabSort} onSort={handleSort} tip="Convexité du bond" />
                  <STh label="YTM"         colKey="ytm"               tabId="relative" tabSort={tabSort} onSort={handleSort} />
                  <STh label="Nominal M"   colKey="netNominal"        tabId="relative" tabSort={tabSort} onSort={handleSort} tip="Position nette en millions USD/EUR" />
                  <Th  label="Signal" />
                  <Th  label="Décision AWB" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const rc = relColor(r.cheapness);
                  const rowBg = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)";
                  return (
                    <tr key={r.isin} style={{ background: rowBg }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--tr-hover-bg)"}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}
                    >
                      <td style={{ ...TDL("var(--tx3)"), fontWeight:700 }}>{i + 1}</td>
                      <td style={{ ...TDL("var(--tx1)"), maxWidth:180, overflow:"hidden", textOverflow:"ellipsis" }} title={r.description}>{r.description || r.isin}</td>
                      <td style={TD()}>{r.gMid != null ? `${fBp(r.gMid)} bp` : "—"}</td>
                      <td style={TD("var(--warn)")}>{r.targetSpreadCalc != null ? `${fBp(r.targetSpreadCalc)} bp` : "—"}</td>
                      <td style={{ ...TD(rc.col), fontWeight:700, background:rc.bg }}>
                        {r.cheapness != null ? `${r.cheapness >= 0 ? "+" : ""}${fBp(r.cheapness)} bp` : "—"}
                      </td>
                      <td style={{ padding:"8px 10px", minWidth:150 }}>
                        <CheapBar value={r.cheapness} maxAbs={maxAbs} />
                      </td>
                      <td style={TD()}>{fN(r.modifiedDuration, 2)} Y</td>
                      <td style={TD("#C084FC")}>{r.convexity != null ? fN(r.convexity, 2) : "—"}</td>
                      <td style={TD("#FCD34D")}>{r.ytm != null ? fPct(r.ytm, 3) : "—"}</td>
                      <td style={TD()}>{fN(r.netNominal, 1)} M</td>
                      <td style={{ padding:"6px 10px", textAlign:"right" }}>
                        <SignalChip signal={r.signal} />
                      </td>
                      <td style={{ padding:"4px 10px", textAlign:"right" }}>
                        <Select
                          value={r.storedDecision}
                          size="small"
                          loading={savingDecision[r.isin]}
                          onChange={val => handleDecisionChange(r.isin, val, r.storedDecision)}
                          options={DECISION_OPTIONS}
                          style={{ width:90 }}
                          popupMatchSelectWidth={false}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })(),
    },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* ── Header ── */}
      <div className="view-hdr">
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ display:"inline-block", width:2, height:13, background:"var(--eb)", borderRadius:1 }} />
          <div>
            <h2 className="view-title">Pricing Screen</h2>
            <p className="view-sub" style={{ paddingLeft:9 }}>
              G-Spread · I-Spread · ASW · Relative Value · Décisions AWB — {selectedDate}
            </p>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <Input.Search
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="ISIN / Titre…"
            allowClear
            size="small"
            style={{ width:200 }}
          />
          <span className="tag">{pricingRows.length} lignes</span>
          <Button size="small" loading={loading} onClick={refresh} icon={<RefreshCw size={10} />}>
            Actualiser
          </Button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 20px" }}>
        {/* ── KPI summary ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
          {kpis.map(k => (
            <Card key={k.label} size="small" style={{ borderTop:`2px solid ${k.color}` }} styles={{ body:{ padding:"9px 13px" } }}>
              <div style={{ fontFamily:"var(--f-disp)", fontWeight:700, fontSize:"0.51rem", letterSpacing:"0.10em", textTransform:"uppercase", color:"var(--tx3)", marginBottom:5 }}>
                {k.label}
              </div>
              <div style={{ fontFamily:"var(--f-mono)", fontWeight:700, fontSize:"1.0rem", color:k.color, lineHeight:1 }}>
                {k.value}
              </div>
            </Card>
          ))}
        </div>

        {/* ── Empty state ── */}
        {pricingRows.length === 0 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:200, gap:10 }}>
            <AlertTriangle size={24} style={{ color:"var(--tx3)", opacity:0.4 }} />
            <span style={{ fontFamily:"var(--f-body)", fontSize:"0.75rem", color:"var(--tx3)" }}>
              Aucune position obligataire disponible
            </span>
          </div>
        )}

        {/* ── Tabs ── */}
        {pricingRows.length > 0 && (
          <Tabs
            activeKey={tab}
            onChange={setTab}
            size="small"
            items={tabItems}
            tabBarStyle={{ marginBottom: 12 }}
          />
        )}
      </div>
    </div>
  );
};

export default PricingView;
