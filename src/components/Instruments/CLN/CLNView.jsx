import React, { useMemo, useState } from 'react';
import { useTrading } from '../../../contexts/TradingContext';
import { Shield, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/* ─── Formatters ─────────────────────────────────────────────────── */
const fN  = (v, d = 2) => { if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—'; return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }); };
const fMAD = (v) => { if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—'; const a = Math.abs(n), s = n >= 0 ? '+' : '−'; if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)}M`; return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }); };
const fUSD = (v) => { if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—'; const a = Math.abs(n), s = n >= 0 ? '+' : ''; if (a >= 1e6) return `${s}${(n / 1e6).toFixed(2)}M`; return `${s}${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`; };
const fMat = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }); } catch { return d; } };
const pnlColor = (v) => parseFloat(v || 0) >= 0 ? 'var(--profit)' : 'var(--loss)';

const SortIcon = ({ active, dir }) => {
  if (!active) return <ChevronsUpDown size={10} style={{ opacity: 0.25, marginLeft: 3 }} />;
  return dir === 'asc' ? <ChevronUp size={10} style={{ color: 'var(--cyan)', marginLeft: 3 }} /> : <ChevronDown size={10} style={{ color: 'var(--cyan)', marginLeft: 3 }} />;
};

const CLNView = () => {
  const { clnList, loading, refresh, selectedDate } = useTrading();
  const [sortKey, setSortKey] = useState('plEcoMad');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (k) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return clnList;
    return [...clnList].sort((a, b) => {
      const na = parseFloat(a[sortKey]), nb = parseFloat(b[sortKey]);
      if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;
      const sa = String(a[sortKey] ?? ''), sb = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [clnList, sortKey, sortDir]);

  // ─── Totals (ExternalPnlSnapshot fields) ──────────────────────────
  const totals = useMemo(() => sorted.reduce((acc, r) => ({
    nominalUsd:    acc.nominalUsd    + parseFloat(r.nominalUsd    || 0),
    plEcoMad:      acc.plEcoMad      + parseFloat(r.plEcoMad      || 0),
    plRealizedUsd: acc.plRealizedUsd + parseFloat(r.plRealizedUsd || 0),
    plLatentUsd:   acc.plLatentUsd   + parseFloat(r.plLatentUsd   || 0),
    fundingUsd:    acc.fundingUsd    + parseFloat(r.fundingUsd    || 0),
  }), { nominalUsd: 0, plEcoMad: 0, plRealizedUsd: 0, plLatentUsd: 0, fundingUsd: 0 }), [sorted]);

  const Th = ({ k, label, right }) => (
    <th onClick={() => handleSort(k)} style={{ textAlign: right ? 'right' : 'left', cursor: 'pointer', color: sortKey === k ? 'var(--cyan)' : 'var(--tx3)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: right ? 'flex-end' : 'flex-start' }}>
        {label}<SortIcon active={sortKey === k} dir={sortDir} />
      </span>
    </th>
  );

  // Date snapshot la plus récente dans les données
  const snapshotDate = clnList.length > 0 ? clnList[0].snapshotDate : null;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--void)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--void)', borderBottom: '1px solid var(--b1)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={14} style={{ color: '#C084FC' }} />
            <h2 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
              CLN — Credit Linked Notes
            </h2>
            <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.60rem', color: 'var(--tx3)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(192,132,252,0.3)', background: 'rgba(192,132,252,0.06)' }}>
              Desk Structuré · Ext.
            </span>
          </div>
          <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.64rem', color: 'var(--tx3)', marginTop: 2 }}>
            {clnList.length} position{clnList.length !== 1 ? 's' : ''}
            {snapshotDate && <span style={{ marginLeft: 8, color: 'rgba(156,163,175,0.5)' }}>snapshot {snapshotDate}</span>}
          </p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn btn-ghost btn-sm">
          <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPI Row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            ['P&L Économique (MAD)', fMAD(totals.plEcoMad),      pnlColor(totals.plEcoMad),      totals.plEcoMad >= 0 ? 'kpi-top-green' : 'kpi-top-red'],
            ['P&L Réalisé (USD)',    fUSD(totals.plRealizedUsd),  pnlColor(totals.plRealizedUsd), totals.plRealizedUsd >= 0 ? 'kpi-top-green' : 'kpi-top-red'],
            ['P&L Latent (USD)',     fUSD(totals.plLatentUsd),    pnlColor(totals.plLatentUsd),   totals.plLatentUsd >= 0 ? 'kpi-top-green' : 'kpi-top-red'],
            ['Nominal Total (USD)',  `${fN(totals.nominalUsd / 1e6, 0)} M`, 'var(--tx1)',         'kpi-top-violet'],
            ['Financement (USD)',    fUSD(totals.fundingUsd),     'var(--warn)',                   'kpi-top-warn'],
            ['Nb Positions',         clnList.length.toString(),   '#C084FC',                      'kpi-top-violet'],
          ].map(([label, value, valColor, topClass]) => (
            <div key={label} className={`card ${topClass}`} style={{ flex: '1 1 140px', padding: '13px 15px' }}>
              <div className="lbl" style={{ marginBottom: 8 }}>{label}</div>
              <div className="n" style={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1, color: valColor, letterSpacing: '-0.02em' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={13} style={{ color: '#9B3EEF' }} />
            <h3 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
              Positions CLN
            </h3>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.65rem', color: 'var(--tx3)', padding: '2px 7px', background: 'var(--elev)', borderRadius: 4, border: '1px solid var(--b1)' }}>
              {clnList.length}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="dtable">
              <thead>
                <tr>
                  <Th k="isin"          label="ISIN"           />
                  <Th k="description"   label="Description"    />
                  <Th k="counterparty"  label="Contrepartie"   />
                  <Th k="maturityDate"  label="Échéance"       />
                  <Th k="couponRate"    label="Coupon %"       right />
                  <Th k="nominalUsd"    label="Nominal M"      right />
                  <Th k="plRealizedUsd" label="P&L Réalisé $"  right />
                  <Th k="plLatentUsd"   label="P&L Latent $"   right />
                  <Th k="plEcoMad"      label="P&L Éco ★ MAD" right />
                  <Th k="fundingUsd"    label="Funding $"      right />
                  <Th k="duration"      label="Duration"       right />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, idx) => {
                  const rowBg = idx % 2 === 0 ? 'var(--tr-even-bg)' : 'transparent';
                  return (
                    <tr key={r.isin + idx} style={{ background: rowBg }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--tr-hover-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                      <td style={{ fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: '#C084FC', fontWeight: 500 }}>{r.isin}</td>
                      <td style={{ textAlign: 'left', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.70rem', color: 'var(--tx1)' }} title={r.description}>{r.description || '—'}</td>
                      <td style={{ fontFamily: 'var(--f-body)', fontSize: '0.68rem', color: 'var(--tx2)' }}>{r.counterparty || '—'}</td>
                      <td style={{ fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--tx2)' }}>{fMat(r.maturityDate)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: '#FCD34D' }}>
                        {r.couponRate != null ? `${(parseFloat(r.couponRate) * 100).toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', fontWeight: 500 }}>
                        {fN(parseFloat(r.nominalUsd || 0) / 1e6, 0)}<span style={{ color: 'var(--tx3)', fontSize: '0.58rem', marginLeft: 1 }}>M</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: pnlColor(r.plRealizedUsd) }}>{fUSD(r.plRealizedUsd)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: pnlColor(r.plLatentUsd) }}>{fUSD(r.plLatentUsd)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: pnlColor(r.plEcoMad), fontWeight: 700 }}>{fMAD(r.plEcoMad)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--warn)' }}>{fUSD(r.fundingUsd)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: '#C084FC' }}>{fN(r.duration, 4)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {sorted.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'left', fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.60rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx3)' }}>
                      Total <span style={{ fontFamily: 'var(--f-mono)', color: '#C084FC' }}>({sorted.length})</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontWeight: 600 }}>
                      {(totals.nominalUsd / 1e6).toFixed(0)}<span style={{ color: 'var(--tx3)', fontSize: '0.58rem', marginLeft: 1 }}>M</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: pnlColor(totals.plRealizedUsd), fontWeight: 600 }}>{fUSD(totals.plRealizedUsd)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: pnlColor(totals.plLatentUsd), fontWeight: 600 }}>{fUSD(totals.plLatentUsd)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: pnlColor(totals.plEcoMad), fontWeight: 700 }}>{fMAD(totals.plEcoMad)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: 'var(--warn)' }}>{fUSD(totals.fundingUsd)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {clnList.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--tx3)' }}>
              <Shield size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.78rem' }}>Aucun snapshot CLN disponible</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CLNView;
