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
  Building2
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal, LoadingSpinner } from '../../components/Modal';

export function AdminUsersView() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
    movements: null // { hasMovements, ticketsCount, eventsCount }
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
      password: '', // Dejar en blanco para no cambiar
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

  // Activar / Inactivar usuario con 1 clic
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

  // Abrir modal de eliminación con verificación de movimientos
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

  // Ejecutar eliminación permanente
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

  // Inactivar desde el modal cuando no se puede borrar
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-display text-white">Usuarios y Funcionarios</h1>
          <p className="text-xs text-slate-400">Control de acceso, operadores de consultorio/ventanilla, supervisores y administradores</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Funcionario / Usuario</span>
        </button>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Cargando usuarios..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {users.map((u) => {
                  const isActive = u.is_active === 1 || u.is_active === true;
                  const isToggling = togglingId === u.id;

                  return (
                    <tr key={u.id} className={`hover:bg-slate-800/40 transition ${!isActive ? 'opacity-65 bg-slate-950/30' : ''}`}>
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{u.full_name}</span>
                          {!isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-sky-400 font-bold">
                        {u.username}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role_name === 'ADMIN'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : u.role_name === 'SUPERVISOR'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        }`}>
                          {u.role_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{u.branch_name || 'Global'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {u.email || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          disabled={isToggling}
                          title={isActive ? "Haga clic para Inactivar usuario" : "Haga clic para Activar usuario"}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                            isActive 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25' 
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                          <span>{isToggling ? 'Cambiando...' : isActive ? 'Activo' : 'Inactivo'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Editar */}
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Editar usuario"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Inactivar / Activar */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            disabled={isToggling}
                            className={`p-2 rounded-xl transition cursor-pointer ${
                              isActive 
                                ? 'bg-slate-800 hover:bg-amber-600 text-amber-300 hover:text-white' 
                                : 'bg-slate-800 hover:bg-emerald-600 text-emerald-300 hover:text-white'
                            }`}
                            title={isActive ? "Inactivar Usuario" : "Activar Usuario"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Eliminar con comprobación de movimientos */}
                          <button
                            type="button"
                            onClick={() => openDeleteModal(u)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-rose-400 hover:text-white transition cursor-pointer"
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
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Editar Usuario: ${editingUser.username}` : 'Crear Nuevo Usuario'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-300">Nombre Completo</label>
            <input
              type="text"
              required
              placeholder="Ej: Dr. Roberto Gómez"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Nombre de Usuario (Login)</label>
              <input
                type="text"
                required
                disabled={!!editingUser}
                placeholder="Ej: rgomez"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">
                {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
              </label>
              <input
                type="password"
                required={!editingUser}
                placeholder={editingUser ? 'Dejar en blanco para no cambiar' : '••••••••'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Rol de Usuario</label>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Sede Asignada</label>
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
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Correo Electrónico (Opcional)</label>
            <input
              type="email"
              placeholder="ejemplo@ipsintegral.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer"
            >
              Guardar Usuario
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Eliminación Inteligente / Inactivación */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, user: null, loadingCheck: false, isDeleting: false, movements: null })}
        title={deleteModal.user ? `Gestión de Usuario: ${deleteModal.user.full_name}` : 'Eliminar Usuario'}
      >
        <div className="space-y-4 text-xs">
          {deleteModal.loadingCheck ? (
            <div className="py-8">
              <LoadingSpinner text="Comprobando historial de turnos y movimientos del usuario..." />
            </div>
          ) : deleteModal.movements?.hasMovements ? (
            /* CASO 1: EL USUARIO TIENE MOVIMIENTOS HISTÓRICOS -> SOLO DEJA INACTIVAR */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Usuario con Registro de Movimientos</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  El usuario <strong>{deleteModal.user?.full_name}</strong> (<code>{deleteModal.user?.username}</code>) registra actividad histórica en el sistema:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-base font-bold text-amber-400 block">{deleteModal.movements.ticketsCount}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Turnos Atendidos</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-base font-bold text-amber-400 block">{deleteModal.movements.eventsCount}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Eventos de Trazabilidad</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                  🛡️ <strong>Regla de Auditoría Médica:</strong> Por integridad legal y trazabilidad de los pacientes, los usuarios con turnos o atenciones previas <strong>no pueden ser borrados permanentemente</strong>. En su lugar, debes <strong>inactivarlo</strong> para revocar su acceso al sistema de forma inmediata.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ isOpen: false, user: null, loadingCheck: false, isDeleting: false, movements: null })}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cerrar
                </button>
                {deleteModal.user?.is_active === 1 && (
                  <button
                    type="button"
                    onClick={handleInactivateFromModal}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/20 cursor-pointer"
                  >
                    <Power className="w-4 h-4" />
                    <span>Inactivar Usuario Ahora</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* CASO 2: EL USUARIO NO TIENE MOVIMIENTOS -> PERMITE BORRADO COMPLETO */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <Trash2 className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>Confirmar Eliminación Permanente</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  ¿Estás seguro de que deseas eliminar permanentemente al usuario <strong>{deleteModal.user?.full_name}</strong> (<code>{deleteModal.user?.username}</code>)?
                </p>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Este usuario no registra turnos ni movimientos. Puede ser eliminado de la base de datos de manera segura.</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ isOpen: false, user: null, loadingCheck: false, isDeleting: false, movements: null })}
                  disabled={deleteModal.isDeleting}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  disabled={deleteModal.isDeleting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleteModal.isDeleting ? 'Eliminando...' : 'Sí, Eliminar Permanentemente'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
