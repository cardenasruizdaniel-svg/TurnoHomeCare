const db = require("../config/database");
const bcrypt = require("bcryptjs");

const officialServices = [
  {
    code: "CG",
    name: "Consulta General",
    description: "Atención médica general y valoración integral de salud.",
    letter_prefix: "C",
    priority_prefix: "P",
    estimated_minutes: 20,
    order_index: 1
  },
  {
    code: "CME",
    name: "Cita Médica Especializada",
    description: "Atención y valoración por médico especialista.",
    letter_prefix: "E",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 2
  },
  {
    code: "PSI",
    name: "Psicología",
    description: "Atención psicológica y soporte emocional individualizado.",
    letter_prefix: "S",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 3
  },
  {
    code: "OM",
    name: "Órdenes Médicas y Facturación",
    description: "Emisión y validación de órdenes médicas, autorizaciones y facturación.",
    letter_prefix: "F",
    priority_prefix: "P",
    estimated_minutes: 15,
    order_index: 4
  },
  {
    code: "NUT",
    name: "Nutrición y Dietética",
    description: "Planes de alimentación saludable y control nutricional.",
    letter_prefix: "N",
    priority_prefix: "P",
    estimated_minutes: 25,
    order_index: 5
  },
  {
    code: "FIS",
    name: "Fisioterapia",
    description: "Rehabilitación física, movilidad y recuperación motora.",
    letter_prefix: "T",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 6
  },
  {
    code: "TO",
    name: "Terapia Ocupacional",
    description: "Rehabilitación para actividades de la vida diaria y desarrollo funcional.",
    letter_prefix: "O",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 7
  },
  {
    code: "TR",
    name: "Terapia Respiratoria",
    description: "Cuidado y rehabilitación especializada del sistema respiratorio.",
    letter_prefix: "R",
    priority_prefix: "P",
    estimated_minutes: 25,
    order_index: 8
  },
  {
    code: "MG",
    name: "Medicina General",
    description: "Control médico y consulta presencial o domiciliaria.",
    letter_prefix: "M",
    priority_prefix: "P",
    estimated_minutes: 20,
    order_index: 9
  },
  {
    code: "PED",
    name: "Pediatría",
    description: "Atención médica especializada para bebés, niños y adolescentes.",
    letter_prefix: "D",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 10
  }
];

const officialBranches = [
  {
    id: 1,
    code: 'SEDE-ARMENIA',
    name: 'Sede Principal (Armenia)',
    address: 'Carrera 13 #3N 50, medicentro Alcazar cons 706',
    phone: '+57 323 479 0311',
    business_hours: 'Lunes a Viernes: 7:00 AM - 6:00 PM | Sábados: 8:00 AM - 1:00 PM',
    qr_code_slug: 'sede-armenia'
  },
  {
    id: 2,
    code: 'SEDE-CIRCASIA',
    name: 'Sede Circasia',
    address: 'Calle 6 No 15-19',
    phone: '+57 323 479 0311',
    business_hours: 'Lunes a Viernes: 7:00 AM - 5:00 PM',
    qr_code_slug: 'sede-circasia'
  }
];

const officialCounters = [
  { code: "ENT-1", name: "Entrevista 1" },
  { code: "ENT-2", name: "Entrevista 2" },
  { code: "CONS-1", name: "Consultorio 1" },
  { code: "MOD-1", name: "Ventanilla 1" },
  { code: "MOD-2", name: "Ventanilla 2" }
];

async function syncServicesAndCounters() {
  try {
    await db.init();

    // 0. Sincronizar Sedes Oficiales HomeCare (Únicamente si no existen)
    for (const b of officialBranches) {
      const existing = await db.prepare("SELECT id FROM branches WHERE id = ? OR code = ?").get(b.id, b.code);
      if (!existing) {
        await db.prepare(`
          INSERT INTO branches (id, company_id, code, name, address, phone, business_hours, qr_code_slug, is_active)
          VALUES (?, 1, ?, ?, ?, ?, ?, ?, 1)
        `).run(b.id, b.code, b.name, b.address, b.phone, b.business_hours, b.qr_code_slug);
      }
    }

    try {
      await db.prepare(`DELETE FROM tickets WHERE service_id IN (SELECT id FROM services WHERE code NOT IN (${placeholders}, 'CM', 'HPED'))`).run(...officialCodes);
      await db.prepare(`DELETE FROM counter_services WHERE service_id IN (SELECT id FROM services WHERE code NOT IN (${placeholders}, 'CM', 'HPED'))`).run(...officialCodes);
      await db.prepare(`DELETE FROM services WHERE code NOT IN (${placeholders}, 'CM', 'HPED')`).run(...officialCodes);
    } catch (e) {
      // Ignorar si hay llaves foráneas o registros históricos
    }

    // 2. Insertar o actualizar los 10 servicios oficiales requeridos
    for (const s of officialServices) {
      const existing = await db.prepare("SELECT id FROM services WHERE code = ? OR (code = 'CM' AND ? = 'CME') OR (code = 'HPED' AND ? = 'PED')").get(s.code, s.code, s.code);
      if (existing) {
        await db.prepare("UPDATE services SET code = ?, name = ?, description = ?, letter_prefix = ?, priority_prefix = ?, estimated_minutes = ?, is_active = 1, order_index = ? WHERE id = ?")
          .run(s.code, s.name, s.description, s.letter_prefix, s.priority_prefix, s.estimated_minutes, s.order_index, existing.id);
      } else {
        await db.prepare("INSERT INTO services (company_id, code, name, description, letter_prefix, priority_prefix, estimated_minutes, is_active, order_index) VALUES (1, ?, ?, ?, ?, ?, ?, 1, ?)")
          .run(s.code, s.name, s.description, s.letter_prefix, s.priority_prefix, s.estimated_minutes, s.order_index);
      }
    }

    // 3. BORRAR todos los módulos que no estén en la lista oficial de los 5 requeridos
    const counterCodes = officialCounters.map(c => c.code);
    const cPlaceholders = counterCodes.map(() => '?').join(',');
    await db.prepare(`DELETE FROM counter_services WHERE counter_id IN (SELECT id FROM counters WHERE code NOT IN (${cPlaceholders}))`).run(...counterCodes);
    await db.prepare(`DELETE FROM counters WHERE code NOT IN (${cPlaceholders})`).run(...counterCodes);

    // 4. Insertar o actualizar los 5 consultorios/módulos oficiales requeridos
    for (const c of officialCounters) {
      const existing = await db.prepare("SELECT id FROM counters WHERE code = ?").get(c.code);
      if (!existing) {
        await db.prepare("INSERT INTO counters (branch_id, code, name, is_active) VALUES (1, ?, ?, 1)")
          .run(c.code, c.name);
      } else {
        await db.prepare("UPDATE counters SET name = ?, is_active = 1 WHERE id = ?").run(c.name, existing.id);
      }
    }

    const allServices = await db.prepare("SELECT id, code FROM services WHERE is_active = 1").all();
    const allCounters = await db.prepare("SELECT id, code FROM counters WHERE is_active = 1").all();

    const counterMap = {};
    (allCounters || []).forEach(c => { counterMap[c.code] = c.id; });

    const serviceMap = {};
    (allServices || []).forEach(s => { serviceMap[s.code] = s.id; });

    // Ventanilla 1 y 2 atienden los 10 servicios
    if (counterMap["MOD-1"]) {
      for (const s of (allServices || [])) {
        await db.prepare("INSERT INTO counter_services (counter_id, service_id) VALUES (?, ?) ON CONFLICT DO NOTHING").run(counterMap["MOD-1"], s.id);
      }
    }
    if (counterMap["MOD-2"]) {
      for (const s of (allServices || [])) {
        await db.prepare("INSERT INTO counter_services (counter_id, service_id) VALUES (?, ?) ON CONFLICT DO NOTHING").run(counterMap["MOD-2"], s.id);
      }
    }

    // Entrevista 1 y 2 atienden Psicología y Nutrición
    for (const entCode of ["ENT-1", "ENT-2"]) {
      if (counterMap[entCode]) {
        for (const code of ["PSI", "NUT"]) {
          if (serviceMap[code]) {
            await db.prepare("INSERT INTO counter_services (counter_id, service_id) VALUES (?, ?) ON CONFLICT DO NOTHING").run(counterMap[entCode], serviceMap[code]);
          }
        }
      }
    }

    // Consultorio 1 atiende Consulta General, Cita Especializada, Medicina General, Pediatría, Terapias
    if (counterMap["CONS-1"]) {
      for (const code of ["CG", "CME", "MG", "PED", "FIS", "TO", "TR"]) {
        if (serviceMap[code]) {
          await db.prepare("INSERT INTO counter_services (counter_id, service_id) VALUES (?, ?) ON CONFLICT DO NOTHING").run(counterMap["CONS-1"], serviceMap[code]);
        }
      }
    }

    // 5. Sincronización Automática de Usuarios Oficiales (Admin Ing. Daniel Cárdenas Ruiz + 1 usuario por módulo)
    const passwordHash = bcrypt.hashSync('Home2026*', 10);

    const existingAdmin = await db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
    if (existingAdmin) {
      await db.prepare("UPDATE users SET full_name = 'Ing. Daniel Cárdenas Ruiz', role_id = 1, password_hash = ?, is_active = 1 WHERE id = ?")
        .run(passwordHash, existingAdmin.id);
    } else {
      await db.prepare("INSERT INTO users (id, branch_id, role_id, username, email, password_hash, full_name, is_active) VALUES (1, 1, 1, 'admin', 'admin@homecare.com', ?, 'Ing. Daniel Cárdenas Ruiz', 1)")
        .run(passwordHash);
    }

    const moduleUserDefs = [
      { id: 2, username: 'Consultorio1', name: 'Consultorio 1' },
      { id: 3, username: 'Ventanilla1',  name: 'Ventanilla 1' },
      { id: 4, username: 'Ventanilla2',  name: 'Ventanilla 2' },
      { id: 5, username: 'Entrevista1',  name: 'Entrevista 1' },
      { id: 6, username: 'Entrevista2',  name: 'Entrevista 2' }
    ];

    for (const m of moduleUserDefs) {
      const existing = await db.prepare("SELECT id FROM users WHERE username = ?").get(m.username);
      if (existing) {
        await db.prepare("UPDATE users SET full_name = ?, role_id = 3, password_hash = ?, is_active = 1 WHERE id = ?")
          .run(m.name, passwordHash, existing.id);
      } else {
        await db.prepare("INSERT INTO users (id, branch_id, role_id, username, email, password_hash, full_name, is_active) VALUES (?, 1, 3, ?, ?, ?, ?, 1)")
          .run(m.id, m.username, `${m.username.toLowerCase()}@homecare.com`, passwordHash, m.name);
      }
    }

    if (db.persistToDisk) db.persistToDisk();
    console.log("✅ Sincronización completa: Servicios, Módulos y Usuarios Oficiales (Admin Ing. Daniel Cárdenas Ruiz + 5 Módulos).");
  } catch (err) {
    console.error("Error sincronizando servicios y modulos:", err);
  }
}

module.exports = syncServicesAndCounters;
