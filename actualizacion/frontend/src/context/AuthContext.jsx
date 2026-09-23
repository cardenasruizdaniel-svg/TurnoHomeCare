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

  const hasPermission = (permissionKey) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (Array.isArray(user.permissions)) {
      return user.permissions.includes(permissionKey);
    }
    if (user.role === 'SUPERVISOR') {
      return ['dashboard', 'attention', 'history_tickets', 'schedule', 'services', 'counters', 'reports'].includes(permissionKey);
    }
    if (user.role === 'FUNCIONARIO') {
      return ['attention', 'history_tickets', 'schedule'].includes(permissionKey);
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isSupervisor, isFuncionario, hasPermission }}>
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
      isFuncionario: false,
      hasPermission: () => false
    };
  }
  return context;
}
