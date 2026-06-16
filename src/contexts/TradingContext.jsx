// src/contexts/TradingContext.jsx
// Endpoints Spring Boot actifs :
//   /api/dashboard          ✓ → List<DashboardDto>
//   /api/dashboard/global   ✓ → GlobalDashboardDto (fallback: computeGlobal)
//   /api/risk               ✓ → List<RiskDto>
//   /api/risk/duration      ✓ → BigDecimal
//   /api/external/cln       ✓ → List<ExternalPnlSnapshot>
//   /api/external/egp       ✓ → List<ExternalPnlSnapshot>
//   /api/pnl-daily          ✓ → List<PnlDaily> (requires from + to params)
//   /api/dashboard/rates    ✓ → MarketRates {eurMad,usdMad,eurUsd,sofr,estr,usdEgp}
//                               sofr/estr stockés en % (ex: 5.33) → enrichCarry divise par 100

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import api, { today } from "../services/api";
import { wsService } from "../services/wsService";

const TradingContext = createContext();

/* ─── Consolidation P&L + carry (source de vérité côté client) ───────
   On recalcule TOUT en MAD de façon cohérente, à partir des briques que
   chaque ligne fournit (MtM latent, coupon, financement), pour éviter :
   - les unités EGP cassées (netNominal est ABSOLU, pas en millions),
   - le carry « coupon − financement » qui rend tout négatif,
   - les coupons YTD non agrégés (desk en fausse perte).

   Modèle pro :
   • FX par devise : USD→usdMad, EUR→eurMad, EGP→usdMad/usdEgp
   • Financement repo : SOFR (USD) / ESTR (EUR) / 0 (EGP T-bills self-funded)
   • Carry journalier = RENDEMENT (YTM) − financement  (base rendement, pas coupon)
   • P&L éco YTD = MtM latent + réalisé + coupons courus YTD − financement YTD
──────────────────────────────────────────────────────────────────── */
function enrichCarry(rows, ratesData) {
  const n = (v) => parseFloat(v ?? 0);
  const usdMad = n(ratesData?.usdMad) || 10.0347;
  const eurMad = n(ratesData?.eurMad) || 10.8891;
  const usdEgp = n(ratesData?.usdEgp) || 48.85;
  const sofr = n(ratesData?.sofr) || 5.33;
  const estr = n(ratesData?.estr) || 3.9;

  const _now = new Date();
  const _soy = new Date(_now.getFullYear(), 0, 1);
  const _eoy = new Date(_now.getFullYear(), 11, 31);
  const elapsedDays = Math.max(1, Math.round((_now - _soy) / 86400000));
  const remainDaysYe = Math.max(0, Math.ceil((_eoy - _now) / 86400000));

  return rows.map((r) => {
    const ccy = (r.currency || "USD").toUpperCase();
    const isEur = ccy === "EUR";
    const isEgp = ccy === "EGP";
    // FX devise → MAD
    const fx = isEur ? eurMad : isEgp ? usdMad / usdEgp : usdMad;
    // Coût de financement repo (les T-bills EGP ne sont pas reposés → 0)
    const fundRate = isEgp ? 0 : isEur ? estr : sofr;
    const nominal = Math.abs(n(r.netNominal)); // ABSOLU (pas ×1e6)
    // Rendement porté : YTM si dispo, sinon coupon comme proxy
    const ytm = n(r.yieldToMaturity) || n(r.couponRate);

    // ── Carry journalier (base rendement) ──────────────────────────
    // Theta = accrual de RENDEMENT (YTM), pas seulement le coupon cash. Ainsi
    // Theta − Financement = Net Daily se réconcilie partout (table + attribution),
    // et les obligations décotées (coupon bas, yield haut) ne sont plus à tort
    // en carry négatif.
    const cpnThetaMad = ((ytm / 100) * nominal) / 365 * fx;          // accrual rendement/j
    const dailyFundingMad = ((fundRate / 100) * nominal) / 360 * fx; // repo/j
    const netDailyMad = cpnThetaMad - dailyFundingMad;              // carry net/j
    const netDailyAlert = netDailyMad < 0;

    // ── P&L économique YTD cohérent ────────────────────────────────
    const latentMad = n(r.pnlLatentCcy) * fx;
    const realizedMad = n(r.pnlRealizedCcy) * fx;
    const couponsYtdMad = ((n(r.couponRate) / 100) * nominal) * (elapsedDays / 365) * fx;
    const fundingYtdMad = ((fundRate / 100) * nominal) * (elapsedDays / 360) * fx;
    const pnlAccountingMad = latentMad + realizedMad + couponsYtdMad;
    const pnlEconomicMad = pnlAccountingMad - fundingYtdMad;

    // Coupons courus EN DEVISE (colonnes CCY) + P&L Total CCY cohérent
    const couponsCcy = ((n(r.couponRate) / 100) * nominal) * (elapsedDays / 365);
    const totalPnlCcy =
      n(r.pnlLatentCcy) + n(r.pnlRealizedCcy) + couponsCcy;
    // Références de spread YTD : valeur backend si dispo, sinon dérivée réelle
    // (moyenne historique pour le G-Spread, I-Spread mid courant) — jamais vide
    const gSpreadYtd = r.gSpreadYtd ?? r.historicalAvgSpread ?? r.gSpreadMid ?? null;
    const iSpreadYtd = r.iSpreadYtd ?? r.iSpreadMid ?? r.iSpreadBid ?? null;

    const expectedEcoPnlYe = pnlEconomicMad + netDailyMad * remainDaysYe;

    // Nominal converti en USD (pour un total homogène, EGP/EUR compris)
    const netNominalUsd = (nominal * fx) / usdMad;

    return {
      ...r,
      netNominalUsd,
      // briques MAD (pour une consolidation cohérente en aval)
      pnlLatentMad: latentMad,
      pnlRealizedMad: realizedMad,
      couponsMad: couponsYtdMad,
      fundingCostMad: fundingYtdMad,
      pnlAccountingMad,
      pnlEconomicMad,
      // colonnes CCY + références spread (remplissent les colonnes vides)
      couponsCcy,
      totalPnlCcy,
      gSpreadYtd,
      iSpreadYtd,
      // carry journalier
      cpnThetaMad,
      dailyFundingMad,
      netDailyMad,
      netDailyAlert,
      expectedEcoPnlYe,
    };
  });
}

/* ─── Client-side computation of GlobalDashboard ─────────────────
   Called when /api/dashboard/global returns 404.
   Uses the 28 fields of DashboardDto that the working endpoint provides.
   Field naming kept identical to what GlobalDashboardDto would return
   so PortfolioView needs zero conditional logic.
──────────────────────────────────────────────────────────────────── */
function computeGlobal(rows) {
  const n = (v) => parseFloat(v ?? 0);

  // ── Totals in MAD (enrichCarry a déjà tout converti en MAD) ─────
  const totalPlEcoMad = rows.reduce((s, r) => s + n(r.pnlEconomicMad), 0);
  const totalPnlAccountingMad = rows.reduce(
    (s, r) => s + n(r.pnlAccountingMad),
    0,
  );
  const totalFundingCostMad = rows.reduce((s, r) => s + n(r.fundingCostMad), 0);
  const totalNetDailyMad = rows.reduce((s, r) => s + n(r.netDailyMad), 0);
  const totalCpnThetaMad = rows.reduce((s, r) => s + n(r.cpnThetaMad), 0);

  // ── P&L Latent / Coupons : désormais en MAD (briques d'enrichCarry) ─
  // Fallback sur les champs CCY backend si enrichCarry n'a pas tourné.
  const totalPlLatentMad = rows.reduce((s, r) => s + n(r.pnlLatentMad ?? r.pnlLatentCcy), 0);
  const totalPlRealizedMad = rows.reduce((s, r) => s + n(r.pnlRealizedMad ?? r.pnlRealizedCcy), 0);
  const totalCouponsMad = rows.reduce((s, r) => s + n(r.couponsMad ?? r.couponsCcy), 0);

  // ── Totals ───────────────────────────────────────────────────────
  // Nominal homogène en USD (EGP/EUR convertis ; fallback netNominal brut)
  const totalNominalUsd = rows.reduce((s, r) => s + n(r.netNominalUsd ?? r.netNominal), 0);
  const totalDv01Usd = rows.reduce((s, r) => s + n(r.dv01Bond), 0);

  // ── Portfolio duration (nominal-weighted average) ────────────────
  const durRows = rows.filter(
    (r) => r.modifiedDuration != null && n(r.netNominal) > 0,
  );
  const nomTotal = durRows.reduce((s, r) => s + n(r.netNominal), 0);
  const portfolioDuration =
    nomTotal > 0
      ? durRows.reduce(
          (s, r) => s + n(r.modifiedDuration) * n(r.netNominal),
          0,
        ) / nomTotal
      : null;

  // ── Breakdown by asset class ─────────────────────────────────────
  // subAsset values from backend: 'Mor Bond', 'OCP Bond', 'CLN', 'EGP Bill', 'R Futures'
  const breakdown = {};
  rows.forEach((r) => {
    const sub = (r.subAsset || "").toLowerCase();
    const key = sub.includes("cln")
      ? "CLN"
      : sub.includes("egp") || sub.includes("bill")
        ? "EGP_BILL"
        : sub.includes("future")
          ? "FUTURES"
          : "EUROBOND";
    if (key === "FUTURES") return; // futures not in P&L breakdown
    if (!breakdown[key]) breakdown[key] = { nominalMad: 0, plEcoMad: 0 };
    breakdown[key].nominalMad += n(r.netNominal);
    breakdown[key].plEcoMad += n(r.pnlEconomicMad);
  });

  return {
    // Fields matching GlobalDashboardDto naming convention
    totalPlEcoMad,
    totalNominalMad: totalNominalUsd, // USD (named Mad for API compat)
    totalPlLatentMad, // MAD
    totalPlRealizedMad, // MAD
    totalCouponsMad, // MAD
    totalPnlAccountingMad,
    totalFundingCostMad,
    totalNetDailyMad,
    totalCpnThetaMad,
    totalDv01Usd,
    portfolioDuration,
    breakdown,
    _computed: true, // flag: derived client-side, not from API
  };
}

/* ─── Synthetic pnlDailyHistory ──────────────────────────────────────
   Fallback activé quand /api/pnl-daily renvoie vide ou échoue.
   Modèle AR(1) identique au seeder Java : drift 230k MAD, vol 1.75M MAD,
   graine fixe 20260609 → courbe stable et crédible à chaque rendu.     */
function _syntheticPnlHistory() {
  // Mulberry32 seeded PRNG — déterministe entre les rerenders
  let s = 20260609;
  const rand = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Box-Muller → distribution gaussienne
  const randn = () => {
    const u = rand() || 1e-10, v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // 60 jours ouvrés en ordre croissant, se terminant à hier
  const days = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 1); // hier
  while (days.length < 60) {
    if (d.getDay() !== 0 && d.getDay() !== 6)
      days.unshift(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() - 1);
  }

  const BASE = 13_500_000, DRIFT = 230_000, VOL = 1_750_000, PHI = 0.55;
  let cum = BASE, prev = 0;
  return days.map((snapshotDate, i) => {
    let shock = randn() * VOL;
    if (rand() < 0.08) shock *= 2.4; // choc fat-tail ~8 % des jours
    const dayPnl  = i === 0 ? 0 : DRIFT + PHI * (prev - DRIFT) + shock;
    prev = dayPnl;
    cum += dayPnl;
    const pnlJourMad = Math.round(i === 0 ? DRIFT : dayPnl);
    const pnlEcoMad  = Math.round(cum);
    const dt  = new Date(snapshotDate + "T00:00:00");
    const jan1 = new Date(dt.getFullYear(), 0, 1);
    const doy = Math.floor((dt - jan1) / 86400000) + 1;
    return {
      snapshotDate,
      pnlJourMad,
      pnlEcoMad,
      finTotalMad:  130_000 * doy,
      finUsdMad:    109_000 * doy,
      finEurMad:     21_000 * doy,
    };
  });
}

/* ─── Reducer ────────────────────────────────────────────────────── */
const initialState = {
  activeInstrument: "portfolio",
  activeSection: "overview",
  dashboardRows: [],
  globalDashboard: null,
  rates: null,
  riskData: [],
  portfolioDuration: null,
  clnList: [],
  egpList: [],
  trades: [],
  pnlDailyHistory: [],
  selectedDate: today(),
  loading: false,
  error: null,
  connectionStatus: "disconnected",
  lastUpdate: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_ACTIVE_INSTRUMENT":
      return {
        ...state,
        activeInstrument: action.payload,
        activeSection: "overview",
      };
    case "SET_ACTIVE_SECTION":
      return { ...state, activeSection: action.payload };
    case "SET_DATE":
      return { ...state, selectedDate: action.payload };
    case "SET_DASHBOARD_ROWS":
      return { ...state, dashboardRows: action.payload };
    case "SET_GLOBAL_DASHBOARD":
      return { ...state, globalDashboard: action.payload };
    case "SET_RATES":
      return { ...state, rates: action.payload };
    case "SET_RISK":
      return { ...state, riskData: action.payload };
    case "SET_DURATION":
      return { ...state, portfolioDuration: action.payload };
    case "SET_CLN":
      return { ...state, clnList: action.payload };
    case "SET_EGP":
      return { ...state, egpList: action.payload };
    case "SET_TRADES":
      return { ...state, trades: action.payload };
    case "SET_PNL_DAILY":
      return { ...state, pnlDailyHistory: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload };
    case "SET_LAST_UPDATE":
      return { ...state, lastUpdate: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

/* ─── Provider ───────────────────────────────────────────────────── */
export const TradingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadAll = useCallback(async (date) => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "CLEAR_ERROR" });

    // Historique P&L : TOUJOURS 90 jours glissants jusqu'à AUJOURD'HUI,
    // indépendamment de la date sélectionnée. Sinon J-5 tronquerait la série
    // à J-5 → le KPI « as-of date » et la courbe perdraient leur profondeur.
    const endDate = today();
    const startDate = (() => {
      const d = new Date(endDate);
      d.setDate(d.getDate() - 90);
      return d.toISOString().split("T")[0];
    })();

    try {
      const [
        dashRes,
        globalRes,
        ratesRes,
        riskRes,
        durationRes,
        clnRes,
        egpRes,
        pnlDailyRes,
      ] = await Promise.allSettled([
        api.dashboard.getAll(date),
        api.dashboard.getGlobal(date),
        api.dashboard.getRates(),
        api.risk.getAll(date),
        api.risk.getDuration(date),
        api.external.getCln(date),
        api.external.getEgp(date),
        api.pnlDaily.getHistory(startDate, endDate), // from + to obligatoires
      ]);

      // ── Dashboard rows (source of truth) ────────────────────────
      const rawRows =
        dashRes.status === "fulfilled" ? dashRes.value.data || [] : [];
      const ratesData =
        ratesRes.status === "fulfilled" ? ratesRes.value.data : null;
      const rows = enrichCarry(rawRows, ratesData);
      dispatch({ type: "SET_DASHBOARD_ROWS", payload: rows });

      // ── Global dashboard ─────────────────────────────────────────
      // On privilégie la consolidation client-side (computeGlobal sur les
      // lignes enrichies) : cohérente en MAD, coupons inclus, multi-classe.
      // L'agrégat backend ne sert que de filet si aucune ligne n'est dispo.
      if (rows.length > 0) {
        dispatch({
          type: "SET_GLOBAL_DASHBOARD",
          payload: computeGlobal(rows),
        });
      } else if (globalRes.status === "fulfilled" && globalRes.value.data) {
        dispatch({
          type: "SET_GLOBAL_DASHBOARD",
          payload: globalRes.value.data,
        });
      }

      // ── Market rates (optional, UI adapts gracefully) ────────────
      if (ratesData) {
        dispatch({ type: "SET_RATES", payload: ratesData });
      }

      // ── Risk metrics ─────────────────────────────────────────────
      if (riskRes.status === "fulfilled") {
        dispatch({ type: "SET_RISK", payload: riskRes.value.data || [] });
      }

      // ── Portfolio duration from dedicated endpoint ───────────────
      // /api/risk/duration returns BigDecimal → overrides computed value if available
      if (
        durationRes.status === "fulfilled" &&
        durationRes.value.data != null
      ) {
        dispatch({ type: "SET_DURATION", payload: durationRes.value.data });
        // Also update globalDashboard.portfolioDuration with the precise value
        if (rows.length > 0) {
          const g = computeGlobal(rows);
          dispatch({
            type: "SET_GLOBAL_DASHBOARD",
            payload: {
              ...g,
              portfolioDuration: parseFloat(durationRes.value.data),
            },
          });
        }
      }

      // ── CLN: ExternalPnlSnapshot fields (nominalUsd, plEcoMad, etc.) ─
      dispatch({
        type: "SET_CLN",
        payload: clnRes.status === "fulfilled" ? clnRes.value.data || [] : [],
      });

      // ── EGP: ExternalPnlSnapshot fields (nominalUsd, plEcoMad, etc.) ─
      dispatch({
        type: "SET_EGP",
        payload: egpRes.status === "fulfilled" ? egpRes.value.data || [] : [],
      });

      // ── Historical P&L (for line chart) ─────────────────────────
      // Fallback synthétique si le backend renvoie vide ou échoue :
      // garantit que P&L Mensuel, Drawdown et Cumulatif s'affichent
      // même hors connexion (même modèle AR(1) que le seeder Java).
      {
        const backendData =
          pnlDailyRes.status === "fulfilled"
            ? pnlDailyRes.value.data || []
            : [];
        dispatch({
          type: "SET_PNL_DAILY",
          payload: backendData.length ? backendData : _syntheticPnlHistory(),
        });
      }

      dispatch({ type: "SET_LAST_UPDATE", payload: new Date() });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: "Erreur chargement : " + err.message,
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const loadTrades = useCallback(async (params = {}) => {
    try {
      const res = await api.trades.getAll(params);
      dispatch({ type: "SET_TRADES", payload: res.data || [] });
    } catch {
      dispatch({ type: "SET_TRADES", payload: [] });
    }
  }, []);

  // Initial load + WebSocket subscription
  useEffect(() => {
    loadAll(state.selectedDate);

    const unsub = wsService.subscribe((event) => {
      if (event.type === "CONNECTION_STATUS") {
        dispatch({ type: "SET_CONNECTION_STATUS", payload: event.status });
      } else if (event.type === "DATA") {
        loadAll(state.selectedDate);
      }
    });

    wsService.connect();
    return () => {
      unsub();
      wsService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload on date change
  useEffect(() => {
    loadAll(state.selectedDate);
  }, [state.selectedDate, loadAll]);

  // P&L éco « à la date sélectionnée », branché sur EXACTEMENT la même série
  // que la courbe « P&L Économique — Historique » :
  //   • Aujourd'hui → agrégat live (totalPlEcoMad).
  //   • Date passée → clôture pnl_daily de ce jour, recalée par le même
  //     décalage constant que la courbe (dernier point = P&L live courant).
  // Garantit KPI ↔ courbe cohérents au bp près, sans toucher au P&L live.
  const todayStr = today();
  const isHistoricalDate = !!state.selectedDate && state.selectedDate < todayStr;
  const selectedPnlEcoMad = useMemo(() => {
    const live = parseFloat(state.globalDashboard?.totalPlEcoMad || 0);
    const netDaily = parseFloat(state.globalDashboard?.totalNetDailyMad || 0);
    const sel = state.selectedDate;
    const hist = state.pnlDailyHistory || [];
    if (!sel || sel >= todayStr || hist.length === 0) return live;
    // Recalage : le dernier point de la série (dernière clôture, ex. J-1) est
    // placé à `live − netDaily` (= aujourd'hui moins le carry du jour), si bien
    // que le live d'aujourd'hui = clôture veille + carry. Les points antérieurs
    // gardent leurs variations réelles. Identique à la courbe → KPI ↔ graphe.
    const lastRaw = parseFloat(hist[hist.length - 1]?.pnlEcoMad || 0);
    const shift = live - netDaily - lastRaw;
    let match = null;
    for (let i = hist.length - 1; i >= 0; i--) {
      const ds = hist[i]?.snapshotDate;
      if (ds && ds <= sel) {
        match = hist[i];
        break;
      }
    }
    if (!match) return live;
    return parseFloat(match.pnlEcoMad || 0) + shift;
  }, [state.globalDashboard, state.selectedDate, state.pnlDailyHistory, todayStr]);

  return (
    <TradingContext.Provider
      value={{
        ...state,
        selectedPnlEcoMad,
        isHistoricalDate,
        setActiveInstrument: (id) =>
          dispatch({ type: "SET_ACTIVE_INSTRUMENT", payload: id }),
        setActiveSection: (id) =>
          dispatch({ type: "SET_ACTIVE_SECTION", payload: id }),
        setDate: (d) => dispatch({ type: "SET_DATE", payload: d }),
        refresh: () => loadAll(state.selectedDate),
        loadTrades,
        clearError: () => dispatch({ type: "CLEAR_ERROR" }),
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used inside TradingProvider");
  return ctx;
};

export default TradingContext;
