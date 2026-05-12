// src/components/Admin/AdminDashboard.jsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import TraderManager from './TraderManager';
import InstrumentManager from './InstrumentManager';
import TraderLimits from './TraderLimits';
import { Users, Briefcase, DollarSign, LogOut, Settings } from 'lucide-react';
import LoadingSpinner from '../Common/LoadingSpinner';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('traders');
  const { user, logout } = useAuth();
  const { traders, instruments, loading, error } = useAdmin();

  const tabs = [
    { 
      id: 'traders', 
      label: 'Traders Management', 
      icon: Users, 
      component: TraderManager 
    },
    { 
      id: 'instruments', 
      label: 'Instruments Management', 
      icon: Briefcase, 
      component: InstrumentManager 
    },
    { 
      id: 'limits', 
      label: 'Trading Limits', 
      icon: DollarSign, 
      component: TraderLimits 
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading admin panel..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trading Desk Administration</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage traders, instruments, and trading limits</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-medium text-gray-900 dark:text-white">{user?.name || 'Admin User'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{user?.email || 'admin@attijariwafa.com'}</div>
            </div>
            <div className="w-10 h-10 bg-primary-600 dark:bg-primary-500 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-700 px-6 py-3">
          <div className="text-red-800 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 px-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default AdminDashboard;