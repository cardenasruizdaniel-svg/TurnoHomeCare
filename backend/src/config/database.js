const { Pool } = require('pg');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const usePostgres = Boolean(process.env.DATABASE_URL);

let pgPool = null;
let SQL = null;
let rawDb = null;
let saveScheduled = false;

function resolveDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  if (fs.existsSync('/var/data')) return '/var/data/deaturnos.db';
  if (fs.existsSync('/data')) return '/data/deaturnos.db';
  return path.join(__dirname, '../../data/deaturnos.db');
}

const dbPath = resolveDbPath();
const dbDir = path.dirname(path.resolve(dbPath));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

function persistToDisk() {
  if (!usePostgres && rawDb && dbPath) {
    try {
      const data = rawDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(path.resolve(dbPath), buffer);
    } catch (e) {
      console.error('Error guardando base de datos SQLite a disco:', e);
    }
  }
}

function scheduleSave() {
  if (!usePostgres && !saveScheduled) {
    saveScheduled = true;
    setTimeout(() => {
      saveScheduled = false;
      persistToDisk();
    }, 50);
  }
}

// Convertir marcadores '?' a '$1, $2, $3...' para PostgreSQL
function convertPlaceholders(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

// Reemplazar funciones de fecha específicas de SQLite por PostgreSQL si aplica
function normalizeSqlForPostgres(sql) {
  let pgSql = convertPlaceholders(sql);
  
  pgSql = pgSql.replace(/date\(([^,\)]+),\s*'localtime'\)/gi, 'DATE($1)');
  pgSql = pgSql.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
  
  if (/INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)/i.test(pgSql)) {
    pgSql = pgSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO');
    if (!pgSql.includes('ON CONFLICT')) {
      pgSql += ' ON CONFLICT DO NOTHING';
    }
  }

  if (/INSERT\s+OR\s+REPLACE\s+INTO\s+(\w+)/i.test(pgSql)) {
    pgSql = pgSql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/i, 'INSERT INTO');
  }

  return pgSql;
}

function parsePostgresUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return {
      user: decodeURIComponent(parsed.username || 'postgres'),
      password: decodeURIComponent(parsed.password || ''),
      host: parsed.hostname || 'localhost',
      port: parsed.port ? Number(parsed.port) : 5432,
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'deaturnos'
    };
  } catch (e) {
    return {
      user: 'postgres',
      password: '',
      host: 'localhost',
      port: 5432,
      database: 'deaturnos'
    };
  }
}

let initialized = false;

async function initDb() {
  if (initialized) return;

  if (usePostgres) {
    const pgUrl = process.env.DATABASE_URL || '';
    const isProduction = process.env.NODE_ENV === 'production' || pgUrl.includes('render.com') || pgUrl.includes('ssl=true');
    const parsed = parsePostgresUrl(pgUrl);

    const poolConfig = {
      user: parsed.user,
      password: parsed.password,
      host: parsed.host,
      port: parsed.port,
      database: parsed.database,
      ssl: isProduction ? { rejectUnauthorized: false } : (pgUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };

    pgPool = new Pool(poolConfig);

    pgPool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]:', err.message);
    });

    try {
      const client = await pgPool.connect();
      client.release();
      console.log('🐘 Conectado exitosamente a PostgreSQL.');
    } catch (connErr) {
      console.error('\n⚠️  [POSTGRESQL]: No se pudo conectar a la base de datos PostgreSQL local.');
      console.error(` Error: ${connErr.message}`);
      console.error(' 💡 Si su PostgreSQL exige clave personalizada, ejecute "configurar_clave_postgres.bat"');
      console.error(' 🚀 Activando modo de contingencia SQLite para garantizar el funcionamiento inmediato del sistema sin caídas.\n');
      
      usePostgres = false;
      pgPool = null;

      SQL = await initSqlJs();
      const fullPath = path.resolve(dbPath);
      if (fs.existsSync(fullPath)) {
        const filebuffer = fs.readFileSync(fullPath);
        rawDb = new SQL.Database(filebuffer);
      } else {
        rawDb = new SQL.Database();
        persistToDisk();
      }
      console.log('📂 Sistema iniciado exitosamente en modo contingencia SQLite local.');
    }
  } else {
    SQL = await initSqlJs();
    const fullPath = path.resolve(dbPath);
    if (fs.existsSync(fullPath)) {
      const filebuffer = fs.readFileSync(fullPath);
      rawDb = new SQL.Database(filebuffer);
    } else {
      rawDb = new SQL.Database();
      persistToDisk();
    }
    console.log('📂 Usando base de datos SQLite local.');
  }

  initialized = true;
}

const dbWrapper = {
  isPostgres() {
    return usePostgres;
  },

  getPool() {
    return pgPool;
  },

  async init() {
    await initDb();
  },

  exec(sql) {
    if (usePostgres) {
      if (!pgPool) throw new Error('PostgreSQL Pool no inicializado');
      const pgSql = normalizeSqlForPostgres(sql);
      return pgPool.query(pgSql);
    } else {
      if (!rawDb) throw new Error('DB SQLite no inicializada');
      rawDb.exec(sql);
      persistToDisk();
    }
  },

  pragma(pragmaSql) {
    if (!usePostgres && rawDb) {
      try {
        rawDb.exec(`PRAGMA ${pragmaSql};`);
      } catch (e) {
        // Ignorar
      }
    }
  },

  prepare(sql) {
    return {
      get(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;

        if (usePostgres) {
          if (!pgPool) throw new Error('PostgreSQL Pool no inicializado');
          const pgSql = normalizeSqlForPostgres(sql);
          return pgPool.query(pgSql, flatParams).then(res => res.rows[0]);
        } else {
          if (!rawDb) throw new Error('DB SQLite no inicializada');
          const stmt = rawDb.prepare(sql);
          try {
            if (flatParams.length > 0) stmt.bind(flatParams);
            if (stmt.step()) return stmt.getAsObject();
            return undefined;
          } finally {
            stmt.free();
          }
        }
      },

      all(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;

        if (usePostgres) {
          if (!pgPool) throw new Error('PostgreSQL Pool no inicializado');
          const pgSql = normalizeSqlForPostgres(sql);
          return pgPool.query(pgSql, flatParams).then(res => res.rows);
        } else {
          if (!rawDb) throw new Error('DB SQLite no inicializada');
          const stmt = rawDb.prepare(sql);
          const results = [];
          try {
            if (flatParams.length > 0) stmt.bind(flatParams);
            while (stmt.step()) {
              results.push(stmt.getAsObject());
            }
            return results;
          } finally {
            stmt.free();
          }
        }
      },

      run(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;

        if (usePostgres) {
          if (!pgPool) throw new Error('PostgreSQL Pool no inicializado');
          let pgSql = normalizeSqlForPostgres(sql);

          if (/^\s*INSERT\s+INTO/i.test(pgSql) && !/RETURNING/i.test(pgSql) && !/counter_services/i.test(pgSql)) {
            pgSql += ' RETURNING id';
          }

          return pgPool.query(pgSql, flatParams).then(res => {
            const lastInsertRowid = res.rows && res.rows[0] && res.rows[0].id ? Number(res.rows[0].id) : 0;
            return {
              lastInsertRowid,
              changes: res.rowCount || 0
            };
          });
        } else {
          if (!rawDb) throw new Error('DB SQLite no inicializada');
          const stmt = rawDb.prepare(sql);
          try {
            if (flatParams.length > 0) stmt.bind(flatParams);
            stmt.step();
            const rowIdRes = rawDb.exec("SELECT last_insert_rowid() as id, changes() as changes;");
            let lastInsertRowid = 0;
            let changes = 0;
            if (rowIdRes && rowIdRes[0] && rowIdRes[0].values && rowIdRes[0].values[0]) {
              lastInsertRowid = rowIdRes[0].values[0][0];
              changes = rowIdRes[0].values[0][1];
            }
            scheduleSave();
            return { lastInsertRowid, changes };
          } finally {
            stmt.free();
          }
        }
      }
    };
  },

  transaction(fn) {
    return async (...args) => {
      if (usePostgres) {
        const client = await pgPool.connect();
        try {
          await client.query('BEGIN');
          const res = await fn(...args);
          await client.query('COMMIT');
          return res;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } else {
        if (!rawDb) throw new Error('DB SQLite no inicializada');
        rawDb.exec('BEGIN TRANSACTION;');
        try {
          const res = await fn(...args);
          rawDb.exec('COMMIT;');
          persistToDisk();
          return res;
        } catch (err) {
          rawDb.exec('ROLLBACK;');
          throw err;
        }
      }
    };
  },

  persistToDisk() {
    persistToDisk();
  },

  getDbPath() {
    return dbPath;
  }
};

module.exports = dbWrapper;
