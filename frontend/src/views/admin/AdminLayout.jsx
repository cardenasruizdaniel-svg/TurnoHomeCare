import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/Modal';

export function AdminLayout() {
  const { user, loading, isSupervisor } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner text="Verificando permisos..." />
      </div>
    );
  }

  if (!user || !isSupervisor) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
}
