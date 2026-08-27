const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function initDatabase() {
  await db.init();
  // console.log(' Inicializando base de datos DEATurnos...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  db.exec(schema);
  // console.log(' Esquema de base de datos cargado exitosamente.');
}

if (require.main === module) {
  initDatabase().then(() => console.log('Base de datos inicializada.'));
}

module.exports = initDatabase;
