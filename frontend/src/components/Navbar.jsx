import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Tv, QrCode, UserCheck, ShieldCheck, LogOut, Activity, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';

export function Navbar() {
  const { user, logout, isFuncionario, isAdmin } = useAuth();
  const { company } = useBranding();
  const location = useLocation();
  const navigate = useNavigate();

  const isPublicScreen = location.pathname.startsWith('/pantalla') || location.pathname.startsWith('/tv');
  if (isPublicScreen) return null; // La pantalla de TV es fullscreen

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
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
            <span className="text-sm font-bold font-display tracking-tight text-white flex items-center gap-1.5">
              {company.name}
            </span>
            <p className="text-[10px] text-teal-400 font-medium truncate max-w-[200px] sm:max-w-xs">{company.slogan || 'Bienestar en casa.'}</p>
          </div>
        </Link>

        {/* Center / Navigation Quick Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/pantalla"
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
          >
            <Tv className="w-4 h-4 text-sky-400" />
            Pantalla TV
          </Link>

          <Link
            to="/solicitar-turno"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
          >
            <QrCode className="w-4 h-4 text-purple-400" />
            Solicitar Turno (QR)
          </Link>

          {user && (
            <Link
              to="/atencion"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                location.pathname === '/atencion'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Panel de Atención
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                location.pathname.startsWith('/admin')
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Administración
            </Link>
          )}
        </nav>

        {/* User profile / Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-white">{user.full_name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition"
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
