// src/components/Admin/TraderLimits.jsx
import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { Edit, Save, X, User, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

const TraderLimits = () => {
  const { traders, updateTraderLimits } = useAdmin();
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const defaultLimits = {
    eurobonds: { limit: 0, currency: 'EUR', used: 0 },
    cln_moroc: { limit: 0, currency: 'USD', used: 0 },
    cln_gcc: { limit: 0, currency: 'USD', used: 0 },
    egp: { limit: 0, currency: 'USD', used: 0 }
  };

  const handleEdit = (trader) => {
    setEditing(trader.id);
    setFormData(trader.limits || defaultLimits);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateTraderLimits(editing, formData);
      setEditing(null);
      setFormData({});
    } catch (error) {
      console.error('Error updating limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setFormData({});
  };

  const handleLimitChange = (instrument, field, value) => {
    setFormData(prev => ({
      ...prev,
      [instrument]: {
        ...prev[instrument],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 0) return 0;
    return (used / limit) * 100;
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300';
    if (percentage >= 75) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300';
    return 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300';
  };

  const getUsageIcon = (percentage) => {
    if (percentage >= 90) return <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Trading Limits Management</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monitor and manage trading limits across all instruments</p>
      </div>

      {/* Limits Overview */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-t-xl">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white">Trading Limits Overview</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current usage and limits for all traders</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Trader
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  EuroBonds (EUR)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  CLN MOROC (USD)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  CLN GCC (USD)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  EGP (USD)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {traders.map((trader, index) => {
                const limits = trader.limits || defaultLimits;

                return (
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
                          <div className="text-sm text-gray-500 dark:text-gray-400">{trader.department}</div>
                        </div>
                      </div>
                    </td>

                    {Object.entries(limits).map(([instrument, data]) => {
                      const percentage = getUsagePercentage(data.used, data.limit);

                      return (
                        <td key={instrument} className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-xs">
                            <div className={`flex items-center justify-center gap-1 font-medium px-2 py-1 rounded ${getUsageColor(percentage)}`}>
                              {getUsageIcon(percentage)}
                              {formatCurrency(data.used, data.currency)}
                            </div>
                            <div className="text-gray-400 dark:text-gray-500 mt-1">
                              / {formatCurrency(data.limit, data.currency)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatPercentage(percentage, 1)}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleEdit(trader)}
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 p-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30"
                        title="Edit limits"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
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

      {/* Edit Limits Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Edit Trading Limits - {traders.find(t => t.id === editing)?.firstName} {traders.find(t => t.id === editing)?.lastName}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(formData).map(([instrument, data]) => (
                <div key={instrument} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {instrument.toUpperCase().replace('_', ' ')}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Limit ({data.currency})
                      </label>
                      <input
                        type="number"
                        value={data.limit}
                        onChange={(e) => handleLimitChange(instrument, 'limit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatCurrency(data.limit, data.currency)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Used ({data.currency})
                      </label>
                      <input
                        type="number"
                        value={data.used}
                        onChange={(e) => handleLimitChange(instrument, 'used', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatCurrency(data.used, data.currency)}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Usage:</span>
                        <div className={`font-medium px-2 py-1 rounded ${getUsageColor(getUsagePercentage(data.used, data.limit))}`}>
                          {formatPercentage(getUsagePercentage(data.used, data.limit), 1)}
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              getUsagePercentage(data.used, data.limit) >= 90
                                ? 'bg-red-500'
                                : getUsagePercentage(data.used, data.limit) >= 75
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(getUsagePercentage(data.used, data.limit), 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-md hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
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
        </div>
      )}
    </div>
  );
};

export default TraderLimits;