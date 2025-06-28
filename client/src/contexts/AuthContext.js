import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Add token to requests
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Handle token expiration
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
        toast.error('Session expired. Please login again.');
      }
      return Promise.reject(error);
    }
  );

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Login with Google OAuth
  const loginWithGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  // Login with email/password or token
  const login = (token, userData = null) => {
    localStorage.setItem('token', token);
    if (userData) {
      setUser(userData);
    } else {
      // Fetch user data if not provided
      axios.get('/api/auth/me')
        .then(response => {
          setUser(response.data);
        })
        .catch(error => {
          console.error('Failed to fetch user data:', error);
          toast.error('Login failed. Please try again.');
        });
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  // Handle OAuth callback
  const handleAuthCallback = (token) => {
    localStorage.setItem('token', token);
    // Fetch user data
    axios.get('/api/auth/me')
      .then(response => {
        setUser(response.data);
        toast.success('Login successful!');
      })
      .catch(error => {
        console.error('Failed to fetch user data:', error);
        toast.error('Login failed. Please try again.');
      });
  };

  // Update user data
  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    logout,
    handleAuthCallback,
    updateUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 