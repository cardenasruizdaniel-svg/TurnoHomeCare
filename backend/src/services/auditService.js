const db = require('../config/database');

class AuditService {
  static log({ userId = null, action, entity, entityId = null, ipAddress = null, details = null }) {
    try {
      const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details ? String(details) : null);
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, action, entity, entityId ? String(entityId) : null, ipAddress, detailsStr);
    } catch (err) {
      console.error('Error registrando auditoría:', err.message);
    }
  }

  static getLogs({ limit = 100, offset = 0, action = null, entity = null, startDate = null, endDate = null }) {
    let sql = `
      SELECT al.*, u.full_name as user_name, u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      sql += ' AND al.action = ?';
      params.push(action);
    }
    if (entity) {
      sql += ' AND al.entity = ?';
      params.push(entity);
    }
    if (startDate) {
      sql += ' AND DATE(al.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND DATE(al.created_at) <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  }
}

module.exports = AuditService;
