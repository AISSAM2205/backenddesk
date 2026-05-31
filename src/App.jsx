import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AdminProvider } from "./contexts/AdminContext";
import { TradingProvider } from "./contexts/TradingContext";
import ErrorBoundary from "./components/Common/ErrorBoundary";
import LoadingSpinner from "./components/Common/LoadingSpinner";
import { ThemeProvider } from "./contexts/ThemeContext";
import ToastProvider from "./components/Common/Toast";

// Lazy-load main views
const LoginForm = React.lazy(() => import("./components/Auth/LoginForm"));
const AdminDashboard = React.lazy(
  () => import("./components/Admin/AdminDashboard"),
);
const TradingDashboard = React.lazy(
  () => import("./components/Dashboard/TradingDashboard"),
);

// ── Access guard ────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--void)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h2
            style={{
              fontFamily: "var(--f-disp)",
              fontWeight: 800,
              fontSize: "1.1rem",
              color: "var(--loss)",
              marginBottom: 12,
              letterSpacing: "0.06em",
            }}
          >
            Accès refusé
          </h2>
          <p
            style={{
              fontFamily: "var(--f-body)",
              fontSize: "0.84rem",
              color: "var(--tx2)",
            }}
          >
            Vous n'avez pas les permissions pour accéder à cette section.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

// ── Routes (must be inside Router for useLocation) ──────────────────────────
const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate
              to={user?.role === "admin" ? "/admin" : "/trader"}
              replace
            />
          ) : (
            <Suspense fallback={<LoadingSpinner />}>
              <LoginForm />
            </Suspense>
          )
        }
      />

      {/* Admin — inner ErrorBoundary resets when location.key changes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <ErrorBoundary key={`admin-${location.key}`}>
              <AdminProvider>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminDashboard />
                </Suspense>
              </AdminProvider>
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />

      {/* Trader */}
      <Route
        path="/trader/*"
        element={
          <ProtectedRoute requiredRole="trader">
            <TradingProvider>
              <Suspense fallback={<LoadingSpinner />}>
                <TradingDashboard />
              </Suspense>
            </TradingProvider>
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          <Navigate
            to={
              isAuthenticated
                ? user?.role === "admin"
                  ? "/admin"
                  : "/trader"
                : "/login"
            }
            replace
          />
        }
      />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div
            style={{
              minHeight: "100vh",
              background: "var(--void)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <h1
                style={{
                  fontFamily: "var(--f-mono)",
                  fontWeight: 800,
                  fontSize: "5rem",
                  color: "var(--b3)",
                  marginBottom: 14,
                  lineHeight: 1,
                }}
              >
                404
              </h1>
              <p
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "0.85rem",
                  color: "var(--tx3)",
                }}
              >
                Page introuvable
              </p>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

// ── App root ─────────────────────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <Router>
              <AppRoutes />
            </Router>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
