// src/components/Admin/AuditLogView.jsx
import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { RefreshCw, Search, FileText, Pencil, Trash2, Upload } from 'lucide-react';

const ACTION_META = {
  INSERT: { label: 'Création',    color: 'var(--profit)', icon: FileText  },
  UPDATE: { label: 'Modification',color: 'var(--cyan)',   icon: Pencil    },
  DELETE: { label: 'Suppression', color: 'var(--loss)',   icon: Trash2    },
  IMPORT: { label: 'Import CSV',  color: 'var(--warn)',   icon: Upload    },
};

const fDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

const AuditLogView = () => {
  const { auditLog, loading, refreshData } = useAdmin();
  const [search, setSearch] = useState('');

  const filtered = auditLog.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (e.username || '').toLowerCase().includes(s) ||
      (e.tableName || '').toLowerCase().includes(s) ||
      (e.action    || '').toLowerCase().includes(s) ||
      String(e.recordId || '').includes(s)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.80rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
            Journal d'Audit
          </h3>
          <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.68rem', color: 'var(--tx3)', marginTop: 3 }}>
            {filtered.length} entrée{filtered.length !== 1 ? 's' : ''} — toutes les opérations traçables
          </p>
        </div>
        <button onClick={refreshData} disabled={loading} className="btn btn-ghost btn-sm">
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 320 }}>
        <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Filtrer par utilisateur, table, action…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input"
          style={{ paddingLeft: 30, width: '100%', fontFamily: 'var(--f-body)', fontSize: '0.72rem' }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surf)', borderBottom: '1px solid var(--b1)' }}>
              {['Date', 'Utilisateur', 'Action', 'Table', 'ID', 'Détails'].map(h => (
                <th key={h} style={{
                  padding: '9px 14px', textAlign: 'left',
                  fontFamily: 'var(--f-disp)', fontSize: '0.60rem', fontWeight: 700,
                  letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx3)',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '24px 14px', textAlign: 'center', fontFamily: 'var(--f-body)', fontSize: '0.72rem', color: 'var(--tx3)' }}>
                  {loading ? 'Chargement…' : 'Aucune entrée d\'audit disponible.'}
                </td>
              </tr>
            )}
            {filtered.map((entry, i) => {
              const meta = ACTION_META[entry.action] || { label: entry.action, color: 'var(--tx2)', icon: FileText };
              const Icon = meta.icon;
              const details = entry.details ? JSON.stringify(entry.details) : null;
              return (
                <tr key={entry.id || i} style={{
                  borderBottom: '1px solid var(--b1)',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surf)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--f-mono)', fontSize: '0.66rem', color: 'var(--tx3)', whiteSpace: 'nowrap' }}>
                    {fDate(entry.createdAt)}
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{
                      fontFamily: 'var(--f-mono)', fontSize: '0.70rem', fontWeight: 600, color: 'var(--cyan)',
                    }}>{entry.username || '—'}</span>
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '2px 8px', borderRadius: 4,
                      background: `${meta.color}18`,
                      border: `1px solid ${meta.color}40`,
                    }}>
                      <Icon size={10} style={{ color: meta.color }} />
                      <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: meta.color }}>
                        {meta.label}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--f-mono)', fontSize: '0.68rem', color: 'var(--tx2)' }}>
                    {entry.tableName || '—'}
                  </td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--f-mono)', fontSize: '0.66rem', color: 'var(--tx3)' }}>
                    {entry.recordId ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px', maxWidth: 260, overflow: 'hidden' }}>
                    {details ? (
                      <span style={{
                        fontFamily: 'var(--f-mono)', fontSize: '0.60rem', color: 'var(--tx3)',
                        display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }} title={details}>
                        {details}
                      </span>
                    ) : <span style={{ color: 'var(--tx3)' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AuditLogView;
