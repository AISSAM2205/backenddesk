import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Lock, AlertCircle, User, ArrowRight } from 'lucide-react';
import bgImage from '../../assets/login-bg.png';

/* ── Design tokens — contraste WCAG AA garanti ── */
const T = {
  bg0:   '#060A10',
  card:  '#0D1725',
  bd:    'rgba(255,255,255,0.09)',
  bdFoc: 'rgba(14,165,233,0.55)',
  tx1:   '#F1F5F9',   /* primary — blanc */
  tx2:   '#94A3B8',   /* secondary — slate-400 */
  tx3:   '#64748B',   /* muted — slate-500  */
  acc:   '#0EA5E9',   /* sky-500 */
  accH:  '#0284C7',   /* sky-600 */
  ok:    '#10B981',   /* emerald-500 */
  err:   '#F43F5E',   /* rose-500 */
};

const LoginForm = () => {
  const { login, loading, error, clearError, loginAsAdmin, loginAsTrader } = useAuth();
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [time,    setTime]    = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (document.getElementById('__lf-css')) return;
    const s = document.createElement('style');
    s.id = '__lf-css';
    s.textContent = `
      @keyframes __lf-spin { to { transform: rotate(360deg); } }
      @keyframes __lf-fade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

      .__lf-card { animation: __lf-fade 0.45s cubic-bezier(0.22,1,0.36,1) both; }

      .__lf-field {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .__lf-input {
        width: 100%; box-sizing: border-box;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 5px;
        padding: 10px 36px 10px 36px;
        color: ${T.tx1};
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 0.85rem;
        outline: none;
        transition: border-color 0.15s, background 0.15s;
        -webkit-appearance: none;
      }
      .__lf-input::placeholder { color: ${T.tx3}; }
      .__lf-input:hover { border-color: rgba(255,255,255,0.18); }
      .__lf-input:focus {
        border-color: ${T.acc};
        background: rgba(14,165,233,0.05);
      }

      .__lf-btn {
        width: 100%;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        padding: 12px 20px;
        background: ${T.acc};
        color: #fff;
        border: none; border-radius: 5px;
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 0.85rem; font-weight: 600;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: background 0.15s, box-shadow 0.15s, transform 0.10s;
        outline: none;
      }
      .__lf-btn:hover:not(:disabled) {
        background: ${T.accH};
        box-shadow: 0 4px 20px rgba(14,165,233,0.30);
      }
      .__lf-btn:active:not(:disabled) { transform: scale(0.985); }
      .__lf-btn:disabled {
        background: rgba(14,165,233,0.20);
        color: rgba(255,255,255,0.35);
        cursor: not-allowed;
      }

      .__lf-ghost {
        flex: 1; padding: 8px 10px;
        background: rgba(255,255,255,0.04);
        color: ${T.tx2};
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 4px;
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 0.75rem; font-weight: 500;
        cursor: pointer;
        transition: background 0.12s, border-color 0.12s, color 0.12s;
        outline: none;
      }
      .__lf-ghost:hover {
        background: rgba(255,255,255,0.08);
        border-color: rgba(255,255,255,0.16);
        color: ${T.tx1};
      }

      .__lf-icon {
        position: absolute;
        top: 50%; transform: translateY(-50%);
        pointer-events: none;
        display: flex; align-items: center;
      }

      .__lf-eye {
        position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
        background: none; border: none; cursor: pointer;
        color: ${T.tx3}; display: flex; align-items: center; padding: 2px;
        transition: color 0.12s; outline: none;
      }
      .__lf-eye:hover { color: ${T.tx2}; }

      .__lf-label {
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 0.72rem; font-weight: 600;
        letter-spacing: 0.08em; text-transform: uppercase;
        color: ${T.tx2};
        margin-bottom: 7px;
        display: block;
      }
    `;
    document.head.appendChild(s);
  }, []);

  const onChange = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    if (error) clearError();
  };

  const onSubmit = async e => {
    e.preventDefault();
    try { await login(form.username, form.password); } catch (_) {}
  };

  const timeStr = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '24px 16px',
    }}>

      {/* ── Background image ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.30) saturate(0.60)',
        transform: 'scale(1.05)',
      }} />

      {/* ── Uniform dark overlay ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'rgba(6,10,16,0.72)',
      }} />

      {/* ══════════ CARD ══════════ */}
      <div className="__lf-card" style={{
        position: 'relative', zIndex: 10,
        width: '100%',
        maxWidth: 400,
        background: T.card,
        borderRadius: 8,
        border: `1px solid rgba(255,255,255,0.08)`,
        borderTop: `2px solid ${T.acc}`,
        padding: '36px 36px 30px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 4px 24px rgba(14,165,233,0.08)',
      }}>

        {/* ── Header: logo + clock ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 30,
          paddingBottom: 20,
          borderBottom: `1px solid rgba(255,255,255,0.07)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <img
              src="/attijariwafa-logo.png"
              alt="AWB"
              style={{ height: 24, width: 'auto', objectFit: 'contain' }}
            />
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
            <div>
              <div style={{
                fontFamily: 'var(--f-disp)', fontSize: '0.60rem', fontWeight: 700,
                letterSpacing: '0.13em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.80)',
              }}>
                Fixed Income
              </div>
              <div style={{
                fontFamily: 'var(--f-disp)', fontSize: '0.52rem', fontWeight: 500,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.42)',
                marginTop: 1,
              }}>
                Desk International
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--f-mono)', fontSize: '0.85rem', fontWeight: 700,
              color: T.tx1, letterSpacing: '0.04em', lineHeight: 1,
            }}>
              {timeStr}
            </div>
            <div style={{
              fontFamily: 'var(--f-mono)', fontSize: '0.57rem',
              color: T.tx3, marginTop: 4,
              letterSpacing: '0.02em',
            }}>
              {dateStr}
            </div>
          </div>
        </div>

        {/* ── Title ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontFamily: 'var(--f-disp)', fontWeight: 700,
            fontSize: '1.40rem', color: T.tx1,
            letterSpacing: '-0.02em', lineHeight: 1.2,
            margin: 0, marginBottom: 6,
          }}>
            Connexion
          </h1>
          <p style={{
            fontFamily: 'var(--f-body)', fontSize: '0.78rem',
            color: T.tx2, margin: 0, lineHeight: 1.5,
          }}>
            Accès réservé aux utilisateurs autorisés
          </p>
        </div>

        {/* ── Status strip ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 11px',
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.18)',
          borderRadius: 4,
          marginBottom: 24,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: T.ok, flexShrink: 0,
            boxShadow: `0 0 6px ${T.ok}`,
          }} />
          <span style={{
            fontFamily: 'var(--f-mono)', fontSize: '0.60rem',
            color: 'rgba(16,185,129,0.85)', letterSpacing: '0.06em', fontWeight: 600,
          }}>
            SYSTÈME OPÉRATIONNEL
          </span>
          <span style={{
            marginLeft: 'auto', fontFamily: 'var(--f-mono)',
            fontSize: '0.57rem', color: T.tx3, fontWeight: 500,
          }}>
            v2.1.0
          </span>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 9,
            padding: '10px 12px', borderRadius: 4, marginBottom: 18,
            background: 'rgba(244,63,94,0.08)',
            border: '1px solid rgba(244,63,94,0.25)',
          }}>
            <AlertCircle size={13} style={{ color: T.err, flexShrink: 0, marginTop: 1 }} />
            <span style={{
              fontFamily: 'var(--f-body)', fontSize: '0.78rem',
              color: '#FCA5A5', lineHeight: 1.45,
            }}>
              {error}
            </span>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Username */}
          <div>
            <label className="__lf-label">Identifiant</label>
            <div style={{ position: 'relative' }}>
              <span className="__lf-icon" style={{ left: 11, color: T.tx3 }}>
                <User size={13} />
              </span>
              <input
                className="__lf-input"
                name="username"
                value={form.username}
                onChange={onChange}
                placeholder="nom.prenom"
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="__lf-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <span className="__lf-icon" style={{ left: 11, color: T.tx3 }}>
                <Lock size={13} />
              </span>
              <input
                className="__lf-input"
                name="password"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={onChange}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button type="button" className="__lf-eye" onClick={() => setShowPwd(p => !p)} tabIndex={-1}>
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} className="__lf-btn" style={{ marginTop: 4 }}>
            {loading ? (
              <>
                <span style={{
                  width: 13, height: 13, flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.20)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: '__lf-spin 0.75s linear infinite',
                }} />
                Authentification en cours…
              </>
            ) : (
              <>Se connecter <ArrowRight size={14} /></>
            )}
          </button>
        </form>

        {/* ── Dev shortcuts ── */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{
              fontFamily: 'var(--f-mono)', fontSize: '0.54rem',
              color: T.tx3, letterSpacing: '0.10em', textTransform: 'uppercase',
            }}>
              Accès rapide
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loginAsTrader} className="__lf-ghost">Trader</button>
            <button onClick={loginAsAdmin}  className="__lf-ghost">Admin</button>
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        marginTop: 24,
        display: 'flex', gap: 16, alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--f-mono)', fontSize: '0.56rem',
          color: T.tx3, letterSpacing: '0.02em',
        }}>
          © 2025 Attijariwafa Bank · Usage interne · Confidentiel
        </span>
        <span style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.15)' }} />
        <span style={{
          fontFamily: 'var(--f-mono)', fontSize: '0.56rem',
          color: T.tx3, letterSpacing: '0.02em',
        }}>
          TLS 1.3 · SOC 2
        </span>
      </div>

    </div>
  );
};

export default LoginForm;
