import React, { useState, useEffect } from 'react';
import { Stethoscope, Plus, Edit, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Modal, LoadingSpinner } from '../../components/Modal';

export function AdminServicesView() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    letter_prefix: 'A',
    priority_prefix: 'P',
    estimated_minutes: 15,
    order_index: 0
  });

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await api.getServices(true);
      if (res.success) setServices(res.services);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openCreateModal = () => {
    setEditingService(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      letter_prefix: 'A',
      priority_prefix: 'P',
      estimated_minutes: 15,
      order_index: services.length + 1
    });
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setFormData({
      code: service.code,
      name: service.name,
      description: service.description || '',
      letter_prefix: service.letter_prefix,
      priority_prefix: service.priority_prefix,
      estimated_minutes: service.estimated_minutes,
      order_index: service.order_index
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingService) {
        await api.updateService(editingService.id, formData);
        setSuccessMsg('Servicio actualizado con éxito.');
      } else {
        await api.createService(formData);
        setSuccessMsg('Servicio creado con éxito.');
      }
      setIsModalOpen(false);
      loadServices();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.toggleServiceActive(id);
      loadServices();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-display text-white">Servicios y Tipos de Consulta</h1>
          <p className="text-xs text-slate-400">Administra las especialidades médicas, letras de turno y tiempos estimados</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Servicio</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Services Grid */}
      {loading ? (
        <LoadingSpinner text="Cargando servicios..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div
              key={s.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                s.is_active
                  ? 'bg-slate-900 border-slate-800 hover:border-sky-500/50 shadow-xl'
                  : 'bg-slate-950/60 border-slate-900 opacity-60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 font-mono font-black text-xs border border-sky-500/30">
                    {s.code}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    <span>Prefijo: <strong className="text-white">{s.letter_prefix}</strong></span>
                    <span>•</span>
                    <span>Prio: <strong className="text-purple-400">{s.priority_prefix}</strong></span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold font-display text-white text-base">{s.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.description || 'Sin descripción adicional.'}</p>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-800">
                  <span>⏱ Tiempo estimado: <strong className="text-slate-200">{s.estimated_minutes} min</strong></span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800">
                <button
                  onClick={() => handleToggle(s.id)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                    s.is_active
                      ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                      : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                  }`}
                >
                  {s.is_active ? '● Activo' : '○ Inactivo'}
                </button>

                <button
                  onClick={() => openEditModal(s)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-400 hover:text-white transition"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? `Editar Servicio: ${editingService.name}` : 'Crear Nuevo Servicio'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Código</label>
              <input
                type="text"
                required
                maxLength="5"
                placeholder="Ej: CG"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-white uppercase focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Letra de Turno</label>
              <input
                type="text"
                required
                maxLength="2"
                placeholder="Ej: A"
                value={formData.letter_prefix}
                onChange={(e) => setFormData({ ...formData, letter_prefix: e.target.value.toUpperCase() })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-white uppercase focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Nombre del Servicio</label>
            <input
              type="text"
              required
              placeholder="Ej: Consulta General"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Descripción</label>
            <textarea
              rows="2"
              placeholder="Detalle o instrucciones del servicio..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Letra Prioritaria</label>
              <input
                type="text"
                maxLength="2"
                placeholder="Ej: P"
                value={formData.priority_prefix}
                onChange={(e) => setFormData({ ...formData, priority_prefix: e.target.value.toUpperCase() })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-white uppercase focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Tiempo Estimado (Minutos)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={formData.estimated_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_minutes: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
            >
              Guardar Servicio
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
