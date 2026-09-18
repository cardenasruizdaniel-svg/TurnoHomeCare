const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');
require('dotenv').config();

async function migrateSqliteToPg() {
  console.log('🔄 Iniciando Proceso de Migración: SQLite ➔ PostgreSQL');

  const pgUrl = process.env.DATABASE_URL;
  if (!pgUrl) {
    throw new Error('❌ DATABASE_URL no está configurada en las variables de entorno.');
  }

  // 1. Cargar SQLite
  let sqliteDbPath = process.env.DB_PATH;
  if (!sqliteDbPath) {
    if (fs.existsSync('/var/data/deaturnos.db')) sqliteDbPath = '/var/data/deaturnos.db';
    else if (fs.existsSync('/data/deaturnos.db')) sqliteDbPath = '/data/deaturnos.db';
    else sqliteDbPath = path.join(__dirname, '../../data/deaturnos.db');
  }

  const fullSqlitePath = path.resolve(sqliteDbPath);
  if (!fs.existsSync(fullSqlitePath)) {
    console.log(`⚠️  No se encontró base de datos SQLite en ${fullSqlitePath}. Se procederá con la inicialización limpia en PostgreSQL.`);
  }

  // 2. Conectar a PostgreSQL
  const isProduction = process.env.NODE_ENV === 'production' || pgUrl.includes('render.com') || pgUrl.includes('sslmode=require');
  const pool = new Pool({
    connectionString: pgUrl,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  });

  const pgClient = await pool.connect();

  try {
    // 3. Crear Estructura DDL en PostgreSQL
    console.log('📦 Aplicando esquema DDL PostgreSQL...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema_pg.sql'), 'utf8');
    await pgClient.query(schemaSql);

    if (fs.existsSync(fullSqlitePath)) {
      console.log(`📖 Leyendo registros desde SQLite (${fullSqlitePath})...`);
      const SQL = await initSqlJs();
      const sqliteBuffer = fs.readFileSync(fullSqlitePath);
      const sqliteDb = new SQL.Database(sqliteBuffer);

      const tablesOrder = [
        'companies',
        'branches',
        'roles',
        'users',
        'services',
        'counters',
        'counter_services',
        'patients',
        'tickets',
        'ticket_events',
        'settings',
        'audit_logs'
      ];

      for (const table of tablesOrder) {
        try {
          const res = sqliteDb.exec(`SELECT * FROM ${table}`);
          if (!res || res.length === 0 || !res[0].values) {
            console.log(` ── Tabla ${table}: 0 registros.`);
            continue;
          }

          const columns = res[0].columns;
          const rows = res[0].values;
          let countInserted = 0;

          for (const row of rows) {
            const rowObj = {};
            columns.forEach((col, idx) => { rowObj[col] = row[idx]; });

            const keys = Object.keys(rowObj);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const values = keys.map(k => rowObj[k]);
            const colsStr = keys.join(', ');

            let conflictClause = '';
            if (table === 'counter_services') {
              conflictClause = 'ON CONFLICT (counter_id, service_id) DO NOTHING';
            } else if (table === 'settings') {
              conflictClause = 'ON CONFLICT (branch_id, key) DO NOTHING';
            } else {
              conflictClause = 'ON CONFLICT (id) DO NOTHING';
            }

            const insertQuery = `INSERT INTO ${table} (${colsStr}) VALUES (${placeholders}) ${conflictClause}`;
            try {
              await pgClient.query(insertQuery, values);
              countInserted++;
            } catch (rowErr) {
              // Si falla por una FK de prueba eliminada, omitir pacíficamente esa fila
            }
          }
          console.log(` ── Tabla ${table}: ${countInserted}/${rows.length} registros insertados.`);
        } catch (tableErr) {
          console.warn(`⚠️  Advertencia migrando tabla ${table}:`, tableErr.message);
        }
      }

      console.log('✅ Migración de datos desde SQLite a PostgreSQL completada.');

      // 4. Resetear Secuencias Seriales en PostgreSQL
      console.log('🔢 Sincronizando secuencias seriales de PostgreSQL...');
      const serialTables = [
        'companies', 'branches', 'roles', 'users', 'services', 
        'counters', 'patients', 'tickets', 'ticket_events', 'settings', 'audit_logs'
      ];

      for (const st of serialTables) {
        try {
          const maxRes = await pgClient.query(`SELECT MAX(id) as max_id FROM ${st}`);
          const maxId = maxRes.rows[0]?.max_id ? Number(maxRes.rows[0].max_id) : 1;
          await pgClient.query(`SELECT setval(pg_get_serial_sequence('${st}', 'id'), ${maxId})`);
        } catch (seqErr) {
          // Ignorar si la tabla no tiene secuencia serial
        }
      }
      console.log('✅ Secuencias numéricas sincronizadas.');
    }
  } catch (err) {
    console.error('❌ Error durante la migración a PostgreSQL:', err);
    throw err;
  } finally {
    pgClient.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateSqliteToPg()
    .then(() => {
      console.log('🎉 MIGRACIÓN COMPLETA FINALIZADA EN POSTGRESQL.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrateSqliteToPg;
