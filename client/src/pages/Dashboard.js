import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Mail, 
  Settings,
  TrendingUp,
  Calendar,
  Shield,
  Bell
} from 'lucide-react';
import StatCard from '../components/StatCard';
import QuickActionCard from '../components/QuickActionCard';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0
  });
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch product statistics
        const statsResponse = await axios.get('/api/products/stats');
        setStats(statsResponse.data);

        // Fetch recent products
        const productsResponse = await axios.get('/api/products?limit=5&sortBy=purchaseDate&sortOrder=desc');
        setRecentProducts(productsResponse.data.products || []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
        // Set default values on error
        setStats({
          total: 0,
          active: 0,
          expiringSoon: 0,
          expired: 0
        });
        setRecentProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusColor = (daysLeft) => {
    if (daysLeft < 0) return 'danger';
    if (daysLeft <= 30) return 'warning';
    return 'success';
  };

  const getStatusText = (daysLeft) => {
    if (daysLeft < 0) return 'Expired';
    if (daysLeft <= 30) return 'Expiring Soon';
    return 'Active';
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name || 'User'}!</p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary-600" />
          <span className="text-lg font-semibold text-gray-900">WarrantyVault</span>
        </div>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={stats.total}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Active Warranties"
          value={stats.active}
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          title="Expiring Soon"
          value={stats.expiringSoon}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="Expired"
          value={stats.expired}
          icon={Clock}
          color="danger"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickActionCard
          title="Add Product"
          description="Manually add a new product to track"
          icon={Plus}
          href="/add-product"
          color="primary"
        />
        <QuickActionCard
          title="Sync Emails"
          description="Scan Gmail for purchase emails"
          icon={Mail}
          href="/email-sync"
          color="success"
        />
        <QuickActionCard
          title="Reminders"
          description="Manage warranty expiry notifications"
          icon={Bell}
          href="/reminders"
          color="warning"
        />
        <QuickActionCard
          title="Settings"
          description="Configure reminders and preferences"
          icon={Settings}
          href="/settings"
          color="secondary"
        />
      </div>

      {/* Recent Products */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Recent Products</h2>
          <p className="text-sm text-gray-600">Your recently added products</p>
        </div>
        <div className="card-body">
          {recentProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No products added yet</p>
              <p className="text-sm text-gray-500">Start by adding your first product</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${getStatusColor(product.daysLeft) === 'danger' ? 'bg-danger-50 text-danger-600' : getStatusColor(product.daysLeft) === 'warning' ? 'bg-warning-50 text-warning-600' : 'bg-success-50 text-success-600'}`}>
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-600">{product.vendor} • {product.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getStatusColor(product.daysLeft) === 'danger' ? 'text-danger-600' : getStatusColor(product.daysLeft) === 'warning' ? 'text-warning-600' : 'text-success-600'}`}>
                      {getStatusText(product.daysLeft)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.daysLeft < 0 
                        ? `${Math.abs(product.daysLeft)} days ago`
                        : `${product.daysLeft} days left`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Expiries */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Upcoming Expiries</h2>
          <p className="text-sm text-gray-600">Products expiring in the next 30 days</p>
        </div>
        <div className="card-body">
          {stats.expiringSoon === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-success-400 mx-auto mb-4" />
              <p className="text-gray-600">No products expiring soon</p>
              <p className="text-sm text-gray-500">All your warranties are safe</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentProducts.filter(p => p.daysLeft <= 30 && p.daysLeft > 0).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border border-warning-200 rounded-lg bg-warning-50">
                  <div className="flex items-center space-x-4">
                    <AlertTriangle className="h-5 w-5 text-warning-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-600">{product.vendor}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-warning-600">
                      {product.daysLeft} days left
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires: {new Date(product.warrantyEndDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 