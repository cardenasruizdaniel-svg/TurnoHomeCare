const db = require('../config/database');
const AuditService = require('../services/auditService');

class CounterController {
  static getAll(req, res) {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : null;
      let sql = `
        SELECT c.*, b.name as branch_name, u.full_name as current_user_name
        FROM counters c
        JOIN branches b ON c.branch_id = b.id
        LEFT JOIN users u ON c.current_user_id = u.id
      `;
      const params = [];
      if (branchId) {
        sql += ' WHERE c.branch_id = ?';
        params.push(branchId);
      }
      sql += ' ORDER BY c.code ASC';

      const counters = db.prepare(sql).all(...params);

      // Obtener servicios vinculados a cada módulo
      const getServicesStmt = db.prepare(`
        SELECT s.id, s.name, s.code, s.letter_prefix
        FROM counter_services cs
        JOIN services s ON cs.service_id = s.id
        WHERE cs.counter_id = ?
      `);

      const enriched = counters.map(c => ({
        ...c,
        assigned_services: getServicesStmt.all(c.id)
      }));

      res.json({ success: true, counters: enriched });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static create(req, res) {
    try {
      const { branch_id = 1, code, name, service_ids = [] } = req.body;

      if (!code || !name) {
        return res.status(400).json({ success: false, error: 'CAMPOS_REQUERIDOS', message: 'Código y nombre son obligatorios' });
      }

      let counterId = null;
      const transaction = db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO counters (branch_id, code, name, is_active)
          VALUES (?, ?, ?, 1)
        `).run(Number(branch_id), code.toUpperCase(), name);

        counterId = result.lastInsertRowid;

        const insertCS = db.prepare('INSERT INTO counter_services (counter_id, service_id) VALUES (?, ?)');
        for (const sId of service_ids) {
          insertCS.run(counterId, Number(sId));
        }
      });

      transaction();

      AuditService.log({
        userId: req.user.id,
        action: 'CREATE_COUNTER',
        entity: 'COUNTER',
        entityId: counterId,
        details: { code, name, branch_id }
      });

      res.status(201).json({ success: true, id: counterId });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static update(req, res) {
    try {
      const { id } = req.params;
      const { code, name, is_active, service_ids } = req.body;

      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE counters
          SET code = COALESCE(?, code),
              name = COALESCE(?, name),
              is_active = COALESCE(?, is_active),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(code ? code.toUpperCase() : null, name, is_active !== undefined ? (is_active ? 1 : 0) : null, id);

        if (Array.isArray(service_ids)) {
          db.prepare('DELETE FROM counter_services WHERE counter_id = ?').run(id);
          const insertCS = db.prepare('INSERT INTO counter_services (counter_id, service_id) VALUES (?, ?)');
          for (const sId of service_ids) {
            insertCS.run(id, Number(sId));
          }
        }
      });

      transaction();

      AuditService.log({
        userId: req.user.id,
        action: 'UPDATE_COUNTER',
        entity: 'COUNTER',
        entityId: id,
        details: { code, name }
      });

      res.json({ success: true, message: 'Módulo actualizado con éxito' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static delete(req, res) {
    try {
      const { id } = req.params;
      const existing = db.prepare('SELECT * FROM counters WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ success: false, error: 'MODULO_NO_ENCONTRADO' });

      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM counter_services WHERE counter_id = ?').run(id);
        db.prepare('DELETE FROM counters WHERE id = ?').run(id);
      });
      transaction();

      AuditService.log({
        userId: req.user ? req.user.id : null,
        action: 'DELETE_COUNTER',
        entity: 'COUNTER',
        entityId: id,
        details: { name: existing.name, code: existing.code }
      });

      res.json({ success: true, message: 'Módulo eliminado correctamente' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = CounterController;
