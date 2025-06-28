import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Calendar, 
  Building, 
  Hash, 
  DollarSign, 
  FileText,
  Upload,
  X,
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';

const AddProduct = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    vendor: '',
    purchaseDate: '',
    warrantyEndDate: '',
    serialNumber: '',
    price: '',
    description: '',
    receiptImage: null,
    warrantyDocument: null
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const categories = [
    'Electronics',
    'Appliances',
    'Furniture',
    'Clothing',
    'Books',
    'Sports Equipment',
    'Tools',
    'Automotive',
    'Home & Garden',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        [field]: file
      }));
      
      if (field === 'receiptImage' && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
      }
    }
  };

  const removeFile = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: null
    }));
    if (field === 'receiptImage') {
      setImagePreview(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required';
    }

    if (!formData.warrantyEndDate) {
      newErrors.warrantyEndDate = 'Warranty end date is required';
    }

    if (formData.purchaseDate && formData.warrantyEndDate) {
      const purchaseDate = new Date(formData.purchaseDate);
      const warrantyDate = new Date(formData.warrantyEndDate);
      
      if (warrantyDate <= purchaseDate) {
        newErrors.warrantyEndDate = 'Warranty end date must be after purchase date';
      }
    }

    if (formData.price && isNaN(formData.price)) {
      newErrors.price = 'Price must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Debug: Check if user is authenticated
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      console.log('Token value:', token ? token.substring(0, 20) + '...' : 'No token');
      
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });

      const response = await axios.post('/api/products', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        navigate('/products');
      } else {
        alert(response.data.message || 'Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateWarrantyDays = () => {
    if (formData.warrantyEndDate) {
      const today = new Date();
      const warrantyDate = new Date(formData.warrantyEndDate);
      const diffTime = warrantyDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return null;
  };

  const warrantyDays = calculateWarrantyDays();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
            <p className="text-gray-600">Track your product warranty</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Package className="h-8 w-8 text-primary-600" />
          <span className="text-lg font-semibold text-gray-900">WarrantyVault</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            <p className="text-sm text-gray-600">Product details and identification</p>
          </div>
          <div className="card-body space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`input ${errors.name ? 'border-danger-500' : ''}`}
                  placeholder="e.g., MacBook Pro 13-inch"
                />
                {errors.name && <p className="text-danger-600 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`input ${errors.category ? 'border-danger-500' : ''}`}
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && <p className="text-danger-600 text-sm mt-1">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor/Manufacturer *
                </label>
                <input
                  type="text"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleInputChange}
                  className={`input ${errors.vendor ? 'border-danger-500' : ''}`}
                  placeholder="e.g., Apple, Samsung, Dell"
                />
                {errors.vendor && <p className="text-danger-600 text-sm mt-1">{errors.vendor}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serial Number
                </label>
                <input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Optional serial number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="input"
                placeholder="Additional details about the product..."
              />
            </div>
          </div>
        </div>

        {/* Purchase & Warranty Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Purchase & Warranty</h2>
            <p className="text-sm text-gray-600">Dates and warranty information</p>
          </div>
          <div className="card-body space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Date *
                </label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                  className={`input ${errors.purchaseDate ? 'border-danger-500' : ''}`}
                />
                {errors.purchaseDate && <p className="text-danger-600 text-sm mt-1">{errors.purchaseDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warranty End Date *
                </label>
                <input
                  type="date"
                  name="warrantyEndDate"
                  value={formData.warrantyEndDate}
                  onChange={handleInputChange}
                  className={`input ${errors.warrantyEndDate ? 'border-danger-500' : ''}`}
                />
                {errors.warrantyEndDate && <p className="text-danger-600 text-sm mt-1">{errors.warrantyEndDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Price
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className={`input pl-10 ${errors.price ? 'border-danger-500' : ''}`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                {errors.price && <p className="text-danger-600 text-sm mt-1">{errors.price}</p>}
              </div>
            </div>

            {warrantyDays !== null && (
              <div className={`p-4 rounded-lg ${
                warrantyDays < 0 
                  ? 'bg-danger-50 border border-danger-200' 
                  : warrantyDays <= 30 
                    ? 'bg-warning-50 border border-warning-200'
                    : 'bg-success-50 border border-success-200'
              }`}>
                <p className={`text-sm font-medium ${
                  warrantyDays < 0 
                    ? 'text-danger-800' 
                    : warrantyDays <= 30 
                      ? 'text-warning-800'
                      : 'text-success-800'
                }`}>
                  {warrantyDays < 0 
                    ? `Warranty expired ${Math.abs(warrantyDays)} days ago`
                    : warrantyDays === 0
                      ? 'Warranty expires today'
                      : warrantyDays === 1
                        ? 'Warranty expires tomorrow'
                        : `Warranty expires in ${warrantyDays} days`
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Documents & Receipts */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Documents & Receipts</h2>
            <p className="text-sm text-gray-600">Upload receipts and warranty documents</p>
          </div>
          <div className="card-body space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt Image
                </label>
                <div className="space-y-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Receipt preview" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile('receiptImage')}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Upload receipt image</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'receiptImage')}
                        className="hidden"
                        id="receiptImage"
                      />
                      <label htmlFor="receiptImage" className="btn-secondary mt-2">
                        Choose File
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warranty Document
                </label>
                <div className="space-y-4">
                  {formData.warrantyDocument ? (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-primary-600" />
                        <span className="text-sm font-medium">{formData.warrantyDocument.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile('warrantyDocument')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Upload warranty document</p>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileChange(e, 'warrantyDocument')}
                        className="hidden"
                        id="warrantyDocument"
                      />
                      <label htmlFor="warrantyDocument" className="btn-secondary mt-2">
                        Choose File
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding Product...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Add Product
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct; 