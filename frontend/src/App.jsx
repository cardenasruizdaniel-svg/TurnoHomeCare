import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomeView } from './views/HomeView';
import { RequestTicketView } from './views/RequestTicketView';
import { MyTicketView } from './views/MyTicketView';
import { PublicDisplayView } from './views/PublicDisplayView';
import { StaffDeskView } from './views/StaffDeskView';
import { LoginView } from './views/LoginView';
import { AdminLayout } from './views/admin/AdminLayout';
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { AdminTicketsView } from './views/admin/AdminTicketsView';
import { AdminServicesView } from './views/admin/AdminServicesView';
import { AdminCountersView } from './views/admin/AdminCountersView';
import { AdminBranchesView } from './views/admin/AdminBranchesView';
import { AdminUsersView } from './views/admin/AdminUsersView';
import { AdminSettingsView } from './views/admin/AdminSettingsView';
import { AdminReportsView } from './views/admin/AdminReportsView';
import { AdminAuditView } from './views/admin/AdminAuditView';
import { useAuth } from './context/AuthContext';

function ProtectedStaffRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      <Navbar />
      <div className="flex-1">
        <Routes>
          {/* Vistas Públicas */}
          <Route path="/" element={<HomeView />} />
          <Route path="/solicitar-turno" element={<RequestTicketView />} />
          <Route path="/turno/:branchId" element={<RequestTicketView />} />
          <Route path="/mi-turno/:id" element={<MyTicketView />} />
          
          {/* Pantalla Pública TV */}
          <Route path="/pantalla" element={<PublicDisplayView />} />
          <Route path="/tv/:branchId" element={<PublicDisplayView />} />

          {/* Autenticación */}
          <Route path="/login" element={<LoginView />} />

          {/* Panel de Funcionario / Ventanilla */}
          <Route
            path="/atencion"
            element={
              <ProtectedStaffRoute>
                <StaffDeskView />
              </ProtectedStaffRoute>
            }
          />

          {/* Módulo de Administración */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardView />} />
            <Route path="turnos" element={<AdminTicketsView />} />
            <Route path="servicios" element={<AdminServicesView />} />
            <Route path="modulos" element={<AdminCountersView />} />
            <Route path="sedes" element={<AdminBranchesView />} />
            <Route path="usuarios" element={<AdminUsersView />} />
            <Route path="configuracion" element={<AdminSettingsView />} />
            <Route path="reportes" element={<AdminReportsView />} />
            <Route path="auditoria" element={<AdminAuditView />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
