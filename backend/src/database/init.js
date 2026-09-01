const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function initDatabase() {
  await db.init();
  // console.log(' Inicializando base de datos DEATurnos...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  db.exec(schema);

  // Migraciones incrementales seguras
  try {
    db.exec("ALTER TABLE tickets ADD COLUMN appointment_time TEXT;");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE tickets ADD COLUMN scheduled_date TEXT;");
  } catch (e) {}

  try {
    const sample = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tickets'").get();
    if (sample && sample.sql && !sample.sql.includes('PROGRAMADO')) {
      db.exec("PRAGMA foreign_keys = OFF;");
      db.exec(`
        CREATE TABLE tickets_migration (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_number TEXT NOT NULL,
            branch_id INTEGER NOT NULL,
            service_id INTEGER NOT NULL,
            patient_id INTEGER NOT NULL,
            counter_id INTEGER,
            user_id INTEGER,
            ticket_type TEXT NOT NULL DEFAULT 'NORMAL' CHECK(ticket_type IN ('NORMAL', 'PRIORITARIO', 'ESPECIAL')),
            status TEXT NOT NULL DEFAULT 'ESPERANDO' CHECK(status IN ('PROGRAMADO', 'CONFIRMADO', 'ESPERANDO', 'LLAMADO', 'EN_ATENCION', 'FINALIZADO', 'NO_PRESENTO', 'CANCELADO', 'PAUSADO')),
            sequence_number INTEGER NOT NULL,
            created_date TEXT NOT NULL,
            scheduled_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            called_at DATETIME,
            attended_at DATETIME,
            completed_at DATETIME,
            wait_time_seconds INTEGER DEFAULT 0,
            attention_time_seconds INTEGER DEFAULT 0,
            call_count INTEGER DEFAULT 0,
            appointment_time TEXT,
            notes TEXT,
            FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
            FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        INSERT INTO tickets_migration SELECT 
          id, ticket_number, branch_id, service_id, patient_id, counter_id, user_id,
          ticket_type, status, sequence_number, created_date, 
          COALESCE(scheduled_date, created_date) as scheduled_date,
          created_at, called_at, attended_at, completed_at, wait_time_seconds, attention_time_seconds,
          call_count, appointment_time, notes
        FROM tickets;

        DROP TABLE tickets;
        ALTER TABLE tickets_migration RENAME TO tickets;
        CREATE INDEX IF NOT EXISTS idx_tickets_branch_status ON tickets(branch_id, status);
        CREATE INDEX IF NOT EXISTS idx_tickets_created_date ON tickets(created_date);
        CREATE INDEX IF NOT EXISTS idx_tickets_scheduled_date ON tickets(scheduled_date);
        CREATE INDEX IF NOT EXISTS idx_tickets_patient ON tickets(patient_id);
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (e) {
    console.error('Error migrando tabla tickets:', e);
  }

  // console.log(' Esquema de base de datos cargado exitosamente.');
}

if (require.main === module) {
  initDatabase().then(() => console.log('Base de datos inicializada.'));
}

module.exports = initDatabase;
