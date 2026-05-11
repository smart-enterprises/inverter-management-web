import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContextValue';
import { login as apiLogin, logout as apiLogout } from '../api/auth.js';
import { deregisterAllFcmTokens } from '../api/notifications.js';
import { canManageUsers } from '../utils/roles';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await deregisterAllFcmTokens();
      await apiLogout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActive');
      setUser(null);
    }
  }, []);

  // Listen for explicit logout broadcast
  useEffect(() => {
    const onLogoutEvent = (event) => {
      if (event.key === 'logout-event') {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      }

      if (event.key === "token" && event.oldValue && !event.newValue) {
        setUser(null);
      }
    };

    window.addEventListener('storage', onLogoutEvent);
    return () => window.removeEventListener('storage', onLogoutEvent);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
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

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));

        setUser(userData);

        return { success: true, message: data.message };
      }

      return {
        success: false,
        message: data.message || "Login failed",
      };
    } catch (error) {
      console.error("Login error:", error);

      return {
        success: false,
        message: "Network error. Please try again.",
      };
    }
  };

  const isAuthenticated = () => !!user;

  const hasRole = (roles = []) => {
    if (!Array.isArray(roles) || roles.length === 0) return false;
    return roles.includes(user?.role);
  };

  const canManageUsersFromRole = () => canManageUsers(user?.role);

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    loading,
    hasRole,
    canManageUsers: canManageUsersFromRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
