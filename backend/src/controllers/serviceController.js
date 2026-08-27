const db = require('../config/database');
const AuditService = require('../services/auditService');

class ServiceController {
  static getAll(req, res) {
    try {
      const { all } = req.query;
      const sql = all === 'true' 
        ? 'SELECT * FROM services ORDER BY order_index ASC, id ASC'
        : 'SELECT * FROM services WHERE is_active = 1 ORDER BY order_index ASC, id ASC';
      const services = db.prepare(sql).all();
      res.json({ success: true, services });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static getById(req, res) {
    try {
      const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
      if (!service) return res.status(404).json({ success: false, error: 'SERVICIO_NO_ENCONTRADO' });
      res.json({ success: true, service });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static create(req, res) {
    try {
      const { company_id = 1, code, name, description, letter_prefix, priority_prefix = 'P', estimated_minutes = 15, is_active = 1, order_index = 0 } = req.body;

      if (!code || !name || !letter_prefix) {
        return res.status(400).json({ success: false, error: 'CAMPOS_OBLIGATORIOS', message: 'Código, nombre y prefijo de letra son obligatorios' });
      }

      const result = db.prepare(`
        INSERT INTO services (company_id, code, name, description, letter_prefix, priority_prefix, estimated_minutes, is_active, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(company_id, code.toUpperCase(), name, description, letter_prefix.toUpperCase(), priority_prefix.toUpperCase(), Number(estimated_minutes), is_active ? 1 : 0, Number(order_index));

      const newService = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);

      AuditService.log({
        userId: req.user.id,
        action: 'CREATE_SERVICE',
        entity: 'SERVICE',
        entityId: newService.id,
        details: { code: newService.code, name: newService.name }
      });

      res.status(201).json({ success: true, service: newService });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static update(req, res) {
    try {
      const { id } = req.params;
      const { code, name, description, letter_prefix, priority_prefix, estimated_minutes, is_active, order_index } = req.body;

      const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ success: false, error: 'SERVICIO_NO_ENCONTRADO' });

      db.prepare(`
        UPDATE services
        SET code = COALESCE(?, code),
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            letter_prefix = COALESCE(?, letter_prefix),
            priority_prefix = COALESCE(?, priority_prefix),
            estimated_minutes = COALESCE(?, estimated_minutes),
            is_active = COALESCE(?, is_active),
            order_index = COALESCE(?, order_index),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        code ? code.toUpperCase() : null,
        name,
        description,
        letter_prefix ? letter_prefix.toUpperCase() : null,
        priority_prefix ? priority_prefix.toUpperCase() : null,
        estimated_minutes !== undefined ? Number(estimated_minutes) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        order_index !== undefined ? Number(order_index) : null,
        id
      );

      const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);

      AuditService.log({
        userId: req.user.id,
        action: 'UPDATE_SERVICE',
        entity: 'SERVICE',
        entityId: updated.id,
        details: { code: updated.code, name: updated.name }
      });

      res.json({ success: true, service: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static toggleActive(req, res) {
    try {
      const { id } = req.params;
      const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ success: false, error: 'SERVICIO_NO_ENCONTRADO' });

      const newStatus = existing.is_active === 1 ? 0 : 1;
      db.prepare('UPDATE services SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);

      res.json({ success: true, id, is_active: newStatus });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static delete(req, res) {
    try {
      const { id } = req.params;
      const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ success: false, error: 'SERVICIO_NO_ENCONTRADO' });

      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM counter_services WHERE service_id = ?').run(id);
        db.prepare('DELETE FROM services WHERE id = ?').run(id);
      });
      transaction();

      AuditService.log({
        userId: req.user ? req.user.id : null,
        action: 'DELETE_SERVICE',
        entity: 'SERVICE',
        entityId: id,
        details: { name: existing.name, code: existing.code }
      });

      res.json({ success: true, message: 'Servicio eliminado correctamente' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = ServiceController;
