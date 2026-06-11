// src/contexts/MarketDataContext.jsx
//
// Consomme le flux WebSocket /topic/market (événements "MARKET" de wsService) et
// expose les cotations temps réel Bid/Ask/Last à toute l'application.
//
// Performance : les ticks arrivent ~toutes les 800 ms en lot. On NE déclenche PAS
// un re-render React à chaque message. On accumule les ticks dans une Map mutable
// (useRef) et on ne « commit » un re-render qu'à cadence maîtrisée (flush ~250 ms)
// et seulement si quelque chose a changé. Les consommateurs lisent la cotation via
// getQuote() au render → toujours la dernière valeur, sans cascade de rendus.

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useReducer,
} from "react";
import wsService from "../services/wsService";

const MarketDataContext = createContext(null);

const FLUSH_MS = 250;

export const MarketDataProvider = ({ children }) => {
  // Map<symbol, tick> mutable — source de vérité, jamais recréée.
  const quotesRef = useRef(new Map());
  // Map<symbol, 1|-1|0> direction du dernier mouvement de mid (pour le flash couleur).
  const dirsRef = useRef(new Map());
  // Compteur de version : incrémenté au flush pour notifier les consommateurs.
  const [version, bump] = useReducer((v) => v + 1, 0);

  useEffect(() => {
    let dirty = false;

    const unsub = wsService.subscribe((event) => {
      if (event.type !== "MARKET") return;
      const ticks = Array.isArray(event.payload) ? event.payload : [event.payload];
      for (const t of ticks) {
        if (!t || !t.symbol) continue;
        const prev = quotesRef.current.get(t.symbol);
        if (prev) {
          const d = t.mid > prev.mid ? 1 : t.mid < prev.mid ? -1 : 0;
          if (d !== 0) dirsRef.current.set(t.symbol, d);
        }
        quotesRef.current.set(t.symbol, t);
      }
      dirty = true;
    });

    // Flush throttlé : un seul re-render par fenêtre, et seulement si nécessaire.
    const id = setInterval(() => {
      if (dirty) {
        dirty = false;
        bump();
      }
    }, FLUSH_MS);

    return () => {
      unsub();
      clearInterval(id);
    };
  }, []);

  const api = useMemo(
    () => ({
      version, // change à chaque flush → permet aux hooks de se re-synchroniser
      getQuote: (symbol) => quotesRef.current.get(symbol) || null,
      getDirection: (symbol) => dirsRef.current.get(symbol) || 0,
      getAll: () => Array.from(quotesRef.current.values()),
      size: quotesRef.current.size,
    }),
    [version],
  );

  return (
    <MarketDataContext.Provider value={api}>
      {children}
    </MarketDataContext.Provider>
  );
};

/** Accès brut au contexte (toléré hors provider → renvoie un no-op). */
export const useMarketData = () => {
  const ctx = useContext(MarketDataContext);
  return (
    ctx || {
      version: 0,
      getQuote: () => null,
      getDirection: () => 0,
      getAll: () => [],
      size: 0,
    }
  );
};

/**
 * Hook cotation d'un instrument. Renvoie { tick, dir } et se re-rend uniquement
 * quand le contexte « flush » (cadence maîtrisée). `dir` = 1 (hausse) / -1 (baisse).
 */
export const useLiveQuote = (symbol) => {
  const { getQuote, getDirection, version } = useMarketData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(
    () => ({ tick: symbol ? getQuote(symbol) : null, dir: symbol ? getDirection(symbol) : 0 }),
    [symbol, version],
  );
};

export default MarketDataContext;
