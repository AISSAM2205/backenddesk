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
import { wsService } from "../services/wsService";
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

  /* Chargement best-effort des limites desk depuis le backend.
     Repli immédiat sur snapshot localStorage → zéro flash vide. */
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

  /* Limite par trader : peinture immédiate depuis localStorage, puis backend
     (source de vérité cross-poste → GET /api/admin/traders/{id}/limits). */
  const loadTraderLimit = useCallback((userId) => {
    if (!userId) return;
    const cached = readTraderEurobondLimit(userId);
    if (cached) setTraderLimitEur(cached);
    api.admin
      .getTraderLimits(userId)
      .then((res) => {
        const val = parseFloat(res.data?.eurobonds?.limit);
        if (!isNaN(val) && val > 0) {
          setTraderLimitEur(val);
          // Met à jour le cache localStorage pour le repli hors-ligne
          try {
            const prev = JSON.parse(localStorage.getItem(traderLimitsKey(userId)) || "{}");
            localStorage.setItem(
              traderLimitsKey(userId),
              JSON.stringify({ ...prev, eurobonds: { ...(prev.eurobonds || {}), limit: val } }),
            );
          } catch { /* ignore quota / mode privé */ }
        }
      })
      .catch(() => { /* backend absent → garde localStorage/null */ });
  }, []);

  /* Charge à l'authentification + réagit aux éditions admin (limites desk).
     Canaux : CustomEvent "portfolioLimitsUpdated" (même onglet) + StorageEvent
     (onglets séparés, même navigateur) + WebSocket /topic/governance (cross-poste). */
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
    loadTraderLimit(user?.id);
    const onTrader = (e) => {
      if (!e.detail || String(e.detail.traderId) === String(user?.id)) {
        loadTraderLimit(user?.id);
      }
    };
    window.addEventListener("traderLimitsUpdated", onTrader);
    return () => window.removeEventListener("traderLimitsUpdated", onTrader);
  }, [user?.id, loadTraderLimit]);

  /* WebSocket /topic/governance → mise à jour live cross-poste sans refresh.
     Déclenché par AdminController après chaque PUT limits ou PUT portfolio-limits. */
  useEffect(() => {
    const unsub = wsService.subscribe((event) => {
      if (event.type !== "GOVERNANCE") return;
      const { type: evType, traderId } = event.payload || {};
      if (evType === "TRADER_LIMITS") {
        // Ciblé : ne recharge que si c'est la limite du trader courant
        if (!traderId || String(traderId) === String(user?.id)) {
          loadTraderLimit(user?.id);
        }
      } else {
        // PORTFOLIO_LIMITS ou type inconnu → recharge les limites desk
        loadPortfolioLimits();
      }
    });
    return unsub;
  }, [user?.id, loadPortfolioLimits, loadTraderLimit]);

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
