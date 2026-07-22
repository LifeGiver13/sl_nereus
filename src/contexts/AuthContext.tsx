import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/env';

interface User {
  id: string;
  username: string;
  email?: string;
  role?: string;
  meta?: any; // for any additional user metadata, e.g. userBucket
}

interface AccountDetails {
  id: string;
  username: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

interface ChangePasswordResult {
  success: boolean;
  message?: string;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  isLoading: boolean;
  changeUserPassword: (password: string, id: string) => Promise<ChangePasswordResult>;
  fetchAccountDetails: (id: string) => Promise<AccountDetails | null>;
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

      return userData as unknown as User;
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

  const changeUserPassword = async (
    password: string,
    id: string
  ): Promise<ChangePasswordResult> => {
    try {
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/auth/user/${id}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SERVICE-USER': token,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to update password');
      }

      // Password changed successfully - clear the "temporary password" flag
      // locally so the user isn't redirected to the force-change screen again.
      setUser((prevUser) => {
        if (!prevUser) return prevUser;

        const updatedUser: User = {
          ...prevUser,
          meta: {
            ...prevUser.meta,
            passwordGenerated: false,
          },
        };

        localStorage.setItem('session_user', JSON.stringify(updatedUser));
        return updatedUser;
      });

      return { success: true, message: data.message };
    } catch (error: any) {
      console.error('Password update error:', error);
      return { success: false, error: error.message };
    }
  };

  const fetchAccountDetails = async (id: string): Promise<AccountDetails | null> => {
    try {
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/user/${id}`, {
        method: 'GET',
        headers: { 'X-SERVICE-USER': token },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to fetch account details');
      }

      return data as AccountDetails;
    } catch (error) {
      console.error('Account details fetch error:', error);
      return null;
    }
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
    changeUserPassword,
    fetchAccountDetails,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};