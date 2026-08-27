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

  const audioEnabledRef = useRef(audioEnabled);
  const displayDataRef = useRef(displayData);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  useEffect(() => {
    displayDataRef.current = displayData;
  }, [displayData]);

  useEffect(() => {
    SoundService.init();
  }, []);

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

        // Reproducir sonido y voz si el audio está activo
        if (audioEnabledRef.current && ticket) {
          const currentSettings = displayDataRef.current?.settings || {};
          const playSound = currentSettings.SONIDO_CAMPANA?.value !== false;
          const playVoice = currentSettings.VOZ_SINTETIZADA?.value !== false;
          const volume = Number(currentSettings.VOLUMEN_AUDIO?.value || 1.0);
          const repetitions = Number(currentSettings.REPETICIONES_LLAMADO?.value || 1);
          const template = currentSettings.PLANTILLA_VOZ?.value;

          SoundService.announceTicket({
            ticketNumber: ticket.ticket_number,
            counterName: ticket.counter_name || (ticket.counter_code ? `Consultorio ${ticket.counter_code}` : 'Consultorio'),
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
  }, [connected, socket, branchId]);

  const currentTicket = displayData?.current_ticket;
  const recentTickets = displayData?.recent_tickets || [];
  const company = displayData?.company || { name: 'HomeCare del Quindío I.P.S.', slogan: 'Bienestar en casa.' };
  const branch = displayData?.branch || { name: 'Sede Principal' };
  const isRealDomain = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const publicRequestUrl = isRealDomain
    ? `${window.location.origin}/solicitar-turno?branchId=${branchId}`
    : (displayData?.public_request_url || `${window.location.origin}/solicitar-turno?branchId=${branchId}`);
  
  const rawBanners = displayData?.settings?.BANNERS_PUBLICIDAD?.value;
  const banners = React.useMemo(() => {
    let list = [];
    if (Array.isArray(rawBanners)) list = rawBanners;
    else if (typeof rawBanners === 'string') {
      try { list = JSON.parse(rawBanners); } catch { list = []; }
    }
    const filtered = list.filter(b => b && b.isActive !== false);
    return filtered.length > 0 ? filtered : [
      {
        id: 'b1',
        title: 'HomeCare del Quindío I.P.S.',
        subtitle: 'Bienestar y atención médica con calidez humana en la comodidad de su hogar.',
        tag: 'Bienestar en Casa',
        imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
        isActive: true
      },
      {
        id: 'b2',
        title: 'Citas y Consultas Médicas',
        subtitle: 'Medicina general, terapia física, nutrición y toma de muestras a domicilio.',
        tag: 'Nuestros Servicios',
        imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
        isActive: true
      },
      {
        id: 'b3',
        title: 'Atención Ágil y Sin Filas',
        subtitle: 'Escanea el código QR con tu celular y sigue tu turno en tiempo real.',
        tag: 'Turno Digital',
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
        isActive: true
      }
    ];
  }, [rawBanners]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slideDurationSeconds = Number(displayData?.settings?.TIEMPO_BANNER_SEGUNDOS?.value || 7);

  // Rotación automática de banners publicitarios
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % banners.length);
    }, slideDurationSeconds * 1000);
    return () => clearInterval(interval);
  }, [banners.length, slideDurationSeconds]);

  const currentBanner = banners[currentSlideIndex] || banners[0];
  const marqueeText = displayData?.settings?.MARQUESINA_PANTALLA?.value 
    || displayData?.settings?.MENSAJE_PANTALLA?.value
    || '🌸 HomeCare del Quindío I.P.S. • Bienestar en casa • Citas médicas y atención domiciliaria • Mantenga su documento de identidad a la mano • Turnos prioritarios para adultos mayores.';

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

      {/* 2. Cuerpo Principal: Turno Gigante (7 cols) y Banner Publicitario Multimedia (5 cols) */}
      <main className="flex-1 p-8 grid grid-cols-12 gap-8 items-center max-h-[calc(100vh-160px)]">
        
        {/* ÁREA IZQUIERDA: Turno Activo (7 columnas) */}
        <div className="col-span-12 lg:col-span-7 h-full flex flex-col justify-center">
          <div className={`rounded-3xl bg-slate-900/90 border border-slate-800 p-8 h-full flex flex-col justify-between shadow-2xl transition-all duration-300 relative overflow-hidden ${
            callingAnimation ? 'ring-4 ring-sky-500/60 shadow-sky-500/20 bg-slate-900' : ''
          }`}>
            
            {/* Header del Turno */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full ${callingAnimation ? 'bg-sky-400 animate-ping' : 'bg-emerald-500'}`} />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {currentTicket ? 'Llamando Ahora' : 'Módulo de Atención'}
                </span>
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

        {/* ÁREA DERECHA: Banner Multimedia Rotativo & Código QR (5 columnas) */}
        <div className="col-span-12 lg:col-span-5 h-full flex flex-col justify-center">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 h-full flex flex-col justify-between shadow-2xl relative overflow-hidden">
            
            {/* Slide Publicitario Actual */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex-1 flex flex-col justify-end p-6 shadow-inner min-h-[260px]">
              {/* Imagen de Fondo con Fade */}
              {currentBanner?.imageUrl && (
                <img
                  src={currentBanner.imageUrl}
                  alt={currentBanner.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-35 transition-all duration-700 hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/20" />

              {/* Contenido del Banner */}
              <div className="relative z-10 space-y-2">
                {currentBanner?.tag && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[11px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    {currentBanner.tag}
                  </span>
                )}
                <h3 className="text-xl sm:text-2xl font-black font-display text-white leading-snug drop-shadow-md">
                  {currentBanner?.title}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {currentBanner?.subtitle}
                </p>
              </div>

              {/* Indicadores de Puntos de Navegación */}
              {banners.length > 1 && (
                <div className="relative z-10 flex items-center gap-1.5 mt-3">
                  {banners.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentSlideIndex ? 'w-6 bg-pink-500' : 'w-2 bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Código QR Flotante para Pedir Turno */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase">
                  Solicitud Móvil
                </span>
                <p className="text-sm font-extrabold text-white font-display">Escanea para tu Turno</p>
                <p className="text-[11px] text-slate-400">Usa la cámara de tu celular con tus datos 4G/5G</p>
              </div>

              <div className="p-2 bg-white rounded-xl shadow-lg border border-slate-700 shrink-0">
                <QRCodeSVG
                  value={publicRequestUrl}
                  size={76}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* 3. Área Inferior: Historial de Últimos Turnos & Marquesina Animada */}
      <footer className="bg-slate-900/95 border-t border-slate-800 px-8 py-3 z-20 space-y-2">
        <div className="flex items-center gap-4">
          <div className="shrink-0 flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Clock className="w-4 h-4 text-sky-400" />
            ÚLTIMOS LLAMADOS:
          </div>

          <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
            {recentTickets.length > 0 ? (
              recentTickets.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className="shrink-0 flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs shadow-md"
                >
                  <span className="font-mono font-black text-sm text-white">{t.ticket_number}</span>
                  <span className="text-slate-600">|</span>
                  <span className="font-semibold text-slate-300 truncate max-w-[120px]">{t.service_name}</span>
                  <span className="text-slate-600">→</span>
                  <span className="font-bold text-emerald-400 truncate max-w-[100px]">{t.counter_name}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No hay historial reciente disponible para hoy.</p>
            )}
          </div>
        </div>

        {/* Marquesina Animada de Publicidad y Avisos Institucionales */}
        <div className="overflow-hidden whitespace-nowrap bg-slate-950/70 py-1 px-4 rounded-xl border border-slate-800/60 relative">
          <div className="inline-block animate-marquee text-xs font-medium text-slate-300">
            <span className="mx-4">{marqueeText}</span>
            <span className="mx-4 text-pink-400">•</span>
            <span className="mx-4">{marqueeText}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
