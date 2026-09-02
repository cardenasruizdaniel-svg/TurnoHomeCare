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
