// src/contexts/GovernanceContext.jsx
// ─────────────────────────────────────────────────────────────────────────
// Source de vérité UNIQUE, côté trader, pour les paramètres de gouvernance
// pilotés par l'admin : limites d'exposition, objectifs annuels de P&L, et
// limite réglementaire propre au trader.
//
// Tous les écrans trader consomment useGovernance() → mêmes valeurs partout,
// mises à jour en direct quand l'admin édite (events + snapshot localStorage),
// repli propre sur governanceDefaults si le backend est absent. Aucune valeur
// de gouvernance ne doit plus être codée en dur dans les vues.
// ─────────────────────────────────────────────────────────────────────────
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";
import {
  PORTFOLIO_LIMITS_DEFAULT,
  DEFAULT_EUROBOND_LIMIT_EUR,
  LS_PORTFOLIO_LIMITS,
  traderLimitsKey,
  splitLimits,
  sumTargets,
} from "../config/governanceDefaults";

const GovernanceContext = createContext(null);

/* Snapshot localStorage des limites portefeuille (écrit par l'admin). */
const readLimitsSnapshot = () => {
  try {
    const raw = localStorage.getItem(LS_PORTFOLIO_LIMITS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
};

/* Limite eurobonds (valeur absolue EUR) du trader courant, ou null. */
const readTraderEurobondLimit = (userId) => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(traderLimitsKey(userId));
    if (!raw) return null;
    const val = parseFloat(JSON.parse(raw)?.eurobonds?.limit);
    return !isNaN(val) && val > 0 ? val : null;
  } catch {
    return null;
  }
};

export const GovernanceProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  // Limites portefeuille : backend > snapshot localStorage > défauts.
  const [rawLimits, setRawLimits] = useState(
    () => readLimitsSnapshot() || PORTFOLIO_LIMITS_DEFAULT,
  );
  // Limite réglementaire eurobonds propre au trader (valeur absolue EUR).
  const [traderLimitEur, setTraderLimitEur] = useState(() =>
    readTraderEurobondLimit(user?.id),
  );

  /* Chargement best-effort des limites depuis le backend (si disponible),
     avec repli immédiat sur le snapshot local le plus frais. */
  const loadPortfolioLimits = useCallback(() => {
    const snap = readLimitsSnapshot();
    if (snap) setRawLimits(snap);
    api.admin
      .getPortfolioLimits()
      .then((res) => {
        const rows = res.data || [];
        if (Array.isArray(rows) && rows.length) setRawLimits(rows);
        else if (!snap) setRawLimits(PORTFOLIO_LIMITS_DEFAULT);
      })
      .catch(() => {
        if (!snap) setRawLimits(PORTFOLIO_LIMITS_DEFAULT);
      });
  }, []);

  /* Charge à l'authentification + réagit aux éditions admin (limites desk).
     Deux canaux de propagation :
     - CustomEvent "portfolioLimitsUpdated" : même onglet (admin → trader même SPA)
     - StorageEvent "storage"               : onglets séparés (admin dans tab A,
       trader dans tab B) */
  useEffect(() => {
    if (!isAuthenticated) return;
    loadPortfolioLimits();
    const onLimits = () => loadPortfolioLimits();
    const onStorage = (e) => {
      if (e.key === LS_PORTFOLIO_LIMITS) loadPortfolioLimits();
    };
    window.addEventListener("portfolioLimitsUpdated", onLimits);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("portfolioLimitsUpdated", onLimits);
      window.removeEventListener("storage", onStorage);
    };
  }, [isAuthenticated, loadPortfolioLimits]);

  /* Limite par trader : (re)charge à la connexion + sur édition admin. */
  useEffect(() => {
    setTraderLimitEur(readTraderEurobondLimit(user?.id));
    const onTrader = (e) => {
      if (!e.detail || e.detail.traderId === user?.id) {
        setTraderLimitEur(readTraderEurobondLimit(user?.id));
      }
    };
    window.addEventListener("traderLimitsUpdated", onTrader);
    return () => window.removeEventListener("traderLimitsUpdated", onTrader);
  }, [user?.id]);

  const value = useMemo(() => {
    const { exposureLimits, annualTargets } = splitLimits(rawLimits);
    const deskTarget = sumTargets(annualTargets);
    // Plafond eurobonds EUR (absolu) : limite trader > plafond desk EUROBONDS > défaut.
    const eurExp = exposureLimits.find((l) => l.category === "EUROBONDS");
    const eurExposureLimit = eurExp
      ? parseFloat(eurExp.limitMeur) * 1e6
      : DEFAULT_EUROBOND_LIMIT_EUR;
    const myEurobondLimit =
      traderLimitEur ?? eurExposureLimit ?? DEFAULT_EUROBOND_LIMIT_EUR;
    return {
      exposureLimits, // [{ id, category, portfolioName, currency, limitMeur, colorToken, ... }]
      annualTargets, // idem, limitType === "TARGET"
      deskTarget, // somme des objectifs (valeur absolue MAD)
      eurExposureLimit, // plafond desk EUROBONDS (EUR absolu)
      myEurobondLimit, // limite eurobonds applicable au trader (EUR absolu)
      myLimitConfigured: traderLimitEur != null, // true si limite trader explicitement définie
    };
  }, [rawLimits, traderLimitEur]);

  return (
    <GovernanceContext.Provider value={value}>
      {children}
    </GovernanceContext.Provider>
  );
};

/* Repli sûr quand le provider est absent (jamais d'undefined → zéro crash). */
const EMPTY_GOVERNANCE = (() => {
  const { exposureLimits, annualTargets } = splitLimits(PORTFOLIO_LIMITS_DEFAULT);
  return {
    exposureLimits,
    annualTargets,
    deskTarget: sumTargets(annualTargets),
    eurExposureLimit: DEFAULT_EUROBOND_LIMIT_EUR,
    myEurobondLimit: DEFAULT_EUROBOND_LIMIT_EUR,
    myLimitConfigured: false,
  };
})();

export const useGovernance = () =>
  useContext(GovernanceContext) || EMPTY_GOVERNANCE;

export default GovernanceContext;
