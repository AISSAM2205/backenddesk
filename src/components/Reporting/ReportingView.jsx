import React, { useMemo, useState, useCallback } from "react";
import { Button, Card, Tabs, Progress, Tag, Alert, Statistic, Tooltip, Badge, Divider } from "antd";
import * as XLSX from "xlsx";
import { useTrading } from "../../contexts/TradingContext";
import { useAuth } from "../../contexts/AuthContext";
import { useGovernance } from "../../contexts/GovernanceContext";

import {
  FileBarChart,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Download,
  Activity,
  Shield,
  BarChart2,
  AlertTriangle,
  Printer,
  Sliders,
  Sun,
  Clock,
  CheckCircle,
} from "lucide-react";

/* ─── Waterfall / P&L Bridge Chart ──────────────────────────────── */
const WaterfallChart = ({ carry, latent, realized, funding, net }) => {
  const W = 580, H = 190, pL = 60, pR = 16, pT = 20, pB = 40;
  const cW = W - pL - pR, cH = H - pT - pB;

  // funding here is a COST (positive = reduces P&L)
  const segs = [
    { label: "Carry / Theta", value: carry,    bot: 0,                          top: carry,                                   color: carry >= 0 ? "#22C55E" : "#EF4444" },
    { label: "Latent MTM",    value: latent,   bot: carry,                      top: carry + latent,                           color: latent >= 0 ? "#22C55E" : "#EF4444" },
    { label: "Réalisé",       value: realized, bot: carry + latent,             top: carry + latent + realized,                color: realized >= 0 ? "#22C55E" : "#EF4444" },
    { label: "Financement",   value: -funding, bot: carry + latent + realized,  top: carry + latent + realized - funding,      color: "#F59E0B" },
    { label: "NET ÉCO.",      value: net,      bot: 0,                          top: net,                                      color: net >= 0 ? "#22C55E" : "#EF4444", isTotal: true },
  ];

  const allVals = segs.flatMap(s => [s.bot, s.top, 0]);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const span = (maxV - minV) || 1;
  const lo = minV - span * 0.12;
  const hi = maxV + span * 0.12;
  const range = hi - lo;

  const toY = v => pT + ((hi - v) / range) * cH;
  const zeroY = toY(0);
  const barSlot = cW / segs.length;
  const barW = barSlot * 0.54;
  const gap = (barSlot - barW) / 2;

  const yticks = [-0.5, 0, 0.5, 1].map(f => lo + f * range).filter(v => v >= lo && v <= hi);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
      {yticks.map((v, i) => (
        <g key={i}>
          <line x1={pL} x2={W - pR} y1={toY(v)} y2={toY(v)} stroke="var(--chart-grid)" strokeWidth={0.8} strokeDasharray="3,5" />
          <text x={pL - 5} y={toY(v) + 3.5} textAnchor="end" fill="var(--tx3)" fontSize={8} fontFamily="JetBrains Mono,monospace">
            {v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v <= -1e6 ? `${(v/1e6).toFixed(1)}M` : "0"}
          </text>
        </g>
      ))}
      <line x1={pL} x2={W - pR} y1={zeroY} y2={zeroY} stroke="var(--chart-axis)" strokeWidth={1.2} />
      <line x1={pL} x2={pL} y1={pT} y2={H - pB} stroke="var(--chart-axis)" strokeWidth={1} />

      {segs.map((s, i) => {
        const x = pL + i * barSlot + gap;
        const yTop = toY(Math.max(s.bot, s.top));
        const yBot = toY(Math.min(s.bot, s.top));
        const bh = Math.max(Math.abs(yBot - yTop), 2);
        const nextSeg = segs[i + 1];
        const connectorY = toY(s.top);
        return (
          <g key={s.label}>
            {s.isTotal && (
              <line x1={x - gap * 1.5} x2={x - gap * 1.5} y1={pT} y2={H - pB}
                stroke="var(--b2)" strokeWidth={1} strokeDasharray="2,5" />
            )}
            {!s.isTotal && nextSeg && (
              <line x1={x + barW} x2={pL + (i + 1) * barSlot + gap} y1={connectorY} y2={connectorY}
                stroke="var(--tx3)" strokeWidth={0.8} strokeDasharray="3,3" opacity={0.5} />
            )}
            <rect x={x} y={yTop} width={barW} height={bh} fill={s.color} opacity={s.isTotal ? 0.92 : 0.78} rx={2}
              style={{ transition: "height 0.7s ease, y 0.7s ease" }} />
            <text x={x + barW / 2} y={yTop - 5} textAnchor="middle" fill={s.color}
              fontSize={8.5} fontFamily="JetBrains Mono,monospace" fontWeight={700}>
              {s.value >= 0 ? "+" : ""}{(s.value / 1e6).toFixed(1)}M
            </text>
            <text x={x + barW / 2} y={H - pB + 14} textAnchor="middle" fill={s.isTotal ? "var(--tx1)" : "var(--tx3)"}
              fontSize={s.isTotal ? 8 : 7.5} fontFamily="Syne,sans-serif" fontWeight={s.isTotal ? 700 : 400} letterSpacing={0.3}>
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ─── Cumulative P&L vs Target trajectory ───────────────────────── */
const CumulativePnlChart = ({ history, target }) => {
  const [hover, setHover] = useState(null);
  const svgRef = React.useRef();

  const W = 800, H = 190, pL = 68, pR = 24, pT = 20, pB = 34;
  const cW = W - pL - pR, cH = H - pT - pB;

  const sorted = useMemo(() =>
    [...(history || [])].sort((a, b) => (a.snapshotDate || "").localeCompare(b.snapshotDate || "")),
  [history]);

  const points = useMemo(() => {
    if (sorted.length < 2) return [];
    const year = sorted[0]?.snapshotDate?.substring(0, 4) || new Date().getFullYear().toString();
    const yearStart = new Date(`${year}-01-01`).getTime();
    const yearEnd   = new Date(`${year}-12-31`).getTime();
    const yearSpan  = yearEnd - yearStart || 1;
    return sorted.map(d => ({
      x: pL + ((new Date(d.snapshotDate).getTime() - yearStart) / yearSpan) * cW,
      val: parseFloat(d.pnlEcoMad || 0),
      date: d.snapshotDate,
    })).map(p => ({ ...p, rawX: p.x }));
  }, [sorted, cW]);

  const allVals = useMemo(() => {
    const vals = points.map(p => p.val);
    return [...vals, 0, target];
  }, [points, target]);

  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const span = (maxV - minV) || 1;
  const lo = minV - span * 0.08;
  const hi = maxV + span * 0.12;
  const range = hi - lo;

  const toY = v => pT + ((hi - v) / range) * cH;

  const ptsWithY = points.map(p => ({ ...p, y: toY(p.val) }));
  const lastPt = ptsWithY[ptsWithY.length - 1];
  const firstPt = ptsWithY[0];
  const isAhead = lastPt && points.length > 0
    ? lastPt.val > target * ((lastPt.rawX - pL) / cW)
    : false;

  const linePath = ptsWithY.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const year = sorted[0]?.snapshotDate?.substring(0, 4) || new Date().getFullYear().toString();
  const targetEndX = pL + cW;
  const targetPath = `M${pL},${toY(0)} L${targetEndX},${toY(target)}`;

  const areaPath = linePath + ` L${lastPt?.x || pL},${toY(0)} L${pL},${toY(0)} Z`;

  const handleMove = useCallback(e => {
    if (!svgRef.current || !ptsWithY.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    let ci = 0, minD = Infinity;
    ptsWithY.forEach((p, i) => { const d = Math.abs(p.x - mx); if (d < minD) { minD = d; ci = i; } });
    setHover(ptsWithY[ci]);
  }, [ptsWithY]);

  if (sorted.length < 2) return (
    <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--tx3)", fontSize: "0.72rem" }}>
      Historique insuffisant pour le graphique cumulatif
    </div>
  );

  const yticks = [0, 0.25, 0.5, 0.75, 1].map(f => lo + f * range);
  const qtrs = [{ l: "Jan", f: 0 }, { l: "Avr", f: 0.25 }, { l: "Jul", f: 0.5 }, { l: "Oct", f: 0.75 }, { l: "Déc", f: 1 }];
  const actColor = isAhead ? "#22C55E" : "#60A5FA";

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, cursor: "crosshair", display: "block" }}
      onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="cumAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={actColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={actColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yticks.map((v, i) => (
        <g key={i}>
          <line x1={pL} x2={W - pR} y1={toY(v)} y2={toY(v)} stroke="var(--chart-grid)" strokeWidth={0.8} strokeDasharray="3,5" />
          <text x={pL - 6} y={toY(v) + 3.5} textAnchor="end" fill="var(--tx3)" fontSize={8.5} fontFamily="JetBrains Mono,monospace">
            {v >= 1e9 ? `${(v/1e9).toFixed(1)}Md` : v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v <= -1e6 ? `${(v/1e6).toFixed(0)}M` : "0"}
          </text>
        </g>
      ))}
      <line x1={pL} x2={pL} y1={pT} y2={H - pB} stroke="var(--chart-axis)" strokeWidth={1} />
      <line x1={pL} x2={W - pR} y1={H - pB} y2={H - pB} stroke="var(--chart-axis)" strokeWidth={1} />
      {qtrs.map(q => (
        <text key={q.l} x={pL + q.f * cW} y={H - pB + 14} textAnchor="middle" fill="var(--tx3)" fontSize={8} fontFamily="JetBrains Mono,monospace">{q.l}</text>
      ))}
      <path d={targetPath} fill="none" stroke="var(--warn)" strokeWidth={1.5} strokeDasharray="7,4" opacity={0.7} />
      <text x={targetEndX - 4} y={toY(target) - 7} textAnchor="end" fill="var(--warn)" fontSize={8} fontFamily="JetBrains Mono,monospace">
        Objectif {(target / 1e6).toFixed(0)}M MAD
      </text>
      {ptsWithY.length > 1 && <path d={areaPath} fill="url(#cumAreaGrad)" />}
      {ptsWithY.length > 1 && <path d={linePath} fill="none" stroke={actColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
      {lastPt && (
        <>
          <circle cx={lastPt.x} cy={lastPt.y} r={4} fill={actColor} stroke="var(--void)" strokeWidth={2} />
          <text x={Math.min(lastPt.x + 10, W - pR - 60)} y={lastPt.y + 4} fill={actColor} fontSize={9.5} fontFamily="JetBrains Mono,monospace" fontWeight={700}>
            {(lastPt.val / 1e6).toFixed(1)}M
          </text>
        </>
      )}
      {hover && (
        <>
          <line x1={hover.x} x2={hover.x} y1={pT} y2={H - pB} stroke="var(--tx2)" strokeWidth={1} strokeDasharray="3,3" strokeOpacity={0.5} />
          <circle cx={hover.x} cy={hover.y} r={4} fill={actColor} stroke="var(--void)" strokeWidth={2} />
          <g transform={`translate(${Math.min(hover.x + 10, W - 144)},${Math.max(hover.y - 38, pT)})`}>
            <rect width={134} height={34} rx={5} fill="rgba(5,18,34,0.95)" stroke={`${actColor}55`} strokeWidth={1} />
            <text x={9} y={13} fill="rgba(156,163,175,0.9)" fontSize={7.5} fontFamily="JetBrains Mono,monospace">{hover.date}</text>
            <text x={9} y={26} fill={actColor} fontSize={10} fontFamily="JetBrains Mono,monospace" fontWeight={700}>
              {hover.val >= 0 ? "+" : ""}{(hover.val / 1e6).toFixed(2)}M MAD
            </text>
          </g>
        </>
      )}
    </svg>
  );
};

/* ─── Drawdown Chart ─────────────────────────────────────────────── */
const DrawdownChart = ({ history }) => {
  const W = 800, H = 100, pL = 68, pR = 24, pT = 12, pB = 24;
  const cW = W - pL - pR, cH = H - pT - pB;

  const data = useMemo(() => {
    const sorted = [...(history || [])].sort((a, b) => (a.snapshotDate || "").localeCompare(b.snapshotDate || ""));
    if (sorted.length < 2) return [];
    const year = sorted[0]?.snapshotDate?.substring(0, 4) || new Date().getFullYear().toString();
    const yearStart = new Date(`${year}-01-01`).getTime();
    const yearSpan = new Date(`${year}-12-31`).getTime() - yearStart || 1;
    let peak = -Infinity;
    return sorted.map(d => {
      const v = parseFloat(d.pnlEcoMad || 0);
      if (v > peak) peak = v;
      const dd = peak > 0 ? v - peak : 0;
      const x = pL + ((new Date(d.snapshotDate).getTime() - yearStart) / yearSpan) * cW;
      return { x, dd, date: d.snapshotDate };
    });
  }, [history, cW]);

  if (data.length < 2) return null;
  const minDD = Math.min(...data.map(d => d.dd), 0);
  if (minDD === 0) return null;
  const toY = v => pT + (v / minDD) * cH;
  const aPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${d.x.toFixed(1)},${toY(d.dd).toFixed(1)}`).join(" ");
  const aArea = aPath + ` L${data[data.length-1].x.toFixed(1)},${pT} L${pL},${pT} Z`;

  return (
    <div>
      <div style={{ fontFamily: "var(--f-disp)", fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--loss)", marginBottom: 6, opacity: 0.8 }}>
        Drawdown (P&L vs Peak)
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <line x1={pL} x2={W - pR} y1={pT} y2={pT} stroke="var(--chart-axis)" strokeWidth={0.8} />
        <text x={pL - 5} y={pT + 3.5} textAnchor="end" fill="var(--tx3)" fontSize={7.5} fontFamily="JetBrains Mono,monospace">0</text>
        <text x={pL - 5} y={H - pB + 3.5} textAnchor="end" fill="var(--loss)" fontSize={7.5} fontFamily="JetBrains Mono,monospace">
          {(minDD / 1e6).toFixed(1)}M
        </text>
        <path d={aArea} fill="url(#ddGrad)" />
        <path d={aPath} fill="none" stroke="#EF4444" strokeWidth={1.4} strokeLinejoin="round" />
        <line x1={pL} x2={pL} y1={pT} y2={H - pB} stroke="var(--chart-axis)" strokeWidth={1} />
      </svg>
    </div>
  );
};

const PRINT_STYLES = `
  .awb-tabs-nav-only .ant-tabs-content-holder,
  .awb-tabs-nav-only .ant-tabs-tabpane { display: none !important; height: 0 !important; padding: 0 !important; }
  .awb-tabs-nav-only .ant-tabs-nav { margin-bottom: 0 !important; }
  .awb-tabs-nav-only .ant-tabs-tab { font-family: var(--f-disp) !important; font-weight: 700 !important; font-size: 0.60rem !important; letter-spacing: 0.07em !important; text-transform: uppercase !important; }
  @media print {
    @page { size: A4; margin: 14mm 12mm 12mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body * { visibility: hidden; }
    #awb-report-print, #awb-report-print * { visibility: visible; }
    #awb-report-print {
      position: absolute; left: 0; top: 0; width: 100%;
      height: auto !important; overflow: visible !important;
      background: #010B18 !important;
    }
    .awb-no-print   { display: none    !important; visibility: hidden  !important; }
    .awb-print-only { display: block   !important; visibility: visible !important; }
    .awb-report-section { display: block !important; visibility: visible !important; }
    .awb-page-break { page-break-before: always; }
    table { page-break-inside: auto; width: 100%; }
    tr    { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    .awb-section-label {
      display: block !important; visibility: visible !important;
      font-family: 'IBM Plex Mono', monospace; font-size: 7pt; font-weight: 700;
      letter-spacing: 0.14em; text-transform: uppercase; color: #4A6A84 !important;
      padding: 16px 0 6px; border-top: 1px solid #1A3A5C; margin-bottom: 10px;
    }
  }
`;

const MONTHS_FR = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

const fM = (v) => {
  if (v == null || isNaN(parseFloat(v))) return "—";
  const n = parseFloat(v),
    a = Math.abs(n),
    s = n >= 0 ? "+" : "−";
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)} Md`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)} M`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(1)} k`;
  return `${s}${a.toFixed(0)}`;
};
const fPct = (v, d = 1) =>
  v == null || isNaN(v) ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(d)} %`;
const fMAD = (v) => fM(v) + " MAD";
const fDate = (s) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

const statusOf = (realPct, progPct) => {
  if (!progPct) return { lbl: "—", col: "var(--tx3)" };
  const r = realPct / progPct;
  if (r >= 1.0) return { lbl: "EN AVANCE", col: "var(--profit)" };
  if (r >= 0.8) return { lbl: "ON TRACK", col: "var(--profit)" };
  if (r >= 0.5) return { lbl: "ATTENTION", col: "var(--warn)" };
  return { lbl: "EN RETARD", col: "var(--loss)" };
};

const yearProgress = () => {
  const now = new Date(),
    s = new Date(now.getFullYear(), 0, 1),
    e = new Date(now.getFullYear(), 11, 31);
  return Math.min((now - s) / (e - s), 1);
};

const KpiCard = ({ label, value, sub, color, Icon, alert }) => (
  <Card
    size="small"
    style={{ position: "relative", overflow: "hidden", borderTop: `2px solid ${color}` }}
    styles={{ body: { padding: "10px 13px" } }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <Tooltip title={sub} placement="top">
        <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.53rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--tx3)", cursor: "default", borderBottom: sub ? "1px dashed var(--b2)" : "none" }}>
          {label}
        </span>
      </Tooltip>
      <div style={{ width: 20, height: 20, borderRadius: 3, background: `${color}18`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {alert ? <AlertTriangle size={10} style={{ color }} /> : <Icon size={10} style={{ color }} />}
      </div>
    </div>
    <div style={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: "1.05rem", color, lineHeight: 1, letterSpacing: "-0.02em" }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontFamily: "var(--f-body)", fontSize: "0.58rem", color: "var(--tx3)", marginTop: 5, lineHeight: 1.3 }}>
        {sub}
      </div>
    )}
  </Card>
);

const MonthlyChart = ({ history }) => {
  const monthly = useMemo(() => {
    const map = {};
    (history || []).forEach((d) => {
      // Accepte 0 comme valeur valide — seul undefined/null réel est écarté
      if (!d.snapshotDate || d.pnlJourMad == null) return;
      const v = parseFloat(d.pnlJourMad);
      if (isNaN(v)) return;
      const m = String(d.snapshotDate).substring(0, 7);
      if (!map[m]) map[m] = 0;
      map[m] += v;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({
        label: MONTHS_FR[parseInt(k.split("-")[1]) - 1] ?? k,
        value: v,
      }));
  }, [history]);

  if (!monthly.length)
    return (
      <div
        style={{
          height: 160,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <BarChart2 size={22} style={{ color: "var(--tx3)", opacity: 0.4 }} />
        <span
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.70rem",
            color: "var(--tx3)",
          }}
        >
          Données historiques non disponibles
        </span>
      </div>
    );

  const W = 640,
    H = 160,
    pL = 52,
    pR = 12,
    pT = 14,
    pB = 30;
  const cW = W - pL - pR,
    cH = H - pT - pB;
  const gW = cW / monthly.length;
  const bW = Math.max(Math.floor(gW * 0.65), 4);
  const maxAbs = Math.max(...monthly.map((m) => Math.abs(m.value)), 1);
  const zeroY = pT + cH / 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: H, display: "block" }}
    >
      <line
        x1={pL}
        x2={W - pR}
        y1={zeroY}
        y2={zeroY}
        stroke="var(--chart-axis)"
        strokeWidth="1"
      />
      {[-1, -0.5, 0, 0.5, 1].map((t) => {
        const y = pT + cH * (0.5 - t * 0.5);
        const v = t * maxAbs;
        return (
          <g key={t}>
            <line
              x1={pL - 3}
              x2={pL}
              y1={y}
              y2={y}
              stroke="var(--chart-axis)"
              strokeWidth="1"
            />
            <text
              x={pL - 5}
              y={y + 3.5}
              textAnchor="end"
              fill="var(--tx3)"
              fontSize="8"
              fontFamily="IBM Plex Mono,monospace"
            >
              {v >= 1e6
                ? `${(v / 1e6).toFixed(1)}M`
                : v >= 1e3
                  ? `${(v / 1e3).toFixed(0)}k`
                  : v.toFixed(0)}
            </text>
          </g>
        );
      })}
      {monthly.map((m, i) => {
        const cx = pL + gW * i + gW / 2;
        const pos = m.value >= 0;
        const bH = Math.max((Math.abs(m.value) / maxAbs) * (cH / 2), 2);
        const by = pos ? zeroY - bH : zeroY;
        return (
          <g key={i}>
            <rect
              x={cx - bW / 2}
              y={by}
              width={bW}
              height={bH}
              fill={pos ? "var(--profit)" : "var(--loss)"}
              opacity="0.80"
              rx="2"
              style={{ transition: "height 0.5s ease,y 0.5s ease" }}
            />
            {bH > 14 && (
              <text
                x={cx}
                y={pos ? by - 3 : by + bH + 10}
                textAnchor="middle"
                fill={pos ? "var(--profit)" : "var(--loss)"}
                fontSize="7.5"
                fontFamily="IBM Plex Mono,monospace"
                fontWeight="700"
              >
                {pos ? "+" : ""}{m.value >= 1e6 ? `${(m.value/1e6).toFixed(1)}M` : m.value <= -1e6 ? `${(m.value/1e6).toFixed(1)}M` : `${(m.value/1e3).toFixed(0)}k`}
              </text>
            )}
            <text
              x={cx}
              y={H - pB + 12}
              textAnchor="middle"
              fill="var(--tx3)"
              fontSize="8.5"
              fontFamily="IBM Plex Mono,monospace"
            >
              {m.label}
            </text>
          </g>
        );
      })}
      <line
        x1={pL}
        x2={pL}
        y1={pT}
        y2={pT + cH}
        stroke="var(--chart-axis)"
        strokeWidth="1"
      />
    </svg>
  );
};

const AttributionBar = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.min((Math.abs(value) / total) * 100, 100) : 0;
  const pos = value >= 0;
  const col = pos ? color : "var(--loss)";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontFamily: "var(--f-body)", fontSize: "0.65rem", color: "var(--tx2)" }}>{label}</span>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.68rem", fontWeight: 700, color: col }}>{fMAD(value)}</span>
      </div>
      <Progress
        percent={parseFloat(pct.toFixed(1))}
        strokeColor={col}
        trailColor="var(--elev)"
        showInfo={false}
        size={["100%", 5]}
        style={{ margin: 0 }}
      />
    </div>
  );
};

const LimitGauge = ({ label, limit, used, currency, color }) => {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const over = pct > 90, warn = pct > 75;
  const gCol = over ? "#ff4d4f" : warn ? "#faad14" : color;
  return (
    <Card
      size="small"
      style={{ border: over ? "1px solid rgba(255,77,79,0.35)" : undefined }}
      styles={{ body: { padding: "12px 14px" } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.64rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--tx1)", lineHeight: 1.3 }}>
          {label}
        </span>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          {over  && <Tag color="error"   style={{ margin: 0, fontFamily: "var(--f-disp)", fontWeight: 800, fontSize: "0.50rem", letterSpacing: "0.09em" }}>LIMITE</Tag>}
          {!over && warn && <Tag color="warning" style={{ margin: 0, fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.50rem", letterSpacing: "0.09em" }}>ATTENTION</Tag>}
          {!over && !warn && <Tag color="success" style={{ margin: 0, fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.50rem", letterSpacing: "0.09em" }}>OK</Tag>}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: "1.10rem", fontWeight: 700, color: gCol, letterSpacing: "-0.02em" }}>
          {(used / 1e6).toFixed(1)} M
        </span>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.62rem", color: "var(--tx3)" }}>
          / {(limit / 1e6).toFixed(0)} M {currency}
        </span>
      </div>

      <Progress
        percent={parseFloat(Math.min(pct, 100).toFixed(1))}
        strokeColor={gCol}
        trailColor="var(--elev)"
        showInfo={false}
        size={["100%", 6]}
        style={{ margin: "8px 0 6px" }}
      />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.60rem", color: gCol, fontWeight: 600 }}>{pct.toFixed(1)}% utilisé</span>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.60rem", color: "var(--tx3)" }}>{((limit - used) / 1e6).toFixed(1)} M disponible</span>
      </div>
    </Card>
  );
};

/* ─── Market Context Panel ───────────────────────────────────────── */
const MKT_RATES = [
  {
    label: "SOFR",
    key: "sofr",
    fallback: 4.3,
    fmt: (v) => `${v.toFixed(2)}%`,
    col: "#60A5FA",
    dir: "neutral",
  },
  {
    label: "ESTR",
    key: "estr",
    fallback: 2.17,
    fmt: (v) => `${v.toFixed(2)}%`,
    col: "#60A5FA",
    dir: "neutral",
  },
  {
    label: "SOFR 10Y",
    key: "sofr10Year",
    fallback: 3.9,
    fmt: (v) => `${v.toFixed(2)}%`,
    col: "#C084FC",
    dir: "neutral",
  },
  {
    label: "USD/MAD",
    key: "usdMad",
    fallback: 9.251,
    fmt: (v) => v.toFixed(3),
    col: "#FCD34D",
    dir: "neutral",
  },
  {
    label: "EUR/MAD",
    key: "eurMad",
    fallback: 10.418,
    fmt: (v) => v.toFixed(3),
    col: "#FCD34D",
    dir: "neutral",
  },
  {
    label: "EUR/USD",
    key: "eurUsd",
    fallback: 1.126,
    fmt: (v) => v.toFixed(3),
    col: "#34D399",
    dir: "neutral",
  },
];

const MarketContextPanel = ({ rates }) => {
  const isLive = !!rates;
  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      styles={{ body: { padding: "12px 16px" } }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.63rem", letterSpacing: "0.10em", textTransform: "uppercase" }}>
            Contexte de Marché
          </span>
          <Tag
            color={isLive ? "success" : "default"}
            style={{ margin: 0, fontFamily: "var(--f-disp)", fontWeight: 800, fontSize: "0.50rem", letterSpacing: "0.09em" }}
          >
            {isLive ? "LIVE" : "REF."}
          </Tag>
        </div>
      }
      extra={
        <span style={{ fontFamily: "var(--f-body)", fontSize: "0.58rem", color: "var(--tx3)" }}>
          Bloomberg / Attijariwafa Markets
        </span>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        {MKT_RATES.map((item) => {
          const raw = rates?.[item.key];
          const val = raw != null ? parseFloat(raw) : item.fallback;
          return (
            <Card
              key={item.label}
              size="small"
              style={{ textAlign: "center" }}
              styles={{ body: { padding: "8px 10px" } }}
            >
              <div style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.51rem", letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--tx3)", marginBottom: 5 }}>
                {item.label}
              </div>
              <div style={{ fontFamily: "var(--f-mono)", fontSize: "0.90rem", fontWeight: 700, color: item.col, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {item.fmt(val)}
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
};

/* ─── Panneau Risque de Marché — VaR / Expected Shortfall ─────────── */
const MarketRiskPanel = ({ rk }) => {
  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
      <Shield size={13} style={{ color: "var(--loss)" }} />
      <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx1)" }}>
        Risque de Marché — VaR &amp; Pertes Potentielles
      </span>
      <Tooltip
        placement="topRight"
        title={
          <div style={{ fontFamily: "var(--f-body)", fontSize: "0.72rem", lineHeight: 1.6 }}>
            <div><b>VaR</b> = perte potentielle maximale à l'horizon <b>1 jour</b> pour le niveau de confiance indiqué.</div>
            <div><b>Paramétrique</b> : z·σ (loi normale, centrée 0). <b>Historique</b> : percentile empirique.</div>
            <div><b>Expected Shortfall (CVaR)</b> : perte moyenne au-delà du seuil (queue 2,5 %).</div>
            <div style={{ marginTop: 4, opacity: 0.7 }}>Estimée sur l'historique de P&L journalier du desk.</div>
          </div>
        }
      >
        <span style={{ marginLeft: 6, color: "var(--tx3)", cursor: "help", fontSize: "0.72rem", fontFamily: "var(--f-body)" }}>ⓘ</span>
      </Tooltip>
      {rk && (
        <span style={{ marginLeft: "auto", fontFamily: "var(--f-mono)", fontSize: "0.58rem", color: "var(--tx3)", padding: "2px 7px", background: "var(--elev)", borderRadius: 4, border: "1px solid var(--b1)" }}>
          {rk.nObs} jours · horizon 1j
        </span>
      )}
    </div>
  );

  if (!rk)
    return (
      <div className="card" style={{ padding: "16px 18px" }}>
        {header}
        <div style={{ fontFamily: "var(--f-body)", fontSize: "0.70rem", color: "var(--tx3)", padding: "8px 0" }}>
          Historique insuffisant pour estimer la VaR (≥ 5 jours ouvrés requis).
        </div>
      </div>
    );

  const cells = [
    { label: "VaR 99 % · 1j", sub: "Paramétrique (gaussienne)", val: -rk.varParam99, col: "var(--loss)", strong: true },
    { label: "VaR 99 % · 1j", sub: "Historique (percentile)",   val: -rk.varHist99,  col: "var(--loss)" },
    { label: "Expected Shortfall 97,5 %", sub: "CVaR — perte moyenne en queue", val: -rk.es975, col: "var(--loss)", strong: true },
    { label: "VaR 95 % · 1j", sub: "Paramétrique",              val: -rk.varParam95, col: "var(--warn)" },
    { label: "Volatilité annualisée", sub: "σ journalier × √252", val: rk.annVol,    col: "var(--warn)" },
    { label: "Max Drawdown", sub: "Pic-creux P&L éco cumulé",   val: -rk.maxDD,      col: "var(--loss)" },
  ];

  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      {header}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {cells.map((c) => (
          <div
            key={c.label + c.sub}
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: "var(--surf)",
              border: "1px solid var(--b1)",
              borderLeft: `3px solid ${c.col}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.55rem", letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--tx2)" }}>
                {c.label}
              </span>
              {c.strong && (
                <span style={{ fontFamily: "var(--f-disp)", fontWeight: 800, fontSize: "0.44rem", letterSpacing: "0.08em", color: c.col, padding: "1px 5px", borderRadius: 3, background: `${c.col}18`, border: `1px solid ${c.col}30` }}>
                  CLÉ
                </span>
              )}
            </div>
            <div style={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: "1.05rem", color: c.col, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {fMAD(c.val)}
            </div>
            <div style={{ fontFamily: "var(--f-body)", fontSize: "0.57rem", color: "var(--tx3)", marginTop: 5, lineHeight: 1.3 }}>
              {c.sub}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontFamily: "var(--f-body)", fontSize: "0.58rem", color: "var(--tx3)", lineHeight: 1.5 }}>
        Lecture : avec 99 % de confiance, la perte du desk sur 1 jour ne devrait pas dépasser{" "}
        <span style={{ fontFamily: "var(--f-mono)", color: "var(--loss)", fontWeight: 700 }}>{fMAD(-rk.varParam99)}</span>.
        Au-delà du seuil, la perte moyenne attendue (ES) est de{" "}
        <span style={{ fontFamily: "var(--f-mono)", color: "var(--loss)", fontWeight: 700 }}>{fMAD(-rk.es975)}</span>.
      </div>
    </div>
  );
};

const ReportingView = () => {
  const {
    dashboardRows,
    clnList,
    egpList,
    pnlDailyHistory,
    globalDashboard,
    rates,
    loading,
    refresh,
  } = useTrading();
  const { user } = useAuth();
  const { annualTargets, exposureLimits } = useGovernance();
  const [activeTab, setActiveTab] = useState("morning");

  // Objectifs annuels — source unique : useGovernance (piloté admin, défauts centralisés).
  const TARGETS = useMemo(
    () =>
      annualTargets.map((t) => ({
        key: t.category?.toLowerCase() || t.portfolioName,
        label: t.portfolioName,
        target: parseFloat(t.limitMeur) * 1e6,
        color: t.colorToken || "var(--cyan)",
      })),
    [annualTargets],
  );

  const TOTAL_TARGET = useMemo(
    () => TARGETS.reduce((s, t) => s + t.target, 0),
    [TARGETS],
  );

  const [scenShocks, setScenShocks] = useState({
    pess: 100,
    central: 0,
    opt: -50,
  });

  const year = new Date().getFullYear();
  const yearProg = useMemo(() => yearProgress(), []);
  const tradingDays = Math.max(1, Math.round(yearProg * 252));

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const pnl = useMemo(() => {
    const n = f => parseFloat(f ?? 0);
    // ISINs already covered by external snapshots → exclude from dashboardRows to avoid double-count
    const extIsins = new Set([
      ...(clnList || []).map(r => r.isin),
      ...(egpList || []).map(r => r.isin),
    ].filter(Boolean));

    const moroc = dashboardRows
      .filter(r => (r.subAsset || "").toLowerCase().includes("mor bond"))
      .reduce((s, r) => s + n(r.pnlEconomicMad), 0);
    const ocp = dashboardRows
      .filter(r => (r.subAsset || "").toLowerCase().includes("ocp bond"))
      .reduce((s, r) => s + n(r.pnlEconomicMad), 0);
    const cln = (clnList || []).reduce((s, r) => s + n(r.plEcoMad), 0);
    const egp = (egpList || []).reduce((s, r) => s + n(r.plEcoMad), 0);
    // Bonds in dashboardRows not captured above and not already in external snapshots (e.g. CLN GCC)
    const other = dashboardRows
      .filter(r => {
        const sub = (r.subAsset || "").toLowerCase();
        return !sub.includes("mor bond") && !sub.includes("ocp bond")
            && !sub.includes("future") && !extIsins.has(r.isin);
      })
      .reduce((s, r) => s + n(r.pnlEconomicMad), 0);
    return { moroc, ocp, cln, egp, other, total: moroc + ocp + cln + egp + other };
  }, [dashboardRows, clnList, egpList]);

  const attribution = useMemo(() => {
    const n = f => parseFloat(f ?? 0);
    const usdMad = parseFloat(rates?.usdMad || 9.251);
    const eurMad = parseFloat(rates?.eurMad || 10.418);
    const fx = r => (r.currency || "USD").toUpperCase() === "EUR" ? eurMad : usdMad;

    // Carry = daily theta × trading days elapsed (YTD estimation)
    const carry    = dashboardRows.reduce((s, r) => s + n(r.cpnThetaMad) * tradingDays, 0);
    // Latent / Realized: pnlLatentCcy / pnlRealizedCcy are in the bond's native CCY → convert with correct FX
    const latent   = dashboardRows.reduce((s, r) => s + n(r.pnlLatentCcy)   * fx(r), 0);
    const realized = dashboardRows.reduce((s, r) => s + n(r.pnlRealizedCcy) * fx(r), 0);
    // fundingCostMad is already in MAD (PnlService converts it)
    const funding  = dashboardRows.reduce((s, r) => s + n(r.fundingCostMad), 0);
    const total = Math.max(Math.abs(carry) + Math.abs(latent) + Math.abs(realized) + Math.abs(funding), 1);
    return { carry, latent, realized, funding, total };
  }, [dashboardRows, tradingDays, rates]);

  const stats = useMemo(() => {
    const vals = (pnlDailyHistory || [])
      .map((d) => parseFloat(d.pnlJourMad || 0))
      .filter((v) => !isNaN(v));
    if (!vals.length) return null;
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const std = Math.sqrt(
      vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length,
    );
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const maxDay = pnlDailyHistory.find(
      (d) => parseFloat(d.pnlJourMad || 0) === max,
    );
    const minDay = pnlDailyHistory.find(
      (d) => parseFloat(d.pnlJourMad || 0) === min,
    );
    const pos = vals.filter((v) => v > 0).length;
    const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : null;
    return {
      mean,
      std,
      max,
      min,
      maxDay,
      minDay,
      pos,
      total: vals.length,
      sharpe,
    };
  }, [pnlDailyHistory]);

  /* ── Risque de marché : VaR / Expected Shortfall / vol / drawdown ──
     Construit uniquement à partir de l'historique de P&L journalier (MAD).
     Méthodo : VaR paramétrique gaussienne (z·σ, centrée 0) + VaR historique
     (percentile empirique de la distribution) + Expected Shortfall (CVaR,
     moyenne de la queue de pertes). Aucune dépendance backend. */
  const riskStats = useMemo(() => {
    const daily = (pnlDailyHistory || [])
      .map((d) => parseFloat(d.pnlJourMad || 0))
      .filter((v) => !isNaN(v));
    if (daily.length < 5) return null;

    const mean = daily.reduce((s, v) => s + v, 0) / daily.length;
    const std = Math.sqrt(
      daily.reduce((s, v) => s + (v - mean) ** 2, 0) / daily.length,
    );
    const annVol = std * Math.sqrt(252);

    // VaR paramétrique 1 jour (magnitude de perte, centrée 0 — convention marché)
    const Z99 = 2.3263, Z95 = 1.6449;
    const varParam99 = Z99 * std;
    const varParam95 = Z95 * std;

    // VaR historique : percentile empirique de la distribution des P&L
    const sorted = [...daily].sort((a, b) => a - b);
    const percentile = (p) => {
      const idx = (sorted.length - 1) * p;
      const lo = Math.floor(idx), hi = Math.ceil(idx);
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    };
    const varHist99 = Math.max(0, -percentile(0.01));
    const varHist95 = Math.max(0, -percentile(0.05));

    // Expected Shortfall (CVaR) 97,5 % historique = perte moyenne de la queue 2,5 %
    const tailN = Math.max(1, Math.round(daily.length * 0.025));
    const tail = sorted.slice(0, tailN);
    const es975 = Math.max(0, -(tail.reduce((s, v) => s + v, 0) / tail.length));

    // Max drawdown sur le P&L éco cumulé (ordonné par date)
    const ordered = [...(pnlDailyHistory || [])]
      .filter((d) => d.snapshotDate)
      .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    let peak = -Infinity, maxDD = 0;
    ordered.forEach((d) => {
      const v = parseFloat(d.pnlEcoMad || 0);
      if (v > peak) peak = v;
      const dd = v - peak;
      if (dd < maxDD) maxDD = dd;
    });

    return {
      mean, std, annVol,
      varParam99, varParam95, varHist99, varHist95,
      es975, maxDD: Math.abs(maxDD), nObs: daily.length,
    };
  }, [pnlDailyHistory]);

  const scenarioData = useMemo(() => {
    const n = f => parseFloat(f ?? 0);
    const remainDays = Math.max(0, 252 - tradingDays);
    const usdMad = parseFloat(rates?.usdMad || 9.251);
    const eurMad = parseFloat(rates?.eurMad || 10.418);
    // DV01 is in the bond's native currency → convert each bond separately
    const dv01ToMad = r => n(r.dv01Bond) * ((r.currency || "USD").toUpperCase() === "EUR" ? eurMad : usdMad);

    const SCENS = [
      { key: "pess",    label: "Pessimiste", tag: "HAUSSE TAUX",    shockBps: scenShocks.pess,    color: "var(--loss)",   bg: "rgba(255,43,96,0.06)" },
      { key: "central", label: "Central",    tag: "MARCHÉ STABLE",  shockBps: scenShocks.central, color: "var(--cyan)",   bg: "rgba(0,202,255,0.05)" },
      { key: "opt",     label: "Optimiste",  tag: "BAISSE TAUX",    shockBps: scenShocks.opt,     color: "var(--profit)", bg: "rgba(0,232,153,0.05)" },
    ];

    const bondsMoroc = dashboardRows.filter(r => (r.subAsset || "").toLowerCase().includes("mor bond"));
    const bondsOcp   = dashboardRows.filter(r => (r.subAsset || "").toLowerCase().includes("ocp bond"));

    // DV01 already converted to MAD per bond → sum directly usable in MAD impact calculation
    const dv01MorocMad = bondsMoroc.reduce((s, r) => s + dv01ToMad(r), 0);
    const dv01OcpMad   = bondsOcp.reduce((s, r) => s + dv01ToMad(r), 0);
    // Keep raw USD/EUR DV01 sum for display in the risk metrics panel (e.g. "X $/bp")
    const dv01Moroc = bondsMoroc.reduce((s, r) => s + n(r.dv01Bond), 0);
    const dv01Ocp   = bondsOcp.reduce((s, r) => s + n(r.dv01Bond), 0);

    const carryMoroc = bondsMoroc.reduce((s, r) => s + n(r.netDailyMad), 0) * remainDays;
    const carryOcp   = bondsOcp.reduce((s, r) => s + n(r.netDailyMad), 0) * remainDays;
    const carryCln   = tradingDays > 0 ? (pnl.cln / tradingDays) * remainDays : 0;
    const carryEgp   = tradingDays > 0 ? (pnl.egp / tradingDays) * remainDays : 0;

    const ASSET_ROWS = [
      { key: "moroc", label: "Eurobond Maroc", actual: pnl.moroc, carry: carryMoroc, dv01Mad: dv01MorocMad, dv01: dv01Moroc, color: "var(--eb)" },
      { key: "ocp",   label: "Eurobond OCP",   actual: pnl.ocp,   carry: carryOcp,   dv01Mad: dv01OcpMad,   dv01: dv01Ocp,   color: "#9B3EEF" },
      { key: "cln",   label: "CLN",             actual: pnl.cln,   carry: carryCln,   dv01Mad: 0,            dv01: 0,         color: "var(--cln)" },
      { key: "egp",   label: "EGP Bills",       actual: pnl.egp,   carry: carryEgp,   dv01Mad: 0,            dv01: 0,         color: "var(--egp)" },
    ];

    return {
      scenarios: SCENS.map(s => {
        const assetResults = ASSET_ROWS.map(r => {
          // rateImpact already in MAD: dv01Mad (MAD/bp) × shockBps → MAD
          const rateImpact = r.dv01Mad > 0 ? -r.dv01Mad * s.shockBps : 0;
          return { ...r, rateImpact, yeProjection: r.actual + r.carry + rateImpact };
        });
        return { ...s, assetResults, total: assetResults.reduce((sum, r) => sum + r.yeProjection, 0) };
      }),
      ASSET_ROWS,
      remainDays,
      dv01TotalMad: dv01MorocMad + dv01OcpMad,
      dv01Total:    dv01Moroc + dv01Ocp,
    };
  }, [dashboardRows, clnList, egpList, pnl, tradingDays, rates, scenShocks]);

  const rows = useMemo(
    () =>
      TARGETS.map((t) => {
        const actual = pnl[t.key] || 0;
        const realPct = (actual / t.target) * 100;
        const daily = tradingDays > 0 ? actual / tradingDays : 0;
        const ann = daily * 252;
        const st = statusOf(realPct, yearProg * 100);
        return {
          ...t,
          actual,
          realPct,
          projCentral: ann,
          projPess: ann * 0.75,
          projOpt: ann * 1.25,
          status: st,
        };
      }),
    [pnl, tradingDays, yearProg],
  );

  const totRow = useMemo(() => {
    const actual = pnl.total;
    const realPct = (actual / TOTAL_TARGET) * 100;
    const ann = tradingDays > 0 ? (actual / tradingDays) * 252 : 0;
    const st = statusOf(realPct, yearProg * 100);
    return {
      label: "TOTAL DESK",
      target: TOTAL_TARGET,
      actual,
      realPct,
      projCentral: ann,
      projPess: ann * 0.75,
      projOpt: ann * 1.25,
      status: st,
      color: "var(--cyan)",
    };
  }, [pnl, tradingDays, yearProg]);

  const TH = {
    padding: "8px 12px",
    fontFamily: "var(--f-disp)",
    fontWeight: 700,
    fontSize: "0.56rem",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    color: "var(--tx3)",
    borderBottom: "1px solid var(--b1)",
    whiteSpace: "nowrap",
    textAlign: "right",
  };
  const TD = (extra = {}) => ({
    padding: "9px 12px",
    fontFamily: "var(--f-mono)",
    fontSize: "0.70rem",
    borderBottom: "1px solid var(--b0)",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
    ...extra,
  });

  const TABS = [
    { id: "morning",    label: "Morning Report",        icon: Sun },
    { id: "objectifs",  label: "Objectifs & Projections", icon: Target },
    { id: "attribution",label: "Attribution P&L",       icon: BarChart2 },
    { id: "scenarios",  label: "Analyse Scénarios",     icon: Sliders },
    { id: "historique", label: "Historique",             icon: Activity },
    { id: "limites",    label: "Suivi des Limites",     icon: Shield },
  ];

  const printDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const traderName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.username || "Trader";

  /* ── Morning Report Excel (.xlsx) — 7 onglets ── */
  const handleExportExcel = useCallback(() => {
    const now = new Date();
    const usdMad = parseFloat(rates?.usdMad || 9.251);
    const dateStr = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const dateLong = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

    const applyColWidths = (ws, widths) => { ws["!cols"] = widths.map((w) => ({ wch: w })); };
    const applyNumFmt = (ws, rowStart, colIdxs, fmt) => {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let R = rowStart; R <= range.e.r; R++) {
        colIdxs.forEach((C) => {
          const ref = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[ref] && typeof ws[ref].v === "number") ws[ref].z = fmt;
        });
      }
    };

    const wb = XLSX.utils.book_new();

    /* ── Données pré-calculées pour le résumé ── */
    const n = (v) => parseFloat(v ?? 0);
    const totalCarryDuJour = dashboardRows.reduce((s, r) => s + n(r.netDailyMad), 0);
    const totalFinancementDuJour = dashboardRows.reduce((s, r) => s + n(r.dailyFundingMad || r.fundingCostMad), 0);
    const totalNominalUsd = dashboardRows.reduce((s, r) => s + n(r.netNominal), 0);
    const totalNominalEur = dashboardRows
      .filter((r) => (r.currency || "").toUpperCase() === "EUR")
      .reduce((s, r) => s + n(r.netNominal), 0);
    const totalDv01 = dashboardRows.reduce((s, r) => s + n(r.dv01Bond), 0);
    const negCarryCount = dashboardRows.filter((r) => r.netDailyAlert).length;

    // P&L de la veille (J-1) : dernier snapshot AVANT aujourd'hui
    const todayStrXls = new Date().toISOString().split("T")[0];
    const hierCandidatesXls = (pnlDailyHistory || []).filter(d => d.snapshotDate && d.snapshotDate < todayStrXls);
    const lastDaily = hierCandidatesXls.length
      ? hierCandidatesXls[hierCandidatesXls.length - 1]
      : (pnlDailyHistory?.length ? pnlDailyHistory[pnlDailyHistory.length - 1] : null);
    const pnlHier = lastDaily ? Math.round(n(lastDaily.pnlJourMad)) : null;
    const dateHier = lastDaily?.snapshotDate ?? null;

    // Toutes positions unifiées pour Top 5 / Bottom 3 (dashboardRows + CLN + EGP)
    const allPnlRows = [
      ...dashboardRows.map((r) => ({
        isin: r.isin ?? "", desc: r.description ?? "",
        pnl: n(r.pnlEconomicMad), carry: n(r.netDailyMad),
      })),
      ...(clnList || []).map((r) => ({
        isin: r.isin ?? "", desc: r.description ?? r.isin ?? "CLN",
        pnl: n(r.plEcoMad), carry: 0,
      })),
      ...(egpList || []).map((r) => ({
        isin: r.isin ?? "", desc: r.description ?? r.isin ?? "EGP Bill",
        pnl: n(r.plEcoMad), carry: 0,
      })),
    ].sort((a, b) => b.pnl - a.pnl);
    const top5 = allPnlRows.slice(0, 5);
    const bot3 = allPnlRows.slice(-3).reverse();

    const attrTotal = Math.max(
      Math.abs(attribution.carry) + Math.abs(attribution.latent) +
      Math.abs(attribution.realized) + Math.abs(attribution.funding), 1
    );

    /* ── [1/7] RÉSUMÉ MORNING ── */
    const resumeData = [
      ["ATTIJARIWAFA BANK — DESK INTERNATIONAL FIXED INCOME", "", "MORNING REPORT", ""],
      [dateLong, "", `Trader : ${traderName}`, `Exporté : ${dateStr} ${timeStr}`],
      [],
      ["INDICATEURS CLÉS DU JOUR", "", "", ""],
      ["Indicateur", "Valeur (MAD)", "Note", ""],
      [">>> P&L de la Veille (J-1)", pnlHier, dateHier ? `Clôture du ${fDate(dateHier)}` : "Historique non disponible", ""],
      [">>> Carry Net Total du Jour", Math.round(totalCarryDuJour), "Coupon - Financement (toutes positions)", ""],
      ["    dont Financement (repo/portage)", Math.round(totalFinancementDuJour), "Coût total journalier", ""],
      ["DV01 Total Portefeuille (USD/bp)", Math.round(totalDv01), "Sensibilité 1bp hausse taux", ""],
      ["Positions en Carry Négatif", negCarryCount, `sur ${dashboardRows.length} positions actives`, ""],
      [],
      ["P&L ÉCONOMIQUE PAR ASSET CLASS", "", "", ""],
      ["Asset Class", "P&L Éco YTD (MAD)", "% du Total", "Note"],
      ["Eurobond Maroc", Math.round(pnl.moroc), pnl.total !== 0 ? pnl.moroc / Math.abs(pnl.total) : null, ""],
      ["Eurobond OCP", Math.round(pnl.ocp), pnl.total !== 0 ? pnl.ocp / Math.abs(pnl.total) : null, ""],
      ["CLN", Math.round(pnl.cln), pnl.total !== 0 ? pnl.cln / Math.abs(pnl.total) : null, ""],
      ["EGP Bills", Math.round(pnl.egp), pnl.total !== 0 ? pnl.egp / Math.abs(pnl.total) : null, ""],
      ["TOTAL DESK", Math.round(pnl.total), 1, `${((pnl.total / TOTAL_TARGET) * 100).toFixed(1)}% de l'objectif ${year}`],
      [],
      ["EXPOSITION NOMINALE", "", "", ""],
      ["Portefeuille", "Nominal (MUSD eq.)", "Note", ""],
      ["Exposition USD", totalNominalUsd - totalNominalEur, "Nominal en USD direct", ""],
      ["Exposition EUR (conv. USD)", totalNominalEur, "Nominal EUR (à convertir au taux EUR/USD)", ""],
      ["TOTAL NOMINAL", totalNominalUsd, "Toutes devises en MUSD équivalent", ""],
      [],
      ["TOP 5 CONTRIBUTEURS (toutes asset classes)", "", "", ""],
      ["ISIN", "Description", "P&L Éco (MAD)", "Carry Net/j (MAD)"],
      ...top5.map((r) => [r.isin, r.desc, Math.round(r.pnl), Math.round(r.carry)]),
      [],
      ["BOTTOM 3 DÉTRACTEURS (toutes asset classes)", "", "", ""],
      ["ISIN", "Description", "P&L Éco (MAD)", "Carry Net/j (MAD)"],
      ...bot3.map((r) => [r.isin, r.desc, Math.round(r.pnl), Math.round(r.carry)]),
      [],
      ["KPIs ANNUELS & STATISTIQUES", "", "", ""],
      ["Indicateur", "Valeur", "Note", ""],
      ["P&L Économique YTD", Math.round(pnl.total), `${((pnl.total / TOTAL_TARGET) * 100).toFixed(1)}% de l'objectif`, ""],
      ["Objectif Annuel Desk", Math.round(TOTAL_TARGET), "", ""],
      ["Projection Centrale (ann.)", Math.round(totRow.projCentral), "Rythme actuel × 252j", ""],
      ["P&L Moyen / Jour", stats?.mean != null ? Math.round(stats.mean) : null, "MAD / jour ouvré", ""],
      ["Volatilité Journalière (σ)", stats?.std != null ? Math.round(stats.std) : null, "MAD", ""],
      ["Ratio de Sharpe (ann.)", stats?.sharpe ?? null, "× √252", ""],
      ["Jours Positifs", stats?.pos ?? null, `sur ${stats?.total ?? 0} jours (${stats ? ((stats.pos / stats.total) * 100).toFixed(1) : "—"}%)`, ""],
      [],
      ["ATTRIBUTION P&L", "", "", ""],
      ["Composante", "Montant (MAD)", "Poids %", "Description"],
      ["Coupon / Carry (YTD estimé)", Math.round(attribution.carry), Math.abs(attribution.carry) / attrTotal, "Revenus obligataires courus YTD"],
      ["P&L Latent (Mark-to-Market)", Math.round(attribution.latent), Math.abs(attribution.latent) / attrTotal, "Variation valeur de marché non réalisée"],
      ["P&L Réalisé (trades fermés)", Math.round(attribution.realized), Math.abs(attribution.realized) / attrTotal, "Plus/moins-values matérialisées"],
      ["Coût de Financement", Math.round(attribution.funding), Math.abs(attribution.funding) / attrTotal, "Repo, collatéral, portage"],
      ["NET ÉCONOMIQUE TOTAL", Math.round(pnl.total), 1, "Somme algébrique"],
      [],
      ["CONTEXTE DE MARCHÉ", "", "", ""],
      ["Indicateur", "Valeur", "Source", "Date"],
      ...MKT_RATES.map((item) => {
        const val = rates?.[item.key] != null ? parseFloat(rates[item.key]) : item.fallback;
        return [item.label, val, rates ? "Bloomberg LIVE" : "Référence interne", dateStr];
      }),
    ];
    const wsResume = XLSX.utils.aoa_to_sheet(resumeData);
    applyColWidths(wsResume, [38, 22, 34, 22]);
    // Format MAD integers
    applyNumFmt(wsResume, 4, [1], "#,##0");
    // P&L par asset class column B (rows 11-16)
    applyNumFmt(wsResume, 11, [1], "#,##0");
    applyNumFmt(wsResume, 11, [2], "0.0%");
    // Exposure nominale
    applyNumFmt(wsResume, 18, [1], "#,##0.00");
    // Top contributors
    applyNumFmt(wsResume, 24, [2, 3], "#,##0");
    applyNumFmt(wsResume, 29, [2, 3], "#,##0");
    // KPIs annuels
    applyNumFmt(wsResume, 32, [1], "#,##0");
    // Attribution
    applyNumFmt(wsResume, 41, [1], "#,##0");
    applyNumFmt(wsResume, 41, [2], "0.0%");
    // Fix: taux de marché sont des décimales — écraser le #,##0 appliqué globalement
    const mktRateDataRow = resumeData.length - MKT_RATES.length;
    applyNumFmt(wsResume, mktRateDataRow, [1], "0.0000");
    XLSX.utils.book_append_sheet(wb, wsResume, "Résumé Morning");

    /* ── [2/7] ALERTES ── */
    const negCarryRows = dashboardRows
      .filter((r) => r.netDailyAlert)
      .sort((a, b) => n(a.netDailyMad) - n(b.netDailyMad));
    const spreadAlertRows = dashboardRows
      .filter((r) => {
        const tgt = n(r.targetSpread);
        const gBid = n(r.gSpreadBid);
        return tgt > 0 && (gBid - tgt) > 30;
      })
      .sort((a, b) => (n(b.gSpreadBid) - n(b.targetSpread)) - (n(a.gSpreadBid) - n(a.targetSpread)));

    const alertData = [
      ["TABLEAU DE BORD DES ALERTES", "", "", "", "", ""],
      [dateStr, "", `${negCarryRows.length} alerte(s) carry négatif · ${spreadAlertRows.length} alerte(s) spread`, "", "", ""],
      [],
      [`CARRY NÉGATIF (${negCarryRows.length} position(s))`, "", "", "", "", ""],
      ["ISIN", "Description", "Asset Class", "Carry Brut/j (MAD)", "Financement/j (MAD)", "Carry Net/j (MAD)"],
      ...negCarryRows.map((r) => [
        r.isin ?? "",
        r.description ?? "",
        r.subAsset ?? "",
        Math.round(n(r.cpnThetaMad)),
        Math.round(n(r.dailyFundingMad || r.fundingCostMad)),
        Math.round(n(r.netDailyMad)),
      ]),
      negCarryRows.length === 0 ? ["Aucune position en carry négatif", "", "", "", "", ""] : [],
      [],
      [`ÉCART SPREAD > 30bp vs TARGET (${spreadAlertRows.length} position(s))`, "", "", "", "", ""],
      ["ISIN", "Description", "G-Spread Actuel (bp)", "Target Spread (bp)", "Gap (bp)", "P&L Éco (MAD)"],
      ...spreadAlertRows.map((r) => [
        r.isin ?? "",
        r.description ?? "",
        n(r.gSpreadBid),
        n(r.targetSpread),
        n(r.gSpreadBid) - n(r.targetSpread),
        Math.round(n(r.pnlEconomicMad)),
      ]),
      spreadAlertRows.length === 0 ? ["Aucune alerte spread", "", "", "", "", ""] : [],
    ].filter((row) => Array.isArray(row));
    const wsAlert = XLSX.utils.aoa_to_sheet(alertData);
    wsAlert["!freeze"] = { xSplit: 0, ySplit: 4 };
    applyColWidths(wsAlert, [14, 30, 12, 18, 18, 18]);
    applyNumFmt(wsAlert, 4, [3, 4, 5], "#,##0");
    applyNumFmt(wsAlert, 9, [2, 3, 4], "0.0");
    applyNumFmt(wsAlert, 9, [5], "#,##0");
    XLSX.utils.book_append_sheet(wb, wsAlert, "Alertes");

    /* ── [3/7] POSITIONS — toutes asset classes, triées par P&L décroissant ── */
    const posHdr = [
      "ISIN", "Description", "Asset Class", "Nominal (MUSD)", "Coupon %",
      "Maturité", "WAP Dirty (%)", "Prix Marché (%)", "Perf WAP %",
      "G-Spread Bid (bp)", "I-Spread Bid (bp)", "Target Spread (bp)", "Gap vs Target (bp)",
      "P&L Éco (MAD)", "Carry Net/j (MAD)", "P&L Latent (MAD)", "Financement (MAD)",
      "Duration Mod. (ans)", "DV01 (USD/bp)", "Signal", "Alerte Carry",
    ];
    const dashPos = dashboardRows.map((r) => {
      const coupon = n(r.couponRate);
      const cpnPct = coupon < 1 ? coupon * 100 : coupon;
      const tgt = n(r.targetSpread);
      const gBid = n(r.gSpreadBid);
      return {
        _pnl: n(r.pnlEconomicMad),
        row: [
          r.isin ?? "", r.description ?? "", r.subAsset ?? "",
          n(r.netNominal), cpnPct, r.maturityDate ?? "",
          n(r.lastWapDirty) * 100, n(r.dirtyMarket) * 100, n(r.perfWap) * 100,
          gBid, n(r.iSpreadBid),
          tgt > 0 ? tgt : null, tgt > 0 ? gBid - tgt : null,
          Math.round(n(r.pnlEconomicMad)), Math.round(n(r.netDailyMad)),
          Math.round(n(r.pnlLatentCcy) * usdMad), Math.round(n(r.fundingCostMad)),
          n(r.modifiedDuration), Math.round(n(r.dv01Bond)),
          r.decision ?? "", r.netDailyAlert ? "OUI" : "NON",
        ],
      };
    });
    const clnPos = (clnList || []).map((r) => {
      const coupon = n(r.couponRate);
      const cpnPct = coupon < 1 ? coupon * 100 : coupon;
      return {
        _pnl: n(r.plEcoMad),
        row: [
          r.isin ?? "", r.description ?? r.isin ?? "CLN", "CLN",
          n(r.nominalUsd) / 1e6, cpnPct, r.maturityDate ?? "",
          null, null, null, null, null, null, null,
          Math.round(n(r.plEcoMad)), null,
          Math.round(n(r.plLatentUsd || 0) * usdMad),
          Math.round(n(r.fundingUsd || 0) * usdMad),
          n(r.modifiedDuration || 0), null, "", "NON",
        ],
      };
    });
    const egpPos = (egpList || []).map((r) => {
      const coupon = n(r.couponRate);
      const cpnPct = coupon < 1 ? coupon * 100 : coupon;
      return {
        _pnl: n(r.plEcoMad),
        row: [
          r.isin ?? "", r.description ?? r.isin ?? "EGP Bill", "EGP Bill",
          n(r.nominalUsd) / 1e6, cpnPct, r.maturityDate ?? "",
          null, null, null, null, null, null, null,
          Math.round(n(r.plEcoMad)), null, null, null,
          n(r.modifiedDuration || 0), null, "", "NON",
        ],
      };
    });
    const posRows = [...dashPos, ...clnPos, ...egpPos]
      .sort((a, b) => b._pnl - a._pnl)
      .map((x) => x.row);
    const wsPos = XLSX.utils.aoa_to_sheet([posHdr, ...posRows]);
    wsPos["!freeze"] = { xSplit: 2, ySplit: 1 };
    applyColWidths(wsPos, [14, 30, 12, 13, 9, 12, 12, 12, 10, 13, 13, 14, 15, 16, 15, 15, 16, 14, 12, 8, 12]);
    applyNumFmt(wsPos, 1, [3], "#,##0.00");
    applyNumFmt(wsPos, 1, [4, 6, 7, 8], "0.0000");
    applyNumFmt(wsPos, 1, [9, 10, 11, 12], "0.0");
    applyNumFmt(wsPos, 1, [13, 14, 15, 16], "#,##0");
    applyNumFmt(wsPos, 1, [17], "0.00");
    applyNumFmt(wsPos, 1, [18], "#,##0");
    XLSX.utils.book_append_sheet(wb, wsPos, "Positions");

    /* ── [4/7] OBJECTIFS & PROJECTIONS ── */
    const objHdr = [
      "Catégorie", `Objectif ${year} (MAD)`, "Réalisé YTD (MAD)", "% Réalisation",
      "Proj. Pessimiste (MAD)", "Proj. Centrale (MAD)", "Proj. Optimiste (MAD)",
      "Statut", "% Avancement Annuel",
    ];
    const objRows = [...rows, totRow].map((r) => [
      r.label,
      r.target,
      r.actual,
      r.realPct / 100,
      r.projPess,
      r.projCentral,
      r.projOpt,
      r.status?.lbl ?? "",
      yearProg,
    ]);
    const wsObj = XLSX.utils.aoa_to_sheet([objHdr, ...objRows]);
    wsObj["!freeze"] = { xSplit: 0, ySplit: 1 };
    applyColWidths(wsObj, [20, 20, 18, 14, 22, 20, 20, 12, 18]);
    applyNumFmt(wsObj, 1, [1, 2, 4, 5, 6], "#,##0");
    applyNumFmt(wsObj, 1, [3, 8], "0.0%");
    XLSX.utils.book_append_sheet(wb, wsObj, "Objectifs");

    /* ── [5/7] RISQUES & SCÉNARIOS ── */
    const { scenarios, ASSET_ROWS, dv01Total, dv01TotalMad: _dv01TotalMad, remainDays } = scenarioData;
    const _xlsUsdMad = usdMad; const _xlsEurMad = parseFloat(rates?.eurMad || 10.418);
    const portfolioDur = (() => {
      const active = dashboardRows.filter(r => n(r.netNominal) > 0 && n(r.modifiedDuration) > 0);
      const [sumWD, sumW] = active.reduce(([wd, w], r) => {
        const fx = (r.currency||"USD").toUpperCase()==="EUR" ? _xlsEurMad : _xlsUsdMad;
        const nomMad = n(r.netNominal) * fx;
        return [wd + n(r.modifiedDuration) * nomMad, w + nomMad];
      }, [0, 0]);
      return sumW > 0 ? sumWD / sumW : 0;
    })();
    const riskData = [
      ["MÉTRIQUES DE RISQUE PORTEFEUILLE", "", "", ""],
      ["DV01 Total (USD/bp)", dv01Total, "", ""],
      ["Duration Portefeuille Moy. Pondérée (ans)", portfolioDur, "", ""],
      ["Jours ouvrés restants (estimation)", remainDays, "", ""],
      [],
      ["ANALYSE DE SCÉNARIOS — FIN D'ANNÉE", "", "", ""],
      ["Scénario", "Choc Taux (bp)", "P&L Total Projeté (MAD)", ...ASSET_ROWS.map((a) => `${a.label} (MAD)`)],
      ...scenarios.map((s) => [
        s.label,
        s.shockBps,
        Math.round(s.total),
        ...s.assetResults.map((a) => Math.round(a.yeProjection)),
      ]),
      [],
      ["DÉCOMPOSITION DV01 PAR ASSET CLASS", "", "", ""],
      ["Asset Class", "DV01 (USD/bp)", "P&L Actuel (MAD)", "Carry Restant YE (MAD)"],
      ...ASSET_ROWS.map((r) => [r.label, Math.round(r.dv01 || 0), Math.round(r.actual), Math.round(r.carry)]),
    ];
    const wsRisk = XLSX.utils.aoa_to_sheet(riskData);
    applyColWidths(wsRisk, [34, 16, 24, 20, 20, 16, 16]);
    applyNumFmt(wsRisk, 6, [1], "0");
    applyNumFmt(wsRisk, 6, [2, 3, 4, 5, 6], "#,##0");
    applyNumFmt(wsRisk, 10, [1, 2, 3], "#,##0");
    XLSX.utils.book_append_sheet(wb, wsRisk, "Risques & Scénarios");

    /* ── [6/7] HISTORIQUE P&L ── */
    const mMap = {};
    (pnlDailyHistory || []).forEach((d) => {
      if (!d.snapshotDate) return;
      const m = d.snapshotDate.substring(0, 7);
      if (!mMap[m]) mMap[m] = { pnl: 0, fin: 0, days: 0, pos: 0, best: -Infinity, worst: Infinity };
      const v = n(d.pnlJourMad);
      mMap[m].pnl += v;
      mMap[m].fin += n(d.finTotalMad);
      mMap[m].days++;
      if (v > 0) mMap[m].pos++;
      if (v > mMap[m].best) mMap[m].best = v;
      if (v < mMap[m].worst) mMap[m].worst = v;
    });
    const monthlyRows = Object.entries(mMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, d]) => {
        const [yr, mo] = m.split("-");
        return [
          `${MONTHS_FR[parseInt(mo) - 1]} ${yr}`,
          Math.round(d.pnl),
          Math.round(d.fin),
          Math.round(d.best === -Infinity ? 0 : d.best),
          Math.round(d.worst === Infinity ? 0 : d.worst),
          d.pos,
          d.days,
        ];
      });
    const mHdr = ["Mois", "P&L Mensuel (MAD)", "Financement (MAD)", "Meilleure Journée (MAD)", "Pire Journée (MAD)", "Jours Positifs", "Nb Jours"];
    const dailyHdr = ["Date", "P&L Jour (MAD)", "P&L Éco Cumulé (MAD)", "Financement (MAD)"];
    const dailyRows = (pnlDailyHistory || []).map((d) => [
      d.snapshotDate ?? "",
      Math.round(n(d.pnlJourMad)),
      Math.round(n(d.pnlEcoMad)),
      Math.round(n(d.finTotalMad)),
    ]);
    const histData = [
      [`HISTORIQUE MENSUEL ${year}`, "", "", "", "", "", ""],
      mHdr,
      ...monthlyRows,
      [],
      [`HISTORIQUE JOURNALIER (${(pnlDailyHistory || []).length} entrées)`, "", "", ""],
      dailyHdr,
      ...dailyRows,
    ];
    const wsHist = XLSX.utils.aoa_to_sheet(histData);
    wsHist["!freeze"] = { xSplit: 0, ySplit: 2 };
    applyColWidths(wsHist, [12, 20, 20, 22, 20, 14, 10]);
    applyNumFmt(wsHist, 2, [1, 2, 3, 4], "#,##0");
    XLSX.utils.book_append_sheet(wb, wsHist, "Historique P&L");

    /* ── [7/7] CONTRIBUTION PAR ISIN ── */
    const totalAbsPnl = dashboardRows.reduce((s, r) => s + Math.abs(n(r.pnlEconomicMad)), 0) || 1;
    const isinContribs = dashboardRows
      .filter((r) => n(r.pnlEconomicMad) !== 0)
      .sort((a, b) => n(b.pnlEconomicMad) - n(a.pnlEconomicMad));
    const contribHdr = ["ISIN", "Description", "Nominal (MUSD)", "P&L Éco (MAD)", "Contribution %", "P&L / Nominal (bp)"];
    const contribRows = isinContribs.map((r) => {
      const pnlVal = n(r.pnlEconomicMad);
      const nom = n(r.netNominal);
      return [
        r.isin ?? "",
        r.description ?? "",
        nom,
        Math.round(pnlVal),
        (Math.abs(pnlVal) / totalAbsPnl) * (pnlVal >= 0 ? 1 : -1),
        nom > 0 ? (pnlVal / (nom * 1e6)) * 10000 : null,
      ];
    });
    const wsCont = XLSX.utils.aoa_to_sheet([contribHdr, ...contribRows]);
    wsCont["!freeze"] = { xSplit: 0, ySplit: 1 };
    applyColWidths(wsCont, [14, 32, 14, 16, 14, 16]);
    applyNumFmt(wsCont, 1, [2], "#,##0.00");
    applyNumFmt(wsCont, 1, [3], "#,##0");
    applyNumFmt(wsCont, 1, [4], "0.00%");
    applyNumFmt(wsCont, 1, [5], "0.0");
    XLSX.utils.book_append_sheet(wb, wsCont, "Contribution ISIN");

    /* ── [8/8] RISQUE & VaR ── */
    const rk = riskStats;
    const riskVarData = [
      ["RISQUE DE MARCHÉ — VALUE-AT-RISK & PERTES POTENTIELLES", "", ""],
      [dateLong, `Trader : ${traderName}`, ""],
      [],
      ["Métrique", "Valeur (MAD)", "Méthodologie / Note"],
      ...(rk
        ? [
            ["VaR 99% — horizon 1 jour (paramétrique)", -Math.round(rk.varParam99), "z = 2.3263 × σ journalier (loi normale, centrée 0)"],
            ["VaR 95% — horizon 1 jour (paramétrique)", -Math.round(rk.varParam95), "z = 1.6449 × σ journalier"],
            ["VaR 99% — horizon 1 jour (historique)", -Math.round(rk.varHist99), "1er percentile empirique de la distribution P&L"],
            ["VaR 95% — horizon 1 jour (historique)", -Math.round(rk.varHist95), "5e percentile empirique"],
            ["Expected Shortfall 97,5% (CVaR)", -Math.round(rk.es975), "Perte moyenne au-delà du seuil (queue 2,5%)"],
            ["Volatilité journalière (σ)", Math.round(rk.std), "Écart-type du P&L journalier"],
            ["Volatilité annualisée", Math.round(rk.annVol), "σ × √252"],
            ["Max Drawdown (P&L éco cumulé)", -Math.round(rk.maxDD), "Repli pic-à-creux maximal"],
            ["Nombre d'observations", rk.nObs, "Jours ouvrés dans l'historique"],
          ]
        : [["Historique insuffisant (≥ 5 jours requis)", "", ""]]),
    ];
    const wsRiskVar = XLSX.utils.aoa_to_sheet(riskVarData);
    applyColWidths(wsRiskVar, [42, 20, 50]);
    if (rk) applyNumFmt(wsRiskVar, 4, [1], "#,##0");
    XLSX.utils.book_append_sheet(wb, wsRiskVar, "Risque VaR");

    /* ── ÉCRITURE ── */
    XLSX.writeFile(wb, `AWB_MorningReport_${year}_${now.toISOString().slice(0, 10)}.xlsx`);
  }, [
    rows,
    totRow,
    attribution,
    stats,
    pnlDailyHistory,
    dashboardRows,
    clnList,
    egpList,
    rates,
    year,
    traderName,
    yearProg,
    pnl,
    scenarioData,
    TOTAL_TARGET,
    riskStats,
  ]);

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div
        id="awb-report-print"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* ── PRINT-ONLY HEADER ── */}
        <div className="awb-print-only" style={{ display: "none" }}>
          <div
            style={{
              padding: "0 0 16px",
              borderBottom: "2px solid #CC2200",
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "IBM Plex Mono,monospace",
                  fontWeight: 800,
                  fontSize: "13pt",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                  lineHeight: 1.2,
                }}
              >
                Attijariwafa Bank
              </div>
              <div
                style={{
                  fontFamily: "IBM Plex Mono,monospace",
                  fontSize: "7.5pt",
                  color: "#CC2200",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginTop: 3,
                }}
              >
                Desk International · Fixed Income
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: "IBM Plex Mono,monospace",
                  fontWeight: 700,
                  fontSize: "11pt",
                  color: "#00E899",
                  letterSpacing: "0.04em",
                }}
              >
                Reporting Annuel {year}
              </div>
              <div
                style={{
                  fontFamily: "IBM Plex Mono,monospace",
                  fontSize: "6.5pt",
                  color: "#4A6A84",
                  marginTop: 3,
                }}
              >
                Généré le {printDate}
              </div>
              <div
                style={{
                  fontFamily: "IBM Plex Mono,monospace",
                  fontSize: "6.5pt",
                  color: "#4A6A84",
                  marginTop: 2,
                }}
              >
                {traderName} · CONFIDENTIEL
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              marginBottom: 18,
              padding: "10px 12px",
              background: "#020F1E",
              borderRadius: 6,
              border: "1px solid #1A3A5C",
            }}
          >
            {[
              {
                label: "P&L Éco. YTD",
                value: fMAD(pnl.total),
                color: pnl.total >= 0 ? "#00E899" : "#FF2B60",
              },
              {
                label: "Objectif Annuel",
                value: fMAD(TOTAL_TARGET),
                color: "#FFA500",
              },
              {
                label: "Réalisation",
                value: fPct((pnl.total / TOTAL_TARGET) * 100),
                color: statusOf(
                  (pnl.total / TOTAL_TARGET) * 100,
                  yearProg * 100,
                ).col,
              },
              {
                label: "Sharpe Annualisé",
                value: stats?.sharpe != null ? stats.sharpe.toFixed(3) : "—",
                color: stats?.sharpe >= 1 ? "#00E899" : "#FFA500",
              },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "IBM Plex Mono,monospace",
                    fontSize: "6pt",
                    color: "#4A6A84",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "IBM Plex Mono,monospace",
                    fontWeight: 700,
                    fontSize: "10pt",
                    color,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SCREEN HEADER ── */}
        <div
          className="awb-no-print"
          style={{ borderBottom: "1px solid var(--b1)", flexShrink: 0 }}
        >
          <div
            style={{
              padding: "8px 20px",
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
                  background: "var(--warn)",
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />
              <div>
                <div className="view-title">Reporting Annuel {year}</div>
                <div className="view-sub">
                  Desk International Fixed Income · Attijariwafa Bank
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button
                size="small"
                onClick={handlePrint}
                icon={<Printer size={10} />}
                title="Générer un PDF A4 complet"
                style={{
                  background: "rgba(0,232,153,0.06)",
                  borderColor: "rgba(0,232,153,0.18)",
                  color: "var(--profit)",
                }}
              >
                Export PDF
              </Button>
              <Button
                size="small"
                onClick={handleExportExcel}
                icon={<Download size={10} />}
                title="Morning Report Excel (.xlsx) — 8 onglets : Résumé, Alertes, Positions, Objectifs, Risques &amp; Scénarios, Historique P&amp;L, Contribution ISIN, Risque VaR"
                style={{
                  background: "rgba(0,202,255,0.06)",
                  borderColor: "rgba(0,202,255,0.18)",
                  color: "var(--cyan)",
                }}
              >
                Morning Report Excel
              </Button>
              <Button
                size="small"
                loading={loading}
                onClick={refresh}
                icon={<RefreshCw size={10} />}
              >
                Actualiser
              </Button>
            </div>
          </div>

          <div
            className="card"
            style={{ padding: "12px 16px", marginBottom: 16 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Calendar size={12} style={{ color: "var(--tx3)" }} />
                <span
                  className="lbl"
                  style={{ fontSize: "0.58rem", letterSpacing: "0.08em" }}
                >
                  PROGRESSION {year}
                </span>
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  {
                    label: "Écoulé",
                    val: `${(yearProg * 100).toFixed(1)}%`,
                    col: "var(--cyan)",
                  },
                  {
                    label: "~Jours trading",
                    val: tradingDays,
                    col: "var(--tx2)",
                  },
                  {
                    label: "Restants",
                    val: `~${252 - tradingDays} j`,
                    col: "var(--tx3)",
                  },
                ].map(({ label, val, col }) => (
                  <span
                    key={label}
                    style={{ display: "flex", gap: 5, alignItems: "center" }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--f-body)",
                        fontSize: "0.60rem",
                        color: "var(--tx3)",
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        color: col,
                      }}
                    >
                      {val}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div
              style={{
                height: 5,
                borderRadius: 3,
                background: "var(--elev)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(yearProg * 100).toFixed(1)}%`,
                  borderRadius: 3,
                  background:
                    "linear-gradient(to right, var(--cyan), var(--profit))",
                  transition: "width 0.8s ease",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <KpiCard
              label="P&L Économique YTD"
              value={fMAD(pnl.total)}
              sub={`${fPct((pnl.total / TOTAL_TARGET) * 100)} de l'objectif annuel`}
              color={pnl.total >= 0 ? "var(--profit)" : "var(--loss)"}
              Icon={pnl.total >= 0 ? TrendingUp : TrendingDown}
            />
            <KpiCard
              label="Objectif Annuel"
              value={fMAD(TOTAL_TARGET)}
              sub="Desk International Fixed Income"
              color="var(--warn)"
              Icon={Target}
            />
            <KpiCard
              label="Projection Centrale"
              value={fMAD(totRow.projCentral)}
              sub={`${fPct((totRow.projCentral / TOTAL_TARGET) * 100)} objectif · rythme actuel`}
              color={
                statusOf((totRow.projCentral / TOTAL_TARGET) * 100, 100).col
              }
              Icon={Activity}
            />
            <KpiCard
              label="P&L Moyen / Jour"
              value={stats ? fM(stats.mean) + " MAD" : "—"}
              sub={
                stats
                  ? `Sharpe ${stats.sharpe?.toFixed(2) ?? "—"} · ${stats.pos}/${stats.total} jours positifs`
                  : "Historique non disponible"
              }
              color="var(--cyan)"
              Icon={BarChart2}
              alert={stats && stats.sharpe != null && stats.sharpe < 0}
            />
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="small"
            className="awb-tabs-nav-only awb-no-print"
            tabBarStyle={{ marginBottom: 0, paddingLeft: 8 }}
            items={TABS.map(({ id, label, icon: Icon }) => ({
              key: id,
              label: (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon size={11} />
                  {label}
                </span>
              ),
            }))}
          />
        </div>

        {/* ── TAB CONTENT ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
          {/* ═══════════════════════════════════════════════════════
             MORNING REPORT
          ════════════════════════════════════════════════════════ */}
          {activeTab === "morning" && (() => {
            const n = v => parseFloat(v ?? 0);
            // J-1 = dernier snapshot strictement avant aujourd'hui (repli sur le plus récent si non disponible)
            const todayStr = new Date().toISOString().split("T")[0];
            const hierCandidates = (pnlDailyHistory || []).filter(d => d.snapshotDate && d.snapshotDate < todayStr);
            const lastDaily = hierCandidates.length
              ? hierCandidates[hierCandidates.length - 1]
              : (pnlDailyHistory?.length ? pnlDailyHistory[pnlDailyHistory.length - 1] : null);
            const pnlHier = lastDaily ? n(lastDaily.pnlJourMad) : null;
            const dateHier = lastDaily?.snapshotDate;

            const todayCarry  = dashboardRows.reduce((s, r) => s + n(r.netDailyMad), 0);
            const todayTheta  = dashboardRows.reduce((s, r) => s + n(r.cpnThetaMad), 0);
            const todayFin    = dashboardRows.reduce((s, r) => s + n(r.dailyFundingMad || r.fundingCostMad), 0);
            const negCarry    = dashboardRows.filter(r => r.netDailyAlert);

            const now = new Date();
            const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

            // Next coupons ≤45 days — computed inline (IIFE, no hook)
            const today45 = new Date();
            const nextCoupons = dashboardRows
              .filter(r => r.couponRate && r.maturityDate && r.netNominal)
              .map(r => {
                const mat = new Date(r.maturityDate);
                if (isNaN(mat.getTime())) return null;
                const m = mat.getMonth(), d = mat.getDate(), yr = today45.getFullYear();
                const m2 = (m + 6) % 12;
                const candidates = [
                  new Date(yr, m, d), new Date(yr, m2, d),
                  new Date(yr + 1, m, d), new Date(yr + 1, m2, d),
                ].filter(dt => dt > today45).sort((a, b) => a - b);
                const next = candidates[0];
                if (!next) return null;
                const daysLeft = Math.round((next - today45) / 86400000);
                if (daysLeft > 45) return null;
                const rate = parseFloat(r.couponRate);
                const effectiveRate = rate < 1 ? rate : rate / 100;
                const nominal = parseFloat(r.netNominal);
                const amtUsd = (effectiveRate * nominal) / 2;
                return { isin: r.isin, desc: r.description, daysLeft, amtUsd, next, color: r.subAsset };
              })
              .filter(Boolean)
              .sort((a, b) => a.daysLeft - b.daysLeft)
              .slice(0, 6);

            const allPnlRanked = [...dashboardRows.map(r => ({ isin: r.isin, desc: r.description, pnl: n(r.pnlEconomicMad), carry: n(r.netDailyMad) })), ...(clnList || []).map(r => ({ isin: r.isin, desc: r.description || "CLN", pnl: n(r.plEcoMad), carry: 0 })), ...(egpList || []).map(r => ({ isin: r.isin, desc: r.description || "EGP Bill", pnl: n(r.plEcoMad), carry: 0 }))].filter(r => r.pnl !== 0).sort((a, b) => b.pnl - a.pnl);
            const top3 = allPnlRanked.slice(0, 3);
            const bot3 = allPnlRanked.slice(-3).reverse();

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* ── Date / identity header ── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: 8, background: "var(--surf)", border: "1px solid var(--b1)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Sun size={18} style={{ color: "var(--warn)" }} />
                    <div>
                      <div style={{ fontFamily: "var(--f-disp)", fontWeight: 800, fontSize: "0.82rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--tx1)" }}>
                        Morning Report — {printDate}
                      </div>
                      <div style={{ fontFamily: "var(--f-body)", fontSize: "0.62rem", color: "var(--tx3)", marginTop: 2 }}>
                        Desk International Fixed Income · {traderName} · généré à {timeStr}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--f-disp)", fontWeight: 800, fontSize: "0.52rem", letterSpacing: "0.12em", padding: "3px 10px", borderRadius: 4, background: "rgba(255,43,96,0.10)", border: "1px solid rgba(255,43,96,0.25)", color: "var(--loss)" }}>
                    CONFIDENTIEL
                  </span>
                </div>

                {/* ── 5 headline KPIs ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                  {[
                    { label: "P&L Hier (J-1)",   fmt: pnlHier != null ? fM(pnlHier) : "—",   sfx: pnlHier != null ? "MAD" : "",  sub: dateHier ? `Clôture ${fDate(dateHier)}` : "Non disponible",   color: pnlHier != null ? (pnlHier >= 0 ? "var(--profit)" : "var(--loss)") : "var(--tx3)", Icon: pnlHier == null ? Clock : pnlHier >= 0 ? TrendingUp : TrendingDown },
                    { label: "Carry Net / j",     fmt: fM(todayCarry),                          sfx: "MAD",                         sub: "Coupon − Financement",                                       color: todayCarry >= 0 ? "var(--profit)" : "var(--loss)", Icon: Activity },
                    { label: "Theta Coupon / j",  fmt: fM(todayTheta),                          sfx: "MAD",                         sub: "Revenus courus estimés",                                     color: "var(--cyan)", Icon: TrendingUp },
                    { label: "Financement / j",   fmt: fM(todayFin),                            sfx: "MAD",                         sub: "Coût portage total",                                         color: "var(--warn)", Icon: TrendingDown },
                    { label: "YTD vs Objectif",   fmt: fPct((pnl.total / TOTAL_TARGET) * 100), sfx: "",                            sub: `${fM(pnl.total)} / ${fM(TOTAL_TARGET)} MAD`,                color: statusOf((pnl.total / TOTAL_TARGET) * 100, yearProg * 100).col, Icon: Target },
                  ].map(({ label, fmt, sfx, sub, color, Icon }) => (
                    <Card key={label} size="small" style={{ borderTop: `2px solid ${color}` }} styles={{ body: { padding: "10px 13px" } }}>
                      <Statistic
                        title={
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.53rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--tx3)" }}>{label}</span>
                            <Icon size={11} style={{ color, opacity: 0.65 }} />
                          </div>
                        }
                        value={fmt}
                        suffix={sfx ? <span style={{ fontFamily: "var(--f-disp)", fontSize: "0.52rem", color: "var(--tx3)", fontWeight: 400, marginLeft: 2 }}>{sfx}</span> : undefined}
                        valueStyle={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: "1.05rem", lineHeight: 1, color, letterSpacing: "-0.02em" }}
                      />
                      {sub && <div style={{ fontFamily: "var(--f-body)", fontSize: "0.58rem", color: "var(--tx3)", marginTop: 4, lineHeight: 1.3 }}>{sub}</div>}
                    </Card>
                  ))}
                </div>

                {/* ── Bande VaR / risque de marché ── */}
                {riskStats && (
                  <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap", padding: "10px 16px", borderRadius: 8, background: "var(--surf)", border: "1px solid var(--b1)", borderLeft: "3px solid var(--loss)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginRight: 18 }}>
                      <Shield size={13} style={{ color: "var(--loss)" }} />
                      <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.58rem", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx2)" }}>
                        Risque de Marché · 1j
                      </span>
                    </div>
                    {[
                      { l: "VaR 99%", v: -riskStats.varParam99, c: "var(--loss)" },
                      { l: "VaR 95%", v: -riskStats.varParam95, c: "var(--warn)" },
                      { l: "ES 97,5%", v: -riskStats.es975, c: "var(--loss)" },
                      { l: "Vol. ann.", v: riskStats.annVol, c: "var(--warn)" },
                      { l: "Max DD", v: -riskStats.maxDD, c: "var(--loss)" },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ display: "flex", alignItems: "baseline", gap: 6, marginRight: 22 }}>
                        <span style={{ fontFamily: "var(--f-body)", fontSize: "0.60rem", color: "var(--tx3)" }}>{l}</span>
                        <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.74rem", fontWeight: 700, color: c }}>{fM(v)} MAD</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Bannière alerte globale ── */}
                {negCarry.length > 0 && (
                  <Alert
                    type="error"
                    showIcon
                    message={`${negCarry.length} position${negCarry.length > 1 ? "s" : ""} en carry négatif — financement supérieur au coupon`}
                    description={negCarry.slice(0, 4).map(r => r.description || r.isin).join(" · ")}
                    style={{ fontSize: "0.70rem" }}
                  />
                )}
                {negCarry.length === 0 && (
                  <Alert
                    type="success"
                    showIcon
                    message="Toutes les positions sont en carry positif — book sain"
                    style={{ fontSize: "0.70rem" }}
                  />
                )}

                {/* ── Two columns: Carry par Asset + Alertes ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {/* Carry par asset class */}
                  <div className="card" style={{ overflow: "hidden" }}>
                    <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--b1)", display: "flex", alignItems: "center", gap: 7 }}>
                      <Activity size={12} style={{ color: "var(--cyan)" }} />
                      <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.63rem", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx1)" }}>
                        Carry Net / j par Asset Class
                      </span>
                    </div>
                    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {rows.map(r => {
                        const rCarry = dashboardRows.filter(d => (d.subAsset || "").toLowerCase().includes(r.key === "moroc" ? "mor" : r.key === "ocp" ? "ocp" : r.key)).reduce((s, d) => s + n(d.netDailyMad), 0);
                        const rTheta = dashboardRows.filter(d => (d.subAsset || "").toLowerCase().includes(r.key === "moroc" ? "mor" : r.key === "ocp" ? "ocp" : r.key)).reduce((s, d) => s + n(d.cpnThetaMad), 0);
                        return (
                          <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontFamily: "var(--f-disp)", fontWeight: 600, fontSize: "0.63rem", color: r.color, width: 110, flexShrink: 0 }}>{r.label}</span>
                            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--elev)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${Math.min(Math.abs(rCarry) / Math.max(Math.abs(todayCarry), 1) * 100, 100)}%`, background: rCarry >= 0 ? r.color : "var(--loss)", borderRadius: 3, opacity: 0.8 }} />
                            </div>
                            <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.68rem", fontWeight: 700, color: rCarry >= 0 ? "var(--profit)" : "var(--loss)", width: 80, textAlign: "right", flexShrink: 0 }}>
                              {fM(rCarry)} MAD
                            </span>
                          </div>
                        );
                      })}
                      <div style={{ paddingTop: 8, borderTop: "1px solid var(--b1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.60rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--tx2)" }}>TOTAL</span>
                        <span style={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: "0.80rem", color: todayCarry >= 0 ? "var(--profit)" : "var(--loss)" }}>
                          {fM(todayCarry)} MAD
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Alertes carry négatif */}
                  <Card
                    size="small"
                    styles={{ body: { padding: 0 } }}
                    title={
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <AlertTriangle size={12} style={{ color: negCarry.length ? "#ff4d4f" : "#52c41a" }} />
                        <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.63rem", letterSpacing: "0.10em", textTransform: "uppercase" }}>
                          Alertes Carry Négatif
                        </span>
                      </div>
                    }
                    extra={
                      negCarry.length === 0
                        ? <Tag color="success" style={{ margin: 0, fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.52rem", letterSpacing: "0.09em" }}>✓ AUCUNE</Tag>
                        : <Badge count={negCarry.length} color="#ff4d4f" style={{ fontFamily: "var(--f-disp)", fontWeight: 700 }} />
                    }
                  >
                    {negCarry.length === 0 ? (
                      <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                        <CheckCircle size={20} style={{ color: "var(--profit)", opacity: 0.7 }} />
                        <span style={{ fontFamily: "var(--f-body)", fontSize: "0.68rem", color: "var(--tx3)" }}>Toutes les positions sont en carry positif.</span>
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "var(--thead-bg)" }}>
                              {["Obligation", "Theta/j", "Fin./j", "Net/j"].map(h => (
                                <th key={h} style={{ padding: "6px 10px", fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.54rem", letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--tx3)", borderBottom: "1px solid var(--b1)", textAlign: h === "Obligation" ? "left" : "right", whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {negCarry.map((r, i) => (
                              <tr key={r.isin} style={{ background: i % 2 === 0 ? "var(--tr-even-bg)" : "transparent" }}>
                                <td style={{ padding: "6px 10px", fontSize: "0.68rem", color: "var(--tx1)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.description}>{r.description || r.isin}</td>
                                <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "var(--f-mono)", fontSize: "0.65rem", color: "var(--cyan)" }}>{fM(r.cpnThetaMad)}</td>
                                <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "var(--f-mono)", fontSize: "0.65rem", color: "var(--warn)" }}>{fM(r.dailyFundingMad || r.fundingCostMad)}</td>
                                <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "var(--f-mono)", fontSize: "0.68rem", fontWeight: 700, color: "var(--loss)" }}>{fM(r.netDailyMad)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </div>

                {/* ── Contexte de marché ── */}
                <MarketContextPanel rates={rates} />

                {/* ── Prochains coupons (45 jours) ── */}
                {nextCoupons.length > 0 && (
                  <div className="card" style={{ overflow: "hidden" }}>
                    <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--b1)", display: "flex", alignItems: "center", gap: 7 }}>
                      <Calendar size={12} style={{ color: "var(--cyan)" }} />
                      <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.63rem", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx1)" }}>
                        Prochains Coupons — 45 Jours
                      </span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "var(--thead-bg)" }}>
                            {["Obligation", "Date", "Jours", "Montant USD", "Urgence"].map(h => (
                              <th key={h} style={{ padding: "6px 12px", fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.54rem", letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--tx3)", borderBottom: "1px solid var(--b1)", textAlign: h === "Obligation" ? "left" : "right", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {nextCoupons.map((e, i) => {
                            const urg = e.daysLeft < 15;
                            const soon = e.daysLeft < 30;
                            const col = urg ? "var(--loss)" : soon ? "var(--cyan)" : "var(--profit)";
                            return (
                              <tr key={e.isin} style={{ background: urg ? "rgba(255,43,96,0.04)" : i % 2 === 0 ? "var(--tr-even-bg)" : "transparent" }}>
                                <td style={{ padding: "7px 12px", fontSize: "0.70rem", color: "var(--tx1)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.desc || e.isin}</td>
                                <td style={{ padding: "7px 12px", textAlign: "right", fontFamily: "var(--f-mono)", fontSize: "0.67rem", color: "var(--tx2)" }}>
                                  {e.next.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                                </td>
                                <td style={{ padding: "7px 12px", textAlign: "right", fontFamily: "var(--f-mono)", fontSize: "0.72rem", fontWeight: 700, color: col }}>{e.daysLeft}j</td>
                                <td style={{ padding: "7px 12px", textAlign: "right", fontFamily: "var(--f-mono)", fontSize: "0.68rem", color: "var(--cyan)", fontWeight: 600 }}>
                                  {e.amtUsd.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} USD
                                </td>
                                <td style={{ padding: "7px 12px", textAlign: "right" }}>
                                  {urg
                                    ? <span style={{ fontFamily: "var(--f-disp)", fontWeight: 800, fontSize: "0.52rem", letterSpacing: "0.09em", padding: "2px 7px", borderRadius: 4, background: "rgba(255,43,96,0.12)", border: "1px solid rgba(255,43,96,0.28)", color: "var(--loss)" }}>URGENT</span>
                                    : soon
                                      ? <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.52rem", letterSpacing: "0.09em", padding: "2px 7px", borderRadius: 4, background: "rgba(0,202,255,0.10)", border: "1px solid rgba(0,202,255,0.22)", color: "var(--cyan)" }}>BIENTÔT</span>
                                      : <span style={{ fontFamily: "var(--f-disp)", fontSize: "0.52rem", letterSpacing: "0.09em", padding: "2px 7px", borderRadius: 4, background: "rgba(0,232,153,0.08)", border: "1px solid rgba(0,232,153,0.18)", color: "var(--profit)" }}>OK</span>
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Top 3 / Bottom 3 ── */}
                {(top3.length > 0 || bot3.length > 0) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {[{ title: "▲ Top 3 Contributeurs YTD", items: top3, col: "var(--profit)" }, { title: "▼ Bottom 3 Détracteurs YTD", items: bot3, col: "var(--loss)" }].map(({ title, items, col }) => (
                      <div key={title} className="card" style={{ padding: "12px 16px" }}>
                        <div style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.60rem", letterSpacing: "0.10em", textTransform: "uppercase", color: col, marginBottom: 10 }}>{title}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          {items.map((r, i) => (
                            <div key={r.isin} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < items.length - 1 ? "1px solid var(--b0)" : "none" }}>
                              <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.62rem", color: "var(--cyan)", width: 100, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.isin}</span>
                              <span style={{ fontFamily: "var(--f-body)", fontSize: "0.63rem", color: "var(--tx2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(r.desc || "").split(" ").slice(0, 3).join(" ")}</span>
                              <span style={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: "0.70rem", color: r.pnl >= 0 ? "var(--profit)" : "var(--loss)", flexShrink: 0 }}>
                                {r.pnl >= 0 ? "+" : ""}{(r.pnl / 1e6).toFixed(2)}M
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

        {/* SECTION 1 : OBJECTIFS */}
          <div
            className="awb-report-section"
            style={{ display: activeTab === "objectifs" ? "block" : "none" }}
          >
            <div className="awb-section-label" style={{ display: "none" }}>
              1 / 4 — Objectifs &amp; Projections {year}
            </div>

            {/* Market context panel */}
            <MarketContextPanel rates={rates} />

            {/* Cumulative P&L vs Target trajectory */}
            {pnlDailyHistory && pnlDailyHistory.length >= 2 && (
              <div className="card slide-up stagger-1" style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Activity size={13} style={{ color: "var(--profit)" }} />
                    <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx1)" }}>
                      P&L Économique YTD vs Trajectoire Objectif {year}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 18, height: 2, background: "var(--warn)", borderRadius: 1, opacity: 0.7 }} />
                      <span style={{ fontFamily: "var(--f-body)", fontSize: "0.58rem", color: "var(--tx3)" }}>Objectif</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 18, height: 2, background: "#22C55E", borderRadius: 1 }} />
                      <span style={{ fontFamily: "var(--f-body)", fontSize: "0.58rem", color: "var(--tx3)" }}>Réalisé</span>
                    </div>
                  </div>
                </div>
                <CumulativePnlChart history={pnlDailyHistory} target={TOTAL_TARGET} />
              </div>
            )}

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
                <Target size={13} style={{ color: "var(--warn)" }} />
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
                  Réalisation vs Objectifs · Scénarios {year}
                </span>
                <Tooltip
                  title={
                    <div style={{ fontFamily: "var(--f-body)", fontSize: "0.72rem", lineHeight: 1.6 }}>
                      <div><b>Projection centrale</b> : rythme J × 252 jours ouvrés</div>
                      <div><b>Pessimiste</b> : ×0.75 — <b>Optimiste</b> : ×1.25</div>
                      <div style={{ marginTop: 4, opacity: 0.7 }}>Avancement annuel : {(yearProg * 100).toFixed(1)}% · {tradingDays} j écoulés · ~{252 - tradingDays} j restants</div>
                    </div>
                  }
                  placement="topRight"
                >
                  <span style={{ marginLeft: 6, color: "var(--tx3)", cursor: "help", fontSize: "0.72rem", fontFamily: "var(--f-body)" }}>ⓘ</span>
                </Tooltip>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--thead-bg)" }}>
                      <th style={{ ...TH, textAlign: "left" }}>Catégorie</th>
                      <th style={TH}>Objectif {year}</th>
                      <th style={TH}>Réalisé YTD</th>
                      <th style={TH}>% Réal.</th>
                      <th style={{ ...TH, borderLeft: "1px solid var(--b1)" }}>
                        Pessimiste
                        <br />
                        <span style={{ opacity: 0.55, fontWeight: 400 }}>
                          ×0.75
                        </span>
                      </th>
                      <th style={TH}>
                        Centrale
                        <br />
                        <span style={{ opacity: 0.55, fontWeight: 400 }}>
                          rythme actuel
                        </span>
                      </th>
                      <th style={TH}>
                        Optimiste
                        <br />
                        <span style={{ opacity: 0.55, fontWeight: 400 }}>
                          ×1.25
                        </span>
                      </th>
                      <th
                        style={{
                          ...TH,
                          borderLeft: "1px solid var(--b1)",
                          textAlign: "center",
                        }}
                      >
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const barW = Math.min((r.actual / r.target) * 100, 100);
                      const rowBg =
                        i % 2 === 0 ? "var(--tr-even-bg)" : "transparent";
                      return (
                        <tr
                          key={r.key}
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
                              ...TD({ textAlign: "left" }),
                              borderLeft: `3px solid ${r.color}`,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--f-disp)",
                                fontWeight: 600,
                                color: "var(--tx1)",
                                fontSize: "0.72rem",
                              }}
                            >
                              {r.label}
                            </span>
                          </td>
                          <td style={TD()}>
                            <span style={{ color: "var(--tx2)" }}>
                              {fMAD(r.target)}
                            </span>
                          </td>
                          <td style={TD()}>
                            <span
                              style={{
                                color:
                                  r.actual >= 0
                                    ? "var(--profit)"
                                    : "var(--loss)",
                                fontWeight: 600,
                              }}
                            >
                              {fMAD(r.actual)}
                            </span>
                            <div
                              style={{
                                marginTop: 3,
                                height: 3,
                                borderRadius: 2,
                                background: "var(--elev)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${Math.max(barW, 0)}%`,
                                  background: r.status.col,
                                  borderRadius: 2,
                                  transition: "width 0.8s ease",
                                }}
                              />
                            </div>
                          </td>
                          <td
                            style={{
                              ...TD(),
                              color: r.status.col,
                              fontWeight: 600,
                            }}
                          >
                            {fPct(r.realPct)}
                          </td>
                          <td
                            style={{
                              ...TD(),
                              borderLeft: "1px solid var(--b0)",
                              color: "var(--warn)",
                              opacity: 0.85,
                            }}
                          >
                            {fMAD(r.projPess)}
                          </td>
                          <td
                            style={{
                              ...TD(),
                              color: statusOf(
                                (r.projCentral / r.target) * 100,
                                100,
                              ).col,
                              fontWeight: 600,
                            }}
                          >
                            {fMAD(r.projCentral)}
                          </td>
                          <td
                            style={{
                              ...TD(),
                              color: "var(--profit)",
                              opacity: 0.85,
                            }}
                          >
                            {fMAD(r.projOpt)}
                          </td>
                          <td
                            style={{
                              ...TD({ textAlign: "center" }),
                              borderLeft: "1px solid var(--b0)",
                            }}
                          >
                            <Tag style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.57rem", letterSpacing: "0.08em", background: `${r.status.col}18`, borderColor: `${r.status.col}40`, color: r.status.col, margin: 0 }}>
                              {r.status.lbl}
                            </Tag>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        background: "var(--tfoot-bg)",
                        borderTop: "2px solid var(--b2)",
                      }}
                    >
                      <td
                        style={{
                          ...TD({ textAlign: "left", fontWeight: 700 }),
                          borderLeft: "3px solid var(--cyan)",
                          borderBottom: "none",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--f-disp)",
                            fontWeight: 800,
                            color: "var(--tx1)",
                            fontSize: "0.72rem",
                            letterSpacing: "0.04em",
                          }}
                        >
                          TOTAL DESK
                        </span>
                      </td>
                      <td style={{ ...TD(), borderBottom: "none" }}>
                        <span style={{ color: "var(--tx2)", fontWeight: 700 }}>
                          {fMAD(TOTAL_TARGET)}
                        </span>
                      </td>
                      <td
                        style={{
                          ...TD(),
                          borderBottom: "none",
                          color:
                            totRow.actual >= 0
                              ? "var(--profit)"
                              : "var(--loss)",
                          fontWeight: 700,
                        }}
                      >
                        {fMAD(totRow.actual)}
                      </td>
                      <td
                        style={{
                          ...TD(),
                          borderBottom: "none",
                          color: totRow.status.col,
                          fontWeight: 700,
                        }}
                      >
                        {fPct(totRow.realPct)}
                      </td>
                      <td
                        style={{
                          ...TD(),
                          borderBottom: "none",
                          borderLeft: "1px solid var(--b1)",
                          color: "var(--warn)",
                          fontWeight: 600,
                        }}
                      >
                        {fMAD(totRow.projPess)}
                      </td>
                      <td
                        style={{
                          ...TD(),
                          borderBottom: "none",
                          color: statusOf(
                            (totRow.projCentral / TOTAL_TARGET) * 100,
                            100,
                          ).col,
                          fontWeight: 700,
                        }}
                      >
                        {fMAD(totRow.projCentral)}
                      </td>
                      <td
                        style={{
                          ...TD(),
                          borderBottom: "none",
                          color: "var(--profit)",
                          fontWeight: 600,
                        }}
                      >
                        {fMAD(totRow.projOpt)}
                      </td>
                      <td
                        style={{
                          ...TD({ textAlign: "center" }),
                          borderBottom: "none",
                          borderLeft: "1px solid var(--b1)",
                        }}
                      >
                        <Tag style={{ fontFamily: "var(--f-disp)", fontWeight: 800, fontSize: "0.57rem", letterSpacing: "0.08em", background: `${totRow.status.col}18`, borderColor: `${totRow.status.col}40`, color: totRow.status.col, margin: 0 }}>
                          {totRow.status.lbl}
                        </Tag>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 2 : ATTRIBUTION */}
          <div
            className="awb-report-section awb-page-break"
            style={{ display: activeTab === "attribution" ? "block" : "none" }}
          >
            <div className="awb-section-label" style={{ display: "none" }}>
              2 / 4 — Attribution P&amp;L · Décomposition &amp; Statistiques
            </div>

            {/* Risque de marché — VaR & pertes potentielles */}
            <div style={{ marginBottom: 16 }}>
              <MarketRiskPanel rk={riskStats} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div className="card" style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                  <BarChart2 size={13} style={{ color: "var(--cyan)" }} />
                  <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx1)" }}>
                    P&L Bridge — Waterfall
                  </span>
                </div>
                <WaterfallChart
                  carry={attribution.carry}
                  latent={attribution.latent}
                  realized={attribution.realized}
                  funding={attribution.funding}
                  net={pnl.total}
                />
                <Divider style={{ margin: "14px 0 10px" }}>
                  <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.58rem", letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--tx3)" }}>
                    Détail par composante
                  </span>
                </Divider>
                <AttributionBar
                  label="Coupon / Carry (YTD estimé)"
                  value={attribution.carry}
                  total={attribution.total}
                  color="var(--cyan)"
                />
                <AttributionBar
                  label="P&L Latent (Mark-to-Market)"
                  value={attribution.latent}
                  total={attribution.total}
                  color="var(--eb)"
                />
                <AttributionBar
                  label="P&L Réalisé (trades fermés)"
                  value={attribution.realized}
                  total={attribution.total}
                  color="var(--profit)"
                />
                <AttributionBar
                  label="Coût de Financement (négatif)"
                  value={attribution.funding}
                  total={attribution.total}
                  color="var(--warn)"
                />
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: "1px solid var(--b1)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--f-disp)",
                      fontWeight: 700,
                      fontSize: "0.65rem",
                      color: "var(--tx2)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    NET ÉCONOMIQUE
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontWeight: 700,
                      fontSize: "0.80rem",
                      color: pnl.total >= 0 ? "var(--profit)" : "var(--loss)",
                    }}
                  >
                    {fMAD(pnl.total)}
                  </span>
                </div>
              </div>

              <div className="card" style={{ padding: "16px 18px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    marginBottom: 16,
                  }}
                >
                  <Activity size={13} style={{ color: "var(--cyan)" }} />
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
                    Statistiques Journalières
                  </span>
                </div>
                {stats ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 0 }}
                  >
                    {[
                      {
                        label: "P&L moyen / jour",
                        val: fM(stats.mean) + " MAD",
                        col: stats.mean >= 0 ? "var(--profit)" : "var(--loss)",
                        bold: true,
                      },
                      {
                        label: "Volatilité (σ)",
                        val: fM(stats.std) + " MAD",
                        col: "var(--warn)",
                      },
                      {
                        label: "Ratio de Sharpe (ann.)",
                        val:
                          stats.sharpe != null ? stats.sharpe.toFixed(3) : "—",
                        col:
                          stats.sharpe >= 1
                            ? "var(--profit)"
                            : stats.sharpe >= 0
                              ? "var(--warn)"
                              : "var(--loss)",
                        bold: true,
                      },
                      {
                        label: "Meilleure journée",
                        val: fM(stats.max) + " MAD",
                        col: "var(--profit)",
                        sub: fDate(stats.maxDay?.snapshotDate),
                      },
                      {
                        label: "Pire journée",
                        val: fM(stats.min) + " MAD",
                        col: "var(--loss)",
                        sub: fDate(stats.minDay?.snapshotDate),
                      },
                      {
                        label: "Jours positifs",
                        val: `${stats.pos} / ${stats.total}`,
                        col: "var(--profit)",
                        sub: `${((stats.pos / stats.total) * 100).toFixed(1)}% du temps`,
                      },
                    ].map(({ label, val, col, bold, sub }) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom: "1px solid var(--b0)",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: "var(--f-body)",
                              fontSize: "0.65rem",
                              color: "var(--tx2)",
                            }}
                          >
                            {label}
                          </div>
                          {sub && (
                            <div
                              style={{
                                fontFamily: "var(--f-mono)",
                                fontSize: "0.58rem",
                                color: "var(--tx3)",
                                marginTop: 1,
                              }}
                            >
                              {sub}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.72rem",
                            fontWeight: bold ? 700 : 500,
                            color: col,
                          }}
                        >
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      height: 120,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      color: "var(--tx3)",
                    }}
                  >
                    <Activity size={20} style={{ opacity: 0.35 }} />
                    <span
                      style={{
                        fontFamily: "var(--f-body)",
                        fontSize: "0.70rem",
                      }}
                    >
                      Historique non disponible
                    </span>
                  </div>
                )}
              </div>

              <div
                className="card"
                style={{ padding: "16px 18px", gridColumn: "1 / -1" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    marginBottom: 14,
                  }}
                >
                  <Target size={13} style={{ color: "var(--warn)" }} />
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
                    Contribution par Asset Class (P&L Économique)
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                  }}
                >
                  {rows.map((r) => {
                    const contribPct =
                      pnl.total !== 0
                        ? (r.actual / Math.abs(pnl.total)) * 100
                        : 0;
                    return (
                      <div
                        key={r.key}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 8,
                          background: "var(--surf)",
                          border: "1px solid var(--b1)",
                          borderLeft: `3px solid ${r.color}`,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--f-disp)",
                            fontWeight: 700,
                            fontSize: "0.63rem",
                            color: "var(--tx2)",
                            marginBottom: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                          }}
                        >
                          {r.label}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--f-mono)",
                            fontWeight: 700,
                            fontSize: "0.90rem",
                            color:
                              r.actual >= 0 ? "var(--profit)" : "var(--loss)",
                          }}
                        >
                          {fM(r.actual)} MAD
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.62rem",
                            color: "var(--tx3)",
                            marginTop: 4,
                          }}
                        >
                          {contribPct >= 0 ? "+" : ""}
                          {contribPct.toFixed(1)}% du total
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            height: 3,
                            borderRadius: 2,
                            background: "var(--elev)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(Math.abs(contribPct), 100)}%`,
                              background: r.color,
                              borderRadius: 2,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2b : CONTRIBUTION PAR ISIN */}
          {activeTab === "attribution" &&
            dashboardRows.length > 0 &&
            (() => {
              const n = (f) => parseFloat(f ?? 0);
              const isinPnl = dashboardRows
                .map((r) => ({
                  isin: r.isin,
                  desc: (r.description || r.isin || "")
                    .split(" ")
                    .slice(0, 4)
                    .join(" "),
                  nominal: n(r.netNominal),
                  pnl: n(r.pnlEconomicMad),
                }))
                .filter((r) => r.pnl !== 0)
                .sort((a, b) => b.pnl - a.pnl);

              if (isinPnl.length === 0) return null;
              const totalAbsPnl =
                isinPnl.reduce((s, r) => s + Math.abs(r.pnl), 0) || 1;
              const top5 = isinPnl.slice(0, 5);
              const bottom5 =
                isinPnl.length > 5 ? isinPnl.slice(-5).reverse() : [];

              const IsinBar = ({ row }) => {
                const pct = Math.min(
                  (Math.abs(row.pnl) / totalAbsPnl) * 100,
                  100,
                );
                const isPos = row.pnl >= 0;
                const pnlNom =
                  row.nominal > 0
                    ? ((row.pnl / row.nominal) * 10000).toFixed(1)
                    : null; // bps of nominal
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 0",
                      borderBottom: "1px solid var(--b0)",
                    }}
                  >
                    <div style={{ width: 90, flexShrink: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.64rem",
                          color: "var(--cyan)",
                          fontWeight: 500,
                        }}
                      >
                        {row.isin}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--f-body)",
                          fontSize: "0.57rem",
                          color: "var(--tx3)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.desc}
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        position: "relative",
                        height: 14,
                        background: "var(--b1)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          height: "100%",
                          width: `${pct}%`,
                          background: isPos ? "var(--profit)" : "var(--loss)",
                          borderRadius: 3,
                          opacity: 0.65,
                          ...(isPos ? { left: 0 } : { right: 0 }),
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontWeight: 700,
                        fontSize: "0.68rem",
                        color: isPos ? "var(--profit)" : "var(--loss)",
                        minWidth: 70,
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      {isPos ? "+" : ""}
                      {(row.pnl / 1e6).toFixed(2)}M
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.58rem",
                        color: "var(--tx3)",
                        minWidth: 48,
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      {((row.pnl / totalAbsPnl) * 100).toFixed(1)}%
                    </span>
                    {pnlNom && (
                      <span
                        style={{
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.56rem",
                          color: "var(--tx3)",
                          minWidth: 52,
                          textAlign: "right",
                          flexShrink: 0,
                        }}
                      >
                        {pnlNom} bp
                      </span>
                    )}
                  </div>
                );
              };

              return (
                <div
                  className="card"
                  style={{ padding: "16px 18px", marginTop: 0 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 14,
                    }}
                  >
                    <BarChart2 size={13} style={{ color: "var(--eb)" }} />
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
                      Contribution P&L par ISIN
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.60rem",
                        color: "var(--tx3)",
                        padding: "2px 7px",
                        background: "var(--elev)",
                        borderRadius: 4,
                        border: "1px solid var(--b1)",
                        marginLeft: "auto",
                      }}
                    >
                      {isinPnl.length} positions · P&L Économique MAD
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 24,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--f-disp)",
                          fontWeight: 700,
                          fontSize: "0.58rem",
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                          color: "var(--profit)",
                          marginBottom: 8,
                        }}
                      >
                        ▲ Top 5 contributeurs
                      </div>
                      {top5.map((r) => (
                        <IsinBar key={r.isin} row={r} />
                      ))}
                    </div>
                    {bottom5.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontFamily: "var(--f-disp)",
                            fontWeight: 700,
                            fontSize: "0.58rem",
                            letterSpacing: "0.10em",
                            textTransform: "uppercase",
                            color: "var(--loss)",
                            marginBottom: 8,
                          }}
                        >
                          ▼ Bottom 5 contributeurs
                        </div>
                        {bottom5.map((r) => (
                          <IsinBar key={r.isin} row={r} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          {/* SECTION SCENARIOS */}
          {activeTab === "scenarios" &&
            (() => {
              const { scenarios, ASSET_ROWS, remainDays, dv01Total, dv01TotalMad } =
                scenarioData;
              const usdMad = parseFloat(rates?.usdMad || 9.251);

              const shockLabel = (bps) =>
                bps === 0 ? "0 bp" : bps > 0 ? `+${bps} bp` : `${bps} bp`;

              return (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {/* ── Shock inputs ── */}
                  <div className="card" style={{ padding: "14px 18px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 14,
                      }}
                    >
                      <Sliders size={13} style={{ color: "var(--cyan)" }} />
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
                        Hypothèses de Choc de Taux — Projection 31 Déc {year}
                      </span>
                      <Tooltip
                        title={
                          <div style={{ fontFamily: "var(--f-body)", fontSize: "0.72rem", lineHeight: 1.6 }}>
                            <div><b>Formule</b> : P&L projeté = Réalisé YTD + Carry estimé − DV01 × Δbp</div>
                            <div><b>DV01</b> exprimé en MAD/bp (EUR et USD convertis aux taux du jour)</div>
                            <div><b>Carry estimé</b> : net daily MAD × jours restants (~{252 - tradingDays} j)</div>
                            <div style={{ marginTop: 4, opacity: 0.7 }}>Sans ajustement convexité · Source taux : Bloomberg</div>
                          </div>
                        }
                        placement="topRight"
                      >
                        <span style={{ marginLeft: 6, color: "var(--tx3)", cursor: "help", fontSize: "0.72rem", fontFamily: "var(--f-body)" }}>ⓘ</span>
                      </Tooltip>
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
                        DV01 portefeuille :{" "}
                        {(dv01TotalMad / 1e3).toFixed(0)} k MAD/bp ·{" "}
                        {remainDays} j restants
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3,1fr)",
                        gap: 12,
                      }}
                    >
                      {scenarios.map((s) => (
                        <div
                          key={s.key}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 8,
                            background: s.bg,
                            border: `1px solid ${s.color}35`,
                            borderTop: `2px solid ${s.color}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 8,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--f-disp)",
                                fontWeight: 700,
                                fontSize: "0.65rem",
                                color: s.color,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                              }}
                            >
                              {s.label}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--f-disp)",
                                fontSize: "0.48rem",
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                color: s.color,
                                padding: "1px 5px",
                                borderRadius: 3,
                                background: `${s.color}18`,
                                border: `1px solid ${s.color}30`,
                              }}
                            >
                              {s.tag}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--f-body)",
                                fontSize: "0.63rem",
                                color: "var(--tx2)",
                              }}
                            >
                              Choc taux (bp) :
                            </span>
                            <input
                              type="number"
                              value={scenShocks[s.key]}
                              onChange={(e) =>
                                setScenShocks((prev) => ({
                                  ...prev,
                                  [s.key]: parseInt(e.target.value) || 0,
                                }))
                              }
                              style={{
                                width: 60,
                                padding: "3px 8px",
                                fontFamily: "var(--f-mono)",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: s.color,
                                background: "var(--b0)",
                                border: `1px solid ${s.color}40`,
                                borderRadius: 4,
                                outline: "none",
                                textAlign: "right",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              marginTop: 8,
                              fontFamily: "var(--f-body)",
                              fontSize: "0.58rem",
                              color: "var(--tx3)",
                            }}
                          >
                            Impact portefeuille ≈{" "}
                            {fM(-dv01TotalMad * s.shockBps)} MAD
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Projection Table ── */}
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
                      <Target size={13} style={{ color: "var(--warn)" }} />
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
                        Projection P&L au 31 Décembre {year}
                      </span>
                    </div>
                    {/* Alert si scénario pessimiste < 50% de l'objectif */}
                    {scenarios[0]?.total < TOTAL_TARGET * 0.5 && (
                      <div style={{ padding: "0 16px 12px" }}>
                        <Alert
                          type="warning"
                          showIcon
                          message={`Scénario pessimiste : ${fMAD(scenarios[0].total)} — ${fPct((scenarios[0].total / TOTAL_TARGET) * 100)} de l'objectif annuel`}
                          description="Hausse de taux significative — révision des couvertures futures recommandée."
                          style={{ fontSize: "0.68rem" }}
                        />
                      </div>
                    )}
                    {scenarios[0]?.total >= TOTAL_TARGET && (
                      <div style={{ padding: "0 16px 12px" }}>
                        <Alert
                          type="success"
                          showIcon
                          message="Même en scénario pessimiste, l'objectif annuel est atteint."
                          style={{ fontSize: "0.68rem" }}
                        />
                      </div>
                    )}
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr style={{ background: "var(--thead-bg)" }}>
                            <th style={{ ...TH, textAlign: "left" }}>
                              Asset Class
                            </th>
                            <th style={TH}>Réalisé YTD</th>
                            <th style={TH}>
                              Carry Restant
                              <br />
                              <span style={{ opacity: 0.55, fontWeight: 400 }}>
                                ~{remainDays} j
                              </span>
                            </th>
                            {scenarios.map((s) => (
                              <th
                                key={s.key}
                                style={{
                                  ...TH,
                                  borderLeft: "1px solid var(--b1)",
                                  color: s.color,
                                }}
                              >
                                {s.label}
                                <br />
                                <span
                                  style={{ opacity: 0.75, fontWeight: 500 }}
                                >
                                  {shockLabel(s.shockBps)}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ASSET_ROWS.map((r, i) => {
                            const rowBg =
                              i % 2 === 0 ? "var(--tr-even-bg)" : "transparent";
                            return (
                              <tr
                                key={r.key}
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
                                    ...TD({ textAlign: "left" }),
                                    borderLeft: `3px solid ${r.color}`,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: "var(--f-disp)",
                                      fontWeight: 600,
                                      color: "var(--tx1)",
                                      fontSize: "0.72rem",
                                    }}
                                  >
                                    {r.label}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...TD(),
                                    color:
                                      r.actual >= 0
                                        ? "var(--profit)"
                                        : "var(--loss)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {fM(r.actual)} MAD
                                </td>
                                <td style={{ ...TD(), color: "var(--cyan)" }}>
                                  {r.carry !== 0 ? (
                                    fM(r.carry) + " MAD"
                                  ) : (
                                    <span style={{ color: "var(--tx3)" }}>
                                      —
                                    </span>
                                  )}
                                </td>
                                {scenarios.map((s) => {
                                  const res = s.assetResults.find(
                                    (x) => x.key === r.key,
                                  );
                                  const pos = res.yeProjection >= 0;
                                  return (
                                    <td
                                      key={s.key}
                                      style={{
                                        ...TD(),
                                        borderLeft: "1px solid var(--b0)",
                                        color: pos
                                          ? "var(--profit)"
                                          : "var(--loss)",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {fM(res.yeProjection)} MAD
                                      {r.dv01 > 0 && (
                                        <div
                                          style={{
                                            fontFamily: "var(--f-mono)",
                                            fontSize: "0.54rem",
                                            color:
                                              res.rateImpact >= 0
                                                ? "var(--profit)"
                                                : "var(--loss)",
                                            opacity: 0.7,
                                            marginTop: 1,
                                          }}
                                        >
                                          taux: {fM(res.rateImpact)}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr
                            style={{
                              background: "var(--tfoot-bg)",
                              borderTop: "2px solid var(--b2)",
                            }}
                          >
                            <td
                              style={{
                                ...TD({ textAlign: "left", fontWeight: 700 }),
                                borderLeft: "3px solid var(--cyan)",
                                borderBottom: "none",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "var(--f-disp)",
                                  fontWeight: 800,
                                  color: "var(--tx1)",
                                  fontSize: "0.72rem",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                TOTAL DESK
                              </span>
                            </td>
                            <td
                              style={{
                                ...TD(),
                                borderBottom: "none",
                                color:
                                  pnl.total >= 0
                                    ? "var(--profit)"
                                    : "var(--loss)",
                                fontWeight: 700,
                              }}
                            >
                              {fM(pnl.total)} MAD
                            </td>
                            <td
                              style={{
                                ...TD(),
                                borderBottom: "none",
                                color: "var(--cyan)",
                                fontWeight: 600,
                              }}
                            >
                              {fM(ASSET_ROWS.reduce((s, r) => s + r.carry, 0))}{" "}
                              MAD
                            </td>
                            {scenarios.map((s) => {
                              const pos = s.total >= 0;
                              const pct = (s.total / TOTAL_TARGET) * 100;
                              return (
                                <td
                                  key={s.key}
                                  style={{
                                    ...TD(),
                                    borderBottom: "none",
                                    borderLeft: "1px solid var(--b1)",
                                    fontWeight: 700,
                                    color: pos
                                      ? "var(--profit)"
                                      : "var(--loss)",
                                  }}
                                >
                                  {fM(s.total)} MAD
                                  <div
                                    style={{
                                      fontFamily: "var(--f-mono)",
                                      fontSize: "0.56rem",
                                      color: statusOf(pct, 100).col,
                                      marginTop: 1,
                                    }}
                                  >
                                    {fPct(pct)} objectif
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div
                      style={{
                        padding: "8px 16px",
                        borderTop: "1px solid var(--b0)",
                      }}
                    >
                    </div>
                  </div>

                  {/* ── DV01 sensitivity note ── */}
                  <div
                    className="card"
                    style={{
                      padding: "12px 18px",
                      borderLeft: "3px solid var(--warn)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        marginBottom: 8,
                      }}
                    >
                      <AlertTriangle
                        size={12}
                        style={{ color: "var(--warn)" }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--f-disp)",
                          fontWeight: 700,
                          fontSize: "0.60rem",
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                          color: "var(--warn)",
                        }}
                      >
                        Sensibilité Taux — DV01 par Scénario
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3,1fr)",
                        gap: 12,
                      }}
                    >
                      {scenarios.map((s) => {
                        const totalImpact = -dv01Total * s.shockBps * usdMad;
                        return (
                          <div
                            key={s.key}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "7px 10px",
                              borderRadius: 6,
                              background: "var(--surf)",
                              border: `1px solid ${s.color}25`,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--f-disp)",
                                fontWeight: 600,
                                fontSize: "0.62rem",
                                color: s.color,
                              }}
                            >
                              {s.label} ({shockLabel(s.shockBps)})
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--f-mono)",
                                fontWeight: 700,
                                fontSize: "0.72rem",
                                color:
                                  totalImpact >= 0
                                    ? "var(--profit)"
                                    : "var(--loss)",
                              }}
                            >
                              {fM(totalImpact)} MAD
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* SECTION 3 : HISTORIQUE */}
          <div
            className="awb-report-section awb-page-break"
            style={{ display: activeTab === "historique" ? "block" : "none" }}
          >
            <div className="awb-section-label" style={{ display: "none" }}>
              3 / 4 — Historique Mensuel {year}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: "16px 18px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    marginBottom: 14,
                  }}
                >
                  <Activity size={13} style={{ color: "var(--profit)" }} />
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
                    P&L Mensuel {year} (MAD)
                  </span>
                </div>
                <MonthlyChart history={pnlDailyHistory} />
                {pnlDailyHistory && pnlDailyHistory.length >= 5 && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--b1)" }}>
                    <DrawdownChart history={pnlDailyHistory} />
                  </div>
                )}
              </div>

              {pnlDailyHistory &&
                pnlDailyHistory.length > 0 &&
                (() => {
                  const map = {};
                  pnlDailyHistory.forEach((d) => {
                    if (!d.snapshotDate) return;
                    const m = String(d.snapshotDate).substring(0, 7);
                    if (!map[m])
                      map[m] = {
                        pnlJour: 0,
                        finTotal: 0,
                        days: 0,
                        best: null,
                        worst: null,
                      };
                    const v = parseFloat(d.pnlJourMad ?? 0);
                    if (isNaN(v)) return;
                    map[m].pnlJour += v;
                    map[m].finTotal += parseFloat(d.finTotalMad ?? 0) || 0;
                    map[m].days++;
                    if (map[m].best == null || v > map[m].best) map[m].best = v;
                    if (map[m].worst == null || v < map[m].worst)
                      map[m].worst = v;
                  });
                  const entries = Object.entries(map).sort(([a], [b]) =>
                    a.localeCompare(b),
                  );
                  if (!entries.length) return null;
                  return (
                    <div className="card" style={{ overflow: "hidden" }}>
                      <div style={{ overflowX: "auto" }}>
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <thead>
                            <tr style={{ background: "var(--thead-bg)" }}>
                              {[
                                "Mois",
                                "P&L du mois",
                                "Financement",
                                "Meilleure J.",
                                "Pire J.",
                                "Nb jours",
                              ].map((h) => (
                                <th
                                  key={h}
                                  style={{
                                    ...TH,
                                    textAlign: h === "Mois" ? "left" : "right",
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map(([key, d], i) => {
                              const [yr, mo] = key.split("-");
                              const label = `${MONTHS_FR[parseInt(mo) - 1]} ${yr}`;
                              const pos = d.pnlJour >= 0;
                              const bg =
                                i % 2 === 0
                                  ? "var(--tr-even-bg)"
                                  : "transparent";
                              return (
                                <tr
                                  key={key}
                                  style={{ background: bg }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "var(--tr-hover-bg)")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = bg)
                                  }
                                >
                                  <td style={TD({ textAlign: "left" })}>
                                    <span
                                      style={{
                                        fontFamily: "var(--f-disp)",
                                        fontWeight: 600,
                                        color: "var(--tx1)",
                                        fontSize: "0.70rem",
                                      }}
                                    >
                                      {label}
                                    </span>
                                  </td>
                                  <td
                                    style={{
                                      ...TD(),
                                      color: pos
                                        ? "var(--profit)"
                                        : "var(--loss)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {fM(d.pnlJour)} MAD
                                  </td>
                                  <td style={{ ...TD(), color: "var(--warn)" }}>
                                    {fM(d.finTotal)} MAD
                                  </td>
                                  <td
                                    style={{ ...TD(), color: "var(--profit)" }}
                                  >
                                    {fM(d.best)} MAD
                                  </td>
                                  <td style={{ ...TD(), color: "var(--loss)" }}>
                                    {fM(d.worst)} MAD
                                  </td>
                                  <td style={{ ...TD(), color: "var(--tx3)" }}>
                                    {d.days}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>

          {/* SECTION 4 : LIMITES */}
          <div
            className="awb-report-section awb-page-break"
            style={{ display: activeTab === "limites" ? "block" : "none" }}
          >
            <div className="awb-section-label" style={{ display: "none" }}>
              4 / 4 — Suivi des Limites Réglementaires
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Dynamic limits from real portfolio data */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 12,
                }}
              >
                {(() => {
                  // FX rates (fallback to indicative values if not loaded yet)
                  const bd = globalDashboard?.breakdown;
                  const eurMad = parseFloat(rates?.eurMad || 10.418);
                  const usdMad = parseFloat(rates?.usdMad || 9.251);

                  // Consommation réelle (nominal en MAD) par catégorie, issue du portefeuille
                  const usedMadByCategory = {
                    EUROBONDS: parseFloat(bd?.EUROBOND?.nominalMad || 0),
                    CLN_MOROC: parseFloat(bd?.CLN?.nominalMad || 0),
                    CLN_GCC: 0,
                    EGP_BILLS: parseFloat(bd?.EGP_BILL?.nominalMad || 0),
                  };
                  const fxByCurrency = { EUR: eurMad, USD: usdMad };

                  // Plafonds pilotés par l'admin — source unique : useGovernance.
                  const limitsSource = exposureLimits.map((l) => ({
                    label: l.portfolioName,
                    limit: parseFloat(l.limitMeur) * 1e6,
                    currency: l.currency || "EUR",
                    color: l.colorToken || "var(--cyan)",
                    category: l.category,
                  }));

                  const dynamicLimits = limitsSource.map((l) => {
                    const usedMad = usedMadByCategory[l.category] ?? 0;
                    const fx = fxByCurrency[l.currency] || eurMad;
                    return { ...l, used: usedMad / fx };
                  });

                  return dynamicLimits.map((l) => (
                    <LimitGauge key={l.label} {...l} />
                  ));
                })()}
              </div>

              <div className="card" style={{ padding: "16px 18px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    marginBottom: 14,
                  }}
                >
                  <Shield size={13} style={{ color: "#9B3EEF" }} />
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
                    Limites de Duration
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                  }}
                >
                  {(() => {
                    const _usdMad = parseFloat(rates?.usdMad || 9.251);
                    const _eurMad = parseFloat(rates?.eurMad || 10.418);
                    // Nominal-weighted avg duration using MAD-equivalent nominal as weight
                    const wAvgDur = (rows, nomKey) => {
                      const [sumWD, sumW] = rows.reduce(([wd, w], r) => {
                        // dashboardRows → modifiedDuration, ExternalPnlSnapshot → duration
                        const dur = parseFloat(r.modifiedDuration || r.duration || 0);
                        const nom = parseFloat(r[nomKey] || r.netNominal || 0);
                        const fxR = (r.currency || "USD").toUpperCase() === "EUR" ? _eurMad : _usdMad;
                        const nomMad = nom * fxR;
                        return [wd + dur * nomMad, w + nomMad];
                      }, [0, 0]);
                      return sumW > 0 ? (sumWD / sumW).toFixed(2) : "—";
                    };
                    // Plafonds de duration pilotés par l'admin (PortfolioLimit.maxDurationYears).
                    // Repli sur les valeurs par défaut si le backend n'a pas encore répondu.
                    const durByCat = {};
                    (exposureLimits || []).forEach((l) => {
                      const d = parseFloat(l.maxDurationYears);
                      if (l.category && !Number.isNaN(d)) durByCat[l.category] = d;
                    });
                    const maxDur = (cat, fallback) =>
                      durByCat[cat] != null ? durByCat[cat] : fallback;
                    return [
                    {
                      label: "Eurobonds (Maroc+OCP)",
                      max: maxDur("EUROBONDS", 7.0),
                      current: parseFloat(wAvgDur(dashboardRows.filter(r => (r.subAsset||"").toLowerCase().includes("bond")), "netNominal") || 0),
                      color: "var(--eb)",
                    },
                    {
                      label: "CLN",
                      max: maxDur("CLN_MOROC", 5.0),
                      current: parseFloat(wAvgDur(clnList.filter(r => r.duration || r.modifiedDuration), "nominalUsd") || 0),
                      color: "var(--cln)",
                    },
                    {
                      label: "EGP Bills",
                      max: maxDur("EGP_BILLS", 1.0),
                      current: parseFloat(wAvgDur(egpList.filter(r => r.duration || r.modifiedDuration), "nominalUsd") || 0),
                      color: "var(--egp)",
                    },
                  ]})().map(({ label, max, current, color }) => {
                    const pct = max > 0 ? (parseFloat(current) / max) * 100 : 0;
                    const over = pct > 100, warn = pct > 85;
                    const col = over ? "#ff4d4f" : warn ? "#faad14" : color;
                    return (
                      <Card
                        key={label}
                        size="small"
                        style={{ borderLeft: `3px solid ${col}`, border: over ? "1px solid rgba(255,77,79,0.35)" : undefined }}
                        styles={{ body: { padding: "12px 14px" } }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.64rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--tx1)" }}>{label}</span>
                          <div style={{ display: "flex", gap: 5 }}>
                            {over  && <Tag color="error"   style={{ margin: 0, fontFamily: "var(--f-disp)", fontWeight: 800, fontSize: "0.50rem", letterSpacing: "0.09em" }}>LIMITE</Tag>}
                            {!over && warn && <Tag color="warning" style={{ margin: 0, fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.50rem" }}>ATTENTION</Tag>}
                            {!over && !warn && <Tag color="success" style={{ margin: 0, fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: "0.50rem" }}>OK</Tag>}
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                          <span style={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: "1.10rem", color: col, letterSpacing: "-0.02em" }}>{current} ans</span>
                          <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.62rem", color: "var(--tx3)" }}>/ {max} ans max</span>
                        </div>
                        <Progress
                          percent={parseFloat(Math.min(pct, 100).toFixed(1))}
                          strokeColor={col}
                          trailColor="var(--elev)"
                          showInfo={false}
                          size={["100%", 5]}
                          style={{ margin: "8px 0 0" }}
                        />
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div
                className="awb-print-only"
                style={{
                  display: "none",
                  marginTop: 24,
                  padding: "10px 14px",
                  borderTop: "1px solid #1A3A5C",
                }}
              >
                <div
                  style={{
                    fontFamily: "IBM Plex Mono,monospace",
                    fontSize: "6pt",
                    color: "#4A6A84",
                    lineHeight: 1.6,
                  }}
                >
                  Document CONFIDENTIEL · Attijariwafa Bank — Desk International
                  Fixed Income · {printDate}
                  <br />
                  Les informations contenues dans ce rapport sont générées
                  automatiquement à partir des données de marché du jour et sont
                  destinées exclusivement au personnel autorisé du Desk
                  International. Toute reproduction ou diffusion est strictement
                  interdite sans autorisation préalable de la Direction des
                  Risques.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportingView;
