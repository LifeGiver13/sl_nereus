
import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/env';

interface User {
  id: string;
  username: string;
  email?: string;
  role?: string;
  meta?: any; // for any additional user metadata, e.g. userBucket
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const clearSession = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('session_user');
      localStorage.removeItem('session_token');
    };

    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('session_token');

      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/session`, {
          method: 'GET',
          headers: { 'X-SERVICE-USER': savedToken },
        });

        if (!response.ok) {
          clearSession();
          return;
        }

        const body = (await response.json()) as Record<string, unknown> & {
          serviceUserToken?: string;
        };
        const authToken =
          response.headers.get('X-Service-User') ??
          response.headers.get('X-SERVICE-USER') ??
          (typeof body.serviceUserToken === 'string' ? body.serviceUserToken : savedToken);

        const { serviceUserToken: _t, ...userData } = body;
        void _t;

        setUser(userData as unknown as User);
        setToken(authToken);
        localStorage.setItem('session_user', JSON.stringify(userData));
        localStorage.setItem('session_token', authToken);
      } catch (error) {
        console.error('Session verification error:', error);
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const body = (await response.json()) as Record<string, unknown> & {
        serviceUserToken?: string;
      };
      const authToken =
        response.headers.get("X-Service-User") ??
        (typeof body.serviceUserToken === "string" ? body.serviceUserToken : null);

      if (!authToken) {
        throw new Error("No auth token received");
      }

      const { serviceUserToken: _t, ...userData } = body;
      void _t;
      setUser(userData as unknown as User);
      setToken(authToken);

      localStorage.setItem("session_user", JSON.stringify(userData));
      localStorage.setItem("session_token", authToken);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('session_user');
    localStorage.removeItem('session_token');
    window.location.href = "/";
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
