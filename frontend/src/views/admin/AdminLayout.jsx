import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LoadingSpinner } from '../../components/Modal';

export function AdminLayout() {
  const { user, loading, hasPermission } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <LoadingSpinner text="Verificando permisos de acceso..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar si el usuario tiene al menos 1 permiso administrativo o de atención
  const hasAnyAccess = user.role === 'ADMIN' || (Array.isArray(user.permissions) && user.permissions.length > 0) || user.role === 'SUPERVISOR' || user.role === 'FUNCIONARIO';
  if (!hasAnyAccess) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`flex min-h-screen font-sans transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <Sidebar />
      <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
}
