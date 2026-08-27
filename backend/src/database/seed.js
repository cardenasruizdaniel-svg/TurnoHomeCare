const bcrypt = require('bcryptjs');
const db = require('../config/database');
const initDatabase = require('./init');

async function seedDatabase() {
  await initDatabase();
  console.log(' Sembrando datos iniciales en DEATurnos...');

  const transaction = db.transaction(() => {
    // 1. Roles
    const insertRole = db.prepare('INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)');
    insertRole.run(1, 'ADMIN', 'Administrador total del sistema');
    insertRole.run(2, 'SUPERVISOR', 'Supervisor de sede y analista de colas');
    insertRole.run(3, 'FUNCIONARIO', 'Operador de ventanilla / consultorio');

    // 2. Empresa
    const checkCompany = db.prepare('SELECT id FROM companies WHERE id = 1').get();
    if (!checkCompany) {
      db.prepare(`
        INSERT INTO companies (id, name, nit, logo_url, slogan, primary_color, secondary_color, accent_color)
        VALUES (1, 'HomeCare del Quindío I.P.S.', '901.458.789-2', '/homecare-logo.png', 'Bienestar en casa.', '#e1136c', '#00b0b9', '#7cb518')
      `).run();
    }

    // 3. Sedes
    const insertBranch = db.prepare(`
      INSERT OR IGNORE INTO branches (id, company_id, code, name, address, phone, business_hours, qr_code_slug)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertBranch.run(
      1, 1, 'SEDE-PRINCIPAL', 'Sede Central - Hospitalaria',
      'Av. Principal # 45-67, Edificio Médico', '(601) 745-9000',
      'Lunes a Viernes: 6:00 AM - 7:00 PM | Sábados: 7:00 AM - 2:00 PM',
      'sede-central'
    );
    insertBranch.run(
      2, 1, 'SEDE-NORTE', 'Sede Norte - Centro Especialistas',
      'Calle 127 # 15-30', '(601) 745-9001',
      'Lunes a Viernes: 7:00 AM - 5:00 PM',
      'sede-norte'
    );

    // 4. Servicios (CG, CM, CE, OM)
    const insertService = db.prepare(`
      INSERT OR IGNORE INTO services (id, company_id, code, name, description, letter_prefix, priority_prefix, estimated_minutes, is_active, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertService.run(1, 1, 'CG', 'Consulta General', 'Atención médica general y triage', 'A', 'P', 15, 1, 1);
    insertService.run(2, 1, 'CM', 'Cita Médica Especializada', 'Valoración con médicos especialistas', 'C', 'P', 20, 1, 2);
    insertService.run(3, 1, 'CE', 'Cita Especialista', 'Consultas de alta especialidad', 'E', 'P', 25, 1, 3);
    insertService.run(4, 1, 'OM', 'Órdenes Médicas y Facturación', 'Radicación, autorizaciones y pagos', 'O', 'P', 10, 1, 4);

    // 5. Módulos / Consultorios
    const insertCounter = db.prepare(`
      INSERT OR IGNORE INTO counters (id, branch_id, code, name, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertCounter.run(1, 1, 'CONS-1', 'Consultorio 1 (Medicina General)', 1);
    insertCounter.run(2, 1, 'CONS-2', 'Consultorio 2 (Medicina General)', 1);
    insertCounter.run(3, 1, 'CONS-3', 'Consultorio 3 (Especialistas)', 1);
    insertCounter.run(4, 1, 'MOD-1', 'Ventanilla 1 (Órdenes / Facturación)', 1);
    insertCounter.run(5, 1, 'MOD-2', 'Ventanilla 2 (Atención al Usuario)', 1);

    // Asignación de servicios a módulos
    const insertCounterService = db.prepare(`
      INSERT OR IGNORE INTO counter_services (counter_id, service_id) VALUES (?, ?)
    `);
    insertCounterService.run(1, 1);
    insertCounterService.run(1, 2);
    insertCounterService.run(2, 1);
    insertCounterService.run(2, 2);
    insertCounterService.run(3, 2);
    insertCounterService.run(3, 3);
    insertCounterService.run(4, 4);
    insertCounterService.run(5, 4);
    insertCounterService.run(5, 1);

    // 6. Usuarios
    const salt = bcrypt.genSaltSync(10);
    const hashAdmin = bcrypt.hashSync('admin123', salt);
    const hashSuper = bcrypt.hashSync('super123', salt);
    const hashFunc = bcrypt.hashSync('func123', salt);

    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, branch_id, role_id, username, email, password_hash, full_name, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertUser.run(1, 1, 1, 'admin', 'admin@ipsintegral.com', hashAdmin, 'Dr. Armando Casas (Director General)', 1);
    insertUser.run(2, 1, 2, 'supervisor', 'supervisor@ipsintegral.com', hashSuper, 'Dra. Carolina Méndez (Supervisora Médica)', 1);
    insertUser.run(3, 1, 3, 'funcionario1', 'operador1@ipsintegral.com', hashFunc, 'Enf. Marcela Valencia (Ventanilla 1)', 1);
    insertUser.run(4, 1, 3, 'funcionario2', 'medico1@ipsintegral.com', hashFunc, 'Dr. Roberto Gómez (Consultorio 1)', 1);

    // 7. Pacientes de prueba
    const insertPatient = db.prepare(`
      INSERT OR IGNORE INTO patients (id, document_number, full_name, age, phone, is_priority_auto)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPatient.run(1, '10203040', 'Carlos Pérez', 45, '3104567890', 0);
    insertPatient.run(2, '20304050', 'María Gómez', 62, '3157891234', 1);
    insertPatient.run(3, '30405060', 'Pedro Rodríguez', 71, '3201122334', 1);
    insertPatient.run(4, '40506070', 'Ana Martínez', 34, '3009876543', 0);
    insertPatient.run(5, '50607080', 'Guillermo Restrepo', 80, '3112233445', 1);
    insertPatient.run(6, '60708090', 'Sofía Ramírez', 59, '3145566778', 0);

    // 8. Configuraciones dinámicas del sistema
    const insertSetting = db.prepare(`
      INSERT OR REPLACE INTO settings (branch_id, key, value, description, data_type)
      VALUES (?, ?, ?, ?, ?)
    `);

    const defaultSettings = [
      [null, 'EDAD_PRIORIDAD', '60', 'Edad mínima para clasificar automáticamente como atención prioritaria', 'number'],
      [null, 'RATIO_PRIORIDAD', '2', 'Proporción de atención: cantidad de turnos normales por cada turno prioritario', 'number'],
      [null, 'PREFIJO_NORMAL', 'A', 'Letra por defecto para turnos estándar', 'string'],
      [null, 'PREFIJO_PRIORITARIO', 'P', 'Letra por defecto para turnos prioritarios', 'string'],
      [null, 'DIGITOS_NUMERACION', '3', 'Cantidad de dígitos en número de turno (ej: 001)', 'number'],
      [null, 'SONIDO_CAMPANA', 'true', 'Activar ding-dong / campana al llamar turno', 'boolean'],
      [null, 'VOZ_SINTETIZADA', 'true', 'Activar locución de voz por altavoz', 'boolean'],
      [null, 'VOLUMEN_AUDIO', '1.0', 'Volumen de locución y campana (0.1 a 1.0)', 'number'],
      [null, 'REPETICIONES_LLAMADO', '2', 'Veces que se repite la locución en pantalla', 'number'],
      [null, 'PLANTILLA_VOZ', 'Turno {ticket}, por favor pasar a {counter}', 'Texto que la voz sintetizada pronunciará', 'string'],
      [null, 'PREVENIR_DUPLICADOS', 'true', 'Impedir solicitar un segundo turno si ya tiene uno en espera', 'boolean'],
      [null, 'REINICIO_DIARIO', 'true', 'Reiniciar consecutivo de turnos cada medianoche', 'boolean'],
      [null, 'HISTORIAL_PANTALLA_CANTIDAD', '6', 'Número de turnos anteriores a mostrar en la pantalla pública', 'number'],
      [null, 'NOMBRE_INSTITUCION', 'IPS Salud Integral & Vida', 'Nombre visible en pantallas y tickets', 'string'],
      [null, 'MENSAJE_PANTALLA', 'Por favor permanezca atento a la pantalla y cuide sus pertenencias.', 'Mensaje inferior en pantalla pública', 'string'],
      [null, 'HORA_APERTURA', '06:00', 'Hora inicial permitida para solicitar turnos', 'string'],
      [null, 'HORA_CIERRE', '19:00', 'Hora límite permitida para solicitar turnos', 'string']
    ];

    for (const s of defaultSettings) {
      insertSetting.run(s[0], s[1], s[2], s[3], s[4]);
    }

    // 9. Registro de auditoría inicial
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address, details)
      VALUES (1, 'SEED_DATABASE', 'SYSTEM', '1', '127.0.0.1', 'Sembrado inicial de estructura y datos demo completado')
    `).run();
  });

  transaction();
  console.log(' Base de datos sembrada con éxito.');
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = seedDatabase;
