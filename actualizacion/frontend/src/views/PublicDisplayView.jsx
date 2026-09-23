import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Volume2, VolumeX, Building2, Clock, Sparkles, AlertCircle, Stethoscope, CheckCircle, Sun, Moon } from 'lucide-react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import SoundService from '../services/soundService';

export function PublicDisplayView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams();
  
  const [availableBranches, setAvailableBranches] = useState([]);
  const [branchId, setBranchId] = useState(() => {
    const fromUrl = params.branchId || searchParams.get('branchId');
    if (fromUrl) return fromUrl === 'all' ? 'all' : Number(fromUrl);
    const saved = localStorage.getItem('deaturnos_tv_branch_id');
    return saved ? (saved === 'all' ? 'all' : Number(saved)) : 1;
  });

  const { isDark, toggleTheme } = useTheme();
  const d = isDark;
  const { socket, joinBranch, connected } = useSocket();
  const [displayData, setDisplayData] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('deaturnos_audio_enabled');
    return saved !== 'false';
  });
  const [callingAnimation, setCallingAnimation] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const animationTimeoutRef = useRef(null);

  // Cargar sedes disponibles para selector de TV
  useEffect(() => {
    api.getPublicBranches().then(res => {
      if (res.success && res.branches) {
        setAvailableBranches(res.branches);
      }
    }).catch(err => console.warn('Error cargando sedes públicas:', err));
  }, []);

  const handleBranchChange = (newBranchId) => {
    const parsed = newBranchId === 'all' ? 'all' : Number(newBranchId);
    setBranchId(parsed);
    localStorage.setItem('deaturnos_tv_branch_id', String(parsed));
  };

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
    const interval = setInterval(() => {
      loadDisplayData();
    }, 4000);
    return () => clearInterval(interval);
  }, [branchId]);

  // Manejo de eventos en tiempo real con Socket.IO
  useEffect(() => {
    if (connected && socket) {
      joinBranch(branchId);

      const handleTicketCalled = (ticket) => {
        loadDisplayData();

        setCallingAnimation(true);
        if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = setTimeout(() => {
          setCallingAnimation(false);
        }, 8000);

        if (audioEnabledRef.current && ticket) {
          const currentSettings = displayDataRef.current?.settings || {};
          const playSound = currentSettings.SONIDO_CAMPANA?.value !== false;
          const playVoice = currentSettings.VOZ_SINTETIZADA?.value !== false;
          const volume = Number(currentSettings.VOLUMEN_AUDIO?.value || 1.0);
          const repetitions = Number(currentSettings.REPETICIONES_LLAMADO?.value || 1);
          const template = currentSettings.PLANTILLA_VOZ?.value;

          SoundService.announceTicket({
            ticketNumber: ticket.ticket_number,
            patientName: ticket.patient_name || '',
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
      socket.on('queue:updated', handleStatusChanged);
      socket.on('config:updated', handleConfigUpdated);

      return () => {
        socket.off('ticket:called', handleTicketCalled);
        socket.off('ticket:recalled', handleTicketRecalled);
        socket.off('ticket:status_changed', handleStatusChanged);
        socket.off('queue:updated', handleStatusChanged);
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
  
  const rawBanners = displayData?.settings?.BANNERS_PUBLICIDAD?.value || displayData?.settings?.BANNERS_PUBLICIDAD;
  const banners = React.useMemo(() => {
    let list = [];
    if (Array.isArray(rawBanners)) list = rawBanners;
    else if (typeof rawBanners === 'string') {
      try { list = JSON.parse(rawBanners); } catch { list = []; }
    }
    const filtered = list.filter(b => b && typeof b === 'object' && b.isActive !== false).map(b => ({
      ...b,
      title: typeof b.title === 'string' ? b.title : '',
      subtitle: typeof b.subtitle === 'string' ? b.subtitle : '',
      tag: typeof b.tag === 'string' ? b.tag : '',
      imageUrl: typeof b.imageUrl === 'string' ? b.imageUrl : '',
      videoUrl: typeof b.videoUrl === 'string' ? b.videoUrl : ''
    }));
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
  const slideDurationSeconds = Number(displayData?.settings?.TIEMPO_BANNER_SEGUNDOS?.value || displayData?.settings?.TIEMPO_BANNER_SEGUNDOS || 7);

  // Rotación automática de banners publicitarios
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % banners.length);
    }, slideDurationSeconds * 1000);
    return () => clearInterval(interval);
  }, [banners.length, slideDurationSeconds]);

  const currentBanner = banners[currentSlideIndex] || banners[0];
  const rawMarquee = displayData?.settings?.MARQUESINA_PANTALLA?.value || displayData?.settings?.MARQUESINA_PANTALLA || displayData?.settings?.MENSAJE_PANTALLA?.value || displayData?.settings?.MENSAJE_PANTALLA;
  const marqueeText = typeof rawMarquee === 'string' ? rawMarquee : '🌸 HomeCare del Quindío I.P.S. • Bienestar en casa • Citas médicas y atención domiciliaria • Mantenga su documento de identidad a la mano • Turnos prioritarios para adultos mayores.';

  const [audioUnlocked, setAudioUnlocked] = useState(() => {
    return localStorage.getItem('deaturnos_tv_audio_unlocked') === 'true';
  });

  const unlockAudio = () => {
    SoundService.getAudioContext();
    SoundService.playChime(0.5);
    SoundService.speak('Sistema de sonido activo', { volume: 0.9 });
    setAudioUnlocked(true);
    setAudioEnabled(true);
    localStorage.setItem('deaturnos_tv_audio_unlocked', 'true');
    localStorage.setItem('deaturnos_audio_enabled', 'true');
  };

  const isVideoUrl = (url, mediaType) => {
    if (mediaType === 'video') return true;
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return (
      lower.startsWith('data:video/') ||
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.ogg') ||
      lower.endsWith('.mov') ||
      lower.includes('/video/')
    );
  };

  const hasVideo = isVideoUrl(currentBanner?.videoUrl || currentBanner?.imageUrl, currentBanner?.mediaType);
  const bannerMediaSrc = currentBanner?.videoUrl || currentBanner?.imageUrl;

  return (
    <div 
      onClick={() => {
        if (!audioUnlocked) unlockAudio();
      }}
      className={`fixed inset-0 flex flex-col justify-between overflow-hidden select-none font-sans cursor-pointer transition-colors duration-300 ${
        d ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
      }`}
    >
      
      {/* Barra de Activación de Audio */}
      {!audioUnlocked && (
        <div 
          onClick={unlockAudio}
          className="bg-gradient-to-r from-amber-600 via-pink-600 to-teal-600 text-white text-center py-2 px-4 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3 shadow-2xl cursor-pointer animate-pulse z-50 border-b border-white/20"
        >
          <Volume2 className="w-5 h-5 animate-bounce" />
          <span>🔊 ¡HAGA CLIC EN CUALQUIER PARTE DE LA PANTALLA PARA ACTIVAR EL SONIDO Y LA VOZ DE LLAMADO!</span>
          <Volume2 className="w-5 h-5 animate-bounce" />
        </div>
      )}

      {/* 1. Barra Superior Institucional */}
      <header className={`h-20 px-8 flex items-center justify-between shadow-2xl z-20 transition-colors duration-300 ${
        d ? 'bg-slate-900/90 border-b border-slate-800' : 'bg-white/95 border-b border-slate-200 shadow-md'
      }`}>
        <div className="flex items-center gap-4">
          {company.logo_url ? (
            <div className={`w-14 h-14 rounded-2xl bg-white p-1 flex items-center justify-center shadow-lg border ${
              d ? 'border-slate-700 shadow-pink-500/10' : 'border-slate-200 shadow-slate-200/50'
            }`}>
              <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-teal-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-2xl font-black font-display tracking-tight ${d ? 'text-white' : 'text-slate-900'}`}>{company.name}</h1>
              {company.slogan && (
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-500 text-[10px] font-bold">
                  {company.slogan}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
              <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              {availableBranches.length > 0 ? (
                <select
                  value={branchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className={`text-xs font-bold px-2 py-0.5 rounded-lg border outline-none cursor-pointer ${
                    d
                      ? 'bg-slate-800 text-teal-300 border-slate-700 hover:border-teal-500'
                      : 'bg-teal-50 text-teal-700 border-teal-200 hover:border-teal-400'
                  }`}
                  title="Cambiar la Sede que se muestra en esta pantalla TV"
                >
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                  <option value="all">🌐 Todas las Sedes (Global)</option>
                </select>
              ) : (
                <span className="text-xs font-semibold text-teal-500">{branch.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Centro / Audio Toggle & Theme Button */}
        <div className="flex items-center gap-3">
          {!audioEnabled ? (
            <button
              onClick={enableAudio}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 border border-amber-500/40 text-xs font-bold transition animate-bounce"
            >
              <VolumeX className="w-4 h-4" />
              Click para Activar Sonido / Voz
            </button>
          ) : (
            <button
              onClick={toggleAudio}
              title="Click para silenciar o cambiar volumen"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition cursor-pointer border ${
                d 
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300' 
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>Voz y Sonido Activo</span>
            </button>
          )}

          {/* Botón Cambiar Tema TV */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
            title={d ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className={`p-2.5 rounded-2xl border font-semibold transition-all duration-300 ${
              d
                ? 'bg-slate-950 border-slate-700 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/40'
                : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm'
            }`}
          >
            {d ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Reloj Digital */}
          <div className={`text-right px-5 py-2 rounded-2xl border transition-colors ${
            d ? 'bg-slate-950/60 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
          }`}>
            <p className="text-2xl font-mono font-bold tracking-widest leading-none">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className={`text-[11px] font-medium capitalize mt-0.5 ${d ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
      </header>

      {/* 2. Cuerpo Principal */}
      <main className="flex-1 p-8 grid grid-cols-12 gap-8 items-center max-h-[calc(100vh-160px)]">
        
        {/* ÁREA IZQUIERDA: Turno Activo (7 columnas) */}
        <div className="col-span-12 lg:col-span-7 h-full flex flex-col justify-center">
          <div className={`rounded-3xl border p-8 h-full flex flex-col justify-between shadow-2xl transition-all duration-300 relative overflow-hidden ${
            d ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          } ${callingAnimation ? 'ring-4 ring-sky-500/60 shadow-sky-500/20' : ''}`}>
            
            {/* Header del Turno */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full ${callingAnimation ? 'bg-sky-400 animate-ping' : 'bg-emerald-500'}`} />
                <span className={`text-xs font-bold uppercase tracking-widest ${d ? 'text-slate-400' : 'text-slate-500'}`}>
                  {currentTicket ? 'Llamando Ahora' : 'Módulo de Atención'}
                </span>
              </div>

              {currentTicket?.ticket_type === 'PRIORITARIO' && (
                <span className="px-3.5 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 text-xs font-bold uppercase tracking-wider animate-pulse">
                  ★ Atención Prioritaria
                </span>
              )}
            </div>

            {/* Número de Turno Gigante */}
            <div className="text-center my-auto py-3">
              {currentTicket ? (
                <div className="space-y-3">
                  <div className={`font-display font-black tracking-tighter transition-all duration-500 ${
                    callingAnimation 
                      ? (d ? 'text-sky-300 scale-105' : 'text-sky-600 scale-105') 
                      : (d ? 'text-white' : 'text-slate-900')
                  }`}
                  style={{ fontSize: 'clamp(4.5rem, 12vw, 9.5rem)', lineHeight: 0.9 }}>
                    {currentTicket.ticket_number}
                  </div>

                  {/* Nombre del Paciente y Cita */}
                  {currentTicket.patient_name && (
                    <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
                      <div className={`inline-flex items-center gap-2.5 px-6 py-2 rounded-2xl border shadow-xl max-w-full ${
                        d ? 'bg-slate-950/80 border-slate-700/80' : 'bg-slate-100 border-slate-300 shadow-sm'
                      }`}>
                        <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${d ? 'text-slate-400' : 'text-slate-500'}`}>Paciente:</span>
                        <span className={`text-xl sm:text-3xl font-black uppercase tracking-tight truncate ${d ? 'text-white' : 'text-slate-900'}`}>
                          {currentTicket.patient_name}
                        </span>
                      </div>
                      {currentTicket.appointment_time && (
                        <span className="text-xs sm:text-sm font-black text-teal-500 bg-teal-500/15 px-4 py-1 rounded-full border border-teal-500/30 shadow-md">
                          ⏰ Cita Programada: {currentTicket.appointment_time}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 mt-2">
                    <p className="text-xl sm:text-3xl font-bold font-display uppercase tracking-wide text-sky-500">
                      {currentTicket.service_name}
                    </p>
                    <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-2xl border shadow-lg ${
                      d 
                        ? 'bg-slate-950/70 border-slate-700/80 text-emerald-400' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                    }`}>
                      <span className={`text-sm uppercase font-semibold ${d ? 'text-slate-400' : 'text-slate-500'}`}>Dirigirse a:</span>
                      <span className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight">
                        {currentTicket.counter_name}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 space-y-4">
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
                    d ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Clock className="w-10 h-10" />
                  </div>
                  <p className={`text-3xl font-bold font-display ${d ? 'text-slate-400' : 'text-slate-600'}`}>En espera del próximo llamado</p>
                  <p className={`text-sm ${d ? 'text-slate-500' : 'text-slate-400'}`}>Los turnos se mostrarán automáticamente al ser llamados.</p>
                </div>
              )}
            </div>

            {/* Footer de la tarjeta izquierda */}
            <div className={`text-xs flex items-center justify-between pt-4 border-t ${
              d ? 'border-slate-800/80 text-slate-500' : 'border-slate-200 text-slate-400'
            }`}>
              <span>Actualización en tiempo real vía WebSockets</span>
              <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Sistema Conectado
              </span>
            </div>

          </div>
        </div>

        {/* ÁREA DERECHA: Banner Multimedia Rotativo (Mayor Tamaño) & Código QR (Más Compacto) */}
        <div className="col-span-12 lg:col-span-5 h-full flex flex-col gap-3 justify-between">
          
          {/* 1. Carrusel Publicitario (MÁS GRANDE: flex-[2.5]) */}
          <div className={`rounded-3xl border-2 p-4 sm:p-5 shadow-2xl flex-[2.5] flex flex-col justify-between relative overflow-hidden ${
            d ? 'bg-slate-900/95 border-pink-500/30' : 'bg-white border-pink-200'
          }`}>
            
            <div className="flex items-center justify-between pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-widest text-pink-500">
                  PUBLICIDAD & SALUD
                </span>
              </div>

              {currentBanner?.tag && (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-pink-500/15 text-pink-500 border border-pink-500/30 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-pink-500" />
                  {currentBanner.tag}
                </span>
              )}
            </div>

            {/* Contenedor Multimedia Destacado (Imagen o Video Gigante a 100% del espacio) */}
            <div className="flex-1 my-1 flex flex-col justify-center overflow-hidden">
              <div className={`w-full flex-1 min-h-[220px] rounded-2xl overflow-hidden relative border shadow-xl flex items-center justify-center ${
                d ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                {hasVideo ? (
                  <video
                    src={bannerMediaSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls={false}
                    className="w-full h-full object-cover transition-transform duration-700"
                  />
                ) : currentBanner?.imageUrl ? (
                  <img
                    src={currentBanner.imageUrl}
                    alt={currentBanner.title}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-pink-900/40 via-purple-900/30 to-teal-900/40 p-4 text-center">
                    <Sparkles className="w-10 h-10 text-pink-400 mb-2 animate-pulse" />
                    <span className="font-bold text-white text-sm">HomeCare IPS</span>
                  </div>
                )}

                {/* Título y Subtítulo Superpuestos con Gradiente sobre la Imagen */}
                {(currentBanner?.title || currentBanner?.subtitle) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-3 pt-6 text-white pointer-events-none">
                    {currentBanner?.title && (
                      <h3 className="text-base sm:text-lg font-black font-display drop-shadow-md leading-tight truncate">
                        {currentBanner.title}
                      </h3>
                    )}
                    {currentBanner?.subtitle && (
                      <p className="text-xs text-slate-200 line-clamp-1 drop-shadow mt-0.5">
                        {currentBanner.subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`flex items-center justify-between pt-2 border-t shrink-0 ${d ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
              <span className="text-[11px] font-semibold">
                HomeCare del Quindío I.P.S.
              </span>
              {banners.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {banners.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentSlideIndex ? 'w-6 bg-pink-500' : (d ? 'w-2 bg-slate-700' : 'w-2 bg-slate-300')
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* 2. Código QR (MÁS PEQUEÑO Y COMPACTO: flex-1) */}
          <div className={`rounded-3xl border-2 p-3.5 shadow-2xl flex-1 flex flex-col justify-between items-center text-center relative overflow-hidden ${
            d ? 'bg-slate-900/95 border-purple-500/30' : 'bg-white border-purple-200'
          }`}>
            
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-500 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider">
                📱 SOLICITUD MÓVIL (4G / 5G / Wi-Fi)
              </span>
              <h2 className={`text-sm sm:text-base font-black font-display tracking-tight ${d ? 'text-white' : 'text-slate-900'}`}>OBTÉN TU TURNO AQUÍ</h2>
            </div>

            <div className={`my-1 p-2 rounded-2xl bg-white shadow-lg border-2 hover:scale-105 transition-transform duration-300 flex items-center justify-center ${
              d ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <QRCodeSVG
                value={publicRequestUrl}
                size={110}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="w-full">
              <div className={`flex items-center justify-center gap-1.5 text-[11px] font-bold py-1 px-2.5 rounded-xl border ${
                d ? 'text-teal-300 bg-teal-500/10 border-teal-500/20' : 'text-teal-800 bg-teal-50 border-teal-200'
              }`}>
                <span>1. Escanea QR</span>
                <span>➔</span>
                <span>2. Digita Cédula</span>
                <span>➔</span>
                <span>3. Tu Turno</span>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* 3. Área Inferior: Historial & Marquesina */}
      <footer className={`px-8 py-3 z-20 space-y-2 border-t transition-colors duration-300 ${
        d ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200 shadow-lg'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`shrink-0 flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-bold uppercase tracking-wider ${
            d ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <Clock className="w-4 h-4 text-sky-500" />
            ÚLTIMOS LLAMADOS:
          </div>

          <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
            {recentTickets.length > 0 ? (
              recentTickets.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className={`shrink-0 flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs shadow-md ${
                    d ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className={`font-mono font-black text-sm ${d ? 'text-white' : 'text-slate-900'}`}>{t.ticket_number}</span>
                  {t.patient_name && (
                    <>
                      <span className={d ? 'text-slate-600' : 'text-slate-400'}>•</span>
                      <span className={`font-bold truncate max-w-[140px] uppercase ${d ? 'text-slate-200' : 'text-slate-700'}`}>{t.patient_name}</span>
                    </>
                  )}
                  <span className={d ? 'text-slate-600' : 'text-slate-400'}>→</span>
                  <span className="font-bold text-emerald-500 truncate max-w-[120px]">{t.counter_name}</span>
                </div>
              ))
            ) : (
              <p className={`text-xs italic ${d ? 'text-slate-500' : 'text-slate-400'}`}>No hay historial reciente disponible para hoy.</p>
            )}
          </div>
        </div>

        {/* Marquesina Animada */}
        <div className={`overflow-hidden whitespace-nowrap py-1 px-4 rounded-xl border relative ${
          d ? 'bg-slate-950/70 border-slate-800/60 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          <div className="inline-block animate-marquee text-xs font-medium">
            <span className="mx-4">{marqueeText}</span>
            <span className="mx-4 text-pink-500">•</span>
            <span className="mx-4">{marqueeText}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
