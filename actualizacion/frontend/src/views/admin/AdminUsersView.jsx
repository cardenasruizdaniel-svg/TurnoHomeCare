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
  RefreshCw,
  CheckSquare,
  Square,
  Sliders,
  Sparkles,
  Key,
  LayoutDashboard,
  Calendar,
  Ticket,
  Stethoscope,
  Grid3X3,
  Settings,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Modal, LoadingSpinner } from '../../components/Modal';

const ALL_MODULE_PERMISSIONS = [
  { key: 'dashboard',       label: 'Dashboard y Analítica',        icon: LayoutDashboard, desc: 'Vista de KPIs, gráficos de afluencia y métricas' },
  { key: 'attention',       label: 'Panel de Atención Ventanilla',  icon: UserCheck,       desc: 'Llamar, iniciar y finalizar turnos en módulo' },
  { key: 'schedule',        label: 'Programación de Turnos',       icon: Calendar,        desc: 'Agendamiento anticipado y edición de citas' },
  { key: 'history_tickets', label: 'Historial de Turnos',         icon: Ticket,          desc: 'Búsqueda, cancelación y reordenamiento de turnos' },
  { key: 'services',        label: 'Servicios Médicos',           icon: Stethoscope,     desc: 'Gestión del catálogo de consultas y tiempos' },
  { key: 'counters',        label: 'Módulos / Consultorios',      icon: Grid3X3,         desc: 'Asignación de consultorios y servicios' },
  { key: 'branches',        label: 'Sedes y Códigos QR',          icon: Building2,       desc: 'Configuración de sedes e impresión de QR' },
  { key: 'users',           label: 'Usuarios y Roles',            icon: Users,           desc: 'Creación de usuarios y matriz de permisos' },
  { key: 'settings',        label: 'Configuración Global',        icon: Settings,        desc: 'Ajuste de reglas 60+, branding y banners TV' },
  { key: 'reports',         label: 'Reportes e Informes',         icon: FileText,        desc: 'Consolidados ejecutivos y exportación CSV' },
  { key: 'audit',           label: 'Auditoría del Sistema',       icon: History,         desc: 'Trazabilidad e historial inmutable de acciones' }
];

export function AdminUsersView() {
  const { isDark } = useTheme();
  const d = isDark;

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles'
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [syncingData, setSyncingData] = useState(false);

  // Modal Crear / Editar Usuario
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

  // Modal Crear / Editar Rol y Permisos
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  // Modal de Eliminación / Inactivación de Usuario
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

  // --- MANEJO DE USUARIOS ---
  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      full_name: '',
      email: '',
      password: '',
      role_id: roles[0]?.id || 3,
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

  const handleSaveUser = async (e) => {
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
    try {
      const res = await api.deleteUser(deleteModal.user.id);
      if (res.success) {
        setSuccessMsg(res.message);
        setDeleteModal({ isOpen: false, user: null, loadingCheck: false, isDeleting: false, movements: null });
        loadData();
      } else {
        setErrorMsg(res.message || 'No se pudo eliminar el usuario.');
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

  // --- MANEJO DE ROLES Y PERMISOS ---
  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRoleFormData({
      name: '',
      description: '',
      permissions: ['attention', 'history_tickets', 'schedule']
    });
    setErrorMsg('');
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? role.permissions : []
    });
    setErrorMsg('');
    setIsRoleModalOpen(true);
  };

  const handlePermissionToggle = (permKey) => {
    setRoleFormData(prev => {
      const current = prev.permissions || [];
      if (current.includes(permKey)) {
        return { ...prev, permissions: current.filter(p => p !== permKey) };
      } else {
        return { ...prev, permissions: [...current, permKey] };
      }
    });
  };

  const handleSelectAllPermissions = () => {
    setRoleFormData(prev => ({
      ...prev,
      permissions: ALL_MODULE_PERMISSIONS.map(p => p.key)
    }));
  };

  const handleClearAllPermissions = () => {
    setRoleFormData(prev => ({
      ...prev,
      permissions: []
    }));
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingRole) {
        await api.updateRole(editingRole.id, roleFormData);
        setSuccessMsg(`Rol ${roleFormData.name} actualizado exitosamente.`);
      } else {
        await api.createRole(roleFormData);
        setSuccessMsg(`Rol ${roleFormData.name} creado exitosamente.`);
      }
      setIsRoleModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`¿Confirmas eliminar el rol ${role.name}?`)) return;
    setErrorMsg('');
    try {
      const res = await api.deleteRole(role.id);
      if (res.success) {
        setSuccessMsg(res.message);
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
          <h1 className={`text-2xl sm:text-3xl font-black font-display flex items-center gap-3 ${d ? 'text-white' : 'text-slate-900'}`}>
            <Users className="w-7 h-7 text-sky-500" />
            Usuarios y Roles Parametrizables
          </h1>
          <p className={`text-xs sm:text-sm mt-1 ${d ? 'text-slate-400' : 'text-slate-600'}`}>
            Configuración de usuarios, operadores, supervisores y matriz de permisos por módulo
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleForceSync}
            disabled={syncingData}
            title="Sincronizar usuarios oficiales (Admin + Módulos)"
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
              d ? 'bg-slate-900 border-slate-800 text-teal-400 hover:bg-slate-800' : 'bg-white border-slate-300 text-teal-700 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${syncingData ? 'animate-spin text-teal-500' : ''}`} />
            <span className="hidden sm:inline">Restablecer Usuarios Oficiales</span>
          </button>

          {activeTab === 'users' ? (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Usuario</span>
            </button>
          ) : (
            <button
              onClick={openCreateRoleModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Crear Nuevo Rol</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Navegación: Usuarios vs Roles */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'users'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 Usuarios del Sistema ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>🎭 Gestión de Roles y Permisos ({roles.length})</span>
        </button>
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

      {/* CONTENIDO PESTAÑA 1: TABLA DE USUARIOS */}
      {activeTab === 'users' && (
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
                  {users.map((u) => (
                    <tr key={u.id} className={`transition ${d ? 'hover:bg-slate-850/50' : 'hover:bg-slate-50'}`}>
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-xs">
                          {u.full_name?.slice(0, 1).toUpperCase()}
                        </div>
                        <span>{u.full_name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-sky-400 font-bold">{u.username}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                          u.role_name === 'ADMIN'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : u.role_name === 'SUPERVISOR'
                            ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {u.role_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>{u.branch_name || 'Todas las sedes'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{u.email || '-'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                          u.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={togglingId === u.id}
                            className={`p-1.5 rounded-lg border transition ${
                              u.is_active
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                            title={u.is_active ? 'Inactivar usuario' : 'Activar usuario'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 transition"
                            title="Editar usuario"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(u)}
                            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition"
                            title="Eliminar o Inactivar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: ROLES Y PERMISOS PARAMETRIZABLES */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-400 shrink-0" />
              <span>
                <strong>Matriz de Permisos Parametrizable:</strong> Si desmarca un módulo para un rol, los usuarios asignados a ese rol **no podrán ver ni acceder** a esa pantalla ni en el menú ni en las URLs.
              </span>
            </div>
            <button
              onClick={openCreateRoleModal}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition shrink-0"
            >
              + Nuevo Rol
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((r) => {
              const perms = Array.isArray(r.permissions) ? r.permissions : [];
              const isDefaultAdmin = r.name === 'ADMIN';

              return (
                <div
                  key={r.id}
                  className={`p-6 rounded-3xl border shadow-xl flex flex-col justify-between space-y-4 transition-all duration-300 ${
                    d ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                        r.name === 'ADMIN'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : r.name === 'SUPERVISOR'
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {r.name}
                      </span>
                      {!isDefaultAdmin && (
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition"
                          title="Eliminar rol"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <p className={`text-xs ${d ? 'text-slate-400' : 'text-slate-600'}`}>
                      {r.description || 'Sin descripción asignada.'}
                    </p>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                        Módulos Permitidos ({isDefaultAdmin ? ALL_MODULE_PERMISSIONS.length : perms.length} / {ALL_MODULE_PERMISSIONS.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_MODULE_PERMISSIONS.map(m => {
                          const has = isDefaultAdmin || perms.includes(m.key);
                          return (
                            <span
                              key={m.key}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                                has
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-950 text-slate-600 border-slate-800 line-through opacity-50'
                              }`}
                            >
                              {m.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openEditRoleModal(r)}
                    className="w-full py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Configurar Permisos de Rol</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR USUARIO */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUser ? `Editar Usuario: ${editingUser.full_name}` : 'Crear Nuevo Funcionario / Usuario'}
        >
          <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                placeholder="Ej: Dra. María Gómez"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Usuario *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: mgomez"
                  value={formData.username}
                  disabled={Boolean(editingUser)}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  {editingUser ? 'Contraseña (vacío para no cambiar)' : 'Contraseña *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Rol de Usuario *</label>
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

              <div>
                <label className="font-bold text-slate-300 block mb-1">Sede Asignada *</label>
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

            <div>
              <label className="font-bold text-slate-300 block mb-1">Correo Electrónico (Opcional)</label>
              <input
                type="email"
                placeholder="ejemplo@homecare.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-lg shadow-sky-600/25 transition"
              >
                Guardar Usuario
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL CREAR / EDITAR ROL Y MATRIZ DE PERMISOS */}
      {isRoleModalOpen && (
        <Modal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          title={editingRole ? `Configurar Permisos de Rol: ${editingRole.name}` : 'Crear Nuevo Rol de Usuario'}
        >
          <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Nombre del Rol *</label>
              <input
                type="text"
                required
                disabled={editingRole?.name === 'ADMIN'}
                placeholder="Ej: RECEPCIONISTA, FACTURACION, SECRETARIA"
                value={roleFormData.name}
                onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold uppercase focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Descripción del Rol</label>
              <input
                type="text"
                placeholder="Ej: Acceso a ventanilla de atención y agenda de turnos"
                value={roleFormData.description}
                onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Matriz de Checkboxes de Permisos por Módulo */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  Módulos y Permisos de Acceso ({roleFormData.permissions.length} / {ALL_MODULE_PERMISSIONS.length})
                </span>

                {editingRole?.name !== 'ADMIN' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="text-[10px] text-sky-400 hover:underline font-bold"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllPermissions}
                      className="text-[10px] text-slate-400 hover:underline font-bold"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                )}
              </div>

              {editingRole?.name === 'ADMIN' ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  ℹ️ El rol <strong>ADMIN</strong> tiene acceso total e irrestricto a todos los módulos del sistema por seguridad.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {ALL_MODULE_PERMISSIONS.map(m => {
                    const Icon = m.icon;
                    const isChecked = roleFormData.permissions.includes(m.key);

                    return (
                      <label
                        key={m.key}
                        onClick={() => handlePermissionToggle(m.key)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-purple-500/15 border-purple-500/40 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg mt-0.5 ${isChecked ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs truncate">{m.label}</span>
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{m.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/25 transition"
              >
                Guardar Rol y Permisos
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Eliminación / Inactivación de Usuario */}
      {deleteModal.isOpen && deleteModal.user && (
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, user: null, loadingCheck: false, isDeleting: false, movements: null })}
          title="Gestión de Eliminación / Inactivación de Usuario"
        >
          <div className="space-y-4 text-xs">
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
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleInactivateFromModal}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/25 transition flex items-center gap-2"
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
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteUser}
                    disabled={deleteModal.isDeleting}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/25 transition flex items-center gap-2"
                  >
                    {deleteModal.isDeleting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Eliminar Definitivamente</span>
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
