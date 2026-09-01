import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Shield, 
  UserCheck, 
  UserX, 
  Trash2, 
  Power, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  History, 
  Lock,
  Building2,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Modal, LoadingSpinner } from '../../components/Modal';

export function AdminUsersView() {
  const { isDark } = useTheme();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [syncingData, setSyncingData] = useState(false);

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role_id: 3,
    branch_id: 1,
    is_active: 1
  });

  // Modal de Eliminación / Inactivación
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    user: null,
    loadingCheck: false,
    isDeleting: false,
    movements: null
  });

  const [togglingId, setTogglingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, rRes, bRes] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getBranches()
      ]);
      if (uRes.success) setUsers(uRes.users);
      if (rRes.success) setRoles(rRes.roles);
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

  // Forzar sincronización de datos y usuarios oficiales en servidor (Render)
  const handleForceSync = async () => {
    try {
      setSyncingData(true);
      setErrorMsg('');
      const res = await api.syncOfficialData();
      if (res.success) {
        setSuccessMsg(res.message);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error sincronizando usuarios');
    } finally {
      setSyncingData(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      full_name: '',
      email: '',
      password: '',
      role_id: 3,
      branch_id: branches[0]?.id || 1,
      is_active: 1
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      email: user.email || '',
      password: '',
      role_id: user.role_id,
      branch_id: user.branch_id || (branches[0]?.id || 1),
      is_active: user.is_active !== undefined ? user.is_active : 1
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
        setSuccessMsg(`Usuario ${formData.full_name} actualizado exitosamente.`);
      } else {
        await api.createUser(formData);
        setSuccessMsg(`Usuario ${formData.full_name} creado exitosamente.`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleActive = async (user) => {
    setTogglingId(user.id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.toggleUserActive(user.id);
      if (res.success) {
        setSuccessMsg(res.message);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: res.is_active } : u));
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const openDeleteModal = async (user) => {
    setErrorMsg('');
    setDeleteModal({
      isOpen: true,
      user,
      loadingCheck: true,
      isDeleting: false,
      movements: null
    });

    try {
      const movRes = await api.checkUserMovements(user.id);
      setDeleteModal(prev => ({
        ...prev,
        loadingCheck: false,
        movements: movRes
      }));
    } catch (err) {
      setDeleteModal(prev => ({
        ...prev,
        loadingCheck: false,
        movements: { hasMovements: true, ticketsCount: 0, eventsCount: 0 }
      }));
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal.user) return;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    setErrorMsg('');

    try {
      const res = await api.deleteUser(deleteModal.user.id);
      if (res.success) {
        setSuccessMsg(res.message);
        setDeleteModal({ isOpen: false, user: null, loadingCheck: false, isDeleting: false, movements: null });
        loadData();
      } else {
        setErrorMsg(res.message || res.error);
        setDeleteModal(prev => ({ ...prev, isDeleting: false }));
      }
    } catch (err) {
      setErrorMsg(err.message);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleInactivateFromModal = async () => {
    if (!deleteModal.user) return;
    try {
      const res = await api.toggleUserActive(deleteModal.user.id);
      if (res.success) {
        setSuccessMsg(`Usuario ${deleteModal.user.full_name} inactivado con éxito.`);
        setDeleteModal({ isOpen: false, user: null, loadingCheck: false, isDeleting: false, movements: null });
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const d = isDark;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black font-display flex items-center gap-3 ${d ? 'text-white' : 'text-slate-900'}`}>
            <Users className="w-7 h-7 text-sky-500" />
            Usuarios y Funcionarios
          </h1>
          <p className={`text-xs sm:text-sm mt-1 ${d ? 'text-slate-400' : 'text-slate-600'}`}>
            Control de acceso, operadores de consultorio/ventanilla, supervisores y administradores
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleForceSync}
            disabled={syncingData}
            title="Sincronizar y resetear usuarios oficiales (Admin Daniel Cárdenas + 5 Módulos)"
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
              d ? 'bg-slate-900 border-slate-800 text-teal-400 hover:bg-slate-800' : 'bg-white border-slate-300 text-teal-700 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${syncingData ? 'animate-spin text-teal-500' : ''}`} />
            <span className="hidden sm:inline">Restablecer Usuarios Oficiales</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Funcionario / Usuario</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className={`rounded-3xl border shadow-xl overflow-hidden transition-colors duration-300 ${
        d ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50 text-slate-900'
      }`}>
        {loading ? (
          <LoadingSpinner text="Cargando usuarios..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase font-bold tracking-wider border-b ${
                d ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-100/90 text-slate-700 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3.5 px-4">Nombre Completo</th>
                  <th className="py-3.5 px-4">Usuario</th>
                  <th className="py-3.5 px-4">Rol</th>
                  <th className="py-3.5 px-4">Sede Asignada</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${d ? 'divide-slate-800/50 text-slate-300' : 'divide-slate-100 text-slate-800'}`}>
                {users.map((u) => {
                  const isActive = u.is_active === 1 || u.is_active === true;
                  const isToggling = togglingId === u.id;

                  return (
                    <tr key={u.id} className={`transition ${
                      d ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    } ${!isActive ? (d ? 'opacity-65 bg-slate-950/30' : 'opacity-65 bg-slate-100/50') : ''}`}>
                      <td className={`py-3.5 px-4 font-extrabold ${d ? 'text-white' : 'text-slate-900'}`}>
                        <div className="flex items-center gap-2">
                          <span>{u.full_name}</span>
                          {!isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30 uppercase">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-sky-500 font-black">
                        {u.username}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role_name === 'ADMIN'
                            ? (d ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-800 border border-indigo-200')
                            : u.role_name === 'SUPERVISOR'
                            ? (d ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-200')
                            : (d ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-teal-100 text-teal-800 border border-teal-200')
                        }`}>
                          {u.role_name}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.branch_name || 'Global'}</span>
                        </div>
                      </td>
                      <td className={`py-3.5 px-4 ${d ? 'text-slate-400' : 'text-slate-500'}`}>
                        {u.email || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          disabled={isToggling}
                          title={isActive ? "Haga clic para Inactivar usuario" : "Haga clic para Activar usuario"}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer border ${
                            isActive 
                              ? (d ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100')
                              : (d ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100')
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                          <span>{isToggling ? 'Cambiando...' : isActive ? 'Activo' : 'Inactivo'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className={`p-2 rounded-xl transition cursor-pointer border ${
                              d ? 'bg-slate-800 border-slate-700 hover:bg-sky-600 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 hover:bg-sky-500 text-slate-700 hover:text-white'
                            }`}
                            title="Editar usuario"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            disabled={isToggling}
                            className={`p-2 rounded-xl transition cursor-pointer border ${
                              isActive 
                                ? (d ? 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border-amber-500/30' : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200')
                                : (d ? 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200')
                            }`}
                            title={isActive ? "Inactivar usuario" : "Activar usuario"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(u)}
                            className={`p-2 rounded-xl transition cursor-pointer border ${
                              d ? 'bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/30' : 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border-rose-200'
                            }`}
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Usuario */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUser ? `Editar Usuario: ${editingUser.full_name}` : 'Crear Nuevo Usuario / Funcionario'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${d ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nombre de Usuario *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${d ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Contraseña {editingUser ? '(dejar en blanco para conservar)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${d ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Rol de Usuario *</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${d ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Sede Asignada *</label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${d ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${d ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/25 transition"
              >
                Guardar Usuario
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Eliminación / Inactivación */}
      {deleteModal.isOpen && deleteModal.user && (
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, user: null, loadingCheck: false, isDeleting: false, movements: null })}
          title="Gestión de Eliminación / Inactivación de Usuario"
        >
          <div className="space-y-4">
            {deleteModal.loadingCheck ? (
              <LoadingSpinner text="Verificando historial de movimientos del usuario..." />
            ) : deleteModal.movements?.hasMovements ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Lock className="w-5 h-5 shrink-0" />
                    <span>Eliminación Restringida por Histórico</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    El usuario <strong>{deleteModal.user.full_name}</strong> tiene registros de atención activa ({deleteModal.movements.ticketsCount} turnos atendidos, {deleteModal.movements.eventsCount} eventos). Para proteger la auditoría, no se permite eliminarlo, pero puede ser <strong>Inactivado</strong>.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDeleteModal({ isOpen: false, user: null, loadingCheck: false, isDeleting: false, movements: null })}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleInactivateFromModal}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/25 transition flex items-center gap-2"
                  >
                    <Power className="w-4 h-4" />
                    <span>Inactivar Usuario</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>¿Confirmas eliminar a {deleteModal.user.full_name}?</span>
                  </div>
                  <p className="text-xs text-rose-300">
                    Este usuario no registra movimientos históricos. Esta acción eliminará permanentemente la cuenta de usuario.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDeleteModal({ isOpen: false, user: null, loadingCheck: false, isDeleting: false, movements: null })}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteUser}
                    disabled={deleteModal.isDeleting}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition flex items-center gap-2"
                  >
                    {deleteModal.isDeleting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Eliminar Definivitamente</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

    </div>
  );
}

export default AdminUsersView;
