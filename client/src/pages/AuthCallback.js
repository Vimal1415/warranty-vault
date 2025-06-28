import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleAuthCallback } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const redirect = params.get('redirect');
    
    if (token) {
      handleAuthCallback(token);
      
      // Redirect to the specified page or dashboard
      if (redirect === 'email-sync') {
        navigate('/email-sync');
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate('/login');
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Signing you in...</div>
    </div>
  );
};

export default AuthCallback; 