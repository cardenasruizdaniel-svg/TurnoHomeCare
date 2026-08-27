import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, CheckCircle2, Bell, AlertCircle, Sparkles, Building2, User, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { StatusBadge, TypeBadge } from '../components/StatusBadge';
import SoundService from '../services/soundService';

export function MyTicketView() {
  const { id } = useParams();
  const { socket, joinTicket, connected } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [calledAlert, setCalledAlert] = useState(false);

  const loadTicket = async () => {
    try {
      const res = await api.trackTicket(id);
      if (res.success) {
        setData(res);
        if (res.ticket?.status === 'LLAMADO' || res.ticket?.status === 'EN_ATENCION') {
          setCalledAlert(true);
        }
      }
    } catch (e) {
      setErrorMsg(e.message || 'No se pudo cargar el turno');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [id]);

  useEffect(() => {
    if (connected && socket && id) {
      joinTicket(id);

      const handleMyStatus = (updatedTicket) => {
        // console.log('[Mi Turno] Actualización:', updatedTicket);
        loadTicket();
        if (updatedTicket.status === 'LLAMADO') {
          setCalledAlert(true);
          SoundService.playChime(1.0);
          if (navigator.vibrate) {
            navigator.vibrate([300, 100, 300]);
          }
        }
      };

      socket.on('ticket:my_status', handleMyStatus);
      return () => {
        socket.off('ticket:my_status', handleMyStatus);
      };
    }
  }, [connected, socket, id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Cargando estado de tu turno...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Turno no encontrado</h2>
          <p className="text-xs text-slate-400">{errorMsg || 'El turno solicitado no existe o ha expirado.'}</p>
          <Link
            to="/solicitar-turno"
            className="inline-block px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition"
          >
            Solicitar Nuevo Turno
          </Link>
        </div>
      </div>
    );
  }

  const { ticket, current_calling_ticket, current_counter, ahead_count, estimated_wait_minutes } = data;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 p-4 sm:p-6 flex flex-col justify-center items-center font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Link to="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Inicio
          </Link>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            <TypeBadge type={ticket.ticket_type} />
          </div>
        </div>

        {/* Notificación de Llamado */}
        {ticket.status === 'LLAMADO' && (
          <div className="p-4 rounded-2xl bg-sky-500/20 border-2 border-sky-400 text-center space-y-2 animate-bounce">
            <div className="flex items-center justify-center gap-2 text-sky-300 font-bold text-sm">
              <Bell className="w-5 h-5 text-sky-400 animate-spin" />
              ¡ES TU TURNO! POR FAVOR ACÉRCATE
            </div>
            <p className="text-xs text-slate-300">
              Dirígete a: <strong className="text-white text-sm">{ticket.counter_name || 'Ventanilla'}</strong>
            </p>
          </div>
        )}

        {/* Tarjeta Central del Turno */}
        <div className="text-center space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">TU NÚMERO DE TURNO</p>
          <div className="font-display font-black text-6xl sm:text-7xl text-white tracking-tight">
            {ticket.ticket_number}
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-sky-400">{ticket.service_name}</p>
            <p className="text-xs text-slate-400 font-medium">
              {ticket.patient_name} • {ticket.branch_name}
            </p>
          </div>
        </div>

        {/* Estado de la Cola en Vivo */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
            <span className="text-slate-400">Atendiendo actualmente:</span>
            <span className="font-mono font-bold text-sky-400 text-sm">
              {current_calling_ticket}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Turnos antes que el tuyo:</span>
            <span className="font-bold text-white text-base">
              {ahead_count}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Tiempo aproximado:</span>
            <span className="font-semibold text-emerald-400">
              ~{estimated_wait_minutes} minutos
            </span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-[11px] text-slate-500">
            Esta pantalla se actualiza en tiempo real. No es necesario recargar.
          </p>
          <button
            onClick={loadTicket}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            ↻ Actualizar manualmente
          </button>
        </div>

      </div>
    </div>
  );
}
