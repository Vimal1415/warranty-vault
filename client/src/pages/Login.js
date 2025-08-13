import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, Mail, Package, Bell, Zap, Eye, EyeOff, User, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const Login = () => {
  const { handleAuthCallback, login, loginWithGoogle } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (token) {
      handleAuthCallback(token);
    } else if (error) {
      toast.error('Login failed. Please try again.');
    }
  }, [location, handleAuthCallback]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await axios.post(endpoint, formData);
      
      if (response.data.token) {
        login(response.data.token, response.data.user);
        toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.error || 'An error occurred';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Mail,
      title: 'Smart Email Parsing',
      description: 'Automatically extracts warranty information from your purchase emails'
    },
    {
      icon: Package,
      title: 'Product Dashboard',
      description: 'Track all your products with expiry countdowns and categories'
    },
    {
      icon: Bell,
      title: 'Smart Reminders',
      description: 'Get notified before warranties expire with customizable alerts'
    },
    {
      icon: Zap,
      title: 'Zero Effort',
      description: 'No manual data entry required - just connect your Gmail'
    }
  ];

  const handleGoogleLogin = () => {
    console.log("Google login button clicked");
    window.location.href = "http://localhost:5000/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div className="flex min-h-screen">
        {/* Left side - Features */}
        <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-12 lg:py-12">
          <div className="mx-auto max-w-md">
            <div className="flex items-center mb-8">
              <Shield className="h-12 w-12 text-primary-600" />
              <h1 className="ml-3 text-3xl font-bold text-gray-900">WarrantyVault</h1>
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Never Miss a Warranty Expiry Again
            </h2>
            
            <p className="text-lg text-gray-600 mb-8">
              Connect your Gmail and let our smart system automatically track all your product warranties. 
              Get timely reminders and never lose money on expired warranties.
            </p>

            <div className="space-y-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-100">
                        <Icon className="h-6 w-6 text-primary-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-4 bg-primary-50 rounded-lg">
              <h4 className="font-medium text-primary-900 mb-2">Supported Platforms</h4>
              <div className="flex space-x-4 text-sm text-primary-700">
                <span>Amazon</span>
                <span>Flipkart</span>
                <span>Croma</span>
                <span>Best Buy</span>
                <span>Walmart</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login/Register */}
        <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div className="lg:hidden mb-8">
              <div className="flex items-center justify-center">
                <Shield className="h-12 w-12 text-primary-600" />
                <h1 className="ml-3 text-3xl font-bold text-gray-900">WarrantyVault</h1>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="text-2xl font-bold text-gray-900 text-center">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="mt-2 text-sm text-gray-600 text-center">
                  {isLogin ? 'Sign in to continue' : 'Join WarrantyVault today'}
                </p>
              </div>

              <div className="card-body">
                <div className="space-y-6">
                  {/* Google OAuth Button */}
                  <div>
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full btn-primary flex items-center justify-center"
                      disabled={loading}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  {/* Email/Password Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required={!isLogin}
                            className="input pl-10"
                            placeholder="Enter your full name"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="input pl-10"
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          className="input pl-10 pr-10"
                          placeholder="Enter your password"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full btn-secondary"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {isLogin ? 'Signing in...' : 'Creating account...'}
                        </div>
                      ) : (
                        isLogin ? 'Sign In' : 'Create Account'
                      )}
                    </button>
                  </form>

                  {/* Toggle Login/Register */}
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                      <button
                        onClick={() => {
                          setIsLogin(!isLogin);
                          setFormData({ email: '', password: '', name: '' });
                        }}
                        className="text-primary-600 hover:text-primary-500 font-medium"
                      >
                        {isLogin ? 'Sign up' : 'Sign in'}
                      </button>
                    </p>
                  </div>

                  {isLogin && (
                    <div className="text-center">
                      <button className="text-sm text-primary-600 hover:text-primary-500">
                        Forgot your password?
                      </button>
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      By signing in, you agree to our{' '}
                      <button className="text-primary-600 hover:text-primary-500 underline bg-transparent border-none p-0">
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button className="text-primary-600 hover:text-primary-500 underline bg-transparent border-none p-0">
                        Privacy Policy
                      </button>
                    </p>
                  </div>
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">
                      How it works
                    </h3>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-center justify-center">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-600">1</span>
                        </div>
                        <span className="ml-3">Connect your Gmail account</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-600">2</span>
                        </div>
                        <span className="ml-3">We scan your purchase emails</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-600">3</span>
                        </div>
                        <span className="ml-3">Get smart warranty reminders</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 