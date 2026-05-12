// src/contexts/AdminContext.jsx - With mock data for development
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const AdminContext = createContext();

const initialState = {
  traders: [],
  instruments: {
    eurobonds: [],
    cln: [],
    egp: []
  },
  loading: false,
  error: null
};

// Mock data for development
const mockTraders = [
  {
    id: 'trader-1',
    name: 'Ahmed Benali',
    email: 'ahmed.benali@attijariwafa.com',
    team: 'EuroBonds',
    status: 'active',
    role: 'trader',
    createdAt: '2024-01-15',
    limits: {
      eurobonds: { limit: 10000000, currency: 'EUR', used: 6500000 },
      cln_moroc: { limit: 5000000, currency: 'USD', used: 2000000 },
      cln_gcc: { limit: 3000000, currency: 'USD', used: 1500000 },
      egp: { limit: 2000000, currency: 'USD', used: 1000000 }
    }
  },
  {
    id: 'trader-2',
    name: 'Fatima El Mansouri',
    email: 'fatima.elmansouri@attijariwafa.com',
    team: 'CLN',
    status: 'active',
    role: 'trader',
    createdAt: '2024-02-10',
    limits: {
      eurobonds: { limit: 8000000, currency: 'EUR', used: 3000000 },
      cln_moroc: { limit: 7000000, currency: 'USD', used: 4500000 },
      cln_gcc: { limit: 4000000, currency: 'USD', used: 2200000 },
      egp: { limit: 1500000, currency: 'USD', used: 500000 }
    }
  },
  {
    id: 'trader-3',
    name: 'Omar Kadiri',
    email: 'omar.kadiri@attijariwafa.com',
    team: 'EGP',
    status: 'active',
    role: 'trader',
    createdAt: '2024-03-05',
    limits: {
      eurobonds: { limit: 5000000, currency: 'EUR', used: 1000000 },
      cln_moroc: { limit: 3000000, currency: 'USD', used: 800000 },
      cln_gcc: { limit: 2000000, currency: 'USD', used: 600000 },
      egp: { limit: 5000000, currency: 'USD', used: 3500000 }
    }
  }
];

const mockInstruments = {
  eurobonds: [
    {
      isin: 'XS2595028700',
      description: 'Morocco Government Bond 3.5% 2031',
      issuer: 'Kingdom of Morocco',
      coupon: 3.5,
      maturity: '2031-06-15',
      currency: 'EUR',
      rating: 'BBB-'
    },
    {
      isin: 'XS2234567890',
      description: 'OCP SA 4.25% 2029',
      issuer: 'OCP SA',
      coupon: 4.25,
      maturity: '2029-10-22',
      currency: 'USD',
      rating: 'BBB'
    }
  ],
  cln: [
    {
      id: 'CLN001',
      reference: 'Morocco Sovereign Risk',
      description: 'CLN on Kingdom of Morocco 5Y',
      region: 'MOROC',
      premium: 2.85,
      spread: 285,
      maturity: '2028-03-15',
      issuer: 'Attijariwafa Bank'
    },
    {
      id: 'CLN002',
      reference: 'Saudi Arabia Sovereign',
      description: 'CLN on Saudi Arabia 3Y',
      region: 'GCC',
      premium: 1.75,
      spread: 175,
      maturity: '2027-08-30',
      issuer: 'Attijariwafa Bank'
    }
  ],
  egp: [
    {
      id: 'EGP001',
      isin: 'EG0001234567',
      description: 'Egyptian Treasury Bill 6M',
      yield: 24.5,
      duration_days: 180,
      maturity: '2025-12-30',
      issuer: 'Central Bank of Egypt'
    }
  ]
};

function adminReducer(state, action) {
  switch (action.type) {
    case 'SET_TRADERS':
      return { ...state, traders: action.payload };
    case 'SET_INSTRUMENTS':
      return { 
        ...state, 
        instruments: { 
          ...state.instruments, 
          [action.instrumentType]: action.payload 
        } 
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export const AdminProvider = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      loadAdminData();
    }
  }, [isAuthenticated, user]);

  const loadAdminData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Check if we're in development mode (no backend)
      const isDevelopment = import.meta.env.DEV || 
        (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').includes('localhost');
      
      if (isDevelopment) {
        // Use mock data in development
        console.log('Loading mock admin data for development...');
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        dispatch({ type: 'SET_TRADERS', payload: mockTraders });
        
        // Load mock instruments
        const instrumentTypes = ['eurobonds', 'cln', 'egp'];
        for (const type of instrumentTypes) {
          dispatch({ 
            type: 'SET_INSTRUMENTS', 
            instrumentType: type, 
            payload: mockInstruments[type] 
          });
        }
        
      } else {
        // Use real API calls in production
        const tradersResponse = await api.admin.getTraders();
        dispatch({ type: 'SET_TRADERS', payload: tradersResponse.data });
        
        const instrumentTypes = ['eurobonds', 'cln', 'egp'];
        for (const type of instrumentTypes) {
          const response = await api.admin.getInstruments(type);
          dispatch({ 
            type: 'SET_INSTRUMENTS', 
            instrumentType: type, 
            payload: response.data 
          });
        }
      }
      
    } catch (error) {
      console.error('Error loading admin data:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load admin data. Using mock data for development.' });
      
      // Fallback to mock data
      dispatch({ type: 'SET_TRADERS', payload: mockTraders });
      const instrumentTypes = ['eurobonds', 'cln', 'egp'];
      for (const type of instrumentTypes) {
        dispatch({ 
          type: 'SET_INSTRUMENTS', 
          instrumentType: type, 
          payload: mockInstruments[type] 
        });
      }
      
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Trader Management (mock implementations)
  const createTrader = async (traderData) => {
    try {
      console.log('Creating trader (mock):', traderData);
      // In development, just simulate success
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadAdminData(); // Reload data
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const updateTrader = async (traderId, updates) => {
    try {
      console.log('Updating trader (mock):', traderId, updates);
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadAdminData(); // Reload data
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteTrader = async (traderId) => {
    try {
      console.log('Deleting trader (mock):', traderId);
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadAdminData(); // Reload data
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const updateTraderLimits = async (traderId, limits) => {
    try {
      console.log('Updating trader limits (mock):', traderId, limits);
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadAdminData(); // Reload data
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Instrument Management (mock implementations)
  const createInstrument = async (type, instrumentData) => {
    try {
      console.log('Creating instrument (mock):', type, instrumentData);
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadAdminData(); // Reload data
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const updateInstrument = async (type, instrumentId, updates) => {
    try {
      console.log('Updating instrument (mock):', type, instrumentId, updates);
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadAdminData(); // Reload data
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteInstrument = async (type, instrumentId) => {
    try {
      console.log('Deleting instrument (mock):', type, instrumentId);
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadAdminData(); // Reload data
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    createTrader,
    updateTrader,
    deleteTrader,
    updateTraderLimits,
    createInstrument,
    updateInstrument,
    deleteInstrument,
    clearError,
    refreshData: loadAdminData
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export default AdminContext;