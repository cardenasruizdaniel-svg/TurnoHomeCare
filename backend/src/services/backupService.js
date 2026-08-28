const fs = require('fs');
const path = require('path');
const db = require('../config/database');

class BackupService {
  static getDbPath() {
    return db.getDbPath ? db.getDbPath() : path.join(__dirname, '../../data/deaturnos.db');
  }

  /**
   * Genera un respaldo físico del archivo SQLite en disco
   */
  static createBackup() {
    try {
      if (db.persistToDisk) db.persistToDisk();
      const currentPath = this.getDbPath();
      if (!fs.existsSync(currentPath)) return null;

      const backupDir = path.join(path.dirname(currentPath), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `deaturnos_backup_${timestamp}.db`);

      fs.copyFileSync(currentPath, backupPath);
      return {
        filename: path.basename(backupPath),
        path: backupPath,
        size: fs.statSync(backupPath).size,
        createdAt: now.toISOString()
      };
    } catch (e) {
      console.error('Error creando backup:', e);
      return null;
    }
  }

  /**
   * Obtiene el buffer crudo de la base de datos para descarga directa (.db)
   */
  static getDatabaseBuffer() {
    if (db.persistToDisk) db.persistToDisk();
    const currentPath = this.getDbPath();
    if (fs.existsSync(currentPath)) {
      return fs.readFileSync(currentPath);
    }
    return null;
  }

  /**
   * Restaura la base de datos a partir de un Buffer subido por el usuario (.db)
   */
  static restoreFromBuffer(buffer) {
    const currentPath = this.getDbPath();
    const backupDir = path.join(path.dirname(currentPath), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    if (fs.existsSync(currentPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(currentPath, path.join(backupDir, `pre_restore_${timestamp}.db`));
    }

    fs.writeFileSync(currentPath, buffer);
    return true;
  }

  /**
   * Exporta todas las tablas a un objeto JSON completo para respaldo portátil
   */
  static exportFullDataJson() {
    const tables = [
      'companies', 'branches', 'services', 'counters',
      'counter_services', 'users', 'settings', 'patients',
      'tickets', 'ticket_events', 'audit_logs'
    ];

    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      database: {}
    };

    for (const table of tables) {
      try {
        const rows = db.prepare(`SELECT * FROM ${table}`).all();
        data.database[table] = rows;
      } catch (err) {
        data.database[table] = [];
      }
    }

    return data;
  }

  /**
   * Importa datos desde un objeto JSON restaurando configuraciones y registros
   */
  static importFullDataJson(jsonData) {
    if (!jsonData || !jsonData.database) {
      throw new Error('FORMATO_INVALIDO: El archivo no contiene la estructura requerida.');
    }

    const { database } = jsonData;

    const transaction = db.transaction(() => {
      // 1. Restaurar Sedes
      if (Array.isArray(database.branches)) {
        for (const b of database.branches) {
          const exists = db.prepare('SELECT id FROM branches WHERE id = ?').get(b.id);
          if (exists) {
            db.prepare(`
              UPDATE branches 
              SET code = ?, name = ?, address = ?, phone = ?, business_hours = ?, qr_code_slug = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `).run(b.code, b.name, b.address, b.phone, b.business_hours, b.qr_code_slug, b.is_active !== undefined ? b.is_active : 1, b.id);
          } else {
            db.prepare(`
              INSERT INTO branches (id, company_id, code, name, address, phone, business_hours, qr_code_slug, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(b.id, b.company_id || 1, b.code, b.name, b.address, b.phone, b.business_hours, b.qr_code_slug, b.is_active !== undefined ? b.is_active : 1);
          }
        }
      }

      // 2. Restaurar Servicios
      if (Array.isArray(database.services)) {
        for (const s of database.services) {
          const exists = db.prepare('SELECT id FROM services WHERE id = ?').get(s.id);
          if (exists) {
            db.prepare(`
              UPDATE services 
              SET code = ?, name = ?, description = ?, letter_prefix = ?, priority_prefix = ?, estimated_minutes = ?, is_active = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `).run(s.code, s.name, s.description, s.letter_prefix, s.priority_prefix, s.estimated_minutes, s.is_active, s.order_index, s.id);
          } else {
            db.prepare(`
              INSERT INTO services (id, company_id, code, name, description, letter_prefix, priority_prefix, estimated_minutes, is_active, order_index)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(s.id, s.company_id || 1, s.code, s.name, s.description, s.letter_prefix, s.priority_prefix, s.estimated_minutes, s.is_active, s.order_index);
          }
        }
      }

      // 3. Restaurar Consultorios/Módulos
      if (Array.isArray(database.counters)) {
        for (const c of database.counters) {
          const exists = db.prepare('SELECT id FROM counters WHERE id = ?').get(c.id);
          if (exists) {
            db.prepare(`
              UPDATE counters 
              SET branch_id = ?, code = ?, name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `).run(c.branch_id || 1, c.code, c.name, c.is_active, c.id);
          } else {
            db.prepare(`
              INSERT INTO counters (id, branch_id, code, name, is_active)
              VALUES (?, ?, ?, ?, ?)
            `).run(c.id, c.branch_id || 1, c.code, c.name, c.is_active);
          }
        }
      }

      // 4. Restaurar Configuraciones (Banners, Sonido, Logos, etc.)
      if (Array.isArray(database.settings)) {
        for (const set of database.settings) {
          const exists = db.prepare('SELECT id FROM settings WHERE key = ? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL))').get(set.key, set.branch_id, set.branch_id);
          if (exists) {
            db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(set.value, exists.id);
          } else {
            db.prepare('INSERT INTO settings (branch_id, key, value, description, data_type) VALUES (?, ?, ?, ?, ?)')
              .run(set.branch_id || null, set.key, set.value, set.description || null, set.data_type || 'string');
          }
        }
      }
    });

    transaction();

    if (db.persistToDisk) db.persistToDisk();
    return true;
  }
}

module.exports = BackupService;