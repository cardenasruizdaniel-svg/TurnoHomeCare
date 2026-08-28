import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Sparkles,
  Building2,
  Palette,
  Globe,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  Image,
  Tv,
  Plus,
  Trash2,
  Megaphone,
  Upload,
  Database,
  Download,
  HardDrive,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { useBranding } from '../../context/BrandingContext';
import { LoadingSpinner } from '../../components/Modal';

export function AdminSettingsView() {
  const { refreshBranding } = useBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tunnel State
  const [tunnelStatus, setTunnelStatus] = useState({ active: false, public_url: null, local_url: null });
  const [tunnelLoading, setTunnelLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    EDAD_PRIORIDAD: 60,
    RATIO_PRIORIDAD: 2,
    PREFIJO_NORMAL: 'A',
    PREFIJO_PRIORITARIO: 'P',
    DIGITOS_NUMERACION: 3,
    SONIDO_CAMPANA: true,
    VOZ_SINTETIZADA: true,
    VOLUMEN_AUDIO: 1.0,
    REPETICIONES_LLAMADO: 2,
    PLANTILLA_VOZ: 'Turno {ticket}, por favor pasar a {counter}',
    PREVENIR_DUPLICADOS: true,
    REINICIO_DIARIO: true,
    HISTORIAL_PANTALLA_CANTIDAD: 6,
    MENSAJE_PANTALLA: 'Por favor permanezca atento a la pantalla y cuide sus pertenencias.',
    MARQUESINA_PANTALLA: '🌸 HomeCare del Quindío I.P.S. • Bienestar en casa • Citas médicas y atención domiciliaria • Mantenga su documento a la mano • Turnos prioritarios para adultos mayores',
    TIEMPO_BANNER_SEGUNDOS: 7,
    BANNERS_PUBLICIDAD: [
      {
        id: 'b1',
        title: 'Clínica de Heridas & Cuidadoras',
        subtitle: 'Atención especializada en heridas y asistencia personalizada con calidez humana en casa.',
        tag: 'Atención Domiciliaria',
        imageUrl: '/banners/banner_heridas_cuidadoras.png',
        isActive: true
      },
      {
        id: 'b2',
        title: 'Pedagogía Infantil & Toma de Muestras',
        subtitle: 'Educación adaptada a tus hijos y laboratorio clínico en la comodidad de tu hogar.',
        tag: 'Salud y Educación',
        imageUrl: '/banners/banner_pedagogia_muestras.png',
        isActive: true
      },
      {
        id: 'b3',
        title: 'Psicología, Nutrición y Dietética',
        subtitle: 'Terapia emocional, manejo del estrés y planes alimenticios saludables para toda la familia.',
        tag: 'Bienestar Integral',
        imageUrl: '/banners/banner_psicologia_nutricion.png',
        isActive: true
      },
      {
        id: 'b4',
        title: 'Fonoaudiología & Fisioterapia',
        subtitle: 'Terapia del lenguaje, deglución y rehabilitación física integral en el hogar.',
        tag: 'Rehabilitación en Casa',
        imageUrl: '/banners/banner_fono_fisioterapia.png',
        isActive: true
      },
      {
        id: 'b5',
        title: 'Terapia Ocupacional & Terapia Respiratoria',
        subtitle: 'Desarrollo cognitivo y motor, junto a cuidado respiratorio especializado domiciliario.',
        tag: 'Terapia Especializada',
        imageUrl: '/banners/banner_ocupacional_respiratoria.png',
        isActive: true
      }
    ]
  });

  // Company Branding State
  const [company, setCompany] = useState({
    name: 'IPS Salud Integral & Vida',
    nit: '900.123.456-7',
    primary_color: '#0284c7',
    secondary_color: '#0f172a',
    logo_url: '/favicon.svg'
  });

  const loadSettings = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.getSettings();
      if (res && res.success) {
        if (res.company && typeof res.company === 'object') {
          setCompany(prev => ({ ...prev, ...res.company }));
        }
        if (res.settings && typeof res.settings === 'object') {
          const map = {};
          Object.keys(res.settings).forEach(k => {
            let val = res.settings[k]?.value;
            if (k === 'BANNERS_PUBLICIDAD') {
              if (typeof val === 'string') {
                try { val = JSON.parse(val); } catch { val = []; }
              }
              if (!Array.isArray(val)) val = [];
            }
            if (val !== undefined && val !== null) {
              map[k] = val;
            }
          });
          setSettings(prev => ({ ...prev, ...map }));
        }
      }
    } catch (e) {
      console.warn('Error cargando configuraciones:', e);
      setErrorMsg(e.message || 'Error al cargar configuraciones');
    }

    try {
      const tRes = await api.getTunnelStatus();
      if (tRes && tRes.success) {
        setTunnelStatus(tRes);
      }
    } catch (e) {
      console.warn('Error cargando estado del túnel:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggleTunnel = async () => {
    setTunnelLoading(true);
    setErrorMsg('');
    try {
      if (tunnelStatus.active) {
        await api.stopTunnel();
        setTunnelStatus(prev => ({ ...prev, active: false, public_url: null }));
        setSuccessMsg('Túnel público detenido.');
      } else {
        const res = await api.startTunnel();
        if (res.success) {
          setTunnelStatus(prev => ({ ...prev, active: true, public_url: res.public_url }));
          setSuccessMsg(`¡Túnel público activado con éxito! Los códigos QR ahora apuntan a: ${res.public_url}`);
        } else {
          setErrorMsg(res.error || 'No se pudo activar el túnel público');
        }
      }
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setTunnelLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.updateSettings({
        settings,
        company
      });
      if (res && res.success !== false) {
        setSuccessMsg('¡Configuraciones y banners guardados y sincronizados exitosamente!');
        refreshBranding();
        await loadSettings();
      } else {
        setErrorMsg(res?.error || 'Error al guardar configuraciones');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDailyQueue = async () => {
    if (!window.confirm('¿Confirmas que deseas reiniciar el turnero de hoy? Esta acción finalizará los turnos pendientes del día y reseteará el consecutivo para que comience en 1.')) {
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await api.resetDailyQueue();
      if (res.success) {
        setSuccessMsg('¡Turnero reiniciado a Turno 1 con éxito!');
        loadSettings();
      }
    } catch (e) {
      setErrorMsg(e.message || 'Error al reiniciar turnero');
    } finally {
      setSaving(false);
    }
  };

  const [backupLoading, setBackupLoading] = useState(false);

  const handleCreateSnapshot = async () => {
    setBackupLoading(true);
    setErrorMsg('');
    try {
      const res = await api.createBackupSnapshot();
      if (res.success) {
        setSuccessMsg(res.message || 'Copia de respaldo generada exitosamente.');
      }
    } catch (e) {
      setErrorMsg(e.message || 'Error al generar respaldo.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = () => {
    window.open(api.getBackupDownloadUrl(), '_blank');
  };

  const handleExportJsonBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await api.exportJsonBackup();
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deaturnos_respaldo_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMsg('Copia de respaldo JSON descargada exitosamente.');
    } catch (e) {
      setErrorMsg('Error al exportar respaldo: ' + e.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportJsonBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setBackupLoading(true);
        const content = event.target.result;
        const parsed = JSON.parse(content);
        const res = await api.importJsonBackup(parsed);
        if (res.success) {
          setSuccessMsg('¡Respaldo importado y restaurado exitosamente! Recargando datos...');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setErrorMsg(res.error || 'Error al restaurar respaldo.');
        }
      } catch (err) {
        setErrorMsg('El archivo de respaldo es inválido o está corrupto: ' + err.message);
      } finally {
        setBackupLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleAddBanner = () => {
    const newBanner = {
      id: 'b_' + Date.now(),
      title: 'Nueva Promoción o Anuncio',
      subtitle: 'Descripción breve de la campaña médica o institucional.',
      tag: 'Novedad',
      imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
      isActive: true
    };
    const currentBanners = Array.isArray(settings.BANNERS_PUBLICIDAD) ? settings.BANNERS_PUBLICIDAD : [];
    setSettings(prev => ({
      ...prev,
      BANNERS_PUBLICIDAD: [...currentBanners, newBanner]
    }));
  };

  const handleRemoveBanner = (index) => {
    const currentBanners = Array.isArray(settings.BANNERS_PUBLICIDAD) ? [...settings.BANNERS_PUBLICIDAD] : [];
    currentBanners.splice(index, 1);
    setSettings(prev => ({
      ...prev,
      BANNERS_PUBLICIDAD: currentBanners
    }));
  };

  const handleBannerChange = (index, field, value) => {
    const currentBanners = Array.isArray(settings.BANNERS_PUBLICIDAD) ? [...settings.BANNERS_PUBLICIDAD] : [];
    if (currentBanners[index]) {
      currentBanners[index] = { ...currentBanners[index], [field]: value };
      setSettings(prev => ({
        ...prev,
        BANNERS_PUBLICIDAD: currentBanners
      }));
    }
  };

  const handleLoadHomecareBanners = () => {
    setSettings(prev => ({
      ...prev,
      MARQUESINA_PANTALLA: '🌸 HomeCare del Quindío I.P.S. • Bienestar en casa • Citas médicas y atención domiciliaria • Mantenga su documento a la mano • Turnos prioritarios para adultos mayores',
      TIEMPO_BANNER_SEGUNDOS: 7,
      BANNERS_PUBLICIDAD: [
        {
          id: 'b1',
          title: 'Clínica de Heridas & Cuidadoras',
          subtitle: 'Atención especializada en heridas y asistencia personalizada con calidez humana en casa.',
          tag: 'Atención Domiciliaria',
          imageUrl: '/banners/banner_heridas_cuidadoras.png',
          isActive: true
        },
        {
          id: 'b2',
          title: 'Pedagogía Infantil & Toma de Muestras',
          subtitle: 'Educación adaptada a tus hijos y laboratorio clínico en la comodidad de tu hogar.',
          tag: 'Salud y Educación',
          imageUrl: '/banners/banner_pedagogia_muestras.png',
          isActive: true
        },
        {
          id: 'b3',
          title: 'Psicología, Nutrición y Dietética',
          subtitle: 'Terapia emocional, manejo del estrés y planes alimenticios saludables para toda la familia.',
          tag: 'Bienestar Integral',
          imageUrl: '/banners/banner_psicologia_nutricion.png',
          isActive: true
        },
        {
          id: 'b4',
          title: 'Fonoaudiología & Fisioterapia',
          subtitle: 'Terapia del lenguaje, deglución y rehabilitación física integral en el hogar.',
          tag: 'Rehabilitación en Casa',
          imageUrl: '/banners/banner_fono_fisioterapia.png',
          isActive: true
        },
        {
          id: 'b5',
          title: 'Terapia Ocupacional & Terapia Respiratoria',
          subtitle: 'Desarrollo cognitivo y motor, junto a cuidado respiratorio especializado domiciliario.',
          tag: 'Terapia Especializada',
          imageUrl: '/banners/banner_ocupacional_respiratoria.png',
          isActive: true
        }
      ]
    }));
    setSuccessMsg('Plantilla publicitaria oficial de HomeCare IPS cargada.');
  };

  const processImageFile = (file, maxWidth = 1200, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('El archivo seleccionado no es una imagen válida.'));
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsDataURL(file);
    });
  };

  const handleBannerFileSelect = async (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const dataUrl = await processImageFile(file, 1200, 0.85);
      handleBannerChange(idx, 'imageUrl', dataUrl);
      setSuccessMsg(`Imagen para Slide #${idx + 1} cargada con éxito.`);
    } catch (err) {
      setErrorMsg(err.message || 'Error al procesar archivo de imagen.');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handleLogoFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const dataUrl = await processImageFile(file, 400, 0.90);
      setCompany(prev => ({ ...prev, logo_url: dataUrl }));
      setSuccessMsg('Logo institucional cargado con éxito.');
    } catch (err) {
      setErrorMsg(err.message || 'Error al procesar archivo de logo.');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-display text-white">Configuración del Sistema</h1>
          <p className="text-xs text-slate-400">Reglas de negocio, proporción de atención, síntesis de voz y branding institucional</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Cargando configuraciones..." />
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* 0. SECCIÓN DESTACADA: Túnel de Acceso Público para Celulares (4G/5G) */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-sky-950/70 border-2 border-purple-500/40 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  <Globe className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold font-display text-white text-base">Túnel de Acceso Móvil (4G / 5G)</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      tunnelStatus.active
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {tunnelStatus.active ? '● Túnel Activo (En Línea)' : '○ Túnel Desactivado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Permite que los pacientes escaneen el QR desde cualquier celular usando sus propios datos móviles sin conectarse al Wi-Fi.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleTunnel}
                disabled={tunnelLoading}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center gap-2 ${
                  tunnelStatus.active
                    ? 'bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>{tunnelLoading ? 'Conectando...' : tunnelStatus.active ? 'Detener Túnel' : 'Activar Túnel 4G/5G'}</span>
              </button>
            </div>

            {/* URL Display Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> URL Pública para Códigos QR (4G/5G):
                </span>
                {tunnelStatus.public_url ? (
                  <div className="flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-mono font-bold text-white text-xs truncate">
                      {tunnelStatus.public_url}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tunnelStatus.public_url)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Copiar URL"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={tunnelStatus.public_url}
                        target="_blank"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">
                    Túnel inactivo. Haz clic en "Activar Túnel 4G/5G" para generar una URL pública con HTTPS.
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-sky-400" /> URL en Red Wi-Fi Local (Misma Red):
                </span>
                <div className="flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="font-mono font-bold text-slate-300 text-xs truncate">
                    {tunnelStatus.local_url || 'http://127.0.0.1:5000'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tunnelStatus.local_url)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                    title="Copiar URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 1. SECCIÓN: Reglas de Prioridad y Algoritmo de Turnos */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold font-display text-white text-sm">Reglas de Prioridad y Despacho de Turnos</h3>
                <p className="text-xs text-slate-400">Configura la edad mínima de adulto mayor y la proporción de atención</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              
              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <label className="font-bold text-slate-200 block">Edad Mínima Atención Prioritaria</label>
                <p className="text-[11px] text-slate-500">Pacientes con esta edad o mayor se clasifican como Prioritarios.</p>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={settings.EDAD_PRIORIDAD}
                    onChange={(e) => setSettings({ ...settings, EDAD_PRIORIDAD: Number(e.target.value) })}
                    className="w-24 p-2 rounded-xl bg-slate-900 border border-slate-700 font-bold text-sm text-purple-400 text-center focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-slate-400 font-semibold">años</span>
                </div>
              </div>

              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <label className="font-bold text-slate-200 block">Proporción de Atención (Ratio)</label>
                <p className="text-[11px] text-slate-500">Cantidad de turnos normales por cada turno prioritario atendido.</p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-slate-400 font-bold">Por cada</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.RATIO_PRIORIDAD}
                    onChange={(e) => setSettings({ ...settings, RATIO_PRIORIDAD: Number(e.target.value) })}
                    className="w-16 p-2 rounded-xl bg-slate-900 border border-slate-700 font-bold text-sm text-sky-400 text-center focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-slate-400 font-bold">normales : 1 prioritario</span>
                </div>
              </div>

              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <label className="font-bold text-slate-200 block">Prevención de Turnos Duplicados</label>
                <p className="text-[11px] text-slate-500">Evita que un usuario solicite dos turnos si ya tiene uno en curso.</p>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.PREVENIR_DUPLICADOS}
                      onChange={(e) => setSettings({ ...settings, PREVENIR_DUPLICADOS: e.target.checked })}
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                    <span className="font-semibold text-white">Activar Bloqueo de Duplicados</span>
                  </label>
                </div>
              </div>

              {/* Control de Reinicio Diario de Turnos */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between sm:col-span-2 lg:col-span-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.REINICIO_DIARIO !== false}
                        onChange={(e) => setSettings({ ...settings, REINICIO_DIARIO: e.target.checked })}
                        className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className="font-bold text-white">Reinicio Diario Automático (Todos los días inicia en Turno 1)</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cada día a las 00:00 medianoche la numeración de los turnos recomienza automáticamente desde el número 001.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetDailyQueue}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reiniciar Turnero de Hoy Ahora (A Turno 1)</span>
                  </button>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Prefijo Turno Normal</label>
                <input
                  type="text"
                  maxLength="2"
                  value={settings.PREFIJO_NORMAL}
                  onChange={(e) => setSettings({ ...settings, PREFIJO_NORMAL: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-white uppercase focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Prefijo Turno Prioritario</label>
                <input
                  type="text"
                  maxLength="2"
                  value={settings.PREFIJO_PRIORITARIO}
                  onChange={(e) => setSettings({ ...settings, PREFIJO_PRIORITARIO: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-purple-400 uppercase focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Dígitos de Numeración</label>
                <input
                  type="number"
                  min="2"
                  max="5"
                  value={settings.DIGITOS_NUMERACION}
                  onChange={(e) => setSettings({ ...settings, DIGITOS_NUMERACION: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* 1.5. SECCIÓN: Publicidad, Banners y Marquesina en Pantalla TV */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-white text-sm">Publicidad, Banners y Marquesina en Pantalla TV</h3>
                  <p className="text-xs text-slate-400">Configura los anuncios rotativos con fotos, mensajes institucionales y la marquesina animada</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadHomecareBanners}
                  className="px-3.5 py-1.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/40 text-xs font-bold transition cursor-pointer"
                >
                  🌸 Cargar Plantilla HomeCare
                </button>
                <button
                  type="button"
                  onClick={handleAddBanner}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nuevo Banner</span>
                </button>
              </div>
            </div>

            {/* Configuración de Marquesina y Tiempo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2 space-y-1.5">
                <label className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-pink-400" />
                  Texto de la Marquesina Inferior (Anuncios y Noticias en Pantalla)
                </label>
                <input
                  type="text"
                  value={settings.MARQUESINA_PANTALLA || ''}
                  onChange={(e) => setSettings({ ...settings, MARQUESINA_PANTALLA: e.target.value })}
                  placeholder="Ej: HomeCare del Quindío I.P.S. • Bienestar en casa..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Tiempo de Rotación (Segundos por Slide)</label>
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={settings.TIEMPO_BANNER_SEGUNDOS || 7}
                  onChange={(e) => setSettings({ ...settings, TIEMPO_BANNER_SEGUNDOS: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-bold text-teal-400 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Lista de Banners Publicitarios */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Banners Publicitarios Activos ({Array.isArray(settings.BANNERS_PUBLICIDAD) ? settings.BANNERS_PUBLICIDAD.length : 0})
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Array.isArray(settings.BANNERS_PUBLICIDAD) ? settings.BANNERS_PUBLICIDAD : []).map((b, idx) => (
                  <div key={b.id || idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300">
                        Slide #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={b.isActive !== false}
                            onChange={(e) => handleBannerChange(idx, 'isActive', e.target.checked)}
                            className="rounded text-pink-600 focus:ring-pink-500 w-3.5 h-3.5"
                          />
                          <span>{b.isActive !== false ? 'Activo' : 'Oculto'}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveBanner(idx)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition"
                          title="Eliminar banner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Image Preview & File Upload */}
                    <div className="h-32 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden relative group/img">
                      {b.imageUrl ? (
                        <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-1">
                          <Image className="w-6 h-6 text-slate-600" />
                          <span>Sin foto asignada</span>
                        </div>
                      )}

                      {/* Botón Flotante para Cambiar Foto */}
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-2 transition">
                        <button
                          type="button"
                          onClick={() => document.getElementById(`banner-file-${idx}`)?.click()}
                          className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Cambiar Foto</span>
                        </button>
                      </div>
                    </div>

                    {/* Selector de Archivo Oculto */}
                    <input
                      type="file"
                      id={`banner-file-${idx}`}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBannerFileSelect(idx, e)}
                    />

                    {/* Botón Principal de Carga de Archivo */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById(`banner-file-${idx}`)?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-300 font-bold text-xs transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>📁 Subir Foto desde mi Equipo</span>
                      </button>
                      {b.imageUrl && (
                        <button
                          type="button"
                          onClick={() => handleBannerChange(idx, 'imageUrl', '')}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-slate-700 text-slate-400 hover:text-rose-400 text-xs transition"
                          title="Quitar foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block">Etiqueta / Badge</label>
                        <input
                          type="text"
                          placeholder="Ej: Bienestar en Casa"
                          value={b.tag || ''}
                          onChange={(e) => handleBannerChange(idx, 'tag', e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-pink-400 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block">Título Principal</label>
                        <input
                          type="text"
                          placeholder="Ej: Consulta Médica Domiciliaria"
                          value={b.title || ''}
                          onChange={(e) => handleBannerChange(idx, 'title', e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block">Descripción / Subtítulo</label>
                        <textarea
                          rows="2"
                          placeholder="Texto descriptivo de la campaña..."
                          value={b.subtitle || ''}
                          onChange={(e) => handleBannerChange(idx, 'subtitle', e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block">O ingresar URL de Imagen</label>
                        <input
                          type="text"
                          placeholder="https://... o archivo cargado"
                          value={b.imageUrl || ''}
                          onChange={(e) => handleBannerChange(idx, 'imageUrl', e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sky-400 font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 2. SECCIÓN: Sonido y Locución de Voz Sintetizada */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold font-display text-white text-sm">Sonido y Locución en Pantallas de TV</h3>
                <p className="text-xs text-slate-400">Configura la campana de llamado y el texto que pronunciará la voz</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.SONIDO_CAMPANA}
                    onChange={(e) => setSettings({ ...settings, SONIDO_CAMPANA: e.target.checked })}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <span className="font-bold text-white">Activar Campana Sonora (Ding-Dong)</span>
                </label>
                <p className="text-[11px] text-slate-500">Genera una alerta auditiva armónica al llamar un turno.</p>
              </div>

              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.VOZ_SINTETIZADA}
                    onChange={(e) => setSettings({ ...settings, VOZ_SINTETIZADA: e.target.checked })}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <span className="font-bold text-white">Activar Locución de Voz (TTS)</span>
                </label>
                <p className="text-[11px] text-slate-500">Pronuncia el número de turno y el consultorio por los altavoces.</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-300 block">Plantilla de Frase de Llamado</label>
              <input
                type="text"
                value={settings.PLANTILLA_VOZ}
                onChange={(e) => setSettings({ ...settings, PLANTILLA_VOZ: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-slate-500">
                Variables disponibles: <code>{'{ticket}'}</code> (ej. A 024) y <code>{'{counter}'}</code> (ej. Consultorio 1).
              </p>
            </div>
          </div>

          {/* 3. SECCIÓN: Identidad Visual y Branding Institucional */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-white text-sm">Identidad Visual y Personalización de Empresa</h3>
                  <p className="text-xs text-slate-400">Configura el logo oficial, nombre, eslogan y paleta cromática de la institución</p>
                </div>
              </div>

              {/* Presets rápidos */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Plantilla:</span>
                <button
                  type="button"
                  onClick={() => setCompany({
                    ...company,
                    name: 'HomeCare del Quindío I.P.S.',
                    slogan: 'Bienestar en casa.',
                    logo_url: '/homecare-logo.png',
                    primary_color: '#e1136c',
                    secondary_color: '#00b0b9',
                    accent_color: '#7cb518'
                  })}
                  className="px-2.5 py-1 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] font-bold hover:bg-pink-500/30 transition"
                >
                  🌸 HomeCare IPS
                </button>
                <button
                  type="button"
                  onClick={() => setCompany({
                    ...company,
                    primary_color: '#0284c7',
                    secondary_color: '#0f172a',
                    accent_color: '#10b981'
                  })}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-bold hover:bg-sky-500/30 transition"
                >
                  🌊 Azul Clínico
                </button>
              </div>
            </div>

            {/* Logo Preview & Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              
              {/* Logo Preview Box */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logo Actual</span>
                <div className="w-24 h-24 rounded-full bg-white p-2 flex items-center justify-center shadow-xl border-2 border-pink-500/40">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain rounded-full" />
                  ) : (
                    <Building2 className="w-10 h-10 text-slate-400" />
                  )}
                </div>

                <input
                  type="file"
                  id="company-logo-file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFileSelect}
                />

                <button
                  type="button"
                  onClick={() => document.getElementById('company-logo-file')?.click()}
                  className="w-full py-1.5 px-3 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Logo desde Archivo</span>
                </button>

                <input
                  type="text"
                  placeholder="O URL del logo (/homecare-logo.png)"
                  value={company.logo_url || ''}
                  onChange={(e) => setCompany({ ...company, logo_url: e.target.value })}
                  className="w-full p-2 text-center rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>

              {/* Company Info Fields */}
              <div className="md:col-span-2 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Nombre de la Empresa / IPS</label>
                    <input
                      type="text"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Eslogan / Subtítulo</label>
                    <input
                      type="text"
                      placeholder="Ej: Bienestar en casa."
                      value={company.slogan || ''}
                      onChange={(e) => setCompany({ ...company, slogan: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-teal-400 font-semibold focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">NIT / Registro Tributario</label>
                    <input
                      type="text"
                      value={company.nit || ''}
                      onChange={(e) => setCompany({ ...company, nit: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Mensaje Inferior en Pantalla Pública</label>
                    <input
                      type="text"
                      value={settings.MENSAJE_PANTALLA}
                      onChange={(e) => setSettings({ ...settings, MENSAJE_PANTALLA: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Colors Grid */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Paleta Cromática de la Marca
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                
                {/* Color Primario */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-300 block">Color Primario (Magenta)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={company.primary_color || '#e1136c'}
                      onChange={(e) => setCompany({ ...company, primary_color: e.target.value })}
                      className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={company.primary_color || '#e1136c'}
                      onChange={(e) => setCompany({ ...company, primary_color: e.target.value })}
                      className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-white uppercase text-xs"
                    />
                  </div>
                </div>

                {/* Color Secundario */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-300 block">Color Secundario (Turquesa)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={company.secondary_color || '#00b0b9'}
                      onChange={(e) => setCompany({ ...company, secondary_color: e.target.value })}
                      className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={company.secondary_color || '#00b0b9'}
                      onChange={(e) => setCompany({ ...company, secondary_color: e.target.value })}
                      className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-white uppercase text-xs"
                    />
                  </div>
                </div>

                {/* Color Acento */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-300 block">Color Acento (Verde Lima)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={company.accent_color || '#7cb518'}
                      onChange={(e) => setCompany({ ...company, accent_color: e.target.value })}
                      className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={company.accent_color || '#7cb518'}
                      onChange={(e) => setCompany({ ...company, accent_color: e.target.value })}
                      className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-white uppercase text-xs"
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ============================================================= */}
          {/* SECCIÓN 7: SEGURIDAD, PERSISTENCIA Y COPIAS DE RESPALDO */}
          {/* ============================================================= */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display text-white">PROTECCIÓN Y COPIAS DE SEGURIDAD</h2>
                  <p className="text-xs text-slate-400">Garantía de cero pérdida de datos y respaldos descargables en cualquier momento.</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                Persistencia Activa
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* Tarjeta 1: Exportar Respaldo JSON Portátil */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sky-300 font-bold">
                    <Download className="w-4 h-4 text-sky-400" />
                    <span>Exportar Respaldo (.json)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    Descarga todas tus sedes, módulos, servicios, fotos de banners y configuraciones en formato JSON portátil compatible con cualquier servidor.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportJsonBackup}
                  disabled={backupLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{backupLoading ? 'Exportando...' : 'Descargar Respaldo JSON'}</span>
                </button>
              </div>

              {/* Tarjeta 2: Restaurar Respaldo JSON */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-purple-300 font-bold">
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span>Restaurar desde Respaldo (.json)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    Restaura instantáneamente todas tus configuraciones, imágenes y servicios subiendo tu archivo de copia de seguridad.
                  </p>
                </div>

                <label className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition flex items-center justify-center gap-2 cursor-pointer text-center">
                  <Upload className="w-4 h-4" />
                  <span>Subir y Restaurar Respaldo</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJsonBackup}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Tarjeta 3: Descarga SQLite Cruda (.db) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Base de Datos SQLite (.db)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    Copia exacta del archivo físico binario de base de datos para servidores locales o copias de seguridad de bajo nivel.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Archivo .db</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateSnapshot}
                    disabled={backupLoading}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{backupLoading ? 'Guardando...' : 'Crear Snapshot en Disco'}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold shadow-xl shadow-sky-600/30 transition disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Guardando...' : 'Guardar y Aplicar Todas las Configuraciones'}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
