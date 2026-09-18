const StatsService = require('../services/statsService');

class StatsController {
  static async getDashboard(req, res) {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : null;
      const date = req.query.date || null;
      const stats = await StatsService.getDashboardStats(branchId, date);
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getHistory(req, res) {
    try {
      const {
        branchId, startDate, endDate, serviceId, status, ticketType, userId, search, limit = 50, offset = 0
      } = req.query;

      const history = await StatsService.getTicketHistory({
        branchId: branchId ? Number(branchId) : null,
        startDate,
        endDate,
        serviceId: serviceId ? Number(serviceId) : null,
        status,
        ticketType,
        userId: userId ? Number(userId) : null,
        search,
        limit: Number(limit),
        offset: Number(offset)
      });

      res.json({ success: true, ...history });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async exportCSV(req, res) {
    try {
      const { branchId, startDate, endDate, serviceId, status, ticketType, userId, search } = req.query;
      const csv = await StatsService.exportTicketsCSV({
        branchId: branchId ? Number(branchId) : null,
        startDate,
        endDate,
        serviceId: serviceId ? Number(serviceId) : null,
        status,
        ticketType,
        userId: userId ? Number(userId) : null,
        search
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=turnos_reporte_${new Date().toISOString().slice(0, 10)}.csv`);
      res.send('\uFEFF' + csv); // BOM para Excel
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = StatsController;
