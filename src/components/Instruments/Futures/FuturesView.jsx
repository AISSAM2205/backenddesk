import React, { useMemo, useState } from 'react';
import { useTrading } from '../../../contexts/TradingContext';
import { TrendingUp, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown, AlertTriangle, Shield } from 'lucide-react';

/* ─── Formatters ─────────────────────────────────────────────────── */
const fN  = (v, d = 2) => { if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—'; return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }); };
const fMAD = (v) => {
  if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—';
  const a = Math.abs(n), s = n >= 0 ? '+' : '−';
  if (a >= 1e6) return `${s}${(Math.abs(n) / 1e6).toFixed(2)}M`;
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
};
const pnlColor = (v) => parseFloat(v || 0) >= 0 ? 'var(--profit)' : 'var(--loss)';
const fMat = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }); } catch { return d; } };

const SortIcon = ({ active, dir }) => {
  if (!active) return <ChevronsUpDown size={10} style={{ opacity: 0.25, marginLeft: 3 }} />;
  return dir === 'asc' ? <ChevronUp size={10} style={{ color: 'var(--fut)', marginLeft: 3 }} /> : <ChevronDown size={10} style={{ color: 'var(--fut)', marginLeft: 3 }} />;
};

const FuturesView = () => {
  const { dashboardRows, riskData, loading, refresh, selectedDate } = useTrading();
  const [sortKey, setSortKey] = useState('dv01Bond');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (k) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  /* Bonds that have a hedge future assigned */
  const hedged = useMemo(() => {
    const riskMap = {};
    (riskData || []).forEach(r => { riskMap[r.isin] = r; });
    return (dashboardRows || [])
      .filter(r => {
        const sub = (r.subAsset || '').toLowerCase();
        return !sub.includes('future') && r.hedgeFuture;
      })
      .map(r => ({ ...r, ...(riskMap[r.isin] || {}) }));
  }, [dashboardRows, riskData]);

  /* Pure futures positions (subAsset contains "future") */
  const futureRows = useMemo(() => {
    return (dashboardRows || []).filter(r => (r.subAsset || '').toLowerCase().includes('future'));
  }, [dashboardRows]);

  const sorted = useMemo(() => {
    const arr = [...hedged];
    if (!sortKey) return arr;
    return arr.sort((a, b) => {
      const na = parseFloat(a[sortKey]), nb = parseFloat(b[sortKey]);
      if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;
      return 0;
    });
  }, [hedged, sortKey, sortDir]);

  const totals = useMemo(() => sorted.reduce((acc, r) => ({
    nominal:          acc.nominal   + parseFloat(r.netNominal || 0),
    dv01:             acc.dv01      + parseFloat(r.dv01Bond || 0),
    nbContractsNeeded: acc.nbContractsNeeded + (parseInt(r.nbContractsToHedge, 10) || 0),
    pnlEco:           acc.pnlEco   + parseFloat(r.pnlEconomicMad || 0),
  }), { nominal: 0, dv01: 0, nbContractsNeeded: 0, pnlEco: 0 }), [sorted]);

  const futTotals = useMemo(() => futureRows.reduce((acc, r) => ({
    pnlEco: acc.pnlEco + parseFloat(r.pnlEconomicMad || 0),
    pnlAcct: acc.pnlAcct + parseFloat(r.pnlAccountingMad || 0),
    netDaily: acc.netDaily + parseFloat(r.netDailyMad || 0),
  }), { pnlEco: 0, pnlAcct: 0, netDaily: 0 }), [futureRows]);

  const totalNetPos = futureRows.reduce((s, r) => s + (parseInt(r.futuresNetPosition, 10) || 0), 0);

  const Th = ({ k, label, right }) => (
    <th onClick={() => handleSort(k)} style={{ textAlign: right ? 'right' : 'left', cursor: 'pointer', color: sortKey === k ? 'var(--fut)' : 'var(--tx3)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: right ? 'flex-end' : 'flex-start' }}>
        {label}<SortIcon active={sortKey === k} dir={sortDir} />
      </span>
    </th>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--void)' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--void)', borderBottom: '1px solid var(--b1)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={14} style={{ color: 'var(--fut)' }} />
            <h2 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
              Futures & Couverture
            </h2>
          </div>
          <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.64rem', color: 'var(--tx3)', marginTop: 2 }}>
            {sorted.length} position{sorted.length !== 1 ? 's' : ''} couvertes · {futureRows.length} contrats actifs · {selectedDate}
          </p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn btn-ghost btn-sm">
          <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPI Row — Futures positions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            ['Position Nette', `${totalNetPos > 0 ? '+' : ''}${totalNetPos} cts`, 'var(--fut)', 'kpi-top-teal'],
            ['P&L Éco Futures', fMAD(futTotals.pnlEco), pnlColor(futTotals.pnlEco), futTotals.pnlEco >= 0 ? 'kpi-top-green' : 'kpi-top-red'],
            ['P&L Comptable', fMAD(futTotals.pnlAcct), pnlColor(futTotals.pnlAcct), futTotals.pnlAcct >= 0 ? 'kpi-top-green' : 'kpi-top-red'],
            ['Net Daily', fMAD(futTotals.netDaily), pnlColor(futTotals.netDaily), futTotals.netDaily >= 0 ? 'kpi-top-cyan' : 'kpi-top-red'],
            ['DV01 à couvrir', `${fN(totals.dv01, 0)} $/bp`, '#60A5FA', 'kpi-top-blue'],
            ['Contrats nécessaires', `${totals.nbContractsNeeded} cts`, 'var(--warn)', 'kpi-top-warn'],
          ].map(([label, value, valColor, topClass]) => (
            <div key={label} className={`card ${topClass}`} style={{ flex: '1 1 140px', padding: '13px 15px' }}>
              <div className="lbl" style={{ marginBottom: 8 }}>{label}</div>
              <div className="n" style={{ fontSize: '1.10rem', fontWeight: 600, lineHeight: 1, color: valColor, letterSpacing: '-0.02em' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Active futures positions block */}
        {futureRows.length > 0 && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingUp size={13} style={{ color: 'var(--fut)' }} />
              <h3 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
                Positions Futures Actives
              </h3>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.65rem', color: 'var(--tx3)', padding: '2px 7px', background: 'var(--elev)', borderRadius: 4, border: '1px solid var(--b1)' }}>{futureRows.length}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="dtable">
                <thead><tr>
                  <th style={{ textAlign: 'left' }}>Ticker / ISIN</th>
                  <th style={{ textAlign: 'left' }}>Type</th>
                  <th style={{ textAlign: 'right' }}>Pos. Nette</th>
                  <th style={{ textAlign: 'right' }}>P&L Éco MAD</th>
                  <th style={{ textAlign: 'right' }}>P&L Cmptb.</th>
                  <th style={{ textAlign: 'right' }}>Net Daily</th>
                  <th style={{ textAlign: 'right' }}>Échéance</th>
                </tr></thead>
                <tbody>
                  {futureRows.map((r, idx) => {
                    const rowBg = idx % 2 === 0 ? 'rgba(8,24,41,0.50)' : 'transparent';
                    return (
                      <tr key={r.isin} style={{ background: rowBg }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(12,31,58,0.70)'}
                        onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                        <td style={{ fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--fut)', fontWeight: 500 }}>{r.isin || r.description}</td>
                        <td><span className="badge badge-fut">{r.subAsset}</span></td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.70rem', color: 'var(--fut)', fontWeight: 700 }}>
                          {r.futuresNetPosition != null ? `${r.futuresNetPosition > 0 ? '+' : ''}${r.futuresNetPosition}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: pnlColor(r.pnlEconomicMad), fontWeight: 700 }}>{fMAD(r.pnlEconomicMad)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: pnlColor(r.pnlAccountingMad) }}>{fMAD(r.pnlAccountingMad)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: pnlColor(r.netDailyMad) }}>{fMAD(r.netDailyMad)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--tx2)' }}>{fMat(r.maturityDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Hedge Book — bonds needing futures coverage */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={13} style={{ color: '#9B3EEF' }} />
            <h3 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
              Hedge Book — Couverture Duration
            </h3>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.65rem', color: 'var(--tx3)', padding: '2px 7px', background: 'var(--elev)', borderRadius: 4, border: '1px solid var(--b1)' }}>{sorted.length}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="dtable">
              <thead><tr>
                <Th k="isin"             label="ISIN"              />
                <Th k="description"      label="Obligation"        />
                <Th k="maturityDate"     label="Échéance"          />
                <Th k="netNominal"       label="Nominal M"         right />
                <Th k="modifiedDuration" label="Duration"          right />
                <Th k="dv01Bond"         label="DV01 $/bp"         right />
                <Th k="hedgeFuture"      label="Future Hedge"      />
                <Th k="hedgeRatio"       label="Ratio Hedge"       right />
                <Th k="nbContractsToHedge" label="Contrats ∆"     right />
                <Th k="currentFuturesPosition" label="Pos. Actuelle" right />
                <Th k="pnlEconomicMad"   label="P&L Éco ★"        right />
              </tr></thead>
              <tbody>
                {sorted.map((r, idx) => {
                  const rowBg = idx % 2 === 0 ? 'rgba(8,24,41,0.50)' : 'transparent';
                  const needed = parseInt(r.nbContractsToHedge, 10) || 0;
                  const current = parseInt(r.currentFuturesPosition, 10) || 0;
                  const gap = needed - Math.abs(current);
                  return (
                    <tr key={r.isin} style={{ background: rowBg }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(12,31,58,0.70)'}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                      <td style={{ fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--cyan)', fontWeight: 500 }}>{r.isin}</td>
                      <td style={{ textAlign: 'left', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.70rem', color: 'var(--tx1)' }} title={r.description}>{r.description || '—'}</td>
                      <td style={{ fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--tx2)' }}>{fMat(r.maturityDate)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', fontWeight: 500 }}>
                        {fN(parseFloat(r.netNominal || 0) / 1e6, 1)}<span style={{ color: 'var(--tx3)', fontSize: '0.58rem', marginLeft: 1 }}>M</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: '#C084FC' }}>{fN(r.modifiedDuration, 2)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: '#60A5FA' }}>{fN(r.dv01Bond, 0)}</td>
                      <td style={{ fontFamily: 'var(--f-mono)', fontSize: '0.66rem', color: 'var(--fut)', fontWeight: 500 }}>{r.hedgeFuture || '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--tx2)' }}>{r.hedgeRatio != null ? `${(parseFloat(r.hedgeRatio) * 100).toFixed(1)}%` : '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', fontWeight: 600, color: 'var(--warn)' }}>{needed || '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: current !== 0 ? 'var(--fut)' : 'var(--tx3)' }}>
                        {current !== 0 ? `${current > 0 ? '+' : ''}${current}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: pnlColor(r.pnlEconomicMad), fontWeight: 700 }}>{fMAD(r.pnlEconomicMad)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {sorted.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'left', fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.60rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx3)' }}>
                      Total <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--fut)' }}>({sorted.length})</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontWeight: 600 }}>
                      {(totals.nominal / 1e6).toFixed(1)}<span style={{ color: 'var(--tx3)', fontSize: '0.58rem', marginLeft: 1 }}>M</span>
                    </td>
                    <td />
                    <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: '#60A5FA', fontWeight: 600 }}>{fN(totals.dv01, 0)}</td>
                    <td colSpan={2} />
                    <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: 'var(--warn)', fontWeight: 700 }}>{totals.nbContractsNeeded}</td>
                    <td />
                    <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: pnlColor(totals.pnlEco), fontWeight: 700 }}>{fMAD(totals.pnlEco)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {sorted.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--tx3)' }}>
              <TrendingUp size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.78rem' }}>Aucune position couverte pour le {selectedDate}</p>
            </div>
          )}
        </div>

        {/* Alert when hedge gap is significant */}
        {sorted.some(r => parseInt(r.nbContractsToHedge, 10) > 0 && Math.abs(parseInt(r.currentFuturesPosition, 10) || 0) < parseInt(r.nbContractsToHedge, 10)) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(199,122,0,0.08)', border: '1px solid rgba(199,122,0,0.25)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--warn)', marginBottom: 4 }}>
                Couverture Incomplète
              </p>
              <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.73rem', color: 'var(--tx2)', lineHeight: 1.5 }}>
                Certaines positions ont un écart entre les contrats nécessaires et les contrats actuellement ouverts. Vérifier le hedge book.
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
