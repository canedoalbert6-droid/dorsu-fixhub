// ViewModel: Authentication state and logic

import { useState, useEffect } from 'react';
import { isTokenValid, saveAuth, clearAuth, getRole } from '../models/authModel';
import * as authService from '../services/authService';

/**
 * Manages authentication state across the app.
 * Used by App.jsx (root) and LoginPage.jsx.
 */
export const useAuthViewModel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const valid = isTokenValid();
    if (!valid) clearAuth();
    return valid;
  });

  const login = async (username, password) => {
    const data = await authService.login(username, password);
    if (data.success) {
      saveAuth({ 
        token: data.token, 
        role: data.user.role, 
        name: data.user.name,
        id: data.user.id 
      });
      setIsAuthenticated(true);
    }
    return data;
  };

  const logout = () => {
    clearAuth();
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    setIsAuthenticated,
    login,
    logout,
    userRole: getRole(),
  };
};
