import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle, Volume2, Sparkles, Building2, Palette, Globe, Wifi, Copy, Check, ExternalLink } from 'lucide-react';
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
    MENSAJE_PANTALLA: 'Por favor permanezca atento a la pantalla y cuide sus pertenencias.'
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
    try {
      const [res, tRes] = await Promise.all([
        api.getSettings(),
        api.getTunnelStatus()
      ]);
      if (res.success) {
        if (res.company) setCompany(res.company);
        if (res.settings) {
          const map = {};
          Object.keys(res.settings).forEach(k => {
            map[k] = res.settings[k].value;
          });
          setSettings(prev => ({ ...prev, ...map }));
        }
      }
      if (tRes.success) {
        setTunnelStatus(tRes);
      }
    } catch (e) {
      setErrorMsg(e.message);
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
      await api.updateSettings({
        settings,
        company
      });
      setSuccessMsg('Configuraciones guardadas y sincronizadas exitosamente.');
      refreshBranding();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
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
                  type="text"
                  placeholder="URL del logo (/homecare-logo.png)"
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
