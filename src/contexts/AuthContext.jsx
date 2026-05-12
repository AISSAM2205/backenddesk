// src/contexts/AuthContext.jsx
// Auth bypassed — backend has no /api/auth/login endpoint.
// Login form uses dev bypass. Replace with real call when auth is implemented.
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: true, 
        loading: false, 
        error: null 
      };
    case 'LOGIN_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, loading: false, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'DEV_LOGIN':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on app start
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
  }, []);

  // Dev bypass login — no real auth backend yet.
  // Replace body with real API call once /api/auth/login is implemented.
  const login = async (username, password) => {
    dispatch({ type: 'LOGIN_START' });
    // Simulate a small delay
    await new Promise(r => setTimeout(r, 400));

    const isAdmin = username.toLowerCase() === 'admin';
    const user = {
      id: isAdmin ? 'admin-1' : 'trader-1',
      username,
      firstName: isAdmin ? 'Admin' : username,
      lastName: '',
      email: `${username}@attijariwafa.ma`,
      department: 'Fixed Income — Desk International',
      permissions: isAdmin ? ['ADMIN'] : ['EUROBOND_ACCESS', 'CLN_ACCESS', 'EGP_ACCESS', 'BLOTTER_ACCESS'],
      role: isAdmin ? 'admin' : 'trader',
      status: 'ACTIF',
    };
    localStorage.setItem('authToken', 'dev-token');
    localStorage.setItem('userData', JSON.stringify(user));
    dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    return user;
  };

  // TEMPORARY: Development login functions
  const loginAsAdmin = () => {
    const adminUser = {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@attijariwafa.com',
      role: 'admin',
      team: 'Administration'
    };
    
    localStorage.setItem('authToken', 'dev-admin-token');
    localStorage.setItem('userData', JSON.stringify(adminUser));
    dispatch({ type: 'DEV_LOGIN', payload: adminUser });
  };

  const loginAsTrader = () => {
    const traderUser = {
      id: 'trader-1',
      name: 'John Trader',
      email: 'trader@attijariwafa.com',
      role: 'trader',
      team: 'EuroBonds'
    };
    
    localStorage.setItem('authToken', 'dev-trader-token');
    localStorage.setItem('userData', JSON.stringify(traderUser));
    dispatch({ type: 'DEV_LOGIN', payload: traderUser });
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    logout,
    clearError,
    // Temporary development methods
    loginAsAdmin,
    loginAsTrader
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;