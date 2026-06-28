// src/hooks/useLiveDesk.js
//
// Sélecteur central « desk live » : fusionne les lignes du dashboard (REST,
// TradingContext) avec les cotations temps réel (WebSocket, MarketDataContext) et
// re-dérive MtM latente, P&L économique et spreads À PARTIR du prix live.
//
// Principe clé : on ne touche JAMAIS au baseline calibré servi par le backend. On
// applique seulement le DELTA de prix intraday (mid live − mid de référence seedé)
// au-dessus des valeurs REST. Comme le simulateur fait du retour à la moyenne autour
// de la référence, le P&L oscille autour des chiffres de démo sans dériver.
//
//   MtM live (MAD)   = MtM REST + nominal × (midLive − midRef) × FX
//   Δyield (bp)      = −(Δprix% / ModDur) × 10000      → spread qui se resserre/écarte
//
// Recalculé à chaque « flush » du MarketDataContext (~250 ms) via `version`.

import { useMemo } from "react";
import { useTrading } from "../contexts/TradingContext";
import { useMarketData } from "../contexts/MarketDataContext";

const num = (v) => {
  const n = parseFloat(v ?? 0);
  return isNaN(n) ? 0 : n;
};

export function useLiveDesk() {
  const { dashboardRows, rates, globalDashboard } = useTrading();
  const { getQuote, getDirection, version } = useMarketData();

  return useMemo(() => {
    const usdMad = num(rates?.usdMad) || 10.0347;
    const eurMad = num(rates?.eurMad) || 10.8891;
    const usdEgp = num(rates?.usdEgp) || 48.85;
    const fxOf = (ccy) => {
      const c = (ccy || "USD").toUpperCase();
      return c === "EUR" ? eurMad : c === "EGP" ? usdMad / usdEgp : usdMad;
    };

    let totalPlEcoMad = 0;
    let totalPlLatentMad = 0;
    let baseEcoMad = 0;
    let baseLatentMad = 0;
    let liveCount = 0;

    const rows = (dashboardRows || []).map((r) => {
      const tick = getQuote(r.isin);
      const baseEco = num(r.pnlEconomicMad);
      const baseLatent = num(r.pnlLatentMad);
      baseEcoMad += baseEco;
      baseLatentMad += baseLatent;

      const refMid = num(r.pxMid); // fraction de pair (ex. 1.0275)
      if (!tick || refMid <= 0) {
        totalPlEcoMad += baseEco;
        totalPlLatentMad += baseLatent;
        return { ...r, _live: false, _dir: 0 };
      }

      const fx = fxOf(r.currency);
      const nominal = Math.abs(num(r.netNominal));
      const liveMidFrac = tick.mid / 100; // points → fraction
      const dPriceFrac = liveMidFrac - refMid;
      const dMad = nominal * dPriceFrac * fx; // variation MtM intraday (MAD)

      const modDur = num(r.modifiedDuration);
      const dYieldBp =
        modDur > 0 && refMid > 0
          ? -(dPriceFrac / refMid) / modDur * 10000
          : 0;
      // Décale un spread du Δyield live SANS fabriquer de valeur quand le
      // backend n'en fournit pas (null reste null → les « — » restent des « — »).
      const shiftBp = (v) => (v == null ? null : num(v) + dYieldBp);

      const liveLatentMad = baseLatent + dMad;
      const liveEcoMad = baseEco + dMad;
      totalPlEcoMad += liveEcoMad;
      totalPlLatentMad += liveLatentMad;
      liveCount += 1;

      // Dirty marché live = clean live + couru du jour (le couru ne tick pas).
      const liveDirtyFrac = liveMidFrac + num(r.accrued);
      const wapDirty = num(r.lastWapDirty);

      return {
        ...r,
        _live: true,
        _dir: getDirection(r.isin),
        // prix live (fraction) — conserve la convention ×100 des composants
        pxMid: liveMidFrac,
        cleanPrice: liveMidFrac, // alias backend de pxMid → Market Watch respire
        pxBidAwb: tick.bid / 100,
        pxAskAwb: tick.ask / 100,
        dirtyMarket: liveDirtyFrac,
        // Perf vs WAP re-dérivée du dirty live (ratio décimal, comme le backend)
        perfWap: wapDirty > 0 ? liveDirtyFrac / wapDirty - 1 : r.perfWap,
        // champs live bruts (points) pour la grille blotter
        liveBid: tick.bid,
        liveAsk: tick.ask,
        liveLast: tick.last,
        liveNetChange: tick.netChange,
        livePctChange: tick.pctChange,
        liveTs: tick.ts,
        // spreads dérivés du mouvement de prix — niveau qui respire,
        // structure bid/mid/ask préservée (fourchette stable, réaliste)
        gSpreadBid: shiftBp(r.gSpreadBid),
        gSpreadMid: shiftBp(r.gSpreadMid),
        gSpreadAsk: shiftBp(r.gSpreadAsk),
        iSpreadBid: shiftBp(r.iSpreadBid),
        iSpreadMid: shiftBp(r.iSpreadMid),
        iSpreadAsk: shiftBp(r.iSpreadAsk),
        assetSwapSpread: shiftBp(r.assetSwapSpread),
        // P&L re-dérivé (MAD + CCY)
        pnlLatentMad: liveLatentMad,
        pnlEconomicMad: liveEcoMad,
        pnlLatentCcy: num(r.pnlLatentCcy) + nominal * dPriceFrac,
      };
    });

    // NIVEAU PROD — le BACKEND est la source unique de vérité pour l'agrégat P&L.
    // Le flux live n'ajoute QUE le delta MtM intraday (somme des variations de
    // prix) PAR-DESSUS le chiffre backend, exactement comme un vrai desk. Au repos
    // (prix = référence seedée) le delta est nul → l'écran affiche EXACTEMENT le
    // P&L backend (/api/dashboard/global). Repli sur la somme des lignes seulement
    // si le backend n'a pas fourni d'agrégat (mode dégradé).
    const liveDeltaMad = totalPlEcoMad - baseEcoMad;
    const ecoBaseline =
      globalDashboard?.totalPlEcoMad != null
        ? num(globalDashboard.totalPlEcoMad)
        : baseEcoMad;
    const latentBaseline =
      globalDashboard?.totalPlLatentMad != null
        ? num(globalDashboard.totalPlLatentMad)
        : baseLatentMad;
    const totals = {
      ...(globalDashboard || {}),
      totalPlEcoMad: ecoBaseline + liveDeltaMad,
      totalPlLatentMad: latentBaseline + liveDeltaMad,
      _liveDeltaMad: liveDeltaMad,
      _liveCount: liveCount,
    };

    return { rows, totals, version };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardRows, rates, globalDashboard, version]);
}

export default useLiveDesk;
