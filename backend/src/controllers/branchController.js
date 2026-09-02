const QRCode = require('qrcode');
const db = require('../config/database');
const AuditService = require('../services/auditService');
const TunnelService = require('../services/tunnelService');
require('dotenv').config();

class BranchController {
  static async getAll(req, res) {
    try {
      const branches = await db.prepare(`
        SELECT b.*, c.name as company_name, c.logo_url, c.primary_color
        FROM branches b
        JOIN companies c ON b.company_id = c.id
        ORDER BY b.id ASC
      `).all();

      const effectiveBaseUrl = TunnelService.getEffectivePublicUrl(process.env.PORT || 5000);

      const enriched = await Promise.all(branches.map(async (b) => {
        const publicUrl = `${effectiveBaseUrl}/solicitar-turno?branchId=${b.id}`;
        const qrDataUrl = await QRCode.toDataURL(publicUrl, {
          width: 320,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
        return {
          ...b,
          public_request_url: publicUrl,
          qr_code_data_url: qrDataUrl
        };
      }));

      res.json({ success: true, branches: enriched });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getById(req, res) {
    try {
      const branch = await db.prepare(`
        SELECT b.*, c.name as company_name, c.logo_url, c.primary_color, c.secondary_color
        FROM branches b
        JOIN companies c ON b.company_id = c.id
        WHERE b.id = ?
      `).get(req.params.id);

      if (!branch) return res.status(404).json({ success: false, error: 'SEDE_NO_ENCONTRADA' });

      const effectiveBaseUrl = TunnelService.getEffectivePublicUrl(process.env.PORT || 5000);
      const publicUrl = `${effectiveBaseUrl}/solicitar-turno?branchId=${branch.id}`;
      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      res.json({
        success: true,
        branch: {
          ...branch,
          public_request_url: publicUrl,
          qr_code_data_url: qrDataUrl
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const { company_id = 1, code, name, address, phone, business_hours, qr_code_slug } = req.body;

      if (!code || !name) {
        return res.status(400).json({ success: false, error: 'CAMPOS_REQUERIDOS', message: 'Código y nombre son obligatorios' });
      }

      const slug = qr_code_slug || code.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const result = await db.prepare(`
        INSERT INTO branches (company_id, code, name, address, phone, business_hours, qr_code_slug, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(company_id, code.toUpperCase(), name, address, phone, business_hours, slug);

      await AuditService.log({
        userId: req.user.id,
        action: 'CREATE_BRANCH',
        entity: 'BRANCH',
        entityId: result.lastInsertRowid,
        details: { code, name }
      });

      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { code, name, address, phone, business_hours, is_active } = req.body;

      await db.prepare(`
        UPDATE branches
        SET code = COALESCE(?, code),
            name = COALESCE(?, name),
            address = COALESCE(?, address),
            phone = COALESCE(?, phone),
            business_hours = COALESCE(?, business_hours),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(code ? code.toUpperCase() : null, name, address, phone, business_hours, is_active !== undefined ? (is_active ? 1 : 0) : null, id);

      await AuditService.log({
        userId: req.user.id,
        action: 'UPDATE_BRANCH',
        entity: 'BRANCH',
        entityId: id,
        details: { name }
      });

      res.json({ success: true, message: 'Sede actualizada exitosamente' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await db.prepare('SELECT * FROM branches WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ success: false, error: 'SEDE_NO_ENCONTRADA' });

      const countRow = await db.prepare('SELECT COUNT(*) as total FROM branches').get();
      if (countRow && countRow.total <= 1) {
        return res.status(400).json({ success: false, error: 'NO_SE_PUEDE_ELIMINAR_UNICA_SEDE', message: 'Debe existir al menos una sede principal en el sistema.' });
      }

      const transaction = db.transaction(async () => {
        await db.prepare('DELETE FROM counters WHERE branch_id = ?').run(id);
        await db.prepare('DELETE FROM branches WHERE id = ?').run(id);
      });
      await transaction();

      await AuditService.log({
        userId: req.user ? req.user.id : null,
        action: 'DELETE_BRANCH',
        entity: 'BRANCH',
        entityId: id,
        details: { name: existing.name, code: existing.code }
      });

      res.json({ success: true, message: 'Sede eliminada exitosamente' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = BranchController;
