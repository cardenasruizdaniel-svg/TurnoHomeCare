const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { setupSocket } = require('./socket/socketHandler');
const apiRoutes = require('./routes/api');
const initDatabase = require('./database/init');
const seedDatabase = require('./database/seed');
const db = require('./config/database');

const app = express();
const server = http.createServer(app);

// Configuración de Socket.IO con CORS amplio
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

setupSocket(io);

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Rutas de API
app.use('/api', apiRoutes);

// Servir frontend compilado en producción (dist)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  const indexPath = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(200).json({
    status: 'DEATurnos API running',
    message: 'Frontend no compilado aún. Ejecute "npm run build" o use el servidor de desarrollo en http://localhost:5173'
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

const PORT = process.env.PORT || 5000;

async function startServer() {
  await db.init();
  try {
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (!usersCount || usersCount.count === 0) {
      await seedDatabase();
    }
  } catch (e) {
    await initDatabase();
    await seedDatabase();
  }

  server.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(` DEATurnos Backend Server iniciado en puerto ${PORT}`);
    console.log(` API Endpoint: http://localhost:${PORT}/api`);
    console.log(` WebSocket: Activo y escuchando conexiones`);
    console.log(` Red Local: http://${TunnelService.getLocalIP()}:${PORT}`);
    console.log(`====================================================`);

    // Iniciar túnel si está configurado en .env o por argumento de línea de comando
    if (process.env.ENABLE_TUNNEL === 'true' || process.argv.includes('--tunnel')) {
      await TunnelService.startTunnel({ port: PORT });
    }
  });
}

startServer();

module.exports = { app, server };
