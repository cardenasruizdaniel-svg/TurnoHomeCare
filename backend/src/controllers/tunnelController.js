const TunnelService = require('../services/tunnelService');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

class TunnelController {
  static getStatus(req, res) {
    try {
      const status = TunnelService.getStatus(PORT);
      res.json({ success: true, ...status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async start(req, res) {
    try {
      const { subdomain } = req.body || {};
      const result = await TunnelService.startTunnel({
        port: PORT,
        subdomain
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static stop(req, res) {
    try {
      const result = TunnelService.stopTunnel();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = TunnelController;
