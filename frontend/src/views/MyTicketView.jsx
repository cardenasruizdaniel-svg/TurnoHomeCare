import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  Bell,
  AlertCircle,
  Sparkles,
  Building2,
  User,
  ArrowLeft,
  Volume2,
  VolumeX,
  PhoneCall
} from 'lucide-react';
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
  const [calledModalOpen, setCalledModalOpen] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const ringIntervalRef = useRef(null);
  const activeAudioRef = useRef(null);

  const unlockAudio = () => {
    SoundService.getAudioContext();
    SoundService.init();
    setAudioUnlocked(true);
  };

  const playMobileAlarm = (ticketObj) => {
    unlockAudio();
    
    // 1. Sonido de campana / timbre fuerte
    SoundService.playChime(1.0);
    setTimeout(() => SoundService.playChime(1.0), 1200);

    // 2. Vibración del teléfono
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([600, 250, 600, 250, 600, 250, 600]);
      } catch {}
    }

    // 3. Locución de voz en el celular
    if (ticketObj) {
      const counterName = ticketObj.counter_name || 'su módulo de atención';
      const formattedTicket = SoundService.formatTicketForSpeech(ticketObj.ticket_number);
      const speechText = `Atención, turno ${formattedTicket}, por favor acercarse a ${counterName}`;
      
      setTimeout(() => {
        try {
          const url = `/api/tts?text=${encodeURIComponent(speechText)}`;
          const audio = new Audio(url);
          audio.volume = 1.0;
          activeAudioRef.current = audio;
          audio.play().catch(e => console.warn('Audio play error:', e));
        } catch (e) {
          console.warn('TTS error:', e);
        }
      }, 1500);
    }
  };

  const startContinuousRinging = (ticketObj) => {
    stopRinging();
    playMobileAlarm(ticketObj);
    
    // Repetir el timbre cada 6 segundos mientras esté llamando y no haya cerrado el modal
    ringIntervalRef.current = setInterval(() => {
      playMobileAlarm(ticketObj);
    }, 6000);
  };

  const stopRinging = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
      } catch {}
      activeAudioRef.current = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  };

  const loadTicket = async () => {
    try {
      const res = await api.trackTicket(id);
      if (res.success) {
        setData(res);
        if (res.ticket?.status === 'LLAMADO') {
          setCalledModalOpen(true);
          startContinuousRinging(res.ticket);
        } else if (res.ticket?.status === 'FINALIZADO' || res.ticket?.status === 'NO_PRESENTO') {
          stopRinging();
          setCalledModalOpen(false);
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
    return () => stopRinging();
  }, [id]);

  useEffect(() => {
    if (connected && socket && id) {
      joinTicket(id);

      const handleMyStatus = (updatedTicket) => {
        loadTicket();
        if (updatedTicket.status === 'LLAMADO') {
          setCalledModalOpen(true);
          startContinuousRinging(updatedTicket);
        } else {
          stopRinging();
        }
      };

      socket.on('ticket:my_status', handleMyStatus);
      return () => {
        socket.off('ticket:my_status', handleMyStatus);
      };
    }
  }, [connected, socket, id]);

  const handleDismissAlert = () => {
    stopRinging();
    setCalledModalOpen(false);
  };

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
    <div 
      onClick={unlockAudio}
      onTouchStart={unlockAudio}
      className="min-h-[calc(100vh-4rem)] bg-slate-950 p-4 sm:p-6 flex flex-col justify-center items-center font-sans relative"
    >
      
      {/* MODAL GIGANTE DE LLAMADO EN PANTALLA COMPLETA */}
      {calledModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border-4 border-emerald-400 shadow-2xl shadow-emerald-500/40 space-y-6 animate-pulse">
            
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300">
              <PhoneCall className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest">
                🔔 ¡ES TU TURNO AHORA!
              </span>
              <h1 className="text-6xl font-black font-display text-white tracking-tight">
                {ticket.ticket_number}
              </h1>
              <p className="text-lg font-bold text-sky-400">
                {ticket.patient_name}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border-2 border-slate-700 space-y-1">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">POR FAVOR DIRÍGETE A:</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 uppercase tracking-wide">
                {ticket.counter_name || 'Ventanilla de Atención'}
              </p>
            </div>

            <button
              onClick={handleDismissAlert}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/30 transition cursor-pointer active:scale-95"
            >
              ✅ ¡ENTENDIDO, YA VOY EN CAMINO!
            </button>

          </div>
        </div>
      )}

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

        {/* Audio / Timbre Status Bar */}
        <div 
          onClick={unlockAudio}
          className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs cursor-pointer"
        >
          <div className="flex items-center gap-2 text-emerald-300 font-bold">
            <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Timbre de Llamado Activo</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">Sonará en tu celular</span>
        </div>

        {/* Notificación de Llamado si aún no está cerrado */}
        {ticket.status === 'LLAMADO' && (
          <div 
            onClick={() => setCalledModalOpen(true)}
            className="p-4 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-center space-y-2 cursor-pointer animate-bounce"
          >
            <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-sm">
              <Bell className="w-5 h-5 text-emerald-400 animate-spin" />
              ¡TE ESTÁN LLAMANDO AHORA!
            </div>
            <p className="text-xs text-slate-300">
              Dirígete a: <strong className="text-white text-base">{ticket.counter_name || 'Ventanilla'}</strong>
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
              {current_calling_ticket || 'Ninguno'}
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
            Mantén esta pantalla abierta. Tu celular sonará y vibrará cuando sea tu turno.
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
