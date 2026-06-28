// src/contexts/AuthContext.jsx
// Authentification réelle via Keycloak (SSO Attijariwafa).
// L'init et la redirection sont gérées dans main.jsx AVANT le rendu :
// quand ce provider est monté, keycloak.authenticated est déjà résolu.
import React, { createContext, useContext, useReducer } from "react";
import keycloak from "../services/keycloak";

const AuthContext = createContext();

// Dérive l'utilisateur applicatif depuis les claims du token Keycloak.
// Rôle : "admin" si le realm role `admin` est présent, sinon "trader".
// → ahmed (sans rôle particulier) sera un trader, ce qui suffit pour /trader.
function deriveUser() {
  if (!keycloak.authenticated || !keycloak.tokenParsed) return null;
  const t = keycloak.tokenParsed;
  const roles = t.realm_access?.roles || [];
  const isAdmin = roles.includes("admin");
  const username = t.preferred_username || "user";
  return {
    id: t.sub,
    username,
    firstName: t.given_name || username,
    lastName: t.family_name || "",
    email: t.email || `${username}@attijariwafa.ma`,
    department: "Fixed Income — Desk International",
    role: isAdmin ? "admin" : "trader",
    permissions: isAdmin
      ? ["ADMIN"]
      : ["EUROBOND_ACCESS", "CLN_ACCESS", "EGP_ACCESS", "BLOTTER_ACCESS"],
    status: "ACTIF",
  };
}

const initialState = {
  user: deriveUser(),
  isAuthenticated: !!keycloak.authenticated,
  loading: false,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Connexion / déconnexion déléguées à Keycloak (page hébergée par le serveur).
  const login = () => keycloak.login();
  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    keycloak.logout({ redirectUri: window.location.origin });
  };
  const clearError = () => dispatch({ type: "CLEAR_ERROR" });

  const value = {
    ...state,
    login,
    logout,
    clearError,
    // Compat : anciens boutons "démo". Avec le SSO, ils ouvrent simplement
    // la page de login Keycloak (le rôle réel vient du token, pas du bouton).
    loginAsAdmin: login,
    loginAsTrader: login,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
