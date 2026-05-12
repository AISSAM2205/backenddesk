import React from 'react';
import { useTrading } from '../../contexts/TradingContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, TrendingUp, BarChart2, BookOpen,
  Shield, Coins, LogOut, Wifi, WifiOff, Activity,
} from 'lucide-react';

const NAV = [
  { id: 'portfolio', label: 'Dashboard Global',   icon: LayoutDashboard, accent: 'var(--cyan)',   sub: 'Cockpit · P&L · Exposition' },
  { id: 'eurobonds', label: 'Market Watch',        icon: TrendingUp,      accent: 'var(--eb)',    sub: '28 colonnes · Bloomberg'    },
  { id: 'risk',      label: 'Pricing & Analytics', icon: BarChart2,       accent: '#9B3EEF',      sub: 'Carry · DV01 · Hedge'       },
  { id: 'futures',   label: 'Futures & Couv.',    icon: Activity,        accent: 'var(--fut)',   sub: 'Hedge Book · DV01'          },
  { id: 'blotter',   label: 'Trade Blotter',       icon: BookOpen,        accent: 'var(--profit)',sub: 'Saisie · Historique'        },
  { id: 'cln',       label: 'CLN',                 icon: Shield,          accent: '#9B3EEF',      sub: 'Credit Linked Notes'        },
  { id: 'egp',       label: 'EGP Bills',           icon: Coins,           accent: 'var(--egp)',   sub: 'Bons du Trésor Égypte'      },
];

const fCompact = (v) => {
  if (v == null) return null;
  const n = parseFloat(v); if (isNaN(n)) return null;
  const a = Math.abs(n);
  const sign = n >= 0 ? '+' : '−';
  if (a >= 1e9) return `${sign}${(Math.abs(n) / 1e9).toFixed(2)} Md`;
  if (a >= 1e6) return `${sign}${(Math.abs(n) / 1e6).toFixed(2)} M`;
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
};

const Sidebar = () => {
  const {
    activeInstrument, setActiveInstrument,
    dashboardRows, clnList, egpList,
    connectionStatus, globalDashboard,
  } = useTrading();
  const { user, logout } = useAuth();

  const alertCount = (dashboardRows || []).filter(r => r.netDailyAlert).length;
  const pnlEco     = parseFloat(globalDashboard?.totalPlEcoMad || 0);
  const pnlPos     = pnlEco >= 0;
  const pnlStr     = fCompact(pnlEco);

  const badgeCounts = {
    portfolio: alertCount || null,
    eurobonds: (dashboardRows || []).length || null,
    cln:       (clnList || []).length || null,
    egp:       (egpList || []).length || null,
  };

  const initial = (user?.firstName || user?.username || 'T')[0].toUpperCase();

  return (
    <aside style={{
      width: 222, flexShrink: 0,
      background: 'var(--base)',
      borderRight: '1px solid var(--b1)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflowY: 'auto',
    }}>

      {/* ── Brand ── */}
      <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid var(--b1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/attijariwafa-logo.png" alt="" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
          <div>
            <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)', lineHeight: 1.3 }}>
              Desk International
            </div>
            <div style={{ fontFamily: 'var(--f-body)', fontSize: '0.60rem', color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Fixed Income
            </div>
          </div>
        </div>
      </div>

      {/* ── P&L Summary Card ── */}
      {pnlStr && (
        <div style={{
          margin: '10px 10px 2px',
          padding: '10px 12px',
          borderRadius: 8,
          background: pnlPos ? 'rgba(0,232,153,0.06)' : 'rgba(255,43,96,0.06)',
          border: `1px solid ${pnlPos ? 'rgba(0,232,153,0.18)' : 'rgba(255,43,96,0.18)'}`,
        }}>
          <div className="lbl" style={{ marginBottom: 5 }}>P&L Économique</div>
          <div style={{
            fontFamily: 'var(--f-mono)', fontWeight: 600,
            fontSize: '1.15rem', lineHeight: 1,
            color: pnlPos ? 'var(--profit)' : 'var(--loss)',
          }} className={pnlPos ? 'glow-profit' : 'glow-loss'}>
            {pnlStr} <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.60rem', fontWeight: 600, opacity: 0.5 }}>MAD</span>
          </div>
          {alertCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <span className="live-dot live-dot-loss" style={{ width: 5, height: 5 }} />
              <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.58rem', fontWeight: 700, color: 'var(--loss)', letterSpacing: '0.06em' }}>
                {alertCount} carry négatif
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="lbl" style={{ padding: '6px 8px 8px', fontSize: '0.55rem', letterSpacing: '0.16em' }}>
          Navigation
        </div>

        {NAV.map(({ id, label, icon: Icon, accent, sub }) => {
          const isActive = activeInstrument === id;
          const badge    = badgeCounts[id];
          return (
            <button key={id} onClick={() => setActiveInstrument(id)}
              style={{
                position: 'relative', width: '100%', textAlign: 'left',
                padding: '9px 10px 9px 14px',
                borderRadius: 8,
                border: '1px solid',
                borderColor: isActive ? 'var(--b2)' : 'transparent',
                background: isActive ? 'var(--surf)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.14s',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--surf)'; e.currentTarget.style.borderColor = 'var(--b1)'; }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}}
            >
              {/* Active bar */}
              {isActive && (
                <span style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 22, borderRadius: '0 2px 2px 0',
                  background: accent,
                }} />
              )}

              <Icon size={14} style={{ color: isActive ? accent : 'var(--tx3)', flexShrink: 0, transition: 'color 0.14s' }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--f-disp)', fontWeight: 600,
                  fontSize: '0.70rem', letterSpacing: '0.02em',
                  color: isActive ? 'var(--tx1)' : 'var(--tx2)',
                  lineHeight: 1.3, transition: 'color 0.14s',
                }}>
                  {label}
                </div>
                <div style={{
                  fontFamily: 'var(--f-body)', fontSize: '0.60rem',
                  color: 'var(--tx3)', marginTop: 2, lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {sub}
                </div>
              </div>

              {badge && (
                <span style={{
                  flexShrink: 0, minWidth: 20, textAlign: 'center',
                  padding: '2px 6px', borderRadius: 99,
                  fontFamily: 'var(--f-mono)', fontSize: '0.60rem', fontWeight: 600,
                  background: id === 'portfolio' && alertCount > 0
                    ? 'rgba(255,43,96,0.15)'
                    : 'rgba(15,60,130,0.30)',
                  color: id === 'portfolio' && alertCount > 0
                    ? 'var(--loss)'
                    : 'var(--tx2)',
                  border: '1px solid',
                  borderColor: id === 'portfolio' && alertCount > 0
                    ? 'rgba(255,43,96,0.28)'
                    : 'var(--b1)',
                  animation: id === 'portfolio' && alertCount > 0 ? 'pulse-live 2s ease infinite' : 'none',
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--b1)', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Connection status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 7,
          background: connectionStatus === 'connected' ? 'rgba(0,232,153,0.06)' : 'rgba(15,60,130,0.15)',
          border: `1px solid ${connectionStatus === 'connected' ? 'rgba(0,232,153,0.18)' : 'var(--b1)'}`,
        }}>
          {connectionStatus === 'connected' ? (
            <>
              <span className="live-dot" style={{ width: 5, height: 5 }} />
              <Wifi size={12} style={{ color: 'var(--profit)' }} />
              <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--profit)' }}>
                SSE Live
              </span>
            </>
          ) : (
            <>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--tx3)', flexShrink: 0 }} />
              <WifiOff size={12} style={{ color: 'var(--tx3)' }} />
              <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--tx3)' }}>
                Déconnecté
              </span>
            </>
          )}
        </div>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,202,255,0.20) 0%, rgba(30,127,255,0.30) 100%)',
            border: '1px solid var(--b2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.78rem', color: 'var(--cyan)',
          }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--f-body)', fontWeight: 500, fontSize: '0.72rem',
              color: 'var(--tx1)', lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.firstName || user?.username || 'Trader'}
            </div>
            <div style={{
              fontFamily: 'var(--f-disp)', fontSize: '0.58rem', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tx3)', marginTop: 1,
            }}>
              {user?.role === 'admin' ? 'Administrateur' : 'Trader'}
            </div>
          </div>
          <button onClick={logout} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--tx3)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--loss)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--tx3)'}
            title="Déconnexion">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
