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
    // Check local storage for token on initial load
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('access_token');
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
        } else {
          // Token invalid or expired
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Session recovery failed:', error);
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
