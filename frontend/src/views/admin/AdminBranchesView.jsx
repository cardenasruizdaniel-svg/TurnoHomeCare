import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, QrCode, Download, Printer, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Modal, LoadingSpinner } from '../../components/Modal';

export function AdminBranchesView() {
  const { isDark } = useTheme();
  const d = isDark;
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal QR Print
  const [qrModalBranch, setQrModalBranch] = useState(null);

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    business_hours: ''
  });

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await api.getBranches();
      if (res.success) setBranches(res.branches);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const openCreateModal = () => {
    setEditingBranch(null);
    setFormData({
      code: '',
      name: '',
      address: '',
      phone: '',
      business_hours: 'Lunes a Viernes: 7:00 AM - 6:00 PM'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setFormData({
      code: branch.code,
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      business_hours: branch.business_hours || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingBranch) {
        await api.updateBranch(editingBranch.id, formData);
        setSuccessMsg('Sede actualizada exitosamente.');
      } else {
        await api.createBranch(formData);
        setSuccessMsg('Sede creada exitosamente.');
      }
      setIsModalOpen(false);
      loadBranches();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteBranch = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la sede "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.deleteBranch(id);
      if (res.success) {
        setSuccessMsg(`Sede "${name}" eliminada exitosamente.`);
        loadBranches();
      }
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo eliminar la sede.');
    }
  };

  const handlePrintQR = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-black font-display ${d ? "text-white" : "text-slate-900"}`}>Sedes Físicas y Códigos QR</h1>
          <p className={`text-xs ${d ? "text-slate-400" : "text-slate-600"}`}>Multi-sede, horarios de atención y descarga de pósters QR para impresión</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Sede</span>
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

      {/* Branches Grid */}
      {loading ? (
        <LoadingSpinner text="Cargando sedes..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branches.map((b) => (
            <div
              key={b.id}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 shadow-xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-mono font-black text-xs border border-purple-500/30">
                    {b.code}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">● Sede Operativa</span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-display text-white">{b.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{b.address || 'Sin dirección registrada'} • Tel: {b.phone || 'N/A'}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                  <p className="font-bold text-slate-300">Horario de Atención:</p>
                  <p>{b.business_hours || 'No especificado'}</p>
                </div>
              </div>

              {/* QR Action Buttons */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-800">
                <button
                  onClick={() => setQrModalBranch(b)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Ver / Imprimir QR</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`/pantalla?branchId=${b.id}`}
                    target="_blank"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-400 hover:text-white transition"
                    title="Ver Pantalla TV de esta sede"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-400 hover:text-white transition"
                    title="Editar sede"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBranch(b.id, b.name)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
                    title="Eliminar sede"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ver / Imprimir QR */}
      {qrModalBranch && (
        <Modal
          isOpen={!!qrModalBranch}
          onClose={() => setQrModalBranch(null)}
          title={`Código QR - ${qrModalBranch.name}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-6 text-center text-xs">
            <div id="printable-qr" className="p-8 rounded-3xl bg-white text-slate-900 shadow-2xl space-y-4 border-4 border-pink-500/30">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-20 h-20 rounded-full bg-white p-1 shadow-md border-2 border-pink-500/40 flex items-center justify-center">
                  <img src="/homecare-logo.png" alt="HomeCare" className="w-full h-full object-contain rounded-full" />
                </div>
                <div>
                  <h2 className="text-xl font-black font-display uppercase tracking-tight text-slate-950">
                    HomeCare del Quindío I.P.S.
                  </h2>
                  <p className="text-xs font-bold text-teal-600 uppercase tracking-wide">
                    Bienestar en casa • {qrModalBranch.name}
                  </p>
                </div>
              </div>

              <div className="flex justify-center py-4">
                <QRCodeSVG
                  value={qrModalBranch.public_request_url || `${window.location.origin}/solicitar-turno?branchId=${qrModalBranch.id}`}
                  size={240}
                  level="H"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 uppercase">Escanea con tu celular</p>
                <p className="text-[11px] text-slate-500 font-mono">{qrModalBranch.public_request_url}</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={handlePrintQR}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-lg"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Póster QR</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Crear / Editar Sede */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBranch ? `Editar Sede: ${editingBranch.name}` : 'Crear Nueva Sede'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Código de Sede</label>
              <input
                type="text"
                required
                placeholder="Ej: SEDE-SUR"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-white uppercase focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Nombre de Sede</label>
              <input
                type="text"
                required
                placeholder="Ej: Sede Sur - Consultorios"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Dirección</label>
              <input
                type="text"
                placeholder="Ej: Calle 45 # 12-34"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Teléfono</label>
              <input
                type="text"
                placeholder="Ej: (601) 745-9000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Horario de Atención</label>
            <input
              type="text"
              placeholder="Ej: Lunes a Viernes: 7:00 AM - 6:00 PM"
              value={formData.business_hours}
              onChange={(e) => setFormData({ ...formData, business_hours: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
            />
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
              Guardar Sede
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
