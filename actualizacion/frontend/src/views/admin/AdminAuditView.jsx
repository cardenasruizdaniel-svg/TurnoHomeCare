import React, { useState, useEffect } from 'react';
import { History, ShieldAlert, Filter, Calendar, User, Search } from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { LoadingSpinner } from '../../components/Modal';

export function AdminAuditView() {
  const { isDark } = useTheme();
  const d = isDark;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        action: actionFilter || undefined,
        limit: 100
      });
      if (res.success) setLogs(res.logs || []);
    } catch (e) {
      console.error('Error cargando auditoría:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-black font-display ${d ? "text-white" : "text-slate-900"}`}>Registro de Auditoría</h1>
          <p className={`text-xs ${d ? "text-slate-400" : "text-slate-600"}`}>Trazabilidad inmutable de llamados, cambios de configuración y accesos</p>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-sky-500"
        >
          <option value="">Todas las Acciones</option>
          <option value="CALL_TICKET">Llamado de Turno</option>
          <option value="CREATE_TICKET">Emisión de Turno</option>
          <option value="COMPLETE_TICKET">Finalización de Turno</option>
          <option value="USER_LOGIN">Inicio de Sesión</option>
          <option value="UPDATE_SETTINGS">Cambio de Configuración</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className={`rounded-3xl border shadow-xl overflow-hidden ${d ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-slate-200/50 text-slate-900"}`}>
        {loading ? (
          <LoadingSpinner text="Cargando registro de auditoría..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase font-bold border-b ${d ? "bg-slate-950/80 text-slate-400 border-slate-800" : "bg-slate-100/90 text-slate-700 border-slate-200"}`}>
                <tr>
                  <th className="py-3.5 px-4">Fecha y Hora</th>
                  <th className="py-3.5 px-4">Acción</th>
                  <th className="py-3.5 px-4">Usuario Responsable</th>
                  <th className="py-3.5 px-4">Entidad</th>
                  <th className="py-3.5 px-4">Detalles</th>
                  <th className="py-3.5 px-4">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {logs.length > 0 ? (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {new Date(l.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {l.user_name || 'Sistema / Público'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {l.entity} {l.entity_id ? `#${l.entity_id}` : ''}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px] max-w-xs truncate">
                        {l.details || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {l.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500">
                      No hay registros de auditoría disponibles.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
