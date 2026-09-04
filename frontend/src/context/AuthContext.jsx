import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('deaturnos_user');
      return (saved && saved !== 'undefined' && saved !== 'null') ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('deaturnos_token');
    if (token) {
      api.getMe()
        .then(res => {
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('deaturnos_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    if (res.success && res.token) {
      localStorage.setItem('deaturnos_token', res.token);
      localStorage.setItem('deaturnos_user', JSON.stringify(res.user));
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.message || 'Error al iniciar sesión');
  };

  const logout = () => {
    localStorage.removeItem('deaturnos_token');
    localStorage.removeItem('deaturnos_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isSupervisor = user?.role === 'SUPERVISOR' || user?.role === 'ADMIN';
  const isFuncionario = user?.role === 'FUNCIONARIO' || isSupervisor;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isSupervisor, isFuncionario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      loading: false,
      login: async () => {},
      logout: () => {},
      isAdmin: false,
      isSupervisor: false,
      isFuncionario: false
    };
  }
  return context;
}
