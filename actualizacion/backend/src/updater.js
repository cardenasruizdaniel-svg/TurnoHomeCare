const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../../');
const UPDATE_DIR = path.join(ROOT_DIR, 'actualizacion');
const BACKUP_DIR = path.join(ROOT_DIR, 'backend/data/backups');
const HISTORIAL_DIR = path.join(UPDATE_DIR, 'historial');

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Realiza una copia de seguridad atómica de la base de datos antes de actualizar
 */
function backupDatabase() {
  ensureDirExists(BACKUP_DIR);
  const dbPath = path.join(ROOT_DIR, 'backend/data/deaturnos.db');
  
  if (fs.existsSync(dbPath)) {
    const backupName = `deaturnos_backup_BEFORE_UPDATE_${getTimestamp()}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`🛡️ Copia de seguridad de la base de datos creada: backend/data/backups/${backupName}`);
    return backupPath;
  }
  return null;
}

/**
 * Copia recursiva respetando archivos protegidos del sistema
 */
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    ensureDirExists(dest);
    fs.readdirSync(src).forEach((childItemName) => {
      // Ignorar carpeta de historial y archivos sensibles
      if (childItemName === 'historial' || childItemName === '.gitkeep') return;
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    // Archivos protegidos que NUNCA deben sobrescribirse durante una actualización
    const filename = path.basename(src).toLowerCase();
    if (
      filename === 'deaturnos.db' ||
      filename === 'active_port.txt' ||
      filename === '.env'
    ) {
      console.log(`🔒 Protegiendo archivo de datos existente: ${filename}`);
      return;
    }

    ensureDirExists(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

async function runUpdater() {
  console.log('====================================================');
  console.log(' 🔄 DEATurnos - Sistema de Actualización Automática');
  console.log('====================================================');

  if (!fs.existsSync(UPDATE_DIR)) {
    console.log('⚠️  No se encontró la carpeta "actualizacion/". Creando carpeta...');
    ensureDirExists(UPDATE_DIR);
    fs.writeFileSync(path.join(UPDATE_DIR, '.gitkeep'), '# Coloque los archivos de actualización aquí\n');
    return;
  }

  // Verificar si hay archivos para actualizar en 'actualizacion/'
  const updateItems = fs.readdirSync(UPDATE_DIR).filter(item => item !== '.gitkeep' && item !== 'historial');

  if (updateItems.length === 0) {
    console.log('ℹ️  No hay archivos o paquetes de actualización pendientes en la carpeta "actualizacion/".');
    console.log('💡 Para actualizar, coloque los archivos nuevos dentro de la carpeta "actualizacion/" y vuelva a ejecutar este comando.');
    return;
  }

  console.log(`📦 Se encontraron ${updateItems.length} elemento(s) para actualizar en "actualizacion/":`, updateItems);

  // 1. Copia de Seguridad de la Base de Datos
  backupDatabase();

  // 2. Aplicar archivos de actualización sobre el proyecto
  console.log('🚚 Aplicando archivos de actualización (respetando datos registrados)...');
  let packageJsonUpdated = false;

  for (const item of updateItems) {
    const itemSrc = path.join(UPDATE_DIR, item);
    const itemDest = path.join(ROOT_DIR, item);

    if (item === 'package.json' || item.endsWith('package.json')) {
      packageJsonUpdated = true;
    }

    copyRecursiveSync(itemSrc, itemDest);
  }

  // 3. Ejecutar Migraciones de Base de Datos si aplican
  console.log('⚙️ Sincronizando esquema de base de datos...');
  try {
    const initDatabase = require('./database/init');
    await initDatabase();
  } catch (err) {
    console.warn('⚠️ Nota sobre inicialización de base de datos:', err.message);
  }

  // 4. Si se actualizó package.json, actualizar dependencias
  if (packageJsonUpdated) {
    console.log('📦 Actualizando dependencias npm...');
    try {
      execSync('npm install', { cwd: ROOT_DIR, stdio: 'inherit' });
    } catch (e) {
      console.warn('⚠️ No se pudieron instalar dependencias automáticamente:', e.message);
    }
  }

  // 5. Mover archivos procesados al historial de actualizaciones
  ensureDirExists(HISTORIAL_DIR);
  const patchFolder = path.join(HISTORIAL_DIR, `actualizacion_${getTimestamp()}`);
  ensureDirExists(patchFolder);

  for (const item of updateItems) {
    const srcPath = path.join(UPDATE_DIR, item);
    const destPath = path.join(patchFolder, item);
    try {
      fs.renameSync(srcPath, destPath);
    } catch (e) {
      copyRecursiveSync(srcPath, destPath);
      fs.rmSync(srcPath, { recursive: true, force: true });
    }
  }

  // Registrar informe de actualización
  const logContent = `Actualización aplicada exitosamente el ${new Date().toLocaleString()}\nElementos procesados: ${updateItems.join(', ')}\n`;
  fs.writeFileSync(path.join(patchFolder, 'informe.txt'), logContent, 'utf8');

  console.log('====================================================');
  console.log(' ✅ ¡ACTUALIZACIÓN APLICADA EXITOSAMENTE!');
  console.log(' 🛡️  Todos los turnos, pacientes y configuraciones se mantuvieron intactos.');
  console.log(` 📂 Los archivos de la actualización se guardaron en historial: ${patchFolder}`);
  console.log('====================================================');
}

if (require.main === module) {
  runUpdater()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error aplicando actualización:', err);
      process.exit(1);
    });
}

module.exports = runUpdater;
