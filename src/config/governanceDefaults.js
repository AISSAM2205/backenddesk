// src/config/governanceDefaults.js
// ─────────────────────────────────────────────────────────────────────────
// SOURCE DE VÉRITÉ UNIQUE des paramètres de gouvernance (limites + objectifs).
//
// L'administrateur les édite via l'espace Admin (LimitsManager / TraderLimits) ;
// ces constantes ne servent QUE de repli lorsque le backend n'a encore rien
// renvoyé. Aucun autre fichier ne doit redéfinir ces nombres — c'est ce qui
// garantit que TOUS les écrans trader affichent EXACTEMENT les mêmes valeurs.
// ─────────────────────────────────────────────────────────────────────────

/* Limites d'exposition réglementaires (EXPOSURE) + objectifs annuels (TARGET),
   même forme que les lignes renvoyées par GET /api/admin/portfolio-limits.

   ⚠️ Catégories TARGET = MOROC / OCP / CLN / EGP : ReportingView apparie
   l'objectif au P&L réalisé via category.toLowerCase() → pnl[key]. Ne pas
   renommer sans adapter ReportingView. */
export const PORTFOLIO_LIMITS_DEFAULT = [
  // ── Exposition (plafonds, en millions de devise) ──
  { id: "def-EXP-EUROBONDS",  limitType: "EXPOSURE", category: "EUROBONDS",  portfolioName: "Eurobonds",           currency: "EUR", limitMeur: 280, colorToken: "var(--eb)",  maxDurationYears: 7 },
  { id: "def-EXP-CLN_MOROC",  limitType: "EXPOSURE", category: "CLN_MOROC",  portfolioName: "CLN Maroc",           currency: "USD", limitMeur: 50,  colorToken: "var(--cln)" },
  { id: "def-EXP-CLN_GCC",    limitType: "EXPOSURE", category: "CLN_GCC",    portfolioName: "CLN GCC",             currency: "USD", limitMeur: 30,  colorToken: "#7C3AED" },
  { id: "def-EXP-EGP_BILLS",  limitType: "EXPOSURE", category: "EGP_BILLS",  portfolioName: "EGP Bills",           currency: "USD", limitMeur: 20,  colorToken: "var(--egp)" },
  { id: "def-EXP-TBILLS_USD", limitType: "EXPOSURE", category: "TBILLS_USD", portfolioName: "US Treasury Bills",   currency: "USD", limitMeur: 100, colorToken: "var(--cyan)" },
  { id: "def-EXP-TBILLS_EUR", limitType: "EXPOSURE", category: "TBILLS_EUR", portfolioName: "BTF / Bons du Trésor", currency: "EUR", limitMeur: 50,  colorToken: "#60A5FA" },
  // ── Objectifs annuels de P&L (en M MAD ; somme = 134 M MAD) ──
  { id: "def-TGT-MOROC", limitType: "TARGET", category: "MOROC", portfolioName: "Eurobond Maroc", currency: "MAD", limitMeur: 35, colorToken: "var(--eb)" },
  { id: "def-TGT-OCP",   limitType: "TARGET", category: "OCP",   portfolioName: "Eurobond OCP",   currency: "MAD", limitMeur: 15, colorToken: "#9B3EEF" },
  { id: "def-TGT-CLN",   limitType: "TARGET", category: "CLN",   portfolioName: "CLN",            currency: "MAD", limitMeur: 24, colorToken: "var(--cln)" },
  { id: "def-TGT-EGP",   limitType: "TARGET", category: "EGP",   portfolioName: "EGP Bills",      currency: "MAD", limitMeur: 60, colorToken: "var(--egp)" },
];

/* Limite eurobonds EUR par défaut (valeur ABSOLUE) — alignée sur le plafond
   desk EUROBONDS (280 M€) et sur TraderLimits.DEFAULT_LIMITS.eurobonds. */
export const DEFAULT_EUROBOND_LIMIT_EUR = 280_000_000;

/* Clés localStorage = canal de propagation admin → trader (réalité démo :
   admin et trader sont des routes séparées, sans backend persistant garanti). */
export const LS_PORTFOLIO_LIMITS = "governance_portfolio_limits_v1";
export const traderLimitsKey = (id) => `trader_limits_${id}`;

/* Sépare les lignes en EXPOSURE / TARGET ; retombe sur les défauts si vide. */
export const splitLimits = (rows) => {
  const list = Array.isArray(rows) && rows.length ? rows : PORTFOLIO_LIMITS_DEFAULT;
  return {
    exposureLimits: list.filter((l) => l.limitType === "EXPOSURE"),
    annualTargets: list.filter((l) => l.limitType === "TARGET"),
  };
};

/* Objectif desk total (valeur absolue MAD) = somme des objectifs annuels. */
export const sumTargets = (targets) =>
  (targets || []).reduce((s, t) => s + (parseFloat(t.limitMeur) || 0) * 1e6, 0);
