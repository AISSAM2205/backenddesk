import React, { useMemo, useState, useCallback } from 'react';
import { useTrading } from '../../contexts/TradingContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';

import {
  FileBarChart, RefreshCw, TrendingUp, TrendingDown,
  Target, Calendar, Download, Activity, Shield,
  BarChart2, AlertTriangle, Printer, Sliders,
} from 'lucide-react';

const PRINT_STYLES = `
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


const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const fM = (v) => {
  if (v == null || isNaN(parseFloat(v))) return '—';
  const n = parseFloat(v), a = Math.abs(n), s = n >= 0 ? '+' : '−';
  if (a >= 1e9) return `${s}${(a/1e9).toFixed(2)} Md`;
  if (a >= 1e6) return `${s}${(a/1e6).toFixed(2)} M`;
  if (a >= 1e3) return `${s}${(a/1e3).toFixed(1)} k`;
  return `${s}${a.toFixed(0)}`;
};
const fPct  = (v, d=1) => v == null || isNaN(v) ? '—' : `${v>=0?'+':''}${v.toFixed(d)} %`;
const fMAD  = (v) => fM(v) + ' MAD';
const fDate = (s) => { if (!s) return '—'; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}`; };

const statusOf = (realPct, progPct) => {
  if (!progPct) return { lbl: '—',        col: 'var(--tx3)'    };
  const r = realPct / progPct;
  if (r >= 1.0) return { lbl: 'EN AVANCE', col: 'var(--profit)' };
  if (r >= 0.8) return { lbl: 'ON TRACK',  col: 'var(--profit)' };
  if (r >= 0.5) return { lbl: 'ATTENTION', col: 'var(--warn)'   };
  return             { lbl: 'EN RETARD', col: 'var(--loss)'   };
};

const yearProgress = () => {
  const now = new Date(), s = new Date(now.getFullYear(), 0, 1), e = new Date(now.getFullYear(), 11, 31);
  return Math.min((now - s) / (e - s), 1);
};


const KpiCard = ({ label, value, sub, color, Icon, alert }) => (
  <div className="card" style={{ padding: '11px 13px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
      <span className="lbl" style={{ fontSize:'0.53rem', letterSpacing:'0.12em' }}>{label}</span>
      <div style={{ width:20, height:20, borderRadius:3, background:`${color}18`, border:`1px solid ${color}28`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {alert ? <AlertTriangle size={10} style={{ color }} /> : <Icon size={10} style={{ color }} />}
      </div>
    </div>
    <div style={{ fontFamily:'var(--f-mono)', fontWeight:700, fontSize:'1.05rem', color, lineHeight:1, letterSpacing:'-0.02em' }}>{value}</div>
    {sub && <div style={{ fontFamily:'var(--f-body)', fontSize:'0.58rem', color:'var(--tx3)', marginTop:5, lineHeight:1.3 }}>{sub}</div>}
  </div>
);

const MonthlyChart = ({ history }) => {
  const monthly = useMemo(() => {
    const map = {};
    (history || []).forEach(d => {
      if (!d.snapshotDate || d.pnlJourMad == null) return;
      const m = d.snapshotDate.substring(0, 7);
      if (!map[m]) map[m] = 0;
      map[m] += parseFloat(d.pnlJourMad || 0);
    });
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([k,v]) => ({
      label: MONTHS_FR[parseInt(k.split('-')[1])-1], value: v,
    }));
  }, [history]);

  if (!monthly.length) return (
    <div style={{ height:160, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
      <BarChart2 size={22} style={{ color:'var(--tx3)', opacity:0.4 }} />
      <span style={{ fontFamily:'var(--f-body)', fontSize:'0.70rem', color:'var(--tx3)' }}>Données historiques non disponibles</span>
    </div>
  );

  const W=640, H=160, pL=52, pR=12, pT=14, pB=30;
  const cW=W-pL-pR, cH=H-pT-pB;
  const gW = cW / monthly.length;
  const bW = Math.max(Math.floor(gW * 0.65), 4);
  const maxAbs = Math.max(...monthly.map(m=>Math.abs(m.value)), 1);
  const zeroY = pT + cH / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H, display:'block' }}>
      <line x1={pL} x2={W-pR} y1={zeroY} y2={zeroY} stroke="var(--chart-axis)" strokeWidth="1" />
      {[-1, -0.5, 0, 0.5, 1].map(t => {
        const y = pT + cH * (0.5 - t * 0.5);
        const v = t * maxAbs;
        return (
          <g key={t}>
            <line x1={pL-3} x2={pL} y1={y} y2={y} stroke="var(--chart-axis)" strokeWidth="1" />
            <text x={pL-5} y={y+3.5} textAnchor="end" fill="var(--tx3)" fontSize="8" fontFamily="IBM Plex Mono,monospace">
              {v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}k` : v.toFixed(0)}
            </text>
          </g>
        );
      })}
      {monthly.map((m, i) => {
        const cx = pL + gW * i + gW / 2;
        const pos = m.value >= 0;
        const bH  = Math.max((Math.abs(m.value) / maxAbs) * (cH / 2), 2);
        const by  = pos ? zeroY - bH : zeroY;
        return (
          <g key={i}>
            <rect x={cx - bW/2} y={by} width={bW} height={bH}
              fill={pos ? 'var(--profit)' : 'var(--loss)'} opacity="0.80" rx="2"
              style={{ transition:'height 0.5s ease,y 0.5s ease' }} />
            <text x={cx} y={H-pB+12} textAnchor="middle" fill="var(--tx3)" fontSize="8.5" fontFamily="IBM Plex Mono,monospace">
              {m.label}
            </text>
          </g>
        );
      })}
      <line x1={pL} x2={pL} y1={pT} y2={pT+cH} stroke="var(--chart-axis)" strokeWidth="1" />
    </svg>
  );
};

const AttributionBar = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.min(Math.abs(value) / total * 100, 100) : 0;
  const pos = value >= 0;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontFamily:'var(--f-body)', fontSize:'0.65rem', color:'var(--tx2)' }}>{label}</span>
        <span style={{ fontFamily:'var(--f-mono)', fontSize:'0.67rem', fontWeight:600, color: pos ? color : 'var(--loss)' }}>{fMAD(value)}</span>
      </div>
      <div style={{ height:5, borderRadius:3, background:'var(--elev)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:3, background: pos ? color : 'var(--loss)', transition:'width 0.8s ease', opacity:0.85 }} />
      </div>
    </div>
  );
};

const LimitGauge = ({ label, limit, used, currency, color }) => {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const over = pct > 90, warn = pct > 75;
  const gCol = over ? 'var(--loss)' : warn ? 'var(--warn)' : color;
  return (
    <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--surf)', border:`1px solid ${over ? 'rgba(255,43,96,0.25)' : 'var(--b1)'}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <span style={{ fontFamily:'var(--f-body)', fontSize:'0.65rem', color:'var(--tx2)', lineHeight:1.3 }}>{label}</span>
        {over && <span style={{ fontFamily:'var(--f-disp)', fontSize:'0.52rem', fontWeight:800, color:'var(--loss)', letterSpacing:'0.09em', padding:'2px 6px', background:'rgba(255,43,96,0.10)', borderRadius:3 }}>LIMITE</span>}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
        <span style={{ fontFamily:'var(--f-mono)', fontSize:'0.82rem', fontWeight:700, color: gCol }}>{(used/1e6).toFixed(1)} M</span>
        <span style={{ fontFamily:'var(--f-mono)', fontSize:'0.62rem', color:'var(--tx3)' }}>/ {(limit/1e6).toFixed(0)} M {currency}</span>
      </div>
      <div style={{ height:5, borderRadius:3, background:'var(--elev)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, borderRadius:3, background:gCol, transition:'width 0.8s ease' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ fontFamily:'var(--f-mono)', fontSize:'0.58rem', color: gCol }}>{pct.toFixed(1)}% utilisé</span>
        <span style={{ fontFamily:'var(--f-mono)', fontSize:'0.58rem', color:'var(--tx3)' }}>{((limit-used)/1e6).toFixed(1)} M disponible</span>
      </div>
    </div>
  );
};

/* ─── Market Context Panel ───────────────────────────────────────── */
const MKT_RATES = [
  { label: 'SOFR',      key: 'sofr',       fallback: 4.30,  fmt: v => `${v.toFixed(2)}%`,  col: '#60A5FA', dir: 'neutral' },
  { label: 'ESTR',      key: 'estr',       fallback: 2.17,  fmt: v => `${v.toFixed(2)}%`,  col: '#60A5FA', dir: 'neutral' },
  { label: 'SOFR 10Y',  key: 'sofr10Year', fallback: 3.90,  fmt: v => `${v.toFixed(2)}%`,  col: '#C084FC', dir: 'neutral' },
  { label: 'USD/MAD',   key: 'usdMad',     fallback: 9.251, fmt: v => v.toFixed(3),          col: '#FCD34D', dir: 'neutral' },
  { label: 'EUR/MAD',   key: 'eurMad',     fallback: 10.418,fmt: v => v.toFixed(3),          col: '#FCD34D', dir: 'neutral' },
  { label: 'EUR/USD',   key: 'eurUsd',     fallback: 1.126, fmt: v => v.toFixed(3),          col: '#34D399', dir: 'neutral' },
];

const MarketContextPanel = ({ rates }) => {
  const isLive = !!rates;
  return (
    <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.63rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
            Contexte de Marché
          </span>
          <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.50rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 5px', borderRadius: 3, background: isLive ? 'rgba(0,232,153,0.08)' : 'rgba(100,116,139,0.10)', border: `1px solid ${isLive ? 'rgba(0,232,153,0.20)' : 'rgba(100,116,139,0.20)'}`, color: isLive ? 'var(--profit)' : 'var(--tx3)' }}>
            {isLive ? 'LIVE' : 'REF.'}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.58rem', color: 'var(--tx3)' }}>
          Source : Bloomberg / Attijariwafa Markets
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {MKT_RATES.map(item => {
          const raw = rates?.[item.key];
          const val = raw != null ? parseFloat(raw) : item.fallback;
          return (
            <div key={item.label} style={{ padding: '8px 10px', borderRadius: 7, background: 'var(--surf)', border: '1px solid var(--b1)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.51rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--tx3)', marginBottom: 5 }}>
                {item.label}
              </div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: '0.88rem', fontWeight: 700, color: item.col, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {item.fmt(val)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ReportingView = () => {
  const { dashboardRows, clnList, egpList, pnlDailyHistory, globalDashboard, rates, loading, refresh } = useTrading();
  const { user } = useAuth();
  const { annualTargets, exposureLimits } = useAdmin();
  const [activeTab, setActiveTab] = useState('objectifs');

  // Dynamic TARGETS from backend (fallback to hardcoded if not loaded yet)
  const TARGETS = useMemo(() => {
    if (annualTargets && annualTargets.length > 0) {
      return annualTargets.map(t => ({
        key:    t.category?.toLowerCase() || t.portfolioName,
        label:  t.portfolioName,
        target: parseFloat(t.limitMeur) * 1e6,
        color:  t.colorToken || 'var(--cyan)',
      }));
    }
    return [
      { key: 'moroc', label: 'Eurobond Maroc', target: 35e6,  color: 'var(--eb)'  },
      { key: 'ocp',   label: 'Eurobond OCP',   target: 15e6,  color: '#9B3EEF'    },
      { key: 'cln',   label: 'CLN',            target: 24e6,  color: 'var(--cln)' },
      { key: 'egp',   label: 'EGP Bills',      target: 60e6,  color: 'var(--egp)' },
    ];
  }, [annualTargets]);

  const TOTAL_TARGET = useMemo(() => TARGETS.reduce((s, t) => s + t.target, 0), [TARGETS]);

  // Dynamic LIMITS from backend (fallback to hardcoded if not loaded yet)
  const LIMITS = useMemo(() => {
    if (exposureLimits && exposureLimits.length > 0) {
      return exposureLimits.map(l => ({
        label:    l.portfolioName,
        limit:    parseFloat(l.limitMeur) * 1e6,
        currency: l.currency || 'EUR',
        used:     0,
        color:    l.colorToken || 'var(--cyan)',
      }));
    }
    return [
      { label: 'Eurobonds (EUR)',  limit: 280e6, currency: 'EUR', used: 109.46e6, color: 'var(--eb)'  },
      { label: 'CLN Maroc (USD)', limit: 50e6,  currency: 'USD', used: 3e6,      color: 'var(--cln)' },
      { label: 'CLN GCC (USD)',   limit: 30e6,  currency: 'USD', used: 0,        color: '#7C3AED'    },
      { label: 'EGP Bills (USD)', limit: 20e6,  currency: 'USD', used: 3.8e6,    color: 'var(--egp)' },
    ];
  }, [exposureLimits]);
  const [scenShocks, setScenShocks] = useState({ pess: 100, central: 0, opt: -50 });

  const year      = new Date().getFullYear();
  const yearProg  = useMemo(() => yearProgress(), []);
  const tradingDays = Math.max(1, Math.round(yearProg * 252));

  const handlePrint = useCallback(() => { window.print(); }, []);

  const pnl = useMemo(() => {
    const n = f => parseFloat(f ?? 0);
    const moroc = dashboardRows.filter(r=>(r.subAsset||'').toLowerCase().includes('mor bond')).reduce((s,r)=>s+n(r.pnlEconomicMad),0);
    const ocp   = dashboardRows.filter(r=>(r.subAsset||'').toLowerCase().includes('ocp bond')).reduce((s,r)=>s+n(r.pnlEconomicMad),0);
    const cln   = clnList.reduce((s,r)=>s+n(r.plEcoMad),0);
    const egp   = egpList.reduce((s,r)=>s+n(r.plEcoMad),0);
    return { moroc, ocp, cln, egp, total: moroc+ocp+cln+egp };
  }, [dashboardRows, clnList, egpList]);

  const attribution = useMemo(() => {
    const n = f => parseFloat(f ?? 0);
    const usdMad   = parseFloat(rates?.usdMad || 9.251);
    const carry    = dashboardRows.reduce((s,r)=>s+n(r.cpnThetaMad)*tradingDays,0);
    const latent   = dashboardRows.reduce((s,r)=>s+n(r.pnlLatentCcy)*usdMad,0);
    const realized = dashboardRows.reduce((s,r)=>s+n(r.pnlRealizedCcy)*usdMad,0);
    const funding  = dashboardRows.reduce((s,r)=>s+n(r.fundingCostMad),0);
    const total    = Math.max(Math.abs(carry)+Math.abs(latent)+Math.abs(realized)+Math.abs(funding), 1);
    return { carry, latent, realized, funding, total };
  }, [dashboardRows, tradingDays, rates]);

  const stats = useMemo(() => {
    const vals = (pnlDailyHistory || []).map(d=>parseFloat(d.pnlJourMad||0)).filter(v=>!isNaN(v));
    if (!vals.length) return null;
    const mean   = vals.reduce((s,v)=>s+v,0) / vals.length;
    const std    = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0) / vals.length);
    const max    = Math.max(...vals);
    const min    = Math.min(...vals);
    const maxDay = pnlDailyHistory.find(d=>parseFloat(d.pnlJourMad||0)===max);
    const minDay = pnlDailyHistory.find(d=>parseFloat(d.pnlJourMad||0)===min);
    const pos    = vals.filter(v=>v>0).length;
    const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : null;
    return { mean, std, max, min, maxDay, minDay, pos, total: vals.length, sharpe };
  }, [pnlDailyHistory]);

  const scenarioData = useMemo(() => {
    const n = f => parseFloat(f ?? 0);
    const remainDays = Math.max(0, 252 - tradingDays);
    const usdMad = parseFloat(rates?.usdMad || 9.251);

    const SCENS = [
      { key: 'pess',    label: 'Pessimiste',  tag: 'HAUSSE TAUX', shockBps: scenShocks.pess,    color: 'var(--loss)',   bg: 'rgba(255,43,96,0.06)'   },
      { key: 'central', label: 'Central',     tag: 'MARCHÉ STABLE', shockBps: scenShocks.central, color: 'var(--cyan)',   bg: 'rgba(0,202,255,0.05)'   },
      { key: 'opt',     label: 'Optimiste',   tag: 'BAISSE TAUX', shockBps: scenShocks.opt,     color: 'var(--profit)', bg: 'rgba(0,232,153,0.05)'   },
    ];

    const bondsMoroc = dashboardRows.filter(r => (r.subAsset||'').toLowerCase().includes('mor bond'));
    const bondsOcp   = dashboardRows.filter(r => (r.subAsset||'').toLowerCase().includes('ocp bond'));

    const dv01Moroc = bondsMoroc.reduce((s, r) => s + n(r.dv01Bond), 0);
    const dv01Ocp   = bondsOcp.reduce((s, r) => s + n(r.dv01Bond), 0);

    const carryMoroc = bondsMoroc.reduce((s, r) => s + n(r.netDailyMad), 0) * remainDays;
    const carryOcp   = bondsOcp.reduce((s, r) => s + n(r.netDailyMad), 0) * remainDays;
    const carryCln   = tradingDays > 0 ? (pnl.cln / tradingDays) * remainDays : 0;
    const carryEgp   = tradingDays > 0 ? (pnl.egp / tradingDays) * remainDays : 0;

    const ASSET_ROWS = [
      { key: 'moroc', label: 'Eurobond Maroc', actual: pnl.moroc, carry: carryMoroc, dv01: dv01Moroc, color: 'var(--eb)'  },
      { key: 'ocp',   label: 'Eurobond OCP',   actual: pnl.ocp,   carry: carryOcp,   dv01: dv01Ocp,   color: '#9B3EEF'    },
      { key: 'cln',   label: 'CLN',            actual: pnl.cln,   carry: carryCln,   dv01: 0,          color: 'var(--cln)' },
      { key: 'egp',   label: 'EGP Bills',      actual: pnl.egp,   carry: carryEgp,   dv01: 0,          color: 'var(--egp)' },
    ];

    return {
      scenarios: SCENS.map(s => {
        const assetResults = ASSET_ROWS.map(r => {
          const rateImpact   = r.dv01 > 0 ? -r.dv01 * s.shockBps * usdMad : 0;
          const yeProjection = r.actual + r.carry + rateImpact;
          return { ...r, rateImpact, yeProjection };
        });
        const total = assetResults.reduce((sum, r) => sum + r.yeProjection, 0);
        return { ...s, assetResults, total };
      }),
      ASSET_ROWS,
      remainDays,
      dv01Total: dv01Moroc + dv01Ocp,
    };
  }, [dashboardRows, clnList, egpList, pnl, tradingDays, rates, scenShocks]);

  const rows = useMemo(() => TARGETS.map(t => {
    const actual  = pnl[t.key] || 0;
    const realPct = (actual / t.target) * 100;
    const daily   = tradingDays > 0 ? actual / tradingDays : 0;
    const ann     = daily * 252;
    const st      = statusOf(realPct, yearProg * 100);
    return { ...t, actual, realPct, projCentral:ann, projPess:ann*0.75, projOpt:ann*1.25, status:st };
  }), [pnl, tradingDays, yearProg]);

  const totRow = useMemo(() => {
    const actual  = pnl.total;
    const realPct = (actual / TOTAL_TARGET) * 100;
    const ann     = tradingDays > 0 ? (actual / tradingDays) * 252 : 0;
    const st      = statusOf(realPct, yearProg*100);
    return { label:'TOTAL DESK', target:TOTAL_TARGET, actual, realPct, projCentral:ann, projPess:ann*0.75, projOpt:ann*1.25, status:st, color:'var(--cyan)' };
  }, [pnl, tradingDays, yearProg]);

  const TH = { padding:'8px 12px', fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.56rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--tx3)', borderBottom:'1px solid var(--b1)', whiteSpace:'nowrap', textAlign:'right' };
  const TD = (extra={}) => ({ padding:'9px 12px', fontFamily:'var(--f-mono)', fontSize:'0.70rem', borderBottom:'1px solid var(--b0)', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums', textAlign:'right', ...extra });

  const TABS = [
    { id:'objectifs',   label:'Objectifs & Projections', icon:Target    },
    { id:'attribution', label:'Attribution P&L',         icon:BarChart2 },
    { id:'scenarios',   label:'Analyse Scénarios',       icon:Sliders   },
    { id:'historique',  label:'Historique Mensuel',      icon:Activity  },
    { id:'limites',     label:'Suivi des Limites',       icon:Shield    },
  ];

  const printDate  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  const traderName = user?.firstName ? `${user.firstName} ${user.lastName||''}`.trim() : (user?.username || 'Trader');

  /* ── Export CSV complet (UTF-8 BOM + sep=; pour Excel FR) ── */
  const handleExportCsv = useCallback(() => {
    const SEP  = ';';
    const BOM  = '﻿';
    const now  = new Date();
    const dateStr  = now.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
    const timeStr  = now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    const dateLong = now.toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

    /* helpers */
    const q  = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const n  = (v, d = 2) => { const x = parseFloat(v); return isNaN(x) ? '' : x.toFixed(d); };
    const ni = (v) => { const x = Math.round(parseFloat(v ?? 0)); return isNaN(x) ? '' : String(x); };
    const R  = (...cells) => cells.join(SEP);

    const lines = [];
    const blank = () => lines.push('');
    const sect  = (t) => { blank(); lines.push(q(`${t}`)); blank(); };

    /* ── EN-TÊTE RAPPORT ── */
    lines.push(`sep=${SEP}`);
    lines.push(R(q('ATTIJARIWAFA BANK — DESK INTERNATIONAL FIXED INCOME'), q(`RAPPORT ANNUEL ${year}`), q('CONFIDENTIEL')));
    lines.push(R(q('Trader'), q(traderName), q('Exporté le'), q(`${dateStr}  ${timeStr}`), q('Plateforme'), q('AWB Trading Desk')));
    lines.push(R(q(dateLong)));
    blank();

    /* ── [1/6] OBJECTIFS & PROJECTIONS ── */
    sect(`[1/6]  OBJECTIFS & PROJECTIONS ${year}`);
    lines.push(R(
      q('Catégorie'),
      q(`Objectif ${year} (MAD)`),
      q('Réalisé YTD (MAD)'),
      q('% Réalisation'),
      q('Projection Pessimiste (MAD)'),
      q('Projection Centrale (MAD)'),
      q('Projection Optimiste (MAD)'),
      q('Statut'),
      q('% Avancement Annuel'),
    ));
    [...rows, totRow].forEach(r => {
      lines.push(R(
        q(r.label),
        ni(r.target),
        ni(r.actual),
        n(r.realPct, 2),
        ni(r.projPess),
        ni(r.projCentral),
        ni(r.projOpt),
        q(r.status?.lbl ?? ''),
        n(yearProg * 100, 1),
      ));
    });
    blank();

    /* ── [2/6] CONTEXTE DE MARCHÉ ── */
    sect('[2/6]  CONTEXTE DE MARCHÉ');
    lines.push(R(q('Indicateur'), q('Valeur'), q('Source'), q('Date Export')));
    MKT_RATES.forEach(item => {
      const raw = rates?.[item.key];
      const val = raw != null ? parseFloat(raw) : item.fallback;
      lines.push(R(q(item.label), n(val, 4), q(rates ? 'Bloomberg LIVE' : 'Référence interne'), q(dateStr)));
    });
    blank();

    /* ── [3/6] ATTRIBUTION P&L ── */
    sect('[3/6]  ATTRIBUTION P&L');
    const attrTotal = Math.max(
      Math.abs(attribution.carry) + Math.abs(attribution.latent) +
      Math.abs(attribution.realized) + Math.abs(attribution.funding), 1
    );
    lines.push(R(q('Composante'), q('Montant (MAD)'), q('Poids %'), q('Description')));
    [
      ['Coupon / Carry (YTD estimé)',   attribution.carry,    'Revenus obligataires courus estimés YTD'],
      ['P&L Latent (Mark-to-Market)',    attribution.latent,   'Variation de valeur de marché non réalisée'],
      ['P&L Réalisé (trades fermés)',    attribution.realized, 'Plus/moins-values matérialisées'],
      ['Coût de Financement',            attribution.funding,  'Repo, collatéral et coûts de portage'],
    ].forEach(([label, val, desc]) => {
      lines.push(R(q(label), ni(val), n(Math.abs(val) / attrTotal * 100, 1), q(desc)));
    });
    lines.push(R(q('NET ÉCONOMIQUE TOTAL'), ni(pnl.total), n(100, 1), q('Somme algébrique')));
    blank();

    /* ── [4/6] STATISTIQUES JOURNALIÈRES ── */
    if (stats) {
      sect('[4/6]  STATISTIQUES JOURNALIÈRES');
      lines.push(R(q('Métrique'), q('Valeur'), q('Unité / Note')));
      [
        ['P&L moyen / jour',          String(Math.round(stats.mean)),                        'MAD'],
        ['Volatilité journalière (σ)', String(Math.round(stats.std)),                         'MAD'],
        ['Ratio de Sharpe (ann.)',     stats.sharpe != null ? stats.sharpe.toFixed(4) : '—',  'Annualisé × √252'],
        ['Meilleure journée',          String(Math.round(stats.max)),                          `MAD  —  ${fDate(stats.maxDay?.snapshotDate)}`],
        ['Pire journée',               String(Math.round(stats.min)),                          `MAD  —  ${fDate(stats.minDay?.snapshotDate)}`],
        ['Jours positifs',             String(stats.pos),                                      `sur ${stats.total} jours  (${((stats.pos / stats.total) * 100).toFixed(1)}%)`],
        ['Jours analysés',             String(stats.total),                                    'jours ouvrés'],
      ].forEach(([label, val, note]) => {
        lines.push(R(q(label), q(val), q(note)));
      });
      blank();
    }

    /* ── [5/6] HISTORIQUE MENSUEL + JOURNALIER ── */
    if (pnlDailyHistory && pnlDailyHistory.length > 0) {
      sect(`[5/6]  HISTORIQUE MENSUEL ${year}`);
      const mMap = {};
      pnlDailyHistory.forEach(d => {
        if (!d.snapshotDate) return;
        const m = d.snapshotDate.substring(0, 7);
        if (!mMap[m]) mMap[m] = { pnl: 0, fin: 0, days: 0, pos: 0, best: -Infinity, worst: Infinity };
        const v = parseFloat(d.pnlJourMad || 0);
        mMap[m].pnl  += v;
        mMap[m].fin  += parseFloat(d.finTotalMad || 0);
        mMap[m].days++;
        if (v > 0) mMap[m].pos++;
        if (v > mMap[m].best)  mMap[m].best  = v;
        if (v < mMap[m].worst) mMap[m].worst = v;
      });
      lines.push(R(
        q('Mois'), q('P&L Mensuel (MAD)'), q('Financement (MAD)'),
        q('Meilleure Journée (MAD)'), q('Pire Journée (MAD)'),
        q('Jours Positifs'), q('Nb Jours'),
      ));
      Object.entries(mMap).sort(([a], [b]) => a.localeCompare(b)).forEach(([m, d]) => {
        const [yr, mo] = m.split('-');
        lines.push(R(
          q(`${MONTHS_FR[parseInt(mo) - 1]} ${yr}`),
          ni(d.pnl),
          ni(d.fin),
          ni(d.best  === -Infinity ? 0 : d.best),
          ni(d.worst ===  Infinity ? 0 : d.worst),
          String(d.pos),
          String(d.days),
        ));
      });
      blank();

      /* détail journalier */
      sect(`[5b]  HISTORIQUE JOURNALIER (${pnlDailyHistory.length} entrées)`);
      lines.push(R(q('Date'), q('P&L Jour (MAD)'), q('P&L Éco. Cumulé (MAD)'), q('Financement (MAD)')));
      pnlDailyHistory.forEach(d => {
        lines.push(R(
          q(d.snapshotDate ?? ''),
          ni(d.pnlJourMad),
          ni(d.pnlEcoMad),
          ni(d.finTotalMad),
        ));
      });
      blank();
    }

    /* ── [6/6] DÉTAIL DES POSITIONS ── */
    if (dashboardRows && dashboardRows.length > 0) {
      sect(`[6/6]  DÉTAIL DES POSITIONS LIVE (${dashboardRows.length} lignes)`);
      lines.push(R(
        q('ISIN'), q('Description'), q('Asset Class'),
        q('Nominal (USD)'), q('Coupon %'), q('Échéance'),
        q('WAP Dirty'), q('Prix Marché'), q('Perf. WAP %'),
        q('G-Spread Bid (bp)'), q('I-Spread Bid (bp)'), q('Target Spread (bp)'), q('Gap vs Target (bp)'),
        q('P&L Économique (MAD)'), q('Net Daily Carry (MAD)'),
        q('P&L Latent (MAD)'), q('Coût Financement (MAD)'),
        q('Duration Modifiée (ans)'), q('DV01 (USD/bp)'),
        q('Signal'), q('Alerte Carry'),
      ));
      dashboardRows.forEach(r => {
        const coupon = parseFloat(r.couponRate || 0);
        const cpnPct = (coupon < 1 ? coupon * 100 : coupon).toFixed(4);
        const gBid   = parseFloat(r.gSpreadBid  || 0);
        const tgt    = parseFloat(r.targetSpread || 0);
        const gap    = tgt > 0 ? (gBid - tgt).toFixed(1) : '';
        lines.push(R(
          q(r.isin        ?? ''),
          q(r.description ?? ''),
          q(r.subAsset    ?? ''),
          ni(r.netNominal),
          cpnPct,
          q(r.maturityDate ?? ''),
          n(r.lastWapDirty, 6),
          n(r.dirtyMarket,  6),
          n(parseFloat(r.perfWap || 0) * 100, 4),
          n(r.gSpreadBid,   2),
          n(r.iSpreadBid,   2),
          n(r.targetSpread, 2),
          gap,
          ni(r.pnlEconomicMad),
          ni(r.netDailyMad),
          ni(parseFloat(r.pnlLatentCcy || 0) * parseFloat(rates?.usdMad || 9.251)),
          ni(r.fundingCostMad),
          n(r.modifiedDuration, 4),
          ni(r.dv01Bond),
          q(r.decision      ?? ''),
          q(r.netDailyAlert ? 'OUI' : 'NON'),
        ));
      });
      blank();
    }

    /* ── [7/7] CONTRIBUTION P&L PAR ISIN ── */
    if (dashboardRows && dashboardRows.length > 0) {
      const totalAbsPnl2 = dashboardRows.reduce((s, r) => s + Math.abs(parseFloat(r.pnlEconomicMad || 0)), 0) || 1;
      const isinContribs = dashboardRows
        .map(r => ({ isin: r.isin, desc: r.description, nominal: parseFloat(r.netNominal || 0), pnl: parseFloat(r.pnlEconomicMad || 0) }))
        .filter(r => r.pnl !== 0)
        .sort((a, b) => b.pnl - a.pnl);
      if (isinContribs.length > 0) {
        sect(`[7/7]  CONTRIBUTION P&L PAR ISIN (${isinContribs.length} positions)`);
        lines.push(R(q('ISIN'), q('Description'), q('Nominal (USD)'), q('P&L Éco MAD'), q('Contribution %'), q('P&L / Nominal (bp)')));
        isinContribs.forEach(r => {
          const contribPct = (Math.abs(r.pnl) / totalAbsPnl2 * 100 * (r.pnl >= 0 ? 1 : -1)).toFixed(2);
          const bps = r.nominal > 0 ? (r.pnl / r.nominal * 10000).toFixed(1) : '';
          lines.push(R(q(r.isin ?? ''), q(r.desc ?? ''), ni(r.nominal), ni(r.pnl), contribPct, bps));
        });
        blank();
      }
    }

    /* ── PIED DE RAPPORT ── */
    blank();
    lines.push(R(q('FIN DU RAPPORT'), q('Attijariwafa Bank · Desk International'), q(dateLong), q('CONFIDENTIEL')));

    /* ── TÉLÉCHARGEMENT ── */
    const csv  = BOM + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `AWB_ITD_${year}_${now.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rows, totRow, attribution, stats, pnlDailyHistory, dashboardRows, rates, year, traderName, yearProg, pnl]);

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div id="awb-report-print" style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

        {/* ── PRINT-ONLY HEADER ── */}
        <div className="awb-print-only" style={{ display:'none' }}>
          <div style={{ padding:'0 0 16px', borderBottom:'2px solid #CC2200', marginBottom:20, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontWeight:800, fontSize:'13pt', letterSpacing:'0.08em', textTransform:'uppercase', color:'#FFFFFF', lineHeight:1.2 }}>
                Attijariwafa Bank
              </div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'7.5pt', color:'#CC2200', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', marginTop:3 }}>
                Desk International · Fixed Income
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontWeight:700, fontSize:'11pt', color:'#00E899', letterSpacing:'0.04em' }}>
                Reporting Annuel {year}
              </div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'6.5pt', color:'#4A6A84', marginTop:3 }}>Généré le {printDate}</div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'6.5pt', color:'#4A6A84', marginTop:2 }}>{traderName} · CONFIDENTIEL</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:18, padding:'10px 12px', background:'#020F1E', borderRadius:6, border:'1px solid #1A3A5C' }}>
            {[
              { label:'P&L Éco. YTD',      value: fMAD(pnl.total),                             color: pnl.total>=0 ? '#00E899' : '#FF2B60' },
              { label:'Objectif Annuel',    value: fMAD(TOTAL_TARGET),                           color: '#FFA500' },
              { label:'Réalisation',        value: fPct((pnl.total/TOTAL_TARGET)*100),           color: statusOf((pnl.total/TOTAL_TARGET)*100, yearProg*100).col },
              { label:'Sharpe Annualisé',   value: stats?.sharpe != null ? stats.sharpe.toFixed(3) : '—', color: stats?.sharpe >= 1 ? '#00E899' : '#FFA500' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'6pt', color:'#4A6A84', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontWeight:700, fontSize:'10pt', color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SCREEN HEADER ── */}
        <div className="awb-no-print" style={{ borderBottom:'1px solid var(--b1)', flexShrink:0 }}>
          <div style={{ padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap: 7 }}>
              <span style={{ display:'inline-block', width:2, height:13, background:'var(--warn)', borderRadius:1, flexShrink:0 }} />
              <div>
                <div className="view-title">Reporting Annuel {year}</div>
                <div className="view-sub">Desk International Fixed Income · Attijariwafa Bank</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={handlePrint} className="btn btn-ghost btn-sm"
                style={{ background:'rgba(0,232,153,0.06)', borderColor:'rgba(0,232,153,0.18)', color:'var(--profit)' }}
                title="Générer un PDF A4 complet">
                <Printer size={10} /> Export PDF
              </button>
              <button onClick={handleExportCsv} className="btn btn-ghost btn-sm"
                title="Export CSV complet — 6 sections : objectifs, marchés, attribution, statistiques, historique mensuel/journalier, positions">
                <Download size={10} /> CSV Complet
              </button>
              <button onClick={refresh} className="btn btn-ghost btn-sm">
                <RefreshCw size={10} className={loading?'spin':''} /> Actualiser
              </button>
            </div>
          </div>

          <div className="card" style={{ padding:'12px 16px', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <Calendar size={12} style={{ color:'var(--tx3)' }} />
                <span className="lbl" style={{ fontSize:'0.58rem', letterSpacing:'0.08em' }}>PROGRESSION {year}</span>
              </div>
              <div style={{ display:'flex', gap:20 }}>
                {[
                  { label:'Écoulé',        val:`${(yearProg*100).toFixed(1)}%`, col:'var(--cyan)' },
                  { label:'~Jours trading', val:tradingDays,                    col:'var(--tx2)' },
                  { label:'Restants',      val:`~${252-tradingDays} j`,         col:'var(--tx3)' },
                ].map(({label,val,col})=>(
                  <span key={label} style={{ display:'flex', gap:5, alignItems:'center' }}>
                    <span style={{ fontFamily:'var(--f-body)', fontSize:'0.60rem', color:'var(--tx3)' }}>{label}</span>
                    <span style={{ fontFamily:'var(--f-mono)', fontSize:'0.68rem', fontWeight:600, color:col }}>{val}</span>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ height:5, borderRadius:3, background:'var(--elev)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(yearProg*100).toFixed(1)}%`, borderRadius:3, background:'linear-gradient(to right, var(--cyan), var(--profit))', transition:'width 0.8s ease' }} />
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:16 }}>
            <KpiCard label="P&L Économique YTD"  value={fMAD(pnl.total)}         sub={`${fPct((pnl.total/TOTAL_TARGET)*100)} de l'objectif annuel`}             color={pnl.total>=0?'var(--profit)':'var(--loss)'} Icon={pnl.total>=0?TrendingUp:TrendingDown} />
            <KpiCard label="Objectif Annuel"      value={fMAD(TOTAL_TARGET)}       sub="Desk International Fixed Income"                                           color="var(--warn)" Icon={Target} />
            <KpiCard label="Projection Centrale"  value={fMAD(totRow.projCentral)} sub={`${fPct((totRow.projCentral/TOTAL_TARGET)*100)} objectif · rythme actuel`} color={statusOf((totRow.projCentral/TOTAL_TARGET)*100,100).col} Icon={Activity} />
            <KpiCard label="P&L Moyen / Jour"     value={stats ? fM(stats.mean)+' MAD' : '—'} sub={stats ? `Sharpe ${stats.sharpe?.toFixed(2)??'—'} · ${stats.pos}/${stats.total} jours positifs` : 'Historique non disponible'} color="var(--cyan)" Icon={BarChart2} alert={stats && stats.sharpe != null && stats.sharpe < 0} />
          </div>

          <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--b1)' }}>
            {TABS.map(({id,label,icon:Icon})=>{
              const active = activeTab === id;
              return (
                <button key={id} onClick={()=>setActiveTab(id)} style={{
                  padding:'7px 14px', border:'none', cursor:'pointer', borderRadius:0,
                  background: active ? 'var(--surf)' : 'transparent',
                  borderBottom: active ? '2px solid var(--warn)' : '2px solid transparent',
                  display:'flex', alignItems:'center', gap:6, transition:'all 0.14s',
                }}>
                  <Icon size={11} style={{ color: active ? 'var(--warn)' : 'var(--tx3)' }} />
                  <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.60rem', letterSpacing:'0.07em', color: active ? 'var(--tx1)' : 'var(--tx3)', textTransform:'uppercase' }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB CONTENT ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>

          {/* SECTION 1 : OBJECTIFS */}
          <div className="awb-report-section" style={{ display: activeTab==='objectifs' ? 'block' : 'none' }}>
            <div className="awb-section-label" style={{ display:'none' }}>1 / 4 — Objectifs &amp; Projections {year}</div>

            {/* Market context panel */}
            <MarketContextPanel rates={rates} />

            <div className="card" style={{ overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:8 }}>
                <Target size={13} style={{ color:'var(--warn)' }} />
                <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.65rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--tx1)' }}>
                  Réalisation vs Objectifs · Scénarios {year}
                </span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'var(--thead-bg)' }}>
                      <th style={{ ...TH, textAlign:'left' }}>Catégorie</th>
                      <th style={TH}>Objectif {year}</th>
                      <th style={TH}>Réalisé YTD</th>
                      <th style={TH}>% Réal.</th>
                      <th style={{ ...TH, borderLeft:'1px solid var(--b1)' }}>Pessimiste<br/><span style={{ opacity:0.55, fontWeight:400 }}>×0.75</span></th>
                      <th style={TH}>Centrale<br/><span style={{ opacity:0.55, fontWeight:400 }}>rythme actuel</span></th>
                      <th style={TH}>Optimiste<br/><span style={{ opacity:0.55, fontWeight:400 }}>×1.25</span></th>
                      <th style={{ ...TH, borderLeft:'1px solid var(--b1)', textAlign:'center' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r,i) => {
                      const barW  = Math.min((r.actual/r.target)*100, 100);
                      const rowBg = i%2===0 ? 'var(--tr-even-bg)' : 'transparent';
                      return (
                        <tr key={r.key} style={{ background:rowBg }}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--tr-hover-bg)'}
                          onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                          <td style={{ ...TD({ textAlign:'left' }), borderLeft:`3px solid ${r.color}` }}>
                            <span style={{ fontFamily:'var(--f-disp)', fontWeight:600, color:'var(--tx1)', fontSize:'0.72rem' }}>{r.label}</span>
                          </td>
                          <td style={TD()}><span style={{ color:'var(--tx2)' }}>{fMAD(r.target)}</span></td>
                          <td style={TD()}>
                            <span style={{ color: r.actual>=0?'var(--profit)':'var(--loss)', fontWeight:600 }}>{fMAD(r.actual)}</span>
                            <div style={{ marginTop:3, height:3, borderRadius:2, background:'var(--elev)', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${Math.max(barW,0)}%`, background:r.status.col, borderRadius:2, transition:'width 0.8s ease' }} />
                            </div>
                          </td>
                          <td style={{ ...TD(), color:r.status.col, fontWeight:600 }}>{fPct(r.realPct)}</td>
                          <td style={{ ...TD(), borderLeft:'1px solid var(--b0)', color:'var(--warn)', opacity:0.85 }}>{fMAD(r.projPess)}</td>
                          <td style={{ ...TD(), color:statusOf((r.projCentral/r.target)*100,100).col, fontWeight:600 }}>{fMAD(r.projCentral)}</td>
                          <td style={{ ...TD(), color:'var(--profit)', opacity:0.85 }}>{fMAD(r.projOpt)}</td>
                          <td style={{ ...TD({ textAlign:'center' }), borderLeft:'1px solid var(--b0)' }}>
                            <span style={{ padding:'3px 8px', borderRadius:4, fontFamily:'var(--f-disp)', fontSize:'0.57rem', fontWeight:700, letterSpacing:'0.08em', background:`${r.status.col}18`, border:`1px solid ${r.status.col}35`, color:r.status.col }}>
                              {r.status.lbl}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:'var(--tfoot-bg)', borderTop:'2px solid var(--b2)' }}>
                      <td style={{ ...TD({ textAlign:'left', fontWeight:700 }), borderLeft:'3px solid var(--cyan)', borderBottom:'none' }}>
                        <span style={{ fontFamily:'var(--f-disp)', fontWeight:800, color:'var(--tx1)', fontSize:'0.72rem', letterSpacing:'0.04em' }}>TOTAL DESK</span>
                      </td>
                      <td style={{ ...TD(), borderBottom:'none' }}><span style={{ color:'var(--tx2)', fontWeight:700 }}>{fMAD(TOTAL_TARGET)}</span></td>
                      <td style={{ ...TD(), borderBottom:'none', color: totRow.actual>=0?'var(--profit)':'var(--loss)', fontWeight:700 }}>{fMAD(totRow.actual)}</td>
                      <td style={{ ...TD(), borderBottom:'none', color:totRow.status.col, fontWeight:700 }}>{fPct(totRow.realPct)}</td>
                      <td style={{ ...TD(), borderBottom:'none', borderLeft:'1px solid var(--b1)', color:'var(--warn)', fontWeight:600 }}>{fMAD(totRow.projPess)}</td>
                      <td style={{ ...TD(), borderBottom:'none', color:statusOf((totRow.projCentral/TOTAL_TARGET)*100,100).col, fontWeight:700 }}>{fMAD(totRow.projCentral)}</td>
                      <td style={{ ...TD(), borderBottom:'none', color:'var(--profit)', fontWeight:600 }}>{fMAD(totRow.projOpt)}</td>
                      <td style={{ ...TD({ textAlign:'center' }), borderBottom:'none', borderLeft:'1px solid var(--b1)' }}>
                        <span style={{ padding:'3px 8px', borderRadius:4, fontFamily:'var(--f-disp)', fontSize:'0.57rem', fontWeight:800, letterSpacing:'0.08em', background:`${totRow.status.col}18`, border:`1px solid ${totRow.status.col}35`, color:totRow.status.col }}>
                          {totRow.status.lbl}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div style={{ padding:'8px 16px', borderTop:'1px solid var(--b0)' }}>
                <span style={{ fontFamily:'var(--f-body)', fontSize:'0.58rem', color:'var(--tx3)' }}>
                  Projection = rythme journalier × 252 jours ouvrés · Pessimiste ×0.75 · Centrale ×1.00 · Optimiste ×1.25
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2 : ATTRIBUTION */}
          <div className="awb-report-section awb-page-break" style={{ display: activeTab==='attribution' ? 'block' : 'none' }}>
            <div className="awb-section-label" style={{ display:'none' }}>2 / 4 — Attribution P&amp;L · Décomposition &amp; Statistiques</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

              <div className="card" style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:16 }}>
                  <BarChart2 size={13} style={{ color:'var(--cyan)' }} />
                  <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.65rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--tx1)' }}>Décomposition du P&L</span>
                </div>
                <AttributionBar label="Coupon / Carry (YTD estimé)"    value={attribution.carry}    total={attribution.total} color="var(--cyan)"   />
                <AttributionBar label="P&L Latent (Mark-to-Market)"     value={attribution.latent}   total={attribution.total} color="var(--eb)"    />
                <AttributionBar label="P&L Réalisé (trades fermés)"      value={attribution.realized} total={attribution.total} color="var(--profit)" />
                <AttributionBar label="Coût de Financement (négatif)"    value={attribution.funding}  total={attribution.total} color="var(--warn)"  />
                <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--b1)', display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.65rem', color:'var(--tx2)', textTransform:'uppercase', letterSpacing:'0.07em' }}>NET ÉCONOMIQUE</span>
                  <span style={{ fontFamily:'var(--f-mono)', fontWeight:700, fontSize:'0.80rem', color: pnl.total>=0?'var(--profit)':'var(--loss)' }}>{fMAD(pnl.total)}</span>
                </div>
              </div>

              <div className="card" style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:16 }}>
                  <Activity size={13} style={{ color:'var(--cyan)' }} />
                  <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.65rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--tx1)' }}>Statistiques Journalières</span>
                </div>
                {stats ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                    {[
                      { label:'P&L moyen / jour',      val:fM(stats.mean)+' MAD', col: stats.mean>=0?'var(--profit)':'var(--loss)', bold:true },
                      { label:'Volatilité (σ)',          val:fM(stats.std)+' MAD',  col:'var(--warn)' },
                      { label:'Ratio de Sharpe (ann.)', val: stats.sharpe!=null ? stats.sharpe.toFixed(3) : '—', col: stats.sharpe>=1?'var(--profit)':stats.sharpe>=0?'var(--warn)':'var(--loss)', bold:true },
                      { label:'Meilleure journée',      val:fM(stats.max)+' MAD',  col:'var(--profit)', sub:fDate(stats.maxDay?.snapshotDate) },
                      { label:'Pire journée',           val:fM(stats.min)+' MAD',  col:'var(--loss)',   sub:fDate(stats.minDay?.snapshotDate) },
                      { label:'Jours positifs',         val:`${stats.pos} / ${stats.total}`, col:'var(--profit)', sub:`${((stats.pos/stats.total)*100).toFixed(1)}% du temps` },
                    ].map(({ label, val, col, bold, sub }) => (
                      <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--b0)' }}>
                        <div>
                          <div style={{ fontFamily:'var(--f-body)', fontSize:'0.65rem', color:'var(--tx2)' }}>{label}</div>
                          {sub && <div style={{ fontFamily:'var(--f-mono)', fontSize:'0.58rem', color:'var(--tx3)', marginTop:1 }}>{sub}</div>}
                        </div>
                        <span style={{ fontFamily:'var(--f-mono)', fontSize:'0.72rem', fontWeight: bold?700:500, color:col }}>{val}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ height:120, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, color:'var(--tx3)' }}>
                    <Activity size={20} style={{ opacity:0.35 }} />
                    <span style={{ fontFamily:'var(--f-body)', fontSize:'0.70rem' }}>Historique non disponible</span>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding:'16px 18px', gridColumn:'1 / -1' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
                  <Target size={13} style={{ color:'var(--warn)' }} />
                  <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.65rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--tx1)' }}>
                    Contribution par Asset Class (P&L Économique)
                  </span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
                  {rows.map(r => {
                    const contribPct = pnl.total !== 0 ? (r.actual / Math.abs(pnl.total)) * 100 : 0;
                    return (
                      <div key={r.key} style={{ padding:'12px 14px', borderRadius:8, background:'var(--surf)', border:'1px solid var(--b1)', borderLeft:`3px solid ${r.color}` }}>
                        <div style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.63rem', color:'var(--tx2)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.07em' }}>{r.label}</div>
                        <div style={{ fontFamily:'var(--f-mono)', fontWeight:700, fontSize:'0.90rem', color: r.actual>=0?'var(--profit)':'var(--loss)' }}>{fM(r.actual)} MAD</div>
                        <div style={{ fontFamily:'var(--f-mono)', fontSize:'0.62rem', color:'var(--tx3)', marginTop:4 }}>
                          {contribPct>=0?'+':''}{contribPct.toFixed(1)}% du total
                        </div>
                        <div style={{ marginTop:6, height:3, borderRadius:2, background:'var(--elev)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${Math.min(Math.abs(contribPct),100)}%`, background:r.color, borderRadius:2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2b : CONTRIBUTION PAR ISIN */}
          {activeTab === 'attribution' && dashboardRows.length > 0 && (() => {
            const n = f => parseFloat(f ?? 0);
            const isinPnl = dashboardRows
              .map(r => ({
                isin:    r.isin,
                desc:    (r.description || r.isin || '').split(' ').slice(0,4).join(' '),
                nominal: n(r.netNominal),
                pnl:     n(r.pnlEconomicMad),
              }))
              .filter(r => r.pnl !== 0)
              .sort((a, b) => b.pnl - a.pnl);

            if (isinPnl.length === 0) return null;
            const totalAbsPnl = isinPnl.reduce((s, r) => s + Math.abs(r.pnl), 0) || 1;
            const top5    = isinPnl.slice(0, 5);
            const bottom5 = isinPnl.length > 5 ? isinPnl.slice(-5).reverse() : [];

            const IsinBar = ({ row }) => {
              const pct   = Math.min(Math.abs(row.pnl) / totalAbsPnl * 100, 100);
              const isPos = row.pnl >= 0;
              const pnlNom = row.nominal > 0 ? (row.pnl / row.nominal * 10000).toFixed(1) : null; // bps of nominal
              return (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid var(--b0)' }}>
                  <div style={{ width:90, flexShrink:0 }}>
                    <div style={{ fontFamily:'var(--f-mono)', fontSize:'0.64rem', color:'var(--cyan)', fontWeight:500 }}>{row.isin}</div>
                    <div style={{ fontFamily:'var(--f-body)', fontSize:'0.57rem', color:'var(--tx3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.desc}</div>
                  </div>
                  <div style={{ flex:1, position:'relative', height:14, background:'var(--b1)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{
                      position:'absolute', top:0, height:'100%', width:`${pct}%`,
                      background: isPos ? 'var(--profit)' : 'var(--loss)', borderRadius:3, opacity:0.65,
                      ...(isPos ? { left:0 } : { right:0 }),
                    }} />
                  </div>
                  <span style={{ fontFamily:'var(--f-mono)', fontWeight:700, fontSize:'0.68rem', color: isPos?'var(--profit)':'var(--loss)', minWidth:70, textAlign:'right', flexShrink:0 }}>
                    {isPos?'+':''}{(row.pnl/1e6).toFixed(2)}M
                  </span>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:'0.58rem', color:'var(--tx3)', minWidth:48, textAlign:'right', flexShrink:0 }}>
                    {((row.pnl / totalAbsPnl) * 100).toFixed(1)}%
                  </span>
                  {pnlNom && (
                    <span style={{ fontFamily:'var(--f-mono)', fontSize:'0.56rem', color:'var(--tx3)', minWidth:52, textAlign:'right', flexShrink:0 }}>
                      {pnlNom} bp
                    </span>
                  )}
                </div>
              );
            };

            return (
              <div className="card" style={{ padding:'16px 18px', marginTop:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
                  <BarChart2 size={13} style={{ color:'var(--eb)' }} />
                  <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.65rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--tx1)' }}>
                    Contribution P&L par ISIN
                  </span>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:'0.60rem', color:'var(--tx3)', padding:'2px 7px', background:'var(--elev)', borderRadius:4, border:'1px solid var(--b1)', marginLeft:'auto' }}>
                    {isinPnl.length} positions · P&L Économique MAD
                  </span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
                  <div>
                    <div style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.58rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--profit)', marginBottom:8 }}>
                      ▲ Top 5 contributeurs
                    </div>
                    {top5.map(r => <IsinBar key={r.isin} row={r} />)}
                  </div>
                  {bottom5.length > 0 && (
                    <div>
                      <div style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.58rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--loss)', marginBottom:8 }}>
                        ▼ Bottom 5 contributeurs
                      </div>
                      {bottom5.map(r => <IsinBar key={r.isin} row={r} />)}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* SECTION SCENARIOS */}
          {activeTab === 'scenarios' && (() => {
            const { scenarios, ASSET_ROWS, remainDays, dv01Total } = scenarioData;
            const usdMad = parseFloat(rates?.usdMad || 9.251);

            const shockLabel = bps => bps === 0 ? '0 bp' : bps > 0 ? `+${bps} bp` : `${bps} bp`;

            return (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {/* ── Shock inputs ── */}
                <div className="card" style={{ padding:'14px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <Sliders size={13} style={{ color:'var(--cyan)' }} />
                    <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.65rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--tx1)' }}>
                      Hypothèses de Choc de Taux — Projection 31 Déc {year}
                    </span>
                    <span style={{ marginLeft:'auto', fontFamily:'var(--f-mono)', fontSize:'0.58rem', color:'var(--tx3)', padding:'2px 7px', background:'var(--elev)', borderRadius:4, border:'1px solid var(--b1)' }}>
                      DV01 portefeuille : {(dv01Total * usdMad / 1e3).toFixed(0)} k MAD/bp · {remainDays} j restants
                    </span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                    {scenarios.map(s => (
                      <div key={s.key} style={{ padding:'12px 14px', borderRadius:8, background:s.bg, border:`1px solid ${s.color}35`, borderTop:`2px solid ${s.color}` }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                          <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.65rem', color:s.color, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</span>
                          <span style={{ fontFamily:'var(--f-disp)', fontSize:'0.48rem', fontWeight:700, letterSpacing:'0.08em', color:s.color, padding:'1px 5px', borderRadius:3, background:`${s.color}18`, border:`1px solid ${s.color}30` }}>{s.tag}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontFamily:'var(--f-body)', fontSize:'0.63rem', color:'var(--tx2)' }}>Choc taux (bp) :</span>
                          <input
                            type="number"
                            value={scenShocks[s.key]}
                            onChange={e => setScenShocks(prev => ({ ...prev, [s.key]: parseInt(e.target.value) || 0 }))}
                            style={{
                              width:60, padding:'3px 8px',
                              fontFamily:'var(--f-mono)', fontSize:'0.75rem', fontWeight:700,
                              color: s.color, background:'var(--b0)',
                              border:`1px solid ${s.color}40`, borderRadius:4, outline:'none',
                              textAlign:'right',
                            }}
                          />
                        </div>
                        <div style={{ marginTop:8, fontFamily:'var(--f-body)', fontSize:'0.58rem', color:'var(--tx3)' }}>
                          Impact portefeuille ≈ {fM(-dv01Total * s.shockBps * usdMad)} MAD
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Projection Table ── */}
                <div className="card" style={{ overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:8 }}>
                    <Target size={13} style={{ color:'var(--warn)' }} />
                    <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.65rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--tx1)' }}>
                      Projection P&L au 31 Décembre {year}
                    </span>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:'var(--thead-bg)' }}>
                          <th style={{ ...TH, textAlign:'left' }}>Asset Class</th>
                          <th style={TH}>Réalisé YTD</th>
                          <th style={TH}>Carry Restant<br/><span style={{ opacity:0.55, fontWeight:400 }}>~{remainDays} j</span></th>
                          {scenarios.map(s => (
                            <th key={s.key} style={{ ...TH, borderLeft:'1px solid var(--b1)', color:s.color }}>
                              {s.label}<br/><span style={{ opacity:0.75, fontWeight:500 }}>{shockLabel(s.shockBps)}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ASSET_ROWS.map((r, i) => {
                          const rowBg = i%2===0 ? 'var(--tr-even-bg)' : 'transparent';
                          return (
                            <tr key={r.key} style={{ background:rowBg }}
                              onMouseEnter={e=>e.currentTarget.style.background='var(--tr-hover-bg)'}
                              onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                              <td style={{ ...TD({ textAlign:'left' }), borderLeft:`3px solid ${r.color}` }}>
                                <span style={{ fontFamily:'var(--f-disp)', fontWeight:600, color:'var(--tx1)', fontSize:'0.72rem' }}>{r.label}</span>
                              </td>
                              <td style={{ ...TD(), color: r.actual>=0?'var(--profit)':'var(--loss)', fontWeight:600 }}>{fM(r.actual)} MAD</td>
                              <td style={{ ...TD(), color:'var(--cyan)' }}>{r.carry !== 0 ? fM(r.carry)+' MAD' : <span style={{ color:'var(--tx3)' }}>—</span>}</td>
                              {scenarios.map(s => {
                                const res = s.assetResults.find(x => x.key === r.key);
                                const pos = res.yeProjection >= 0;
                                return (
                                  <td key={s.key} style={{ ...TD(), borderLeft:'1px solid var(--b0)', color: pos?'var(--profit)':'var(--loss)', fontWeight:600 }}>
                                    {fM(res.yeProjection)} MAD
                                    {r.dv01 > 0 && (
                                      <div style={{ fontFamily:'var(--f-mono)', fontSize:'0.54rem', color: res.rateImpact>=0?'var(--profit)':'var(--loss)', opacity:0.7, marginTop:1 }}>
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
                        <tr style={{ background:'var(--tfoot-bg)', borderTop:'2px solid var(--b2)' }}>
                          <td style={{ ...TD({ textAlign:'left', fontWeight:700 }), borderLeft:'3px solid var(--cyan)', borderBottom:'none' }}>
                            <span style={{ fontFamily:'var(--f-disp)', fontWeight:800, color:'var(--tx1)', fontSize:'0.72rem', letterSpacing:'0.04em' }}>TOTAL DESK</span>
                          </td>
                          <td style={{ ...TD(), borderBottom:'none', color: pnl.total>=0?'var(--profit)':'var(--loss)', fontWeight:700 }}>{fM(pnl.total)} MAD</td>
                          <td style={{ ...TD(), borderBottom:'none', color:'var(--cyan)', fontWeight:600 }}>
                            {fM(ASSET_ROWS.reduce((s,r)=>s+r.carry,0))} MAD
                          </td>
                          {scenarios.map(s => {
                            const pos = s.total >= 0;
                            const pct = (s.total / TOTAL_TARGET) * 100;
                            return (
                              <td key={s.key} style={{ ...TD(), borderBottom:'none', borderLeft:'1px solid var(--b1)', fontWeight:700, color: pos?'var(--profit)':'var(--loss)' }}>
                                {fM(s.total)} MAD
                                <div style={{ fontFamily:'var(--f-mono)', fontSize:'0.56rem', color:statusOf(pct,100).col, marginTop:1 }}>
                                  {fPct(pct)} objectif
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div style={{ padding:'8px 16px', borderTop:'1px solid var(--b0)' }}>
                    <span style={{ fontFamily:'var(--f-body)', fontSize:'0.58rem', color:'var(--tx3)' }}>
                      Projection = Réalisé YTD + Carry estimé + Impact DV01 × Δy · Sans ajustement de convexité · Objectif desk : {fMAD(TOTAL_TARGET)}
                    </span>
                  </div>
                </div>

                {/* ── DV01 sensitivity note ── */}
                <div className="card" style={{ padding:'12px 18px', borderLeft:'3px solid var(--warn)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                    <AlertTriangle size={12} style={{ color:'var(--warn)' }} />
                    <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.60rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--warn)' }}>
                      Sensibilité Taux — DV01 par Scénario
                    </span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                    {scenarios.map(s => {
                      const totalImpact = -dv01Total * s.shockBps * usdMad;
                      return (
                        <div key={s.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', borderRadius:6, background:'var(--surf)', border:`1px solid ${s.color}25` }}>
                          <span style={{ fontFamily:'var(--f-disp)', fontWeight:600, fontSize:'0.62rem', color:s.color }}>
                            {s.label} ({shockLabel(s.shockBps)})
                          </span>
                          <span style={{ fontFamily:'var(--f-mono)', fontWeight:700, fontSize:'0.72rem', color: totalImpact>=0?'var(--profit)':'var(--loss)' }}>
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
          <div className="awb-report-section awb-page-break" style={{ display: activeTab==='historique' ? 'block' : 'none' }}>
            <div className="awb-section-label" style={{ display:'none' }}>3 / 4 — Historique Mensuel {year}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="card" style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
                  <Activity size={13} style={{ color:'var(--profit)' }} />
                  <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.65rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--tx1)' }}>P&L Mensuel {year} (MAD)</span>
                </div>
                <MonthlyChart history={pnlDailyHistory} />
              </div>

              {pnlDailyHistory && pnlDailyHistory.length > 0 && (() => {
                const map = {};
                pnlDailyHistory.forEach(d => {
                  if (!d.snapshotDate) return;
                  const m = d.snapshotDate.substring(0,7);
                  if (!map[m]) map[m] = { pnlJour:0, finTotal:0, days:0, best:null, worst:null };
                  const v = parseFloat(d.pnlJourMad||0);
                  map[m].pnlJour  += v;
                  map[m].finTotal += parseFloat(d.finTotalMad||0);
                  map[m].days++;
                  if (map[m].best  == null || v > map[m].best)  map[m].best  = v;
                  if (map[m].worst == null || v < map[m].worst) map[m].worst = v;
                });
                const entries = Object.entries(map).sort(([a],[b])=>a.localeCompare(b));
                if (!entries.length) return null;
                return (
                  <div className="card" style={{ overflow:'hidden' }}>
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                          <tr style={{ background:'var(--thead-bg)' }}>
                            {['Mois','P&L du mois','Financement','Meilleure J.','Pire J.','Nb jours'].map(h=>(
                              <th key={h} style={{ ...TH, textAlign: h==='Mois'?'left':'right' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map(([key, d], i) => {
                            const [yr, mo] = key.split('-');
                            const label = `${MONTHS_FR[parseInt(mo)-1]} ${yr}`;
                            const pos   = d.pnlJour >= 0;
                            const bg    = i%2===0 ? 'var(--tr-even-bg)' : 'transparent';
                            return (
                              <tr key={key} style={{ background:bg }}
                                onMouseEnter={e=>e.currentTarget.style.background='var(--tr-hover-bg)'}
                                onMouseLeave={e=>e.currentTarget.style.background=bg}>
                                <td style={TD({ textAlign:'left' })}><span style={{ fontFamily:'var(--f-disp)', fontWeight:600, color:'var(--tx1)', fontSize:'0.70rem' }}>{label}</span></td>
                                <td style={{ ...TD(), color: pos?'var(--profit)':'var(--loss)', fontWeight:600 }}>{fM(d.pnlJour)} MAD</td>
                                <td style={{ ...TD(), color:'var(--warn)' }}>{fM(d.finTotal)} MAD</td>
                                <td style={{ ...TD(), color:'var(--profit)' }}>{fM(d.best)} MAD</td>
                                <td style={{ ...TD(), color:'var(--loss)' }}>{fM(d.worst)} MAD</td>
                                <td style={{ ...TD(), color:'var(--tx3)' }}>{d.days}</td>
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
          <div className="awb-report-section awb-page-break" style={{ display: activeTab==='limites' ? 'block' : 'none' }}>
            <div className="awb-section-label" style={{ display:'none' }}>4 / 4 — Suivi des Limites Réglementaires</div>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Dynamic limits from real portfolio data */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 }}>
                {(() => {
                  const bd = globalDashboard?.breakdown;
                  const eurMad = parseFloat(rates?.eurMad || 10.418);
                  const usdMad = parseFloat(rates?.usdMad || 9.251);
                  const ebNomMad  = parseFloat(bd?.EUROBOND?.nominalMad || 0);
                  const clnNomMad = parseFloat(bd?.CLN?.nominalMad || 0);
                  const egpNomMad = parseFloat(bd?.EGP_BILL?.nominalMad || 0);
                  const dynamicLimits = [
                    { label: 'Eurobonds (EUR)',  limit: 280e6, currency: 'EUR', used: ebNomMad / eurMad,   color: 'var(--eb)'  },
                    { label: 'CLN Maroc (USD)',  limit: 50e6,  currency: 'USD', used: clnNomMad / usdMad,  color: 'var(--cln)' },
                    { label: 'CLN GCC (USD)',    limit: 30e6,  currency: 'USD', used: 0,                   color: '#7C3AED'    },
                    { label: 'EGP Bills (USD)',  limit: 20e6,  currency: 'USD', used: egpNomMad / usdMad,  color: 'var(--egp)' },
                  ];
                  return dynamicLimits.map(l => <LimitGauge key={l.label} {...l} />);
                })()}
              </div>

              <div className="card" style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
                  <Shield size={13} style={{ color:'#9B3EEF' }} />
                  <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:'0.65rem', letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--tx1)' }}>
                    Limites de Duration
                  </span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
                  {[
                    { label:'Eurobonds (Maroc+OCP)', max:7.0,  current: parseFloat(dashboardRows.filter(r=>(r.subAsset||'').toLowerCase().includes('bond')).reduce((s,r,_,a)=>{ const n=parseFloat(r.modifiedDuration||0); const w=parseFloat(r.netNominal||0); return [s[0]+n*w, s[1]+w]; }, [0,0]).reduce((a,b,i)=>i===0?a:a/b,0)||0).toFixed(2), color:'var(--eb)' },
                    { label:'CLN',                   max:5.0,  current: parseFloat(clnList.filter(r=>r.modifiedDuration).reduce((s,r,_,a)=>{ const n=parseFloat(r.modifiedDuration||0); const w=parseFloat(r.nominalUsd||0); return [s[0]+n*w,s[1]+w]; }, [0,0]).reduce((a,b,i)=>i===0?a:a/b,0)||0).toFixed(2), color:'var(--cln)' },
                    { label:'EGP Bills',             max:0.25, current: parseFloat(egpList.filter(r=>r.modifiedDuration).reduce((s,r,_,a)=>{ const n=parseFloat(r.modifiedDuration||0); const w=parseFloat(r.nominalUsd||0); return [s[0]+n*w,s[1]+w]; }, [0,0]).reduce((a,b,i)=>i===0?a:a/b,0)||0).toFixed(2), color:'var(--egp)' },
                  ].map(({ label, max, current, color }) => {
                    const pct  = max > 0 ? (parseFloat(current) / max) * 100 : 0;
                    const over = pct > 100, warn = pct > 85;
                    const col  = over ? 'var(--loss)' : warn ? 'var(--warn)' : color;
                    return (
                      <div key={label} style={{ padding:'12px 14px', borderRadius:8, background:'var(--surf)', border:`1px solid ${over?'rgba(255,43,96,0.25)':'var(--b1)'}`, borderLeft:`3px solid ${col}` }}>
                        <div style={{ fontFamily:'var(--f-body)', fontSize:'0.63rem', color:'var(--tx2)', marginBottom:8 }}>{label}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                          <span style={{ fontFamily:'var(--f-mono)', fontWeight:700, fontSize:'0.90rem', color:col }}>{current} ans</span>
                          <span style={{ fontFamily:'var(--f-mono)', fontSize:'0.62rem', color:'var(--tx3)' }}>/ {max} ans max</span>
                        </div>
                        <div style={{ height:4, borderRadius:2, background:'var(--elev)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:col, borderRadius:2 }} />
                        </div>
                        {over && <div style={{ fontFamily:'var(--f-disp)', fontSize:'0.54rem', fontWeight:800, color:'var(--loss)', marginTop:4, letterSpacing:'0.08em' }}>⚠ LIMITE DÉPASSÉE</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="awb-print-only" style={{ display:'none', marginTop:24, padding:'10px 14px', borderTop:'1px solid #1A3A5C' }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'6pt', color:'#4A6A84', lineHeight:1.6 }}>
                  Document CONFIDENTIEL · Attijariwafa Bank — Desk International Fixed Income · {printDate}<br/>
                  Les informations contenues dans ce rapport sont générées automatiquement à partir des données de marché du jour et sont destinées exclusivement au personnel autorisé du Desk International.
                  Toute reproduction ou diffusion est strictement interdite sans autorisation préalable de la Direction des Risques.
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
