// src/services/api.js — wired to Spring Boot backend (port 8081)
import axios from "axios";
import keycloak from "./keycloak";

// Empty string → Vite proxy handles /api/* in dev; set env var for production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  // Token Keycloak frais : rafraîchi s'il expire dans < 30 s.
  if (keycloak?.authenticated) {
    try {
      await keycloak.updateToken(30);
    } catch {
      /* le timer global de main.jsx relancera le login si besoin */
    }
    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
      // X-Username conservé pour l'audit côté backend (AuditService).
      const username = keycloak.tokenParsed?.preferred_username;
      if (username) config.headers["X-Username"] = username;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
    }
    return Promise.reject(err);
  },
);

export const today = () => new Date().toISOString().split("T")[0];

const api = {
  dashboard: {
    // GET /api/dashboard?date=YYYY-MM-DD → List<DashboardDto>
    // 1 row per active ISIN: position + P&L + pricing + risk (= Dashboard Excel)
    getAll: (date = today()) =>
      apiClient.get("/api/dashboard", { params: { date } }),
    // These may not be implemented yet — TradingContext handles 404 gracefully
    getGlobal: (date = today()) =>
      apiClient.get("/api/dashboard/global", { params: { date } }),
    getRates: () => apiClient.get("/api/dashboard/rates"),
  },
  positions: {
    getActive: () => apiClient.get("/api/positions/active"),
    getByIsin: (isin) => apiClient.get(`/api/positions/${isin}`),
  },
  pnl: {
    // GET /api/pnl?date=YYYY-MM-DD → List<PnLDto>
    getAll: (date = today()) => apiClient.get("/api/pnl", { params: { date } }),
    getByIsin: (isin, date = today()) =>
      apiClient.get(`/api/pnl/${isin}`, { params: { date } }),
  },
  pricing: {
    // GET /api/pricing?date=YYYY-MM-DD → List<PricingDto>
    getAll: (date = today()) =>
      apiClient.get("/api/pricing", { params: { date } }),
    // PATCH /api/dashboard/{isin}/decision  → { decision: "BUY"|"HOLD"|"SELL"|null }
    updateDecision: (isin, decision) =>
      apiClient.patch(`/api/dashboard/${encodeURIComponent(isin)}/decision`, { decision }),
    // PATCH /api/dashboard/{isin}/target-spread → { targetSpread: 135.0 }
    // Met à jour la cible de spread et recalcule la décision BUY/HOLD en base
    updateTargetSpread: (isin, targetSpread) =>
      apiClient.patch(`/api/dashboard/${encodeURIComponent(isin)}/target-spread`, { targetSpread }),
  },
  risk: {
    // GET /api/risk?date=YYYY-MM-DD → List<RiskDto>
    getAll: (date = today()) =>
      apiClient.get("/api/risk", { params: { date } }),
    // GET /api/risk/duration?date=YYYY-MM-DD → BigDecimal (portfolio duration)
    // Expected: 3.9049 years (from RiskService.computePortfolioDuration)
    getDuration: (date = today()) =>
      apiClient.get("/api/risk/duration", { params: { date } }),
    // GET /api/risk/market[?from&to] → MarketRiskDto (VaR param+historique,
    // Expected Shortfall, vol annualisée, max drawdown). Source unique backend.
    // Sans from/to → tout l'historique de P&L journalier.
    getMarket: (from, to) =>
      apiClient.get("/api/risk/market", { params: { from, to } }),
    // GET /api/risk/scenarios[?date] → RateScenarioDto (grille de choc de taux
    // -100/.../+100 bp : P&L linéaire + ajusté convexité, USD & MAD).
    getScenarios: (date = today()) =>
      apiClient.get("/api/risk/scenarios", { params: { date } }),
  },
  external: {
    getCln: (date = today()) =>
      apiClient.get("/api/external/cln", { params: { date } }),
    getEgp: (date = today()) =>
      apiClient.get("/api/external/egp", { params: { date } }),
    getTotals: (date = today()) =>
      apiClient.get("/api/external/all", { params: { date } }),
    // GET /api/external/egp/breakeven → EgpBreakevenDto (BKV FX par deal,
    // coussins, P&L FX approx.). Source unique backend.
    getEgpBreakeven: (date = today()) =>
      apiClient.get("/api/external/egp/breakeven", { params: { date } }),
  },
  reporting: {
    // GET /api/reporting/scenarios?pess&central&opt → ReportingScenarioDto
    // (projection P&L fin d'année par scénario de taux). Chocs = entrées user.
    getScenarios: ({ date = today(), pess, central, opt } = {}) =>
      apiClient.get("/api/reporting/scenarios", {
        params: { date, pess, central, opt },
      }),
  },
  tbills: {
    // GET /api/tbills?date=YYYY-MM-DD → List<TBillPosition> (USD + EUR)
    getAll: (date = today()) =>
      apiClient.get("/api/tbills", { params: { date } }),
    // GET /api/tbills/usd?date=YYYY-MM-DD → List<TBillPosition> USD seulement
    getUsd: (date = today()) =>
      apiClient.get("/api/tbills/usd", { params: { date } }),
    // GET /api/tbills/eur?date=YYYY-MM-DD → List<TBillPosition> EUR seulement
    getEur: (date = today()) =>
      apiClient.get("/api/tbills/eur", { params: { date } }),
  },
  trades: {
    // GET /api/trades?isin=...&way=BUY&subAsset=Mor+Bond
    // NOTE: backend only accepts isin, way, subAsset — NOT isClosed (filter client-side)
    getAll: (params = {}) => {
      const { isClosed, ...rest } = params; // strip isClosed — not supported by backend
      return apiClient.get("/api/trades", { params: rest });
    },
    getById: (id) => apiClient.get(`/api/trades/${id}`),
    // POST /api/trades/bond — create a single bond trade
    // Body: { isin, way, nominal, cleanPrice, accrued, gSpread, counterparty, tradeDate, valueDate }
    createBond: (dto) => apiClient.post("/api/trades/bond", dto),
    // POST /api/trades/future — create a future trade
    // Body: { ticker, way, nbContracts, entryPrice, lastPrice, hedBondIsin, tradeDate }
    createFuture: (dto) => apiClient.post("/api/trades/future", dto),
    // POST /api/trades/upload-csv — bulk import from blotter CSV
    // ⚠️ CRITICAL: endpoint is /upload-csv (not /import) and param is 'user' (not 'username')
    // CSV format: [0]=ISIN [1]=date(dd/MM/yyyy) [2]=valeur [3]=BUY/SELL [4]=nominal
    //             [5]=cleanPrice [6]=accrued [9]=gSpread [10]=counterparty
    //             [13]=isClosed [14]=wapDirty [16]=realizedPnl [17]=subAsset [19]=hedBondDesc [20]=lastPrice
    importCsv: (file, user) => {
      const form = new FormData();
      form.append("file", file);
      form.append("user", user || "trader"); // param name is 'user' (not 'username')
      return apiClient.post("/api/trades/upload-csv", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    // DELETE /api/trades/{id}/cancel — mark trade as closed
    cancel: (id) => apiClient.delete(`/api/trades/${id}/cancel`),
  },
  instruments: {
    // GET /api/instruments → List<InstrumentDto>
    getAll: () => apiClient.get("/api/instruments"),
    getByIsin: (isin) => apiClient.get(`/api/instruments/${isin}`),
  },
  pnlDaily: {
    // GET /api/pnl-daily?from=2025-01-01&to=2025-05-20 → List<PnlDaily>
    // Used for the historical P&L line chart in PortfolioView
    getHistory: (from, to) =>
      apiClient.get("/api/pnl-daily", { params: { from, to } }),
  },
  admin: {
    // GET /api/admin/traders → List<TraderDto>
    getTraders: () => apiClient.get("/api/admin/traders"),
    // POST /api/admin/traders → TraderDto
    createTrader: (dto) => apiClient.post("/api/admin/traders", dto),
    // PUT /api/admin/traders/{id}
    updateTrader: (id, dto) => apiClient.put(`/api/admin/traders/${id}`, dto),
    // DELETE /api/admin/traders/{id} → soft delete (isActive=false)
    deleteTrader: (id) => apiClient.delete(`/api/admin/traders/${id}`),
    // PUT /api/admin/traders/{id}/limits
    updateLimits: (id, dto) =>
      apiClient.put(`/api/admin/traders/${id}/limits`, dto),
    // GET /api/admin/instruments/{type} → List (eurobonds | cln | egp)
    getInstruments: (type) => apiClient.get(`/api/admin/instruments/${type}`),
    // POST /api/admin/instruments → create
    createInstrument: (dto) => apiClient.post("/api/admin/instruments", dto),
    // PUT /api/admin/instruments/{isin} → update
    updateInstrument: (isin, dto) =>
      apiClient.put(`/api/admin/instruments/${isin}`, dto),
    // DELETE /api/admin/instruments/{isin} → soft delete
    deleteInstrument: (isin) =>
      apiClient.delete(`/api/admin/instruments/${isin}`),
    // GET /api/admin/traders/{id}/limits → { eurobonds:{limit,currency,used}, ... }
    getTraderLimits: (id) => apiClient.get(`/api/admin/traders/${id}/limits`),
    // GET /api/admin/portfolio-limits → regulatory limits + annual targets
    getPortfolioLimits: () => apiClient.get("/api/admin/portfolio-limits"),
    // PUT /api/admin/portfolio-limits/{id}
    updatePortfolioLimit: (id, dto) =>
      apiClient.put(`/api/admin/portfolio-limits/${id}`, dto),
    // GET /api/admin/audit?limit=200 → derniers N logs (max 500)
    getAuditLog: (limit = 200) => apiClient.get("/api/admin/audit", { params: { limit } }),
  },
  recon: {
    // POST /api/recon/upload-bo — import du fichier Back Office (CSV)
    // CSV : ISIN;way;nominal;cleanPrice;tradeDate(dd/MM/yyyy);valueDate;counterparty;boRef
    uploadBo: (file, user) => {
      const form = new FormData();
      form.append("file", file);
      form.append("user", user || "trader");
      return apiClient.post("/api/recon/upload-bo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    // GET /api/recon/run — lance la réconciliation FO/BO → ReconResultDto
    // tolNominal / tolPriceBps optionnels (undefined → omis par axios)
    run: (date = today(), tolNominal, tolPriceBps) =>
      apiClient.get("/api/recon/run", {
        params: { date, tolNominal, tolPriceBps },
      }),
    // GET /api/recon/bo-trades — enregistrements Back Office courants
    getBoTrades: () => apiClient.get("/api/recon/bo-trades"),
    // DELETE /api/recon/bo-trades — purge le jeu BO (avant ré-import)
    clearBoTrades: () => apiClient.delete("/api/recon/bo-trades"),
    // PUT /api/recon/breaks/status — met à jour le workflow d'un écart
    // dto : { breakKey, status, assignee, comment }
    updateBreakStatus: (dto) => apiClient.put("/api/recon/breaks/status", dto),
  },
  auth: {
    // POST /api/auth/login → { token, user }
    login: (dto) => apiClient.post("/api/auth/login", dto),
    // POST /api/auth/logout
    logout: () => apiClient.post("/api/auth/logout"),
    // GET /api/auth/me → UserDto
    me: () => apiClient.get("/api/auth/me"),
  },
  health: () => apiClient.get("/actuator/health"),
};

export default api;
