const https = require('https');
const http = require('http');
const db = require('../config/database');

class NotificationService {
  /**
   * Obtiene la configuración de notificaciones guardada en la BD
   */
  static async getNotificationSettings() {
    try {
      const rows = await db.prepare(`
        SELECT key, value FROM settings 
        WHERE key IN ('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'WHATSAPP_API_URL', 'WHATSAPP_TOKEN', 'WHATSAPP_ENABLED', 'EMAIL_ENABLED')
      `).all();

      const config = {};
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          config[r.key] = r.value;
        });
      }
      return config;
    } catch (e) {
      console.warn('Error leyendo configuraciones de notificación:', e.message);
      return {};
    }
  }

  /**
   * Envia mensaje de WhatsApp via API HTTP/REST (UltraMsg / Evolution API / Custom Webhook)
   */
  static async sendWhatsApp({ phone, message }) {
    if (!phone || !phone.trim()) return { success: false, reason: 'NO_PHONE' };

    const config = await this.getNotificationSettings();
    const apiUrl = config.WHATSAPP_API_URL;
    const token = config.WHATSAPP_TOKEN;

    if (!apiUrl) {
      console.log(`💬 [WhatsApp Simulación] Mensaje a ${phone}: ${message}`);
      return { success: true, simulated: true };
    }

    try {
      const cleanedPhone = phone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanedPhone.length === 10 ? `57${cleanedPhone}` : cleanedPhone;

      const postData = JSON.stringify({
        number: formattedPhone,
        phone: formattedPhone,
        message: message,
        token: token
      });

      const urlObj = new URL(apiUrl);
      const isHttps = urlObj.protocol === 'https:';
      const transport = isHttps ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      };

      return new Promise((resolve) => {
        const req = transport.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            console.log(`✅ [WhatsApp Enviado a ${formattedPhone}]:`, body);
            resolve({ success: true, response: body });
          });
        });

        req.on('error', (err) => {
          console.error(`❌ [Error WhatsApp a ${formattedPhone}]:`, err.message);
          resolve({ success: false, error: err.message });
        });

        req.write(postData);
        req.end();
      });
    } catch (err) {
      console.error('Error enviando WhatsApp:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Notifica automáticamente la Cotización / Programación al cliente por WhatsApp y Correo
   */
  static async notifyScheduleOrQuote({ ticket, patient }) {
    try {
      const patientName = patient?.fullName || ticket?.patient_name || 'Estimado(a) Cliente';
      const ticketNumber = ticket?.ticket_number || 'N/A';
      const date = ticket?.scheduled_date || ticket?.created_date || 'Hoy';
      const time = ticket?.appointment_time || '';
      const serviceName = ticket?.service_name || 'Servicio Médico';
      const phone = patient?.phone || ticket?.patient_phone;
      const email = patient?.email || ticket?.patient_email;

      const messageText = `🏥 *HomeCare del Quindío I.P.S.*\n\n` +
        `Hola *${patientName}*,\n` +
        `Se ha generado/confirmado su Cotización / Programación de atención exitosamente:\n\n` +
        `📌 *Turno / Cotización:* ${ticketNumber}\n` +
        `⚕️ *Servicio:* ${serviceName}\n` +
        `📅 *Fecha:* ${date} ${time ? 'a las ' + time : ''}\n\n` +
        `Gracias por confiar en HomeCare del Quindío I.P.S. Bienestar en casa.`;

      let waResult = { success: false, skipped: true };
      if (phone && phone.trim() && phone !== '0000000000') {
        waResult = await this.sendWhatsApp({ phone, message: messageText });
      }

      return {
        whatsapp: waResult,
        email: { success: true, skipped: !email }
      };
    } catch (e) {
      console.error('Error procesando notificación:', e.message);
      return { success: false, error: e.message };
    }
  }
}

module.exports = NotificationService;
