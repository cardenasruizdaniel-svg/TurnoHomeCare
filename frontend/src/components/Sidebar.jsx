import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
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
  UserCheck,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { company } = useBranding();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const navItems = [
    { to: '/admin/dashboard',     label: 'Dashboard',              icon: LayoutDashboard },
    { to: '/admin/programacion',  label: 'Programación de Turnos', icon: Calendar },
    { to: '/admin/turnos',        label: 'Historial de Turnos',     icon: Ticket },
    { to: '/admin/servicios',     label: 'Servicios Médicos',       icon: Stethoscope },
    { to: '/admin/modulos',       label: 'Módulos / Consultorios',  icon: Grid3X3 },
    { to: '/admin/sedes',         label: 'Sedes y Códigos QR',      icon: Building2 },
    { to: '/admin/usuarios',      label: 'Usuarios y Roles',        icon: Users },
    { to: '/admin/configuracion', label: 'Configuración Global',    icon: Settings },
    { to: '/admin/reportes',      label: 'Reportes y Analítica',    icon: FileText },
    { to: '/admin/auditoria',     label: 'Auditoría del Sistema',   icon: History },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const d = isDark;

  return (
    <aside className={`w-64 border-r flex flex-col justify-between shrink-0 min-h-screen transition-colors duration-300 ${
      d
        ? 'bg-slate-900/95 border-slate-800/80 text-slate-100'
        : 'bg-white border-slate-200 text-slate-800 shadow-xl shadow-slate-200/60'
    }`}>
      {/* Header Brand */}
      <div>
        <div className={`p-5 border-b ${d ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              <div className="w-10 h-10 rounded-full bg-white p-0.5 shadow-lg shadow-pink-500/10 border border-pink-500/30 flex items-center justify-center shrink-0">
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain rounded-full" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/20">
                <span className="font-display font-black text-white text-lg">H</span>
              </div>
            )}
            <div className="min-w-0">
              <h2 className={`font-bold font-display text-xs truncate ${d ? 'text-white' : 'text-slate-900'}`}>{company.name}</h2>
              <p className="text-[10px] text-teal-500 font-medium truncate">{company.slogan || 'Bienestar en casa'}</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-0.5">
          <p className={`px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider ${d ? 'text-slate-500' : 'text-slate-400'}`}>
            Módulos Administrativos
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition group ${
                    isActive
                      ? d
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        : 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm'
                      : d
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
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

        {/* Quick Operation Links */}
        <div className={`p-3 border-t space-y-1 ${d ? 'border-slate-800/60' : 'border-slate-200'}`}>
          <p className={`px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider ${d ? 'text-slate-500' : 'text-slate-400'}`}>
            Accesos de Operación
          </p>
          <NavLink
            to="/atencion"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
              d
                ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Panel de Ventanilla</span>
          </NavLink>
          <NavLink
            to="/pantalla"
            target="_blank"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
              d
                ? 'text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/20'
                : 'text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-200'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Abrir Pantalla TV</span>
          </NavLink>
        </div>
      </div>

      {/* Bottom: Theme Toggle + User */}
      <div className={`border-t ${d ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
        {/* Theme Toggle Row */}
        <div className={`px-4 pt-3 pb-2.5 border-b ${d ? 'border-slate-800/60' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-slate-500' : 'text-slate-400'}`}>Apariencia</span>
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all duration-200 ${
                d
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/40'
                  : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm'
              }`}
              title={d ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              {d ? <><Sun className="w-3.5 h-3.5" /><span>Modo Claro</span></> : <><Moon className="w-3.5 h-3.5" /><span>Modo Oscuro</span></>}
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold text-sky-500 ${
                d ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}>
                {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="truncate">
                <p className={`text-xs font-bold truncate ${d ? 'text-white' : 'text-slate-900'}`}>{user?.full_name}</p>
                <p className="text-[10px] text-sky-500 font-semibold uppercase">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className={`p-1.5 rounded-lg transition ${
                d
                  ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
