import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, ShieldCheck, Lock, User, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';

export function LoginView() {
  const { login } = useAuth();
  const { company } = useBranding();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const loggedUser = await login(username.trim(), password.trim());
      if (loggedUser.role === 'ADMIN' || loggedUser.role === 'SUPERVISOR') {
        navigate('/admin/dashboard');
      } else {
        navigate('/atencion');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center p-4 sm:p-6 bg-slate-950 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header con Logo */}
        <div className="text-center space-y-2">
          {company.logo_url ? (
            <div className="w-16 h-16 mx-auto rounded-full bg-white p-1 flex items-center justify-center shadow-xl shadow-pink-500/10 border-2 border-pink-500/30">
              <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain rounded-full" />
            </div>
          ) : (
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-pink-600 to-teal-500 flex items-center justify-center shadow-xl shadow-pink-500/20 text-white">
              <ShieldCheck className="w-8 h-8" />
            </div>
          )}
          <h1 className="text-2xl font-black font-display text-white">Acceso Institucional</h1>
          <p className="text-xs text-slate-300 font-bold">{company.name}</p>
          {company.slogan && (
            <p className="text-[11px] text-teal-400 font-medium italic">{company.slogan}</p>
          )}
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Usuario
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="admin o funcionario1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'INICIAR SESIÓN'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Logins */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-400" /> Accesos Rápidos de Prueba
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition"
            >
              <p className="font-bold text-white">👑 Administrador</p>
              <p className="text-[10px] text-slate-500">admin / admin123</p>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('supervisor', 'super123')}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition"
            >
              <p className="font-bold text-white">🔍 Supervisor</p>
              <p className="text-[10px] text-slate-500">supervisor / super123</p>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('funcionario1', 'func123')}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition"
            >
              <p className="font-bold text-white">🩺 Ventanilla 1</p>
              <p className="text-[10px] text-slate-500">funcionario1 / func123</p>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('funcionario2', 'func123')}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition"
            >
              <p className="font-bold text-white">🩺 Consultorio 1</p>
              <p className="text-[10px] text-slate-500">funcionario2 / func123</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
