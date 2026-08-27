import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Shield, UserCheck, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Modal, LoadingSpinner } from '../../components/Modal';

export function AdminUsersView() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role_id: 3,
    branch_id: 1
  });

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
      branch_id: branches[0]?.id || 1
    });
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
      branch_id: user.branch_id || (branches[0]?.id || 1)
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
      } else {
        await api.createUser(formData);
      }
      setIsModalOpen(false);
      loadData();
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
          <p className="text-xs text-slate-400">Control de acceso, operadores de ventanilla, supervisores y administradores</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Funcionario / Usuario</span>
        </button>
      </div>

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
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {u.full_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-sky-400">
                      {u.username}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role_name === 'ADMIN'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : u.role_name === 'SUPERVISOR'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {u.role_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.branch_name || 'Global'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {u.email || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-400 font-semibold">● Activo</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-400 hover:text-white transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
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
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
            >
              Guardar Usuario
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
