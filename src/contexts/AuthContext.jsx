import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../utils/api';
import { AuthContext } from './AuthContextValue';
import { login as apiLogin, logout as apiLogout } from '../api/auth';

const INACTIVITY_LIMIT = 30 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimeout = useRef(null);

  // Listen for logout in other tabs and broadcast logout
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === 'token' && event.oldValue && !event.newValue) {
        // Token was removed in another tab
        setUser(null);
      }
      if (event.key === 'user' && event.oldValue && !event.newValue) {
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      setUser(null);
    }
  }, []);

  // Listen for explicit logout broadcast
  useEffect(() => {
    const onLogoutEvent = (event) => {
      if (event.key === 'logout-event') {
        setUser(null);
      }
    };
    window.addEventListener('storage', onLogoutEvent);
    return () => window.removeEventListener('storage', onLogoutEvent);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    if (user) {
      inactivityTimeout.current = setTimeout(() => {
        logout();
      }, INACTIVITY_LIMIT);
    }
  }, [user, logout]);

  // Set up event listeners for user activity
  useEffect(() => {
    if (user) {
      const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
      events.forEach(event => window.addEventListener(event, resetInactivityTimer));
      resetInactivityTimer();
      return () => {
        events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
        if (inactivityTimeout.current) {
          clearTimeout(inactivityTimeout.current);
        }
      };
    } else {
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
      }
    }
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const data = await apiLogin(email, password);
      if (data.success) {
        const userData = data.data.employee;
        const token = data.data.token;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 