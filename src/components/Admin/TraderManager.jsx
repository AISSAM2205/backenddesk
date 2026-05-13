// src/components/Admin/TraderManager.jsx
import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { Plus, Edit, Trash2, Save, X, User, Users, Shield } from 'lucide-react';

const PERMISSION_OPTS = [
  { key: 'ADMIN',           label: 'Admin',        color: 'badge-sell',   desc: 'Accès panneau admin' },
  { key: 'EUROBOND_ACCESS', label: 'EuroBonds',    color: 'badge-eb',     desc: 'Dashboard EuroBonds' },
  { key: 'CLN_ACCESS',      label: 'CLN',          color: 'badge-cln',    desc: 'Credit Linked Notes' },
  { key: 'EGP_ACCESS',      label: 'EGP Bills',    color: 'badge-egp',    desc: 'Bons du Trésor EGP' },
  { key: 'BLOTTER_ACCESS',  label: 'Blotter',      color: 'badge-active', desc: 'Trade Blotter & Historique' },
];

const DEPTS = ['FIXED_INCOME', 'MONEY_MARKET', 'FOREX', 'DERIVATIVES', 'MANAGEMENT'];

const statusBadge = (s) => {
  if (s === 'ACTIF' || s === 'active')   return 'badge-active';
  if (s === 'PREMIERE_CONNEXION')         return 'badge-warn';
  if (s === 'BLOQUE' || s === 'SUSPENDU') return 'badge-sell';
  return 'badge-closed';
};
const statusLabel = (s) => {
  if (s === 'ACTIF' || s === 'active')   return 'Actif';
  if (s === 'PREMIERE_CONNEXION')         return '1ère connexion';
  if (s === 'BLOQUE')                     return 'Bloqué';
  if (s === 'SUSPENDU')                   return 'Suspendu';
  if (s === 'INACTIF')                    return 'Inactif';
  return s || 'Inconnu';
};

const initForm = () => ({
  firstName: '', lastName: '', username: '', email: '',
  department: 'FIXED_INCOME', status: 'ACTIF', permissions: [],
});

const TraderManager = () => {
  const { traders, createTrader, updateTrader, deleteTrader } = useAdmin();
  const [editing, setEditing] = useState(null);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);

  const openAdd  = () => { setAdding(true); setEditing(null); setForm(initForm()); };
  const openEdit = (t) => { setEditing(t.id); setAdding(false); setForm({ ...t, permissions: t.permissions || [] }); };
  const cancel   = () => { setAdding(false); setEditing(null); setForm({}); };
  const set      = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const togglePerm = (p) => setForm(prev => ({
    ...prev,
    permissions: prev.permissions.includes(p)
      ? prev.permissions.filter(x => x !== p)
      : [...prev.permissions, p],
  }));

  const save = async () => {
    setSaving(true);
    try {
      adding ? await createTrader(form) : await updateTrader(editing, form);
      cancel();
    } finally { setSaving(false); }
  };

  const del = (t) => {
    if (window.confirm(`Supprimer ${t.firstName} ${t.lastName} ?`)) deleteTrader(t.id);
  };

  const showForm = adding || editing;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.80rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
            Gestion des Traders
          </h3>
          <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.68rem', color: 'var(--tx3)', marginTop: 3 }}>
            {traders.length} membre{traders.length !== 1 ? 's' : ''} — permissions et accès par section
          </p>
        </div>
        <button onClick={openAdd} className="btn btn-primary btn-sm">
          <Plus size={12} />Ajouter Trader
        </button>
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="card slide-up" style={{ padding: '20px', borderColor: 'var(--b2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h4 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
              {adding ? 'Nouveau Trader' : 'Modifier Trader'}
            </h4>
            <button onClick={cancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            {[
              ['Prénom *',    'firstName', 'text'],
              ['Nom *',       'lastName',  'text'],
              ['Identifiant *','username', 'text'],
              ['Email *',     'email',     'email'],
            ].map(([label, key, type]) => (
              <div key={key}>
                <label style={{ display: 'block', fontFamily: 'var(--f-disp)', fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--tx3)', marginBottom: 6 }}>
                  {label}
                </label>
                <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)}
                  className="field" style={{ padding: '8px 12px', fontSize: '0.78rem' }} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--f-disp)', fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--tx3)', marginBottom: 6 }}>
                Département
              </label>
              <select value={form.department || 'FIXED_INCOME'} onChange={e => set('department', e.target.value)} className="field select" style={{ padding: '8px 12px', fontSize: '0.78rem', width: '100%' }}>
                {DEPTS.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--f-disp)', fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--tx3)', marginBottom: 6 }}>
                Statut
              </label>
              <select value={form.status || 'ACTIF'} onChange={e => set('status', e.target.value)} className="field select" style={{ padding: '8px 12px', fontSize: '0.78rem', width: '100%' }}>
                <option value="ACTIF">Actif</option>
                <option value="INACTIF">Inactif</option>
                <option value="PREMIERE_CONNEXION">1ère connexion requise</option>
                <option value="BLOQUE">Bloqué</option>
              </select>
            </div>
          </div>

          {/* Permissions */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontFamily: 'var(--f-disp)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--tx3)', marginBottom: 10 }}>
              Accès Dashboard
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PERMISSION_OPTS.map(opt => {
                const active = (form.permissions || []).includes(opt.key);
                return (
                  <button key={opt.key} onClick={() => togglePerm(opt.key)}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 4,
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      border: '1px solid',
                      borderColor: active ? 'var(--b3)' : 'var(--b1)',
                      background: active ? 'var(--surf)' : 'var(--base)',
                      transition: 'all 0.14s',
                      minWidth: 110,
                    }}>
                    <span className={`badge ${active ? opt.color : 'badge-closed'}`} style={{ fontSize: '0.58rem' }}>
                      {opt.label}
                    </span>
                    <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.60rem', color: 'var(--tx3)', lineHeight: 1.3 }}>
                      {opt.desc}
                    </span>
                    {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--profit)', alignSelf: 'flex-end' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 14, borderTop: '1px solid var(--b1)' }}>
            <button onClick={cancel} disabled={saving} className="btn btn-ghost btn-sm">Annuler</button>
            <button onClick={save} disabled={saving || !form.firstName || !form.lastName || !form.username || !form.email} className="btn btn-primary btn-sm">
              {saving
                ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <Save size={12} />}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Traders table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={13} style={{ color: 'var(--cyan)' }} />
          <h4 style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
            Équipe Trading
          </h4>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.65rem', color: 'var(--tx3)', padding: '2px 7px', background: 'var(--elev)', borderRadius: 4, border: '1px solid var(--b1)' }}>
            {traders.length}
          </span>
        </div>

        {traders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--tx3)' }}>
            <User size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.78rem' }}>Aucun trader enregistré</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dtable">
              <thead>
                <tr>
                  {['Trader', 'Département', 'Permissions', 'Statut', 'Créé le', 'Actions'].map((h, i) => (
                    <th key={h} style={{ textAlign: i >= 4 ? 'center' : i >= 2 ? 'center' : 'left', cursor: 'default' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {traders.map((t, idx) => (
                  <tr key={t.id}
                    style={{ background: idx % 2 === 0 ? 'var(--tr-even-bg)' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--tr-hover-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'var(--tr-even-bg)' : 'transparent'}>
                    <td style={{ textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                          background: 'linear-gradient(135deg, rgba(0,202,255,0.15), rgba(30,127,255,0.25))',
                          border: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.70rem', color: 'var(--cyan)',
                        }}>
                          {((t.firstName || t.name || '?')[0]).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--f-body)', fontWeight: 500, fontSize: '0.73rem', color: 'var(--tx1)' }}>
                            {t.firstName ? `${t.firstName} ${t.lastName || ''}` : t.name || t.username}
                          </div>
                          <div style={{ fontFamily: 'var(--f-mono)', fontSize: '0.60rem', color: 'var(--tx3)' }}>
                            {t.email || t.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-eb" style={{ fontSize: '0.57rem' }}>
                        {(t.department || t.team || 'N/A').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
                        {(t.permissions || []).slice(0, 3).map(p => {
                          const opt = PERMISSION_OPTS.find(o => o.key === p);
                          return <span key={p} className={`badge ${opt?.color || 'badge-closed'}`} style={{ fontSize: '0.56rem' }}>{opt?.label || p.replace('_ACCESS', '')}</span>;
                        })}
                        {(t.permissions || []).length > 3 && (
                          <span className="badge badge-closed" style={{ fontSize: '0.56rem' }}>+{t.permissions.length - 3}</span>
                        )}
                        {!(t.permissions?.length) && (
                          <span className="badge badge-closed" style={{ fontSize: '0.56rem' }}>Aucun</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${statusBadge(t.status)}`} style={{ fontSize: '0.57rem' }}>
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: '0.65rem', color: 'var(--tx3)' }}>
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <button onClick={() => openEdit(t)} title="Modifier"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cyan)', padding: 5, borderRadius: 6, transition: 'background 0.14s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,202,255,0.10)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <Edit size={13} />
                        </button>
                        <button onClick={() => del(t)} title="Supprimer"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', padding: 5, borderRadius: 6, transition: 'all 0.14s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,43,96,0.10)'; e.currentTarget.style.color = 'var(--loss)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--tx3)'; }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TraderManager;
