import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useTrading } from '../../../contexts/TradingContext';
import {
  TrendingUp, TrendingDown, Activity, AlertTriangle,
  RefreshCw, WifiOff, ChevronDown, ChevronUp,
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
const KpiCard = ({ label, value, sub, topClass, valueColor, valueClass = '', icon: Icon }) => (
  <div className={`card ${topClass}`} style={{ flex: '1 1 160px', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
      <span className="lbl">{label}</span>
      {Icon && <Icon size={14} style={{ color: valueColor, opacity: 0.7, flexShrink: 0 }} />}
    </div>
    <div className={`n ${valueClass}`} style={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1, color: valueColor, letterSpacing: '-0.03em' }}>
      {value}
    </div>
    {sub && (
      <div style={{ marginTop: 8, fontFamily: 'var(--f-body)', fontSize: '0.67rem', color: 'var(--tx3)', lineHeight: 1.4 }}>
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
      <td style={{ color: 'var(--tx2)' }}>{fN(r.lastWapDirty, 4)}</td>
      <td>{fN(r.dirtyMarket, 4)}</td>
      <td style={{ color: pnlColor(parseFloat(r.perfWap || 0) * 100), fontWeight: 500 }}>
        {fPct(parseFloat(r.perfWap || 0) * 100, 3)}
      </td>
      <td style={{ color: pnlColor(r.pnlEconomicMad), fontWeight: 600 }}>
        {fMAD(r.pnlEconomicMad, true)}
      </td>
      <td style={{ color: pnlColor(r.netDailyMad) }}>
        {fMAD(r.netDailyMad, true)}
      </td>
      <td style={{ color: 'var(--tx2)' }}>{fN(r.modifiedDuration, 2)}</td>
      <td style={{ color: '#60A5FA' }}>{fN(r.dv01Bond, 0)}</td>
    </tr>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
const PortfolioView = () => {
  const {
    globalDashboard, dashboardRows, portfolioDuration,
    pnlDailyHistory,
    connectionStatus, loading, refresh, selectedDate, lastUpdate,
  } = useTrading();

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

  const displayRows = showAll ? positions : positions.slice(0, 15);
  const alerts      = useMemo(() => dashboardRows.filter(r => r.netDailyAlert), [dashboardRows]);
  const pnlEco      = parseFloat(globalDashboard?.totalPlEcoMad || 0);
  const pnlAcct     = parseFloat(globalDashboard?.totalPnlAccountingMad || 0);
  const pnlPos      = pnlEco >= 0;
  const nomUsd      = parseFloat(globalDashboard?.totalNominalMad || 0);
  const dur         = portfolioDuration ?? globalDashboard?.portfolioDuration;
  const dv01        = parseFloat(globalDashboard?.totalDv01Usd || 0);
  const netDaily    = parseFloat(globalDashboard?.totalNetDailyMad || 0);

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

  /* Limit gauge */
  const exposureEur  = nomUsd * 0.92;
  const limitEur     = 280e6;
  const limitPct     = Math.min((exposureEur / limitEur) * 100, 110);
  const limitOver    = limitPct > 100;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--void)' }}>

      {/* ── Page Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--void)', borderBottom: '1px solid var(--b1)',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
              Dashboard Global
            </h2>
            <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.64rem', color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
              Fixed Income · Desk International
            </p>
          </div>
          <div className={`badge ${connectionStatus === 'connected' ? 'badge-live' : 'badge-closed'}`}>
            {connectionStatus === 'connected'
              ? <><span className="live-dot" style={{ width: 4, height: 4 }} />Live</>
              : <><WifiOff size={10} />Offline</>}
          </div>
          {lastUpdate && (
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.65rem', color: 'var(--tx3)' }}>
              {lastUpdate.toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>
        <button onClick={refresh} disabled={loading} className="btn btn-ghost btn-sm">
          <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

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
            />
            <KpiCard
              label="P&L Comptable"
              value={fMAD(pnlAcct, true)}
              sub="Accounting PnL"
              topClass={pnlAcct >= 0 ? 'kpi-top-green' : 'kpi-top-red'}
              valueColor={pnlAcct >= 0 ? 'var(--profit)' : 'var(--loss)'}
              icon={Activity}
            />
            <KpiCard
              label="Net Daily (Carry)"
              value={fMAD(netDaily, true)}
              sub="Theta + Financement"
              topClass={netDaily >= 0 ? 'kpi-top-cyan' : 'kpi-top-red'}
              valueColor={netDaily >= 0 ? 'var(--cyan)' : 'var(--loss)'}
              icon={Activity}
            />
            <KpiCard
              label="Nominal Total (USD)"
              value={fUSD(nomUsd)}
              sub={`${eurobonds.length} obligations`}
              topClass="kpi-top-blue"
              valueColor="var(--tx1)"
            />
            <KpiCard
              label="Duration Modifiée"
              value={dur != null ? `${fN(dur, 4)} ans` : '—'}
              sub="Nominal-weighted"
              topClass="kpi-top-violet"
              valueColor="#C084FC"
            />
            <KpiCard
              label="DV01 Portfolio"
              value={`${fN(dv01, 0)} USD/bp`}
              sub="Sensibilité 1bp"
              topClass="kpi-top-blue"
              valueColor="#60A5FA"
            />
          </div>

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

          {/* ── Analytics Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

            {/* Donut allocation */}
            <div className="card" style={{ padding: '16px' }}>
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
                    {fUSD(exposureEur / 1e6)}M / 280M EUR
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{
                    width: `${Math.min(limitPct, 100)}%`,
                    background: limitOver ? 'var(--loss)' : 'var(--profit)',
                  }} />
                </div>
              </div>
            </div>

            {/* P&L Decomposition */}
            <div className="card" style={{ padding: '16px' }}>
              <p className="sect-ttl" style={{ marginBottom: 14 }}>Décomposition P&L (MAD)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['P&L Latent',       globalDashboard?.totalPlLatentMad,       null],
                  ['P&L Réalisé',      globalDashboard?.totalPlRealizedMad,     null],
                  ['Coupons / CCY',    globalDashboard?.totalCouponsMad,        'var(--cyan)'],
                  ['Coût Financement', globalDashboard?.totalFundingCostMad,    'var(--warn)'],
                  ['Theta Coupon/j',   globalDashboard?.totalCpnThetaMad,       '#60A5FA'],
                  ['P&L Éco ★',       globalDashboard?.totalPlEcoMad,          null],
                ].map(([label, val, forceColor]) => (
                  <div key={label}>
                    <div className="lbl" style={{ marginBottom: 4 }}>{label}</div>
                    <div style={{
                      fontFamily: 'var(--f-mono)', fontWeight: 600, fontSize: '0.82rem',
                      color: forceColor || pnlColor(val),
                    }}>
                      {fMAD(val, true)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--b1)' }}>
                <div className="lbl" style={{ marginBottom: 5 }}>Net Daily (Carry + Theta)</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: '1.05rem', color: pnlColor(netDaily) }} className={pnlColor(netDaily) === 'var(--profit)' ? 'glow-profit' : 'glow-loss'}>
                  {fMAD(netDaily, true)}
                </div>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p className="sect-ttl">Métriques de Risque</p>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="lbl">Duration Modifiée</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.78rem', color: '#C084FC', fontWeight: 600 }}>
                    {dur != null ? `${fN(dur, 4)} ans` : '—'}
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.min((parseFloat(dur || 0) / 12) * 100, 100)}%`, background: '#9B3EEF' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="lbl">DV01 Total</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.78rem', color: '#60A5FA', fontWeight: 600 }}>
                    {fN(dv01, 0)} USD/bp
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: '62%', background: 'var(--eb)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="lbl">Alertes Carry</span>
                  <span style={{
                    fontFamily: 'var(--f-mono)', fontSize: '0.78rem', fontWeight: 600,
                    color: alerts.length > 0 ? 'var(--loss)' : 'var(--profit)',
                  }}>
                    {alerts.length > 0 ? `⚠ ${alerts.length} position${alerts.length > 1 ? 's' : ''}` : '✓ Tout OK'}
                  </span>
                </div>
                {alerts.length > 0 && (
                  <div style={{ fontSize: '0.67rem', color: '#FC8FA0', fontFamily: 'var(--f-body)', lineHeight: 1.5 }}>
                    {alerts.slice(0, 3).map(a => a.description || a.isin).join(' · ')}
                    {alerts.length > 3 && ` +${alerts.length - 3} autres`}
                  </div>
                )}
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
                <span className="badge badge-live"><span className="live-dot" style={{ width: 4, height: 4 }} />SSE</span>
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
                      'WAP Dirty', 'Prix Mkt', 'Perf WAP',
                      'P&L Éco', 'Net Daily', 'Dur.', 'DV01 $',
                    ].map((h, i) => (
                      <th key={h} style={{ textAlign: i >= 3 ? 'right' : i === 2 ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r, idx) => <PositionRow key={r.isin} r={r} idx={idx} />)}
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
                      <td colSpan={3} />
                      <td style={{ color: pnlColor(pnlEco), fontWeight: 700 }}>{fMAD(pnlEco, true)}</td>
                      <td style={{ color: pnlColor(netDaily), fontWeight: 600 }}>{fMAD(netDaily, true)}</td>
                      <td />
                      <td style={{ color: '#60A5FA' }}>{fN(dv01, 0)}</td>
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
