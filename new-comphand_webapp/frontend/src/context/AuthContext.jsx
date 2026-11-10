import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();

    // Global fetch interceptor to handle 401 Unauthorized responses (Session Timeout)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      // If we get a 401 and it's not a login or logout attempt, log the user out
      if (response.status === 401) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
        if (!url.includes('/api/auth/login') && !url.includes('/api/auth/logout') && !url.includes('/api/auth/me')) {
          setUser(null);
        }
      }
      return response;
    };

    return () => {
      // Cleanup interceptor
      window.fetch = originalFetch;
    };
  }, []);

  const login = async (user_id, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, password }),
    });

    if (response.ok) {
      await fetchMe();
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.detail || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  const changePassword = async (old_password, new_password, confirm_password) => {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_password, new_password, confirm_password }),
    });

    if (response.ok) {
      await fetchMe();
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.detail };
    }
  };

  const hasPermission = (permissionCode) => {
    if (!user || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes(permissionCode);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);