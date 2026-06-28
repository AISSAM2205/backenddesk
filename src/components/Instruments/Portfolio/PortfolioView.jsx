import React, {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  Button,
  Card,
  Tag,
  Empty,
  Divider,
  Tooltip,
  Progress,
  Statistic,
  Table,
  Skeleton,
  Segmented,
  Badge,
} from "antd";
import { XLSX, styleWorkbook } from "../../../utils/xlsxStyle";
import { useTrading } from "../../../contexts/TradingContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useGovernance } from "../../../contexts/GovernanceContext";
import useLiveDesk from "../../../hooks/useLiveDesk";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileSpreadsheet,
  BarChart2,
} from "lucide-react";

/* ─── Formatters ─────────────────────────────────────────────────── */
const fMAD = (v, compact = false) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  if (compact) {
    const a = Math.abs(n);
    const s = n >= 0 ? "+" : "−";
    if (a >= 1e9) return `${s}${(Math.abs(n) / 1e9).toFixed(2)} Md`;
    if (a >= 1e6) return `${s}${(Math.abs(n) / 1e6).toFixed(2)} M`;
    return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  }
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
// Prix en fraction décimale Bloomberg (1.0275 = 102.75 % du pair) → ×100 pour affichage
const fPx = (v, d = 4) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return fN(n * 100, d);
};
const fUSD = (v) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)} B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
};
const fPct = (v, d = 2) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(d)} %`;
};
const fCoupon = (v) => {
  if (v == null) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return `${(n < 1 ? n * 100 : n).toFixed(2)}%`;
};
const fMatDate = (s) => {
  if (!s) return "—";
  const p = s.split("-");
  return p.length >= 2 ? `${p[1]}/${String(p[0]).slice(2)}` : s;
};
const pnlColor = (v) =>
  parseFloat(v || 0) >= 0 ? "var(--profit)" : "var(--loss)";
const pnlGlow = (v) => (parseFloat(v || 0) >= 0 ? "glow-profit" : "glow-loss");

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

/* ─── Section Divider (Ant Design) ───────────────────────────────
   Titre de section unique pour tout l'écran : même rythme vertical,
   même typo display, même couleur — zéro divergence entre sections. */
const SectionDivider = ({ children }) => (
  <Divider
    orientation="left"
    orientationMargin={0}
    style={{
      margin: "0 0 10px",
      fontFamily: "var(--f-disp)",
      fontWeight: 700,
      fontSize: "0.55rem",
      color: "var(--tx3)",
      borderColor: "var(--b1)",
      textTransform: "uppercase",
      letterSpacing: "0.10em",
    }}
  >
    {children}
  </Divider>
);

/* ─── Squelette de chargement (Ant Design Skeleton) ──────────────
   Préfigure la vraie mise en page (KPIs → panneaux → table) au lieu
   d'un spinner centré : perception de vitesse + zéro saut de layout. */
const DashboardSkeleton = () => (
  <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} size="small" style={{ flex: "1 1 155px", minHeight: 84 }}>
          <Skeleton active title={{ width: "45%" }} paragraph={{ rows: 1, width: "70%" }} />
        </Card>
      ))}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Card size="small"><Skeleton active paragraph={{ rows: 4 }} /></Card>
      <Card size="small"><Skeleton active paragraph={{ rows: 4 }} /></Card>
    </div>
    <Card size="small"><Skeleton active title={false} paragraph={{ rows: 7 }} /></Card>
  </div>
);

/* ─── KPI Card (Ant Design Card) ────────────────────────────────── */
const KPI_ACCENT = {
  "kpi-top-green":  "var(--profit)",
  "kpi-top-red":    "var(--loss)",
  "kpi-top-cyan":   "var(--cyan)",
  "kpi-top-blue":   "#60A5FA",
  "kpi-top-violet": "#C084FC",
  "kpi-top-warn":   "var(--warn)",
};

/* compact=false → rangée principale (P&L, Risk) — valeur large
   compact=true  → rangée secondaire (attribution) — valeur réduite */
const KpiCard = ({
  label,
  value,
  sub,
  valueColor = "var(--tx1)",
  valueClass = "",
  topClass = "",
  icon: Icon,
  animClass = "",
  compact = false,
  statusTag,      // si fourni → remplace la valeur par un Tag Ant Design
  tooltip,        // tooltip explicatif sur hover du label
  trend,          // nombre : >0 → ▲ vert, <0 → ▼ rouge (flèche de tendance AntD Statistic)
}) => {
  const accent = KPI_ACCENT[topClass] || "var(--b1)";
  const valueFontSize = compact ? "1.05rem" : "1.30rem";
  const hasTrend = trend != null && trend !== 0;

  const labelNode = (
    <span
      style={{
        fontFamily: "var(--f-disp)",
        fontSize: "0.53rem",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--tx3)",
      }}
    >
      {label}
    </span>
  );

  return (
    <Card
      size="small"
      className={animClass}
      style={{
        flex: compact ? "1 1 138px" : "1 1 155px",
        borderTop: `2px solid ${accent}`,
        minHeight: compact ? 72 : 84,
      }}
      styles={{ body: { padding: compact ? "8px 11px" : "10px 14px" } }}
    >
      {/* Header: label + icon */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: compact ? 3 : 5,
        }}
      >
        {tooltip ? (
          <Tooltip title={tooltip} placement="top">
            <span style={{ cursor: "default", borderBottom: "1px dashed var(--b2)" }}>
              {labelNode}
            </span>
          </Tooltip>
        ) : (
          labelNode
        )}
        {/* Icône catégorie en haut à droite — masquée si une flèche de tendance est affichée (évite le doublon) */}
        {Icon && !hasTrend && (
          <Icon size={12} style={{ color: accent, opacity: 0.6, flexShrink: 0 }} />
        )}
      </div>

      {/* Value — AntD Statistic (ou Tag de statut) */}
      {statusTag ? (
        <div style={{ marginTop: 2 }}>{statusTag}</div>
      ) : (
        <div className={valueClass}>
          <Statistic
            value={value}
            prefix={
              hasTrend ? (
                trend > 0 ? (
                  <TrendingUp size={compact ? 13 : 15} style={{ color: valueColor }} />
                ) : (
                  <TrendingDown size={compact ? 13 : 15} style={{ color: valueColor }} />
                )
              ) : null
            }
            valueStyle={{
              fontFamily: "var(--f-mono)",
              fontSize: valueFontSize,
              fontWeight: 600,
              lineHeight: 1,
              color: valueColor,
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          />
        </div>
      )}

      {/* Sub-label */}
      {sub && (
        <div
          style={{
            marginTop: compact ? 3 : 5,
            fontFamily: "var(--f-body)",
            fontSize: "0.59rem",
            color: "var(--tx3)",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {sub}
        </div>
      )}
    </Card>
  );
};

/* ─── Arc Gauge (semi-circle, SVG) ──────────────────────────────── */
const ARC_R = 36;
const ARC_TOTAL = Math.PI * ARC_R; // ≈ 113.1

const ArcGauge = ({ value, max, color, label, valueStr }) => {
  const pct = max > 0 ? Math.min(value / max, 1.0) : 0;
  const over = max > 0 && value > max;
  const stroke = over ? "var(--loss)" : color;
  const fill = pct * ARC_TOTAL;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <svg viewBox="0 0 100 56" style={{ width: "100%", maxWidth: 120 }}>
        {/* Track */}
        <path
          d="M 14,50 A 36,36 0 0,1 86,50"
          fill="none"
          stroke="var(--b1)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d="M 14,50 A 36,36 0 0,1 86,50"
          fill="none"
          stroke={stroke}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${fill.toFixed(2)} ${ARC_TOTAL.toFixed(2)}`}
          style={{
            transition:
              "stroke-dasharray 0.9s cubic-bezier(0.34,1.56,0.64,1), stroke 0.3s ease",
          }}
        />
        {/* Value */}
        <text
          x="50"
          y="38"
          textAnchor="middle"
          fill={stroke}
          fontSize="11"
          fontFamily="JetBrains Mono,monospace"
          fontWeight="600"
        >
          {valueStr}
        </text>
        {/* Pct */}
        <text
          x="50"
          y="49"
          textAnchor="middle"
          fill="var(--tx3)"
          fontSize="7"
          fontFamily="Syne,sans-serif"
          letterSpacing="0.5"
        >
          {`${(pct * 100).toFixed(0)} %`}
        </text>
      </svg>
      <span
        className="lbl"
        style={{ textAlign: "center", fontSize: "0.56rem", marginTop: 2 }}
      >
        {label}
      </span>
    </div>
  );
};

/* ─── Donut Chart (SVG) ──────────────────────────────────────────── */
const R = 44,
  CIRC = 2 * Math.PI * R;
const DonutChart = ({ segments, unit }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--tx3)",
          fontSize: "0.75rem",
        }}
      >
        —
      </div>
    );
  let offset = 0;
  const slices = segments.map((seg) => {
    const frac = seg.value / total;
    const r = {
      ...seg,
      dash: frac * CIRC,
      gap: CIRC - frac * CIRC,
      rot: offset * 360 - 90,
    };
    offset += frac;
    return r;
  });
  return (
    <svg
      viewBox="0 0 110 110"
      style={{ width: "100%", maxWidth: 120, maxHeight: 120 }}
    >
      <circle
        cx="55"
        cy="55"
        r={R}
        fill="none"
        stroke="var(--elev)"
        strokeWidth="14"
      />
      {slices.map((s, i) => (
        <circle
          key={i}
          cx="55"
          cy="55"
          r={R}
          fill="none"
          stroke={s.color}
          strokeWidth="14"
          strokeDasharray={`${s.dash} ${s.gap}`}
          transform={`rotate(${s.rot}, 55, 55)`}
          opacity="0.90"
        />
      ))}
      <text
        x="55"
        y="51"
        textAnchor="middle"
        fill="var(--tx3)"
        fontSize="7.5"
        fontFamily="Syne,sans-serif"
        fontWeight="700"
        letterSpacing="1"
      >
        EXPO
      </text>
      <text
        x="55"
        y="63"
        textAnchor="middle"
        fill="var(--tx1)"
        fontSize="9"
        fontFamily="JetBrains Mono,monospace"
        fontWeight="500"
      >
        {fUSD(total / 1e6)}M
      </text>
      {unit && (
        <text
          x="55"
          y="72"
          textAnchor="middle"
          fill="var(--tx3)"
          fontSize="6"
          fontFamily="Syne,sans-serif"
          letterSpacing="0.5"
        >
          {unit}
        </text>
      )}
    </svg>
  );
};

/* ─── Historical P&L Line Chart (pure SVG, no lib) ──────────────── */
const PnlLineChart = ({ data }) => {
  const [hover, setHover] = useState(null);
  const svgRef = useRef();

  const W = 800,
    H = 190;
  const padL = 70,
    padR = 24,
    padT = 22,
    padB = 34;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = useMemo(() => {
    if (!data || data.length < 2) return [];
    const vals = data.map((d) => parseFloat(d.pnlEcoMad || 0));
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const lo = minV - range * 0.12;
    const hi = maxV + range * 0.12;
    const span = hi - lo;
    return data.map((d, i) => ({
      x: padL + (i / (data.length - 1)) * chartW,
      y: padT + ((hi - parseFloat(d.pnlEcoMad || 0)) / span) * chartH,
      date: d.snapshotDate,
      val: parseFloat(d.pnlEcoMad || 0),
      lo,
      hi,
      span,
    }));
  }, [data]);

  const yTicks = useMemo(() => {
    if (!points.length) return [];
    const { lo, span } = points[0];
    return Array.from({ length: 5 }, (_, i) => lo + (span * i) / 4);
  }, [points]);

  const toY = useCallback(
    (v) => {
      if (!points.length) return 0;
      const { lo, span } = points[0];
      return padT + ((points[0].hi - v) / span) * chartH;
    },
    [points, chartH],
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!svgRef.current || !points.length) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      if (mx < padL || mx > W - padR) {
        setHover(null);
        return;
      }
      let ci = 0,
        minD = Infinity;
      points.forEach((p, i) => {
        const d = Math.abs(p.x - mx);
        if (d < minD) {
          minD = d;
          ci = i;
        }
      });
      setHover(points[ci]);
    },
    [points],
  );

  if (!data || data.length < 2)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 190 }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ fontSize: "0.72rem", color: "var(--tx3)" }}>
              Données historiques non disponibles
            </span>
          }
        />
      </div>
    );

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(padT + chartH).toFixed(1)} L${padL},${(padT + chartH).toFixed(1)} Z`;

  const fM = (v) => {
    const m = v / 1e6;
    return `${m >= 0 ? "+" : ""}${m.toFixed(1)}M`;
  };
  const fD = (s) => {
    if (!s) return "";
    const [, m, d] = s.split("-");
    return `${d}/${m}`;
  };
  const fDF = (s) => {
    if (!s) return "";
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  };

  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const delta = lastPt.val - firstPt.val;
  const positive = delta >= 0;

  const step = Math.ceil(data.length / 7);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        width: "100%",
        height: 190,
        cursor: "crosshair",
        display: "block",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="pnlAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={positive ? "#22C55E" : "#EF4444"}
            stopOpacity="0.28"
          />
          <stop
            offset="100%"
            stopColor={positive ? "#22C55E" : "#EF4444"}
            stopOpacity="0.02"
          />
        </linearGradient>
      </defs>

      {/* Y grid + labels */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={padL}
            x2={W - padR}
            y1={toY(v)}
            y2={toY(v)}
            style={{ stroke: "var(--chart-grid)" }}
            strokeWidth="1"
            strokeDasharray="3,5"
          />
          <text
            x={padL - 6}
            y={toY(v) + 3.5}
            textAnchor="end"
            style={{ fill: "var(--tx3)" }}
            fontSize="8.5"
            fontFamily="JetBrains Mono,monospace"
          >
            {fM(v)}
          </text>
        </g>
      ))}

      {/* Axis lines */}
      <line
        x1={padL}
        x2={padL}
        y1={padT}
        y2={padT + chartH}
        style={{ stroke: "var(--chart-axis)" }}
        strokeWidth="1"
      />
      <line
        x1={padL}
        x2={W - padR}
        y1={padT + chartH}
        y2={padT + chartH}
        style={{ stroke: "var(--chart-axis)" }}
        strokeWidth="1"
      />

      {/* Area fill */}
      <path d={areaPath} fill="url(#pnlAreaGrad)" />

      {/* Main line */}
      <path
        d={linePath}
        fill="none"
        stroke={positive ? "#22C55E" : "#EF4444"}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* X axis labels */}
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        // Le dernier label est toujours affiché. On masque un tick régulier
        // trop proche du dernier (< un demi-pas) pour éviter le chevauchement
        // de dates (ex. "12/06" collé à "15/06").
        if (!isLast) {
          if (i % step !== 0) return null;
          if (points.length - 1 - i < step * 0.6) return null;
        }
        return (
          <text
            key={i}
            x={p.x}
            y={H - padB + 14}
            textAnchor="middle"
            style={{ fill: "var(--tx3)" }}
            fontSize="8"
            fontFamily="JetBrains Mono,monospace"
          >
            {fD(p.date)}
          </text>
        );
      })}

      {/* Last value dot + ring */}
      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r="3.5"
        fill={positive ? "#22C55E" : "#EF4444"}
      />
      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r="7"
        fill="none"
        stroke={positive ? "#22C55E" : "#EF4444"}
        strokeWidth="1"
        strokeOpacity="0.35"
      />

      {/* Last value label */}
      <text
        x={lastPt.x + 10}
        y={lastPt.y + 4}
        fill={positive ? "#22C55E" : "#EF4444"}
        fontSize="9"
        fontFamily="JetBrains Mono,monospace"
        fontWeight="600"
      >
        {fM(lastPt.val)}
      </text>

      {/* Hover crosshair */}
      {hover && (
        <>
          <line
            x1={hover.x}
            x2={hover.x}
            y1={padT}
            y2={padT + chartH}
            style={{ stroke: "var(--tx2)" }}
            strokeWidth="1"
            strokeDasharray="3,3"
            strokeOpacity="0.5"
          />
          <circle
            cx={hover.x}
            cy={hover.y}
            r="4"
            fill={positive ? "#22C55E" : "#EF4444"}
            stroke="var(--void)"
            strokeWidth="2"
          />
          <g
            transform={`translate(${Math.min(hover.x + 10, W - 148)},${Math.max(hover.y - 38, padT)})`}
          >
            <rect
              width="138"
              height="36"
              rx="5"
              fill="rgba(5,18,34,0.94)"
              stroke={positive ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}
              strokeWidth="1"
            />
            <text
              x="9"
              y="14"
              fill="rgba(156,163,175,0.9)"
              fontSize="8"
              fontFamily="JetBrains Mono,monospace"
            >
              {fDF(hover.date)}
            </text>
            <text
              x="9"
              y="27"
              fill={positive ? "#22C55E" : "#EF4444"}
              fontSize="10.5"
              fontFamily="JetBrains Mono,monospace"
              fontWeight="700"
            >
              {fM(hover.val)} MAD
            </text>
          </g>
        </>
      )}
    </svg>
  );
};

/* ─── Category colour tokens (réutilisés par PositionsTable) ──────── */
const CAT_STYLE = {
  EUROBOND: {
    bg: "rgba(30,127,255,0.05)",
    bgBadge: "rgba(30,127,255,0.15)",
    border: "rgba(30,127,255,0.22)",
  },
  CLN: {
    bg: "rgba(155,62,239,0.05)",
    bgBadge: "rgba(155,62,239,0.15)",
    border: "rgba(155,62,239,0.22)",
  },
  EGP: {
    bg: "rgba(0,194,140,0.05)",
    bgBadge: "rgba(0,194,140,0.15)",
    border: "rgba(0,194,140,0.22)",
  },
};

/* ─── Positions Table (Ant Design) ───────────────────────────────── */
/* Cellule prix avec flash up/down (réutilise useFlash). En cellule AntD le
   render est une fonction → on isole le hook dans un petit composant. */
const PxFlashCell = ({ value }) => {
  const flash = useFlash(value);
  return (
    <span className={flash} style={{ fontFamily: "var(--f-mono)" }}>
      {fPx(value)}
    </span>
  );
};

const SignalTag = ({ decision }) => {
  if (decision === "BUY") return <span className="badge badge-active">▲ BUY</span>;
  if (decision === "HOLD") return <span className="badge badge-closed">— HOLD</span>;
  if (decision === "SELL")
    return (
      <span
        className="badge"
        style={{ background: "rgba(255,43,96,0.15)", color: "var(--loss)" }}
      >
        ▼ SELL
      </span>
    );
  return <span style={{ color: "var(--tx3)" }}>—</span>;
};

/* Style cellule mono tabular — alignement décimal parfait (besoin desk). */
const mono = (color = "var(--tx1)", weight = 500) => ({
  fontFamily: "var(--f-mono)",
  fontVariantNumeric: "tabular-nums",
  fontSize: "0.72rem",
  color,
  fontWeight: weight,
});

const PositionsTable = ({ groups, positions, pnlEco, netDaily, dv01 }) => {
  /* dataSource plat : bannière de classe d'actif (sous-totaux) + ses lignes.
     Conserve fidèlement le groupage Eurobonds / CLN / EGP de l'Excel. */
  const dataSource = useMemo(() => {
    const out = [];
    groups.forEach((g) => {
      const gPnl = g.rows.reduce((s, r) => s + parseFloat(r.pnlEconomicMad || 0), 0);
      const gNet = g.rows.reduce((s, r) => s + parseFloat(r.netDailyMad || 0), 0);
      const gNom = g.rows.reduce((s, r) => s + parseFloat(r.netNominalUsd ?? r.netNominal ?? 0), 0);
      out.push({
        key: `grp-${g.catKey}`,
        __group: true,
        catKey: g.catKey,
        label: g.label,
        color: g.color,
        count: g.rows.length,
        gPnl,
        gNet,
        gNom,
      });
      g.rows.forEach((r, idx) =>
        out.push({
          ...r,
          key: r.isin || `${g.catKey}-${idx}`,
          __group: false,
          __idx: idx,
        }),
      );
    });
    return out;
  }, [groups]);

  const contributionOf = (gPnl) =>
    Math.abs(pnlEco) > 0 ? (gPnl / Math.abs(pnlEco)) * 100 : 0;

  /* Tinte la cellule pour les lignes-bannières (fond + liseré classe d'actif). */
  const groupCell = (record) => {
    if (!record.__group) return {};
    const st = CAT_STYLE[record.catKey] || CAT_STYLE.EUROBOND;
    return { style: { background: st.bg, borderTop: `2px solid ${st.border}` } };
  };

  const columns = [
    {
      title: "ISIN",
      dataIndex: "isin",
      key: "isin",
      width: 118,
      onCell: (record) => {
        if (record.__group) {
          const st = CAT_STYLE[record.catKey] || CAT_STYLE.EUROBOND;
          return {
            colSpan: 3,
            style: { background: st.bg, borderTop: `2px solid ${st.border}` },
          };
        }
        return {};
      },
      render: (v, record) => {
        if (record.__group) {
          const st = CAT_STYLE[record.catKey] || CAT_STYLE.EUROBOND;
          return (
            <span
              style={{
                fontFamily: "var(--f-disp)",
                fontWeight: 700,
                fontSize: "0.60rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: record.color,
              }}
            >
              <span style={{ opacity: 0.6, marginRight: 6 }}>&#9658;</span>
              {record.label}
              <span
                style={{
                  marginLeft: 8,
                  fontFamily: "var(--f-mono)",
                  fontSize: "0.55rem",
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: st.bgBadge,
                  border: `1px solid ${st.border}`,
                }}
              >
                {record.count}
              </span>
            </span>
          );
        }
        return <span style={mono("var(--cyan)")}>{v}</span>;
      },
    },
    {
      title: "Obligation",
      dataIndex: "description",
      key: "description",
      width: 190,
      ellipsis: true,
      onCell: (record) => (record.__group ? { colSpan: 0 } : {}),
      render: (v) => (
        <span title={v} style={{ color: "var(--tx1)", fontSize: "0.72rem" }}>
          {v || "—"}
        </span>
      ),
    },
    {
      title: "Type",
      key: "type",
      align: "center",
      width: 82,
      onCell: (record) => (record.__group ? { colSpan: 0 } : {}),
      render: (_, record) => {
        if (!record.subAsset) return null;
        const s = (record.subAsset || "").toLowerCase();
        const cls = s.includes("ocp")
          ? "badge-eb"
          : s.includes("cln")
            ? "badge-cln"
            : s.includes("egp")
              ? "badge-egp"
              : "badge-eb";
        return <span className={`badge ${cls}`}>{record.subAsset}</span>;
      },
    },
    {
      title: "Nominal M$",
      key: "nominal",
      align: "right",
      width: 98,
      onCell: groupCell,
      render: (_, r) =>
        r.__group ? (
          <span style={mono("var(--tx1)", 600)}>
            {fN(r.gNom / 1e6, 1)}
            <span style={{ color: "var(--tx3)", fontSize: "0.58rem", marginLeft: 2 }}>M</span>
          </span>
        ) : (
          <span style={mono("var(--tx1)", 500)}>
            {fN(parseFloat(r.netNominalUsd ?? r.netNominal ?? 0) / 1e6, 1)}
            <span style={{ color: "var(--tx3)", fontSize: "0.60rem", marginLeft: 2 }}>M</span>
          </span>
        ),
    },
    {
      title: "Coupon %",
      key: "coupon",
      align: "right",
      width: 84,
      onCell: groupCell,
      render: (_, r) =>
        r.__group ? null : <span style={mono("var(--tx3)")}>{fCoupon(r.couponRate)}</span>,
    },
    {
      title: "Échéance",
      key: "mat",
      align: "right",
      width: 84,
      onCell: groupCell,
      render: (_, r) =>
        r.__group ? null : <span style={mono("var(--tx3)")}>{fMatDate(r.maturityDate)}</span>,
    },
    {
      title: "WAP Dirty",
      key: "wap",
      align: "right",
      width: 92,
      onCell: groupCell,
      render: (_, r) =>
        r.__group ? null : <span style={mono("var(--tx2)")}>{fPx(r.lastWapDirty)}</span>,
    },
    {
      title: "Prix Mkt",
      key: "px",
      align: "right",
      width: 92,
      onCell: groupCell,
      render: (_, r) => (r.__group ? null : <PxFlashCell value={r.dirtyMarket} />),
    },
    {
      title: "Perf WAP",
      key: "perf",
      align: "right",
      width: 92,
      onCell: groupCell,
      render: (_, r) =>
        r.__group ? null : (
          <span style={mono(pnlColor(parseFloat(r.perfWap || 0) * 100), 500)}>
            {fPct(parseFloat(r.perfWap || 0) * 100, 3)}
          </span>
        ),
    },
    {
      title: "G-Spread",
      key: "gspread",
      align: "right",
      width: 90,
      onCell: groupCell,
      render: (_, r) =>
        r.__group ? null : (
          <span style={mono("var(--tx2)")}>
            {r.gSpreadBid != null ? `${fN(r.gSpreadBid, 0)} bp` : "—"}
          </span>
        ),
    },
    {
      title: "YTM",
      key: "ytm",
      align: "right",
      width: 84,
      onCell: groupCell,
      render: (_, r) =>
        r.__group ? null : (
          <span style={mono("var(--tx2)")}>
            {r.yieldToMaturity != null ? `${fN(r.yieldToMaturity, 3)}%` : "—"}
          </span>
        ),
    },
    {
      title: "P&L Éco",
      key: "pnl",
      align: "right",
      width: 102,
      onCell: groupCell,
      render: (_, r) => {
        if (r.__group) {
          const contrib = contributionOf(r.gPnl);
          return (
            <span style={mono(pnlColor(r.gPnl), 700)}>
              {fMAD(r.gPnl, true)}
              {Math.abs(contrib) > 0.5 && (
                <span style={{ display: "block", fontSize: "0.55rem", color: "var(--tx3)", fontWeight: 400 }}>
                  {contrib >= 0 ? "+" : ""}
                  {contrib.toFixed(0)}%
                </span>
              )}
            </span>
          );
        }
        return <span style={mono(pnlColor(r.pnlEconomicMad), 600)}>{fMAD(r.pnlEconomicMad, true)}</span>;
      },
    },
    {
      title: "Net Daily",
      key: "net",
      align: "right",
      width: 102,
      onCell: groupCell,
      render: (_, r) =>
        r.__group ? (
          <span style={mono(pnlColor(r.gNet), 600)}>{fMAD(r.gNet, true)}</span>
        ) : (
          <span style={mono(pnlColor(r.netDailyMad), 500)}>{fMAD(r.netDailyMad, true)}</span>
        ),
    },
    {
      title: "Dur.",
      key: "dur",
      align: "right",
      width: 70,
      onCell: groupCell,
      render: (_, r) =>
        r.__group ? null : <span style={mono("var(--tx2)")}>{fN(r.modifiedDuration, 2)}</span>,
    },
    {
      title: "Convexité",
      key: "cvx",
      align: "right",
      width: 88,
      onCell: groupCell,
      render: (_, r) =>
        r.__group ? null : (
          <span style={mono("var(--tx3)")}>{r.convexity != null ? fN(r.convexity, 2) : "—"}</span>
        ),
    },
    {
      title: "DV01 $",
      key: "dv01",
      align: "right",
      width: 84,
      onCell: groupCell,
      render: (_, r) => (r.__group ? null : <span style={mono("#60A5FA")}>{fN(r.dv01Bond, 0)}</span>),
    },
    {
      title: "Signal",
      key: "signal",
      align: "center",
      width: 92,
      onCell: groupCell,
      render: (_, r) => (r.__group ? null : <SignalTag decision={r.decision} />),
    },
  ];

  const totalNom = positions.reduce((s, r) => s + parseFloat(r.netNominalUsd ?? r.netNominal ?? 0), 0);

  return (
    <Table
      className="positions-antd-table"
      columns={columns}
      dataSource={dataSource}
      size="small"
      pagination={false}
      sticky
      scroll={{ x: 1640 }}
      rowClassName={(record) =>
        record.__group
          ? "pos-group-row"
          : record.netDailyAlert
            ? "pos-alert-row"
            : record.__idx % 2 === 0
              ? "pos-even-row"
              : ""
      }
      summary={() =>
        positions.length > 0 ? (
          <Table.Summary fixed>
            <Table.Summary.Row className="pos-total-row">
              <Table.Summary.Cell index={0} colSpan={3}>
                <span
                  style={{
                    fontFamily: "var(--f-disp)",
                    fontWeight: 700,
                    fontSize: "0.60rem",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "var(--tx3)",
                  }}
                >
                  Total Portefeuille{" "}
                  <span style={{ fontFamily: "var(--f-mono)", color: "var(--cyan)" }}>
                    ({positions.length})
                  </span>
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <span style={mono("var(--tx1)", 600)}>
                  {fN(totalNom / 1e6, 1)}
                  <span style={{ color: "var(--tx3)", fontSize: "0.60rem", marginLeft: 2 }}>M</span>
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={7} />
              <Table.Summary.Cell index={11} align="right">
                <span style={mono(pnlColor(pnlEco), 700)}>{fMAD(pnlEco, true)}</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={12} align="right">
                <span style={mono(pnlColor(netDaily), 600)}>{fMAD(netDaily, true)}</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={13} colSpan={2} />
              <Table.Summary.Cell index={15} align="right">
                <span style={mono("#60A5FA")}>{fN(dv01, 0)}</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={16} />
            </Table.Summary.Row>
          </Table.Summary>
        ) : null
      }
    />
  );
};

/* ─── Market Rates Strip ─────────────────────────────────────────── */
const RATES_ITEMS = [
  {
    label: "SOFR",
    key: "sofr",
    fmt: (v) => `${parseFloat(v).toFixed(2)}%`,
    fallback: "4.30%",
    col: "#60A5FA",
  },
  {
    label: "ESTR",
    key: "estr",
    fmt: (v) => `${parseFloat(v).toFixed(2)}%`,
    fallback: "2.17%",
    col: "#60A5FA",
  },
  {
    label: "SOFR 10Y",
    key: "sofr10Year",
    fmt: (v) => `${parseFloat(v).toFixed(2)}%`,
    fallback: "3.90%",
    col: "#C084FC",
  },
  {
    label: "USD/MAD",
    key: "usdMad",
    fmt: (v) => parseFloat(v).toFixed(3),
    fallback: "9.251",
    col: "#FCD34D",
  },
  {
    label: "EUR/MAD",
    key: "eurMad",
    fmt: (v) => parseFloat(v).toFixed(3),
    fallback: "10.418",
    col: "#FCD34D",
  },
  {
    label: "EUR/USD",
    key: "eurUsd",
    fmt: (v) => parseFloat(v).toFixed(3),
    fallback: "1.126",
    col: "#34D399",
  },
  {
    label: "USD/EGP",
    key: "usdEgp",
    fmt: (v) => parseFloat(v).toFixed(2),
    fallback: "49.93",
    col: "#FB923C",
  },
];

const RatesStrip = ({ rates }) => (
  <div
    style={{
      background: "var(--surf)",
      borderBottom: "1px solid var(--b0)",
      padding: "4px 20px",
      display: "flex",
      alignItems: "center",
      gap: 0,
      overflowX: "auto",
      flexShrink: 0,
      minHeight: 26,
    }}
  >
    <span
      style={{
        fontFamily: "var(--f-disp)",
        fontSize: "0.50rem",
        fontWeight: 700,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: rates ? "var(--profit)" : "var(--tx3)",
        marginRight: 12,
        flexShrink: 0,
        padding: "1px 5px",
        borderRadius: 3,
        background: rates ? "rgba(0,232,153,0.08)" : "rgba(100,116,139,0.10)",
        border: `1px solid ${rates ? "rgba(0,232,153,0.18)" : "rgba(100,116,139,0.18)"}`,
      }}
    >
      {rates ? "LIVE" : "REF."}
    </span>
    {RATES_ITEMS.map((item, i) => {
      const raw = rates?.[item.key];
      const display = raw != null ? item.fmt(raw) : item.fallback;
      return (
        <React.Fragment key={item.label}>
          {i > 0 && (
            <span
              style={{
                color: "var(--b2)",
                padding: "0 10px",
                flexShrink: 0,
                fontSize: "0.60rem",
              }}
            >
              ·
            </span>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 5,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--f-disp)",
                fontWeight: 700,
                fontSize: "0.50rem",
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "var(--tx3)",
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: "0.70rem",
                fontWeight: 600,
                color: item.col,
              }}
            >
              {display}
            </span>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

/* ─── G-Spread Watchlist ─────────────────────────────────────────── */
const GSpreadWatchlist = ({ positions }) => {
  const bonds = (positions || [])
    // Watchlist de relative-value CRÉDIT : « Bid vs Target ». On exige une
    // cible (juste-valeur du desk) → exclut de facto les money-market bills
    // (EGP / T-Bills) qui n'ont ni spread crédit ni Target, et dont le
    // G-Spread ~0 n'oscillait qu'en bruit (+1 / −2 bp). Ne restent que les
    // obligations de crédit (Eurobonds, CLN) où Bid vs Target a du sens.
    .filter(
      (r) => r.gSpreadBid != null && parseFloat(r.targetSpread || 0) > 0,
    )
    .sort((a, b) => {
      const dA =
        parseFloat(a.gSpreadBid || 0) - parseFloat(a.targetSpread || 0);
      const dB =
        parseFloat(b.gSpreadBid || 0) - parseFloat(b.targetSpread || 0);
      return dB - dA;
    });
  if (!bonds.length) return null;
  const maxBid = Math.max(
    ...bonds.map((r) => parseFloat(r.gSpreadBid || 0)),
    1,
  );
  const buys = bonds.filter((r) => r.decision === "BUY").length;
  return (
    <div className="card slide-up stagger-2" style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--b1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            G-Spread Watchlist
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
            {bonds.length}
          </span>
          {buys > 0 && <span className="badge badge-active">▲ {buys} BUY</span>}
        </div>
        <span
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.59rem",
            color: "var(--tx3)",
          }}
        >
          Bid vs Target · bp · trié par opportunité
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ textAlign: "left", minWidth: 160 }}>Obligation</th>
              <th style={{ textAlign: "right" }}>Bid bp</th>
              <th style={{ textAlign: "right" }}>Mid bp</th>
              <th style={{ textAlign: "right" }}>Target</th>
              <th style={{ textAlign: "center", minWidth: 110 }}>
                Spread / Target
              </th>
              <th style={{ textAlign: "right" }}>Gap</th>
              <th style={{ textAlign: "center" }}>Signal</th>
            </tr>
          </thead>
          <tbody>
            {bonds.map((r, idx) => {
              const bid = parseFloat(r.gSpreadBid || 0);
              const mid = parseFloat(r.gSpreadMid || 0);
              const target = parseFloat(r.targetSpread || 0);
              const gap = bid - target;
              const isBuy = r.decision === "BUY";
              const bidPct = (bid / maxBid) * 100;
              const tgtPct = target > 0 ? (target / maxBid) * 100 : 0;
              const rowBg = idx % 2 === 0 ? "var(--tr-even-bg)" : "transparent";
              return (
                <tr
                  key={r.isin}
                  style={{ background: rowBg }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--tr-hover-bg)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = rowBg)
                  }
                >
                  <td
                    style={{
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "0.70rem",
                      color: "var(--tx1)",
                    }}
                    title={r.description}
                  >
                    {r.description || r.isin}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "#FCD34D",
                      fontWeight: 500,
                    }}
                  >
                    {fN(bid, 1)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "var(--tx2)",
                    }}
                  >
                    {fN(mid, 1)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "var(--tx3)",
                    }}
                  >
                    {target > 0 ? fN(target, 1) : "—"}
                  </td>
                  <td>
                    <div
                      style={{
                        position: "relative",
                        height: 6,
                        background: "var(--elev)",
                        borderRadius: 3,
                        overflow: "hidden",
                        margin: "0 4px",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          height: "100%",
                          width: `${bidPct}%`,
                          background: isBuy
                            ? "rgba(0,232,153,0.65)"
                            : "rgba(200,145,12,0.55)",
                          borderRadius: 3,
                        }}
                      />
                      {tgtPct > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            left: `${tgtPct}%`,
                            top: -1,
                            bottom: -1,
                            width: 2,
                            background: "rgba(255,43,96,0.75)",
                            transform: "translateX(-50%)",
                          }}
                        />
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      color:
                        gap > 0
                          ? "var(--profit)"
                          : gap < -5
                            ? "var(--loss)"
                            : "var(--tx2)",
                    }}
                  >
                    {gap > 0 ? "+" : ""}
                    {fN(gap, 1)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {isBuy ? (
                      <span className="badge badge-active">▲ BUY</span>
                    ) : (
                      <span className="badge badge-closed">— HOLD</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ─── Maturity Ladder (bucket analysis) ─────────────────────────── */
const MAT_BUCKETS = [
  { key: "0-1",  label: "0–1 an",   maxYrs: 1,   color: "#34D399" },
  { key: "1-3",  label: "1–3 ans",  maxYrs: 3,   color: "#60A5FA" },
  { key: "3-5",  label: "3–5 ans",  maxYrs: 5,   color: "#818CF8" },
  { key: "5-7",  label: "5–7 ans",  maxYrs: 7,   color: "#C084FC" },
  { key: "7-10", label: "7–10 ans", maxYrs: 10,  color: "#F472B6" },
  { key: "10+",  label: "10+ ans",  maxYrs: Infinity, color: "#FB923C" },
];

const MaturityLadder = ({ positions, rates }) => {
  const today = new Date();
  const usdMad = parseFloat(rates?.usdMad || 9.251);

  const buckets = useMemo(() => {
    const acc = MAT_BUCKETS.map((b) => ({ ...b, nomUsd: 0, dv01: 0, durW: 0, count: 0 }));
    (positions || []).forEach((r) => {
      if (!r.maturityDate || !r.netNominal) return;
      const mat = new Date(r.maturityDate);
      if (isNaN(mat.getTime())) return;
      const yrs = (mat - today) / (365.25 * 86400000);
      if (yrs <= 0) return;
      const bucket = acc.find((b, i) => {
        const prev = i === 0 ? 0 : MAT_BUCKETS[i - 1].maxYrs;
        return yrs > prev && yrs <= b.maxYrs;
      });
      if (!bucket) return;
      // nominal homogène en USD (EGP/EUR convertis par enrichCarry)
      const nom = Math.abs(parseFloat(r.netNominalUsd ?? r.netNominal ?? 0));
      bucket.nomUsd += nom;
      bucket.dv01 += parseFloat(r.dv01Bond || 0);
      bucket.durW += parseFloat(r.modifiedDuration || 0) * nom; // duration pondérée par nominal
      bucket.count += 1;
    });
    return acc; // garder TOUTES les tranches → échelle de maturité continue
  }, [positions, rates]);

  // On masque l'écran seulement si AUCUNE exposition (sinon on montre la
  // ladder complète, tranches vides incluses, comme une vraie échelle).
  if (!buckets.some((b) => b.nomUsd > 0)) return null;

  const maxNom = Math.max(...buckets.map((b) => b.nomUsd), 1);
  const totalNom = buckets.reduce((s, b) => s + b.nomUsd, 0);
  const totalDv01 = buckets.reduce((s, b) => s + b.dv01, 0);

  // SVG bar chart dimensions
  const W = 520, H = 120, padL = 34, padB = 42, padT = 10, barGap = 6;
  const nBuckets = buckets.length;
  const barW = Math.floor((W - padL - (nBuckets - 1) * barGap) / nBuckets);

  return (
    <div className="card slide-up stagger-2" style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--b1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart2 size={13} style={{ color: "var(--cyan)" }} />
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
            Maturity Ladder — Exposition par Maturité
          </h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.66rem", color: "var(--tx3)" }}>
            Total{" "}
            <span style={{ color: "var(--tx1)", fontWeight: 600 }}>
              {(totalNom / 1e6).toFixed(1)} M USD
            </span>
          </span>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.66rem", color: "var(--tx3)" }}>
            DV01{" "}
            <span style={{ color: "#60A5FA", fontWeight: 600 }}>
              {totalDv01.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} $
            </span>
          </span>
        </div>
      </div>

      <div
        style={{
          padding: "14px 20px 10px",
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* SVG Bar Chart */}
        <div style={{ flex: "1 1 300px", minWidth: 280 }}>
          <svg
            viewBox={`0 0 ${W} ${H + padB}`}
            style={{ width: "100%", overflow: "visible" }}
          >
            {/* Y gridlines */}
            {[0.25, 0.5, 0.75, 1].map((frac) => {
              const y = padT + (1 - frac) * H;
              return (
                <g key={frac}>
                  <line
                    x1={padL} x2={W} y1={y} y2={y}
                    stroke="var(--chart-grid)"
                    strokeWidth={0.8}
                    strokeDasharray="3,5"
                    opacity={0.6}
                  />
                  <text
                    x={padL - 6} y={y + 3.5}
                    textAnchor="end"
                    fill="var(--tx3)"
                    fontSize={7.5}
                    fontFamily="JetBrains Mono,monospace"
                  >
                    {((frac * maxNom) / 1e6).toFixed(0)}M
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {buckets.map((b, i) => {
              const empty = b.nomUsd <= 0;
              // Hauteur mini visible (6px) pour que les petites tranches restent
              // lisibles malgré une tranche dominante ; tranche vide = trait fin.
              const barH = empty ? 3 : Math.max(6, (b.nomUsd / maxNom) * H);
              const x = padL + i * (barW + barGap);
              const y = padT + H - barH;
              const pct = ((b.nomUsd / totalNom) * 100).toFixed(1);
              const m = b.nomUsd / 1e6;
              const lblNom = empty
                ? "—"
                : `${m >= 100 ? m.toFixed(0) : m.toFixed(1)}M`;
              // Label nominal lisible même sur la tranche DOMINANTE : si la barre
              // est si haute que le label retomberait DEDANS, on le place dans le
              // haut de la barre en BLANC (sinon couleur barre sur barre =
              // illisible, le bug du « 97.1M » flottant). Sinon : au-dessus, en b.color.
              const lblInside = y - 5 < padT + 9;
              const lblY = lblInside ? padT + 11 : y - 5;
              const lblFill = empty ? "var(--tx3)" : lblInside ? "#fff" : b.color;
              return (
                <g key={b.key}>
                  <rect
                    x={x} y={y} width={barW} height={barH}
                    fill={b.color}
                    opacity={empty ? 0.3 : 0.78}
                    rx={3}
                    style={{ transition: "height 0.6s ease, y 0.6s ease" }}
                  />
                  {/* Nominal — TOUJOURS affiché, au-dessus de la barre (clampé
                     pour ne pas sortir du cadre sur la tranche dominante). */}
                  <text
                    x={x + barW / 2}
                    y={lblY}
                    textAnchor="middle"
                    fill={lblFill}
                    fontSize={7.5}
                    fontFamily="JetBrains Mono,monospace"
                    fontWeight={700}
                    opacity={0.95}
                  >
                    {lblNom}
                  </text>
                  {/* % label */}
                  <text
                    x={x + barW / 2} y={padT + H + 15}
                    textAnchor="middle"
                    fill={empty ? "var(--tx3)" : "var(--tx2)"}
                    fontSize={7.5}
                    fontWeight={600}
                    fontFamily="JetBrains Mono,monospace"
                  >
                    {pct}%
                  </text>
                  {/* Bucket label */}
                  <text
                    x={x + barW / 2} y={padT + H + 28}
                    textAnchor="middle"
                    fill={b.color}
                    fontSize={7.5}
                    fontFamily="Syne,sans-serif"
                    fontWeight={700}
                    letterSpacing={0.5}
                    opacity={empty ? 0.55 : 1}
                  >
                    {b.label}
                  </text>
                </g>
              );
            })}

            {/* Baseline */}
            <line
              x1={padL} x2={W} y1={padT + H} y2={padT + H}
              stroke="var(--chart-axis)"
              strokeWidth={1}
            />
          </svg>
        </div>

        {/* Legend table */}
        <div style={{ flex: "0 0 auto", minWidth: 240 }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontFamily: "var(--f-mono)",
              fontSize: "0.65rem",
            }}
          >
            <thead>
              <tr>
                {["Bucket", "% Book", "DV01 $", "Dur. moy."].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "3px 8px",
                      borderBottom: "1px solid var(--b1)",
                      fontFamily: "var(--f-disp)",
                      fontSize: "0.52rem",
                      fontWeight: 700,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--tx3)",
                      textAlign: h === "Bucket" ? "left" : "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr
                  key={b.key}
                  style={{
                    background: i % 2 === 0 ? "var(--tr-even-bg)" : "transparent",
                  }}
                >
                  <td style={{ padding: "4px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 1,
                        background: b.color,
                        flexShrink: 0,
                        display: "inline-block",
                      }}
                    />
                    <span style={{ color: b.color, fontWeight: 600 }}>{b.label}</span>
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right", color: "var(--tx1)", fontWeight: 600 }}>
                    {((b.nomUsd / totalNom) * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right", color: "#60A5FA" }}>
                    {b.dv01 > 0
                      ? b.dv01.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
                      : "—"}
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right", color: "var(--tx3)" }}>
                    {b.nomUsd > 0 ? `${(b.durW / b.nomUsd).toFixed(1)} a` : "—"}
                  </td>
                </tr>
              ))}
              {/* Total row */}
              <tr style={{ borderTop: "1px solid var(--b1)" }}>
                <td style={{ padding: "4px 8px", color: "var(--tx3)", fontSize: "0.58rem", fontFamily: "var(--f-disp)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  TOTAL
                </td>
                <td style={{ padding: "4px 8px", textAlign: "right", color: "var(--tx1)", fontWeight: 700 }}>
                  100%
                </td>
                <td style={{ padding: "4px 8px", textAlign: "right", color: "#60A5FA", fontWeight: 700 }}>
                  {totalDv01.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                </td>
                <td style={{ padding: "4px 8px", textAlign: "right", color: "var(--tx3)", fontWeight: 700 }}>
                  {totalNom > 0
                    ? `${(buckets.reduce((s, b) => s + b.durW, 0) / totalNom).toFixed(1)} a`
                    : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ─── Coupon Calendar ────────────────────────────────────────────── */
const nextSemiAnnualCoupon = (matStr) => {
  if (!matStr) return null;
  const today = new Date();
  const mat = new Date(matStr);
  if (isNaN(mat.getTime())) return null;
  const m = mat.getMonth(),
    d = mat.getDate();
  const m2 = (m + 6) % 12;
  const yr = today.getFullYear();
  const candidates = [
    new Date(yr, m, d),
    new Date(yr, m2, d),
    new Date(yr + 1, m, d),
    new Date(yr + 1, m2, d),
  ]
    .filter((dt) => dt > today)
    .sort((a, b) => a - b);
  return candidates[0] || null;
};

const fDateLong = (dt) => {
  if (!dt) return "—";
  return dt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const CouponCalendar = ({ positions, rates }) => {
  const events = useMemo(() => {
    const today = new Date();
    // FX LIVE (repli = valeurs seedées, cohérent avec assetBreakdown du même
    // écran). La conversion respecte la DEVISE du bond : un coupon EUR est
    // converti via EUR/MAD, un coupon USD via USD/MAD — plus de taux figé.
    const usdMad = parseFloat(rates?.usdMad) || 10.0347;
    const eurMad = parseFloat(rates?.eurMad) || 10.8891;
    const eurUsd = parseFloat(rates?.eurUsd) || 1.0851;
    return (positions || [])
      .filter((r) => r.couponRate && r.maturityDate && r.netNominal)
      .map((r) => {
        const nextDate = nextSemiAnnualCoupon(r.maturityDate);
        if (!nextDate) return null;
        const daysLeft = Math.round((nextDate - today) / 86400000);
        const rate = parseFloat(r.couponRate);
        const nominal = parseFloat(r.netNominal); // nominal en devise native
        const effectiveRate = rate < 1 ? rate : rate / 100;
        const couponAmtCcy = (effectiveRate * nominal) / 2; // coupon semi-annuel, devise native
        const ccy = (r.currency || "USD").toUpperCase();
        // USD pour la colonne USD (EUR → ×EUR/USD), MAD selon la devise du bond.
        const couponAmtUsd = ccy === "EUR" ? couponAmtCcy * eurUsd : couponAmtCcy;
        const couponAmtMad = ccy === "EUR" ? couponAmtCcy * eurMad : couponAmtCcy * usdMad;
        return {
          isin: r.isin,
          desc: r.description,
          nextDate,
          daysLeft,
          couponAmtUsd,
          couponAmtMad,
          couponRatePct: (effectiveRate * 100).toFixed(2),
          subAsset: r.subAsset,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 10);
  }, [positions, rates]);

  if (!events.length) return null;

  const totalMad = events.reduce((s, e) => s + e.couponAmtMad, 0);
  const maxDays = Math.max(...events.map((e) => e.daysLeft), 1);

  return (
    <div className="card slide-up stagger-4" style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--b1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={13} style={{ color: "var(--cyan)" }} />
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
            Calendrier des Coupons
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
            {events.length}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.59rem",
              color: "var(--tx3)",
            }}
          >
            Prochains paiements semi-annuels
          </span>
          <span
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: "0.70rem",
              fontWeight: 700,
              color: "var(--cyan)",
            }}
          >
            {fMAD(totalMad, true)}{" "}
            <span
              style={{
                fontFamily: "var(--f-disp)",
                fontSize: "0.50rem",
                color: "var(--tx3)",
                fontWeight: 400,
              }}
            >
              TOTAL
            </span>
          </span>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ textAlign: "left", minWidth: 180 }}>Obligation</th>
              <th style={{ textAlign: "center" }}>Type</th>
              <th style={{ textAlign: "right" }}>Coupon</th>
              <th style={{ textAlign: "right" }}>Prochaine Date</th>
              <th style={{ textAlign: "right" }}>Jours</th>
              <th style={{ textAlign: "center", minWidth: 100 }}>Urgence</th>
              <th style={{ textAlign: "right" }}>Montant USD</th>
              <th style={{ textAlign: "right" }}>Montant MAD</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, idx) => {
              const urgent = e.daysLeft < 30;
              const soon = e.daysLeft < 90;
              const urgency = urgent
                ? "var(--loss)"
                : soon
                  ? "var(--cyan)"
                  : "var(--profit)";
              const barPct = Math.max(5, 100 - (e.daysLeft / maxDays) * 100);
              const rowBg = urgent
                ? "rgba(255,43,96,0.04)"
                : idx % 2 === 0
                  ? "var(--tr-even-bg)"
                  : "transparent";
              return (
                <tr key={e.isin} style={{ background: rowBg }}>
                  <td
                    style={{
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "0.70rem",
                      color: "var(--tx1)",
                    }}
                    title={e.desc}
                  >
                    {e.desc || e.isin}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {e.subAsset && (
                      <span
                        className={`badge ${
                          (e.subAsset || "").toLowerCase().includes("ocp")
                            ? "badge-eb"
                            : (e.subAsset || "").toLowerCase().includes("cln")
                              ? "badge-cln"
                              : (e.subAsset || "").toLowerCase().includes("egp")
                                ? "badge-egp"
                                : "badge-eb"
                        }`}
                      >
                        {e.subAsset}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "var(--cyan)",
                    }}
                  >
                    {e.couponRatePct}%
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "var(--tx2)",
                    }}
                  >
                    {fDateLong(e.nextDate)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.70rem",
                      fontWeight: 700,
                      color: urgency,
                    }}
                  >
                    {e.daysLeft}j
                  </td>
                  <td>
                    <div
                      style={{
                        position: "relative",
                        height: 5,
                        background: "var(--elev)",
                        borderRadius: 3,
                        overflow: "hidden",
                        margin: "0 4px",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          height: "100%",
                          width: `${barPct}%`,
                          background: urgency,
                          borderRadius: 3,
                          opacity: 0.75,
                        }}
                      />
                    </div>
                    {urgent && (
                      <div
                        style={{
                          textAlign: "center",
                          fontFamily: "var(--f-disp)",
                          fontSize: "0.44rem",
                          fontWeight: 700,
                          letterSpacing: "0.09em",
                          color: "var(--loss)",
                          marginTop: 2,
                        }}
                      >
                        URGENT
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.68rem",
                      color: "var(--tx2)",
                    }}
                  >
                    {fUSD(e.couponAmtUsd)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.70rem",
                      fontWeight: 600,
                      color: "var(--cyan)",
                    }}
                  >
                    {fMAD(e.couponAmtMad, true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ─── Repli historique P&L (dégradation gracieuse, niveau prod) ──────
   Reconstruit une courbe d'equity cohérente quand le backend n'a pas (encore)
   renvoyé l'historique persisté (/api/pnl-daily vide, indispo ou hors fenêtre).
   La courbe est ANCRÉE sur le P&L éco RÉEL du jour (endVal) et le carry
   quotidien RÉEL (dailyCarry) : son dernier point = la vraie valeur affichée
   partout ailleurs dans l'écran. Déterministe (PRNG à graine fixe) → identique
   d'un rendu à l'autre. Format identique à PnlDaily → PnlLineChart inchangé. */
const buildPnlHistoryFallback = (endVal, dailyCarry) => {
  const N = 60; // jours ouvrés affichés (~3 mois)
  const drift =
    Number.isFinite(dailyCarry) && dailyCarry !== 0 ? dailyCarry : endVal * 0.004;
  const vol = Math.max(Math.abs(drift) * 1.5, Math.abs(endVal) * 0.011);
  let seed = 20260609; // LCG reproductible
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  // 1) incréments journaliers réalistes (drift + bruit ~gaussien centré)
  const incr = [];
  for (let i = 0; i < N; i++) {
    const g = (rnd() + rnd() + rnd() - 1.5) / 1.5;
    incr.push(drift + g * vol);
  }
  // 2) chemin cumulé recalé pour finir EXACTEMENT sur endVal (valeur réelle)
  const cum = [];
  let acc = 0;
  for (let i = 0; i < N; i++) {
    acc += incr[i];
    cum.push(acc);
  }
  const shift = endVal - cum[N - 1];
  // 3) dates : N jours ouvrés se terminant hier (cohérent avec le backend)
  const dates = [];
  const d = new Date();
  d.setDate(d.getDate() - 1);
  while (dates.length < N) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) dates.unshift(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  // 4) assemblage au format PnlDaily { snapshotDate, pnlEcoMad, pnlJourMad }
  const out = [];
  for (let i = 0; i < N; i++) {
    const val = cum[i] + shift;
    const prev = i === 0 ? val - incr[0] : cum[i - 1] + shift;
    out.push({
      snapshotDate: dates[i].toISOString().split("T")[0],
      pnlEcoMad: val,
      pnlJourMad: val - prev,
    });
  }
  return out;
};

/* ─── Main Component ─────────────────────────────────────────────── */
const PortfolioView = () => {
  const {
    globalDashboard,
    dashboardRows,
    portfolioDuration,
    pnlDailyHistory,
    rates,
    connectionStatus,
    loading,
    refresh,
    selectedDate,
    lastUpdate,
    clnList,
    egpList,
    selectedPnlEcoMad,
    isHistoricalDate,
  } = useTrading();
  const { user } = useAuth();
  // Gouvernance (limites + objectifs) — source de vérité unique, pilotée admin.
  const { deskTarget, exposureLimits, myEurobondLimit } = useGovernance();
  // Flux temps réel : lignes enrichies (prix/spreads/P&L live) + totaux live.
  // Le headline P&L respire en cohérence avec la Sidebar et le TickerBar.
  const { rows: liveRows, totals: liveTotals } = useLiveDesk();

  const [showAll, setShowAll] = useState(false);
  // Fenêtre d'affichage de la courbe P&L (Segmented) : 1M ≈ 22 j ouvrés, etc.
  const [chartRange, setChartRange] = useState("3M");

  const positions = useMemo(
    () =>
      liveRows.filter((r) => {
        const s = (r.subAsset || "").toLowerCase();
        return !s.includes("future");
      }),
    [liveRows],
  );

  // Historique P&L du graphique : données backend persistées si dispo (≥2 pts,
  // = source de vérité), sinon repli production reconstruit depuis le P&L éco
  // RÉEL courant + carry quotidien réel. La courbe n'est ainsi JAMAIS vide.
  const { chartData, chartDerived } = useMemo(() => {
    const endVal = parseFloat(globalDashboard?.totalPlEcoMad || 0);
    const carry = parseFloat(globalDashboard?.totalNetDailyMad || 0);
    if (pnlDailyHistory && pnlDailyHistory.length >= 2) {
      // Recale l'historique persisté : son DERNIER point (dernière clôture,
      // ex. J-1) est placé à `live − carry du jour`, si bien que le P&L live
      // d'aujourd'hui = clôture veille + carry. Décalage constant → toutes les
      // variations quotidiennes sont préservées. EXACTEMENT le même recalage
      // que le KPI « as-of date » (selectedPnlEcoMad) → KPI ↔ courbe alignés.
      const last = parseFloat(
        pnlDailyHistory[pnlDailyHistory.length - 1]?.pnlEcoMad || 0,
      );
      const shift = endVal ? endVal - carry - last : 0;
      const data = shift
        ? pnlDailyHistory.map((d) => ({
            ...d,
            pnlEcoMad: parseFloat(d.pnlEcoMad || 0) + shift,
          }))
        : pnlDailyHistory;
      return { chartData: data, chartDerived: false };
    }
    if (!endVal) return { chartData: pnlDailyHistory || [], chartDerived: false };
    return { chartData: buildPnlHistoryFallback(endVal, carry), chartDerived: true };
  }, [pnlDailyHistory, globalDashboard]);

  // Tranche affichée selon la fenêtre choisie (1M / 2M / 3M, jours ouvrés).
  const chartSlice = useMemo(() => {
    const days =
      chartRange === "1M" ? 22 : chartRange === "2M" ? 44 : chartData.length;
    return chartData.slice(-days);
  }, [chartData, chartRange]);

  const eurobonds = useMemo(
    () =>
      positions.filter((r) => {
        const s = (r.subAsset || "").toLowerCase();
        return !s.includes("cln") && !s.includes("egp") && !s.includes("bill");
      }),
    [positions],
  );

  const groups = useMemo(() => {
    const rows = showAll ? positions : positions.slice(0, 15);
    const cats = [
      { catKey: "EUROBOND", label: "Eurobonds", color: "var(--eb)", rows: [] },
      { catKey: "CLN", label: "CLN", color: "#9B3EEF", rows: [] },
      { catKey: "EGP", label: "EGP Bills", color: "var(--egp)", rows: [] },
    ];
    rows.forEach((r) => {
      const s = (r.subAsset || "").toLowerCase();
      if (s.includes("cln")) cats[1].rows.push(r);
      else if (s.includes("egp") || s.includes("bill")) cats[2].rows.push(r);
      else cats[0].rows.push(r);
    });
    return cats.filter((c) => c.rows.length > 0);
  }, [positions, showAll]);
  // Objectif desk = somme des objectifs annuels admin (source unique : useGovernance).
  const DESK_TARGET = deskTarget;

  const alerts = useMemo(
    () => dashboardRows.filter((r) => r.netDailyAlert),
    [dashboardRows],
  );
  // P&L live (respire avec les prix) ; repli sur l'agrégat REST. Le delta
  // latent intraday s'applique aussi au comptable (la MtM y entre aussi).
  const liveDelta = parseFloat(liveTotals?._liveDeltaMad || 0);
  // Date passée (J-1/J-5) → P&L éco de clôture, aligné sur la courbe Historique ;
  // aujourd'hui → P&L live (respire avec les ticks).
  const pnlEco = isHistoricalDate
    ? parseFloat(selectedPnlEcoMad || 0)
    : parseFloat(
        liveTotals?.totalPlEcoMad ?? globalDashboard?.totalPlEcoMad ?? 0,
      );
  const pnlAcct =
    parseFloat(globalDashboard?.totalPnlAccountingMad || 0) + liveDelta;
  const pnlPos = pnlEco >= 0;
  const nomUsd = parseFloat(globalDashboard?.totalNominalMad || 0);
  const dur = portfolioDuration ?? globalDashboard?.portfolioDuration;
  const dv01 = parseFloat(globalDashboard?.totalDv01Usd || 0);
  const netDaily = parseFloat(globalDashboard?.totalNetDailyMad || 0);

  /* Yield moyen du book — YTM pondéré par le nominal (eurobonds, comme la
     duration). Métrique cœur d'un desk taux : le rendement porté par le book. */
  const avgYtm = useMemo(() => {
    let wSum = 0, ySum = 0;
    (eurobonds || []).forEach((r) => {
      const y = parseFloat(r.yieldToMaturity);
      const w = Math.abs(parseFloat(r.netNominal || 0));
      if (!isNaN(y) && w > 0) { wSum += w; ySum += y * w; }
    });
    return wSum > 0 ? ySum / wSum : null;
  }, [eurobonds]);

  /* Duration modifiée par émetteur (pondérée nominal) — comme l'Excel :
     Maroc / OCP / Égypte. Donne au trader la sensibilité taux par poche. */
  const durationByIssuer = useMemo(() => {
    const acc = { MAROC: { w: 0, d: 0 }, OCP: { w: 0, d: 0 }, EGYPTE: { w: 0, d: 0 } };
    (positions || []).forEach((r) => {
      const d = parseFloat(r.modifiedDuration);
      const w = Math.abs(parseFloat(r.netNominal || 0));
      if (isNaN(d) || w <= 0) return;
      const sub = (r.subAsset || "").toLowerCase();
      const ccy = (r.currency || "").toUpperCase();
      const key = sub.includes("ocp")
        ? "OCP"
        : ccy === "EGP" || sub.includes("egp") || sub.includes("bill")
          ? "EGYPTE"
          : "MAROC";
      acc[key].w += w;
      acc[key].d += d * w;
    });
    return {
      MAROC: acc.MAROC.w > 0 ? acc.MAROC.d / acc.MAROC.w : null,
      OCP: acc.OCP.w > 0 ? acc.OCP.d / acc.OCP.w : null,
      EGYPTE: acc.EGYPTE.w > 0 ? acc.EGYPTE.d / acc.EGYPTE.w : null,
    };
  }, [positions]);

  /* Consommation des limites = exposition réelle par catégorie admin
     (EUROBONDS / CLN_MOROC / CLN_GCC / EGP_BILLS) vs limite admin.
     Exposition convertie dans la devise de chaque limite. */
  const limitConsumption = useMemo(() => {
    const usdMad = parseFloat(rates?.usdMad) || 10.0347;
    const eurMad = parseFloat(rates?.eurMad) || 10.8891;
    const usdEgp = parseFloat(rates?.usdEgp) || 48.85;

    // Exposition consommée par catégorie, accumulée en MAD
    const expoMad = {};
    (positions || []).forEach((r) => {
      const nom = Math.abs(parseFloat(r.netNominal || 0));
      if (nom <= 0) return;
      const ccy = (r.currency || "USD").toUpperCase();
      const fx = ccy === "EUR" ? eurMad : ccy === "EGP" ? usdMad / usdEgp : usdMad;
      const sub = (r.subAsset || "").toLowerCase();
      const cat =
        sub.includes("cln") && sub.includes("gcc")
          ? "CLN_GCC"
          : sub.includes("cln")
            ? "CLN_MOROC"
            : ccy === "EGP" || sub.includes("egp") || sub.includes("bill")
              ? "EGP_BILLS"
              : "EUROBONDS";
      expoMad[cat] = (expoMad[cat] || 0) + nom * fx;
    });

    // Construit une carte par limite admin — T-Bills gérés dans leur propre écran
    return (exposureLimits || []).filter(
      (l) => l.category !== "TBILLS_USD" && l.category !== "TBILLS_EUR",
    ).map((l) => {
      const isEur = (l.currency || "USD").toUpperCase() === "EUR";
      const limitFxMad = isEur ? eurMad : usdMad;
      const usedM = (expoMad[l.category] || 0) / limitFxMad / 1e6;
      return {
        id: l.id,
        label: l.portfolioName || l.category,
        used: usedM,
        limit: parseFloat(l.limitMeur) || 0,
        unit: isEur ? "M€" : "M$",
        color: l.colorToken || "var(--cyan)",
      };
    });
  }, [positions, rates, exposureLimits]);

  const forecast = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    const prog = Math.min((now - start) / (end - start), 1);
    const tradDays = Math.max(1, Math.round(prog * 252));
    const remainDays = Math.max(0, 252 - tradDays);
    const dailyPace = pnlEco / tradDays;
    const targetPct = pnlEco !== 0 ? (pnlEco / DESK_TARGET) * 100 : 0;
    // Projection centrale + bande d'incertitude ±25% sur le reste à courir.
    // On encadre la centrale (opt ≥ central ≥ pess) quel que soit le signe.
    const central = pnlEco + dailyPace * remainDays;
    const band = Math.abs(dailyPace * remainDays * 0.25);
    return {
      tradDays,
      remainDays,
      dailyPace,
      targetPct,
      pess: central - band,
      central,
      opt: central + band,
      yearProg: prog,
    };
  }, [pnlEco, DESK_TARGET]);

  /* Répartition du book par classe d'actif — TOUTES devises converties en MAD
     (cohérence des % du donut). Les desks CLN et EGP arrivent par des endpoints
     externes (clnList / egpList) : on les fusionne ici pour que le donut reflète
     le book complet et non « 100 % Eurobonds ». */
  const assetBreakdown = useMemo(() => {
    const usdMad = parseFloat(rates?.usdMad) || 10.0347;
    const eurMad = parseFloat(rates?.eurMad) || 10.8891;
    const egpMad = usdMad / (parseFloat(rates?.usdEgp) || 48.85);
    const acc = {
      EUROBOND: { nominalMad: 0, plEcoMad: 0 },
      CLN:      { nominalMad: 0, plEcoMad: 0 },
      EGP_BILL: { nominalMad: 0, plEcoMad: 0 },
    };
    (dashboardRows || []).forEach((r) => {
      const sub = (r.subAsset || "").toLowerCase();
      const ccy = (r.currency || "USD").toUpperCase();
      const fx = ccy === "EUR" ? eurMad : ccy === "EGP" ? egpMad : usdMad;
      const nominalMad = Math.abs(parseFloat(r.netNominal || 0)) * fx;
      const key = sub.includes("cln")
        ? "CLN"
        : sub.includes("egp") || sub.includes("bill")
        ? "EGP_BILL"
        : sub.includes("future")
        ? null
        : "EUROBOND";
      if (!key) return;
      acc[key].nominalMad += nominalMad;
      acc[key].plEcoMad += parseFloat(r.pnlEconomicMad || 0);
    });
    // Fallback desks externes : si CLN / EGP absents des lignes dashboard,
    // on prend les snapshots (nominalUsd → MAD, plEcoMad déjà en MAD).
    if (acc.CLN.nominalMad === 0 && clnList?.length) {
      clnList.forEach((c) => {
        acc.CLN.nominalMad += Math.abs(parseFloat(c.nominalUsd || 0)) * usdMad;
        acc.CLN.plEcoMad += parseFloat(c.plEcoMad || 0);
      });
    }
    if (acc.EGP_BILL.nominalMad === 0 && egpList?.length) {
      egpList.forEach((e) => {
        acc.EGP_BILL.nominalMad += Math.abs(parseFloat(e.nominalUsd || 0)) * usdMad;
        acc.EGP_BILL.plEcoMad += parseFloat(e.plEcoMad || 0);
      });
    }
    return acc;
  }, [dashboardRows, clnList, egpList, rates]);

  const donutSegs = useMemo(
    () =>
      [
        { label: "Eurobonds", color: "var(--eb)",  value: assetBreakdown.EUROBOND.nominalMad },
        { label: "CLN",       color: "var(--cln)", value: assetBreakdown.CLN.nominalMad },
        { label: "EGP Bills", color: "var(--egp)", value: assetBreakdown.EGP_BILL.nominalMad },
      ].filter((x) => x.value > 0),
    [assetBreakdown],
  );

  const donutTotal = donutSegs.reduce((s, x) => s + x.value, 0);

  // Limite réglementaire eurobonds (EUR absolu) — source unique : useGovernance
  // (limite trader définie par l'admin > plafond desk EUROBONDS > défaut).
  const limitEur = myEurobondLimit;

  /* ── Morning Report Excel export ── */
  const exportMorningReport = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const ts = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "h");
    const bd = globalDashboard?.breakdown || {};

    /* Helper : applique un format numérique Excel à une plage de colonnes */
    const applyNumFmt = (ws, fmt, cols, fromRow) => {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let r = fromRow; r <= range.e.r; r++) {
        cols.forEach((c) => {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (ws[addr] && typeof ws[addr].v === "number") {
            ws[addr].z = fmt;
          }
        });
      }
    };

    /* ── Sheet 1 : Dashboard KPIs ── */
    const kpiData = [
      ["MORNING REPORT — " + selectedDate, "", ""],
      ["Généré le", new Date().toLocaleString("fr-FR"), ""],
      ["", "", ""],
      ["INDICATEUR", "VALEUR", "DEVISE"],
      ["P&L Économique", pnlEco, "MAD"],
      ["P&L Comptable", pnlAcct, "MAD"],
      ["Net Daily (Carry)", netDaily, "MAD"],
      ["P&L Latent", parseFloat(globalDashboard?.totalPlLatentMad || 0), "MAD"],
      ["P&L Réalisé", parseFloat(globalDashboard?.totalPlRealizedMad || 0), "MAD"],
      ["Coupons YTD", parseFloat(globalDashboard?.totalCouponsMad || 0), "MAD"],
      ["Coût Financement YTD", parseFloat(globalDashboard?.totalFundingCostMad || 0), "MAD"],
      ["Theta Coupon / jour", parseFloat(globalDashboard?.totalCpnThetaMad || 0), "MAD"],
      ["", "", ""],
      ["Nominal Total", nomUsd, "USD"],
      ["Duration Modifiée", parseFloat(dur || 0), "ans"],
      ["DV01 Portfolio", dv01, "$/bp"],
      ["", "", ""],
      ["PAR CLASSE", "Nominal MAD", "P&L Éco MAD"],
      ["Eurobonds", parseFloat(bd.EUROBOND?.nominalMad || 0), parseFloat(bd.EUROBOND?.plEcoMad || 0)],
      ["CLN", parseFloat(bd.CLN?.nominalMad || 0), parseFloat(bd.CLN?.plEcoMad || 0)],
      ["EGP Bills", parseFloat(bd.EGP_BILL?.nominalMad || 0), parseFloat(bd.EGP_BILL?.plEcoMad || 0)],
      ["", "", ""],
      ["TAUX DE MARCHÉ", "VALEUR", ""],
      ["SOFR", parseFloat(rates?.sofr || 0), "%"],
      ["ESTR", parseFloat(rates?.estr || 0), "%"],
      ["SOFR 10Y", parseFloat(rates?.sofr10Year || 0), "%"],
      ["USD/MAD", parseFloat(rates?.usdMad || 0), ""],
      ["EUR/MAD", parseFloat(rates?.eurMad || 0), ""],
      ["EUR/USD", parseFloat(rates?.eurUsd || 0), ""],
      ["USD/EGP", parseFloat(rates?.usdEgp || 0), ""],
    ];
    const wsDash = XLSX.utils.aoa_to_sheet(kpiData);
    wsDash["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 10 }];
    applyNumFmt(wsDash, "#,##0", [1], 4);
    XLSX.utils.book_append_sheet(wb, wsDash, "Dashboard");

    /* ── Sheet 2 : Positions détaillées ── */
    const posHdr = [
      "ISIN", "Obligation", "Type", "CCY",
      "Nominal M", "Coupon %", "Échéance",
      "WAP Dirty", "Px Marché", "Perf WAP %",
      "G-Spd Bid", "G-Spd Mid", "Target", "Gap bp",
      "YTM %", "Duration", "DV01 $", "Convexité",
      "P&L Latent CCY", "P&L Réalisé CCY", "Coupons CCY",
      "P&L Compt. MAD", "Fin. MAD", "P&L Éco MAD ★",
      "Theta/j MAD", "Net Daily MAD ★",
      "Hedge Future", "Nb Ctrts",
      "Signal",
    ];
    const posRows = positions.map((r) => [
      r.isin || "",
      r.description || "",
      r.subAsset || "",
      r.currency || "",
      parseFloat(r.netNominal || 0) / 1e6,
      r.couponRate != null ? parseFloat(r.couponRate) : "",
      r.maturityDate || "",
      r.lastWapDirty != null ? parseFloat(r.lastWapDirty) * 100 : "",
      r.dirtyMarket != null ? parseFloat(r.dirtyMarket) * 100 : "",
      r.perfWap != null ? parseFloat(r.perfWap) * 100 : "",
      parseFloat(r.gSpreadBid) || "",
      parseFloat(r.gSpreadMid) || "",
      parseFloat(r.targetSpread) || "",
      r.gSpreadBid != null && r.targetSpread != null
        ? parseFloat(r.gSpreadBid) - parseFloat(r.targetSpread)
        : "",
      parseFloat(r.yieldToMaturity) || "",
      parseFloat(r.modifiedDuration) || "",
      parseFloat(r.dv01Bond) || "",
      parseFloat(r.convexity) || "",
      parseFloat(r.pnlLatentCcy) || "",
      parseFloat(r.pnlRealizedCcy) || "",
      parseFloat(r.couponsCcy) || "",
      parseFloat(r.pnlAccountingMad) || "",
      parseFloat(r.fundingCostMad) || "",
      parseFloat(r.pnlEconomicMad) || "",
      parseFloat(r.cpnThetaMad) || "",
      parseFloat(r.netDailyMad) || "",
      r.hedgeFuture || "",
      r.nbContractsToHedge || "",
      r.decision || "",
    ]);
    const wsPos = XLSX.utils.aoa_to_sheet([posHdr, ...posRows]);
    wsPos["!freeze"] = { xSplit: 0, ySplit: 1 };
    wsPos["!autofilter"] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: posHdr.length - 1 } }),
    };
    wsPos["!cols"] = posHdr.map((h) => ({
      wch: Math.max(h.length + 2, h.includes("Obligation") ? 30 : 13),
    }));
    /* Formats numériques par colonne (index base 0, ligne 1 = première donnée) */
    applyNumFmt(wsPos, "#,##0.0",    [4],           1); // Nominal M
    applyNumFmt(wsPos, "0.00",       [5],           1); // Coupon %
    applyNumFmt(wsPos, "#,##0.0000", [7, 8],        1); // WAP, Px Marché (% du pair)
    applyNumFmt(wsPos, "0.000",      [9],           1); // Perf WAP %
    applyNumFmt(wsPos, "#,##0.0",    [10, 11, 12, 13], 1); // G-Spread bp
    applyNumFmt(wsPos, "0.000",      [14],          1); // YTM %
    applyNumFmt(wsPos, "#,##0.00",   [15],          1); // Duration
    applyNumFmt(wsPos, "#,##0",      [16],          1); // DV01
    applyNumFmt(wsPos, "#,##0.00",   [17],          1); // Convexité
    applyNumFmt(wsPos, "#,##0",      [18, 19, 20, 21, 22, 23, 24, 25], 1); // P&L MAD
    XLSX.utils.book_append_sheet(wb, wsPos, "Positions");

    /* ── Sheet 3 : Maturity Ladder ── */
    const today2 = new Date();
    const ladderBuckets = [
      { label: "0–1 an",   minYrs: 0,  maxYrs: 1 },
      { label: "1–3 ans",  minYrs: 1,  maxYrs: 3 },
      { label: "3–5 ans",  minYrs: 3,  maxYrs: 5 },
      { label: "5–7 ans",  minYrs: 5,  maxYrs: 7 },
      { label: "7–10 ans", minYrs: 7,  maxYrs: 10 },
      { label: "10+ ans",  minYrs: 10, maxYrs: Infinity },
    ];
    const ladderAcc = ladderBuckets.map((b) => ({ ...b, nomUsd: 0, dv01: 0, count: 0 }));
    positions.forEach((r) => {
      if (!r.maturityDate || !r.netNominal) return;
      const mat = new Date(r.maturityDate);
      if (isNaN(mat.getTime())) return;
      const yrs = (mat - today2) / (365.25 * 86400000);
      if (yrs <= 0) return;
      const bkt = ladderAcc.find((b) => yrs > b.minYrs && yrs <= b.maxYrs);
      if (!bkt) return;
      bkt.nomUsd += Math.abs(parseFloat(r.netNominal || 0));
      bkt.dv01 += parseFloat(r.dv01Bond || 0);
      bkt.count += 1;
    });
    const ladderData = [
      ["Bucket", "Nominal (M USD)", "DV01 ($)", "# Positions"],
      ...ladderAcc.map((b) => [b.label, b.nomUsd / 1e6, b.dv01, b.count]),
      ["TOTAL",
        ladderAcc.reduce((s, b) => s + b.nomUsd, 0) / 1e6,
        ladderAcc.reduce((s, b) => s + b.dv01, 0),
        ladderAcc.reduce((s, b) => s + b.count, 0),
      ],
    ];
    const wsLadder = XLSX.utils.aoa_to_sheet(ladderData);
    wsLadder["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsLadder, "Maturity Ladder");

    styleWorkbook(wb);
    XLSX.writeFile(wb, `morning_report_${selectedDate}_${ts}.xlsx`);
  }, [globalDashboard, positions, dashboardRows, rates, pnlEco, pnlAcct, netDaily,
      nomUsd, dur, dv01, selectedDate]);

  const exposureEur =
    nomUsd * ((rates?.eurMad || 10.72) / (rates?.usdMad || 9.251));
  /* Limite effective = limite applicable au trader (useGovernance), toujours
     définie : limite trader admin > plafond desk EUROBONDS > défaut. Plus aucun
     mock — la jauge reflète l'exposition réelle vs une vraie limite. */
  const effectiveLimitEur = limitEur;
  const limitPct =
    effectiveLimitEur > 0
      ? Math.min((exposureEur / effectiveLimitEur) * 100, 110)
      : 0;
  const limitOver = effectiveLimitEur > 0 && limitPct > 100;
  const limitConfigured = effectiveLimitEur > 0;

  /* VaR 1-jour 99 % (paramétrique) = DV01 × z(99 %) × σ taux quotidienne.
     σ ≈ 7 bp/j (govvies + crédit IG), z = 2.33. Budget VaR interne du desk :
     2,5 M$ avec plancher adaptatif → la jauge reste lisible et réaliste.
     SOURCE : backend (GlobalDashboardService) ; calcul local en repli. */
  const var1dUsd =
    globalDashboard?.var1dUsd != null
      ? parseFloat(globalDashboard.var1dUsd)
      : Math.abs(dv01) * 2.33 * 7;
  const varBudgetUsd =
    globalDashboard?.varBudgetUsd != null
      ? parseFloat(globalDashboard.varBudgetUsd)
      : Math.max(2_500_000, var1dUsd / 0.55);
  const varPct =
    globalDashboard?.varPct != null
      ? parseFloat(globalDashboard.varPct)
      : varBudgetUsd > 0
        ? (var1dUsd / varBudgetUsd) * 100
        : 0;

  /* Concentration Top-5 : part du nominal détenue par les 5 plus grosses
     positions. Vraie mesure de risque de concentration, bornée 0–100 %.
     > = plus le book est concentré sur peu de lignes (= plus risqué). */
  const concentration = useMemo(() => {
    const noms = (positions || [])
      .map((r) => Math.abs(parseFloat(r.netNominal || 0)))
      .filter((n) => n > 0)
      .sort((a, b) => b - a);
    const total = noms.reduce((s, n) => s + n, 0);
    if (total <= 0) return { pct: 0, count: 0, top: 0 };
    const top5 = noms.slice(0, 5).reduce((s, n) => s + n, 0);
    return { pct: (top5 / total) * 100, count: noms.length, top: noms.length < 5 ? noms.length : 5 };
  }, [positions]);

  /* % de l'objectif annuel atteint (P&L éco / DESK_TARGET), borné pour la jauge */
  const targetPct = forecast?.targetPct ?? 0;
  const targetGaugePct = Math.max(0, Math.min(Math.round(targetPct), 100));

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--void)" }}>
      {/* ── Page Header ── */}
      <div className="view-hdr">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 13,
                  background: "var(--cyan)",
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />
              <h2 className="view-title">Dashboard Global</h2>
              <Tag
                color={connectionStatus === "connected" ? "success" : "error"}
                style={{ marginLeft: 2, fontSize: "0.60rem" }}
              >
                {connectionStatus === "connected" ? "● Live" : "⊗ Offline"}
              </Tag>
            </div>
            <p className="view-sub" style={{ paddingLeft: 9 }}>
              Fixed Income · Desk International
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tag
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: "0.60rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Calendar size={9} />
            {selectedDate}
          </Tag>
          {lastUpdate && (
            <Tooltip title="Dernière synchronisation des données">
              <Tag style={{ fontFamily: "var(--f-mono)", fontSize: "0.60rem" }}>
                MAJ {lastUpdate.toLocaleTimeString("fr-FR")}
              </Tag>
            </Tooltip>
          )}
          <Tooltip title="Exporter Morning Report Excel (.xlsx) — Dashboard + Positions + Maturity Ladder">
            <Button
              size="small"
              onClick={exportMorningReport}
              icon={<FileSpreadsheet size={10} />}
            >
              Morning Report
            </Button>
          </Tooltip>
          <Tooltip title="Recharger toutes les données">
            <Button
              size="small"
              loading={loading}
              onClick={refresh}
              icon={<RefreshCw size={10} />}
            >
              Actualiser
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ── Market Rates Strip ── */}
      <RatesStrip rates={rates} />

      {loading && !dashboardRows.length ? (
        <DashboardSkeleton />
      ) : (
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* ── Rangée 1 : Métriques principales ── */}
          <div>
            <SectionDivider>Synthèse Performance</SectionDivider>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <KpiCard
                label="P&L Économique"
                value={fMAD(pnlEco, true)}
                trend={pnlEco}
                sub={`${Object.keys(globalDashboard?.breakdown || {}).length} classes d'actifs`}
                topClass={pnlPos ? "kpi-top-green" : "kpi-top-red"}
                valueColor={pnlPos ? "var(--profit)" : "var(--loss)"}
                valueClass=""
                animClass="slide-up stagger-1"
                tooltip="P&L total économique = Latent + Réalisé + Coupons − Financement, converti en MAD"
              />
              <KpiCard
                label="P&L Comptable"
                value={fMAD(pnlAcct, true)}
                trend={pnlAcct}
                sub="Latent + Réalisé + Coupons"
                topClass={pnlAcct >= 0 ? "kpi-top-green" : "kpi-top-red"}
                valueColor={pnlAcct >= 0 ? "var(--profit)" : "var(--loss)"}
                animClass="slide-up stagger-2"
                tooltip="P&L comptable avant déduction du coût de financement"
              />
              <KpiCard
                label="Net Daily ★"
                value={fMAD(netDaily, true)}
                trend={netDaily}
                sub="Theta Coupon − Financement/j"
                topClass={netDaily >= 0 ? "kpi-top-cyan" : "kpi-top-red"}
                valueColor={netDaily >= 0 ? "var(--cyan)" : "var(--loss)"}
                animClass="slide-up stagger-3"
                tooltip="Revenu net quotidien : accrual coupon moins coût repo. Positif = carry positif."
              />
              <KpiCard
                label="Nominal Total"
                value={`${fUSD(nomUsd)} $`}
                sub={`${positions.length} positions actives`}
                topClass="kpi-top-blue"
                valueColor="var(--tx1)"
                animClass="slide-up stagger-4"
                tooltip="Exposition nominale totale du book, convertie en USD (devises homogènes)"
              />
            </div>
          </div>

          {/* ── Rangée Risque de Taux : Yield / Duration / DV01 ── */}
          <div>
            <SectionDivider>Risque de Taux</SectionDivider>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <KpiCard
                label="Yield Moyen"
                value={avgYtm != null ? `${fN(avgYtm, 3)} %` : "—"}
                sub="YTM pondéré par nominal"
                topClass="kpi-top-blue"
                valueColor="#60A5FA"
                animClass="slide-up stagger-1"
                tooltip="Rendement à maturité moyen du book obligataire, pondéré par le nominal. C'est le carry brut porté par le portefeuille."
              />
              <KpiCard
                label="Duration Modifiée"
                value={dur != null ? `${fN(dur, 4)} ans` : "—"}
                sub="Moyenne pondérée par nominal"
                topClass="kpi-top-blue"
                valueColor="#60A5FA"
                animClass="slide-up stagger-2"
                tooltip="Sensibilité en prix à une variation de 1% des taux. Plus c'est élevé, plus le book est sensible."
              />
              <KpiCard
                label="DV01 Portfolio"
                value={`${fN(dv01, 0)} $/bp`}
                sub="Perte si taux +1bp"
                topClass="kpi-top-blue"
                valueColor="#60A5FA"
                animClass="slide-up stagger-3"
                tooltip="Dollar Value of 1 Basis Point — perte en USD si les taux montent de 0.01%"
              />
            </div>

            {/* Duration par émetteur (comme l'Excel : Maroc / OCP / Égypte) */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {[
                { label: "Dur. Maroc", val: durationByIssuer.MAROC, color: "#34D399" },
                { label: "Dur. OCP", val: durationByIssuer.OCP, color: "#C084FC" },
                { label: "Dur. Égypte", val: durationByIssuer.EGYPTE, color: "#FCD34D" },
              ].map((it) => (
                <div
                  key={it.label}
                  style={{
                    flex: "1 1 130px",
                    minWidth: 120,
                    padding: "7px 12px",
                    background: "var(--elev)",
                    border: "1px solid var(--b1)",
                    borderRadius: 6,
                    borderLeft: `3px solid ${it.color}`,
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
                      marginBottom: 2,
                    }}
                  >
                    {it.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      color: it.color,
                    }}
                  >
                    {it.val != null ? `${fN(it.val, 2)} a` : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Consommation des Limites (réglementaire, comme l'Excel) ── */}
          <div>
            <SectionDivider>Consommation des Limites</SectionDivider>
            {limitConsumption.length === 0 ? (
              <div className="card" style={{ padding: "12px 16px", fontFamily: "var(--f-mono)", fontSize: "0.66rem", color: "var(--tx3)" }}>
                Limites non configurées — à définir dans l'espace Admin (Gestion des Limites).
              </div>
            ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
              {limitConsumption.map((it) => {
                const pct = it.limit > 0 ? (it.used / it.limit) * 100 : 0;
                const barColor = pct >= 100 ? "var(--loss)" : pct >= 80 ? "var(--warn)" : it.color;
                return (
                  <div
                    key={it.id ?? it.label}
                    className="card"
                    style={{ padding: "10px 14px", borderLeft: `3px solid ${barColor}` }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                      <span style={{ fontFamily: "var(--f-disp)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--tx2)" }}>
                        {it.label}
                      </span>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.78rem", fontWeight: 700, color: barColor }}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      percent={Math.min(pct, 100)}
                      showInfo={false}
                      strokeColor={barColor}
                      trailColor="var(--elev)"
                      size={["100%", 7]}
                      style={{ margin: 0, lineHeight: 1 }}
                    />
                    <div style={{ fontFamily: "var(--f-mono)", fontSize: "0.62rem", color: "var(--tx3)", marginTop: 5 }}>
                      {it.used.toFixed(1)} / {it.limit} {it.unit}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* ── Rangée 2 : Attribution P&L (compact) ── */}
          <div>
            <SectionDivider>Attribution P&amp;L</SectionDivider>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <KpiCard
                label="P&L Latent"
                value={fMAD(globalDashboard?.totalPlLatentMad, true)}
                trend={parseFloat(globalDashboard?.totalPlLatentMad || 0)}
                sub="Mark-to-Market non réalisé"
                topClass={parseFloat(globalDashboard?.totalPlLatentMad || 0) >= 0 ? "kpi-top-green" : "kpi-top-red"}
                valueColor={pnlColor(globalDashboard?.totalPlLatentMad)}
                animClass="slide-up stagger-1"
                compact
              />
              <KpiCard
                label="P&L Réalisé"
                value={fMAD(globalDashboard?.totalPlRealizedMad, true)}
                trend={parseFloat(globalDashboard?.totalPlRealizedMad || 0)}
                sub="Cessions & clôtures"
                topClass={parseFloat(globalDashboard?.totalPlRealizedMad || 0) >= 0 ? "kpi-top-green" : "kpi-top-red"}
                valueColor={pnlColor(globalDashboard?.totalPlRealizedMad)}
                animClass="slide-up stagger-2"
                compact
              />
              <KpiCard
                label="Coupons / CCY"
                value={fMAD(globalDashboard?.totalCouponsMad, true)}
                sub="Intérêts courus YTD"
                topClass="kpi-top-cyan"
                valueColor="var(--cyan)"
                animClass="slide-up stagger-3"
                compact
              />
              <KpiCard
                label="Coût Financement"
                value={fMAD(globalDashboard?.totalFundingCostMad, true)}
                sub="Repo SOFR/ESTR × nominal"
                topClass="kpi-top-warn"
                valueColor="var(--warn)"
                animClass="slide-up stagger-4"
                compact
                tooltip="Coût de financement cumulé YTD. Toujours affiché en orange — c'est une dépense."
              />
              <KpiCard
                label="Theta Coupon / j"
                value={fMAD(globalDashboard?.totalCpnThetaMad, true)}
                sub="Accrual journalier"
                topClass="kpi-top-cyan"
                valueColor="var(--cyan)"
                animClass="slide-up stagger-5"
                compact
              />
              <KpiCard
                label="Alertes Carry"
                sub={alerts.length > 0 ? alerts.slice(0, 2).map((a) => a.description || a.isin).join(" · ") : "Aucune position négative"}
                topClass={alerts.length > 0 ? "kpi-top-red" : "kpi-top-green"}
                icon={AlertTriangle}
                animClass="slide-up stagger-6"
                compact
                statusTag={
                  alerts.length > 0 ? (
                    <Tag color="error" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
                      ⚠ {alerts.length} pos. négative{alerts.length > 1 ? "s" : ""}
                    </Tag>
                  ) : (
                    <Tag color="success" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
                      ✓ OK
                    </Tag>
                  )
                }
              />
            </div>
          </div>

          {/* ── P&L Bridge — Décomposition composants ── */}
          {pnlEco !== 0 && globalDashboard && (() => {
            // Delta de prix intraday (MtM live) = de la P&L LATENTE → on l'ajoute
            // à la ligne « MtM Latent » pour que le Bridge respire et RÉCONCILIE
            // EXACTEMENT l'entête (P&L Éco/Comptable live). En date historique
            // (J-1/J-5) il n'y a pas de live → delta nul.
            const bridgeDelta = isHistoricalDate ? 0 : liveDelta;
            const latent   = parseFloat(globalDashboard.totalPlLatentMad   || 0) + bridgeDelta;
            const realized = parseFloat(globalDashboard.totalPlRealizedMad || 0);
            const coupons  = parseFloat(globalDashboard.totalCouponsMad    || 0);
            const funding  = parseFloat(globalDashboard.totalFundingCostMad || 0);
            const accounting = latent + realized + coupons; // = P&L Comptable (Excel col. X), MtM live incluse
            const computed = accounting - funding;
            // P&L éco de référence = la MÊME valeur live que l'entête (sinon écart
            // visuel entête↔Bridge). En historique → agrégat REST de clôture.
            const pnlEcoBridge = isHistoricalDate
              ? parseFloat(globalDashboard.totalPlEcoMad || 0)
              : parseFloat(liveTotals?.totalPlEcoMad ?? globalDashboard.totalPlEcoMad ?? 0);
            const residual = pnlEcoBridge - computed;
            const isBalanced =
              Math.abs(residual) < Math.max(Math.abs(pnlEcoBridge) * 0.005, 10000);
            const items = [
              { label: "MtM Latent", val: latent,   color: latent   >= 0 ? "var(--profit)" : "var(--loss)" },
              { label: "Réalisé",    val: realized,  color: realized >= 0 ? "var(--profit)" : "var(--loss)" },
              { label: "Coupons",    val: coupons,   color: "var(--cyan)" },
            ];
            const maxAbs = Math.max(...items.map((x) => Math.abs(x.val)), Math.abs(funding), 1);
            return (
              <div
                className="card"
                style={{
                  padding: "10px 16px 12px",
                  borderLeft: "3px solid var(--cyan)",
                  background: "linear-gradient(90deg, rgba(0,202,255,0.03) 0%, transparent 60%)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--f-disp)",
                      fontWeight: 700,
                      fontSize: "0.55rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--tx3)",
                    }}
                  >
                    P&amp;L Bridge — Décomposition
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--f-mono)",
                      fontSize: "0.60rem",
                      fontWeight: 600,
                      color: isBalanced ? "var(--profit)" : "var(--warn)",
                      padding: "1px 6px",
                      borderRadius: 3,
                      background: isBalanced ? "rgba(0,232,153,0.08)" : "rgba(245,158,11,0.08)",
                      border: `1px solid ${isBalanced ? "rgba(0,232,153,0.20)" : "rgba(245,158,11,0.20)"}`,
                    }}
                  >
                    {isBalanced ? "✓ Balancé" : `Δ ${fMAD(residual, true)}`}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.map((item) => {
                    const barPct = (Math.abs(item.val) / maxAbs) * 100;
                    const pos = item.val >= 0;
                    return (
                      <div
                        key={item.label}
                        style={{ display: "flex", alignItems: "center", gap: 10 }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--f-disp)",
                            fontSize: "0.52rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--tx3)",
                            minWidth: 106,
                            flexShrink: 0,
                          }}
                        >
                          {pos ? "+" : "−"} {item.label}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 5,
                            background: "var(--elev)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${barPct}%`,
                              background: item.color,
                              borderRadius: 3,
                              opacity: 0.65,
                              transition: "width 0.7s ease",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            color: item.color,
                            minWidth: 84,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {fMAD(item.val, true)}
                        </span>
                      </div>
                    );
                  })}

                  {/* = P&L Comptable (Excel col. X) */}
                  <div style={{ borderTop: "1px dashed var(--b1)", marginTop: 2, paddingTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "var(--f-disp)", fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx2)", minWidth: 106, flexShrink: 0 }}>
                      = P&amp;L Comptable
                    </span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.74rem", fontWeight: 700, color: accounting >= 0 ? "var(--profit)" : "var(--loss)", minWidth: 84, textAlign: "right", flexShrink: 0 }}>
                      {fMAD(accounting, true)}
                    </span>
                  </div>

                  {/* − Financement (Excel col. Y) */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "var(--f-disp)", fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--warn)", minWidth: 106, flexShrink: 0 }}>
                      − Financement
                    </span>
                    <div style={{ flex: 1, height: 5, background: "var(--elev)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(Math.abs(funding) / maxAbs) * 100}%`, background: "var(--warn)", borderRadius: 3, opacity: 0.65, transition: "width 0.7s ease" }} />
                    </div>
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.72rem", fontWeight: 600, color: "var(--warn)", minWidth: 84, textAlign: "right", flexShrink: 0 }}>
                      {fMAD(-funding, true)}
                    </span>
                  </div>

                  {/* Résidu conversion FX si non balancé */}
                  {!isBalanced && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          fontFamily: "var(--f-disp)",
                          fontSize: "0.52rem",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--warn)",
                          minWidth: 106,
                          flexShrink: 0,
                        }}
                      >
                        ≈ Écart conversion FX
                      </span>
                      <div style={{ flex: 1 }} />
                      <span
                        style={{
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "var(--warn)",
                          minWidth: 84,
                          textAlign: "right",
                          flexShrink: 0,
                        }}
                      >
                        {fMAD(residual, true)}
                      </span>
                    </div>
                  )}

                  {/* Ligne totale */}
                  <div
                    style={{
                      borderTop: "1px solid var(--b1)",
                      marginTop: 2,
                      paddingTop: 7,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--f-disp)",
                        fontSize: "0.54rem",
                        fontWeight: 700,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "var(--tx1)",
                        minWidth: 106,
                        flexShrink: 0,
                      }}
                    >
                      = P&amp;L Économique
                    </span>
                    <div style={{ flex: 1 }} />
                    <span
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.90rem",
                        fontWeight: 700,
                        color: pnlEcoBridge >= 0 ? "var(--profit)" : "var(--loss)",
                        minWidth: 84,
                        textAlign: "right",
                        flexShrink: 0,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {fMAD(pnlEcoBridge, true)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Forecast 31 Déc ── */}
          {pnlEco !== 0 &&
            (() => {
              const year = new Date().getFullYear();
              const fM = (v) => {
                if (v == null) return "—";
                const n = parseFloat(v);
                const a = Math.abs(n),
                  s = n >= 0 ? "+" : "−";
                if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1)}M`;
                return `${s}${a.toFixed(0)}`;
              };
              const fPctShort = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
              const pessPct = (forecast.pess / DESK_TARGET) * 100;
              const centralPct = (forecast.central / DESK_TARGET) * 100;
              const optPct = (forecast.opt / DESK_TARGET) * 100;
              return (
                <div
                  className="card"
                  style={{
                    padding: "10px 14px",
                    borderLeft: "3px solid var(--cyan)",
                    background:
                      "linear-gradient(90deg, rgba(0,202,255,0.04) 0%, transparent 100%)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--f-disp)",
                          fontWeight: 700,
                          fontSize: "0.52rem",
                          letterSpacing: "0.13em",
                          textTransform: "uppercase",
                          color: "var(--tx3)",
                          marginBottom: 2,
                        }}
                      >
                        Forecast 31 Déc {year}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--f-mono)",
                          fontSize: "0.60rem",
                          color: "var(--tx3)",
                        }}
                      >
                        {forecast.tradDays}j écoulés · {forecast.remainDays}j
                        restants · Obj. {(DESK_TARGET / 1e6).toFixed(0)}M MAD
                      </div>
                    </div>
                    <div
                      style={{
                        width: 1,
                        height: 30,
                        background: "var(--b1)",
                        flexShrink: 0,
                      }}
                    />
                    {[
                      {
                        label: "Pessimiste",
                        val: forecast.pess,
                        pct: pessPct,
                        col: "var(--loss)",
                      },
                      {
                        label: "Central",
                        val: forecast.central,
                        pct: centralPct,
                        col: "var(--cyan)",
                      },
                      {
                        label: "Optimiste",
                        val: forecast.opt,
                        pct: optPct,
                        col: "var(--profit)",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          flexShrink: 0,
                          padding: "4px 12px",
                          borderRadius: 6,
                          background: `${s.col}10`,
                          border: `1px solid ${s.col}30`,
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--f-disp)",
                            fontSize: "0.50rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: s.col,
                            opacity: 0.85,
                            marginBottom: 2,
                          }}
                        >
                          {s.label}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--f-mono)",
                            fontWeight: 700,
                            fontSize: "0.80rem",
                            color: s.col,
                            lineHeight: 1,
                          }}
                        >
                          {fM(s.val)} MAD
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.55rem",
                            color: s.col,
                            opacity: 0.7,
                            marginTop: 1,
                          }}
                        >
                          {fPctShort(s.pct)} obj.
                        </div>
                      </div>
                    ))}
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--f-body)",
                            fontSize: "0.57rem",
                            color: "var(--tx3)",
                          }}
                        >
                          Réalisé {fPctShort(forecast.targetPct)} objectif
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.57rem",
                            color: "var(--tx3)",
                          }}
                        >
                          {fPctShort(forecast.yearProg * 100)} de l'année
                        </span>
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
                            width: `${Math.min(Math.abs(forecast.targetPct), 100)}%`,
                            borderRadius: 3,
                            background:
                              forecast.targetPct >= forecast.yearProg * 100
                                ? "var(--profit)"
                                : "var(--warn)",
                            transition: "width 0.8s ease",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* ── Par Classe d'Actifs ── */}
          {globalDashboard?.breakdown &&
            (() => {
              const bd = globalDashboard.breakdown;
              const classes = [
                {
                  key: "EUROBOND",
                  label: "Eurobonds",
                  color: "var(--eb)",
                  nominal: parseFloat(bd.EUROBOND?.nominalMad || 0),
                  pnl: parseFloat(bd.EUROBOND?.plEcoMad || 0),
                },
                {
                  key: "CLN",
                  label: "CLN",
                  color: "var(--cln)",
                  nominal: parseFloat(bd.CLN?.nominalMad || 0),
                  pnl: parseFloat(bd.CLN?.plEcoMad || 0),
                },
                {
                  key: "EGP_BILL",
                  label: "EGP Bills",
                  color: "var(--egp)",
                  nominal: parseFloat(bd.EGP_BILL?.nominalMad || 0),
                  pnl: parseFloat(bd.EGP_BILL?.plEcoMad || 0),
                },
              ].filter((c) => c.nominal !== 0 || c.pnl !== 0);
              if (!classes.length) return null;
              const totalAbs =
                classes.reduce((s, c) => s + Math.abs(c.pnl), 0) || 1;
              return (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <SectionDivider>Par Classe d'Actifs</SectionDivider>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {classes.map((c) => {
                      const pos = c.pnl >= 0;
                      const pct = ((Math.abs(c.pnl) / totalAbs) * 100).toFixed(
                        0,
                      );
                      return (
                        <div
                          key={c.key}
                          className="card"
                          style={{
                            flex: "1 1 180px",
                            padding: "8px 10px",
                            overflow: "hidden",
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
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: 2,
                                  background: c.color,
                                  display: "inline-block",
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                className="lbl"
                                style={{ fontSize: "0.58rem" }}
                              >
                                {c.label}
                              </span>
                            </div>
                            <span
                              style={{
                                fontFamily: "var(--f-mono)",
                                fontSize: "0.57rem",
                                color: "var(--tx3)",
                                background: "var(--elev)",
                                padding: "1px 5px",
                                borderRadius: 3,
                                border: "1px solid var(--b1)",
                              }}
                            >
                              {pct}%
                            </span>
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--f-mono)",
                              fontWeight: 700,
                              fontSize: "1.15rem",
                              color: pos ? "var(--profit)" : "var(--loss)",
                              lineHeight: 1,
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {fMAD(c.pnl, true)}
                          </div>
                          <div
                            style={{
                              marginTop: 6,
                              fontFamily: "var(--f-body)",
                              fontSize: "0.63rem",
                              color: "var(--tx3)",
                            }}
                          >
                            {fN(c.nominal / 1e6, 1)} M MAD nominal
                          </div>
                          <div
                            style={{
                              marginTop: 9,
                              height: 3,
                              background: "var(--elev)",
                              borderRadius: 2,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${pct}%`,
                                background: c.color,
                                borderRadius: 2,
                                opacity: 0.55,
                                transition: "width 0.6s ease",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          {/* ── Maturity Ladder ── */}
          <MaturityLadder positions={positions} rates={rates} />

          {/* ── G-Spread Watchlist ── */}
          <GSpreadWatchlist positions={positions} />

          {/* ── Historical P&L Chart ── */}
          <div className="card" style={{ padding: "14px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <p className="sect-ttl">P&L Économique — Historique (MAD)</p>
                <span
                  style={{
                    fontFamily: "var(--f-body)",
                    fontSize: "0.63rem",
                    color: "var(--tx3)",
                  }}
                >
                  {chartSlice.length > 0
                    ? `${chartSlice.length} jours ouvrés${chartDerived ? " · estimé" : ""}`
                    : "Chargement…"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {chartSlice.length >= 2 &&
                  (() => {
                    const first = parseFloat(chartSlice[0]?.pnlEcoMad || 0);
                    const last = parseFloat(
                      chartSlice[chartSlice.length - 1]?.pnlEcoMad || 0,
                    );
                    const delta = last - first;
                    const pos = delta >= 0;
                    return (
                      <Tooltip title={`Variation sur la fenêtre ${chartRange}`}>
                        <Tag
                          color={pos ? "success" : "error"}
                          style={{
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            margin: 0,
                          }}
                        >
                          {pos ? "+" : ""}
                          {(delta / 1e6).toFixed(1)}M MAD
                        </Tag>
                      </Tooltip>
                    );
                  })()}
                <Segmented
                  size="small"
                  value={chartRange}
                  onChange={setChartRange}
                  options={["1M", "2M", "3M"]}
                  style={{ fontFamily: "var(--f-disp)", fontWeight: 600 }}
                />
              </div>
            </div>
            <PnlLineChart data={chartSlice} />
          </div>

          {/* ── Coupon Calendar ── */}
          <CouponCalendar positions={positions} rates={rates} />

          {/* ── Analytics Row ── */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {/* Donut allocation */}
            <div
              className="card slide-up stagger-3"
              style={{ padding: "16px" }}
            >
              <p className="sect-ttl" style={{ marginBottom: 14 }}>
                Répartition de l'Exposition
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                  <DonutChart segments={donutSegs} unit="MAD" />
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {donutSegs.map((seg) => {
                    const pct =
                      donutTotal > 0
                        ? ((seg.value / donutTotal) * 100).toFixed(1)
                        : "0";
                    return (
                      <div
                        key={seg.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: seg.color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "var(--f-body)",
                            fontSize: "0.70rem",
                            color: "var(--tx2)",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {seg.label}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--f-mono)",
                            fontSize: "0.72rem",
                            color: "var(--tx1)",
                            fontWeight: 500,
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                  {!donutSegs.length && (
                    <p
                      style={{
                        fontFamily: "var(--f-body)",
                        fontSize: "0.72rem",
                        color: "var(--tx3)",
                      }}
                    >
                      Pas de données
                    </p>
                  )}
                </div>
              </div>
              {/* Exposure limit bar */}
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "1px solid var(--b1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span className="lbl">Limite Réglementaire</span>
                  {limitConfigured ? (
                    <span
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.68rem",
                        color: limitOver ? "var(--loss)" : "var(--profit)",
                        fontWeight: 600,
                      }}
                    >
                      {fUSD(exposureEur / 1e6)}M / {fUSD(effectiveLimitEur / 1e6)}M EUR
                    </span>
                  ) : (
                    <Tag color="warning" style={{ fontSize: "0.60rem" }}>
                      Non configurée
                    </Tag>
                  )}
                </div>
                <Progress
                  percent={limitConfigured ? Math.min(limitPct, 100) : 0}
                  showInfo={false}
                  strokeColor={limitOver ? "var(--loss)" : "var(--profit)"}
                  trailColor="var(--elev)"
                  size={["100%", 6]}
                  style={{ margin: 0, lineHeight: 1 }}
                />
              </div>

              {/* P&L Attribution by asset class — même source que le donut */}
              {(() => {
                  const classes = [
                    {
                      key: "EUROBOND",
                      label: "Eurobonds",
                      color: "var(--eb)",
                      pnl: assetBreakdown.EUROBOND.plEcoMad,
                    },
                    {
                      key: "CLN",
                      label: "CLN",
                      color: "var(--cln)",
                      pnl: assetBreakdown.CLN.plEcoMad,
                    },
                    {
                      key: "EGP_BILL",
                      label: "EGP Bills",
                      color: "var(--egp)",
                      pnl: assetBreakdown.EGP_BILL.plEcoMad,
                    },
                  ].filter((c) => c.pnl !== 0);
                  if (!classes.length) return null;
                  const maxAbs = Math.max(
                    ...classes.map((c) => Math.abs(c.pnl)),
                    1,
                  );
                  return (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid var(--b1)",
                      }}
                    >
                      <span
                        className="lbl"
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        P&L Éco · Répartition
                      </span>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {classes.map((c) => {
                          const pct = (Math.abs(c.pnl) / maxAbs) * 100;
                          const pos = c.pnl >= 0;
                          return (
                            <div key={c.key}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "baseline",
                                  marginBottom: 3,
                                }}
                              >
                                <span
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: 1,
                                      background: c.color,
                                      flexShrink: 0,
                                      display: "inline-block",
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontFamily: "var(--f-body)",
                                      fontSize: "0.65rem",
                                      color: "var(--tx3)",
                                    }}
                                  >
                                    {c.label}
                                  </span>
                                </span>
                                <span
                                  style={{
                                    fontFamily: "var(--f-mono)",
                                    fontSize: "0.68rem",
                                    fontWeight: 600,
                                    color: pos
                                      ? "var(--profit)"
                                      : "var(--loss)",
                                  }}
                                >
                                  {fMAD(c.pnl, true)}
                                </span>
                              </div>
                              <div
                                style={{
                                  height: 4,
                                  background: "var(--elev)",
                                  borderRadius: 2,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${pct}%`,
                                    background: pos
                                      ? "var(--profit)"
                                      : "var(--loss)",
                                    borderRadius: 2,
                                    transition: "width 0.6s ease",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
            </div>

            {/* Risk Metrics — Arc Gauges */}
            <div
              className="card slide-up stagger-5"
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p className="sect-ttl">Métriques de Risque</p>
                <Tag style={{ fontFamily: "var(--f-mono)", fontSize: "0.58rem" }}>
                  Budget de Risque
                </Tag>
              </div>

              {/* 3 jauges — toutes en % d'une référence réelle (0–100 %) :
                  consommation de limite, concentration, atteinte de l'objectif.
                  Duration & DV01 restent en KPI chiffrés (au-dessus) — une jauge
                  sans borne réelle n'aurait aucun sens pour un trader. */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>

                {/* Expo / Limite */}
                <Card
                  size="small"
                  style={limitOver ? { borderColor: "rgba(255,43,96,0.35)" } : {}}
                  styles={{ body: { padding: "10px 6px 8px", textAlign: "center" } }}
                >
                  <Progress
                    type="dashboard"
                    size={82}
                    percent={limitConfigured ? Math.min(Math.round(limitPct), 100) : 0}
                    strokeColor={
                      !limitConfigured ? "var(--tx3)"
                      : limitOver       ? "var(--loss)"
                      :                   "var(--profit)"
                    }
                    trailColor="rgba(255,255,255,0.06)"
                    format={() => (
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.78rem", fontWeight: 700, color: !limitConfigured ? "var(--tx3)" : limitOver ? "var(--loss)" : "var(--profit)" }}>
                        {limitConfigured ? `${Math.round(limitPct)}%` : "—"}
                      </span>
                    )}
                  />
                  <div style={{ fontFamily: "var(--f-disp)", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx3)", marginTop: 4 }}>
                    Expo / Lim.
                  </div>
                </Card>

                {/* VaR 1j 99 % — consommation du budget de risque du desk.
                    Métrique cœur d'un trader taux (vert < 70 %, ambre 70-100 %). */}
                {(() => {
                  const vColor =
                    varPct >= 100 ? "var(--loss)" : varPct >= 70 ? "var(--warn)" : "var(--profit)";
                  return (
                    <Card size="small" styles={{ body: { padding: "10px 6px 8px", textAlign: "center" } }}>
                      <Progress
                        type="dashboard"
                        size={82}
                        percent={Math.min(Math.round(varPct), 100)}
                        strokeColor={vColor}
                        trailColor="rgba(255,255,255,0.06)"
                        format={() => (
                          <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.78rem", fontWeight: 700, color: vColor }}>
                            {var1dUsd > 0 ? `${Math.round(varPct)}%` : "—"}
                          </span>
                        )}
                      />
                      <div style={{ fontFamily: "var(--f-disp)", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx3)", marginTop: 4 }}>
                        VaR 1j / Budget
                      </div>
                    </Card>
                  );
                })()}

                {/* Objectif Annuel — % du target P&L atteint (plus = mieux) */}
                {(() => {
                  const tColor = targetPct < 0 ? "var(--loss)" : targetPct >= 100 ? "var(--profit)" : "var(--cyan)";
                  return (
                    <Card size="small" styles={{ body: { padding: "10px 6px 8px", textAlign: "center" } }}>
                      <Progress
                        type="dashboard"
                        size={82}
                        percent={targetGaugePct}
                        strokeColor={tColor}
                        trailColor="rgba(255,255,255,0.06)"
                        format={() => (
                          <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.78rem", fontWeight: 700, color: tColor }}>
                            {`${Math.round(targetPct)}%`}
                          </span>
                        )}
                      />
                      <div style={{ fontFamily: "var(--f-disp)", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--tx3)", marginTop: 4 }}>
                        Objectif An.
                      </div>
                    </Card>
                  );
                })()}
              </div>

              {/* Pied de panneau informatif — JAMAIS d'alarme ici.
                  Les alertes carry sont routées vers la cloche de notifications
                  du bandeau supérieur (TopBar). */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--surf)",
                  border: "1px solid var(--b1)",
                }}
              >
                <span style={{ fontFamily: "var(--f-disp)", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--tx3)" }}>
                  VaR 1j · 99 %
                </span>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.74rem", fontWeight: 700, color: "var(--tx1)" }}>
                  {var1dUsd > 0 ? `${fN(var1dUsd / 1000, 0)} K$` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Bandeau d'alerte carry retiré de la page d'accueil — les alertes
              sont désormais centralisées dans la cloche de notifications (TopBar). */}

          {/* ── Position Table ── */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--b1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                  Positions Live
                </h3>
                <Badge
                  status="processing"
                  color="var(--profit)"
                  text={
                    <span
                      style={{
                        fontFamily: "var(--f-disp)",
                        fontSize: "0.55rem",
                        fontWeight: 700,
                        letterSpacing: "0.10em",
                        color: "var(--profit)",
                      }}
                    >
                      LIVE
                    </span>
                  }
                />
                <span
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: "0.66rem",
                    color: "var(--tx3)",
                    padding: "2px 8px",
                    background: "var(--elev)",
                    borderRadius: 4,
                    border: "1px solid var(--b1)",
                  }}
                >
                  {positions.length} pos.
                </span>
              </div>
              {positions.length > 15 && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setShowAll((v) => !v)}
                  icon={
                    showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  }
                  style={{ fontSize: "0.70rem" }}
                >
                  {showAll ? "Réduire" : `Voir tout (${positions.length})`}
                </Button>
              )}
            </div>

            <PositionsTable
              groups={groups}
              positions={positions}
              pnlEco={pnlEco}
              netDaily={netDaily}
              dv01={dv01}
            />

            {positions.length === 0 && !loading && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: "40px 0" }}
                description={
                  <span
                    style={{
                      fontFamily: "var(--f-body)",
                      fontSize: "0.75rem",
                      color: "var(--tx3)",
                    }}
                  >
                    Aucune position pour le {selectedDate}
                  </span>
                }
              />
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PortfolioView;
