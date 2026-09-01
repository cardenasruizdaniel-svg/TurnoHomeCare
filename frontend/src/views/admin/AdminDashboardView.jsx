import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Stethoscope,
  Building2,
  Calendar,
  RefreshCw,
  UserX
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { StatCard } from '../../components/StatCard';
import { LoadingSpinner } from '../../components/Modal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export function AdminDashboardView() {
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, branchesRes] = await Promise.all([
        api.getDashboardStats(selectedBranchId || null),
        api.getBranches()
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (branchesRes.success) setBranches(branchesRes.branches);
    } catch (e) {
      console.error('Error cargando métricas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  // Gráfico de Turnos por Hora
  const hourlyData = {
    labels: stats?.hourly_distribution?.map(h => `${h.hour}:00`) || ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
    datasets: [
      {
        label: 'Turnos Emitidos',
        data: stats?.hourly_distribution?.map(h => h.count) || [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(14, 165, 233, 0.7)',
        borderColor: '#0ea5e9',
        borderWidth: 2,
        borderRadius: 8,
      }
    ]
  };

  // Gráfico de Distribución por Servicio
  const serviceData = {
    labels: stats?.by_service?.map(s => s.service_name) || [],
    datasets: [
      {
        data: stats?.by_service?.map(s => s.count) || [],
        backgroundColor: [
          '#0284c7',
          '#9333ea',
          '#10b981',
          '#f59e0b',
          '#ec4899',
          '#6366f1'
        ],
        borderWidth: 0,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: isDark ? '#64748b' : '#475569' }
      },
      y: {
        grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: isDark ? '#64748b' : '#475569' }
      }
    }
  };

  const d = isDark;
  const cardBg = d ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-md';
  const tableHeaderBg = d ? 'bg-slate-950/60 text-slate-400 border-slate-800' : 'bg-slate-100/90 text-slate-700 font-bold border-slate-200';

  return (
    <div className="space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black font-display ${d ? 'text-white' : 'text-slate-900'}`}>Dashboard Ejecutivo de Operación</h1>
          <p className={`text-xs sm:text-sm mt-1 ${d ? 'text-slate-400' : 'text-slate-600'}`}>Métricas en tiempo real, afluencia de pacientes y tiempos de atención</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
              d ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
            }`}
          >
            <option value="">Todas las Sedes</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <button
            onClick={loadData}
            title="Refrescar métricas"
            className={`p-2 rounded-xl border transition ${
              d ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Turnos Hoy"
          value={stats?.total_tickets || 0}
          subtitle="Total solicitados hoy"
          icon={Users}
          color="blue"
        />

        <StatCard
          title="Atendidos / Finalizados"
          value={stats?.completed || 0}
          subtitle={`Tasa de éxito: ${stats?.total_tickets ? Math.round((stats.completed / stats.total_tickets) * 100) : 0}%`}
          icon={CheckCircle2}
          color="green"
        />

        <StatCard
          title="En Espera Activa"
          value={stats?.waiting || 0}
          subtitle={`${stats?.in_progress || 0} en atención`}
          icon={Clock}
          color="amber"
        />

        <StatCard
          title="Atención Prioritaria"
          value={stats?.priority_count || 0}
          subtitle="Adultos mayores 60+"
          icon={Sparkles}
          color="purple"
        />
      </div>

      {/* Tiempos Promedio Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-2xl p-5 flex items-center justify-between border ${cardBg}`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${d ? 'text-slate-400' : 'text-slate-500'}`}>Tiempo Promedio de Espera</p>
            <p className={`text-2xl font-black font-display mt-1 ${d ? 'text-white' : 'text-slate-900'}`}>
              {stats?.avg_wait_minutes || 0} <span className={`text-xs font-normal ${d ? 'text-slate-400' : 'text-slate-500'}`}>minutos</span>
            </p>
          </div>
          <Clock className="w-8 h-8 text-sky-500/70 shrink-0" />
        </div>

        <div className={`rounded-2xl p-5 flex items-center justify-between border ${cardBg}`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${d ? 'text-slate-400' : 'text-slate-500'}`}>Tiempo Promedio de Consulta</p>
            <p className={`text-2xl font-black font-display mt-1 ${d ? 'text-white' : 'text-slate-900'}`}>
              {stats?.avg_attention_minutes || 0} <span className={`text-xs font-normal ${d ? 'text-slate-400' : 'text-slate-500'}`}>minutos</span>
            </p>
          </div>
          <Stethoscope className="w-8 h-8 text-emerald-500/70 shrink-0" />
        </div>

        <div className={`rounded-2xl p-5 flex items-center justify-between border ${cardBg}`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${d ? 'text-slate-400' : 'text-slate-500'}`}>No se presentaron</p>
            <p className="text-2xl font-black font-display text-rose-500 mt-1">
              {stats?.no_show || 0} <span className={`text-xs font-normal ${d ? 'text-slate-400' : 'text-slate-500'}`}>pacientes</span>
            </p>
          </div>
          <UserX className="w-8 h-8 text-rose-500/70 shrink-0" />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Afluencia por Hora (8 cols) */}
        <div className={`lg:col-span-8 rounded-3xl p-6 space-y-4 border ${cardBg}`}>
          <div className="flex items-center justify-between">
            <h3 className={`font-black font-display text-sm flex items-center gap-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              <TrendingUp className="w-4 h-4 text-sky-500" />
              Afluencia y Demanda por Hora del Día
            </h3>
          </div>
          <div className="h-64">
            <Bar data={hourlyData} options={chartOptions} />
          </div>
        </div>

        {/* Distribución por Servicio (4 cols) */}
        <div className={`lg:col-span-4 rounded-3xl p-6 space-y-4 flex flex-col justify-between border ${cardBg}`}>
          <h3 className={`font-black font-display text-sm flex items-center gap-2 ${d ? 'text-white' : 'text-slate-900'}`}>
            <BarChart3 className="w-4 h-4 text-purple-500" />
            Turnos por Especialidad / Servicio
          </h3>
          <div className="h-56 flex items-center justify-center">
            {stats?.by_service?.some(s => s.count > 0) ? (
              <Doughnut data={serviceData} options={{ responsive: true, maintainAspectRatio: false }} />
            ) : (
              <p className="text-xs text-slate-500 italic">Sin datos de servicios hoy</p>
            )}
          </div>
        </div>

      </div>

      {/* Productividad por Funcionario Table */}
      <div className={`rounded-3xl p-6 space-y-4 border overflow-hidden ${cardBg}`}>
        <h3 className={`font-black font-display text-sm flex items-center gap-2 ${d ? 'text-white' : 'text-slate-900'}`}>
          <Users className="w-4 h-4 text-emerald-500" />
          Productividad de Funcionarios y Médicos (Hoy)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`uppercase font-bold tracking-wider border-b ${tableHeaderBg}`}>
              <tr>
                <th className="py-3.5 px-4">Funcionario</th>
                <th className="py-3.5 px-4">Turnos Atendidos</th>
                <th className="py-3.5 px-4">Tiempo Promedio Atención</th>
                <th className="py-3.5 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${d ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              {stats?.by_user && stats.by_user.length > 0 ? (
                stats.by_user.map(u => (
                  <tr key={u.user_id} className={d ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className={`py-3.5 px-4 font-black ${d ? 'text-white' : 'text-slate-900'}`}>{u.full_name}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-500">{u.attended_count} turnos</td>
                    <td className="py-3.5 px-4">{u.avg_attention_minutes} minutos</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 font-bold text-[10px] border border-emerald-500/30">
                        Activo
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-500 italic">
                    No se han registrado atenciones completadas por funcionarios en la fecha.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default AdminDashboardView;
