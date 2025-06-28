import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Building,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  SortAsc,
  SortDesc,
  Download,
  Upload,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import WarrantyEditor from '../components/WarrantyEditor';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showWarrantyEditor, setShowWarrantyEditor] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState(null);

  const categories = [
    'All Categories',
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

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'expiring', label: 'Expiring Soon' },
    { value: 'expired', label: 'Expired' }
  ];

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setProducts(response.data.products || []);
      setFilteredProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products. Please try again.');
      // Fallback to empty array
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter && categoryFilter !== 'All Categories') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(product => product.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'vendor':
          aValue = a.vendor.toLowerCase();
          bValue = b.vendor.toLowerCase();
          break;
        case 'purchaseDate':
          aValue = new Date(a.purchaseDate);
          bValue = new Date(b.purchaseDate);
          break;
        case 'warrantyEndDate':
          aValue = new Date(a.warrantyEndDate);
          bValue = new Date(b.warrantyEndDate);
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'daysLeft':
          aValue = a.daysLeft;
          bValue = b.daysLeft;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'expiring': return 'warning';
      case 'expired': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'expiring': return <AlertTriangle className="h-4 w-4" />;
      case 'expired': return <Clock className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id || p._id));
    }
  };

  const handleDeleteSelected = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      
      // Call API to delete products
      for (const productId of selectedProducts) {
        await axios.delete(`/api/products/${productId}`);
      }
      
      // Remove deleted products from local state
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id || p._id)));
      setSelectedProducts([]);
      setShowDeleteModal(false);
      
      // Show success message
      toast.success(`${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''} deleted successfully`);
      
      // Refetch products to ensure UI is in sync
      await fetchProducts();
      
    } catch (error) {
      console.error('Error deleting products:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete products';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const exportProducts = () => {
    // Export functionality would go here
    alert('Export functionality coming soon!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your product warranties</p>
        </div>
        <Link to="/add-product" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Link>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card bg-danger-50 border-danger-200">
          <div className="card-body">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-danger-600 mr-2" />
              <p className="text-danger-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="input"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="vendor-asc">Vendor (A-Z)</option>
              <option value="vendor-desc">Vendor (Z-A)</option>
              <option value="purchaseDate-desc">Purchase Date (Newest)</option>
              <option value="purchaseDate-asc">Purchase Date (Oldest)</option>
              <option value="warrantyEndDate-asc">Warranty (Expiring Soon)</option>
              <option value="warrantyEndDate-desc">Warranty (Expiring Later)</option>
              <option value="price-desc">Price (High to Low)</option>
              <option value="price-asc">Price (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="card bg-primary-50 border-primary-200">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <p className="text-primary-800">
                {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleDeleteSelected}
                  className="btn-danger"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="card">
        <div className="card-body p-0">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No products found</p>
              <p className="text-sm text-gray-500">Try adjusting your filters or add your first product</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell w-12">
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === filteredProducts.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="table-header-cell">Product</th>
                    <th className="table-header-cell">Vendor</th>
                    <th className="table-header-cell">Purchase Date</th>
                    <th className="table-header-cell">Warranty End</th>
                    <th className="table-header-cell">Price</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredProducts.map((product, index) => (
                    <tr key={product.id || product._id || index} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id || product._id)}
                          onChange={() => handleSelectProduct(product.id || product._id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.category}</div>
                          {product.serialNumber && (
                            <div className="text-xs text-gray-400">SN: {product.serialNumber}</div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <Building className="h-4 w-4 text-gray-400 mr-2" />
                          {product.vendor}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(product.purchaseDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(product.warrantyEndDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="table-cell">
                        {product.price ? (
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                            {product.price.toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={`badge badge-${getStatusColor(product.status)}`}>
                          {getStatusIcon(product.status)}
                          <span className="ml-1">
                            {product.status === 'active' ? 'Active' :
                             product.status === 'expiring' ? 'Expiring Soon' :
                             product.status === 'expired' ? 'Expired' : 'Unknown'}
                          </span>
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => alert(`View details for ${product.name}`)}
                            className="text-primary-600 hover:text-primary-800"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowWarrantyEditor(true);
                            }}
                            className="text-warning-600 hover:text-warning-800"
                            title="Edit Warranty"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProducts([product.id || product._id]);
                              setShowDeleteModal(true);
                            }}
                            className="text-danger-600 hover:text-danger-800"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warranty Editor Modal */}
      {showWarrantyEditor && selectedProduct && (
        <WarrantyEditor
          product={selectedProduct}
          onClose={() => {
            setShowWarrantyEditor(false);
            setSelectedProduct(null);
          }}
          onUpdate={(updatedProduct) => {
            // Update the product in the list
            setProducts(prevProducts => 
              prevProducts.map(p => 
                p.id === selectedProduct.id 
                  ? { ...p, ...updatedProduct }
                  : p
              )
            );
            setShowWarrantyEditor(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
};

export default Products; 