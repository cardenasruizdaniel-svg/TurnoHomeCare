import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
  Stethoscope,
  Grid3X3,
  Users,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { StatusBadge, TypeBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';

export function AdminScheduleView() {
  const { user } = useAuth();
  const { isDark } = useTheme();

  // Estados de datos
  const [tickets, setTickets] = useState([]);
  const [calendarSummary, setCalendarSummary] = useState({});
  const [dashboardMetrics, setDashboardMetrics] = useState({
    programadosHoy: 0,
    enEspera: 0,
    atendidos: 0,
    cancelados: 0,
    noPresentados: 0,
    modulosActivos: 0
  });
  const [moduleWorkload, setModuleWorkload] = useState([]);

  // Selectores de configuración
  const [services, setServices] = useState([]);
  const [counters, setCounters] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modo de vista: 'calendar' | 'list' | 'module'
  const [activeTab, setActiveTab] = useState('list');

  // Filtros
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [serviceFilter, setServiceFilter] = useState('');
  const [counterFilter, setCounterFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Calendario Navegación
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Estados de Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Formulario Crear / Editar
  const [formData, setFormData] = useState({
    documentNumber: '',
    fullName: '',
    age: '',
    phone: '',
    serviceId: '',
    counterId: '',
    userId: '',
    scheduledDate: todayStr,
    appointmentTime: '08:00',
    ticketType: 'NORMAL',
    notes: ''
  });

  const [cancelReason, setCancelReason] = useState('');

  // Cargar datos principales
  const loadScheduleData = async () => {
    try {
      setLoading(true);
      const res = await api.getSchedule({
        date: selectedDate,
        serviceId: serviceFilter || undefined,
        counterId: counterFilter || undefined,
        userId: staffFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined
      });

      if (res.success) {
        setTickets(res.tickets || []);
        setCalendarSummary(res.calendarSummary || {});
        setDashboardMetrics(res.dashboardMetrics || {});
        setModuleWorkload(res.moduleWorkload || []);
      }
    } catch (err) {
      console.error('Error cargando agenda de turnos:', err);
      showFeedback('error', 'Error al cargar la programación de turnos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar listas maestras
    Promise.all([
      api.getServices(),
      api.getCounters(),
      api.getUsers()
    ]).then(([srvRes, cntRes, usrRes]) => {
      if (srvRes.success) setServices(srvRes.services || []);
      if (cntRes.success) setCounters(cntRes.counters || []);
      if (usrRes.success) setStaffUsers((usrRes.users || []).filter(u => u.role_name === 'FUNCIONARIO' || u.role_name === 'SUPERVISOR'));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    loadScheduleData();
  }, [selectedDate, serviceFilter, counterFilter, staffFilter, statusFilter, searchQuery]);

  const showFeedback = (type, text) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 5000);
  };

  // Cambio rápido de fecha
  const changeDateByDays = (days) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Consultar cédula en formulario
  const handleCheckPatient = async (doc) => {
    if (!doc.trim()) return;
    try {
      const res = await api.checkPatient(doc.trim());
      if (res.success && res.exists && res.patient) {
        setFormData(prev => ({
          ...prev,
          fullName: res.patient.full_name,
          age: res.patient.age,
          phone: res.patient.phone,
          ticketType: Number(res.patient.age) >= 60 ? 'PRIORITARIO' : prev.ticketType
        }));
      }
    } catch (e) {
      console.error('Error verificando cédula:', e);
    }
  };

  // Abrir modal de creación
  const openCreateModal = () => {
    setFormData({
      documentNumber: '',
      fullName: '',
      age: '',
      phone: '',
      serviceId: services.length > 0 ? String(services[0].id) : '',
      counterId: counters.length > 0 ? String(counters[0].id) : '',
      userId: '',
      scheduledDate: selectedDate || todayStr,
      appointmentTime: '08:30',
      ticketType: 'NORMAL',
      notes: ''
    });
    setIsCreateModalOpen(true);
  };

  // Abrir modal de edición directa
  const openEditModal = (ticket) => {
    if (['LLAMADO', 'EN_ATENCION', 'FINALIZADO', 'CANCELADO'].includes(ticket.status)) {
      showFeedback('error', `El turno ${ticket.ticket_number} está en estado ${ticket.status} y no puede modificarse libremente.`);
      return;
    }

    setSelectedTicket(ticket);
    setFormData({
      documentNumber: ticket.document_number || '',
      fullName: ticket.patient_name || '',
      age: ticket.patient_age || '',
      phone: ticket.patient_phone || '',
      serviceId: String(ticket.service_id),
      counterId: ticket.counter_id ? String(ticket.counter_id) : '',
      userId: ticket.user_id ? String(ticket.user_id) : '',
      scheduledDate: ticket.scheduled_date || ticket.created_date || todayStr,
      appointmentTime: ticket.appointment_time || '08:00',
      ticketType: ticket.ticket_type || 'NORMAL',
      notes: ticket.notes || ''
    });
    setIsEditModalOpen(true);
  };

  // Abrir modal de cancelación directa
  const openCancelModal = (ticket) => {
    if (['LLAMADO', 'EN_ATENCION', 'FINALIZADO', 'CANCELADO'].includes(ticket.status)) {
      showFeedback('error', `El turno ${ticket.ticket_number} ya fue procesado y no puede cancelarse directamente.`);
      return;
    }
    setSelectedTicket(ticket);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  // Guardar nueva programación
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.documentNumber || !formData.fullName || !formData.serviceId) {
      showFeedback('error', 'Por favor complete cédula, nombre y servicio.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.createSchedule({
        scheduledDate: formData.scheduledDate,
        appointmentTime: formData.appointmentTime,
        serviceId: Number(formData.serviceId),
        counterId: formData.counterId ? Number(formData.counterId) : null,
        userId: formData.userId ? Number(formData.userId) : null,
        patientData: {
          documentNumber: formData.documentNumber,
          fullName: formData.fullName,
          age: Number(formData.age || 0),
          phone: formData.phone || '0000000000'
        },
        ticketType: formData.ticketType,
        notes: formData.notes
      });

      if (res.success) {
        showFeedback('success', res.message || `Turno ${res.ticket.ticket_number} programado exitosamente para el ${formData.scheduledDate}.`);
        setIsCreateModalOpen(false);
        loadScheduleData();
      }
    } catch (err) {
      showFeedback('error', err.message || 'Error guardando la programación');
    } finally {
      setActionLoading(false);
    }
  };

  // Guardar edición directa
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setActionLoading(true);
      const res = await api.editUncalledTicket(selectedTicket.id, {
        patientData: {
          documentNumber: formData.documentNumber,
          fullName: formData.fullName,
          age: Number(formData.age || 0),
          phone: formData.phone
        },
        serviceId: Number(formData.serviceId),
        scheduledDate: formData.scheduledDate,
        appointmentTime: formData.appointmentTime,
        counterId: formData.counterId ? Number(formData.counterId) : null,
        userId: formData.userId ? Number(formData.userId) : null,
        ticketType: formData.ticketType,
        notes: formData.notes
      });

      if (res.success) {
        showFeedback('success', `Turno ${selectedTicket.ticket_number} actualizado correctamente.`);
        setIsEditModalOpen(false);
        loadScheduleData();
      }
    } catch (err) {
      showFeedback('error', err.message || 'Error actualizando el turno');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirmar cancelación directa
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setActionLoading(true);
      const res = await api.cancelUncalledTicket(selectedTicket.id, cancelReason);
      if (res.success) {
        showFeedback('success', `Turno ${selectedTicket.ticket_number} cancelado exitosamente.`);
        setIsCancelModalOpen(false);
        loadScheduleData();
      }
    } catch (err) {
      showFeedback('error', err.message || 'Error cancelando el turno');
    } finally {
      setActionLoading(false);
    }
  };

  // Generar días para el Calendario Mensual
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Ajustar para que la semana empiece en Lunes (0 = Lun, ..., 6 = Dom)
    const adjustedFirstDay = (firstDayIndex + 6) % 7;

    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        summary: calendarSummary[dateStr] || { programados: 0, esperando: 0, atendidos: 0, cancelados: 0, total: 0 }
      });
    }
    return days;
  }, [calendarMonth, calendarSummary]);

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const d = isDark;
  const cardBg = d ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800 shadow-md';
  const tableHeaderBg = d ? 'bg-slate-950/60 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200';
  const inputBg = d ? 'bg-slate-950 border-slate-800 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500';

  return (
    <div className="space-y-8 pb-12">
      
      {/* 1. Header Principal y Acciones */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black font-display tracking-tight flex items-center gap-3 ${d ? 'text-white' : 'text-slate-900'}`}>
            <CalendarIcon className="w-8 h-8 text-sky-500" />
            Programación de Turnos por Fechas
          </h1>
          <p className={`text-xs sm:text-sm mt-1 ${d ? 'text-slate-400' : 'text-slate-600'}`}>
            Gestión anticipada de citas, asignación a consultorios y modificación directa de turnos.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={loadScheduleData}
            title="Actualizar datos"
            className={`p-2.5 rounded-xl border transition ${d ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-500' : ''}`} />
          </button>
          
          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ PROGRAMAR TURNO</span>
          </button>
        </div>
      </div>

      {/* Banner de Feedback */}
      {feedbackMsg.text && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 transition-all animate-pulse ${
          feedbackMsg.type === 'error'
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
        }`}>
          {feedbackMsg.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 2. Tarjetas de Métricas e Indicadores del Día */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${cardBg}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Programados Hoy</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-display text-sky-500">{dashboardMetrics.programadosHoy}</span>
            <CalendarIcon className="w-4 h-4 text-sky-400 opacity-60" />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${cardBg}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">En Espera</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-display text-amber-500">{dashboardMetrics.enEspera}</span>
            <Clock className="w-4 h-4 text-amber-400 opacity-60" />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${cardBg}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Atendidos</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-display text-emerald-500">{dashboardMetrics.atendidos}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-60" />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${cardBg}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cancelados</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-display text-rose-500">{dashboardMetrics.cancelados}</span>
            <XCircle className="w-4 h-4 text-rose-400 opacity-60" />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${cardBg}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No Presentados</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-display text-purple-500">{dashboardMetrics.noPresentados}</span>
            <AlertTriangle className="w-4 h-4 text-purple-400 opacity-60" />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${cardBg}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Módulos Activos</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-display text-teal-500">{dashboardMetrics.modulosActivos}</span>
            <Grid3X3 className="w-4 h-4 text-teal-400 opacity-60" />
          </div>
        </div>
      </div>

      {/* 3. Selector de Fecha Prominente y Cambiador de Pestañas */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${cardBg}`}>
        
        {/* Selector de Fecha Prominente */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => changeDateByDays(-1)}
            className={`p-2 rounded-xl border transition ${d ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}
            title="Día anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono border transition shadow-sm ${inputBg}`}
            />
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                selectedDate === todayStr
                  ? 'bg-sky-500/20 text-sky-500 border-sky-500/40'
                  : d ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-600'
              }`}
            >
              Hoy
            </button>
          </div>

          <button
            onClick={() => changeDateByDays(1)}
            className={`p-2 rounded-xl border transition ${d ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}
            title="Día siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Título de la Fecha Seleccionada */}
        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500">PROCESANDO FECHA</span>
          <h2 className="text-sm sm:text-base font-black font-display uppercase tracking-wide">
            PROGRAMACIÓN — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
        </div>

        {/* Cambiador de Vista: Lista, Calendario, Módulo */}
        <div className={`flex items-center p-1 rounded-xl border ${d ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'list'
                ? 'bg-sky-600 text-white shadow-md'
                : d ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lista de Turnos</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'calendar'
                ? 'bg-sky-600 text-white shadow-md'
                : d ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendario</span>
          </button>

          <button
            onClick={() => setActiveTab('module')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'module'
                ? 'bg-sky-600 text-white shadow-md'
                : d ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Por Módulo</span>
          </button>
        </div>

      </div>

      {/* 4. Barra de Filtros Avanzados (para Lista y Módulos) */}
      {activeTab !== 'calendar' && (
        <div className={`p-4 rounded-2xl border space-y-3 ${cardBg}`}>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Filter className="w-4 h-4 text-sky-500" />
            <span>Filtros de Búsqueda</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Búsqueda por Paciente / Cédula / Turno */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cédula, nombre o turno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border transition ${inputBg}`}
              />
            </div>

            {/* Servicio */}
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium border transition ${inputBg}`}
            >
              <option value="">Todos los Servicios</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>

            {/* Módulo / Consultorio */}
            <select
              value={counterFilter}
              onChange={(e) => setCounterFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium border transition ${inputBg}`}
            >
              <option value="">Todos los Módulos</option>
              {counters.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>

            {/* Funcionario */}
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium border transition ${inputBg}`}
            >
              <option value="">Todos los Funcionarios</option>
              {staffUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>

            {/* Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium border transition ${inputBg}`}
            >
              <option value="">Todos los Estados</option>
              <option value="PROGRAMADO">Programado</option>
              <option value="ESPERANDO">En Espera / Disponible</option>
              <option value="LLAMADO">Llamado</option>
              <option value="EN_ATENCION">En Atención</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="NO_PRESENTO">No Presentado</option>
            </select>
          </div>
        </div>
      )}

      {/* 5. VISTA 1: CALENDARIO MENSUAL INTERACTIVO */}
      {activeTab === 'calendar' && (
        <div className={`p-6 rounded-3xl border space-y-6 ${cardBg}`}>
          {/* Header del Calendario */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-display flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-sky-500" />
              <span>{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                className={`p-2 rounded-xl border transition ${d ? 'bg-slate-950 border-slate-800 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCalendarMonth(new Date())}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${d ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'}`}
              >
                Mes Actual
              </button>
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                className={`p-2 rounded-xl border transition ${d ? 'bg-slate-950 border-slate-800 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid de Días de la Semana */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>

          {/* Grid del Calendario Mensual */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((dayObj, idx) => {
              if (!dayObj) {
                return <div key={idx} className="h-28 rounded-2xl opacity-20 bg-slate-800/30" />;
              }

              const isSelected = dayObj.dateStr === selectedDate;
              const isToday = dayObj.dateStr === todayStr;
              const { programados, esperando, atendidos, cancelados, total } = dayObj.summary;

              return (
                <div
                  key={dayObj.dateStr}
                  onClick={() => {
                    setSelectedDate(dayObj.dateStr);
                    setActiveTab('list');
                  }}
                  className={`h-28 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.02] ${
                    isSelected
                      ? 'ring-2 ring-sky-500 border-sky-500 shadow-lg shadow-sky-500/20'
                      : isToday
                      ? 'border-teal-500/60 bg-teal-500/10'
                      : d ? 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg ${
                      isToday ? 'bg-teal-500 text-white' : d ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {dayObj.dayNumber}
                    </span>
                    {total > 0 && (
                      <span className="text-[10px] font-black text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                        {total} turnos
                      </span>
                    )}
                  </div>

                  {total > 0 ? (
                    <div className="space-y-1 text-[9px] font-semibold">
                      {programados > 0 && (
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">
                          <span>Prog:</span>
                          <span className="font-bold">{programados}</span>
                        </div>
                      )}
                      {esperando > 0 && (
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                          <span>Espera:</span>
                          <span className="font-bold">{esperando}</span>
                        </div>
                      )}
                      {atendidos > 0 && (
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          <span>Atend:</span>
                          <span className="font-bold">{atendidos}</span>
                        </div>
                      )}
                      {cancelados > 0 && (
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                          <span>Canc:</span>
                          <span className="font-bold">{cancelados}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic text-center my-auto">Sin turnos</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. VISTA 2: LISTA DETALLADA DE TURNOS CON BOTONES DIRECTOS (EDITAR / CANCELAR) */}
      {activeTab === 'list' && (
        <div className={`rounded-3xl border overflow-hidden ${cardBg}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b uppercase font-bold text-[10px] tracking-wider ${tableHeaderBg}`}>
                <tr>
                  <th className="p-4">Hora / Fecha</th>
                  <th className="p-4">Turno</th>
                  <th className="p-4">Paciente / Cédula</th>
                  <th className="p-4">Servicio</th>
                  <th className="p-4">Módulo / Consultorio</th>
                  <th className="p-4">Funcionario</th>
                  <th className="p-4">Prioridad</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones Directas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {tickets.length > 0 ? (
                  tickets.map((t) => {
                    const isUncalled = ['PROGRAMADO', 'CONFIRMADO', 'ESPERANDO', 'PAUSADO'].includes(t.status);

                    return (
                      <tr key={t.id} className={`transition-colors ${
                        d ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }`}>
                        {/* Hora / Fecha */}
                        <td className="p-4 font-mono font-bold whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sky-500 font-extrabold text-sm">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span>{t.appointment_time || 'Sin hora'}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{t.scheduled_date || t.created_date}</p>
                        </td>

                        {/* Código de Turno */}
                        <td className="p-4 font-mono font-black text-sm whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white shadow-sm">
                            {t.ticket_number}
                          </span>
                        </td>

                        {/* Paciente / Cédula */}
                        <td className="p-4">
                          <p className="font-bold text-white uppercase text-xs">{t.patient_name}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">CC: {t.document_number} ({t.patient_age} años)</p>
                        </td>

                        {/* Servicio */}
                        <td className="p-4 font-semibold text-slate-300">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-[11px]">
                            <Stethoscope className="w-3.5 h-3.5" />
                            {t.service_name}
                          </span>
                        </td>

                        {/* Módulo / Consultorio */}
                        <td className="p-4 font-semibold">
                          {t.counter_name ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px]">
                              <Grid3X3 className="w-3.5 h-3.5" />
                              {t.counter_name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 italic">
                              Sin Módulo
                            </span>
                          )}
                        </td>

                        {/* Funcionario */}
                        <td className="p-4 text-slate-400">
                          {t.staff_name ? (
                            <span className="flex items-center gap-1 text-xs text-slate-300 font-medium">
                              <User className="w-3.5 h-3.5 text-sky-400" />
                              {t.staff_name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Por asignar</span>
                          )}
                        </td>

                        {/* Prioridad */}
                        <td className="p-4">
                          <TypeBadge type={t.ticket_type} />
                        </td>

                        {/* Estado */}
                        <td className="p-4">
                          <StatusBadge status={t.status} />
                        </td>

                        {/* ACCIONES DIRECTAS SIN LLAMAR */}
                        <td className="p-4 text-center whitespace-nowrap">
                          {isUncalled ? (
                            <div className="flex items-center justify-center gap-2">
                              {/* Botón EDITAR */}
                              <button
                                onClick={() => openEditModal(t)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-bold transition hover:scale-105 shadow-sm"
                                title="Editar turno directamente"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>EDITAR</span>
                              </button>

                              {/* Botón CANCELAR */}
                              <button
                                onClick={() => openCancelModal(t)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition hover:scale-105 shadow-sm"
                                title="Cancelar turno directamente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>CANCELAR</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Procesado / Histórico</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="p-12 text-center text-slate-500">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-600 opacity-50" />
                      <p className="text-base font-bold text-slate-400">No hay turnos programados o coincidentes</p>
                      <p className="text-xs text-slate-500 mt-1">Prueba seleccionando otra fecha o ajustando los filtros de búsqueda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. VISTA 3: CARGA DE TRABAJO POR MÓDULO / CONSULTORIO */}
      {activeTab === 'module' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moduleWorkload.map((mod) => (
            <div key={mod.counter_id || 'unassigned'} className={`rounded-3xl border p-5 flex flex-col justify-between space-y-4 shadow-xl ${cardBg}`}>
              {/* Header del Consultorio */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                    <Grid3X3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm font-display text-white">{mod.counter_name}</h3>
                    <p className="text-[10px] font-mono text-emerald-400">{mod.counter_code}</p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-sky-400">
                  {mod.total_tickets} turnos
                </span>
              </div>

              {/* Lista de Pacientes Asignados a este Módulo */}
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {mod.tickets.length > 0 ? (
                  mod.tickets.map((t) => {
                    const isUncalled = ['PROGRAMADO', 'CONFIRMADO', 'ESPERANDO', 'PAUSADO'].includes(t.status);
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                          d ? 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/60' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                              {t.ticket_number}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-300">{t.appointment_time || 'Sin hora'}</span>
                            <TypeBadge type={t.ticket_type} />
                          </div>
                          <p className="text-xs font-bold text-white uppercase">{t.patient_name}</p>
                          <p className="text-[10px] text-slate-400">{t.service_name} • CC: {t.document_number}</p>
                        </div>

                        {/* Botones rápidos en vista de módulo */}
                        {isUncalled && (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 transition"
                              title="Editar turno"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openCancelModal(t)}
                              className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition"
                              title="Cancelar turno"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-8">No hay turnos asignados a este consultorio.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 8. MODAL: PROGRAMAR NUEVO TURNO (+ PROGRAMAR TURNO) */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Programar Turno Anticipado"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fecha */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Fecha de Atención *</label>
                <input
                  type="date"
                  required
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                />
              </div>

              {/* Hora */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Hora de Cita *</label>
                <input
                  type="time"
                  required
                  value={formData.appointmentTime}
                  onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                />
              </div>
            </div>

            {/* Cédula y Búsqueda de Paciente */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Número de Cédula / Documento *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ej: 1094857493"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  onBlur={(e) => handleCheckPatient(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold border ${inputBg}`}
                />
                <button
                  type="button"
                  onClick={() => handleCheckPatient(formData.documentNumber)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold border border-slate-700 transition"
                >
                  Autocompletar
                </button>
              </div>
            </div>

            {/* Nombre Completo */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Nombre Completo del Paciente *</label>
              <input
                type="text"
                required
                placeholder="Nombre y Apellidos"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold uppercase border ${inputBg}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Edad */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Edad (años)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="Ej: 65"
                  value={formData.age}
                  onChange={(e) => {
                    const ageNum = Number(e.target.value);
                    setFormData({
                      ...formData,
                      age: e.target.value,
                      ticketType: ageNum >= 60 ? 'PRIORITARIO' : formData.ticketType
                    });
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Teléfono Móvil</label>
                <input
                  type="text"
                  placeholder="Ej: 3234790311"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                />
              </div>
            </div>

            {/* Selección de Servicio de Configuración */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Servicio / Tipo de Consulta *</label>
              <select
                required
                value={formData.serviceId}
                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Módulo / Consultorio */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Módulo / Consultorio Asignado</label>
                <select
                  value={formData.counterId}
                  onChange={(e) => setFormData({ ...formData, counterId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                >
                  <option value="">Sin Módulo Específico (General)</option>
                  {counters.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              {/* Funcionario */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Funcionario / Médico (Opcional)</label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                >
                  <option value="">Cualquier Funcionario Disponible</option>
                  {staffUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clasificación de Prioridad */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Prioridad de Atención</label>
              <select
                value={formData.ticketType}
                onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
              >
                <option value="NORMAL">Normal (Atención Estándar)</option>
                <option value="PRIORITARIO">★ Prioritario (Adulto Mayor 60+, Discapacidad, Embarazadas)</option>
                <option value="ESPECIAL">★★ Especial (Urgencia Administrativa)</option>
              </select>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Observaciones Administrativas</label>
              <textarea
                rows="2"
                placeholder="Notas adicionales..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${inputBg}`}
              />
            </div>

            {/* Botones Guardar / Cancelar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/25 transition flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>GUARDAR PROGRAMACIÓN</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 9. MODAL: EDITAR TURNO DIRECTAMENTE (SIN LLAMAR) */}
      {isEditModalOpen && selectedTicket && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Editar Turno Directamente — ${selectedTicket.ticket_number}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Modificando turno en estado <strong>{selectedTicket.status}</strong>. Los cambios reubicarán el turno en la cola automáticamente.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Fecha de Atención *</label>
                <input
                  type="date"
                  required
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Hora de Cita *</label>
                <input
                  type="time"
                  required
                  value={formData.appointmentTime}
                  onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Cédula del Paciente *</label>
              <input
                type="text"
                required
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border ${inputBg}`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold uppercase border ${inputBg}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Servicio *</label>
                <select
                  required
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Módulo / Consultorio</label>
                <select
                  value={formData.counterId}
                  onChange={(e) => setFormData({ ...formData, counterId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                >
                  <option value="">Sin Módulo Específico</option>
                  {counters.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Funcionario</label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                >
                  <option value="">Cualquier Funcionario</option>
                  {staffUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Prioridad</label>
                <select
                  value={formData.ticketType}
                  onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${inputBg}`}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="PRIORITARIO">★ Prioritario</option>
                  <option value="ESPECIAL">★★ Especial</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Observaciones</label>
              <textarea
                rows="2"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${inputBg}`}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/25 transition flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>GUARDAR CAMBIOS</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 10. MODAL: CANCELAR TURNO DIRECTAMENTE (CON CONFIRMACIÓN Y MOTIVO) */}
      {isCancelModalOpen && selectedTicket && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title="Confirmar Cancelación de Turno"
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>¿Deseas cancelar el turno {selectedTicket.ticket_number}?</span>
              </div>
              <div className="text-xs text-rose-300 space-y-1 pt-1">
                <p><strong>Paciente:</strong> {selectedTicket.patient_name} (CC: {selectedTicket.document_number})</p>
                <p><strong>Servicio:</strong> {selectedTicket.service_name}</p>
                <p><strong>Fecha Programada:</strong> {selectedTicket.scheduled_date || selectedTicket.created_date} - {selectedTicket.appointment_time || 'Sin hora'}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Motivo de Cancelación (Para Auditoría)</label>
              <textarea
                rows="3"
                required
                placeholder="Escriba la razón de la cancelación (ej: Solicitud del paciente, inasistencia informada...)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${inputBg}`}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                VOLVER
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>CANCELAR TURNO</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}

export default AdminScheduleView;
