import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Lock, AlertCircle, User, ArrowRight, Activity, Shield } from 'lucide-react';

const FEATURES = [
  ['Dashboard P&L Global', 'Économique · Comptable · Daily'],
  ['Market Watch Bloomberg', '28 colonnes · Pricing live SSE'],
  ['Risk & Analytics', 'DV01 · Duration · Signaux Hedge'],
  ['Trade Blotter', 'Import CSV · Historique complet'],
];

const LoginForm = () => {
  const { login, loading, error, clearError, loginAsAdmin, loginAsTrader } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (!document.getElementById('__login-spin')) {
      const s = document.createElement('style');
      s.id = '__login-spin';
      s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(s);
    }
  }, []);

  const onChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    if (error) clearError();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try { await login(form.username, form.password); } catch (_) {}
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--void)' }}>

      {/* ── LEFT PANEL — Branding ── */}
      <div style={{
        display: 'none',
        position: 'relative',
        flexDirection: 'column',
        background: 'linear-gradient(145deg, #050F1E 0%, #091F38 60%, #081829 100%)',
        borderRight: '1px solid var(--b1)',
      }} className="lg:flex lg:w-[44%]">

        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.5,
          backgroundImage: 'linear-gradient(var(--b0) 1px, transparent 1px), linear-gradient(90deg, var(--b0) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          pointerEvents: 'none',
        }} />

        {/* Ambient glows */}
        <div style={{
          position: 'absolute', top: '28%', left: '18%',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,202,255,0.04) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '22%', right: '12%',
          width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,232,153,0.03) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '3rem 3.5rem' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/attijariwafa-logo.png" alt="Attijariwafa Bank" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
            <div>
              <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
                Attijariwafa Bank
              </div>
              <div style={{ fontFamily: 'var(--f-body)', fontSize: '0.64rem', color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Fixed Income — Desk International
              </div>
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

            {/* Status chip */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 999, marginBottom: '2rem',
              background: 'rgba(0,232,153,0.08)',
              border: '1px solid rgba(0,232,153,0.20)',
              width: 'fit-content',
            }}>
              <span className="live-dot" />
              <span style={{ fontFamily: 'var(--f-disp)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--profit)' }}>
                Système Opérationnel
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: 'var(--f-disp)', fontWeight: 800,
              fontSize: '2.5rem', lineHeight: 1.12,
              color: 'var(--tx1)', marginBottom: '1.25rem',
            }}>
              International<br />
              <span style={{ color: 'var(--cyan)' }} className="glow-cyan">Trading</span> Desk
            </h1>

            <p style={{
              fontFamily: 'var(--f-body)', fontSize: '0.84rem',
              color: 'var(--tx2)', lineHeight: 1.75, maxWidth: 320, marginBottom: '2.5rem',
            }}>
              Plateforme institutionnelle de gestion de portefeuille obligataire.
              Eurobonds · CLN · EGP Bills · Futures.
            </p>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {FEATURES.map(([title, sub]) => (
                <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--cyan)', flexShrink: 0, marginTop: 6,
                  }} />
                  <div>
                    <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 600, fontSize: '0.74rem', color: 'var(--tx1)', letterSpacing: '0.03em' }}>
                      {title}
                    </div>
                    <div style={{ fontFamily: 'var(--f-body)', fontSize: '0.70rem', color: 'var(--tx3)', marginTop: 2 }}>
                      {sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.60rem', color: 'var(--tx3)' }}>
              © 2025 Attijariwafa Bank — Confidentiel
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={11} style={{ color: 'var(--tx3)' }} />
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.60rem', color: 'var(--tx3)' }}>v2.1.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem', background: 'var(--base)',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }} className="slide-up">

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2.5rem' }}>
            <img src="/attijariwafa-logo.png" alt="" style={{ height: 32, width: 'auto' }} />
            <div>
              <div style={{ fontFamily: 'var(--f-disp)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--tx1)' }}>
                Attijariwafa Bank
              </div>
              <div style={{ fontFamily: 'var(--f-body)', fontSize: '0.64rem', color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Fixed Income
              </div>
            </div>
          </div>

          {/* Icon */}
          <div style={{
            width: 46, height: 46, borderRadius: 12, marginBottom: '1.5rem',
            background: 'rgba(0,202,255,0.10)',
            border: '1px solid rgba(0,202,255,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={22} style={{ color: 'var(--cyan)' }} />
          </div>

          {/* Header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontFamily: 'var(--f-disp)', fontWeight: 800, fontSize: '1.55rem', color: 'var(--tx1)', marginBottom: '0.4rem', lineHeight: 1.2 }}>
              Connexion
            </h2>
            <p style={{ fontFamily: 'var(--f-body)', fontSize: '0.82rem', color: 'var(--tx2)' }}>
              Accès réservé aux utilisateurs autorisés
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 8, marginBottom: 20,
              background: 'rgba(255,43,96,0.10)', border: '1px solid rgba(255,43,96,0.28)',
            }}>
              <AlertCircle size={14} style={{ color: 'var(--loss)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.78rem', color: 'var(--loss)' }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label className="lbl" style={{ display: 'block', marginBottom: 7 }}>Identifiant</label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }} />
                <input
                  className="field"
                  style={{ paddingLeft: 36, fontFamily: 'var(--f-mono)', fontSize: '0.84rem' }}
                  name="username" value={form.username} onChange={onChange}
                  placeholder="nom.prenom" autoComplete="username" required
                />
              </div>
            </div>

            <div>
              <label className="lbl" style={{ display: 'block', marginBottom: 7 }}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }} />
                <input
                  className="field"
                  style={{ paddingLeft: 36, paddingRight: 42, fontFamily: 'var(--f-mono)', letterSpacing: '0.12em', fontSize: '0.84rem' }}
                  name="password" type={showPwd ? 'text' : 'password'}
                  value={form.password} onChange={onChange}
                  placeholder="••••••••" autoComplete="current-password" required
                />
                <button type="button" onClick={() => setShowPwd(p => !p)} style={{
                  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--tx3)', display: 'flex', alignItems: 'center', padding: 0,
                }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', marginTop: 4, fontSize: '0.72rem' }}>
              {loading ? (
                <>
                  <span style={{
                    width: 14, height: 14,
                    border: '2px solid rgba(0,0,0,0.25)',
                    borderTop: '2px solid var(--void)',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Authentification…
                </>
              ) : (
                <>Se connecter <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          {/* Dev quick access */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--b1)' }}>
            <p className="lbl" style={{ textAlign: 'center', marginBottom: 10 }}>Accès rapide — développement</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={loginAsTrader} className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }}>
                Trader
              </button>
              <button onClick={loginAsAdmin} className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }}>
                Admin
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginForm;

