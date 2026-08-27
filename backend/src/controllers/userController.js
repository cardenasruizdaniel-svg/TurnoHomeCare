const bcrypt = require('bcryptjs');
const db = require('../config/database');
const AuditService = require('../services/auditService');

class UserController {
  static getAll(req, res) {
    try {
      const users = db.prepare(`
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

  static getRoles(req, res) {
    try {
      const roles = db.prepare('SELECT * FROM roles ORDER BY id ASC').all();
      res.json({ success: true, roles });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static create(req, res) {
    try {
      const { branch_id, role_id, username, email, password, full_name } = req.body;

      if (!username || !password || !role_id || !full_name) {
        return res.status(400).json({ success: false, error: 'CAMPOS_REQUERIDOS', message: 'Usuario, contraseña, nombre y rol son obligatorios' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE username = ? OR (email = ? AND email IS NOT NULL)').get(username, email);
      if (existing) {
        return res.status(400).json({ success: false, error: 'USUARIO_O_EMAIL_DUPLICADO', message: 'El nombre de usuario o correo ya está registrado' });
      }

      const hash = bcrypt.hashSync(password, 10);
      const result = db.prepare(`
        INSERT INTO users (branch_id, role_id, username, email, password_hash, full_name, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(branch_id ? Number(branch_id) : null, Number(role_id), username.trim(), email ? email.trim() : null, hash, full_name.trim());

      AuditService.log({
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

  static update(req, res) {
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

      db.prepare(`
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

      AuditService.log({
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
}

module.exports = UserController;
