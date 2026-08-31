import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Tv, QrCode, UserCheck, ShieldCheck, LogOut, Activity, User, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';

export function Navbar() {
  const { user, logout, isFuncionario, isAdmin } = useAuth();
  const { company } = useBranding();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const isPublicScreen = location.pathname.startsWith('/pantalla') || location.pathname.startsWith('/tv');
  if (isPublicScreen) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-xl transition-colors duration-300 ${
      isDark
        ? 'border-slate-800/80 bg-slate-950/85'
        : 'border-slate-200 bg-white/95 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          {company.logo_url ? (
            <div className="w-10 h-10 rounded-full bg-white p-0.5 shadow-lg shadow-pink-500/10 border border-pink-500/30 group-hover:scale-105 transition-transform flex items-center justify-center">
              <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain rounded-full" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-teal-500 p-0.5 shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <span className={`text-sm font-bold font-display tracking-tight flex items-center gap-1.5 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {company.name}
            </span>
            <p className="text-[10px] text-teal-500 font-medium truncate max-w-[200px] sm:max-w-xs">{company.slogan || 'Bienestar en casa.'}</p>
          </div>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/pantalla"
            target="_blank"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-transparent transition ${
              isDark
                ? 'text-slate-300 hover:text-white hover:bg-slate-900 hover:border-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200'
            }`}
          >
            <Tv className="w-4 h-4 text-sky-400" />
            Pantalla TV
          </Link>

          <Link
            to="/solicitar-turno"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-transparent transition ${
              isDark
                ? 'text-slate-300 hover:text-white hover:bg-slate-900 hover:border-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4 text-purple-400" />
            Solicitar Turno (QR)
          </Link>

          {user && (
            <Link
              to="/atencion"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                location.pathname === '/atencion'
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-500/30'
                  : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-900 border-transparent'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-500" />
              Panel de Atención
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                location.pathname.startsWith('/admin')
                  ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30'
                  : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-900 border-transparent'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Administración
            </Link>
          )}
        </nav>

        {/* Right: Theme + User */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
            className={`p-2.5 rounded-xl border font-semibold transition-all duration-300 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-300'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.full_name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className={`p-2 rounded-xl border transition ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50'
                }`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25 transition"
            >
              <User className="w-4 h-4" />
              Acceso Funcionarios
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
