import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  PhoneCall,
  CheckCircle,
  UserX,
  PauseCircle,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  Building2,
  Clock,
  AlertCircle,
  FileText,
  ArrowRightLeft,
  Send,
  Stethoscope
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { StatusBadge, TypeBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

export function StaffDeskView() {
  const { user } = useAuth();
  const { socket, joinBranch, connected } = useSocket();

  const [counters, setCounters] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCounterId, setSelectedCounterId] = useState(() => {
    const saved = localStorage.getItem('deaturnos_staff_counter_id');
    return saved ? Number(saved) : 1;
  });

  const [currentTicket, setCurrentTicket] = useState(null);
  const [waitingTickets, setWaitingTickets] = useState([]);
  const [allBranchWaiting, setAllBranchWaiting] = useState([]);
  const [totalBranchWaiting, setTotalBranchWaiting] = useState(0);
  const [assignedServices, setAssignedServices] = useState([]);
  const [serviceCounts, setServiceCounts] = useState([]);
  const [queueTab, setQueueTab] = useState('all'); // 'all' | 'module'
  const [recommendedTicket, setRecommendedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal para finalizar con notas
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [attentionNotes, setAttentionNotes] = useState('');

  // Modal para Derivar / Transferir Turno a Consultorio
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetCounterId, setTargetCounterId] = useState('');
  const [targetServiceId, setTargetServiceId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Modal para Expedir Turno Manual (Adulto Mayor / Sin Celular)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualDoc, setManualDoc] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualAge, setManualAge] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualServiceId, setManualServiceId] = useState('');
  const [manualIsPriority, setManualIsPriority] = useState(false);
  const [manualCheckingDoc, setManualCheckingDoc] = useState(false);
  const [createdManualTicket, setCreatedManualTicket] = useState(null);

  const branchId = user?.branch_id || 1;

  // Cargar módulos y servicios disponibles
  useEffect(() => {
    api.getCounters(branchId).then(res => {
      if (res.success && res.counters) {
        setCounters(res.counters);
        if (res.counters.length > 0 && !selectedCounterId) {
          setSelectedCounterId(res.counters[0].id);
        }
      }
    });

    api.getPublicServices().then(res => {
      if (res.success && res.services) {
        setServices(res.services);
      }
    });
  }, [branchId]);

  // Guardar módulo en localStorage
  useEffect(() => {
    if (selectedCounterId) {
      localStorage.setItem('deaturnos_staff_counter_id', String(selectedCounterId));
      loadQueueAndStatus();
    }
  }, [selectedCounterId]);

  // Cargar cola y turno activo del módulo
  const loadQueueAndStatus = async () => {
    if (!selectedCounterId) return;
    setLoading(true);
    try {
      const res = await api.getWaitingQueue(branchId, selectedCounterId);
      if (res.success) {
        setWaitingTickets(res.waiting_tickets || []);
        setAllBranchWaiting(res.all_branch_waiting || []);
        setTotalBranchWaiting(res.total_branch_waiting || 0);
        setAssignedServices(res.assigned_services || []);
        setServiceCounts(res.service_counts || []);
        setRecommendedTicket(res.recommended_ticket || null);
        
        // Turno activo en este módulo
        if (res.counter_active_ticket) {
          setCurrentTicket(res.counter_active_ticket);
        } else {
          setCurrentTicket(null);
        }
      }
    } catch (e) {
      console.error('Error cargando cola:', e);
    } finally {
      setLoading(false);
    }
  };

  // Escuchar eventos en tiempo real
  useEffect(() => {
    if (connected && socket && branchId) {
      joinBranch(branchId);

      const handleUpdate = () => {
        loadQueueAndStatus();
      };

      socket.on('ticket:created', handleUpdate);
      socket.on('ticket:called', handleUpdate);
      socket.on('ticket:recalled', handleUpdate);
      socket.on('ticket:status_changed', handleUpdate);
      socket.on('queue:updated', handleUpdate);

      return () => {
        socket.off('ticket:created', handleUpdate);
        socket.off('ticket:called', handleUpdate);
        socket.off('ticket:recalled', handleUpdate);
        socket.off('ticket:status_changed', handleUpdate);
        socket.off('queue:updated', handleUpdate);
      };
    }
  }, [connected, socket, branchId, selectedCounterId]);

  // 1. LLAMAR SIGUIENTE (Aplica algoritmo inteligente de prioridad)
  const handleCallNext = async (specificTicketId = null) => {
    if (!selectedCounterId) {
      setErrorMsg('Selecciona un módulo o consultorio');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.callNextTicket({
        counterId: selectedCounterId,
        branchId,
        specificTicketId
      });

      if (res.success) {
        if (res.calledTicket) {
          setCurrentTicket(res.calledTicket);
          setSuccessMsg(`Turno ${res.calledTicket.ticket_number} llamado.`);
        } else {
          setCurrentTicket(null);
          setSuccessMsg('No hay más turnos en espera.');
        }
        loadQueueAndStatus();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al llamar turno');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. RE-LLAMAR
  const handleRecall = async () => {
    if (!currentTicket) return;
    setActionLoading(true);
    try {
      await api.recallTicket(currentTicket.id);
      setSuccessMsg(`Re-llamando turno ${currentTicket.ticket_number}...`);
      loadQueueAndStatus();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. INICIAR ATENCIÓN
  const handleStartAttention = async () => {
    if (!currentTicket) return;
    setActionLoading(true);
    try {
      await api.startAttention(currentTicket.id);
      setCurrentTicket(prev => ({ ...prev, status: 'EN_ATENCION' }));
      setSuccessMsg('Atención iniciada.');
      loadQueueAndStatus();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. FINALIZAR ATENCIÓN
  const handleCompleteTicket = async () => {
    if (!currentTicket) return;
    setActionLoading(true);
    try {
      await api.completeTicket(currentTicket.id, attentionNotes);
      setCurrentTicket(null);
      setAttentionNotes('');
      setIsFinishModalOpen(false);
      setSuccessMsg('Atención finalizada con éxito.');
      loadQueueAndStatus();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. NO SE PRESENTÓ
  const handleNoShow = async () => {
    if (!currentTicket) return;
    if (!window.confirm(`¿Confirmas marcar el turno ${currentTicket.ticket_number} como "No se presentó"?`)) return;
    setActionLoading(true);
    try {
      await api.markNoShow(currentTicket.id);
      setCurrentTicket(null);
      setSuccessMsg(`Turno ${currentTicket.ticket_number} marcado como No Presentó.`);
      loadQueueAndStatus();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 6. PAUSAR
  const handlePause = async () => {
    if (!currentTicket) return;
    setActionLoading(true);
    try {
      await api.pauseTicket(currentTicket.id);
      setCurrentTicket(null);
      setSuccessMsg(`Turno ${currentTicket.ticket_number} pausado.`);
      loadQueueAndStatus();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 7. DERIVAR / TRANSFERIR A CONSULTORIO O SERVICIO
  const handleTransferTicket = async (e) => {
    if (e) e.preventDefault();
    if (!currentTicket) return;
    setActionLoading(true);
    try {
      const res = await api.transferTicket(currentTicket.id, {
        targetServiceId: targetServiceId || null,
        targetCounterId: targetCounterId || null,
        notes: transferNotes,
        fromCounterId: selectedCounterId
      });
      if (res.success) {
        setSuccessMsg(`Turno ${currentTicket.ticket_number} derivado exitosamente.`);
        setCurrentTicket(null);
        setTransferNotes('');
        setTargetCounterId('');
        setTargetServiceId('');
        setIsTransferModalOpen(false);
        loadQueueAndStatus();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al derivar turno');
    } finally {
      setActionLoading(false);
    }
  };

  // 8. EXPEDIR TURNO MANUAL (ADULTO MAYOR / PRESENCIAL)
  const handleManualDocBlur = async () => {
    if (!manualDoc || manualDoc.trim().length < 4) return;
    setManualCheckingDoc(true);
    try {
      const res = await api.checkPatient(manualDoc.trim());
      if (res.success && res.exists && res.patient) {
        setManualName(res.patient.full_name || '');
        setManualAge(res.patient.age ? String(res.patient.age) : '');
        setManualPhone(res.patient.phone || '');
        if (Number(res.patient.age) >= 60 || res.patient.is_priority_auto) {
          setManualIsPriority(true);
        }
      }
    } catch (e) {
      console.warn('Error verificando documento:', e);
    } finally {
      setManualCheckingDoc(false);
    }
  };

  const handleManualAgeChange = (val) => {
    setManualAge(val);
    if (Number(val) >= 60) {
      setManualIsPriority(true);
    }
  };

  const handleCreateManualTicket = async (e) => {
    if (e) e.preventDefault();
    if (!manualDoc.trim() || !manualName.trim() || !manualServiceId) {
      setErrorMsg('Por favor completa la cédula, el nombre y el servicio requerido.');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await api.requestTicket({
        branchId,
        serviceId: Number(manualServiceId),
        patientData: {
          documentNumber: manualDoc.trim(),
          fullName: manualName.trim(),
          age: manualAge ? Number(manualAge) : 35,
          phone: manualPhone.trim() || null,
          isPriority: manualIsPriority
        }
      });
      if (res.success && res.ticket) {
        setCreatedManualTicket(res.ticket);
        setSuccessMsg(`Turno ${res.ticket.ticket_number} generado exitosamente.`);
        setManualDoc('');
        setManualName('');
        setManualAge('');
        setManualPhone('');
        setManualServiceId('');
        setManualIsPriority(false);
        loadQueueAndStatus();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al generar turno manual');
    } finally {
      setActionLoading(false);
    }
  };

  const currentCounterObj = counters.find(c => c.id === selectedCounterId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-white">PANEL DE ATENCIÓN EN VENTANILLA Y CONSULTORIO</h1>
            <p className="text-xs text-slate-400 font-medium">
              Funcionario / Médico: <strong className="text-slate-200">{user?.full_name}</strong> • Sede: <strong className="text-sky-400">{user?.branch_name || 'Central'}</strong>
            </p>
          </div>
        </div>

        {/* Quick Action: Expedir Turno Manual & Counter Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCreatedManualTicket(null);
              setIsManualModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-pink-600/25 transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ EXPEDIR TURNO (ADULTO MAYOR / PRESENCIAL)</span>
          </button>

          <div className="flex flex-col sm:items-end gap-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Puesto:
              </label>
              <select
                value={selectedCounterId}
                onChange={(e) => setSelectedCounterId(Number(e.target.value))}
                className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 shadow-inner"
              >
                {counters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            {assignedServices.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                <span className="text-[10px] text-slate-500 font-semibold">Servicios asignados:</span>
                {assignedServices.map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-bold text-sky-300">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Live Service Breakdown Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-400" />
            Turnos en Cola Hoy:
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-xs">
            {totalBranchWaiting} en Total
          </span>
          {serviceCounts.map((sc) => (
            <span
              key={sc.id}
              className={`px-2.5 py-1 rounded-xl text-xs border font-medium flex items-center gap-1.5 ${
                sc.count > 0
                  ? 'bg-sky-950/60 border-sky-500/40 text-sky-200'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <span>{sc.name}:</span>
              <strong className={sc.count > 0 ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                {sc.count}
              </strong>
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={loadQueueAndStatus}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition"
          title="Actualizar cola"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refrescar</span>
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Side: Current Ticket & Actions (7 Columns) */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          
          {/* Tarjeta del Turno Activo */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                TURNO EN ATENCIÓN
              </span>
              {currentTicket && (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold text-emerald-400 uppercase">
                    {currentTicket.status === 'LLAMADO' ? 'En Llamado' : 'En Atención'}
                  </span>
                </div>
              )}
            </div>

            {currentTicket ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl sm:text-5xl font-black font-display text-white tracking-tight">
                        {currentTicket.ticket_number}
                      </span>
                      <TypeBadge type={currentTicket.ticket_type} />
                    </div>
                    <p className="text-base font-bold text-sky-400">{currentTicket.service_name}</p>
                    <p className="text-xs text-slate-400">
                      Paciente: <strong className="text-slate-200">{currentTicket.patient_name}</strong> • Cédula: <strong className="text-slate-200">{currentTicket.document_number}</strong>
                    </p>
                    {currentTicket.notes && (
                      <p className="text-xs text-amber-300/90 italic mt-1 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        {currentTicket.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col gap-2">
                    <button
                      onClick={() => handleRecall()}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/25 transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Re-Llamar</span>
                    </button>

                    {/* Botón Derivar a Consultorio */}
                    <button
                      onClick={() => {
                        setTargetCounterId('');
                        setTargetServiceId('');
                        setTransferNotes('');
                        setIsTransferModalOpen(true);
                      }}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Derivar a Consultorio</span>
                    </button>
                  </div>
                </div>

                {/* Acciones del Turno en Atención */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {currentTicket.status === 'LLAMADO' && (
                    <button
                      onClick={() => handleStartAttention()}
                      disabled={actionLoading}
                      className="p-3.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Play className="w-5 h-5 text-emerald-400" />
                      <span>INICIAR ATENCIÓN</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setAttentionNotes('');
                      setIsFinishModalOpen(true);
                    }}
                    disabled={actionLoading}
                    className="p-3.5 rounded-2xl bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/40 text-teal-300 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <CheckCircle className="w-5 h-5 text-teal-400" />
                    <span>FINALIZAR ATENCIÓN</span>
                  </button>

                  <button
                    onClick={() => handleNoShow()}
                    disabled={actionLoading}
                    className="p-3.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <UserX className="w-5 h-5 text-rose-400" />
                    <span>NO SE PRESENTÓ</span>
                  </button>

                  <button
                    onClick={() => handlePause()}
                    disabled={actionLoading}
                    className="p-3.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <PauseCircle className="w-5 h-5 text-purple-400" />
                    <span>PAUSAR TURNO</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-300 font-display">Puesto de Atención Libre</p>
                  <p className="text-xs text-slate-500 mt-1">Presiona el botón a continuación para llamar al próximo paciente en fila.</p>
                </div>
              </div>
            )}

            {/* BOTÓN PRINCIPAL: LLAMAR SIGUIENTE TURNO */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              {(() => {
                const hasTicketsToCall = waitingTickets.length > 0 || allBranchWaiting.length > 0;
                const countToCall = waitingTickets.length > 0 ? waitingTickets.length : allBranchWaiting.length;
                const isBranchFallback = waitingTickets.length === 0 && allBranchWaiting.length > 0;

                return (
                  <button
                    onClick={() => handleCallNext()}
                    disabled={actionLoading || !hasTicketsToCall}
                    className={`w-full py-5 rounded-2xl font-black text-base sm:text-lg font-display tracking-wide shadow-xl flex items-center justify-center gap-3 transition-all duration-200 ${
                      hasTicketsToCall
                        ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white shadow-emerald-600/25 active:scale-[0.99] cursor-pointer'
                        : 'bg-slate-800/80 border border-slate-700/80 text-slate-500 shadow-none cursor-not-allowed opacity-50'
                    }`}
                  >
                    <PhoneCall className={`w-6 h-6 ${hasTicketsToCall ? 'animate-pulse text-white' : 'text-slate-600'}`} />
                    <span>
                      {hasTicketsToCall 
                        ? (isBranchFallback 
                            ? `LLAMAR SIGUIENTE TURNO (${countToCall} EN ESPERA EN SEDE)` 
                            : `LLAMAR SIGUIENTE TURNO (${countToCall} EN ESPERA)`)
                        : 'NO HAY PACIENTES EN COLA DE ESPERA'}
                    </span>
                  </button>
                );
              })()}
              
              {waitingTickets.length === 0 && allBranchWaiting.length === 0 && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/60 text-center">
                  <span className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    El botón se activará automáticamente apenas un paciente solicite su turno desde el celular o ventanilla.
                  </span>
                </div>
              )}

              {recommendedTicket && (waitingTickets.length > 0 || allBranchWaiting.length > 0) && (
                <div className="mt-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                  <span className="text-xs font-semibold text-purple-300 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Siguiente turno en orden: <strong className="font-mono text-sm text-white">{recommendedTicket.ticket_number}</strong> ({recommendedTicket.ticket_type === 'PRIORITARIO' ? 'Prioritario' : 'Normal'} • {recommendedTicket.service_name} • {recommendedTicket.patient_name})
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Side: Waiting Queue List (5 Columns) */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold font-display text-white text-sm">COLA DE ESPERA</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                {queueTab === 'module' ? waitingTickets.length : totalBranchWaiting} en espera
              </span>
            </div>

            {/* Queue Filter Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setQueueTab('all')}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  queueTab === 'all'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Toda la Sede ({totalBranchWaiting})
              </button>
              <button
                type="button"
                onClick={() => setQueueTab('module')}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  queueTab === 'module'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mi Módulo ({waitingTickets.length})
              </button>
            </div>

            {/* Notice if module is empty but branch has tickets */}
            {waitingTickets.length === 0 && totalBranchWaiting > 0 && queueTab === 'module' && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                <p className="font-bold">No hay turnos específicos para tus servicios asignados.</p>
                <p className="text-[11px] text-slate-400">
                  Hay <strong>{totalBranchWaiting}</strong> turno(s) en espera en la sede. Pulsa "Toda la Sede" arriba para verlos o pulsa el botón principal para llamarlos.
                </p>
              </div>
            )}

            {/* Queue List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {(queueTab === 'module' ? waitingTickets : allBranchWaiting).length > 0 ? (
                (queueTab === 'module' ? waitingTickets : allBranchWaiting).map((t) => {
                  const isRecommended = recommendedTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleCallNext(t.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between ${
                        isRecommended
                          ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/10 hover:bg-purple-900/50'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-sky-500/50 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-base text-white group-hover:text-sky-300 transition">
                            {t.ticket_number}
                          </span>
                          <TypeBadge type={t.ticket_type} />
                          {isRecommended && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-md">
                              Recomendado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{t.patient_name} • <strong className="text-sky-400">{t.service_name}</strong></p>
                      </div>

                      <div className="text-right">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl bg-slate-800 group-hover:bg-sky-600 text-slate-300 group-hover:text-white text-xs font-bold transition shadow"
                        >
                          Llamar
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  No hay pacientes en cola de espera en este momento.
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Modal para Finalizar Atención con Notas */}
      <Modal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        title={`Finalizar Atención - Turno ${currentTicket?.ticket_number}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            ¿Deseas agregar notas o comentarios sobre la atención realizada? (Opcional)
          </p>

          <textarea
            rows="3"
            placeholder="Observaciones de la consulta, fórmula médica, indicaciones..."
            value={attentionNotes}
            onChange={(e) => setAttentionNotes(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setIsFinishModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleCompleteTicket}
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg"
            >
              Confirmar Finalización
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal para Derivar / Transferir Turno a Consultorio */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={`Derivar Paciente a Consultorio - Turno ${currentTicket?.ticket_number}`}
      >
        <form onSubmit={handleTransferTicket} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
            <p className="text-slate-300 font-semibold">
              Paciente: <strong className="text-white">{currentTicket?.patient_name}</strong> (Cédula: {currentTicket?.document_number})
            </p>
            <p className="text-slate-400 text-[11px]">
              El paciente conservará su número de turno <strong className="text-indigo-300 font-mono">{currentTicket?.ticket_number}</strong> y pasará directamente a la fila del consultorio o médico seleccionado.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">
              Seleccionar Consultorio / Módulo de Destino:
            </label>
            <select
              value={targetCounterId}
              onChange={(e) => setTargetCounterId(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 font-bold text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Asignación Automática por Servicio --</option>
              {counters
                .filter(c => c.id !== selectedCounterId)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">
              Servicio Médico / Especialidad Requerida:
            </label>
            <select
              value={targetServiceId}
              onChange={(e) => setTargetServiceId(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 font-bold text-sky-400 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Conservar Servicio Actual ({currentTicket?.service_name}) --</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">
              Motivo o Indicación de la Derivación:
            </label>
            <textarea
              rows="2"
              placeholder="Ej: Orden médica autorizada, pasa a valoración con médico general..."
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Confirmar y Derivar Paciente</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para Expedir Turno Manual (Adulto Mayor / Pacientes Sin Celular) */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Expedir Turno Presencial / Adulto Mayor"
      >
        {createdManualTicket ? (
          <div className="space-y-6 text-center">
            <div className="p-6 rounded-3xl bg-slate-950 border-2 border-pink-500/40 shadow-2xl space-y-3">
              <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase">
                {createdManualTicket.ticket_type === 'PRIORITARIO' ? '⭐ Turno Prioritario' : 'Turno Normal'}
              </span>
              <div className="font-display font-black text-6xl text-white tracking-tight py-2">
                {createdManualTicket.ticket_number}
              </div>
              <p className="text-sm font-bold text-teal-400 uppercase">
                {createdManualTicket.service_name}
              </p>
              <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 space-y-1">
                <p>Paciente: <strong className="text-white">{createdManualTicket.patient_name}</strong></p>
                <p>Cédula: <strong className="font-mono text-slate-200">{createdManualTicket.document_number}</strong></p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Imprimir Comprobante
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatedManualTicket(null);
                  setIsManualModalOpen(false);
                }}
                className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 transition"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateManualTicket} className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
              Utiliza este formulario para expedir un turno a pacientes de la tercera edad, personas sin teléfono móvil o con dificultades para escanear el código QR.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Número de Cédula / Documento *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Ej: 4516342"
                  value={manualDoc}
                  onChange={(e) => setManualDoc(e.target.value.replace(/\D/g, ''))}
                  onBlur={handleManualDocBlur}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-white focus:outline-none focus:border-pink-500"
                />
                {manualCheckingDoc && (
                  <p className="text-[10px] text-sky-400">Buscando paciente...</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Nombre Completo del Paciente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Daniel Cárdenas Ruiz"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-bold text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Edad (Años)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="Ej: 65"
                  value={manualAge}
                  onChange={(e) => handleManualAgeChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                />
                {Number(manualAge) >= 60 && (
                  <span className="text-[10px] font-bold text-purple-400 block">
                    ⭐ Atención Prioritaria Automática (Adulto Mayor $\ge 60$)
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Teléfono / Celular (Opcional)</label>
                <input
                  type="tel"
                  placeholder="Ej: 3101234567"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 block">Servicio Médico Requerido *</label>
              <select
                required
                value={manualServiceId}
                onChange={(e) => setManualServiceId(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 font-bold text-sky-400 focus:outline-none focus:border-pink-500"
              >
                <option value="">-- Selecciona el servicio --</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - {s.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 block">Clasificar como Turno Prioritario</span>
                <span className="text-[10px] text-slate-400">Adultos mayores, personas con movilidad reducida o mujeres embarazadas</span>
              </div>
              <input
                type="checkbox"
                checked={manualIsPriority}
                onChange={(e) => setManualIsPriority(e.target.checked)}
                className="w-5 h-5 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white font-bold shadow-lg shadow-pink-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{actionLoading ? 'Expidiendo...' : 'Expedir Turno al Paciente'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
