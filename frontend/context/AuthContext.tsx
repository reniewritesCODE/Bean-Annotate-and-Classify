'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  username: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore auth state from localStorage immediately
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }

    // Verify token in background (optional - won't block auth)
    const verifyToken = async () => {
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });

        if (response.ok) {
          const userData = await response.json();
          setToken(storedToken);
          setUser(userData);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(userData));
        } else if (response.status === 401 || response.status === 403) {
          // Token explicitly invalid - clear session
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
        // For other errors (500, 404, etc), keep existing session
      } catch (error) {
        // Network error or endpoint doesn't exist - keep session alive
        console.log('Token verification unavailable, keeping session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    isAuthenticated,
    token,
    user,
    login,
    logout,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
