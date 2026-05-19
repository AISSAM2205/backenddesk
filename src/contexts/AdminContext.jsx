// src/contexts/AdminContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const AdminContext = createContext();

const initialState = {
  traders:         [],
  instruments:     { eurobonds: [], cln: [], egp: [] },
  portfolioLimits: [],   // all PortfolioLimit rows (EXPOSURE + TARGET)
  auditLog:        [],
  loading:         false,
  error:           null,
};

function adminReducer(state, action) {
  switch (action.type) {
    case 'SET_TRADERS':
      return { ...state, traders: action.payload };
    case 'SET_INSTRUMENTS':
      return { ...state, instruments: { ...state.instruments, [action.itype]: action.payload } };
    case 'SET_PORTFOLIO_LIMITS':
      return { ...state, portfolioLimits: action.payload };
    case 'SET_AUDIT':
      return { ...state, auditLog: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export const AdminProvider = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  const loadAdminData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    // ── Traders ──────────────────────────────────────────────────────
    try {
      const res = await api.admin.getTraders();
      dispatch({ type: 'SET_TRADERS', payload: res.data || [] });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Impossible de charger les traders.' });
    }

    // ── Instruments (3 types in parallel) ────────────────────────────
    await Promise.allSettled(
      ['eurobonds', 'cln', 'egp'].map(async (itype) => {
        try {
          const res = await api.admin.getInstruments(itype);
          dispatch({ type: 'SET_INSTRUMENTS', itype, payload: res.data || [] });
        } catch { /* backend absent for this type → leave empty */ }
      })
    );

    // ── Portfolio limits + annual targets ────────────────────────────
    try {
      const res = await api.admin.getPortfolioLimits();
      dispatch({ type: 'SET_PORTFOLIO_LIMITS', payload: res.data || [] });
    } catch { /* non-critical */ }

    // ── Audit log ────────────────────────────────────────────────────
    try {
      const res = await api.admin.getAuditLog();
      dispatch({ type: 'SET_AUDIT', payload: res.data || [] });
    } catch { /* non-critical */ }

    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      loadAdminData();
    }
  }, [isAuthenticated, user, loadAdminData]);

  // ── Trader CRUD ──────────────────────────────────────────────────

  const createTrader = async (traderData) => {
    const res = await api.admin.createTrader(traderData);
    await loadAdminData();
    return res.data;
  };

  const updateTrader = async (traderId, updates) => {
    await api.admin.updateTrader(traderId, updates);
    await loadAdminData();
  };

  const deleteTrader = async (traderId) => {
    await api.admin.deleteTrader(traderId);
    await loadAdminData();
  };

  const updateTraderLimits = async (traderId, limits) => {
    await api.admin.updateLimits(traderId, limits);
    localStorage.setItem(`trader_limits_${traderId}`, JSON.stringify(limits));
    window.dispatchEvent(new CustomEvent('traderLimitsUpdated', { detail: { traderId } }));
    dispatch({
      type: 'SET_TRADERS',
      payload: state.traders.map(t => t.id === traderId ? { ...t, limits } : t),
    });
  };

  // ── Instrument CRUD ──────────────────────────────────────────────

  const createInstrument = async (type, instrumentData) => {
    const subAsset = type === 'eurobonds' ? (instrumentData.currency === 'EUR' ? 'Mor Bond' : 'OCP Bond')
                   : type === 'cln'       ? `CLN ${instrumentData.region || 'MOROC'}`
                   :                         'EGP Bill';
    await api.admin.createInstrument({ ...instrumentData, subAsset });
    const res = await api.admin.getInstruments(type);
    dispatch({ type: 'SET_INSTRUMENTS', itype: type, payload: res.data || [] });
  };

  const updateInstrument = async (type, instrumentId, updates) => {
    await api.admin.updateInstrument(instrumentId, updates);
    const res = await api.admin.getInstruments(type);
    dispatch({ type: 'SET_INSTRUMENTS', itype: type, payload: res.data || [] });
  };

  const deleteInstrument = async (type, instrumentId) => {
    await api.admin.deleteInstrument(instrumentId);
    dispatch({
      type: 'SET_INSTRUMENTS',
      itype: type,
      payload: state.instruments[type].filter(i => (i.id || i.isin) !== instrumentId),
    });
  };

  // ── Portfolio limit update ────────────────────────────────────────

  const updatePortfolioLimit = async (id, dto) => {
    await api.admin.updatePortfolioLimit(id, dto);
    const res = await api.admin.getPortfolioLimits();
    dispatch({ type: 'SET_PORTFOLIO_LIMITS', payload: res.data || [] });
  };

  // ── Derived selectors ─────────────────────────────────────────────

  /** List of EXPOSURE-type limits (280M EUR, 50M USD…) */
  const exposureLimits = state.portfolioLimits.filter(l => l.limitType === 'EXPOSURE');

  /** List of TARGET-type limits (35M, 15M…) */
  const annualTargets = state.portfolioLimits.filter(l => l.limitType === 'TARGET');

  /** EUR exposure limit in absolute amount (for TickerBar default) */
  const eurExposureLimit = (() => {
    const eur = exposureLimits.find(l => l.currency === 'EUR');
    return eur ? parseFloat(eur.limitMeur) * 1e6 : 280e6;
  })();

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  const value = {
    ...state,
    exposureLimits,
    annualTargets,
    eurExposureLimit,
    createTrader,
    updateTrader,
    deleteTrader,
    updateTraderLimits,
    createInstrument,
    updateInstrument,
    deleteInstrument,
    updatePortfolioLimit,
    clearError,
    refreshData: loadAdminData,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

const EMPTY_ADMIN = {
  traders: [], instruments: { eurobonds: [], cln: [], egp: [] },
  portfolioLimits: [], auditLog: [], exposureLimits: [], annualTargets: [],
  eurExposureLimit: 280e6, loading: false, error: null,
  createTrader: () => {}, updateTrader: () => {}, deleteTrader: () => {},
  updateTraderLimits: () => {}, createInstrument: () => {}, updateInstrument: () => {},
  deleteInstrument: () => {}, updatePortfolioLimit: () => {},
  clearError: () => {}, refreshData: () => {},
};

export const useAdmin = () => useContext(AdminContext) || EMPTY_ADMIN;

export default AdminContext;
