import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Stethoscope,
  Grid3X3,
  Building2,
  Users,
  Settings,
  FileText,
  History,
  LogOut,
  ChevronRight,
  Tv,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { company } = useBranding();
  const navigate = useNavigate();

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/turnos', label: 'Historial de Turnos', icon: Ticket },
    { to: '/admin/servicios', label: 'Servicios Médicos', icon: Stethoscope },
    { to: '/admin/modulos', label: 'Módulos / Consultorios', icon: Grid3X3 },
    { to: '/admin/sedes', label: 'Sedes y Códigos QR', icon: Building2 },
    { to: '/admin/usuarios', label: 'Usuarios y Roles', icon: Users },
    { to: '/admin/configuracion', label: 'Configuración Global', icon: Settings },
    { to: '/admin/reportes', label: 'Reportes y Analítica', icon: FileText },
    { to: '/admin/auditoria', label: 'Auditoría del Sistema', icon: History },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between shrink-0 min-h-screen">
      {/* Top Header */}
      <div>
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              <div className="w-11 h-11 rounded-full bg-white p-0.5 shadow-lg shadow-pink-500/10 border border-pink-500/30 flex items-center justify-center shrink-0">
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain rounded-full" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-teal-500 p-0.5 shadow-lg shadow-pink-500/20 flex items-center justify-center">
                <span className="font-display font-black text-white text-lg">H</span>
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-bold font-display text-white text-xs truncate">{company.name}</h2>
              <p className="text-[10px] text-teal-400 font-medium truncate">{company.slogan || 'Bienestar en casa'}</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="p-3 space-y-1">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Módulos Administrativos</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition group ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            );
          })}
        </div>

        {/* Quick Operations Links */}
        <div className="p-3 border-t border-slate-800/60 space-y-1">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Accesos de Operación</p>
          <NavLink
            to="/atencion"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition"
          >
            <UserCheck className="w-4 h-4" />
            <span>Panel de Ventanilla</span>
          </NavLink>
          <NavLink
            to="/pantalla"
            target="_blank"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition"
          >
            <Tv className="w-4 h-4" />
            <span>Abrir Pantalla TV</span>
          </NavLink>
        </div>
      </div>

      {/* Bottom User Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-400">
              {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user?.full_name}</p>
              <p className="text-[10px] text-sky-400 font-semibold uppercase">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
