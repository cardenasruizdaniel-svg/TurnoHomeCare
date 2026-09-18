const bcrypt = require('bcryptjs');
const db = require('../config/database');
const AuditService = require('../services/auditService');

class UserController {
  static async getAll(req, res) {
    try {
      const users = await db.prepare(`
        SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.last_login, u.created_at,
               r.id as role_id, r.name as role_name,
               b.id as branch_id, b.name as branch_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN branches b ON u.branch_id = b.id
        ORDER BY u.id ASC
      `).all();

      res.json({ success: true, users });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getRoles(req, res) {
    try {
      const roles = await db.prepare('SELECT * FROM roles ORDER BY id ASC').all();
      const defaultAll = ["dashboard", "attention", "history_tickets", "schedule", "services", "counters", "branches", "users", "settings", "audit", "reports"];

      const parsedRoles = roles.map(r => {
        let perms = [];
        if (r.name === 'ADMIN') {
          perms = defaultAll;
        } else if (r.permissions) {
          try {
            perms = JSON.parse(r.permissions);
          } catch {
            perms = r.permissions.split(',').map(p => p.trim());
          }
        }
        return {
          ...r,
          permissions: Array.isArray(perms) ? perms : []
        };
      });

      res.json({ success: true, roles: parsedRoles });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createRole(req, res) {
    try {
      const { name, description, permissions } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'NOMBRE_REQUERIDO', message: 'El nombre del rol es obligatorio' });
      }

      const roleName = name.trim().toUpperCase();
      const existing = await db.prepare('SELECT id FROM roles WHERE UPPER(name) = ?').get(roleName);
      if (existing) {
        return res.status(400).json({ success: false, error: 'ROL_DUPLICADO', message: 'Ya existe un rol con ese nombre' });
      }

      const permsJson = JSON.stringify(Array.isArray(permissions) ? permissions : []);
      const result = await db.prepare(`
        INSERT INTO roles (name, description, permissions)
        VALUES (?, ?, ?)
      `).run(roleName, description ? description.trim() : '', permsJson);

      await AuditService.log({
        userId: req.user.id,
        action: 'CREATE_ROLE',
        entity: 'ROLE',
        entityId: result.lastInsertRowid,
        details: { name: roleName, permissions }
      });

      res.status(201).json({ success: true, id: result.lastInsertRowid, message: `Rol ${roleName} creado exitosamente` });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateRole(req, res) {
    try {
      const { id } = req.params;
      const roleId = Number(id);
      const { name, description, permissions } = req.body;

      const role = await db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
      if (!role) {
        return res.status(404).json({ success: false, error: 'ROL_NO_ENCONTRADO' });
      }

      const newName = name ? name.trim().toUpperCase() : role.name;
      const permsJson = permissions !== undefined ? JSON.stringify(Array.isArray(permissions) ? permissions : []) : role.permissions;

      await db.prepare(`
        UPDATE roles
        SET name = ?,
            description = COALESCE(?, description),
            permissions = ?
        WHERE id = ?
      `).run(newName, description !== undefined ? description.trim() : null, permsJson, roleId);

      await AuditService.log({
        userId: req.user.id,
        action: 'UPDATE_ROLE',
        entity: 'ROLE',
        entityId: roleId,
        details: { name: newName, permissions }
      });

      res.json({ success: true, message: `Rol ${newName} actualizado exitosamente` });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async deleteRole(req, res) {
    try {
      const { id } = req.params;
      const roleId = Number(id);

      const role = await db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
      if (!role) {
        return res.status(404).json({ success: false, error: 'ROL_NO_ENCONTRADO' });
      }

      if (role.name === 'ADMIN') {
        return res.status(400).json({ success: false, error: 'ROL_PROTEGIDO', message: 'El rol Administrador Principal no se puede eliminar' });
      }

      const usersCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE role_id = ?').get(roleId)?.count || 0;
      if (usersCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'ROL_CON_USUARIOS',
          message: `No se puede eliminar el rol ${role.name} porque hay ${usersCount} usuario(s) asignado(s) a él. Reasigne los usuarios antes de borrarlo.`
        });
      }

      await db.prepare('DELETE FROM roles WHERE id = ?').run(roleId);

      await AuditService.log({
        userId: req.user.id,
        action: 'DELETE_ROLE',
        entity: 'ROLE',
        entityId: roleId,
        details: { name: role.name }
      });

      res.json({ success: true, message: `Rol ${role.name} eliminado exitosamente` });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const { branch_id, role_id, username, email, password, full_name } = req.body;

      if (!username || !password || !role_id || !full_name) {
        return res.status(400).json({ success: false, error: 'CAMPOS_REQUERIDOS', message: 'Usuario, contraseña, nombre y rol son obligatorios' });
      }

      const existing = await db.prepare('SELECT id FROM users WHERE username = ? OR (email = ? AND email IS NOT NULL)').get(username, email);
      if (existing) {
        return res.status(400).json({ success: false, error: 'USUARIO_O_EMAIL_DUPLICADO', message: 'El nombre de usuario o correo ya está registrado' });
      }

      const hash = bcrypt.hashSync(password, 10);
      const result = await db.prepare(`
        INSERT INTO users (branch_id, role_id, username, email, password_hash, full_name, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(branch_id ? Number(branch_id) : null, Number(role_id), username.trim(), email ? email.trim() : null, hash, full_name.trim());

      await AuditService.log({
        userId: req.user.id,
        action: 'CREATE_USER',
        entity: 'USER',
        entityId: result.lastInsertRowid,
        details: { username, full_name, role_id }
      });

      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { branch_id, role_id, email, password, full_name, is_active } = req.body;

      let passwordClause = '';
      const params = [
        branch_id !== undefined ? (branch_id ? Number(branch_id) : null) : null,
        role_id ? Number(role_id) : null,
        email,
        full_name,
        is_active !== undefined ? (is_active ? 1 : 0) : null
      ];

      if (password && password.trim().length > 0) {
        const hash = bcrypt.hashSync(password.trim(), 10);
        passwordClause = ', password_hash = ?';
        params.splice(3, 0, hash);
      }

      await db.prepare(`
        UPDATE users
        SET branch_id = COALESCE(?, branch_id),
            role_id = COALESCE(?, role_id),
            email = COALESCE(?, email)
            ${passwordClause ? ', password_hash = ' + (password ? `'${bcrypt.hashSync(password.trim(), 10)}'` : 'password_hash') : ''},
            full_name = COALESCE(?, full_name),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        branch_id !== undefined ? (branch_id ? Number(branch_id) : null) : null,
        role_id ? Number(role_id) : null,
        email || null,
        full_name || null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      );

      await AuditService.log({
        userId: req.user.id,
        action: 'UPDATE_USER',
        entity: 'USER',
        entityId: id,
        details: { full_name }
      });

      res.json({ success: true, message: 'Usuario actualizado exitosamente' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async toggleActive(req, res) {
    try {
      const { id } = req.params;
      const userId = Number(id);

      if (req.user.id === userId) {
        return res.status(400).json({
          success: false,
          error: 'NO_AUTOINACTIVACION',
          message: 'No puedes desactivar tu propia cuenta activa de administrador.'
        });
      }

      const user = await db.prepare('SELECT id, full_name, username, is_active FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'USUARIO_NO_ENCONTRADO', message: 'El usuario no existe.' });
      }

      const newStatus = user.is_active ? 0 : 1;
      await db.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, userId);

      await AuditService.log({
        userId: req.user.id,
        action: newStatus === 1 ? 'ACTIVATE_USER' : 'INACTIVATE_USER',
        entity: 'USER',
        entityId: userId,
        details: { username: user.username, full_name: user.full_name, is_active: newStatus }
      });

      res.json({
        success: true,
        is_active: newStatus,
        message: `Usuario ${user.full_name} (${user.username}) ${newStatus === 1 ? 'activado' : 'inactivado'} exitosamente.`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async checkMovements(req, res) {
    try {
      const { id } = req.params;
      const userId = Number(id);
      const ticketsCount = await db.prepare('SELECT COUNT(*) as count FROM tickets WHERE user_id = ?').get(userId)?.count || 0;
      const eventsCount = await db.prepare('SELECT COUNT(*) as count FROM ticket_events WHERE user_id = ?').get(userId)?.count || 0;
      const hasMovements = (ticketsCount + eventsCount) > 0;

      res.json({
        success: true,
        hasMovements,
        ticketsCount,
        eventsCount
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = Number(id);

      if (req.user.id === userId) {
        return res.status(400).json({
          success: false,
          error: 'NO_AUTOBORRADO',
          message: 'No puedes eliminar tu propia cuenta de usuario activa.'
        });
      }

      const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'USUARIO_NO_ENCONTRADO', message: 'El usuario no existe.' });
      }

      // Verificar si tiene movimientos en turnos o historial de eventos
      const ticketsCount = await db.prepare('SELECT COUNT(*) as count FROM tickets WHERE user_id = ?').get(userId)?.count || 0;
      const eventsCount = await db.prepare('SELECT COUNT(*) as count FROM ticket_events WHERE user_id = ?').get(userId)?.count || 0;
      const hasMovements = (ticketsCount + eventsCount) > 0;

      if (hasMovements) {
        return res.status(400).json({
          success: false,
          hasMovements: true,
          error: 'USUARIO_CON_MOVIMIENTOS',
          message: `El usuario ${user.full_name} (${user.username}) registra ${ticketsCount} turnos y ${eventsCount} eventos de atención en el sistema. Por trazabilidad y auditoría médica no puede ser eliminado, pero puedes inactivarlo.`,
          canInactivate: true
        });
      }

      // Si no tiene movimientos, desasociar de módulos y borrar
      await db.prepare('UPDATE counters SET current_user_id = NULL WHERE current_user_id = ?').run(userId);
      await db.prepare('UPDATE audit_logs SET user_id = NULL WHERE user_id = ?').run(userId);
      await db.prepare('DELETE FROM users WHERE id = ?').run(userId);

      await AuditService.log({
        userId: req.user.id,
        action: 'DELETE_USER',
        entity: 'USER',
        entityId: userId,
        details: { username: user.username, full_name: user.full_name }
      });

      res.json({
        success: true,
        message: `Usuario ${user.full_name} (${user.username}) eliminado permanentemente con éxito.`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = UserController;
