const localtunnel = require('localtunnel');
const os = require('os');
const SettingsService = require('./settingsService');
const socketHandler = require('../socket/socketHandler');

class TunnelService {
  static tunnelInstance = null;
  static currentPublicUrl = null;
  static isStarting = false;

  /**
   * Obtiene la IP local real en la red Wi-Fi / Ethernet (ignorando adaptadores virtuales como vEthernet)
   */
  static getLocalIP() {
    const interfaces = os.networkInterfaces();
    let fallbackIP = null;

    // 1. Buscar primero en adaptadores físicos preferentes (Wi-Fi, Ethernet, LAN)
    const priorityNames = ['wi-fi', 'wifi', 'ethernet', 'eth', 'wlan', 'en0', 'red'];
    for (const name of Object.keys(interfaces)) {
      const lower = name.toLowerCase();
      const isVirtual = lower.includes('vethernet') || lower.includes('virtual') || lower.includes('vbox') || lower.includes('wsl');
      
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (!isVirtual && priorityNames.some(p => lower.includes(p))) {
            return iface.address; // Mejor coincidencia: Wi-Fi real
          }
          if (!isVirtual && !fallbackIP) {
            fallbackIP = iface.address;
          }
        }
      }
    }

    if (fallbackIP) return fallbackIP;

    // 2. Si no hay físico, buscar cualquier IPv4 no interna
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  /**
   * Inicia el túnel público HTTPS para que pacientes con datos móviles (4G/5G) puedan acceder
   */
  static async startTunnel({ port = 5000, subdomain = null } = {}) {
    if (this.tunnelInstance && this.currentPublicUrl) {
      return {
        success: true,
        public_url: this.currentPublicUrl,
        message: 'El túnel ya se encuentra activo.'
      };
    }

    if (this.isStarting) {
      return { success: false, message: 'El túnel se está iniciando, por favor espera...' };
    }

    this.isStarting = true;

    try {
      // Intentar nombre de subdominio limpio o aleatorio
      const desiredSubdomain = subdomain || process.env.TUNNEL_SUBDOMAIN || `deaturnos-${Math.floor(1000 + Math.random() * 9000)}`;

      console.log(`[Túnel] Abriendo túnel HTTPS para puerto ${port} (subdominio sugerido: ${desiredSubdomain})...`);
      
      const tunnel = await localtunnel({
        port,
        subdomain: desiredSubdomain
      });

      this.tunnelInstance = tunnel;
      this.currentPublicUrl = tunnel.url;
      this.isStarting = false;

      console.log(`================================================================`);
      console.log(` 🌐 TÚNEL PÚBLICO HTTPS ACTIVO PARA CELULARES (4G/5G):`);
      console.log(` 👉 ${this.currentPublicUrl}`);
      console.log(` Los pacientes pueden escanear el QR desde cualquier lugar sin Wi-Fi.`);
      console.log(`================================================================`);

      // Actualizar la URL pública en las configuraciones del sistema
      SettingsService.set('PUBLIC_APP_URL', this.currentPublicUrl, 'URL pública activa para códigos QR', 'string');

      // Notificar a pantallas de TV y frontend para actualizar el código QR en vivo
      socketHandler.emitConfigUpdated();

      tunnel.on('close', () => {
        console.log('[Túnel] El túnel público se ha cerrado.');
        this.tunnelInstance = null;
        this.currentPublicUrl = null;
        socketHandler.emitConfigUpdated();
      });

      tunnel.on('error', (err) => {
        console.warn('[Túnel Error]:', err.message);
      });

      return {
        success: true,
        public_url: this.currentPublicUrl,
        local_ip_url: `http://${this.getLocalIP()}:${port}`
      };
    } catch (err) {
      this.isStarting = false;
      console.error('[Túnel Error]: No se pudo abrir el túnel público:', err.message);
      return {
        success: false,
        error: err.message,
        local_ip_url: `http://${this.getLocalIP()}:${port}`
      };
    }
  }

  /**
   * Detiene el túnel público
   */
  static stopTunnel() {
    if (this.tunnelInstance) {
      this.tunnelInstance.close();
      this.tunnelInstance = null;
      this.currentPublicUrl = null;
      console.log('[Túnel] Túnel público detenido.');
      socketHandler.emitConfigUpdated();
      return { success: true, message: 'Túnel detenido exitosamente' };
    }
    return { success: true, message: 'No había túnel activo' };
  }

  /**
   * Obtiene el estado actual del túnel y las URLs de acceso
   */
  static getStatus(port = 5000) {
    const localIP = this.getLocalIP();
    const configUrl = SettingsService.get('PUBLIC_APP_URL');

    return {
      active: !!this.currentPublicUrl,
      public_url: this.currentPublicUrl || configUrl || null,
      local_ip: localIP,
      local_url: `http://${localIP}:${port}`,
      localhost_url: `http://localhost:${port}`
    };
  }

  /**
   * Obtiene la mejor URL para generar los códigos QR (Túnel HTTPS Activo > Dominio Personalizado > IP Wi-Fi Local)
   */
  static getEffectivePublicUrl(port = 5000) {
    if (this.currentPublicUrl && this.currentPublicUrl.startsWith('http')) {
      return this.currentPublicUrl;
    }
    const configUrl = SettingsService.get('PUBLIC_APP_URL');
    if (
      configUrl &&
      configUrl.startsWith('http') &&
      !configUrl.includes('localhost') &&
      !configUrl.includes('127.0.0.1') &&
      !configUrl.includes('.loca.lt')
    ) {
      return configUrl;
    }
    
    // IP local de la red Wi-Fi para que celulares en la red puedan acceder
    const localIP = this.getLocalIP();
    return `http://${localIP}:${port}`;
  }
}

module.exports = TunnelService;
