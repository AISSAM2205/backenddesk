// src/services/api.js — wired to Spring Boot backend (port 8080)
import axios from "axios";

// Empty string → Vite proxy handles /api/* in dev; set env var for production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
  },
  external: {
    getCln: (date = today()) =>
      apiClient.get("/api/external/cln", { params: { date } }),
    getEgp: (date = today()) =>
      apiClient.get("/api/external/egp", { params: { date } }),
    getTotals: (date = today()) =>
      apiClient.get("/api/external/all", { params: { date } }),
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
    // GET /api/admin/portfolio-limits → regulatory limits + annual targets
    getPortfolioLimits: () => apiClient.get("/api/admin/portfolio-limits"),
    // PUT /api/admin/portfolio-limits/{id}
    updatePortfolioLimit: (id, dto) =>
      apiClient.put(`/api/admin/portfolio-limits/${id}`, dto),
    // GET /api/admin/audit → top-50 AuditLog
    getAuditLog: () => apiClient.get("/api/admin/audit"),
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
