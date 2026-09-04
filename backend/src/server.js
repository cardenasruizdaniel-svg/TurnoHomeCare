const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./config/database');
const initDatabase = require('./database/init');
const syncServicesAndCounters = require('./database/syncServicesAndCounters');

const app = express();
const server = http.createServer(app);

// Configuración de CORS y WebSocket
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hacer IO accesible en req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Registrar Rutas API
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Servir frontend compilado en producción
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  }));
}

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  const indexPath = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.sendFile(indexPath);
  }
  res.status(200).json({
    status: 'DEATurnos API running',
    message: 'Frontend no compilado aún. Ejecute "npm run build" o utilice el instalador'
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[Error no controlado]:', err);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message
  });
});

const TunnelService = require('./services/tunnelService');

const DEFAULT_PORT = Number(process.env.PORT) || 5000;

function listenOnAvailablePort(initialPort) {
  return new Promise((resolve, reject) => {
    let currentPort = Number(initialPort) || 5000;

    function tryListen(portToTry) {
      const tempServer = server.listen(portToTry, async () => {
        console.log(`====================================================`);
        console.log(` DEATurnos Backend Server iniciado en puerto ${portToTry}`);
        console.log(` Acceso Local: http://localhost:${portToTry}`);
        console.log(` API Endpoint: http://localhost:${portToTry}/api`);
        console.log(` Red Local: http://${TunnelService.getLocalIP()}:${portToTry}`);
        console.log(`====================================================`);

        try {
          const dataDir = path.join(__dirname, '../data');
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
          fs.writeFileSync(path.join(dataDir, 'active_port.txt'), String(portToTry), 'utf8');
        } catch (e) {}

        if (process.env.ENABLE_TUNNEL === 'true' || process.argv.includes('--tunnel')) {
          await TunnelService.startTunnel({ port: portToTry });
        }
        resolve(portToTry);
      });

      tempServer.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠️ Puerto ${portToTry} ocupado. Probando puerto ${portToTry + 1}...`);
          tryListen(portToTry + 1);
        } else {
          reject(err);
        }
      });
    }

    tryListen(currentPort);
  });
}

async function startServer() {
  await db.init();
  try {
    await initDatabase();
    await syncServicesAndCounters();
  } catch (e) {
    console.error('Error durante la inicialización del servidor:', e);
  }

  await listenOnAvailablePort(DEFAULT_PORT);
}

startServer();

module.exports = { app, server };
