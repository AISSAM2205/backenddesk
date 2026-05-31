// src/utils/constants.js
export const CURRENCIES = {
  USD: "USD",
  EUR: "EUR",
  MAD: "MAD",
  EGP: "EGP",
};

export const INSTRUMENT_TYPES = {
  EUROBONDS: "eurobonds",
  CLN: "cln",
  EGP: "egp",
};

export const USER_ROLES = {
  ADMIN: "admin",
  TRADER: "trader",
};

// New simplified permission system - matches backend PermissionType enum
export const PERMISSION_TYPES = {
  ADMIN: "ADMIN",
  EUROBOND_ACCESS: "EUROBOND_ACCESS",
  CLN_ACCESS: "CLN_ACCESS",
  EGP_ACCESS: "EGP_ACCESS",
  BLOTTER_ACCESS: "BLOTTER_ACCESS",
};

// Permission descriptions for UI
export const PERMISSION_DESCRIPTIONS = {
  ADMIN: "Administration complète du système",
  EUROBOND_ACCESS: "Accès à la section EuroBonds du dashboard",
  CLN_ACCESS: "Accès à la section CLN du dashboard",
  EGP_ACCESS: "Accès à la section EGP du dashboard",
  BLOTTER_ACCESS: "Accès au blotter de trading",
};

// Permission groups for better UI organization
export const PERMISSION_GROUPS = {
  ADMINISTRATIVE: {
    title: "Administrative Access",
    permissions: ["ADMIN"],
  },
  DASHBOARD_SECTIONS: {
    title: "Dashboard Sections",
    permissions: [
      "EUROBOND_ACCESS",
      "CLN_ACCESS",
      "EGP_ACCESS",
      "BLOTTER_ACCESS",
    ],
  },
};

export const CONNECTION_STATUS = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
  FAILED: "failed",
};

export const REFRESH_INTERVALS = {
  MARKET_DATA: 5000, // 5 seconds
  PORTFOLIO: 30000, // 30 seconds
  POSITIONS: 60000, // 1 minute
};

export const RATING_SCALE = [
  "AAA",
  "AA+",
  "AA",
  "AA-",
  "A+",
  "A",
  "A-",
  "BBB+",
  "BBB",
  "BBB-",
  "BB+",
  "BB",
  "BB-",
  "B+",
  "B",
  "B-",
  "CCC+",
  "CCC",
  "CCC-",
  "CC",
  "C",
  "D",
];

export const CLN_REGIONS = {
  MOROC: "MOROC",
  GCC: "GCC",
};

export const TRADE_STATUS = {
  PENDING: "pending",
  EXECUTED: "executed",
  CANCELLED: "cancelled",
  SETTLED: "settled",
};

// Trader status types - matches backend TraderStatus enum
export const TRADER_STATUS = {
  ACTIF: "ACTIF",
  INACTIF: "INACTIF",
  SUSPENDU: "SUSPENDU",
  PREMIERE_CONNEXION: "PREMIERE_CONNEXION",
};

// Department types - matches backend departments
export const DEPARTMENTS = [
  "FIXED_INCOME",
  "TRADING",
  "RESEARCH",
  "MANAGEMENT",
  "EUROBOND",
  "CLN",
  "EGP",
  "IT",
];

export default {
  CURRENCIES,
  INSTRUMENT_TYPES,
  USER_ROLES,
  PERMISSION_TYPES,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_GROUPS,
  CONNECTION_STATUS,
  REFRESH_INTERVALS,
  RATING_SCALE,
  CLN_REGIONS,
  TRADE_STATUS,
  TRADER_STATUS,
  DEPARTMENTS,
};
