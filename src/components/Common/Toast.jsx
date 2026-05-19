import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error:   XCircle,
};
const COLORS = {
  success: { bg: 'rgba(0,232,153,0.10)', border: 'rgba(0,232,153,0.28)', icon: 'var(--profit)', bar: 'var(--profit)' },
  warning: { bg: 'rgba(255,165,0,0.10)',  border: 'rgba(255,165,0,0.28)',  icon: 'var(--warn)',   bar: 'var(--warn)'   },
  error:   { bg: 'rgba(255,43,96,0.10)',  border: 'rgba(255,43,96,0.28)',  icon: 'var(--loss)',   bar: 'var(--loss)'   },
};

let _toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast: t, dismiss }) => {
  const [progress, setProgress] = useState(100);
  const c = COLORS[t.type] || COLORS.success;
  const Icon = ICONS[t.type] || CheckCircle;

  useEffect(() => {
    if (t.duration <= 0) return;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / t.duration) * 100);
      setProgress(pct);
      if (pct === 0) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [t.duration]);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 14px', borderRadius: 8, position: 'relative', overflow: 'hidden',
      background: c.bg, border: `1px solid ${c.border}`,
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      minWidth: 280, maxWidth: 380,
      animation: 'toast-in 0.2s ease',
    }}>
      <Icon size={15} style={{ color: c.icon, flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontFamily: 'var(--f-body)', fontSize: '0.76rem', color: 'var(--tx1)', flex: 1, lineHeight: 1.4 }}>
        {t.message}
      </span>
      <button onClick={() => dismiss(t.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--tx3)', padding: 0, display: 'flex', flexShrink: 0,
      }}>
        <X size={13} />
      </button>
      {t.duration > 0 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, height: 2,
          width: `${progress}%`, background: c.bar,
          transition: 'width 40ms linear', borderRadius: '0 0 0 8px',
        }} />
      )}
    </div>
  );
};

const ToastContainer = ({ toasts, dismiss }) => (
  <>
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <ToastItem toast={t} dismiss={dismiss} />
        </div>
      ))}
    </div>
    <style>{`
      @keyframes toast-in {
        from { opacity: 0; transform: translateX(24px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `}</style>
  </>
);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};

export default ToastProvider;
