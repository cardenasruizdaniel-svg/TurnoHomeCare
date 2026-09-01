const SettingsService = require('../services/settingsService');
const socketHandler = require('../socket/socketHandler');
const AuditService = require('../services/auditService');
const db = require('../config/database');

class SettingsController {
  static getAll(req, res) {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : null;
      const settings = SettingsService.getAll(branchId);
      const company = db.prepare('SELECT * FROM companies WHERE id = 1').get();

      res.json({
        success: true,
        settings,
        company
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static updateBatch(req, res) {
    try {
      const { settings, company, branchId = null } = req.body;

      if (settings && typeof settings === 'object') {
        SettingsService.updateBatch(settings, branchId ? Number(branchId) : null);
      }

      if (company && typeof company === 'object') {
        db.prepare(`
          UPDATE companies
          SET name = COALESCE(?, name),
              nit = COALESCE(?, nit),
              logo_url = COALESCE(?, logo_url),
              primary_color = COALESCE(?, primary_color),
              secondary_color = COALESCE(?, secondary_color),
              slogan = COALESCE(?, slogan),
              accent_color = COALESCE(?, accent_color),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = 1
        `).run(company.name, company.nit, company.logo_url, company.primary_color, company.secondary_color, company.slogan || null, company.accent_color || null);
      }

      AuditService.log({
        userId: req.user ? req.user.id : null,
        action: 'UPDATE_SETTINGS',
        entity: 'SETTINGS',
        details: { branchId, updated_keys: Object.keys(settings || {}) }
      });

      socketHandler.emitConfigUpdated(branchId);

      res.json({ success: true, message: 'Configuraciones actualizadas con éxito' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static resetDailyQueue(req, res) {
    try {
      const branchId = req.body.branchId ? Number(req.body.branchId) : 1;
      const TicketService = require('../services/ticketService');
      const result = TicketService.resetDailyQueue({
        branchId,
        userId: req.user ? req.user.id : null
      });

      socketHandler.emitQueueUpdated(branchId);
      socketHandler.emitConfigUpdated(branchId);

      res.json({ success: true, message: result.message });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static downloadBackup(req, res) {
    try {
      const BackupService = require('../services/backupService');
      const buffer = BackupService.getDatabaseBuffer();
      if (!buffer) {
        return res.status(404).json({ success: false, error: 'NO_DATABASE_FILE' });
      }

      const today = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="deaturnos_backup_${today}.db"`);
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static exportJsonBackup(req, res) {
    try {
      const BackupService = require('../services/backupService');
      const data = BackupService.exportFullDataJson();
      const today = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="deaturnos_full_backup_${today}.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(data, null, 2));
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static importJsonBackup(req, res) {
    try {
      const BackupService = require('../services/backupService');
      const { backupData } = req.body;
      if (!backupData) {
        return res.status(400).json({ success: false, error: 'DATOS_REQUERIDOS', message: 'Debe adjuntar los datos del respaldo.' });
      }

      const parsedData = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
      BackupService.importFullDataJson(parsedData);
      res.json({ success: true, message: 'Base de datos y configuraciones restauradas exitosamente desde el respaldo.' });
    } catch (err) {
      console.error('Error importando respaldo JSON:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static createBackupSnapshot(req, res) {
    try {
      const BackupService = require('../services/backupService');
      const backupInfo = BackupService.createBackup();
      if (!backupInfo) {
        return res.status(500).json({ success: false, error: 'ERROR_CREATING_BACKUP' });
      }
      res.json({ success: true, message: 'Copia de respaldo generada exitosamente en disco.', backup: backupInfo });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static syncOfficialData(req, res) {
    try {
      const syncServicesAndCounters = require('../database/syncServicesAndCounters');
      syncServicesAndCounters();
      res.json({
        success: true,
        message: 'Base de datos y usuarios oficiales sincronizados exitosamente (Admin: Ing. Daniel Cárdenas Ruiz y 5 usuarios de módulo).'
      });
    } catch (err) {
      console.error('Error sincronizando datos oficiales:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = SettingsController;
