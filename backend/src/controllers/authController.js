const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middlewares/auth');
const AuditService = require('../services/auditService');

class AuthController {
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'CAMPOS_REQUERIDOS', message: 'Usuario y contraseña requeridos' });
      }

      const user = await db.prepare(`
        SELECT u.*, r.name as role_name, b.name as branch_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.username = ? AND u.is_active = 1
      `).get(username);

      if (!user) {
        return res.status(401).json({ success: false, error: 'CREDENCIALES_INVALIDAS', message: 'Usuario o contraseña incorrectos' });
      }

      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'CREDENCIALES_INVALIDAS', message: 'Usuario o contraseña incorrectos' });
      }

      // Actualizar último login
      await db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

      const tokenPayload = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role_name,
        branch_id: user.branch_id
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

      await AuditService.log({
        userId: user.id,
        action: 'USER_LOGIN',
        entity: 'USER',
        entityId: user.id,
        ipAddress: req.ip,
        details: { username: user.username, role: user.role_name }
      });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role_name,
          branch_id: user.branch_id,
          branch_name: user.branch_name
        }
      });
    } catch (err) {
      console.error('Error en login:', err);
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  static async getMe(req, res) {
    try {
      const user = await db.prepare(`
        SELECT u.id, u.username, u.full_name, u.email, u.branch_id, r.name as role_name, b.name as branch_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.id = ?
      `).get(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, error: 'USUARIO_NO_ENCONTRADO' });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role_name,
          branch_id: user.branch_id,
          branch_name: user.branch_name
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }
}

module.exports = AuthController;
