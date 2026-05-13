import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTrading } from '../../../contexts/TradingContext';
import { AlertTriangle, Search, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown, Download } from 'lucide-react';

/* ─── Formatters ─────────────────────────────────────────────────── */
const fMAD = (v) => {
  if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e6) return `${n >= 0 ? '' : '−'}${(Math.abs(n) / 1e6).toFixed(2)}M`;
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);
};
const fN = (v, d = 2) => {
  if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fPct = (v, d = 3) => {
  if (v == null) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`;
};
const fMat = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }); }
  catch { return d; }
};
const pnlColor = (v) => parseFloat(v || 0) >= 0 ? 'var(--profit)' : 'var(--loss)';

/* ─── Price flash hook ───────────────────────────────────────────── */
const useFlash = (value) => {
  const prev = useRef(value);
  const [cls, setCls] = useState('');
  useEffect(() => {
    const cur = parseFloat(value || 0), p = parseFloat(prev.current || 0);
    if (cur !== p && p !== 0) {
      setCls(cur > p ? 'tick-up' : 'tick-down');
      const t = setTimeout(() => setCls(''), 800);
      prev.current = value; return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return cls;
};

/* ─── Column groups ──────────────────────────────────────────────── */
const GROUPS = [
  { label: 'IDENTIFICATION', span: 6, color: 'rgba(30,127,255,0.6)' },
  { label: 'NOMINAL',        span: 1, color: 'rgba(100,116,139,0.5)' },
  { label: 'PRICING',        span: 4, color: 'rgba(99,102,241,0.6)'  },
  { label: 'P&L — CCY',      span: 4, color: 'rgba(20,188,164,0.6)'  },
  { label: 'P&L — MAD',      span: 6, color: 'rgba(0,232,153,0.6)'   },
  { label: 'G-SPREAD (bp)',   span: 3, color: 'rgba(234,179,8,0.6)'   },
  { label: 'SIGNAL',         span: 1, color: 'rgba(100,116,139,0.5)' },
  { label: 'RISQUE',         span: 2, color: 'rgba(155,62,239,0.6)'  },
  { label: 'HEDGE',          span: 2, color: 'rgba(0,202,255,0.6)'   },
];

const COLS = [
  /* Ident */   { key: 'isin',             label: 'ISIN',      right: false },
  /* Ident */   { key: 'description',      label: 'Oblig.',    right: false, noSort: true },
  /* Ident */   { key: 'subAsset',         label: 'Sub',       right: false, noSort: true },
  /* Ident */   { key: 'couponRate',       label: 'Cpn%',      right: true  },
  /* Ident */   { key: 'maturityDate',     label: 'Échéance',  right: false, noSort: true },
  /* Ident */   { key: 'currency',         label: 'CCY',       right: false },
  /* Nominal */ { key: 'netNominal',       label: 'Nominal M', right: true  },
  /* Pricing */ { key: 'cleanPrice',       label: 'Clean',     right: true  },
  /* Pricing */ { key: 'accrued',          label: 'Accrued',   right: true  },
  /* Pricing */ { key: 'lastWapDirty',     label: 'WAP Dirty', right: true  },
  /* Pricing */ { key: 'dirtyMarket',      label: 'Px Mkt',    right: true  },
  /* PnL CCY */ { key: 'pnlLatentCcy',     label: 'Latent',    right: true  },
  /* PnL CCY */ { key: 'pnlRealizedCcy',   label: 'Réalisé',   right: true  },
  /* PnL CCY */ { key: 'couponsCcy',       label: 'Coupons',   right: true  },
  /* PnL CCY */ { key: 'totalPnlCcy',      label: 'P&L Total', right: true  },
  /* PnL MAD */ { key: 'pnlAccountingMad', label: 'Cmptb.',    right: true  },
  /* PnL MAD */ { key: 'fundingCostMad',   label: 'Fin. MAD',  right: true  },
  /* PnL MAD */ { key: 'pnlEconomicMad',   label: 'Éco MAD ★', right: true, star: true },
  /* PnL MAD */ { key: 'cpnThetaMad',      label: 'CpnΘ/j',    right: true  },
  /* PnL MAD */ { key: 'dailyFundingMad',  label: 'Fin/j',     right: true  },
  /* PnL MAD */ { key: 'netDailyMad',      label: 'Net Daily★', right: true, star: true },
  /* Spread */  { key: 'gSpreadBid',       label: 'Bid',       right: true  },
  /* Spread */  { key: 'gSpreadMid',       label: 'Mid',       right: true  },
  /* Spread */  { key: 'targetSpread',     label: 'Target',    right: true  },
  /* Signal */  { key: 'decision',         label: 'Signal',    right: false, noSort: true },
  /* Risk */    { key: 'modifiedDuration', label: 'Dur.',      right: true  },
  /* Risk */    { key: 'dv01Bond',         label: 'DV01 $',    right: true  },
  /* Hedge */   { key: 'hedgeFuture',      label: 'Future',    right: false, noSort: true },
  /* Hedge */   { key: 'nbContractsToHedge',label: 'Ctrts',   right: true  },
];

/* ─── Sub-asset badge ────────────────────────────────────────────── */
const SubBadge = ({ v }) => {
  if (!v) return null;
  const s = v.toLowerCase();
  const cls = s.includes('ocp') ? 'badge-fut' : s.includes('cln') ? 'badge-cln' : s.includes('egp') || s.includes('bill') ? 'badge-egp' : 'badge-eb';
  return <span className={`badge ${cls}`}>{v}</span>;
};

/* ─── Signal badge ───────────────────────────────────────────────── */
const Signal = ({ row }) => {
  const isBuy  = row?.decision === 'BUY';
  const spread = parseFloat(row?.targetSpread || 0) > 0
    ? (parseFloat(row?.gSpreadBid || 0) - parseFloat(row?.targetSpread || 0)).toFixed(1)
    : null;
  if (isBuy) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span className="badge badge-active">▲ BUY</span>
      {spread != null && <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.58rem', color: 'var(--profit)' }}>+{spread}bp</span>}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span className="badge badge-closed">— HOLD</span>
      {spread != null && <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.58rem', color: 'var(--tx3)' }}>{spread}bp</span>}
    </div>
  );
};

/* ─── Sort icon ──────────────────────────────────────────────────── */
const SortIcon = ({ active, dir }) => {
  if (!active) return <ChevronsUpDown size={10} style={{ opacity: 0.25, marginLeft: 3, flexShrink: 0 }} />;
  return dir === 'asc'
    ? <ChevronUp   size={10} style={{ color: 'var(--cyan)', marginLeft: 3, flexShrink: 0 }} />
    : <ChevronDown size={10} style={{ color: 'var(--cyan)', marginLeft: 3, flexShrink: 0 }} />;
};

/* ─── Table Row ──────────────────────────────────────────────────── */
const Row = ({ r, idx }) => {
  const flash = useFlash(r.dirtyMarket);
  const isAlert = r.netDailyAlert;
  const td = { padding: '6px 10px', borderBottom: '1px solid var(--b0)', whiteSpace: 'nowrap', transition: 'background 0.1s' };
  const nb = { ...td, textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', fontVariantNumeric: 'tabular-nums' };

  const rowBg = isAlert ? 'rgba(255,43,96,0.05)' : idx % 2 === 0 ? 'var(--tr-even-bg)' : 'transparent';

  return (
    <tr className={flash} style={{ background: rowBg }} onMouseEnter={e => e.currentTarget.style.background = 'var(--tr-hover-bg)'} onMouseLeave={e => e.currentTarget.style.background = rowBg}>
      <td style={{ ...td, fontFamily: 'var(--f-mono)', fontSize: '0.67rem', color: 'var(--cyan)', fontWeight: 500 }}>{r.isin}</td>
      <td style={{ ...td, fontFamily: 'var(--f-body)', fontSize: '0.70rem', color: 'var(--tx1)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.description}>{r.description || '—'}</td>
      <td style={{ ...td, textAlign: 'center' }}><SubBadge v={r.subAsset} /></td>
      <td style={{ ...nb, color: '#FCD34D' }}>{r.couponRate != null ? `${parseFloat(r.couponRate).toFixed(3)}%` : '—'}</td>
      <td style={{ ...td, fontFamily: 'var(--f-mono)', fontSize: '0.67rem', color: 'var(--tx2)' }}>{fMat(r.maturityDate)}</td>
      <td style={{ ...td, fontFamily: 'var(--f-mono)', fontSize: '0.67rem', color: 'var(--tx3)', fontWeight: 600 }}>{r.currency || '—'}</td>
      <td style={{ ...nb }}>{fN(parseFloat(r.netNominal || 0) / 1e6, 1)}<span style={{ color: 'var(--tx3)', fontSize: '0.58rem', marginLeft: 1 }}>M</span></td>
      <td style={{ ...nb, color: 'var(--tx2)' }}>{fN(r.cleanPrice, 4)}</td>
      <td style={{ ...nb, color: 'var(--tx2)' }}>{fN(r.accrued, 4)}</td>
      <td style={{ ...nb, color: 'var(--tx2)' }}>{fN(r.lastWapDirty, 4)}</td>
      <td style={{ ...nb }}>{fN(r.dirtyMarket, 4)}</td>
      <td style={{ ...nb, color: pnlColor(r.pnlLatentCcy) }}>{fN(r.pnlLatentCcy, 0)}</td>
      <td style={{ ...nb, color: pnlColor(r.pnlRealizedCcy) }}>{fN(r.pnlRealizedCcy, 0)}</td>
      <td style={{ ...nb, color: 'var(--cyan)' }}>{fN(r.couponsCcy, 0)}</td>
      <td style={{ ...nb, color: pnlColor((parseFloat(r.pnlLatentCcy || 0) + parseFloat(r.pnlRealizedCcy || 0) + parseFloat(r.couponsCcy || 0))), fontWeight: 600 }}>
        {fN(parseFloat(r.pnlLatentCcy || 0) + parseFloat(r.pnlRealizedCcy || 0) + parseFloat(r.couponsCcy || 0), 0)}
      </td>
      <td style={{ ...nb, color: pnlColor(r.pnlAccountingMad) }}>{fMAD(r.pnlAccountingMad)}</td>
      <td style={{ ...nb, color: 'var(--warn)' }}>{fMAD(r.fundingCostMad)}</td>
      <td style={{ ...nb, color: pnlColor(r.pnlEconomicMad), fontWeight: 700 }}>{fMAD(r.pnlEconomicMad)}</td>
      <td style={{ ...nb, color: '#60A5FA' }}>{fMAD(r.cpnThetaMad)}</td>
      <td style={{ ...nb, color: 'var(--tx2)' }}>{fMAD(r.dailyFundingMad)}</td>
      <td style={{ ...nb, color: pnlColor(r.netDailyMad), fontWeight: 600 }}>{fMAD(r.netDailyMad)}</td>
      <td style={{ ...nb, color: '#FCD34D' }}>{fN(r.gSpreadBid, 1)}</td>
      <td style={{ ...nb, color: '#FCD34D' }}>{fN(r.gSpreadMid, 1)}</td>
      <td style={{ ...nb, color: 'var(--tx2)' }}>{fN(r.targetSpread, 1)}</td>
      <td style={{ ...td, textAlign: 'center' }}><Signal row={r} /></td>
      <td style={{ ...nb, color: '#C084FC' }}>{fN(r.modifiedDuration, 2)}</td>
      <td style={{ ...nb, color: '#60A5FA' }}>{fN(r.dv01Bond, 0)}</td>
      <td style={{ ...td, fontFamily: 'var(--f-body)', fontSize: '0.67rem', color: 'var(--tx3)' }}>{r.hedgeFuture || '—'}</td>
      <td style={{ ...nb, color: 'var(--tx2)' }}>{r.nbContractsToHedge || '—'}</td>
    </tr>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
const EuroBondView = () => {
  const { dashboardRows, loading, refresh, selectedDate, globalDashboard } = useTrading();
  const [search,    setSearch]    = useState('');
  const [filterSub, setFilterSub] = useState('ALL');
  const [filterCcy, setFilterCcy] = useState('ALL');
  const [sortKey,   setSortKey]   = useState(null);
  const [sortDir,   setSortDir]   = useState('desc');

  const handleSort = useCallback((key) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; }
      setSortDir('desc'); return key;
    });
  }, []);

  const currencies = useMemo(() => [...new Set(dashboardRows.map(r => r.currency).filter(Boolean))], [dashboardRows]);
  const subAssets  = useMemo(() => [...new Set(dashboardRows.map(r => r.subAsset).filter(Boolean))], [dashboardRows]);

  const filtered = useMemo(() => dashboardRows.filter(r => {
    const q = search.toLowerCase();
    return (!q || r.isin?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
      && (filterCcy === 'ALL' || r.currency === filterCcy)
      && (filterSub === 'ALL' || r.subAsset === filterSub);
  }), [dashboardRows, search, filterCcy, filterSub]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const na = parseFloat(a[sortKey]), nb = parseFloat(b[sortKey]);
      if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;
      return sortDir === 'asc'
        ? String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''))
        : String(b[sortKey] ?? '').localeCompare(String(a[sortKey] ?? ''));
    });
  }, [filtered, sortKey, sortDir]);

  const totals = useMemo(() => sorted.reduce((acc, r) => ({
    nominal:    acc.nominal    + parseFloat(r.netNominal || 0),
    pnlEco:     acc.pnlEco    + parseFloat(r.pnlEconomicMad || 0),
    pnlAcct:    acc.pnlAcct   + parseFloat(r.pnlAccountingMad || 0),
    netDaily:   acc.netDaily  + parseFloat(r.netDailyMad || 0),
    dv01:       acc.dv01      + parseFloat(r.dv01Bond || 0),
  }), { nominal: 0, pnlEco: 0, pnlAcct: 0, netDaily: 0, dv01: 0 }), [sorted]);

  const fCompact = (v) => {
    if (!v) return '—'; const n = parseFloat(v); if (isNaN(n)) return '—';
    const a = Math.abs(n), s = n >= 0 ? '+' : '−';
    if (a >= 1e6) return `${s}${(Math.abs(n) / 1e6).toFixed(2)}M`;
    return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  };

  const exportCsv = () => {
    const BOM = '﻿'; // UTF-8 BOM — required for Excel to handle accented chars correctly
    const TEXT_KEYS = new Set(['isin', 'description', 'subAsset', 'maturityDate', 'currency', 'decision', 'hedgeFuture']);
    const esc = v => {
      const s = String(v ?? '');
      return (s.includes(';') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = COLS.map(c => esc(c.label)).join(';');
    const csvRows = sorted.map(r =>
      COLS.map(c => {
        const v = r[c.key];
        if (v == null || v === '') return '';
        if (!TEXT_KEYS.has(c.key)) {
          const n = parseFloat(v);
          if (!isNaN(n)) return String(n);
        }
        return esc(String(v));
      }).join(';')
    ).join('\n');
    const blob = new Blob([`${BOM}${headers}\n${csvRows}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eurobonds_${selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--void)' }}>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--void)', borderBottom: '1px solid var(--b1)',
        padding: '10px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
              Market Watch — EuroBonds
            </h2>
            <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.64rem', color: 'var(--tx3)', marginTop: 2 }}>
              {COLS.length} colonnes Bloomberg · {sorted.length} ISIN
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={exportCsv} className="btn btn-ghost btn-sm">
              <Download size={11} />Export CSV
            </button>
            <button onClick={refresh} disabled={loading} className="btn btn-ghost btn-sm">
              <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher ISIN ou description…"
              style={{
                background: 'var(--surf)', border: '1px solid var(--b1)', borderRadius: 6,
                padding: '5px 10px 5px 28px', color: 'var(--tx1)',
                fontFamily: 'var(--f-body)', fontSize: '0.72rem', outline: 'none', width: 220,
              }}
            />
          </div>

          {/* Sub-asset pills */}
          {['ALL', ...subAssets].map(s => (
            <button key={s} onClick={() => setFilterSub(s)}
              className={`badge ${filterSub === s ? 'badge-live' : 'badge-closed'}`}
              style={{ cursor: 'pointer', border: 'none' }}>
              {s === 'ALL' ? 'Tous' : s}
            </button>
          ))}

          {/* Currency filter */}
          {currencies.length > 1 && (
            <select value={filterCcy} onChange={e => setFilterCcy(e.target.value)} className="select">
              <option value="ALL">Toutes devises</option>
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.65rem', color: 'var(--tx3)', marginLeft: 'auto' }}>
            {sorted.length} / {dashboardRows.length} ISIN
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto', padding: '0' }}>
        <table className="dtable">
          {/* Group headers */}
          <thead>
            <tr style={{ background: 'var(--grphdr-bg)' }}>
              {GROUPS.map((g, i) => (
                <th key={i} colSpan={g.span} style={{
                  padding: '5px 10px', textAlign: 'center',
                  borderBottom: 'none',
                  borderRight: i < GROUPS.length - 1 ? '1px solid var(--b1)' : 'none',
                  fontFamily: 'var(--f-disp)', fontSize: '0.55rem', fontWeight: 800,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: g.color,
                  background: 'var(--grphdr-bg)',
                  cursor: 'default',
                }}>
                  {g.label}
                </th>
              ))}
            </tr>
            {/* Column headers */}
            <tr>
              {COLS.map((col) => (
                <th key={col.key}
                  onClick={() => !col.noSort && handleSort(col.key)}
                  style={{
                    textAlign: col.right ? 'right' : 'left',
                    cursor: col.noSort ? 'default' : 'pointer',
                    color: sortKey === col.key ? 'var(--cyan)' : 'var(--tx3)',
                    ...(col.star ? { color: sortKey === col.key ? 'var(--profit)' : '#3E7A5E' } : {}),
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: col.right ? 'flex-end' : 'flex-start', gap: 2 }}>
                    {col.label}
                    {!col.noSort && <SortIcon active={sortKey === col.key} dir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sorted.map((r, idx) => <Row key={r.isin} r={r} idx={idx} />)}
          </tbody>

          {sorted.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2} style={{ textAlign: 'left', fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.60rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx3)' }}>
                  Total <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--cyan)' }}>({sorted.length})</span>
                </td>
                <td colSpan={4} />
                <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: 'var(--tx1)', fontWeight: 600 }}>
                  {(totals.nominal / 1e6).toFixed(1)}<span style={{ color: 'var(--tx3)', fontSize: '0.58rem', marginLeft: 1 }}>M</span>
                </td>
                <td colSpan={7} />
                <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: pnlColor(totals.pnlAcct), fontWeight: 600 }}>
                  {fCompact(totals.pnlAcct)}
                </td>
                <td />
                <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: pnlColor(totals.pnlEco), fontWeight: 700 }}>
                  {fCompact(totals.pnlEco)}
                </td>
                <td />
                <td />
                <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: pnlColor(totals.netDaily), fontWeight: 600 }}>
                  {fCompact(totals.netDaily)}
                </td>
                <td colSpan={5} />
                <td />
                <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', color: '#60A5FA' }}>
                  {totals.dv01.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {sorted.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--tx3)' }}>
          <AlertTriangle size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.78rem' }}>
            Aucune donnée pour le {selectedDate}
          </p>
        </div>
      )}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--b1)', borderTopColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default EuroBondView;
