import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Search,
  Download,
  Filter,
  Calendar,
  Building2,
  Stethoscope,
  RefreshCw,
  Eye,
  Clock,
  UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge, TypeBadge } from '../../components/StatusBadge';
import { Modal, LoadingSpinner } from '../../components/Modal';

export function AdminTicketsView() {
  const [tickets, setTickets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [status, setStatus] = useState('');
  const [ticketType, setTicketType] = useState('');
  const [branchId, setBranchId] = useState('');

  // Opciones de selects
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);

  // Modal Detalle
  const [selectedTicket, setSelectedTicket] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        serviceId: serviceId || undefined,
        status: status || undefined,
        ticketType: ticketType || undefined,
        branchId: branchId || undefined,
        limit: 100
      };
      const res = await api.getTicketHistory(params);
      if (res.success) {
        setTickets(res.data || []);
        setTotalCount(res.total || 0);
      }
    } catch (e) {
      console.error('Error cargando historial de turnos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.getPublicServices(),
      api.getBranches()
    ]).then(([sRes, bRes]) => {
      if (sRes.success) setServices(sRes.services);
      if (bRes.success) setBranches(bRes.branches);
    });
  }, []);

  useEffect(() => {
    loadTickets();
  }, [startDate, endDate, serviceId, status, ticketType, branchId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTickets();
  };

  const handleExportCSV = () => {
    const params = {
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      serviceId: serviceId || undefined,
      status: status || undefined,
      ticketType: ticketType || undefined,
      branchId: branchId || undefined
    };
    window.open(api.getExportCSVUrl(params), '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-display text-white">Historial General de Turnos</h1>
          <p className="text-xs text-slate-400">Consulta detallada, tiempos de espera, atención y trazabilidad</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Exportar a Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          
          {/* Búsqueda por texto */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por turno, cédula o paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Sede */}
          <div>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Todas las Sedes</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Servicio */}
          <div>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Todos los Servicios</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Todos los Estados</option>
              <option value="ESPERANDO">En Espera</option>
              <option value="LLAMADO">Llamado</option>
              <option value="EN_ATENCION">En Atención</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="NO_PRESENTO">No se presentó</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          {/* Tipo de Turno */}
          <div>
            <select
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Todos los Tipos</option>
              <option value="NORMAL">Normal</option>
              <option value="PRIORITARIO">Prioritario (60+)</option>
              <option value="ESPECIAL">Especial</option>
            </select>
          </div>

        </form>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span>Mostrando <strong>{tickets.length}</strong> de <strong>{totalCount}</strong> turnos registrados</span>
          <button
            onClick={() => {
              setSearch('');
              setStartDate('');
              setEndDate('');
              setServiceId('');
              setStatus('');
              setTicketType('');
              setBranchId('');
            }}
            className="text-xs text-sky-400 hover:text-sky-300"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Cargando historial de turnos..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Turno</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Paciente</th>
                  <th className="py-3.5 px-4">Servicio</th>
                  <th className="py-3.5 px-4">Módulo / Funcionario</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Tiempos (Esp / Atn)</th>
                  <th className="py-3.5 px-4">Fecha / Hora</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {tickets.length > 0 ? (
                  tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-black text-sm text-white">
                        {t.ticket_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <TypeBadge type={t.ticket_type} />
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{t.patient_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">C.C. {t.document_number} • {t.patient_age} años</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {t.service_name}
                      </td>
                      <td className="py-3.5 px-4">
                        {t.counter_name ? (
                          <div>
                            <p className="font-semibold text-emerald-400">{t.counter_name}</p>
                            <p className="text-[10px] text-slate-500">{t.user_name || 'Funcionario'}</p>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">No asignado</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <span className="text-sky-400">{t.wait_time_minutes}m</span> / <span className="text-emerald-400">{t.attention_time_minutes}m</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(t.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-400 hover:text-white transition"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-500">
                      No se encontraron registros de turnos con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Turno */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`Detalle de Turno: ${selectedTicket.ticket_number}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-500">Paciente:</span>
                <p className="font-bold text-white">{selectedTicket.patient_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Cédula:</span>
                <p className="font-bold text-white font-mono">{selectedTicket.document_number}</p>
              </div>
              <div>
                <span className="text-slate-500">Servicio:</span>
                <p className="font-bold text-sky-400">{selectedTicket.service_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Sede:</span>
                <p className="font-bold text-white">{selectedTicket.branch_name}</p>
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">Marcas de Tiempo</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Emisión:</span>
                  <p className="text-slate-200">{selectedTicket.created_at}</p>
                </div>
                <div>
                  <span className="text-slate-500">Llamado:</span>
                  <p className="text-slate-200">{selectedTicket.called_at || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Atención Iniciada:</span>
                  <p className="text-slate-200">{selectedTicket.attended_at || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Finalización:</span>
                  <p className="text-slate-200">{selectedTicket.completed_at || 'N/A'}</p>
                </div>
              </div>
            </div>

            {selectedTicket.notes && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500">Notas de Atención:</span>
                <p className="text-slate-300 mt-1 italic">{selectedTicket.notes}</p>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
