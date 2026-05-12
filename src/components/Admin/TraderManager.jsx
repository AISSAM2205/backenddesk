// src/components/Admin/TraderManager.jsx
import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { Plus, Edit, Trash2, Save, X, User } from 'lucide-react';
import { PERMISSION_TYPES, DEPARTMENTS, TRADER_STATUS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';

const TraderManager = () => {
  const { traders, createTrader, updateTrader, deleteTrader } = useAdmin();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  // Simplified permission types - Dashboard section access
  const PERMISSION_TYPES_CONFIG = PERMISSION_TYPES;

  const DEPARTMENTS_LIST = DEPARTMENTS;

  const initFormData = () => ({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    department: 'FIXED_INCOME',
    status: TRADER_STATUS.ACTIF,
    permissions: [] // Array of permission strings
  });

  const handleAdd = () => {
    setAdding(true);
    setFormData(initFormData());
  };

  const handleEdit = (trader) => {
    setEditing(trader.id);
    setFormData({ 
      ...trader,
      permissions: trader.permissions || []
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (adding) {
        await createTrader(formData);
      } else {
        await updateTrader(editing, formData);
      }
      handleCancel();
    } catch (error) {
      console.error('Error saving trader:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (trader) => {
    if (window.confirm(`Are you sure you want to delete ${trader.firstName} ${trader.lastName}?`)) {
      try {
        await deleteTrader(trader.id);
      } catch (error) {
        console.error('Error deleting trader:', error);
      }
    }
  };

  const handleCancel = () => {
    setAdding(false);
    setEditing(null);
    setFormData({});
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionChange = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const getPermissionGroups = () => [
    {
      title: 'Administrative Access',
      permissions: [
        { key: PERMISSION_TYPES_CONFIG.ADMIN, label: 'Admin Panel Access', color: 'red', description: 'Full administrative privileges' }
      ]
    },
    {
      title: 'Dashboard Sections',
      permissions: [
        { key: PERMISSION_TYPES_CONFIG.EUROBOND_ACCESS, label: 'EuroBonds Dashboard', color: 'blue', description: 'Access EuroBonds section' },
        { key: PERMISSION_TYPES_CONFIG.CLN_ACCESS, label: 'CLN Dashboard', color: 'green', description: 'Access Credit Linked Notes section' },
        { key: PERMISSION_TYPES_CONFIG.EGP_ACCESS, label: 'EGP Dashboard', color: 'purple', description: 'Access EGP Bills section' },
        { key: PERMISSION_TYPES_CONFIG.BLOTTER_ACCESS, label: 'Trading Blotter', color: 'amber', description: 'Access trading blotter and history' }
      ]
    }
  ];

  const getPermissionBadgeColor = (permission) => {
    if (permission.includes('ADMIN')) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
    if (permission.includes('EUROBOND')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
    if (permission.includes('CLN')) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
    if (permission.includes('EGP')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700';
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Traders Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage trading team members and their permissions</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Trader
        </button>
      </div>

      {/* Form */}
      {(adding || editing) && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">
              {adding ? 'Add New Trader' : 'Edit Trader'}
            </h4>
            <button
              onClick={handleCancel}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username *
              </label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => handleChange('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <select
                value={formData.department || 'FIXED_INCOME'}
                onChange={(e) => handleChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              >
                {DEPARTMENTS_LIST.map(dept => (
                  <option key={dept} value={dept}>{dept.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status || 'ACTIF'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="ACTIF">Active</option>
                <option value="INACTIF">Inactive</option>
                <option value="PREMIERE_CONNEXION">First Login Required</option>
                <option value="BLOQUE">Blocked</option>
              </select>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="mb-6">
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dashboard Access Permissions</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Select which sections this user can access in their dashboard</p>
            
            <div className="space-y-4">
              {getPermissionGroups().map(group => (
                <div key={group.title} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{group.title}</h6>
                  <div className="space-y-3">
                    {group.permissions.map(permission => (
                      <label key={permission.key} className="flex items-start cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.permissions?.includes(permission.key) || false}
                          onChange={() => handlePermissionChange(permission.key)}
                          className="sr-only"
                        />
                        <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                          formData.permissions?.includes(permission.key)
                            ? `${getPermissionBadgeColor(permission.key)} shadow-sm`
                            : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500 hover:border-gray-400 dark:hover:border-gray-400'
                        }`}>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{permission.label}</div>
                            {permission.description && (
                              <div className="text-xs opacity-75 mt-1">{permission.description}</div>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            formData.permissions?.includes(permission.key)
                              ? 'border-current bg-current'
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {formData.permissions?.includes(permission.key) && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !formData.firstName || !formData.lastName || !formData.username || !formData.email}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Traders List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-t-xl">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white">Active Traders</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage trading team member accounts and permissions</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Trader
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {traders.map((trader, index) => (
                <tr key={trader.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-25 dark:bg-gray-750'
                }`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-primary-500 dark:text-primary-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {trader.firstName} {trader.lastName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{trader.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-700">
                      {trader.department?.replace('_', ' ') || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-wrap justify-center gap-1 max-w-xs">
                      {trader.permissions?.slice(0, 2).map(permission => (
                        <span key={permission} className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPermissionBadgeColor(permission)}`}>
                          {permission.replace('_ACCESS', '').replace('_', ' ')}
                        </span>
                      ))}
                      {trader.permissions?.length > 2 && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                          +{trader.permissions.length - 2} more
                        </span>
                      )}
                      {(!trader.permissions || trader.permissions.length === 0) && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                          No Access
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${
                      trader.status === TRADER_STATUS.ACTIF 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700' 
                        : trader.status === TRADER_STATUS.PREMIERE_CONNEXION
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                        : trader.status === TRADER_STATUS.SUSPENDU
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700'
                        : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                    }`}>
                      {trader.status === TRADER_STATUS.PREMIERE_CONNEXION ? 'FIRST LOGIN' : trader.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center font-mono">
                    {formatDate(trader.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(trader)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 p-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(trader)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {traders.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No traders found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TraderManager;