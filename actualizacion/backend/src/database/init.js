const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function initDatabase() {
  await db.init();
  console.log('🚀 Inicializando esquema de base de datos...');

  try {
    if (db.isPostgres()) {
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema_pg.sql'), 'utf8');
      await db.exec(schemaSql);
      console.log('✅ Esquema PostgreSQL listo y actualizado (sin pérdida de datos).');
    } else {
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      db.exec(schemaSql);
      console.log('✅ Esquema SQLite listo y actualizado (sin pérdida de datos).');
    }

    // Migración dinámica: Garantizar columna permissions en la tabla roles
    try {
      if (db.isPostgres()) {
        await db.exec('ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions TEXT;');
      } else {
        const columns = await db.prepare("PRAGMA table_info(roles)").all();
        const hasPermissions = columns.some(c => c.name === 'permissions');
        if (!hasPermissions) {
          db.exec('ALTER TABLE roles ADD COLUMN permissions TEXT;');
        }
      }
    } catch (e) {
      // Ignorar si la columna ya existe
    }

    // Inicializar permisos por defecto para roles creados previamente si están nulos
    const allPerms = JSON.stringify(["dashboard", "attention", "history_tickets", "schedule", "services", "counters", "branches", "users", "settings", "audit", "reports"]);
    const supPerms = JSON.stringify(["dashboard", "attention", "history_tickets", "schedule", "services", "counters", "reports"]);
    const funcPerms = JSON.stringify(["attention", "history_tickets", "schedule"]);

    await db.prepare("UPDATE roles SET permissions = ? WHERE name = 'ADMIN' AND (permissions IS NULL OR permissions = '')").run(allPerms);
    await db.prepare("UPDATE roles SET permissions = ? WHERE name = 'SUPERVISOR' AND (permissions IS NULL OR permissions = '')").run(supPerms);
    await db.prepare("UPDATE roles SET permissions = ? WHERE name = 'FUNCIONARIO' AND (permissions IS NULL OR permissions = '')").run(funcPerms);
  } catch (err) {
    console.error('Error aplicando esquema de base de datos:', err);
    throw err;
  }
}

if (require.main === module) {
  initDatabase().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = initDatabase;
