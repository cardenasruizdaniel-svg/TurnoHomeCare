import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, TrendingUp, Users, Clock, Stethoscope, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { LoadingSpinner } from '../../components/Modal';

export function AdminReportsView() {
  const { isDark } = useTheme();
  const d = isDark;
  const [stats, setStats] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, bRes] = await Promise.all([
        api.getDashboardStats(selectedBranchId || null),
        api.getBranches()
      ]);
      if (sRes.success) setStats(sRes.stats);
      if (bRes.success) setBranches(bRes.branches);
    } catch (e) {
      console.error('Error cargando datos para reporte:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const params = selectedBranchId ? { branchId: selectedBranchId } : {};
    window.open(api.getExportCSVUrl(params), '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-black font-display ${d ? "text-white" : "text-slate-900"}`}>Reportes y Analítica</h1>
          <p className={`text-xs ${d ? "text-slate-400" : "text-slate-600"}`}>Generación de informes de productividad, servicio y tiempos de atención</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV / Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Reporte</span>
          </button>
        </div>
      </div>

      {/* Printable Report Container */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-8 print:bg-white print:text-black print:p-0 print:border-none">
        
        {/* Report Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black font-display text-white print:text-black">
              INFORME CONSOLIDADO DE GESTIÓN DE TURNOS
            </h2>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
              Fecha de emisión: {new Date().toLocaleDateString('es-ES', { dateStyle: 'full' })}
            </p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold">
              Reporte Oficial IPS
            </span>
          </div>
        </div>

        {/* Resumen Ejecutivo */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-white print:text-black flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Resumen General de Operación
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <p className="text-slate-500">Total Pacientes / Turnos:</p>
              <p className="text-2xl font-bold font-display text-white print:text-black mt-1">
                {stats?.total_tickets || 0}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <p className="text-slate-500">Turnos Atendidos:</p>
              <p className="text-2xl font-bold font-display text-emerald-400 print:text-emerald-700 mt-1">
                {stats?.completed || 0}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <p className="text-slate-500">Tiempo Promedio Espera:</p>
              <p className="text-2xl font-bold font-display text-sky-400 print:text-sky-700 mt-1">
                {stats?.avg_wait_minutes || 0} min
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <p className="text-slate-500">Atención Prioritaria (60+):</p>
              <p className="text-2xl font-bold font-display text-purple-400 print:text-purple-700 mt-1">
                {stats?.priority_count || 0} ({stats?.total_tickets ? Math.round((stats.priority_count / stats.total_tickets) * 100) : 0}%)
              </p>
            </div>
          </div>
        </div>

        {/* Detalle por Servicio */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-white print:text-black flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-sky-400" />
            Consolidado por Servicio Médico
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800 print:bg-slate-200 print:text-black">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Servicio</th>
                  <th className="py-2.5 px-3">Turnos Solicitados</th>
                  <th className="py-2.5 px-3">Porcentaje de Demanda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-300 text-slate-300 print:text-black">
                {stats?.by_service?.map(s => {
                  const pct = stats.total_tickets ? Math.round((s.count / stats.total_tickets) * 100) : 0;
                  return (
                    <tr key={s.service_id}>
                      <td className="py-2.5 px-3 font-mono font-bold">{s.service_code}</td>
                      <td className="py-2.5 px-3 font-semibold">{s.service_name}</td>
                      <td className="py-2.5 px-3 font-bold">{s.count}</td>
                      <td className="py-2.5 px-3">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
