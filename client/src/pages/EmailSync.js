import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Shield, 
  CheckCircle, 
  X, 
  RefreshCw, 
  AlertTriangle, 
  Package,
  Download,
  Upload,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  ShoppingBag,
  Info
} from 'lucide-react';
import axios from 'axios';

const EmailSync = () => {
  const [emailStatus, setEmailStatus] = useState(null);
  const [syncResults, setSyncResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // Check Gmail connection status
  useEffect(() => {
    checkEmailStatus();
  }, []);

  const checkEmailStatus = async () => {
    try {
      const response = await axios.get('/api/emails/status');
      setEmailStatus(response.data);
    } catch (error) {
      console.error('Error checking email status:', error);
      setEmailStatus({ connected: false, message: 'Failed to check status' });
    }
  };

  const syncEmails = async () => {
    setLoading(true);
    setSyncResults(null);
    
    try {
      console.log('Starting email sync...');
      const response = await axios.get('/api/emails/sync');
      console.log('Sync response:', response.data);
      setSyncResults(response.data);
    } catch (error) {
      console.error('Error syncing emails:', error);
      const errorMessage = error.response?.data?.message || 'Failed to sync emails';
      alert(`Email sync failed: ${errorMessage}`);
      
      // If it's a Gmail connection issue, show helpful message
      if (error.response?.status === 400 && errorMessage.includes('Gmail access token')) {
        alert('Please connect your Gmail account first by clicking "Connect Gmail"');
      }
    } finally {
      setLoading(false);
    }
  };

  const importSelectedEmails = async () => {
    if (selectedEmails.length === 0) {
      alert('Please select emails to import');
      return;
    }

    setImporting(true);
    setImportResults(null);
    
    try {
      const response = await axios.post('/api/emails/import', {
        emailIds: selectedEmails
      });
      
      setImportResults(response.data);
      setSelectedEmails([]);
      // Refresh sync results to update the list
      if (syncResults) {
        syncEmails();
      }
    } catch (error) {
      console.error('Error importing emails:', error);
      alert(error.response?.data?.message || 'Failed to import products');
    } finally {
      setImporting(false);
    }
  };

  const handleEmailSelect = (emailId) => {
    setSelectedEmails(prev => 
      prev.includes(emailId) 
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    );
  };

  const handleSelectAll = () => {
    if (syncResults && syncResults.parsedEmails) {
      if (selectedEmails.length === syncResults.parsedEmails.length) {
        setSelectedEmails([]);
      } else {
        setSelectedEmails(syncResults.parsedEmails.map(item => item.email.id));
      }
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'danger';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPrice = (price) => {
    return price ? `$${price.toFixed(2)}` : 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Sync</h1>
          <p className="text-gray-600">Import products from your Gmail purchase emails</p>
        </div>
        <div className="flex items-center space-x-2">
          <Mail className="h-8 w-8 text-primary-600" />
          <span className="text-lg font-semibold text-gray-900">WarrantyVault</span>
        </div>
      </div>

      {/* Gmail Connection Status */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Gmail Connection</h2>
          <p className="text-sm text-gray-600">Manage your Gmail integration</p>
        </div>
        <div className="card-body">
          {emailStatus ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${
                  emailStatus.connected 
                    ? 'bg-success-50 text-success-600 border-success-200' 
                    : 'bg-danger-50 text-danger-600 border-danger-200'
                } border`}>
                  {emailStatus.connected ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <X className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {emailStatus.connected ? 'Gmail Connected' : 'Gmail Not Connected'}
                  </p>
                  <p className="text-sm text-gray-600">{emailStatus.message}</p>
                  {emailStatus.totalEmails && (
                    <p className="text-xs text-gray-500">
                      {emailStatus.totalEmails.toLocaleString()} emails in your inbox
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={checkEmailStatus}
                  className="btn-secondary"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
                {emailStatus.connected ? (
                  <button
                    onClick={syncEmails}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Sync Emails
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      console.log('Connecting to Gmail...');
                      window.location.href = 'http://localhost:5000/api/auth/google?redirect=email-sync';
                    }}
                    className="btn-primary"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Connect Gmail
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking Gmail connection...</p>
            </div>
          )}
          
          {/* Helpful message about test users */}
          {emailStatus && !emailStatus.connected && (
            <div className="mt-4 p-4 bg-warning-50 border border-warning-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-warning-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning-800">Google OAuth Test User Restriction</p>
                  <p className="text-sm text-warning-700 mt-1">
                    Your Google OAuth app is in testing mode. Only test users can connect Gmail. 
                    You can still use the app by adding products manually through the "Add Product" page.
                  </p>
                  <p className="text-xs text-warning-600 mt-2">
                    To enable Gmail for everyone, submit your app for Google verification (takes 6-8 weeks).
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Debug Info */}
          {syncResults && syncResults.stats.totalEmails > 0 && syncResults.stats.parsedEmails === 0 && (
            <div className="mt-4 p-4 bg-info-50 border border-info-200 rounded-lg">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-info-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-info-800">No Purchase Emails Found</p>
                  <p className="text-sm text-info-700 mt-1">
                    The system scanned {syncResults.stats.totalEmails} emails but found no purchase receipts. 
                    This could mean:
                  </p>
                  <ul className="text-xs text-info-600 mt-2 list-disc list-inside">
                    <li>Your purchase emails are older than 6 months</li>
                    <li>Emails are from vendors not yet supported</li>
                    <li>Email format doesn't match expected patterns</li>
                    <li>Purchase emails are in a different folder</li>
                  </ul>
                  <p className="text-xs text-info-600 mt-2">
                    Check your server console for detailed logs of what emails were processed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Results */}
      {importResults && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Import Results</h2>
            <p className="text-sm text-gray-600">Products imported from emails</p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-success-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-success-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-success-600">{importResults.stats.imported}</p>
                <p className="text-sm text-gray-600">Imported</p>
              </div>
              <div className="text-center p-4 bg-warning-50 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-warning-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-warning-600">{importResults.stats.failed}</p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Package className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-600">{importResults.stats.total}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
            
            {importResults.importedProducts.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Imported Products:</h3>
                <div className="space-y-2">
                  {importResults.importedProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-success-600" />
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.vendor}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{formatPrice(product.price)}</p>
                        <p className="text-xs text-gray-500">{product.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Results */}
      {syncResults && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Found Purchase Emails</h2>
                <p className="text-sm text-gray-600">
                  {syncResults.stats.parsedEmails} emails ready to import • {syncResults.stats.skippedEmails} skipped
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="btn-secondary"
                >
                  {selectedEmails.length === syncResults.parsedEmails.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={importSelectedEmails}
                  disabled={selectedEmails.length === 0 || importing}
                  className="btn-primary"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Selected ({selectedEmails.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="card-body">
            {syncResults.parsedEmails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No purchase emails found</p>
                <p className="text-sm text-gray-500">Try syncing again or check your email filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {syncResults.parsedEmails.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(item.email.id)}
                          onChange={() => handleEmailSelect(item.email.id)}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <p className="font-medium text-gray-900">{item.parsedProduct.name}</p>
                            <span className={`badge badge-${getConfidenceColor(item.parsedProduct.confidence)}`}>
                              {getConfidenceText(item.parsedProduct.confidence)} Confidence
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <Shield className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">{item.parsedProduct.vendor}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">{formatPrice(item.parsedProduct.price)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">{formatDate(item.parsedProduct.purchaseDate)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Package className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">{item.parsedProduct.category}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            From: {item.email.from} • Subject: {item.email.subject}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`/api/emails/preview/${item.email.id}`, '_blank')}
                        className="text-primary-600 hover:text-primary-800"
                        title="Preview Email"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">How It Works</h2>
          <p className="text-sm text-gray-600">Understanding the email sync process</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-3 bg-primary-50 rounded-lg w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">1. Connect Gmail</h3>
              <p className="text-sm text-gray-600">
                Securely connect your Gmail account to scan for purchase emails
              </p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-success-50 rounded-lg w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-success-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">2. Smart Parsing</h3>
              <p className="text-sm text-gray-600">
                AI automatically extracts product info, prices, and warranty details
              </p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-warning-50 rounded-lg w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Upload className="h-6 w-6 text-warning-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">3. Import Products</h3>
              <p className="text-sm text-gray-600">
                Review and import products with automatic warranty tracking
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSync; 