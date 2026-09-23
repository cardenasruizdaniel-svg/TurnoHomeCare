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
import { AdminScheduleView } from './views/admin/AdminScheduleView';
import { AdminTicketsView } from './views/admin/AdminTicketsView';
import { AdminServicesView } from './views/admin/AdminServicesView';
import { AdminCountersView } from './views/admin/AdminCountersView';
import { AdminBranchesView } from './views/admin/AdminBranchesView';
import { AdminUsersView } from './views/admin/AdminUsersView';
import { AdminSettingsView } from './views/admin/AdminSettingsView';
import { AdminReportsView } from './views/admin/AdminReportsView';
import { AdminAuditView } from './views/admin/AdminAuditView';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

function ProtectedStaffRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/solicitar-turno" element={<RequestTicketView />} />
          <Route path="/turno/:branchId" element={<RequestTicketView />} />
          <Route path="/mi-turno/:id" element={<MyTicketView />} />
          <Route path="/pantalla" element={<PublicDisplayView />} />
          <Route path="/tv/:branchId" element={<PublicDisplayView />} />
          <Route path="/login" element={<LoginView />} />
          <Route
            path="/atencion"
            element={
              <ProtectedStaffRoute>
                <StaffDeskView />
              </ProtectedStaffRoute>
            }
          />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard"     element={<AdminDashboardView />} />
            <Route path="programacion"  element={<AdminScheduleView />} />
            <Route path="turnos"        element={<AdminTicketsView />} />
            <Route path="servicios"     element={<AdminServicesView />} />
            <Route path="modulos"       element={<AdminCountersView />} />
            <Route path="sedes"         element={<AdminBranchesView />} />
            <Route path="usuarios"      element={<AdminUsersView />} />
            <Route path="configuracion" element={<AdminSettingsView />} />
            <Route path="reportes"      element={<AdminReportsView />} />
            <Route path="auditoria"     element={<AdminAuditView />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
