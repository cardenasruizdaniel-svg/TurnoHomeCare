import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tv, QrCode, UserCheck, ShieldCheck, Sparkles, Building2, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../services/api';
import { useBranding } from '../context/BrandingContext';

export function HomeView() {
  const { company } = useBranding();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPublicBranches()
      .then(res => {
        if (res.success && res.branches) {
          setBranches(res.branches);
          if (res.branches.length > 0) {
            setSelectedBranchId(res.branches[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        {company.logo_url && (
          <div className="w-24 h-24 mx-auto rounded-full bg-white p-1.5 shadow-2xl shadow-pink-500/20 border-2 border-pink-500/40 hover:scale-105 transition-transform duration-300">
            <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain rounded-full" />
          </div>
        )}
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black font-display text-white">{company.name}</h2>
          {company.slogan && (
            <p className="text-sm font-bold text-teal-400 tracking-wide uppercase">{company.slogan}</p>
          )}
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold tracking-wide uppercase shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          Sistema Inteligente de Turnos con QR y Prioridad Automática
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white leading-tight">
          Gestión de Turnos Rápida, Moderna e <span className="bg-gradient-to-r from-pink-500 via-teal-400 to-lime-400 bg-clip-text text-transparent">Inteligente</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 font-normal">
          Solución médica para asignación ágil de citas y turnos mediante código QR sin filas.
        </p>

        {/* Branch Selector */}
        {branches.length > 1 && (
          <div className="pt-2 flex items-center justify-center gap-3">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-400" /> Sede Actual:
            </span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-sky-500"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. Pantalla TV */}
        <div className="group relative rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 p-7 border border-slate-800 hover:border-sky-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
              <Tv className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-white">Pantalla Pública TV</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Diseñada para televisores y monitores. Muestra el turno actual en llamada gigante, el código QR interactivo, el historial y locución con voz sintetizada.
              </p>
            </div>
          </div>

          <Link
            to={`/pantalla?branchId=${selectedBranchId}`}
            target="_blank"
            className="mt-6 inline-flex items-center justify-between px-4 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/25 transition"
          >
            <span>Abrir Pantalla TV</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 2. Solicitar Turno Móvil */}
        <div className="group relative rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 p-7 border border-slate-800 hover:border-purple-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-white">Solicitar Turno (Móvil)</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Flujo móvil para pacientes: digita su cédula, autocompleta sus datos o registra si es nuevo, clasifica por edad (60+) y emite su turno.
              </p>
            </div>
          </div>

          <Link
            to={`/solicitar-turno?branchId=${selectedBranchId}`}
            className="mt-6 inline-flex items-center justify-between px-4 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/25 transition"
          >
            <span>Probar Solicitud Móvil</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3. Panel de Funcionario */}
        <div className="group relative rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 p-7 border border-slate-800 hover:border-emerald-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <UserCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-white">Panel de Ventanilla</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Interfaz ergonómica para médicos y funcionarios: botón "Llamar Siguiente" con algoritmo de prioridad (2 normales x 1 prioritario), re-llamado y finalización.
              </p>
            </div>
          </div>

          <Link
            to="/atencion"
            className="mt-6 inline-flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition"
          >
            <span>Acceder a Ventanilla</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4. Dashboard Administrativo */}
        <div className="group relative rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 p-7 border border-slate-800 hover:border-indigo-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-white">Administración & KPIs</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Supervisión global, métricas en vivo, tiempos promedio de espera/atención, gestión de servicios, módulos, roles y exportación a Excel/CSV.
              </p>
            </div>
          </div>

          <Link
            to="/admin/dashboard"
            className="mt-6 inline-flex items-center justify-between px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition"
          >
            <span>Panel Ejecutivo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

      {/* Feature Checklist Summary */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8">
        <h3 className="text-lg font-bold font-display text-white mb-6 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Capacidades Implementadas y Operativas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="w-2 h-2 rounded-full bg-sky-400 mt-1 shrink-0" />
            <span><strong>Algoritmo de Prioridad 2:1:</strong> Despacha alternadamente con anti-bloqueo total.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="w-2 h-2 rounded-full bg-purple-400 mt-1 shrink-0" />
            <span><strong>Clasificación Automática 60+:</strong> Prioriza al adulto mayor a partir de su edad registrada.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <span><strong>Prevención de Duplicados:</strong> Impide que una misma cédula genere múltiples turnos simultáneos.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
            <span><strong>Síntesis de Voz y Campana:</strong> Anuncia por altavoz el turno y consultorio configurados.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1 shrink-0" />
            <span><strong>Multi-Sede y QR Dinámico:</strong> Cada sede cuenta con su URL y código QR de atención independiente.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="w-2 h-2 rounded-full bg-rose-400 mt-1 shrink-0" />
            <span><strong>Bloqueo Atómico de Concurrencia:</strong> Evita que dos funcionarios llamen al mismo tiempo el mismo turno.</span>
          </div>
        </div>
      </div>

    </div>
  );
}
