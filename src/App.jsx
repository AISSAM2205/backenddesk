// src/App.jsx - Complete restoration
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { TradingProvider } from './contexts/TradingContext';
import ErrorBoundary from './components/Common/ErrorBoundary';
import LoadingSpinner from './components/Common/LoadingSpinner';
import { ThemeProvider } from './contexts/ThemeContext';  // ← ADD THIS LINE


// Lazy load main components
const LoginForm = React.lazy(() => import('./components/Auth/LoginForm'));
const AdminDashboard = React.lazy(() => import('./components/Admin/AdminDashboard'));
const TradingDashboard = React.lazy(() => import('./components/Dashboard/TradingDashboard'));

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this area.</p>
        </div>
      </div>
    );
  }

  return children;
};

// Route handler
const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === 'admin' ? '/admin' : '/trader'} replace />
          ) : (
            <Suspense fallback={<LoadingSpinner />}>
              <LoginForm />
            </Suspense>
          )
        } 
      />
      
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminProvider>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminDashboard />
              </Suspense>
            </AdminProvider>
          </ProtectedRoute>
        } 
      />
      
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
      
      <Route 
        path="/" 
        element={
          <Navigate 
            to={isAuthenticated ? (user?.role === 'admin' ? '/admin' : '/trader') : '/login'} 
            replace 
          />
        } 
      />
      
      <Route 
        path="*" 
        element={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-400 mb-4">404</h1>
              <p className="text-gray-600">Page not found</p>
            </div>
          </div>
        } 
      />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;