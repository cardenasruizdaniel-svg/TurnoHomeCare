const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

let SQL = null;
let rawDb = null;
let saveScheduled = false;

function getSQL() {
  if (!SQL) {
    throw new Error('SQL.js no ha sido inicializado. Llama a initDbSync primero.');
  }
  return SQL;
}

function persistToDisk() {
  if (rawDb && dbPath) {
    try {
      const data = rawDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(path.resolve(dbPath), buffer);
    } catch (e) {
      console.error('Error guardando base de datos a disco:', e);
    }
  }
}

function scheduleSave() {
  if (!saveScheduled) {
    saveScheduled = true;
    setTimeout(() => {
      saveScheduled = false;
      persistToDisk();
    }, 50);
  }
}

// Inicialización sincrónica
let initialized = false;

async function initDb() {
  if (initialized) return;
  SQL = await initSqlJs();
  const fullPath = path.resolve(dbPath);
  if (fs.existsSync(fullPath)) {
    const filebuffer = fs.readFileSync(fullPath);
    rawDb = new SQL.Database(filebuffer);
  } else {
    rawDb = new SQL.Database();
    persistToDisk();
  }
  initialized = true;
}

// Wrapper tipo better-sqlite3
const dbWrapper = {
  async init() {
    await initDb();
  },
  
  exec(sql) {
    if (!rawDb) throw new Error('DB not initialized');
    rawDb.exec(sql);
    persistToDisk();
  },

  pragma(pragmaSql) {
    if (!rawDb) return;
    try {
      rawDb.exec(`PRAGMA ${pragmaSql};`);
    } catch (e) {
      // Pragmas ignorables
    }
  },

  prepare(sql) {
    return {
      get(...params) {
        if (!rawDb) throw new Error('DB not initialized');
        // Aplanar si params es array o lista
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = rawDb.prepare(sql);
        try {
          if (flatParams.length > 0) {
            stmt.bind(flatParams);
          }
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      all(...params) {
        if (!rawDb) throw new Error('DB not initialized');
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = rawDb.prepare(sql);
        const results = [];
        try {
          if (flatParams.length > 0) {
            stmt.bind(flatParams);
          }
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          return results;
        } finally {
          stmt.free();
        }
      },

      run(...params) {
        if (!rawDb) throw new Error('DB not initialized');
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = rawDb.prepare(sql);
        try {
          if (flatParams.length > 0) {
            stmt.bind(flatParams);
          }
          stmt.step();
          
          // Obtener lastInsertRowid y changes
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
    };
  },

  transaction(fn) {
    return (...args) => {
      if (!rawDb) throw new Error('DB not initialized');
      rawDb.exec('BEGIN TRANSACTION;');
      try {
        const res = fn(...args);
        rawDb.exec('COMMIT;');
        persistToDisk();
        return res;
      } catch (err) {
        rawDb.exec('ROLLBACK;');
        throw err;
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
