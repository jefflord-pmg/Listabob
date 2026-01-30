import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = 'listabob_auth';

interface StoredAuth {
  token: string;
  revoke_timestamp: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }

    try {
      const auth: StoredAuth = JSON.parse(stored);
      const response = await api.post('/auth/verify', {
        token: auth.token,
        revoke_timestamp: auth.revoke_timestamp,
      });

      if (response.data.valid) {
        setIsAuthenticated(true);
      } else {
        // Token was revoked or invalid
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (error) {
      // Auth check failed, clear stored auth
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    setIsLoading(false);
  };

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await api.post('/auth/login', { password });
      const { token, revoke_timestamp } = response.data;

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, revoke_timestamp }));
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
