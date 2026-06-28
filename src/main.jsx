import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import keycloak from "./services/keycloak";

const root = ReactDOM.createRoot(document.getElementById("root"));

// Petit écran d'erreur si Keycloak est injoignable (hors VPN / mauvaise URL),
// pour éviter l'écran blanc et donner une consigne claire.
function renderKeycloakError(detail) {
  root.render(
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#060A10",
        color: "#F1F5F9",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 440 }}>
        <h2 style={{ color: "#F43F5E", marginBottom: 12, fontSize: "1.05rem" }}>
          Serveur d'authentification injoignable
        </h2>
        <p style={{ color: "#94A3B8", fontSize: "0.85rem", lineHeight: 1.6 }}>
          Impossible de contacter Keycloak. Vérifie&nbsp;:
          <br />
          1. ta connexion au réseau interne / VPN Attijariwafa&nbsp;;
          <br />
          2. la valeur <code>VITE_KEYCLOAK_URL</code> dans <code>.env</code>&nbsp;;
          <br />
          3. les <em>Valid redirect URIs</em> / <em>Web origins</em> du client.
        </p>
        {detail && (
          <pre
            style={{
              marginTop: 14,
              fontSize: "0.7rem",
              color: "#64748B",
              whiteSpace: "pre-wrap",
            }}
          >
            {String(detail)}
          </pre>
        )}
      </div>
    </div>,
  );
}

if (import.meta.env.VITE_AUTH_MODE === "dev") {
  // ── Mode LOCAL sans Keycloak (PC perso) ──────────────────────────────────
  // La session "trader" simulée est injectée dans services/keycloak.js (avant
  // l'évaluation d'AuthContext). Ici, on rend l'app directement, SANS appeler
  // keycloak.init() qui redirigerait vers le serveur SSO injoignable.
  localStorage.setItem("authToken", keycloak.token);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  keycloak
    .init({
      onLoad: "login-required", // redirige vers la page de login Keycloak si non connecté
      pkceMethod: "S256", // PKCE — obligatoire pour un client public
      checkLoginIframe: false, // évite les soucis de cookies tiers en entreprise
    })
    .then((authenticated) => {
      if (!authenticated) {
        // login-required garantit normalement authenticated=true ; sécurité.
        keycloak.login();
        return;
      }

      // Token disponible dès maintenant pour axios (interceptor le relit aussi).
      localStorage.setItem("authToken", keycloak.token);

      // Rafraîchissement proactif : si le token expire dans < 70 s, on renouvelle.
      setInterval(() => {
        keycloak
          .updateToken(70)
          .then((refreshed) => {
            if (refreshed) localStorage.setItem("authToken", keycloak.token);
          })
          .catch(() => keycloak.login());
      }, 20000);

      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    })
    .catch((err) => {
      console.error("Keycloak init failed:", err);
      renderKeycloakError(err?.error || err?.message);
    });
}
