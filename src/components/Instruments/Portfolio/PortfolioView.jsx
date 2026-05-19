import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useTrading } from '../../../contexts/TradingContext';
import { useAuth } from '../../../contexts/AuthContext';
import {
  TrendingUp, TrendingDown, Activity, AlertTriangle,
  RefreshCw, WifiOff, ChevronDown, ChevronUp, Calendar,
} from 'lucide-react';

/* ─── Formatters ─────────────────────────────────────────────────── */
const fMAD = (v, compact = false) => {
  if (v == null) return '—';
  const n = parseFloat(v); if (isNaN(n)) return '—';
  if (compact) {
    const a = Math.abs(n);
    const s = n >= 0 ? '+' : '−';
    if (a >= 1e9) return `${s}${(Math.abs(n) / 1e9).toFixed(2)} Md`;
    if (a >= 1e6) return `${s}${(Math.abs(n) / 1e6).toFixed(2)} M`;
    return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  }
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);
};
const fN = (v, d = 2) => {
  if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fUSD = (v) => {
  if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)} B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
};
const fPct = (v, d = 2) => {
  if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(d)} %`;
};
const fCoupon  = (v) => { if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—'; return `${(n < 1 ? n * 100 : n).toFixed(2)}%`; };
const fMatDate = (s) => { if (!s) return '—'; const p = s.split('-'); return p.length >= 2 ? `${p[1]}/${String(p[0]).slice(2)}` : s; };
const pnlColor = (v) => parseFloat(v || 0) >= 0 ? 'var(--profit)' : 'var(--loss)';
const pnlGlow  = (v) => parseFloat(v || 0) >= 0 ? 'glow-profit' : 'glow-loss';

/* ─── Price flash hook ───────────────────────────────────────────── */
const useFlash = (value) => {
  const prev = useRef(value);
  const [cls, setCls] = useState('');
  useEffect(() => {
    const cur = parseFloat(value || 0), p = parseFloat(prev.current || 0);
    if (cur !== p && p !== 0) {
      setCls(cur > p ? 'tick-up' : 'tick-down');
      const t = setTimeout(() => setCls(''), 800);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return cls;
};

/* ─── KPI Card ───────────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, valueColor, valueClass = '', animClass = '' }) => (
  <div className={`card ${animClass}`} style={{ flex: '1 1 148px', padding: '8px 10px', overflow: 'hidden' }}>
    <span className="lbl" style={{ display: 'block', marginBottom: 5, fontSize: '0.53rem', letterSpacing: '0.12em' }}>{label}</span>
    <div className={`n ${valueClass}`} style={{ fontSize: '1.30rem', fontWeight: 600, lineHeight: 1, color: valueColor, letterSpacing: '-0.03em' }}>
      {value}
    </div>
    {sub && (
      <div style={{ marginTop: 6, fontFamily: 'var(--f-body)', fontSize: '0.60rem', color: 'var(--tx3)', lineHeight: 1.3 }}>
        {sub}
      </div>
    )}
  </div>
);

/* ─── Arc Gauge (semi-circle, SVG) ──────────────────────────────── */
const ARC_R     = 36;
const ARC_TOTAL = Math.PI * ARC_R; // ≈ 113.1

const ArcGauge = ({ value, max, color, label, valueStr }) => {
  const pct   = max > 0 ? Math.min(value / max, 1.0) : 0;
  const over  = max > 0 && value > max;
  const stroke = over ? 'var(--loss)' : color;
  const fill  = pct * ARC_TOTAL;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox="0 0 100 56" style={{ width: '100%', maxWidth: 120 }}>
        {/* Track */}
        <path d="M 14,50 A 36,36 0 0,1 86,50"
          fill="none" stroke="var(--b1)" strokeWidth="7" strokeLinecap="round" />
        {/* Fill */}
        <path d="M 14,50 A 36,36 0 0,1 86,50"
          fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${fill.toFixed(2)} ${ARC_TOTAL.toFixed(2)}`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.34,1.56,0.64,1), stroke 0.3s ease' }}
        />
        {/* Value */}
        <text x="50" y="38" textAnchor="middle"
          fill={stroke} fontSize="11"
          fontFamily="JetBrains Mono,monospace" fontWeight="600">
          {valueStr}
        </text>
        {/* Pct */}
        <text x="50" y="49" textAnchor="middle"
          fill="var(--tx3)" fontSize="7"
          fontFamily="Syne,sans-serif" letterSpacing="0.5">
          {`${(pct * 100).toFixed(0)} %`}
        </text>
      </svg>
      <span className="lbl" style={{ textAlign: 'center', fontSize: '0.56rem', marginTop: 2 }}>{label}</span>
    </div>
  );
};

/* ─── Donut Chart (SVG) ──────────────────────────────────────────── */
const R = 44, CIRC = 2 * Math.PI * R;
const DonutChart = ({ segments }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--tx3)', fontSize: '0.75rem' }}>—</div>;
  let offset = 0;
  const slices = segments.map(seg => {
    const frac = seg.value / total;
    const r = { ...seg, dash: frac * CIRC, gap: CIRC - frac * CIRC, rot: offset * 360 - 90 };
    offset += frac;
    return r;
  });
  return (
    <svg viewBox="0 0 110 110" style={{ width: '100%', maxWidth: 120, maxHeight: 120 }}>
      <circle cx="55" cy="55" r={R} fill="none" stroke="var(--elev)" strokeWidth="14" />
      {slices.map((s, i) => (
        <circle key={i} cx="55" cy="55" r={R} fill="none"
          stroke={s.color} strokeWidth="14"
          strokeDasharray={`${s.dash} ${s.gap}`}
          transform={`rotate(${s.rot}, 55, 55)`} opacity="0.90" />
      ))}
      <text x="55" y="51" textAnchor="middle" fill="var(--tx3)" fontSize="7.5" fontFamily="Syne,sans-serif" fontWeight="700" letterSpacing="1">
        EXPO
      </text>
      <text x="55" y="63" textAnchor="middle" fill="var(--tx1)" fontSize="9" fontFamily="JetBrains Mono,monospace" fontWeight="500">
        {fUSD(total / 1e6)}M
      </text>
    </svg>
  );
};

/* ─── Historical P&L Line Chart (pure SVG, no lib) ──────────────── */
const PnlLineChart = ({ data }) => {
  const [hover, setHover] = useState(null);
  const svgRef = useRef();

  const W = 800, H = 190;
  const padL = 70, padR = 24, padT = 22, padB = 34;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = useMemo(() => {
    if (!data || data.length < 2) return [];
    const vals = data.map(d => parseFloat(d.pnlEcoMad || 0));
    const minV  = Math.min(...vals);
    const maxV  = Math.max(...vals);
    const range = maxV - minV || 1;
    const lo    = minV - range * 0.12;
    const hi    = maxV + range * 0.12;
    const span  = hi - lo;
    return data.map((d, i) => ({
      x:    padL + (i / (data.length - 1)) * chartW,
      y:    padT + ((hi - parseFloat(d.pnlEcoMad || 0)) / span) * chartH,
      date: d.snapshotDate,
      val:  parseFloat(d.pnlEcoMad || 0),
      lo, hi, span,
    }));
  }, [data]);

  const yTicks = useMemo(() => {
    if (!points.length) return [];
    const { lo, span } = points[0];
    return Array.from({ length: 5 }, (_, i) => lo + (span * i / 4));
  }, [points]);

  const toY = useCallback((v) => {
    if (!points.length) return 0;
    const { lo, span } = points[0];
    return padT + ((points[0].hi - v) / span) * chartH;
  }, [points, chartH]);

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current || !points.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    if (mx < padL || mx > W - padR) { setHover(null); return; }
    let ci = 0, minD = Infinity;
    points.forEach((p, i) => { const d = Math.abs(p.x - mx); if (d < minD) { minD = d; ci = i; } });
    setHover(points[ci]);
  }, [points]);

  if (!data || data.length < 2) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 190, color: 'var(--tx3)', fontFamily: 'var(--f-body)', fontSize: '0.75rem' }}>
      Données historiques non disponibles
    </div>
  );

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(padT + chartH).toFixed(1)} L${padL},${(padT + chartH).toFixed(1)} Z`;

  const fM = v => {
    const m = v / 1e6;
    return `${m >= 0 ? '+' : ''}${m.toFixed(1)}M`;
  };
  const fD  = s => { if (!s) return ''; const [, m, d] = s.split('-'); return `${d}/${m}`; };
  const fDF = s => { if (!s) return ''; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };

  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const delta = lastPt.val - firstPt.val;
  const positive = delta >= 0;

  const step = Math.ceil(data.length / 7);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 190, cursor: 'crosshair', display: 'block' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="pnlAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={positive ? '#22C55E' : '#EF4444'} stopOpacity="0.28" />
          <stop offset="100%" stopColor={positive ? '#22C55E' : '#EF4444'} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y grid + labels */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={toY(v)} y2={toY(v)} style={{ stroke: 'var(--chart-grid)' }} strokeWidth="1" strokeDasharray="3,5" />
          <text x={padL - 6} y={toY(v) + 3.5} textAnchor="end" style={{ fill: 'var(--tx3)' }} fontSize="8.5" fontFamily="JetBrains Mono,monospace">{fM(v)}</text>
        </g>
      ))}

      {/* Axis lines */}
      <line x1={padL} x2={padL} y1={padT} y2={padT + chartH} style={{ stroke: 'var(--chart-axis)' }} strokeWidth="1" />
      <line x1={padL} x2={W - padR} y1={padT + chartH} y2={padT + chartH} style={{ stroke: 'var(--chart-axis)' }} strokeWidth="1" />

      {/* Area fill */}
      <path d={areaPath} fill="url(#pnlAreaGrad)" />

      {/* Main line */}
      <path d={linePath} fill="none" stroke={positive ? '#22C55E' : '#EF4444'} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />

      {/* X axis labels */}
      {points.map((p, i) => {
        if (i % step !== 0 && i !== points.length - 1) return null;
        return (
          <text key={i} x={p.x} y={H - padB + 14} textAnchor="middle" style={{ fill: 'var(--tx3)' }} fontSize="8" fontFamily="JetBrains Mono,monospace">
            {fD(p.date)}
          </text>
        );
      })}

      {/* Last value dot + ring */}
      <circle cx={lastPt.x} cy={lastPt.y} r="3.5" fill={positive ? '#22C55E' : '#EF4444'} />
      <circle cx={lastPt.x} cy={lastPt.y} r="7" fill="none" stroke={positive ? '#22C55E' : '#EF4444'} strokeWidth="1" strokeOpacity="0.35" />

      {/* Last value label */}
      <text x={lastPt.x + 10} y={lastPt.y + 4} fill={positive ? '#22C55E' : '#EF4444'} fontSize="9" fontFamily="JetBrains Mono,monospace" fontWeight="600">
        {fM(lastPt.val)}
      </text>

      {/* Hover crosshair */}
      {hover && (
        <>
          <line x1={hover.x} x2={hover.x} y1={padT} y2={padT + chartH} style={{ stroke: 'var(--tx2)' }} strokeWidth="1" strokeDasharray="3,3" strokeOpacity="0.5" />
          <circle cx={hover.x} cy={hover.y} r="4" fill={positive ? '#22C55E' : '#EF4444'} stroke="var(--void)" strokeWidth="2" />
          <g transform={`translate(${Math.min(hover.x + 10, W - 148)},${Math.max(hover.y - 38, padT)})`}>
            <rect width="138" height="36" rx="5" fill="rgba(5,18,34,0.94)" stroke={positive ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'} strokeWidth="1" />
            <text x="9" y="14" fill="rgba(156,163,175,0.9)" fontSize="8" fontFamily="JetBrains Mono,monospace">{fDF(hover.date)}</text>
            <text x="9" y="27" fill={positive ? '#22C55E' : '#EF4444'} fontSize="10.5" fontFamily="JetBrains Mono,monospace" fontWeight="700">{fM(hover.val)} MAD</text>
          </g>
        </>
      )}
    </svg>
  );
};

/* ─── Position Row ───────────────────────────────────────────────── */
const PositionRow = ({ r, idx }) => {
  const flash = useFlash(r.dirtyMarket);
  const isAlert = r.netDailyAlert;
  return (
    <tr className={flash} style={{ background: isAlert ? 'rgba(255,43,96,0.04)' : idx % 2 === 0 ? 'var(--tr-even-bg)' : 'transparent' }}>
      <td style={{ fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--cyan)', fontWeight: 500 }}>{r.isin}</td>
      <td style={{ textAlign: 'left', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.72rem', color: 'var(--tx1)' }} title={r.description}>
        {r.description || '—'}
      </td>
      <td>
        {r.subAsset && (
          <span className={`badge ${
            (r.subAsset || '').toLowerCase().includes('ocp') ? 'badge-eb' :
            (r.subAsset || '').toLowerCase().includes('cln') ? 'badge-cln' :
            (r.subAsset || '').toLowerCase().includes('egp') ? 'badge-egp' : 'badge-eb'
          }`}>{r.subAsset}</span>
        )}
      </td>
      <td style={{ color: 'var(--tx1)', fontWeight: 500 }}>
        {fN(parseFloat(r.netNominal || 0) / 1e6, 1)}<span style={{ color: 'var(--tx3)', fontSize: '0.60rem', marginLeft: 2 }}>M</span>
      </td>
      <td style={{ color: 'var(--tx3)', textAlign: 'right' }}>{fCoupon(r.couponRate)}</td>
      <td style={{ color: 'var(--tx3)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fMatDate(r.maturityDate)}</td>
      <td style={{ color: 'var(--tx2)' }}>{fN(r.lastWapDirty, 4)}</td>
      <td>{fN(r.dirtyMarket, 4)}</td>
      <td style={{ color: pnlColor(parseFloat(r.perfWap || 0) * 100), fontWeight: 500 }}>
        {fPct(parseFloat(r.perfWap || 0) * 100, 3)}
      </td>
      <td style={{ color: 'var(--tx2)', textAlign: 'right' }}>
        {r.gSpreadBid != null ? `${fN(r.gSpreadBid, 0)} bp` : '—'}
      </td>
      <td style={{ color: pnlColor(r.pnlEconomicMad), fontWeight: 600 }}>
        {fMAD(r.pnlEconomicMad, true)}
      </td>
      <td style={{ color: pnlColor(r.netDailyMad) }}>
        {fMAD(r.netDailyMad, true)}
      </td>
      <td style={{ color: 'var(--tx2)' }}>{fN(r.modifiedDuration, 2)}</td>
      <td style={{ color: '#60A5FA' }}>{fN(r.dv01Bond, 0)}</td>
      <td style={{ textAlign: 'center' }}>
        {r.decision === 'BUY'
          ? <span className="badge badge-active">▲ BUY</span>
          : r.decision === 'HOLD'
          ? <span className="badge badge-closed">— HOLD</span>
          : null}
      </td>
    </tr>
  );
};

/* ─── Category Row ───────────────────────────────────────────────── */
const CAT_STYLE = {
  EUROBOND: { bg: 'rgba(30,127,255,0.05)',  bgBadge: 'rgba(30,127,255,0.15)',  border: 'rgba(30,127,255,0.22)'  },
  CLN:      { bg: 'rgba(155,62,239,0.05)', bgBadge: 'rgba(155,62,239,0.15)', border: 'rgba(155,62,239,0.22)'  },
  EGP:      { bg: 'rgba(0,194,140,0.05)',  bgBadge: 'rgba(0,194,140,0.15)',  border: 'rgba(0,194,140,0.22)'   },
};

const CatRow = ({ catKey, label, color, rows, totalPnl }) => {
  const gPnl = rows.reduce((s, r) => s + parseFloat(r.pnlEconomicMad || 0), 0);
  const gNet = rows.reduce((s, r) => s + parseFloat(r.netDailyMad    || 0), 0);
  const gNom = rows.reduce((s, r) => s + parseFloat(r.netNominal     || 0), 0);
  const contribution = Math.abs(totalPnl) > 0 ? (gPnl / Math.abs(totalPnl) * 100) : 0;
  const st = CAT_STYLE[catKey] || CAT_STYLE.EUROBOND;
  return (
    <tr style={{ background: st.bg, borderTop: `2px solid ${st.border}`, userSelect: 'none' }}>
      <td colSpan={3} style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.60rem', letterSpacing: '0.12em', textTransform: 'uppercase', color, padding: '7px 8px 7px 12px' }}>
        <span style={{ opacity: 0.6, marginRight: 6 }}>&#9658;</span>
        {label}
        <span style={{ marginLeft: 8, fontFamily: 'var(--f-mono)', fontSize: '0.55rem', padding: '1px 5px', borderRadius: 4, background: st.bgBadge, border: `1px solid ${st.border}` }}>
          {rows.length}
        </span>
      </td>
      <td style={{ fontFamily: 'var(--f-mono)', fontWeight: 600, fontSize: '0.70rem', color: 'var(--tx1)', textAlign: 'right' }}>
        {fN(gNom / 1e6, 1)}<span style={{ color: 'var(--tx3)', fontSize: '0.58rem', marginLeft: 2 }}>M</span>
      </td>
      <td colSpan={6} />
      <td style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: '0.70rem', color: pnlColor(gPnl), textAlign: 'right' }}>
        {fMAD(gPnl, true)}
        {Math.abs(contribution) > 0.5 && (
          <span style={{ display: 'block', fontSize: '0.55rem', color: 'var(--tx3)', fontWeight: 400 }}>
            {contribution >= 0 ? '+' : ''}{contribution.toFixed(0)}%
          </span>
        )}
      </td>
      <td style={{ fontFamily: 'var(--f-mono)', fontSize: '0.70rem', color: pnlColor(gNet), textAlign: 'right' }}>
        {fMAD(gNet, true)}
      </td>
      <td colSpan={3} />
    </tr>
  );
};

/* ─── Market Rates Strip ─────────────────────────────────────────── */
const RATES_ITEMS = [
  { label: 'SOFR',     key: 'sofr',       fmt: v => `${parseFloat(v).toFixed(2)}%`, fallback: '4.30%', col: '#60A5FA' },
  { label: 'ESTR',     key: 'estr',       fmt: v => `${parseFloat(v).toFixed(2)}%`, fallback: '2.17%', col: '#60A5FA' },
  { label: 'SOFR 10Y', key: 'sofr10Year', fmt: v => `${parseFloat(v).toFixed(2)}%`, fallback: '3.90%', col: '#C084FC' },
  { label: 'USD/MAD',  key: 'usdMad',     fmt: v => parseFloat(v).toFixed(3),       fallback: '9.251',  col: '#FCD34D' },
  { label: 'EUR/MAD',  key: 'eurMad',     fmt: v => parseFloat(v).toFixed(3),       fallback: '10.418', col: '#FCD34D' },
  { label: 'EUR/USD',  key: 'eurUsd',     fmt: v => parseFloat(v).toFixed(3),       fallback: '1.126',  col: '#34D399' },
];

const RatesStrip = ({ rates }) => (
  <div style={{ background: 'var(--surf)', borderBottom: '1px solid var(--b0)', padding: '4px 20px', display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', flexShrink: 0, minHeight: 26 }}>
    <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.50rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: rates ? 'var(--profit)' : 'var(--tx3)', marginRight: 12, flexShrink: 0, padding: '1px 5px', borderRadius: 3, background: rates ? 'rgba(0,232,153,0.08)' : 'rgba(100,116,139,0.10)', border: `1px solid ${rates ? 'rgba(0,232,153,0.18)' : 'rgba(100,116,139,0.18)'}` }}>
      {rates ? 'LIVE' : 'REF.'}
    </span>
    {RATES_ITEMS.map((item, i) => {
      const raw     = rates?.[item.key];
      const display = raw != null ? item.fmt(raw) : item.fallback;
      return (
        <React.Fragment key={item.label}>
          {i > 0 && <span style={{ color: 'var(--b2)', padding: '0 10px', flexShrink: 0, fontSize: '0.60rem' }}>·</span>}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.50rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--tx3)' }}>{item.label}</span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.70rem', fontWeight: 600, color: item.col }}>{display}</span>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

/* ─── G-Spread Watchlist ─────────────────────────────────────────── */
const GSpreadWatchlist = ({ positions }) => {
  const bonds = (positions || [])
    .filter(r => r.gSpreadBid != null)
    .sort((a, b) => {
      const dA = parseFloat(a.gSpreadBid || 0) - parseFloat(a.targetSpread || 0);
      const dB = parseFloat(b.gSpreadBid || 0) - parseFloat(b.targetSpread || 0);
      return dB - dA;
    });
  if (!bonds.length) return null;
  const maxBid = Math.max(...bonds.map(r => parseFloat(r.gSpreadBid || 0)), 1);
  const buys   = bonds.filter(r => r.decision === 'BUY').length;
  return (
    <div className="card slide-up stagger-2" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
            G-Spread Watchlist
          </h3>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.65rem', color: 'var(--tx3)', padding: '2px 7px', background: 'var(--elev)', borderRadius: 4, border: '1px solid var(--b1)' }}>
            {bonds.length}
          </span>
          {buys > 0 && <span className="badge badge-active">▲ {buys} BUY</span>}
        </div>
        <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.59rem', color: 'var(--tx3)' }}>
          Bid vs Target · bp · trié par opportunité
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', minWidth: 160 }}>Obligation</th>
              <th style={{ textAlign: 'right' }}>Bid bp</th>
              <th style={{ textAlign: 'right' }}>Mid bp</th>
              <th style={{ textAlign: 'right' }}>Target</th>
              <th style={{ textAlign: 'center', minWidth: 110 }}>Spread / Target</th>
              <th style={{ textAlign: 'right' }}>Gap</th>
              <th style={{ textAlign: 'center' }}>Signal</th>
            </tr>
          </thead>
          <tbody>
            {bonds.map((r, idx) => {
              const bid    = parseFloat(r.gSpreadBid   || 0);
              const mid    = parseFloat(r.gSpreadMid   || 0);
              const target = parseFloat(r.targetSpread || 0);
              const gap    = bid - target;
              const isBuy  = r.decision === 'BUY';
              const bidPct = (bid / maxBid) * 100;
              const tgtPct = target > 0 ? (target / maxBid) * 100 : 0;
              const rowBg  = idx % 2 === 0 ? 'var(--tr-even-bg)' : 'transparent';
              return (
                <tr key={r.isin} style={{ background: rowBg }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--tr-hover-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.70rem', color: 'var(--tx1)' }} title={r.description}>
                    {r.description || r.isin}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: '#FCD34D', fontWeight: 500 }}>{fN(bid, 1)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--tx2)' }}>{fN(mid, 1)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--tx3)' }}>
                    {target > 0 ? fN(target, 1) : '—'}
                  </td>
                  <td>
                    <div style={{ position: 'relative', height: 6, background: 'var(--elev)', borderRadius: 3, overflow: 'hidden', margin: '0 4px' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${bidPct}%`, background: isBuy ? 'rgba(0,232,153,0.65)' : 'rgba(200,145,12,0.55)', borderRadius: 3 }} />
                      {tgtPct > 0 && <div style={{ position: 'absolute', left: `${tgtPct}%`, top: -1, bottom: -1, width: 2, background: 'rgba(255,43,96,0.75)', transform: 'translateX(-50%)' }} />}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', fontWeight: 600, color: gap > 0 ? 'var(--profit)' : gap < -5 ? 'var(--loss)' : 'var(--tx2)' }}>
                    {gap > 0 ? '+' : ''}{fN(gap, 1)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isBuy
                      ? <span className="badge badge-active">▲ BUY</span>
                      : <span className="badge badge-closed">— HOLD</span>}
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

/* ─── Coupon Calendar ────────────────────────────────────────────── */
const USD_MAD_REF = 9.251;

const nextSemiAnnualCoupon = (matStr) => {
  if (!matStr) return null;
  const today = new Date();
  const mat = new Date(matStr);
  if (isNaN(mat.getTime())) return null;
  const m = mat.getMonth(), d = mat.getDate();
  const m2 = (m + 6) % 12;
  const yr = today.getFullYear();
  const candidates = [
    new Date(yr, m, d),
    new Date(yr, m2, d),
    new Date(yr + 1, m, d),
    new Date(yr + 1, m2, d),
  ].filter(dt => dt > today).sort((a, b) => a - b);
  return candidates[0] || null;
};

const fDateLong = (dt) => {
  if (!dt) return '—';
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const CouponCalendar = ({ positions }) => {
  const events = useMemo(() => {
    const today = new Date();
    return (positions || [])
      .filter(r => r.couponRate && r.maturityDate && r.netNominal)
      .map(r => {
        const nextDate = nextSemiAnnualCoupon(r.maturityDate);
        if (!nextDate) return null;
        const daysLeft = Math.round((nextDate - today) / 86400000);
        const rate = parseFloat(r.couponRate);
        const nominal = parseFloat(r.netNominal);
        const effectiveRate = rate < 1 ? rate : rate / 100;
        const couponAmtUsd = effectiveRate * nominal / 2;
        return {
          isin: r.isin,
          desc: r.description,
          nextDate,
          daysLeft,
          couponAmtUsd,
          couponAmtMad: couponAmtUsd * USD_MAD_REF,
          couponRatePct: (effectiveRate * 100).toFixed(2),
          subAsset: r.subAsset,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 10);
  }, [positions]);

  if (!events.length) return null;

  const totalMad = events.reduce((s, e) => s + e.couponAmtMad, 0);
  const maxDays = Math.max(...events.map(e => e.daysLeft), 1);

  return (
    <div className="card slide-up stagger-4" style={{ overflow: 'hidden' }}>
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--b1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={13} style={{ color: 'var(--cyan)' }} />
          <h3 style={{
            fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.68rem',
            letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)',
          }}>Calendrier des Coupons</h3>
          <span style={{
            fontFamily: 'var(--f-mono)', fontSize: '0.65rem', color: 'var(--tx3)',
            padding: '2px 7px', background: 'var(--elev)', borderRadius: 4, border: '1px solid var(--b1)',
          }}>{events.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.59rem', color: 'var(--tx3)' }}>
            Prochains paiements semi-annuels
          </span>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.70rem', fontWeight: 700, color: 'var(--cyan)' }}>
            {fMAD(totalMad, true)}{' '}
            <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.50rem', color: 'var(--tx3)', fontWeight: 400 }}>TOTAL</span>
          </span>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', minWidth: 180 }}>Obligation</th>
              <th style={{ textAlign: 'center' }}>Type</th>
              <th style={{ textAlign: 'right' }}>Coupon</th>
              <th style={{ textAlign: 'right' }}>Prochaine Date</th>
              <th style={{ textAlign: 'right' }}>Jours</th>
              <th style={{ textAlign: 'center', minWidth: 100 }}>Urgence</th>
              <th style={{ textAlign: 'right' }}>Montant USD</th>
              <th style={{ textAlign: 'right' }}>Montant MAD</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, idx) => {
              const urgent  = e.daysLeft < 30;
              const soon    = e.daysLeft < 90;
              const urgency = urgent ? 'var(--loss)' : soon ? 'var(--cyan)' : 'var(--profit)';
              const barPct  = Math.max(5, 100 - (e.daysLeft / maxDays) * 100);
              const rowBg   = urgent ? 'rgba(255,43,96,0.04)' : idx % 2 === 0 ? 'var(--tr-even-bg)' : 'transparent';
              return (
                <tr key={e.isin} style={{ background: rowBg }}>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.70rem', color: 'var(--tx1)' }} title={e.desc}>
                    {e.desc || e.isin}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {e.subAsset && (
                      <span className={`badge ${
                        (e.subAsset || '').toLowerCase().includes('ocp') ? 'badge-eb' :
                        (e.subAsset || '').toLowerCase().includes('cln') ? 'badge-cln' :
                        (e.subAsset || '').toLowerCase().includes('egp') ? 'badge-egp' : 'badge-eb'
                      }`}>{e.subAsset}</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--cyan)' }}>
                    {e.couponRatePct}%
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--tx2)' }}>
                    {fDateLong(e.nextDate)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.70rem', fontWeight: 700, color: urgency }}>
                    {e.daysLeft}j
                  </td>
                  <td>
                    <div style={{ position: 'relative', height: 5, background: 'var(--elev)', borderRadius: 3, overflow: 'hidden', margin: '0 4px' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${barPct}%`, background: urgency, borderRadius: 3, opacity: 0.75 }} />
                    </div>
                    {urgent && (
                      <div style={{ textAlign: 'center', fontFamily: 'var(--f-disp)', fontSize: '0.44rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--loss)', marginTop: 2 }}>URGENT</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--tx2)' }}>
                    {fUSD(e.couponAmtUsd)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.70rem', fontWeight: 600, color: 'var(--cyan)' }}>
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

/* ─── Main Component ─────────────────────────────────────────────── */
const PortfolioView = () => {
  const {
    globalDashboard, dashboardRows, portfolioDuration,
    pnlDailyHistory, rates,
    connectionStatus, loading, refresh, selectedDate, lastUpdate,
  } = useTrading();
  const { user } = useAuth();

  const [showAll, setShowAll] = useState(false);

  const positions = useMemo(() =>
    dashboardRows.filter(r => {
      const s = (r.subAsset || '').toLowerCase();
      return !s.includes('future');
    }), [dashboardRows]);

  const eurobonds = useMemo(() =>
    positions.filter(r => {
      const s = (r.subAsset || '').toLowerCase();
      return !s.includes('cln') && !s.includes('egp') && !s.includes('bill');
    }), [positions]);

  const groups = useMemo(() => {
    const rows = showAll ? positions : positions.slice(0, 15);
    const cats = [
      { catKey: 'EUROBOND', label: 'Eurobonds', color: 'var(--eb)',   rows: [] },
      { catKey: 'CLN',      label: 'CLN',       color: '#9B3EEF',    rows: [] },
      { catKey: 'EGP',      label: 'EGP Bills', color: 'var(--egp)', rows: [] },
    ];
    rows.forEach(r => {
      const s = (r.subAsset || '').toLowerCase();
      if (s.includes('cln'))                             cats[1].rows.push(r);
      else if (s.includes('egp') || s.includes('bill')) cats[2].rows.push(r);
      else                                               cats[0].rows.push(r);
    });
    return cats.filter(c => c.rows.length > 0);
  }, [positions, showAll]);
  const DESK_TARGET = 162e6;

  const alerts = useMemo(() => dashboardRows.filter(r => r.netDailyAlert), [dashboardRows]);
  const pnlEco      = parseFloat(globalDashboard?.totalPlEcoMad || 0);
  const pnlAcct     = parseFloat(globalDashboard?.totalPnlAccountingMad || 0);
  const pnlPos      = pnlEco >= 0;
  const nomUsd      = parseFloat(globalDashboard?.totalNominalMad || 0);
  const dur         = portfolioDuration ?? globalDashboard?.portfolioDuration;
  const dv01        = parseFloat(globalDashboard?.totalDv01Usd || 0);
  const netDaily    = parseFloat(globalDashboard?.totalNetDailyMad || 0);

  const forecast = useMemo(() => {
    const now   = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end   = new Date(now.getFullYear(), 11, 31);
    const prog  = Math.min((now - start) / (end - start), 1);
    const tradDays   = Math.max(1, Math.round(prog * 252));
    const remainDays = Math.max(0, 252 - tradDays);
    const dailyPace  = pnlEco / tradDays;
    const targetPct  = pnlEco !== 0 ? (pnlEco / DESK_TARGET) * 100 : 0;
    return {
      tradDays,
      remainDays,
      dailyPace,
      targetPct,
      pess:    pnlEco + dailyPace * remainDays * 0.75,
      central: pnlEco + dailyPace * remainDays,
      opt:     pnlEco + dailyPace * remainDays * 1.25,
      yearProg: prog,
    };
  }, [pnlEco]);

  const donutSegs = useMemo(() => {
    if (!globalDashboard?.breakdown) return [];
    const bd = globalDashboard.breakdown;
    return [
      { label: 'Eurobonds', color: 'var(--eb)',  value: Math.abs(parseFloat(bd.EUROBOND?.nominalMad || 0)) },
      { label: 'CLN',       color: 'var(--cln)', value: Math.abs(parseFloat(bd.CLN?.nominalMad || 0))      },
      { label: 'EGP Bills', color: 'var(--egp)', value: Math.abs(parseFloat(bd.EGP_BILL?.nominalMad || 0)) },
    ].filter(x => x.value > 0);
  }, [globalDashboard]);

  const donutTotal = donutSegs.reduce((s, x) => s + x.value, 0);

  /* Regulatory limit — set by admin, stored in localStorage per trader, reactive to admin changes */
  const [limitEur, setLimitEur] = useState(() => {
    try {
      const stored = localStorage.getItem(`trader_limits_${user?.id}`);
      if (stored) {
        const val = parseFloat(JSON.parse(stored)?.eurobonds?.limit);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch { /* ignore */ }
    return 280e6;
  });

  useEffect(() => {
    const readLimit = () => {
      try {
        const stored = localStorage.getItem(`trader_limits_${user?.id}`);
        if (stored) {
          const val = parseFloat(JSON.parse(stored)?.eurobonds?.limit);
          if (!isNaN(val) && val > 0) { setLimitEur(val); return; }
        }
      } catch { /* ignore */ }
      setLimitEur(280e6);
    };
    const onUpdate = (e) => { if (!e.detail || e.detail.traderId === user?.id) readLimit(); };
    window.addEventListener('traderLimitsUpdated', onUpdate);
    return () => window.removeEventListener('traderLimitsUpdated', onUpdate);
  }, [user?.id]);

  const exposureEur  = nomUsd * ((rates?.eurMad || 10.72) / (rates?.usdMad || 9.251));
  const limitPct     = Math.min((exposureEur / limitEur) * 100, 110);
  const limitOver    = limitPct > 100;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--void)' }}>

      {/* ── Page Header ── */}
      <div className="view-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ display: 'inline-block', width: 2, height: 13, background: 'var(--cyan)', borderRadius: 1, flexShrink: 0 }} />
              <h2 className="view-title">Dashboard Global</h2>
              <div className={`badge ${connectionStatus === 'connected' ? 'badge-live' : 'badge-closed'}`} style={{ marginLeft: 2 }}>
                {connectionStatus === 'connected'
                  ? <><span className="live-dot" style={{ width: 4, height: 4 }} />Live</>
                  : <><WifiOff size={9} />Offline</>}
              </div>
            </div>
            <p className="view-sub" style={{ paddingLeft: 9 }}>Fixed Income · Desk International</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastUpdate && (
            <span className="tag">{lastUpdate.toLocaleTimeString('fr-FR')}</span>
          )}
          <button onClick={refresh} disabled={loading} className="btn btn-ghost btn-sm">
            <RefreshCw size={10} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Market Rates Strip ── */}
      <RatesStrip rates={rates} />

      {loading && !dashboardRows.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
          <div style={{ width: 36, height: 36, border: '2px solid var(--b1)', borderTopColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: 'var(--f-disp)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx3)' }}>
            Chargement des positions…
          </p>
        </div>
      ) : (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── KPI Row ── */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <KpiCard
              label="P&L Économique"
              value={fMAD(pnlEco, true)}
              sub={`${Object.keys(globalDashboard?.breakdown || {}).length} classes d'actifs`}
              topClass={pnlPos ? 'kpi-top-green' : 'kpi-top-red'}
              valueColor={pnlPos ? 'var(--profit)' : 'var(--loss)'}
              valueClass={pnlPos ? 'glow-profit' : 'glow-loss'}
              icon={pnlPos ? TrendingUp : TrendingDown}
              animClass="slide-up stagger-1"
            />
            <KpiCard
              label="P&L Comptable"
              value={fMAD(pnlAcct, true)}
              sub="Accounting PnL"
              topClass={pnlAcct >= 0 ? 'kpi-top-green' : 'kpi-top-red'}
              valueColor={pnlAcct >= 0 ? 'var(--profit)' : 'var(--loss)'}
              icon={Activity}
              animClass="slide-up stagger-2"
            />
            <KpiCard
              label="Net Daily (Carry)"
              value={fMAD(netDaily, true)}
              sub="Theta + Financement"
              topClass={netDaily >= 0 ? 'kpi-top-cyan' : 'kpi-top-red'}
              valueColor={netDaily >= 0 ? 'var(--cyan)' : 'var(--loss)'}
              icon={Activity}
              animClass="slide-up stagger-3"
            />
            <KpiCard
              label="Nominal Total (USD)"
              value={fUSD(nomUsd)}
              sub={`${eurobonds.length} obligations`}
              topClass="kpi-top-blue"
              valueColor="var(--tx1)"
              animClass="slide-up stagger-4"
            />
            <KpiCard
              label="Duration Modifiée"
              value={dur != null ? `${fN(dur, 4)} ans` : '—'}
              sub="Nominal-weighted"
              topClass="kpi-top-violet"
              valueColor="#C084FC"
              animClass="slide-up stagger-5"
            />
            <KpiCard
              label="DV01 Portfolio"
              value={`${fN(dv01, 0)} USD/bp`}
              sub="Sensibilité 1bp"
              topClass="kpi-top-blue"
              valueColor="#60A5FA"
              animClass="slide-up stagger-6"
            />
          </div>

          {/* ── KPI Row 2 — Attribution P&L ── */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <KpiCard
              label="P&L Latent"
              value={fMAD(globalDashboard?.totalPlLatentMad, true)}
              sub="Mark-to-Market non réalisé"
              topClass={parseFloat(globalDashboard?.totalPlLatentMad || 0) >= 0 ? 'kpi-top-green' : 'kpi-top-red'}
              valueColor={pnlColor(globalDashboard?.totalPlLatentMad)}
              animClass="slide-up stagger-1"
            />
            <KpiCard
              label="P&L Réalisé"
              value={fMAD(globalDashboard?.totalPlRealizedMad, true)}
              sub="Cessions &amp; clôtures"
              topClass={parseFloat(globalDashboard?.totalPlRealizedMad || 0) >= 0 ? 'kpi-top-green' : 'kpi-top-red'}
              valueColor={pnlColor(globalDashboard?.totalPlRealizedMad)}
              animClass="slide-up stagger-2"
            />
            <KpiCard
              label="Coupons / CCY"
              value={fMAD(globalDashboard?.totalCouponsMad, true)}
              sub="Intérêts courus YTD"
              topClass="kpi-top-cyan"
              valueColor="var(--cyan)"
              animClass="slide-up stagger-3"
            />
            <KpiCard
              label="Coût Financement"
              value={fMAD(globalDashboard?.totalFundingCostMad, true)}
              sub="Repo &amp; carry cost"
              topClass={parseFloat(globalDashboard?.totalFundingCostMad || 0) >= 0 ? 'kpi-top-green' : 'kpi-top-red'}
              valueColor={pnlColor(globalDashboard?.totalFundingCostMad)}
              animClass="slide-up stagger-4"
            />
            <KpiCard
              label="Theta Coupon / j"
              value={fMAD(globalDashboard?.totalCpnThetaMad, true)}
              sub="Accrual journalier"
              topClass="kpi-top-violet"
              valueColor="#C084FC"
              animClass="slide-up stagger-5"
            />
            <KpiCard
              label="Alertes Carry"
              value={alerts.length > 0 ? `${alerts.length} pos.` : '✓ OK'}
              sub={alerts.length > 0 ? alerts.slice(0, 2).map(a => a.description || a.isin).join(' · ') : 'Aucune position négative'}
              topClass={alerts.length > 0 ? 'kpi-top-red' : 'kpi-top-green'}
              valueColor={alerts.length > 0 ? 'var(--loss)' : 'var(--profit)'}
              icon={AlertTriangle}
              animClass="slide-up stagger-6"
            />
          </div>

          {/* ── Forecast 31 Déc ── */}
          {pnlEco !== 0 && (() => {
            const year = new Date().getFullYear();
            const fM = (v) => { if (v == null) return '—'; const n = parseFloat(v); const a = Math.abs(n), s = n >= 0 ? '+' : '−'; if (a >= 1e6) return `${s}${(a/1e6).toFixed(1)}M`; return `${s}${a.toFixed(0)}`; };
            const fPctShort = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
            const pessPct    = (forecast.pess    / DESK_TARGET) * 100;
            const centralPct = (forecast.central / DESK_TARGET) * 100;
            const optPct     = (forecast.opt     / DESK_TARGET) * 100;
            return (
              <div className="card" style={{ padding: '10px 14px', borderLeft: '3px solid var(--cyan)', background: 'linear-gradient(90deg, rgba(0,202,255,0.04) 0%, transparent 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.52rem', letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--tx3)', marginBottom: 2 }}>
                      Forecast 31 Déc {year}
                    </div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: '0.60rem', color: 'var(--tx3)' }}>
                      {forecast.tradDays}j écoulés · {forecast.remainDays}j restants · Obj. {(DESK_TARGET/1e6).toFixed(0)}M MAD
                    </div>
                  </div>
                  <div style={{ width: 1, height: 30, background: 'var(--b1)', flexShrink: 0 }} />
                  {[
                    { label: 'Pessimiste',  val: forecast.pess,    pct: pessPct,    col: 'var(--loss)'   },
                    { label: 'Central',     val: forecast.central, pct: centralPct, col: 'var(--cyan)'   },
                    { label: 'Optimiste',   val: forecast.opt,     pct: optPct,     col: 'var(--profit)' },
                  ].map(s => (
                    <div key={s.label} style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 6, background: `${s.col}10`, border: `1px solid ${s.col}30`, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--f-disp)', fontSize: '0.50rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: s.col, opacity: 0.85, marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: '0.80rem', color: s.col, lineHeight: 1 }}>{fM(s.val)} MAD</div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: '0.55rem', color: s.col, opacity: 0.70, marginTop: 1 }}>{fPctShort(s.pct)} obj.</div>
                    </div>
                  ))}
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.57rem', color: 'var(--tx3)' }}>Réalisé {fPctShort(forecast.targetPct)} objectif</span>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.57rem', color: 'var(--tx3)' }}>{fPctShort(forecast.yearProg * 100)} de l'année</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--elev)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(Math.abs(forecast.targetPct), 100)}%`, borderRadius: 3, background: forecast.targetPct >= forecast.yearProg * 100 ? 'var(--profit)' : 'var(--warn)', transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Par Classe d'Actifs ── */}
          {globalDashboard?.breakdown && (() => {
            const bd = globalDashboard.breakdown;
            const classes = [
              { key: 'EUROBOND', label: 'Eurobonds',  color: 'var(--eb)',  nominal: parseFloat(bd.EUROBOND?.nominalMad || 0), pnl: parseFloat(bd.EUROBOND?.plEcoMad || 0) },
              { key: 'CLN',      label: 'CLN',        color: 'var(--cln)', nominal: parseFloat(bd.CLN?.nominalMad || 0),     pnl: parseFloat(bd.CLN?.plEcoMad || 0)      },
              { key: 'EGP_BILL', label: 'EGP Bills',  color: 'var(--egp)', nominal: parseFloat(bd.EGP_BILL?.nominalMad || 0), pnl: parseFloat(bd.EGP_BILL?.plEcoMad || 0) },
            ].filter(c => c.nominal !== 0 || c.pnl !== 0);
            if (!classes.length) return null;
            const totalAbs = classes.reduce((s, c) => s + Math.abs(c.pnl), 0) || 1;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.54rem', letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--tx3)', flexShrink: 0 }}>
                    Par Classe d'Actifs
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--b1)' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {classes.map(c => {
                    const pos = c.pnl >= 0;
                    const pct = (Math.abs(c.pnl) / totalAbs * 100).toFixed(0);
                    return (
                      <div key={c.key} className="card" style={{ flex: '1 1 180px', padding: '8px 10px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 2, background: c.color, display: 'inline-block', flexShrink: 0 }} />
                            <span className="lbl" style={{ fontSize: '0.58rem' }}>{c.label}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.57rem', color: 'var(--tx3)', background: 'var(--elev)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--b1)' }}>
                            {pct}%
                          </span>
                        </div>
                        <div style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: '1.15rem', color: pos ? 'var(--profit)' : 'var(--loss)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                          {fMAD(c.pnl, true)}
                        </div>
                        <div style={{ marginTop: 6, fontFamily: 'var(--f-body)', fontSize: '0.63rem', color: 'var(--tx3)' }}>
                          {fN(c.nominal / 1e6, 1)} M MAD nominal
                        </div>
                        <div style={{ marginTop: 9, height: 3, background: 'var(--elev)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: c.color, borderRadius: 2, opacity: 0.55, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── G-Spread Watchlist ── */}
          <GSpreadWatchlist positions={positions} />

          {/* ── Historical P&L Chart ── */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p className="sect-ttl">P&L Économique — Historique (MAD)</p>
                <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.63rem', color: 'var(--tx3)' }}>
                  {pnlDailyHistory.length > 0
                    ? `${pnlDailyHistory.length} jours ouvrés`
                    : 'Chargement…'}
                </span>
              </div>
              {pnlDailyHistory.length >= 2 && (() => {
                const first = parseFloat(pnlDailyHistory[0]?.pnlEcoMad || 0);
                const last  = parseFloat(pnlDailyHistory[pnlDailyHistory.length - 1]?.pnlEcoMad || 0);
                const delta = last - first;
                const pos   = delta >= 0;
                return (
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.75rem', fontWeight: 700, color: pos ? 'var(--profit)' : 'var(--loss)' }}>
                    {pos ? '+' : ''}{(delta / 1e6).toFixed(1)}M MAD
                  </span>
                );
              })()}
            </div>
            <PnlLineChart data={pnlDailyHistory} />
          </div>

          {/* ── Coupon Calendar ── */}
          <CouponCalendar positions={positions} />

          {/* ── Analytics Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* Donut allocation */}
            <div className="card slide-up stagger-3" style={{ padding: '16px' }}>
              <p className="sect-ttl" style={{ marginBottom: 14 }}>Répartition de l'Exposition</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                  <DonutChart segments={donutSegs} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {donutSegs.map(seg => {
                    const pct = donutTotal > 0 ? (seg.value / donutTotal * 100).toFixed(1) : '0';
                    return (
                      <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.70rem', color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {seg.label}
                        </span>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.72rem', color: 'var(--tx1)', fontWeight: 500 }}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                  {!donutSegs.length && (
                    <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.72rem', color: 'var(--tx3)' }}>Pas de données</p>
                  )}
                </div>
              </div>
              {/* Exposure limit bar */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--b1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="lbl">Limite Réglementaire</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: limitOver ? 'var(--loss)' : 'var(--profit)', fontWeight: 600 }}>
                    {fUSD(exposureEur / 1e6)}M / {fUSD(limitEur / 1e6)}M EUR
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{
                    width: `${Math.min(limitPct, 100)}%`,
                    background: limitOver ? 'var(--loss)' : 'var(--profit)',
                  }} />
                </div>
              </div>

              {/* P&L Attribution by asset class */}
              {globalDashboard?.breakdown && (() => {
                const bd = globalDashboard.breakdown;
                const classes = [
                  { key: 'EUROBOND', label: 'Eurobonds', color: 'var(--eb)',  pnl: parseFloat(bd.EUROBOND?.plEcoMad || 0) },
                  { key: 'CLN',      label: 'CLN',       color: 'var(--cln)', pnl: parseFloat(bd.CLN?.plEcoMad || 0)      },
                  { key: 'EGP_BILL', label: 'EGP Bills', color: 'var(--egp)', pnl: parseFloat(bd.EGP_BILL?.plEcoMad || 0) },
                ].filter(c => c.pnl !== 0);
                if (!classes.length) return null;
                const maxAbs = Math.max(...classes.map(c => Math.abs(c.pnl)), 1);
                return (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--b1)' }}>
                    <span className="lbl" style={{ display: 'block', marginBottom: 8 }}>P&L Éco · Répartition</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {classes.map(c => {
                        const pct = (Math.abs(c.pnl) / maxAbs) * 100;
                        const pos = c.pnl >= 0;
                        return (
                          <div key={c.key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: 1, background: c.color, flexShrink: 0, display: 'inline-block' }} />
                                <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.65rem', color: 'var(--tx3)' }}>{c.label}</span>
                              </span>
                              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.68rem', fontWeight: 600, color: pos ? 'var(--profit)' : 'var(--loss)' }}>
                                {fMAD(c.pnl, true)}
                              </span>
                            </div>
                            <div style={{ height: 4, background: 'var(--elev)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pos ? 'var(--profit)' : 'var(--loss)', borderRadius: 2, transition: 'width 0.6s ease' }} />
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
            <div className="card slide-up stagger-5" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p className="sect-ttl">Métriques de Risque</p>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.55rem', color: 'var(--tx3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Util. / Limite
                </span>
              </div>

              {/* 3 gauge tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>

                <div style={{ background: 'var(--surf)', border: '1px solid var(--b1)', borderRadius: 10, padding: '10px 6px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C084FC', boxShadow: '0 0 7px #C084FC', marginBottom: 4 }} />
                  <ArcGauge
                    value={parseFloat(dur || 0)}
                    max={12}
                    color="#C084FC"
                    label="Duration"
                    valueStr={dur != null ? `${fN(dur, 2)}y` : '—'}
                  />
                </div>

                <div style={{ background: 'var(--surf)', border: '1px solid var(--b1)', borderRadius: 10, padding: '10px 6px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA', boxShadow: '0 0 7px #60A5FA', marginBottom: 4 }} />
                  <ArcGauge
                    value={dv01}
                    max={50000}
                    color="#60A5FA"
                    label="DV01 k$"
                    valueStr={`${fN(dv01 / 1000, 1)}k`}
                  />
                </div>

                <div style={{
                  background: 'var(--surf)',
                  border: `1px solid ${limitOver ? 'rgba(255,43,96,0.30)' : 'var(--b1)'}`,
                  borderRadius: 10, padding: '10px 6px 6px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: limitOver ? 'var(--loss)' : 'var(--profit)',
                    boxShadow: limitOver ? '0 0 7px var(--loss)' : '0 0 7px var(--profit)',
                    marginBottom: 4,
                  }} />
                  <ArcGauge
                    value={exposureEur}
                    max={limitEur}
                    color={limitOver ? 'var(--loss)' : 'var(--profit)'}
                    label="Expo / Lim."
                    valueStr={`${Math.round(limitPct)}%`}
                  />
                </div>
              </div>

              {/* Carry alerts */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8,
                background: alerts.length > 0 ? 'rgba(255,43,96,0.06)' : 'rgba(0,232,153,0.05)',
                border: `1px solid ${alerts.length > 0 ? 'rgba(255,43,96,0.22)' : 'rgba(0,232,153,0.18)'}`,
              }}>
                <span className="lbl">Alertes Carry</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.72rem', fontWeight: 700, color: alerts.length > 0 ? 'var(--loss)' : 'var(--profit)' }}>
                  {alerts.length > 0 ? `⚠ ${alerts.length} pos.` : '✓ OK'}
                </span>
              </div>
            </div>
          </div>

          {/* ── Alert Banner ── */}
          {alerts.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', borderRadius: 8,
              background: 'rgba(255,43,96,0.06)',
              border: '1px solid rgba(255,43,96,0.20)',
              flexWrap: 'wrap',
            }}>
              <AlertTriangle size={14} style={{ color: 'var(--loss)', flexShrink: 0, animation: 'pulse-live 2s ease infinite' }} />
              <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--loss)' }}>
                {alerts.length} position{alerts.length > 1 ? 's' : ''} carry négatif :
              </span>
              <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.72rem', color: '#FC8FA0', flex: 1 }}>
                {alerts.map(a => a.description || a.isin).join(' · ')}
              </span>
            </div>
          )}

          {/* ── Position Table ── */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--b1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
                  Positions Live
                </h3>
                <span className="badge badge-live"><span className="live-dot" style={{ width: 4, height: 4 }} />WS</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.66rem', color: 'var(--tx3)', padding: '2px 8px', background: 'var(--elev)', borderRadius: 4, border: '1px solid var(--b1)' }}>
                  {positions.length} pos.
                </span>
              </div>
              {positions.length > 15 && (
                <button onClick={() => setShowAll(v => !v)} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--f-body)', fontSize: '0.70rem', color: 'var(--tx2)',
                  transition: 'color 0.15s',
                }}>
                  {showAll ? <><ChevronUp size={12} />Réduire</> : <><ChevronDown size={12} />Voir tout ({positions.length})</>}
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="dtable">
                <thead>
                  <tr>
                    {[
                      'ISIN', 'Obligation', 'Type', 'Nominal M',
                      'Coupon %', 'Échéance', 'WAP Dirty', 'Prix Mkt', 'Perf WAP',
                      'G-Spread', 'P&L Éco', 'Net Daily', 'Dur.', 'DV01 $', 'Signal',
                    ].map((h, i) => (
                      <th key={h} style={{ textAlign: i === 14 ? 'center' : i >= 3 ? 'right' : i === 2 ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map(g => (
                    <React.Fragment key={g.catKey}>
                      <CatRow {...g} totalPnl={pnlEco} />
                      {g.rows.map((r, idx) => <PositionRow key={r.isin} r={r} idx={idx} />)}
                    </React.Fragment>
                  ))}
                </tbody>
                {positions.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'left', fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.60rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx3)' }}>
                        Total Portefeuille <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--cyan)' }}>({positions.length})</span>
                      </td>
                      <td style={{ color: 'var(--tx1)', fontWeight: 600 }}>
                        {fN(positions.reduce((s, r) => s + parseFloat(r.netNominal || 0), 0) / 1e6, 1)}
                        <span style={{ color: 'var(--tx3)', fontSize: '0.60rem', marginLeft: 2 }}>M</span>
                      </td>
                      <td colSpan={5} />
                      <td />
                      <td style={{ color: pnlColor(pnlEco), fontWeight: 700 }}>{fMAD(pnlEco, true)}</td>
                      <td style={{ color: pnlColor(netDaily), fontWeight: 600 }}>{fMAD(netDaily, true)}</td>
                      <td />
                      <td style={{ color: '#60A5FA' }}>{fN(dv01, 0)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {positions.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--tx3)' }}>
                <Activity size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.78rem' }}>
                  Aucune position pour le {selectedDate}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PortfolioView;
