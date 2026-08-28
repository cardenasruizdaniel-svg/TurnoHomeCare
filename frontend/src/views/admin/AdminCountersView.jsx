import React, { useState, useEffect, useMemo } from 'react';
import { Grid3X3, Plus, Edit, Trash2, Stethoscope, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { Modal, LoadingSpinner } from '../../components/Modal';

export function AdminCountersView() {
  const [counters, setCounters] = useState([]);
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState(null);
  const [formData, setFormData] = useState({
    branch_id: 1,
    code: '',
    name: '',
    service_ids: []
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes, bRes] = await Promise.all([
        api.getCounters(),
        api.getPublicServices(),
        api.getBranches()
      ]);
      if (cRes.success) setCounters(cRes.counters);
      if (sRes.success) setServices(sRes.services);
      if (bRes.success) setBranches(bRes.branches);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCounters = useMemo(() => {
    if (selectedBranchFilter === 'all') return counters;
    return counters.filter(c => String(c.branch_id) === String(selectedBranchFilter));
  }, [counters, selectedBranchFilter]);

  const openCreateModal = () => {
    setEditingCounter(null);
    const initialBranchId = selectedBranchFilter !== 'all' ? Number(selectedBranchFilter) : (branches[0]?.id || 1);
    setFormData({
      branch_id: initialBranchId,
      code: '',
      name: '',
      service_ids: services.map(s => s.id) // Por defecto todos
    });
    setIsModalOpen(true);
  };

  const openEditModal = (counter) => {
    setEditingCounter(counter);
    setFormData({
      branch_id: counter.branch_id,
      code: counter.code,
      name: counter.name,
      service_ids: counter.assigned_services?.map(s => s.id) || []
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingCounter) {
        await api.updateCounter(editingCounter.id, formData);
        setSuccessMsg('Módulo actualizado con éxito.');
      } else {
        await api.createCounter(formData);
        setSuccessMsg('Módulo creado con éxito.');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteCounter = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el puesto/módulo "${name}"?`)) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.deleteCounter(id);
      if (res.success) {
        setSuccessMsg(`Módulo "${name}" eliminado con éxito.`);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo eliminar el módulo.');
    }
  };

  const toggleServiceCheckbox = (sId) => {
    const current = formData.service_ids || [];
    if (current.includes(sId)) {
      setFormData({ ...formData, service_ids: current.filter(id => id !== sId) });
    } else {
      setFormData({ ...formData, service_ids: [...current, sId] });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-display text-white">Módulos, Consultorios y Ventanillas</h1>
          <p className="text-xs text-slate-400">Configuración de puntos de atención física y servicios asignados</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Módulo</span>
        </button>
      </div>

      {/* Branch Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedBranchFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            selectedBranchFilter === 'all'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Todas las Sedes ({counters.length})</span>
        </button>
        {branches.map(b => (
          <button
            key={b.id}
            onClick={() => setSelectedBranchFilter(b.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              String(selectedBranchFilter) === String(b.id)
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{b.name} ({counters.filter(c => c.branch_id === b.id).length})</span>
          </button>
        ))}
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

      {/* Counters Grid */}
      {loading ? (
        <LoadingSpinner text="Cargando módulos..." />
      ) : filteredCounters.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800">
          <Grid3X3 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-300">No hay módulos asignados a esta sede.</p>
          <p className="text-xs text-slate-500 mt-1">Crea un nuevo módulo o edita uno existente para asignarlo a esta sede.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCounters.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 shadow-xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-black text-xs border border-emerald-500/30">
                    {c.code}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px] font-semibold">
                    <Building2 className="w-3 h-3" />
                    {c.branch_name}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold font-display text-white text-base">{c.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Operador actual: <strong className="text-slate-200">{c.current_user_name || 'Sin asignar'}</strong>
                  </p>
                </div>

                {/* Assigned Services */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Servicios que atiende:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.assigned_services && c.assigned_services.length > 0 ? (
                      c.assigned_services.map(s => (
                        <span key={s.id} className="px-2 py-0.5 rounded-md bg-slate-950 text-sky-400 border border-slate-800 text-[10px] font-semibold">
                          {s.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Atiende todos los servicios</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800">
                <span className="text-xs text-emerald-400 font-semibold">● Habilitado</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-400 hover:text-white transition"
                    title="Editar módulo"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCounter(c.id, c.name)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
                    title="Eliminar módulo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCounter ? `Editar Módulo: ${editingCounter.name}` : 'Crear Nuevo Módulo'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-300">Sede</label>
            <select
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: Number(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Código</label>
              <input
                type="text"
                required
                placeholder="Ej: CONS-1"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-white uppercase focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Nombre del Módulo</label>
              <input
                type="text"
                required
                placeholder="Ej: Consultorio 1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="font-bold text-slate-300 block">Servicios Habilitados para este Módulo:</label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {services.map(s => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.service_ids.includes(s.id)}
                    onChange={() => toggleServiceCheckbox(s.id)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="font-semibold text-white">{s.name} ({s.code})</span>
                </label>
              ))}
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
              Guardar Módulo
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
