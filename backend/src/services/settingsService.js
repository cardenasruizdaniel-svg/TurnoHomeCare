const db = require('../config/database');

class SettingsService {
  /**
   * Obtiene una configuración por clave, buscando primero a nivel de sede y luego global.
   */
  static get(key, branchId = null) {
    let row = null;
    if (branchId) {
      row = db.prepare('SELECT * FROM settings WHERE key = ? AND branch_id = ?').get(key, branchId);
    }
    if (!row) {
      row = db.prepare('SELECT * FROM settings WHERE key = ? AND branch_id IS NULL').get(key);
    }
    if (!row) return null;

    return this.castValue(row.value, row.data_type);
  }

  /**
   * Obtiene todas las configuraciones con sobreescritura de sede.
   */
  static getAll(branchId = null) {
    const globals = db.prepare('SELECT * FROM settings WHERE branch_id IS NULL').all();
    const result = {};

    globals.forEach(g => {
      result[g.key] = {
        key: g.key,
        value: this.castValue(g.value, g.data_type),
        description: g.description,
        data_type: g.data_type,
        is_branch_override: false
      };
    });

    if (branchId) {
      const branchSettings = db.prepare('SELECT * FROM settings WHERE branch_id = ?').all(branchId);
      branchSettings.forEach(bs => {
        result[bs.key] = {
          key: bs.key,
          value: this.castValue(bs.value, bs.data_type),
          description: bs.description,
          data_type: bs.data_type,
          is_branch_override: true
        };
      });
    }

    return result;
  }

  /**
   * Guarda o actualiza una configuración
   */
  static set(key, value, description = null, dataType = 'string', branchId = null) {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const existing = branchId
      ? db.prepare('SELECT id FROM settings WHERE key = ? AND branch_id = ?').get(key, branchId)
      : db.prepare('SELECT id FROM settings WHERE key = ? AND branch_id IS NULL').get(key);

    if (existing) {
      db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(stringValue, existing.id);
    } else {
      db.prepare('INSERT INTO settings (branch_id, key, value, description, data_type) VALUES (?, ?, ?, ?, ?)')
        .run(branchId, key, stringValue, description, dataType);
    }
  }

  /**
   * Actualiza múltiples configuraciones en lote
   */
  static updateBatch(settingsMap, branchId = null) {
    const updateStmt = db.prepare(`
      INSERT INTO settings (branch_id, key, value, description, data_type)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(branch_id, key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = db.transaction((items) => {
      for (const [key, val] of Object.entries(items)) {
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        // Buscar metadata existente
        const meta = db.prepare('SELECT description, data_type FROM settings WHERE key = ? LIMIT 1').get(key);
        const desc = meta ? meta.description : '';
        const dtype = meta ? meta.data_type : (typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string');
        updateStmt.run(branchId, key, strVal, desc, dtype);
      }
    });

    transaction(settingsMap);
  }

  static castValue(val, type) {
    if (val === null || val === undefined) return null;
    switch (type) {
      case 'number':
        return Number(val);
      case 'boolean':
        return val === 'true' || val === '1' || val === 1 || val === true;
      case 'json':
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      default:
        return String(val);
    }
  }
}

module.exports = SettingsService;
