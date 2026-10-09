const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function resetCleanDatabase() {
  const dataDir = path.join(__dirname, '../data');
  const dbPath = path.join(dataDir, 'deaturnos.db');
  const backupDir = path.join(dataDir, 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Respaldo preventivo antes de poner en ceros
  if (fs.existsSync(dbPath)) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `deaturnos_backup_BEFORE_FRESH_RESET_${timestamp}.db`);
      fs.copyFileSync(dbPath, backupPath);
      console.log(`📦 Respaldo preventivo creado en: ${backupPath}`);
    } catch (e) {
      console.warn('Aviso respaldando DB previo:', e.message);
    }
  }

  // 2. Eliminar base de datos vieja para iniciar 100% limpia en ceros
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
      console.log('🧹 Base de datos anterior eliminada. Creando estructura nueva limpia...');
    } catch (e) {
      console.warn('Advertencia al eliminar archivo DB:', e.message);
    }
  }

  // 3. Inicializar y sembrar la base de datos limpia desde cero
  const db = require('./config/database');
  const initDatabase = require('./database/init');
  const seedDatabase = require('./database/seed');
  const resetAdmin = require('./reset_admin');

  await db.init();
  await initDatabase();
  await seedDatabase();
  await resetAdmin();

  console.log('========================================================');
  console.log(' ✅ ¡SISTEMA RESTABLECIDO Y EN CEROS EXITOSAMENTE!');
  console.log('========================================================');
  console.log(' Empresa: HomeCare del Quindío I.P.S.');
  console.log(' Usuario Admin: admin');
  console.log(' Contraseña Admin: admin123');
  console.log(' Usuario Ventanilla: Ventanilla1');
  console.log(' Contraseña Ventanilla: Home2026*');
  console.log('========================================================');
}

resetCleanDatabase().catch(err => {
  console.error('❌ Error al poner la base de datos en ceros:', err);
  process.exit(1);
});
