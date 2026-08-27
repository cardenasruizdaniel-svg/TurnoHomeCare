import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Volume2, VolumeX, Building2, Clock, Sparkles, AlertCircle, Stethoscope, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import SoundService from '../services/soundService';

export function PublicDisplayView() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const branchId = Number(params.branchId || searchParams.get('branchId') || 1);

  const { socket, joinBranch, connected } = useSocket();
  const [displayData, setDisplayData] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('deaturnos_audio_enabled');
    return saved !== 'false'; // Por defecto activo
  });
  const [callingAnimation, setCallingAnimation] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const animationTimeoutRef = useRef(null);

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Activar audio automáticamente si ya estaba configurado
  const enableAudio = () => {
    SoundService.getAudioContext();
    SoundService.playChime(0.4);
    setAudioEnabled(true);
    localStorage.setItem('deaturnos_audio_enabled', 'true');
  };

  const toggleAudio = (e) => {
    if (e) e.stopPropagation();
    if (audioEnabled) {
      setAudioEnabled(false);
      localStorage.setItem('deaturnos_audio_enabled', 'false');
    } else {
      enableAudio();
    }
  };

  // Escuchar cualquier interacción en la pantalla para desbloquear Web Audio API
  useEffect(() => {
    const handleUserInteraction = () => {
      if (audioEnabled) {
        SoundService.getAudioContext();
      }
    };
    window.addEventListener('click', handleUserInteraction, { once: true });
    window.addEventListener('keydown', handleUserInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, [audioEnabled]);

  // Carga inicial
  const loadDisplayData = async () => {
    try {
      const res = await api.getPublicDisplay(branchId);
      if (res.success) {
        setDisplayData(res);
      }
    } catch (e) {
      console.error('Error cargando datos de pantalla:', e);
    }
  };

  useEffect(() => {
    loadDisplayData();
  }, [branchId]);

  // Manejo de eventos en tiempo real con Socket.IO
  useEffect(() => {
    if (connected && socket) {
      joinBranch(branchId);

      const handleTicketCalled = (ticket) => {
        // console.log('[Pantalla] Turno llamado:', ticket);
        loadDisplayData();

        // Disparar animación de destello
        setCallingAnimation(true);
        if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = setTimeout(() => {
          setCallingAnimation(false);
        }, 8000);

        // Reproducir sonido y voz si el usuario activó el audio
        if (audioEnabled && ticket) {
          const settings = displayData?.settings || {};
          const playSound = settings.SONIDO_CAMPANA?.value !== false;
          const playVoice = settings.VOZ_SINTETIZADA?.value !== false;
          const volume = Number(settings.VOLUMEN_AUDIO?.value || 1.0);
          const repetitions = Number(settings.REPETICIONES_LLAMADO?.value || 1);
          const template = settings.PLANTILLA_VOZ?.value;

          SoundService.announceTicket({
            ticketNumber: ticket.ticket_number,
            counterName: ticket.counter_name,
            template,
            playSound,
            playVoice,
            volume,
            repetitions
          });
        }
      };

      const handleTicketRecalled = (ticket) => {
        handleTicketCalled(ticket);
      };

      const handleStatusChanged = () => {
        loadDisplayData();
      };

      const handleConfigUpdated = () => {
        loadDisplayData();
      };

      socket.on('ticket:called', handleTicketCalled);
      socket.on('ticket:recalled', handleTicketRecalled);
      socket.on('ticket:status_changed', handleStatusChanged);
      socket.on('config:updated', handleConfigUpdated);

      return () => {
        socket.off('ticket:called', handleTicketCalled);
        socket.off('ticket:recalled', handleTicketRecalled);
        socket.off('ticket:status_changed', handleStatusChanged);
        socket.off('config:updated', handleConfigUpdated);
      };
    }
  }, [connected, socket, branchId, audioEnabled, displayData]);

  const currentTicket = displayData?.current_ticket;
  const recentTickets = displayData?.recent_tickets || [];
  const company = displayData?.company || { name: 'IPS Salud Integral & Vida' };
  const branch = displayData?.branch || { name: 'Sede Principal' };
  const isRealDomain = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const publicRequestUrl = isRealDomain
    ? `${window.location.origin}/solicitar-turno?branchId=${branchId}`
    : (displayData?.public_request_url || `${window.location.origin}/solicitar-turno?branchId=${branchId}`);
  const bannerMessage = displayData?.settings?.MENSAJE_PANTALLA?.value || 'Por favor permanezca atento a la pantalla y cuide sus pertenencias.';

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      
      {/* 1. Barra Superior Institucional */}
      <header className="h-20 bg-slate-900/90 border-b border-slate-800 px-8 flex items-center justify-between shadow-2xl z-20">
        <div className="flex items-center gap-4">
          {company.logo_url ? (
            <div className="w-14 h-14 rounded-2xl bg-white p-1 flex items-center justify-center shadow-lg shadow-pink-500/10 border border-slate-700">
              <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-teal-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-display tracking-tight text-white">{company.name}</h1>
              {company.slogan && (
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10px] font-bold">
                  {company.slogan}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-teal-400 flex items-center gap-2 mt-0.5">
              <Building2 className="w-3.5 h-3.5" />
              {branch.name}
            </p>
          </div>
        </div>

        {/* Centro / Audio Toggle Indicator */}
        <div className="flex items-center gap-4">
          {!audioEnabled ? (
            <button
              onClick={enableAudio}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition animate-bounce"
            >
              <VolumeX className="w-4 h-4" />
              Click para Activar Sonido / Voz
            </button>
          ) : (
            <button
              onClick={toggleAudio}
              title="Click para silenciar o cambiar volumen"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Voz y Sonido Activo</span>
            </button>
          )}

          {/* Reloj Digital */}
          <div className="text-right bg-slate-950/60 px-5 py-2 rounded-2xl border border-slate-800">
            <p className="text-2xl font-mono font-bold text-white tracking-widest leading-none">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[11px] font-medium text-slate-400 capitalize mt-0.5">
              {currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
      </header>

      {/* 2. Área Central Dividida (Izquierda: Turno Actual | Derecha: Código QR) */}
      <main className="flex-1 grid grid-cols-12 gap-8 p-8 overflow-hidden items-center">
        
        {/* ÁREA IZQUIERDA: Turno Actual (7 columnas) */}
        <div className="col-span-12 lg:col-span-7 h-full flex flex-col justify-center">
          <div className={`relative rounded-3xl p-8 border transition-all duration-700 h-full flex flex-col justify-between shadow-2xl ${
            callingAnimation 
              ? 'bg-gradient-to-br from-sky-950/90 via-sky-900/60 to-slate-900 border-sky-400 shadow-sky-500/30 animate-pulse'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            
            {/* Header del Turno */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-sm font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                TURNO ACTUAL EN LLAMADO
              </div>
              {currentTicket?.ticket_type === 'PRIORITARIO' && (
                <span className="px-3.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold uppercase tracking-wider animate-pulse">
                  ★ Atención Prioritaria
                </span>
              )}
            </div>

            {/* Número de Turno Gigante */}
            <div className="text-center my-auto py-4">
              {currentTicket ? (
                <div className="space-y-4">
                  <div className={`font-display font-black tracking-tighter transition-all duration-500 ${
                    callingAnimation ? 'text-sky-300 scale-105' : 'text-white'
                  }`}
                  style={{ fontSize: 'clamp(5rem, 14vw, 11rem)', lineHeight: 0.9 }}>
                    {currentTicket.ticket_number}
                  </div>

                  <div className="space-y-2 mt-4">
                    <p className="text-2xl sm:text-4xl font-bold font-display uppercase tracking-wide text-sky-400">
                      {currentTicket.service_name}
                    </p>
                    <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-slate-950/70 border border-slate-700/80 shadow-lg">
                      <span className="text-sm uppercase font-semibold text-slate-400">Dirigirse a:</span>
                      <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 uppercase tracking-tight">
                        {currentTicket.counter_name}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                    <Clock className="w-10 h-10" />
                  </div>
                  <p className="text-3xl font-bold text-slate-400 font-display">En espera del próximo llamado</p>
                  <p className="text-sm text-slate-500">Los turnos se mostrarán automáticamente al ser llamados.</p>
                </div>
              )}
            </div>

            {/* Footer de la tarjeta izquierda */}
            <div className="text-xs text-slate-500 flex items-center justify-between pt-4 border-t border-slate-800/80">
              <span>Actualización en tiempo real vía WebSockets</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Sistema Conectado
              </span>
            </div>

          </div>
        </div>

        {/* ÁREA DERECHA: Obtener Turno QR (5 columnas) */}
        <div className="col-span-12 lg:col-span-5 h-full flex flex-col justify-center">
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 h-full flex flex-col justify-between items-center text-center shadow-2xl">
            
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
                Digital & Sin Filas
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-display text-white">OBTÉN TU TURNO</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
                Escanea el código QR con la cámara de tu celular para solicitar tu turno al instante.
              </p>
            </div>

            {/* Código QR Gigante y Nítido */}
            <div className="my-auto p-5 rounded-3xl bg-white shadow-2xl shadow-purple-500/10 border-4 border-slate-800 hover:scale-105 transition-transform duration-300">
              <QRCodeSVG
                value={publicRequestUrl}
                size={230}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-2 max-w-xs w-full">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-sky-400 bg-sky-500/10 py-2 px-4 rounded-xl border border-sky-500/20">
                <span>1. Escanea</span>
                <span>→</span>
                <span>2. Ingresa Cédula</span>
                <span>→</span>
                <span>3. Tu Turno</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 break-all font-mono">
                {publicRequestUrl}
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* 3. Área Inferior: Historial de Últimos Turnos Llamados */}
      <footer className="bg-slate-900/95 border-t border-slate-800 px-8 py-4 z-20">
        <div className="flex items-center gap-4">
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Clock className="w-4 h-4 text-sky-400" />
            ÚLTIMOS LLAMADOS:
          </div>

          <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
            {recentTickets.length > 0 ? (
              recentTickets.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className="shrink-0 flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-sm shadow-md"
                >
                  <span className="font-mono font-black text-base text-white">{t.ticket_number}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-xs font-semibold text-slate-300 truncate max-w-[130px]">{t.service_name}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-xs font-bold text-emerald-400 truncate max-w-[110px]">{t.counter_name}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No hay historial reciente disponible para hoy.</p>
            )}
          </div>
        </div>

        {/* Mensaje Institucional Inferior */}
        <div className="mt-2 text-center text-[11px] text-slate-500 font-medium">
          {bannerMessage}
        </div>
      </footer>

    </div>
  );
}
