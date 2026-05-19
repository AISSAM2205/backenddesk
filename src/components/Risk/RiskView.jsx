import React, { useState, useMemo } from 'react';
import { useTrading } from '../../contexts/TradingContext';
import {
  AlertTriangle, RefreshCw, Shield, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';

/* ─── Formatters ─────────────────────────────────────────────────── */
const fN = (v, d = 2) => {
  if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fMAD = (v, compact = false) => {
  if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—';
  if (compact) {
    const a = Math.abs(n), s = n >= 0 ? '+' : '−';
    if (a >= 1e6) return `${s}${(Math.abs(n) / 1e6).toFixed(2)}M`;
    return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  }
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);
};
const pnlColor = (v) => parseFloat(v || 0) >= 0 ? 'var(--profit)' : 'var(--loss)';

/* ─── KPI Card ───────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, valColor }) => (
  <div className="card" style={{ flex: '1 1 140px', padding: '8px 10px', overflow: 'hidden' }}>
    <span className="lbl" style={{ display: 'block', marginBottom: 5, fontSize: '0.53rem', letterSpacing: '0.12em' }}>{label}</span>
    <div className="n" style={{ fontSize: '1.22rem', fontWeight: 600, lineHeight: 1, color: valColor, letterSpacing: '-0.03em' }}>
      {value}
    </div>
    {sub && <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.60rem', color: 'var(--tx3)', marginTop: 5, lineHeight: 1.3 }}>{sub}</p>}
  </div>
);

/* ─── DV01 Bar ───────────────────────────────────────────────────── */
const Dv01Bar = ({ value, maxVal }) => {
  const pct = maxVal > 0 ? Math.min(Math.abs(parseFloat(value || 0)) / maxVal * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div className="progress-track" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: '#1E7FFF' }} />
      </div>
      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.65rem', color: '#60A5FA', width: 52, textAlign: 'right', flexShrink: 0 }}>
        {fN(Math.abs(parseFloat(value || 0)), 0)}
      </span>
    </div>
  );
};

/* ─── Rate scenario constants ───────────────────────────────────── */
const RATE_SCENARIOS = [
  { label: '−100bp', delta: -100 },
  { label: '−50bp',  delta: -50  },
  { label: '−25bp',  delta: -25  },
  { label: '+25bp',  delta: +25  },
  { label: '+50bp',  delta: +50  },
  { label: '+100bp', delta: +100 },
];
const USD_MAD_REF = 9.251;

/* ─── Sort icon ──────────────────────────────────────────────────── */
const SortIcon = ({ active, dir }) => {
  if (!active) return <ChevronsUpDown size={10} style={{ opacity: 0.25, marginLeft: 3, flexShrink: 0 }} />;
  return dir === 'asc'
    ? <ChevronUp   size={10} style={{ color: 'var(--cyan)', marginLeft: 3 }} />
    : <ChevronDown size={10} style={{ color: 'var(--cyan)', marginLeft: 3 }} />;
};

/* ─── Main Component ─────────────────────────────────────────────── */
const RiskView = () => {
  const {
    dashboardRows, riskData, globalDashboard, portfolioDuration,
    rates, loading, refresh, selectedDate,
  } = useTrading();

  const [sortKey, setSortKey] = useState('dv01Bond');
  const [sortDir, setSortDir] = useState('desc');
  const [showAll, setShowAll] = useState(false);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const rows = useMemo(() => {
    const riskMap = {};
    (riskData || []).forEach(r => { riskMap[r.isin] = r; });
    const src = dashboardRows
      .filter(r => parseFloat(r.dv01Bond || 0) !== 0)
      .map(r => ({ ...r, ...(riskMap[r.isin] ? { ytmMid: riskMap[r.isin].ytmMid, hedgeRatio: riskMap[r.isin].hedgeRatio, nbContractsToHedge: riskMap[r.isin].nbContractsToHedge, currentFuturesPosition: riskMap[r.isin].currentFuturesPosition } : {}) }));
    return [...src].sort((a, b) => {
      const na = parseFloat(a[sortKey] || 0), nb = parseFloat(b[sortKey] || 0);
      if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;
      return 0;
    });
  }, [dashboardRows, riskData, sortKey, sortDir]);

  const displayRows = showAll ? rows : rows.slice(0, 20);

  const totalDv01  = rows.reduce((s, r) => s + parseFloat(r.dv01Bond || 0), 0);
  const maxDv01    = rows.reduce((s, r) => Math.max(s, Math.abs(parseFloat(r.dv01Bond || 0))), 0);
  const dur        = portfolioDuration ?? parseFloat(globalDashboard?.portfolioDuration || 0);
  // Sum of (convexity × nominal) for convexity-adjusted PnL: ΔP = -DV01×Δbp + 0.5×ΣC×N×(Δbp/10000)²
  const totalConvexDollar = rows.reduce((s, r) => {
    const c = parseFloat(r.convexity || 0);
    const n = parseFloat(r.netNominal || 0);
    return s + (isNaN(c) || isNaN(n) ? 0 : c * n);
  }, 0);
  const alerts     = dashboardRows.filter(r => r.netDailyAlert);
  const buySignals = dashboardRows.filter(r => r.decision === 'BUY');

  /* P&L summary */
  const pnlEco   = parseFloat(globalDashboard?.totalPlEcoMad || 0);
  const netDaily = parseFloat(globalDashboard?.totalNetDailyMad || 0);
  const funding  = parseFloat(globalDashboard?.totalFundingCostMad || 0);
  const theta    = parseFloat(globalDashboard?.totalCpnThetaMad || 0);

  const Th = ({ k, label, right }) => (
    <th onClick={() => handleSort(k)} style={{ textAlign: right ? 'right' : 'left', cursor: 'pointer', color: sortKey === k ? 'var(--cyan)' : 'var(--tx3)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: right ? 'flex-end' : 'flex-start' }}>
        {label}<SortIcon active={sortKey === k} dir={sortDir} />
      </span>
    </th>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--void)' }}>

      {/* ── Header ── */}
      <div className="view-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ display: 'inline-block', width: 2, height: 13, background: '#9B3EEF', borderRadius: 1 }} />
              <h2 className="view-title">Pricing &amp; Analytics</h2>
            </div>
            <p className="view-sub" style={{ paddingLeft: 9 }}>Carry · DV01 · Duration · Signaux Hedge — {selectedDate}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="tag">{rows.length} positions</span>
          <button onClick={refresh} disabled={loading} className="btn btn-ghost btn-sm">
            <RefreshCw size={10} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualiser
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── KPI Row ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatCard label="Duration Modifiée"    value={dur ? `${fN(dur, 4)} ans` : '—'}     sub="Nominal-weighted"   valColor="#C084FC"           />
          <StatCard label="DV01 Total Portfolio" value={`${fN(totalDv01, 0)} $/bp`}           sub="Sensibilité à 1bp"  valColor="#60A5FA"           />
          <StatCard label="Net Daily"            value={fMAD(netDaily, true)}                 sub="Theta + Financement" valColor={pnlColor(netDaily)} />
          <StatCard label="Coût Financement/j"   value={fMAD(funding, true)}                  sub="Portage obligataire" valColor="var(--warn)"       />
          <StatCard label="Theta Coupon/j"       value={fMAD(theta, true)}                    sub="Accrual quotidien"   valColor="var(--cyan)"       />
          <StatCard label="Signaux BUY"          value={buySignals.length > 0 ? `${buySignals.length} signal${buySignals.length > 1 ? 's' : ''}` : '— Aucun'} sub="G-Spread > Target" valColor={buySignals.length ? 'var(--profit)' : 'var(--tx2)'} />
        </div>

        {/* ── Analysis Row: Rate Sensitivity + Carry Attribution ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>

          {/* Rate Sensitivity Matrix */}
          <div className="card slide-up stagger-3" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p className="sect-ttl" style={{ margin: 0 }}>Sensibilité aux Taux</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.60rem', color: 'var(--tx3)', padding: '2px 7px', background: 'var(--elev)', borderRadius: 4, border: '1px solid var(--b1)' }}>
                  DV01 {fN(totalDv01, 0)} $/bp
                </span>
                {totalConvexDollar > 0 && (
                  <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.55rem', fontWeight: 700, color: '#C084FC', padding: '2px 7px', background: 'rgba(192,132,252,0.08)', borderRadius: 4, border: '1px solid rgba(192,132,252,0.20)' }}>
                    Convexité adj.
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {RATE_SCENARIOS.map(({ label, delta }) => {
                const usdMad    = parseFloat(rates?.usdMad || USD_MAD_REF);
                const deltaFrac = delta / 10000;                                             // Δy en décimal
                const pnlUsdLin = -totalDv01 * delta;
                const convAdj   = 0.5 * totalConvexDollar * deltaFrac * deltaFrac;          // ½·ΣC·N·Δy²
                const pnlUsdAdj = pnlUsdLin + convAdj;
                const pnlMadLin = pnlUsdLin * usdMad;
                const pnlMadAdj = pnlUsdAdj * usdMad;
                const col       = delta > 0 ? 'var(--loss)' : 'var(--profit)';
                const diffMad   = pnlMadAdj - pnlMadLin;
                const absMax    = totalDv01 * 100 * usdMad;
                const pct       = absMax > 0 ? Math.min(Math.abs(pnlMadAdj) / absMax * 100, 100) : 0;
                return (
                  <div key={label} style={{
                    padding: '10px 6px', borderRadius: 7, textAlign: 'center',
                    background: delta > 0 ? 'rgba(255,43,96,0.05)' : 'rgba(0,232,153,0.05)',
                    border: `1px solid ${delta > 0 ? 'rgba(255,43,96,0.14)' : 'rgba(0,232,153,0.14)'}`,
                  }}>
                    <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.53rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--tx3)', marginBottom: 6 }}>
                      {label}
                    </div>
                    {/* Convexity-adjusted value — main */}
                    <div style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: '0.78rem', lineHeight: 1, color: col, letterSpacing: '-0.01em' }}>
                      {pnlMadAdj >= 0 ? '+' : ''}{(pnlMadAdj / 1e6).toFixed(2)}
                    </div>
                    <div style={{ fontFamily: 'var(--f-disp)', fontSize: '0.48rem', color: 'var(--tx3)', marginTop: 2 }}>M MAD</div>
                    {/* Convexity delta vs linear */}
                    {Math.abs(diffMad) > 1000 && (
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: '0.50rem', color: '#C084FC', marginTop: 3 }}>
                        conv {diffMad >= 0 ? '+' : ''}{(diffMad / 1e6).toFixed(2)}M
                      </div>
                    )}
                    {/* Linear secondary */}
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: '0.50rem', color: 'var(--tx3)', marginTop: 2, opacity: 0.6 }}>
                      lin. {pnlMadLin >= 0 ? '+' : ''}{(pnlMadLin / 1e6).toFixed(2)}M
                    </div>
                    <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden', marginTop: 5 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2, opacity: 0.75,
                        ...(delta > 0 ? {} : { marginLeft: 'auto' }) }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.57rem', color: 'var(--tx3)', marginTop: 8, textAlign: 'right', opacity: 0.6 }}>
              ΔP ≈ −DV01×Δbp + ½·C·N·(Δbp/10000)² — valeur principale = convexité ajustée
            </p>
          </div>

          {/* Carry Attribution */}
          <div className="card slide-up stagger-3" style={{ padding: '14px 16px' }}>
            <p className="sect-ttl" style={{ marginBottom: 12 }}>Attribution Carry / j</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Theta Coupon', value: theta,   col: 'var(--cyan)',  sign: true  },
                { label: 'Financement',  value: funding, col: 'var(--warn)',  sign: false },
                { label: 'Net Daily',    value: netDaily, col: netDaily >= 0 ? 'var(--profit)' : 'var(--loss)', sign: true },
              ].map(({ label, value, col }) => {
                const absMax = Math.max(Math.abs(theta), Math.abs(funding), Math.abs(netDaily), 1);
                const pct = Math.min(Math.abs(value) / absMax * 100, 100);
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--tx3)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.73rem', fontWeight: 700, color: col }}>{fMAD(value, true)}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--b1)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 3, opacity: 0.75, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {theta !== 0 && funding !== 0 && (
              <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 6, background: 'var(--elev)', border: '1px solid var(--b0)' }}>
                <div style={{ fontFamily: 'var(--f-disp)', fontSize: '0.53rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--tx3)', marginBottom: 4 }}>
                  Couverture Theta / Fin.
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: '0.85rem', color: Math.abs(theta) >= Math.abs(funding) ? 'var(--profit)' : 'var(--loss)' }}>
                  {funding !== 0 ? (Math.abs(theta / funding) * 100).toFixed(0) : '—'}%
                </div>
                <div style={{ fontFamily: 'var(--f-body)', fontSize: '0.56rem', color: 'var(--tx3)', marginTop: 2 }}>
                  {Math.abs(theta) >= Math.abs(funding) ? 'Theta couvre le financement' : 'Financement > Theta'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Carry Alert Banner ── */}
        {alerts.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(255,43,96,0.06)', border: '1px solid rgba(255,43,96,0.20)',
            flexWrap: 'wrap',
          }}>
            <AlertTriangle size={13} style={{ color: 'var(--loss)', flexShrink: 0, animation: 'pulse-live 2s ease infinite' }} />
            <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--loss)' }}>
              {alerts.length} carry négatif :
            </span>
            <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.72rem', color: '#FC8FA0' }}>
              {alerts.slice(0, 5).map(a => a.description || a.isin).join(' · ')}
            </span>
          </div>
        )}

        {/* ── DV01 / Carry Table ── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--b1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
                Analyse DV01 / Carry par ISIN
              </h3>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.65rem', color: 'var(--tx3)', padding: '2px 7px', background: 'var(--elev)', borderRadius: 4, border: '1px solid var(--b1)' }}>
                {rows.length} pos.
              </span>
            </div>
            {rows.length > 20 && (
              <button onClick={() => setShowAll(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--f-body)', fontSize: '0.70rem', color: 'var(--tx2)',
              }}>
                {showAll ? <><ChevronUp size={12} />Réduire</> : <><ChevronDown size={12} />Voir tout ({rows.length})</>}
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="dtable">
              <thead>
                <tr>
                  <Th k="isin"             label="ISIN"          />
                  <Th k="description"      label="Obligation"    />
                  <Th k="subAsset"         label="Type"          />
                  <Th k="netNominal"       label="Nominal M"     right />
                  <Th k="modifiedDuration" label="Duration"      right />
                  <Th k="ytmMid"           label="YTM%"          right />
                  <th style={{ textAlign: 'right', cursor: 'default', color: 'var(--tx3)' }}>DV01 Bar</th>
                  <Th k="dv01Bond"         label="DV01 $/bp"     right />
                  <Th k="hedgeRatio"       label="Hedge%"        right />
                  <Th k="gSpreadBid"       label="Bid bp"        right />
                  <Th k="targetSpread"     label="Target bp"     right />
                  <Th k="netDailyMad"      label="Net Daily"     right />
                  <Th k="cpnThetaMad"      label="Theta/j"       right />
                  <Th k="fundingCostMad"   label="Fin. MAD"      right />
                  <Th k="pnlEconomicMad"   label="P&L Éco ★"    right />
                  <th style={{ textAlign: 'center', cursor: 'default', color: 'var(--tx3)' }}>Signal</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r, idx) => {
                  const isBuy = r.decision === 'BUY';
                  const isAlert = r.netDailyAlert;
                  const rowBg = isAlert ? 'rgba(255,43,96,0.04)' : idx % 2 === 0 ? 'var(--tr-even-bg)' : 'transparent';
                  const spread = parseFloat(r.targetSpread || 0) > 0
                    ? (parseFloat(r.gSpreadBid || 0) - parseFloat(r.targetSpread || 0)).toFixed(1)
                    : null;
                  return (
                    <tr key={r.isin} style={{ background: rowBg }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--tr-hover-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                      <td style={{ fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--cyan)', fontWeight: 500 }}>{r.isin}</td>
                      <td style={{ textAlign: 'left', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.70rem', color: 'var(--tx1)' }} title={r.description}>{r.description || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {r.subAsset && <span className={`badge ${(r.subAsset || '').toLowerCase().includes('ocp') ? 'badge-fut' : 'badge-eb'}`}>{r.subAsset}</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem' }}>
                        {fN(parseFloat(r.netNominal || 0) / 1e6, 1)}<span style={{ color: 'var(--tx3)', fontSize: '0.58rem', marginLeft: 1 }}>M</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: '#C084FC' }}>{fN(r.modifiedDuration, 2)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: '#FCD34D' }}>{r.ytmMid != null ? `${fN(r.ytmMid, 3)}%` : '—'}</td>
                      <td><Dv01Bar value={r.dv01Bond} maxVal={maxDv01} /></td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: '#60A5FA', fontWeight: 600 }}>{fN(r.dv01Bond, 0)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--fut)' }}>{r.hedgeRatio != null ? `${(parseFloat(r.hedgeRatio) * 100).toFixed(1)}%` : '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: '#FCD34D' }}>{fN(r.gSpreadBid, 1)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--tx2)' }}>{fN(r.targetSpread, 1)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: pnlColor(r.netDailyMad), fontWeight: isAlert ? 700 : 400 }}>
                        {fMAD(r.netDailyMad, true)}{isAlert && ' ⚠'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: '#60A5FA' }}>{fMAD(r.cpnThetaMad, true)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--warn)' }}>{fMAD(r.fundingCostMad, true)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: pnlColor(r.pnlEconomicMad), fontWeight: 600 }}>{fMAD(r.pnlEconomicMad, true)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {isBuy ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span className="badge badge-active">▲ BUY</span>
                            {spread != null && <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.57rem', color: 'var(--profit)' }}>+{spread}bp</span>}
                          </div>
                        ) : (
                          <span className="badge badge-closed">— HOLD</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'left', fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.60rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx3)' }}>
                    Total <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--cyan)' }}>({rows.length})</span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontWeight: 600 }}>
                    {(rows.reduce((s, r) => s + parseFloat(r.netNominal || 0), 0) / 1e6).toFixed(1)}<span style={{ color: 'var(--tx3)', fontSize: '0.58rem', marginLeft: 1 }}>M</span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: '#C084FC', fontWeight: 600 }}>
                    {fN(dur, 4)}
                  </td>
                  <td />
                  <td />
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: '#60A5FA', fontWeight: 700 }}>
                    {fN(totalDv01, 0)}
                  </td>
                  <td colSpan={4} />
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: pnlColor(netDaily), fontWeight: 600 }}>
                    {fMAD(netDaily, true)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: '#60A5FA' }}>
                    {fMAD(theta, true)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: 'var(--warn)' }}>
                    {fMAD(funding, true)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: pnlColor(pnlEco), fontWeight: 700 }}>
                    {fMAD(pnlEco, true)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {rows.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--tx3)' }}>
              <Shield size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.78rem' }}>Aucune donnée de risque</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default RiskView;
