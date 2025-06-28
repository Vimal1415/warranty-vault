import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Edit3,
  Plus,
  Info
} from 'lucide-react';
import axios from 'axios';

const WarrantyEditor = ({ product, onClose, onUpdate }) => {
  const [warrantyInfo, setWarrantyInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    warrantyPeriod: '',
    warrantyEndDate: '',
    warrantyStartDate: ''
  });
  const [extendWarranty, setExtendWarranty] = useState({
    additionalMonths: ''
  });

  useEffect(() => {
    fetchWarrantyInfo();
  }, [product]);

  const fetchWarrantyInfo = async () => {
    try {
      const response = await axios.get(`/api/products/${product._id}/warranty-info`);
      setWarrantyInfo(response.data.product);
      
      // Set form data
      setFormData({
        warrantyPeriod: response.data.product.warrantyPeriod || '',
        warrantyEndDate: response.data.product.warrantyEndDate ? 
          new Date(response.data.product.warrantyEndDate).toISOString().split('T')[0] : '',
        warrantyStartDate: response.data.product.purchaseDate ? 
          new Date(response.data.product.purchaseDate).toISOString().split('T')[0] : ''
      });
    } catch (error) {
      console.error('Error fetching warranty info:', error);
    }
  };

  const handleUpdateWarranty = async () => {
    setLoading(true);
    try {
      const response = await axios.put(`/api/products/${product._id}/warranty`, formData);
      setWarrantyInfo(response.data.product);
      setEditMode(false);
      onUpdate(response.data.product);
    } catch (error) {
      console.error('Error updating warranty:', error);
      alert(error.response?.data?.message || 'Failed to update warranty');
    } finally {
      setLoading(false);
    }
  };

  const handleExtendWarranty = async () => {
    if (!extendWarranty.additionalMonths || extendWarranty.additionalMonths <= 0) {
      alert('Please enter a valid number of months');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`/api/products/${product._id}/extend-warranty`, extendWarranty);
      setWarrantyInfo(response.data.product);
      setExtendWarranty({ additionalMonths: '' });
      onUpdate(response.data.product);
    } catch (error) {
      console.error('Error extending warranty:', error);
      alert(error.response?.data?.message || 'Failed to extend warranty');
    } finally {
      setLoading(false);
    }
  };

  const getWarrantyStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-success-600 bg-success-50';
      case 'expiring': return 'text-warning-600 bg-warning-50';
      case 'expired': return 'text-danger-600 bg-danger-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getWarrantyStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-5 w-5" />;
      case 'expiring': return <AlertTriangle className="h-5 w-5" />;
      case 'expired': return <X className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  if (!warrantyInfo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading warranty information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Warranty Information</h2>
            <p className="text-gray-600">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Current Warranty Status */}
        <div className="mb-6">
          <div className={`p-4 rounded-lg border ${getWarrantyStatusColor(warrantyInfo.warrantyStatus)}`}>
            <div className="flex items-center space-x-3">
              {getWarrantyStatusIcon(warrantyInfo.warrantyStatus)}
              <div>
                <h3 className="font-semibold capitalize">
                  Warranty {warrantyInfo.warrantyStatus}
                </h3>
                <p className="text-sm">
                  {warrantyInfo.daysUntilExpiry > 0 
                    ? `${warrantyInfo.daysUntilExpiry} days remaining`
                    : `${Math.abs(warrantyInfo.daysUntilExpiry)} days expired`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Warranty Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Date
              </label>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{new Date(warrantyInfo.purchaseDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warranty End Date
              </label>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{new Date(warrantyInfo.warrantyEndDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warranty Period
              </label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{warrantyInfo.warrantyPeriod} months</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Edit Warranty Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Edit Warranty
                </label>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="text-primary-600 hover:text-primary-700 text-sm flex items-center space-x-1"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>{editMode ? 'Cancel' : 'Edit'}</span>
                </button>
              </div>

              {editMode && (
                <div className="space-y-3 p-4 border rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warranty Period (months)
                    </label>
                    <input
                      type="number"
                      value={formData.warrantyPeriod}
                      onChange={(e) => setFormData({...formData, warrantyPeriod: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                      placeholder="12"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warranty Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.warrantyStartDate}
                      onChange={(e) => setFormData({...formData, warrantyStartDate: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Or Set End Date Directly
                    </label>
                    <input
                      type="date"
                      value={formData.warrantyEndDate}
                      onChange={(e) => setFormData({...formData, warrantyEndDate: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <button
                    onClick={handleUpdateWarranty}
                    disabled={loading}
                    className="w-full btn-primary"
                  >
                    {loading ? 'Updating...' : 'Update Warranty'}
                  </button>
                </div>
              )}
            </div>

            {/* Extend Warranty Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extend Warranty
              </label>
              <div className="space-y-3 p-4 border rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Months
                  </label>
                  <input
                    type="number"
                    value={extendWarranty.additionalMonths}
                    onChange={(e) => setExtendWarranty({additionalMonths: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="6"
                    min="1"
                  />
                </div>

                <button
                  onClick={handleExtendWarranty}
                  disabled={loading || !extendWarranty.additionalMonths}
                  className="w-full btn-secondary"
                >
                  {loading ? 'Extending...' : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Extend Warranty
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reminder Information */}
        {warrantyInfo.reminderSent && (
          <div className="mt-6 p-4 bg-info-50 border border-info-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-info-600" />
              <div>
                <h4 className="font-medium text-info-900">Reminder Sent</h4>
                <p className="text-sm text-info-700">
                  Last reminder sent on {new Date(warrantyInfo.lastReminderDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarrantyEditor; 