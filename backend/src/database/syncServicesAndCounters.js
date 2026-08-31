const db = require("../config/database");

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
    code: "NUT",
    name: "Nutrición y Dietética",
    description: "Planes de alimentación saludable y control nutricional.",
    letter_prefix: "N",
    priority_prefix: "P",
    estimated_minutes: 25,
    order_index: 4
  },
  {
    code: "FIS",
    name: "Fisioterapia",
    description: "Rehabilitación física, movilidad y recuperación motora.",
    letter_prefix: "F",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 5
  },
  {
    code: "TO",
    name: "Terapia Ocupacional",
    description: "Rehabilitación para actividades de la vida diaria y desarrollo funcional.",
    letter_prefix: "O",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 6
  },
  {
    code: "TR",
    name: "Terapia Respiratoria",
    description: "Cuidado y rehabilitación especializada del sistema respiratorio.",
    letter_prefix: "R",
    priority_prefix: "P",
    estimated_minutes: 25,
    order_index: 7
  },
  {
    code: "MG",
    name: "Medicina General",
    description: "Control médico y consulta presencial o domiciliaria.",
    letter_prefix: "M",
    priority_prefix: "P",
    estimated_minutes: 20,
    order_index: 8
  },
  {
    code: "PED",
    name: "Pediatría",
    description: "Atención médica especializada para bebés, niños y adolescentes.",
    letter_prefix: "D",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 9
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
  { code: "CONS-1", name: "Consultorio 1" },
  { code: "TERAPIA", name: "Salón de Terapias" },
  { code: "ENT-1", name: "Entrevista 1" },
  { code: "ENT-2", name: "Entrevista 2" },
  { code: "MOD-1", name: "Ventanilla 1 (Atención al Paciente)" },
  { code: "MOD-2", name: "Ventanilla 2 (Atención al Paciente)" }
];

async function syncServicesAndCounters() {
  try {
    // 0. Sincronizar Sedes Oficiales HomeCare (Únicamente si no existen)
    for (const b of officialBranches) {
      const existing = db.prepare("SELECT id FROM branches WHERE id = ? OR code = ?").get(b.id, b.code);
      if (!existing) {
        db.prepare(`
          INSERT INTO branches (id, company_id, code, name, address, phone, business_hours, qr_code_slug, is_active)
          VALUES (?, 1, ?, ?, ?, ?, ?, ?, 1)
        `).run(b.id, b.code, b.name, b.address, b.phone, b.business_hours, b.qr_code_slug);
      }
    }

    // 1. Desactivar todos los servicios que no estén en la lista oficial de los 9 solicitados
    const officialCodes = officialServices.map(s => s.code);
    const placeholders = officialCodes.map(() => '?').join(',');
    db.prepare(`UPDATE services SET is_active = 0 WHERE code NOT IN (${placeholders}, 'CM', 'HPED')`).run(...officialCodes);

    // 2. Insertar o actualizar los 9 servicios oficiales requeridos
    for (const s of officialServices) {
      const existing = db.prepare("SELECT id FROM services WHERE code = ? OR (code = 'CM' AND ? = 'CME') OR (code = 'HPED' AND ? = 'PED')").get(s.code, s.code, s.code);
      if (existing) {
        db.prepare("UPDATE services SET code = ?, name = ?, description = ?, letter_prefix = ?, priority_prefix = ?, estimated_minutes = ?, is_active = 1, order_index = ? WHERE id = ?")
          .run(s.code, s.name, s.description, s.letter_prefix, s.priority_prefix, s.estimated_minutes, s.order_index, existing.id);
      } else {
        db.prepare("INSERT INTO services (company_id, code, name, description, letter_prefix, priority_prefix, estimated_minutes, is_active, order_index) VALUES (1, ?, ?, ?, ?, ?, ?, 1, ?)")
          .run(s.code, s.name, s.description, s.letter_prefix, s.priority_prefix, s.estimated_minutes, s.order_index);
      }
    }

    // 3. Insertar consultorios/módulos oficiales únicamente si no existen
    for (const c of officialCounters) {
      const existing = db.prepare("SELECT id FROM counters WHERE code = ?").get(c.code);
      if (!existing) {
        db.prepare("INSERT INTO counters (branch_id, code, name, is_active) VALUES (1, ?, ?, 1)")
          .run(c.code, c.name);
      } else {
        db.prepare("UPDATE counters SET is_active = 1 WHERE id = ?").run(existing.id);
      }
    }

    const allServices = db.prepare("SELECT id, code FROM services WHERE is_active = 1").all();
    const allCounters = db.prepare("SELECT id, code FROM counters WHERE is_active = 1").all();

    const counterMap = {};
    allCounters.forEach(c => { counterMap[c.code] = c.id; });

    const serviceMap = {};
    allServices.forEach(s => { serviceMap[s.code] = s.id; });

    const insertCounterService = db.prepare("INSERT OR IGNORE INTO counter_services (counter_id, service_id) VALUES (?, ?)");

    if (counterMap["MOD-1"]) {
      allServices.forEach(s => insertCounterService.run(counterMap["MOD-1"], s.id));
    }
    if (counterMap["MOD-2"]) {
      allServices.forEach(s => insertCounterService.run(counterMap["MOD-2"], s.id));
    }

    if (counterMap["TERAPIA"]) {
      ["FIS", "TO", "TR"].forEach(code => {
        if (serviceMap[code]) insertCounterService.run(counterMap["TERAPIA"], serviceMap[code]);
      });
    }

    ["ENT-1", "ENT-2"].forEach(entCode => {
      if (counterMap[entCode]) {
        ["PSI", "NUT"].forEach(code => {
          if (serviceMap[code]) insertCounterService.run(counterMap[entCode], serviceMap[code]);
        });
      }
    });

    if (counterMap["CONS-1"]) {
      ["CG", "CME", "MG", "PED"].forEach(code => {
        if (serviceMap[code]) insertCounterService.run(counterMap["CONS-1"], serviceMap[code]);
      });
    }

    // 4. Banners Oficiales Iniciales (SOLO si no existen previamente en la base de datos)
    const bannerSetting = db.prepare("SELECT id FROM settings WHERE key = 'BANNERS_PUBLICIDAD' AND branch_id IS NULL").get();
    if (!bannerSetting) {
      const officialBanners = [
        {
          id: "b1",
          title: "Clínica de Heridas & Cuidadoras",
          subtitle: "Atención especializada en heridas y asistencia personalizada con calidez humana en casa.",
          tag: "Atención Domiciliaria",
          imageUrl: "/banners/banner_heridas_cuidadoras.png",
          isActive: true
        },
        {
          id: "b2",
          title: "Pedagogía Infantil & Toma de Muestras",
          subtitle: "Educación adaptada a tus hijos y laboratorio clínico en la comodidad de tu hogar.",
          tag: "Salud y Educación",
          imageUrl: "/banners/banner_pedagogia_muestras.png",
          isActive: true
        },
        {
          id: "b3",
          title: "Psicología, Nutrición y Dietética",
          subtitle: "Terapia emocional, manejo del estrés y planes alimenticios saludables para toda la familia.",
          tag: "Bienestar Integral",
          imageUrl: "/banners/banner_psicologia_nutricion.png",
          isActive: true
        },
        {
          id: "b4",
          title: "Fonoaudiología & Fisioterapia",
          subtitle: "Terapia del lenguaje, deglución y rehabilitación física integral en el hogar.",
          tag: "Rehabilitación en Casa",
          imageUrl: "/banners/banner_fono_fisioterapia.png",
          isActive: true
        },
        {
          id: "b5",
          title: "Terapia Ocupacional & Terapia Respiratoria",
          subtitle: "Desarrollo cognitivo y motor, junto a cuidado respiratorio especializado domiciliario.",
          tag: "Terapia Especializada",
          imageUrl: "/banners/banner_ocupacional_respiratoria.png",
          isActive: true
        }
      ];

      db.prepare("INSERT INTO settings (branch_id, key, value, description, data_type) VALUES (NULL, 'BANNERS_PUBLICIDAD', ?, 'Banners multimedia rotativos en pantalla de TV', 'json')")
        .run(JSON.stringify(officialBanners));
    }

    if (db.persistToDisk) db.persistToDisk();
    console.log("Verificación de datos iniciales completada (datos de usuario preservados).");
  } catch (err) {
    console.error("Error sincronizando servicios y modulos:", err);
  }
}

module.exports = syncServicesAndCounters;
