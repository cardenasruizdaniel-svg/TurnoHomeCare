import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  QrCode,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Clock,
  Sparkles,
  Phone,
  Calendar,
  Building2,
  Ticket
} from 'lucide-react';
import { api } from '../services/api';
import { useBranding } from '../context/BrandingContext';

export function RequestTicketView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const branchId = Number(searchParams.get('branchId') || 1);

  const { company } = useBranding();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(branchId);
  const [services, setServices] = useState([]);
  
  // Pasos del flujo: 1 = Cédula, 2 = Registro / Confirmación de datos, 3 = Selección de Servicio, 4 = Turno Generado
  const [step, setStep] = useState(1);
  
  // Datos del formulario
  const [documentNumber, setDocumentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(null);

  // Estados de carga y feedback
  const [isExistingPatient, setIsExistingPatient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedTicketData, setGeneratedTicketData] = useState(null);

  useEffect(() => {
    // Cargar sedes y servicios disponibles
    api.getPublicBranches().then(res => res.success && setBranches(res.branches));
    api.getPublicServices().then(res => res.success && setServices(res.services));
  }, []);

  // Paso 1: Consultar Cédula
  const handleCheckDocument = async (e) => {
    e.preventDefault();
    if (!documentNumber.trim()) {
      setErrorMsg('Por favor ingresa tu número de cédula o documento');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await api.checkPatient(documentNumber.trim());
      if (res.success && res.exists && res.patient) {
        setIsExistingPatient(true);
        setFullName(res.patient.full_name);
        setAge(res.patient.age);
        setPhone(res.patient.phone || '');
        setStep(3); // Pasar directo a selección de servicio
      } else {
        setIsExistingPatient(false);
        setStep(2); // Formulario de registro express
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al consultar documento');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Guardar datos de nuevo paciente
  const handleRegisterPatient = (e) => {
    e.preventDefault();
    if (!fullName.trim() || !age || !phone.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos');
      return;
    }
    if (Number(age) < 0 || Number(age) > 125) {
      setErrorMsg('Por favor ingresa una edad válida');
      return;
    }
    setErrorMsg('');
    setStep(3);
  };

  // Paso 3: Solicitar el turno
  const handleRequestTicket = async (serviceId) => {
    setSelectedServiceId(serviceId);
    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        branchId: selectedBranchId,
        serviceId,
        patientData: {
          documentNumber: documentNumber.trim(),
          fullName: fullName.trim(),
          age: Number(age),
          phone: phone.trim()
        }
      };

      const res = await api.requestTicket(payload);
      if (res.success) {
        setGeneratedTicketData(res);
        setStep(4);
        try {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        } catch (e) {}
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al solicitar el turno');
    } finally {
      setLoading(false);
    }
  };

  const isSeniorPriority = Number(age) >= 60;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header con Sede y Logo */}
        <div className="text-center space-y-2">
          {company.logo_url ? (
            <div className="w-16 h-16 mx-auto rounded-full bg-white p-1 flex items-center justify-center shadow-xl shadow-pink-500/10 border-2 border-pink-500/30">
              <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain rounded-full" />
            </div>
          ) : (
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-pink-600 to-teal-500 flex items-center justify-center shadow-lg shadow-pink-500/20 text-white">
              <Ticket className="w-7 h-7" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black font-display text-white">SOLICITA TU TURNO</h1>
            <p className="text-xs font-bold text-pink-400">
              {company.name}
            </p>
            {company.slogan && (
              <p className="text-[11px] font-medium text-teal-400 italic">
                {company.slogan}
              </p>
            )}
          </div>
          <div className="pt-1">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300">
              {branches.find(b => b.id === selectedBranchId)?.name || 'Sede Principal'}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PASO 1: Ingreso de Cédula */}
        {/* ------------------------------------------------------------- */}
        {step === 1 && (
          <form onSubmit={handleCheckDocument} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Número de Identificación / Cédula
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  required
                  placeholder="Ej: 10203040"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-lg font-bold font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Consultaremos si ya te encuentras registrado en nuestro sistema.
              </p>
            </div>

            {branches.length > 1 && (
              <div className="space-y-1.5 pt-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Confirmar Sede
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-purple-500"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? 'Consultando...' : 'CONTINUAR'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PASO 2: Registro Express si no existe */}
        {/* ------------------------------------------------------------- */}
        {step === 2 && (
          <form onSubmit={handleRegisterPatient} className="space-y-4">
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
              No encontramos registro previo con la cédula <strong>{documentNumber}</strong>. Por favor completa tus datos por única vez.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Nombre Completo</label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">Edad (Años)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="125"
                  placeholder="Ej: 45"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">Celular</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 3101234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {Number(age) >= 60 && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Por tu edad (60+), se te asignará automáticamente atención prioritaria.</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Atrás
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition"
              >
                CONTINUAR A SERVICIOS
              </button>
            </div>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PASO 3: Selección de Servicio */}
        {/* ------------------------------------------------------------- */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Saludo personalizado */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/60 to-purple-950/60 border border-slate-800 text-center space-y-1">
              <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider">
                {isExistingPatient ? '¡Hola de nuevo!' : '¡Bienvenido!'}
              </p>
              <h2 className="text-xl font-bold font-display text-white">{fullName}</h2>
              <p className="text-xs text-slate-400">
                {age} años • C.C. {documentNumber}
                {isSeniorPriority && <span className="ml-2 text-purple-400 font-bold">(Atención Prioritaria)</span>}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300 text-center">
                ¿Qué servicio necesitas hoy?
              </p>

              <div className="space-y-2.5">
                {services.map((s) => (
                  <button
                    key={s.id}
                    disabled={loading}
                    onClick={() => handleRequestTicket(s.id)}
                    className="w-full text-left p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 transition-all duration-200 group flex items-center justify-between shadow-md"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold font-mono text-xs flex items-center justify-center border border-sky-500/30">
                          {isSeniorPriority ? (s.priority_prefix || 'P') : (s.letter_prefix || 'A')}
                        </span>
                        <span className="font-bold text-sm text-white group-hover:text-sky-300 transition">
                          {s.name}
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-xs text-slate-400 pl-9">{s.description}</p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-2 text-center text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              Cambiar de Cédula
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PASO 4: Turno Generado o Turno Duplicado Activo */}
        {/* ------------------------------------------------------------- */}
        {step === 4 && generatedTicketData && (
          <div className="space-y-6 text-center">
            
            {generatedTicketData.is_duplicate ? (
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                ⚠️ Ya tienes un turno en curso para esta sede.
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Turno Asignado con Éxito
              </div>
            )}

            {/* Tarjeta del Turno */}
            <div className="rounded-3xl bg-gradient-to-b from-sky-950/70 to-slate-950 border-2 border-sky-500/50 p-6 shadow-2xl space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">TU TURNO ES</p>
              
              <div className="font-display font-black text-6xl text-white tracking-tight">
                {generatedTicketData.ticket?.ticket_number}
              </div>

              <div className="space-y-1">
                <p className="text-base font-bold text-sky-400">
                  {generatedTicketData.ticket?.service_name}
                </p>
                <p className="text-xs text-slate-400">
                  Paciente: {generatedTicketData.ticket?.patient_name}
                </p>
              </div>

              {/* Posición en la cola */}
              <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-slate-400 text-[10px] uppercase font-semibold">Turnos antes</p>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {generatedTicketData.queue_position ?? 0}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-slate-400 text-[10px] uppercase font-semibold">Espera estimada</p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">
                    ~{generatedTicketData.estimated_wait_minutes ?? 15} min
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 px-4">
              Por favor permanece atento a la pantalla pública. Te llamaremos por tu número de turno.
            </p>

            {/* Acciones */}
            <div className="space-y-3 pt-2">
              <Link
                to={`/mi-turno/${generatedTicketData.ticket?.id}`}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-600 hover:from-emerald-400 hover:to-sky-500 text-white font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-95 animate-pulse"
              >
                <span>🔔 ACTIVAR TIMBRE Y SEGUIR EN ESTE CELULAR</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setDocumentNumber('');
                  setFullName('');
                  setAge('');
                  setPhone('');
                  setGeneratedTicketData(null);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition"
              >
                Solicitar Otro Turno
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
