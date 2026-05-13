// src/components/Admin/AdminDashboard.jsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import TraderManager from './TraderManager';
import InstrumentManager from './InstrumentManager';
import TraderLimits from './TraderLimits';
import {
  Users, Briefcase, DollarSign, LogOut,
  Settings, RefreshCw, AlertTriangle, X,
} from 'lucide-react';

const TABS = [
  { id: 'traders',     label: 'Gestion Traders',    icon: Users,     accent: 'var(--cyan)'   },
  { id: 'instruments', label: 'Instruments',         icon: Briefcase, accent: 'var(--eb)'    },
  { id: 'limits',      label: 'Limites Trading',     icon: DollarSign,accent: 'var(--profit)' },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('traders');
  const { user, logout } = useAuth();
  const { traders, instruments, loading, error, refreshData, clearError } = useAdmin();

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.id === 'traders'   ? TraderManager
                        : TABS.find(t => t.id === activeTab)?.id === 'instruments' ? InstrumentManager
                        : TraderLimits;

  const initial = (user?.firstName || user?.username || user?.name || 'A')[0].toUpperCase();
  const activeAccent = TABS.find(t => t.id === activeTab)?.accent || 'var(--cyan)';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', color: 'var(--tx1)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top Bar ── */}
      <div style={{
        background: 'var(--base)', borderBottom: '1px solid var(--b1)',
        padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/attijariwafa-logo.png" alt="" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
          <div>
            <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
              Administration
            </div>
            <div style={{ fontFamily: 'var(--f-body)', fontSize: '0.60rem', color: 'var(--tx3)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Desk International · Fixed Income
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'var(--elev)', border: '1px solid var(--b1)' }}>
            <Settings size={11} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.60rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cyan)' }}>
              Admin
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(0,202,255,0.20) 0%, rgba(30,127,255,0.30) 100%)',
              border: '1px solid var(--b2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.78rem', color: 'var(--cyan)',
            }}>
              {initial}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--f-body)', fontWeight: 500, fontSize: '0.72rem', color: 'var(--tx1)', lineHeight: 1.2 }}>
                {user?.firstName || user?.name || user?.username || 'Administrateur'}
              </div>
              <div style={{ fontFamily: 'var(--f-disp)', fontSize: '0.56rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tx3)' }}>
                {user?.email || ''}
              </div>
            </div>
          </div>

          <button onClick={refreshData} disabled={loading} className="btn btn-ghost btn-sm">
            <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={logout} className="btn btn-ghost btn-sm" title="Déconnexion"
            style={{ color: 'var(--tx3)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--loss)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--tx3)'}>
            <LogOut size={13} />
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 24px', background: 'rgba(255,43,96,0.08)',
          borderBottom: '1px solid rgba(255,43,96,0.22)',
        }}>
          <AlertTriangle size={13} style={{ color: 'var(--loss)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.72rem', color: 'var(--loss)', flex: 1 }}>{error}</span>
          <button onClick={clearError} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)' }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Stats row ── */}
      <div style={{ padding: '12px 24px 0', display: 'flex', gap: 10 }}>
        {[
          { label: 'Traders actifs',  value: traders.filter(t => t.status === 'ACTIF' || t.status === 'active').length, color: 'var(--profit)' },
          { label: 'Total traders',   value: traders.length, color: 'var(--cyan)' },
          { label: 'EuroBonds',       value: instruments.eurobonds?.length || 0, color: 'var(--eb)' },
          { label: 'CLN',             value: instruments.cln?.length || 0,       color: 'var(--cln)' },
          { label: 'EGP Bills',       value: instruments.egp?.length || 0,       color: 'var(--egp)' },
        ].map(s => (
          <div key={s.label} className="card slide-up" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: '1.25rem', color: s.color, lineHeight: 1 }}>
              {s.value}
            </span>
            <span className="lbl" style={{ marginBottom: 0 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Tab navigation ── */}
      <div style={{ padding: '12px 24px 0', display: 'flex', gap: 4 }}>
        {TABS.map(({ id, label, icon: Icon, accent }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: '8px 8px 0 0',
                border: '1px solid',
                borderColor: isActive ? 'var(--b2)' : 'transparent',
                borderBottom: isActive ? '1px solid var(--base)' : '1px solid var(--b1)',
                background: isActive ? 'var(--base)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.14s',
                marginBottom: isActive ? -1 : 0,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surf)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon size={13} style={{ color: isActive ? accent : 'var(--tx3)' }} />
              <span style={{
                fontFamily: 'var(--f-disp)', fontWeight: 600, fontSize: '0.68rem',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: isActive ? 'var(--tx1)' : 'var(--tx2)',
              }}>
                {label}
              </span>
              {isActive && (
                <span style={{ width: 30, height: 2, background: accent, position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', borderRadius: 1 }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab border line ── */}
      <div style={{ borderBottom: '1px solid var(--b1)', marginLeft: 24, marginRight: 24 }} />

      {/* ── Active tab content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--void)' }}>
        {loading && !traders.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 14 }}>
            <div style={{ width: 36, height: 36, border: '2px solid var(--b1)', borderTopColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontFamily: 'var(--f-disp)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx3)' }}>
              Chargement…
            </p>
          </div>
        ) : (
          <ActiveComponent />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminDashboard;
