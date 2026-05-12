// src/components/Admin/InstrumentManager.jsx
import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { Plus, Edit, Trash2, Save, X, Briefcase } from 'lucide-react';
import { INSTRUMENT_TYPES, CURRENCIES, RATING_SCALE, CLN_REGIONS } from '../../utils/constants';
import { formatDate, formatCurrency } from '../../utils/formatters';

const InstrumentManager = () => {
  const { instruments, createInstrument, updateInstrument, deleteInstrument } = useAdmin();
  const [selectedType, setSelectedType] = useState('eurobonds');
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const instrumentConfigs = {
    eurobonds: {
      name: 'EuroBonds',
      fields: [
        { key: 'isin', label: 'ISIN', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text', required: true },
        { key: 'issuer', label: 'Issuer', type: 'text', required: true },
        { key: 'coupon', label: 'Coupon (%)', type: 'number', required: true, step: '0.01' },
        { key: 'maturity', label: 'Maturity', type: 'date', required: true },
        { key: 'currency', label: 'Currency', type: 'select', options: ['EUR', 'USD'], required: true },
        { key: 'rating', label: 'Rating', type: 'select', options: RATING_SCALE, required: true }
      ]
    },
    cln: {
      name: 'Credit Linked Notes',
      fields: [
        { key: 'id', label: 'CLN ID', type: 'text', required: true },
        { key: 'reference', label: 'Reference Entity', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text', required: true },
        { key: 'region', label: 'Region', type: 'select', options: Object.values(CLN_REGIONS), required: true },
        { key: 'premium', label: 'Premium (%)', type: 'number', required: true, step: '0.01' },
        { key: 'spread', label: 'Spread (bp)', type: 'number', required: true },
        { key: 'maturity', label: 'Maturity', type: 'date', required: true },
        { key: 'issuer', label: 'Issuer', type: 'text', required: true }
      ]
    },
    egp: {
      name: 'EGP Bills',
      fields: [
        { key: 'id', label: 'Bill ID', type: 'text', required: true },
        { key: 'isin', label: 'ISIN', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text', required: true },
        { key: 'yield', label: 'Yield (%)', type: 'number', required: true, step: '0.01' },
        { key: 'duration_days', label: 'Duration (days)', type: 'number', required: true },
        { key: 'maturity', label: 'Maturity', type: 'date', required: true },
        { key: 'issuer', label: 'Issuer', type: 'text', required: true }
      ]
    }
  };

  const currentConfig = instrumentConfigs[selectedType];
  const currentInstruments = instruments[selectedType] || [];

  const initFormData = () => {
    const data = {};
    currentConfig.fields.forEach(field => {
      data[field.key] = field.type === 'number' ? 0 : '';
    });
    return data;
  };

  const handleAdd = () => {
    setAdding(true);
    setFormData(initFormData());
  };

  const handleEdit = (instrument) => {
    setEditing(instrument.id || instrument.isin);
    setFormData({ ...instrument });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (adding) {
        await createInstrument(selectedType, formData);
      } else {
        await updateInstrument(selectedType, editing, formData);
      }
      handleCancel();
    } catch (error) {
      console.error('Error saving instrument:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (instrument) => {
    const id = instrument.id || instrument.isin;
    if (window.confirm(`Are you sure you want to delete ${id}?`)) {
      try {
        await deleteInstrument(selectedType, id);
      } catch (error) {
        console.error('Error deleting instrument:', error);
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

  const renderField = (field) => {
    const value = formData[field.key] || '';
    
    if (field.type === 'select') {
      return (
        <select
          value={value}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
          required={field.required}
        >
          <option value="">Select...</option>
          {field.options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }
    
    return (
      <input
        type={field.type}
        value={value}
        onChange={(e) => handleChange(field.key, e.target.value)}
        step={field.step}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
        required={field.required}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Instrument Type Selector */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Instruments Management</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Create and manage trading instruments across all asset classes</p>
        
        <div className="flex flex-wrap gap-3">
          {Object.entries(instrumentConfigs).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedType === key 
                  ? 'bg-primary-600 dark:bg-primary-500 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
              }`}
            >
              {config.name}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h4 className="text-xl font-bold text-gray-900 dark:text-white">{currentConfig.name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage {currentConfig.name.toLowerCase()} in your portfolio</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add {currentConfig.name}
        </button>
      </div>

      {/* Form */}
      {(adding || editing) && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">
              {adding ? 'Add' : 'Edit'} {currentConfig.name}
            </h4>
            <button
              onClick={handleCancel}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {currentConfig.fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
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
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-md"
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

      {/* Instruments List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-t-xl">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white">{currentConfig.name} List</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">All active {currentConfig.name.toLowerCase()} in the system</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {currentConfig.fields.slice(0, 4).map(field => (
                  <th key={field.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {field.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {currentInstruments.map((instrument, index) => (
                <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-25 dark:bg-gray-750'
                }`}>
                  {currentConfig.fields.slice(0, 4).map(field => (
                    <td key={field.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {field.type === 'date' ? formatDate(instrument[field.key]) : 
                       field.type === 'number' ? (field.key.includes('coupon') || field.key.includes('yield') || field.key.includes('premium') ? 
                         `${instrument[field.key]}%` : instrument[field.key]) :
                       instrument[field.key] || '-'}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(instrument)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 p-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(instrument)}
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
        
        {currentInstruments.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No {currentConfig.name.toLowerCase()} found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstrumentManager;