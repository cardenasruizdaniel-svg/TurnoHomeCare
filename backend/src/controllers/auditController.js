const AuditService = require('../services/auditService');

class AuditController {
  static async getLogs(req, res) {
    try {
      const { limit = 100, offset = 0, action, entity, startDate, endDate } = req.query;
      const logs = await AuditService.getLogs({
        limit: Number(limit),
        offset: Number(offset),
        action,
        entity,
        startDate,
        endDate
      });

      res.json({ success: true, logs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = AuditController;
