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
}

module.exports = SettingsController;
