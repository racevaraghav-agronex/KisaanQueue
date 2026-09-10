import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword?: string;
  }) => Promise<{ success: boolean; user?: User; error?: string }>;
  updateProfile: (data: { name: string; phone: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserCounter: (counter: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('kisan_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check existing session on load
  useEffect(() => {
    async function checkAuth() {
      const savedToken = localStorage.getItem('kisan_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await safeFetchJson<{ user: User }>('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${savedToken}`
          }
        });

        if (res.ok && res.data?.user) {
          setUser(res.data.user);
          setToken(savedToken);
        } else {
          localStorage.removeItem('kisan_token');
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.warn('Session validation notice:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = async (emailOrPhone: string, password: string) => {
    try {
      const res = await safeFetchJson<{ token: string; user: User; error?: string }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone, password })
      });

      if (!res.ok || !res.data?.token) {
        return { success: false, error: res.error || res.data?.error || 'Invalid credentials' };
      }

      localStorage.setItem('kisan_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const register = async (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword?: string;
  }) => {
    try {
      const res = await safeFetchJson<{ token: string; user: User; error?: string }>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!res.ok || !res.data?.token) {
        return { success: false, error: res.error || res.data?.error || 'Registration failed' };
      }

      localStorage.setItem('kisan_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  };

  const updateProfile = async (data: { name: string; phone: string }) => {
    try {
      const activeToken = token || localStorage.getItem('kisan_token');
      const res = await safeFetchJson<{ user: User; error?: string; message?: string }>('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify(data)
      });

      if (!res.ok || !res.data?.user) {
        return { success: false, error: res.error || res.data?.error || 'Failed to update profile' };
      }

      setUser(res.data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error updating profile' };
    }
  };

  const logout = () => {
    localStorage.removeItem('kisan_token');
    setUser(null);
    setToken(null);
    window.history.pushState({}, '', '/');
  };

  const updateUserCounter = (counter: number) => {
    if (user) {
      setUser({ ...user, counterNumber: counter });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        updateProfile,
        logout,
        updateUserCounter
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
