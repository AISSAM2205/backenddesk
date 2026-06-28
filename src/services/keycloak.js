// src/services/keycloak.js
// Instance Keycloak unique (singleton) partagée par toute l'app.
// Les valeurs viennent de .env (VITE_KEYCLOAK_*) — voir README/.env.
//   url     : BASE du serveur (https://host), PAS la console /admin/.../console/
//   realm   : sdm_services_store
//   clientId: trading-frontend (client PUBLIC, Standard flow + PKCE)
import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT,
});

// ── Mode LOCAL sans Keycloak (PC perso) ──────────────────────────────────────
// Quand VITE_AUTH_MODE=dev (.env.local), on injecte une session "trader"
// simulée DÈS la construction du singleton. C'est indispensable ICI (et pas
// seulement dans main.jsx) car AuthContext lit keycloak.authenticated à
// l'évaluation de son module, AVANT que main.jsx ne s'exécute.
// Sur le PC pro (flag absent), ce bloc est ignoré → Keycloak normal.
if (import.meta.env.VITE_AUTH_MODE === "dev") {
  keycloak.authenticated = true;
  keycloak.token = "dev-token";
  keycloak.tokenParsed = {
    sub: "dev-user",
    preferred_username: "trader",
    given_name: "Trader",
    family_name: "Local",
    email: "trader@local.dev",
    realm_access: { roles: [] }, // pas de rôle "admin" → profil trader
  };
  keycloak.updateToken = () => Promise.resolve(false);
  keycloak.login = () => {};
  keycloak.logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };
}

export default keycloak;
