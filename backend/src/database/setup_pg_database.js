const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupPgDatabase() {
  console.log('🐘 Configurando base de datos local en PostgreSQL...');

  const envPath = path.join(__dirname, '../../.env');

  // Extraer contraseña actual de DATABASE_URL si existe
  let currentUrl = process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/deaturnos';
  let urlPassword = '';
  try {
    const match = currentUrl.match(/postgres:\/\/postgres:([^@]+)@/);
    if (match) urlPassword = match[1];
  } catch (e) {}

  const candidatePasswords = [
    urlPassword,
    process.env.PGPASSWORD,
    'postgres',
    '',
    'admin',
    '123456',
    '1234',
    'root',
    'Home2026*'
  ].filter(p => p !== undefined && p !== null);

  // Eliminar duplicados manteniendo orden
  const passwordsToTry = [...new Set(candidatePasswords)];

  let connectedClient = null;
  let workingPassword = null;

  for (const pass of passwordsToTry) {
    try {
      const client = new Client({
        user: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        password: pass,
        connectionTimeoutMillis: 3000
      });
      await client.connect();
      connectedClient = client;
      workingPassword = pass;
      console.log(`🔑 Conexión exitosa a PostgreSQL local.`);
      break;
    } catch (e) {
      // Probar siguiente contraseña
    }
  }

  if (!connectedClient) {
    console.warn('⚠️  No se pudo autoconectar con contraseñas por defecto. Se continuará con la configuración estándar.');
    return;
  }

  try {
    const res = await connectedClient.query("SELECT 1 FROM pg_database WHERE datname = 'deaturnos'");
    if (res.rowCount === 0) {
      await connectedClient.query('CREATE DATABASE deaturnos');
      console.log('✅ Base de datos "deaturnos" creada en PostgreSQL local.');
    } else {
      console.log('✅ Base de datos "deaturnos" detectada en PostgreSQL local.');
    }
  } catch (dbErr) {
    console.warn('Advertencia verificando base de datos:', dbErr.message);
  } finally {
    await connectedClient.end();
  }

  // Actualizar backend/.env con la contraseña correcta
  if (fs.existsSync(envPath) && workingPassword !== null) {
    try {
      let envText = fs.readFileSync(envPath, 'utf8');
      const passPart = `:${workingPassword}`;
      const targetUrl = `DATABASE_URL=postgres://postgres${passPart}@localhost:5432/deaturnos`;
      if (envText.includes('DATABASE_URL=')) {
        envText = envText.replace(/DATABASE_URL=.*/g, targetUrl);
      } else {
        envText += `\n${targetUrl}\n`;
      }
      fs.writeFileSync(envPath, envText, 'utf8');
      process.env.DATABASE_URL = targetUrl;
    } catch (e) {
      console.error('Error actualizando .env:', e.message);
    }
  }
}

if (require.main === module) {
  setupPgDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(0); // Continuar el flujo sin bloquear el instalador batch
    });
}

module.exports = setupPgDatabase;
