const db = require("../config/database");

const officialServices = [
  {
    code: "CH",
    name: "Clínica de Heridas",
    description: "Nuestro servicio domiciliario de clínica de heridas brinda atención especializada y humanizada en la comodidad de tu hogar.",
    letter_prefix: "H",
    priority_prefix: "P",
    estimated_minutes: 25,
    order_index: 1
  },
  {
    code: "CUID",
    name: "Cuidadoras",
    description: "Las cuidadoras a domicilio son profesionales dedicadas a brindar asistencia y cuidados personalizados a personas que necesitan atención especial en la comodidad de su hogar.",
    letter_prefix: "C",
    priority_prefix: "P",
    estimated_minutes: 20,
    order_index: 2
  },
  {
    code: "PI",
    name: "Licenciadas en Pedagogía Infantil",
    description: "La pedagogía infantil a domicilio es un enfoque educativo que se adapta a las necesidades individuales y al entorno familiar del niño.",
    letter_prefix: "P",
    priority_prefix: "P",
    estimated_minutes: 20,
    order_index: 3
  },
  {
    code: "TM",
    name: "Toma de muestras",
    description: "Este servicio es especialmente beneficioso para pacientes pediátricos, pacientes con dificultades de movilidad, personas mayores o aquellos que requieren monitoreo regular de su salud.",
    letter_prefix: "M",
    priority_prefix: "P",
    estimated_minutes: 15,
    order_index: 4
  },
  {
    code: "PSI",
    name: "Psicología",
    description: "A través de sesiones terapéuticas individualizadas, técnicas de intervención cognitivo-conductuales y estrategias de manejo del estrés.",
    letter_prefix: "S",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 5
  },
  {
    code: "NUT",
    name: "Nutrición y Dietética",
    description: "Atención integral y personalizada en la comodidad del hogar del paciente, centrándose en la promoción de hábitos alimenticios saludables y la gestión de condiciones relacionadas con la nutrición.",
    letter_prefix: "N",
    priority_prefix: "P",
    estimated_minutes: 25,
    order_index: 6
  },
  {
    code: "FON",
    name: "Fonoaudiología y/o Terapia del Lenguaje",
    description: "El servicio domiciliario de fonoaudiología proporciona una atención especializada y personalizada a los pacientes en la comodidad de su hogar, abordando una variedad de dificultades del habla, del lenguaje, auditivas y de deglución.",
    letter_prefix: "F",
    priority_prefix: "P",
    estimated_minutes: 25,
    order_index: 7
  },
  {
    code: "FIS",
    name: "Fisioterapia",
    description: "El servicio domiciliario de fisioterapia brinda atención integral a los pacientes en la comodidad de su hogar, facilitando la recuperación y la mejora de la función física.",
    letter_prefix: "T",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 8
  },
  {
    code: "TO",
    name: "Terapia Ocupacional",
    description: "Los terapeutas ocupacionales trabajan con individuos de todas las edades y condiciones para abordar desafíos físicos, cognitivos, emocionales y sociales.",
    letter_prefix: "O",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 9
  },
  {
    code: "TR",
    name: "Terapia Respiratoria",
    description: "El servicio domiciliario de terapia respiratoria ofrece atención especializada en la comodidad del hogar del paciente.",
    letter_prefix: "R",
    priority_prefix: "P",
    estimated_minutes: 25,
    order_index: 10
  },
  {
    code: "ENF",
    name: "Enfermería",
    description: "La enfermería a domicilio es un servicio vital que brinda atención médica y cuidados de enfermería en la comodidad del hogar del paciente.",
    letter_prefix: "E",
    priority_prefix: "P",
    estimated_minutes: 20,
    order_index: 11
  },
  {
    code: "MG",
    name: "Medicina General",
    description: "Está dirigida a pacientes que requieren control médico por Medicina General, que por condiciones propias de su estado de salud presentan algún impedimento o dificultad para el traslado a su servicio médico.",
    letter_prefix: "A",
    priority_prefix: "P",
    estimated_minutes: 20,
    order_index: 12
  },
  {
    code: "HAC",
    name: "Hospitalización Paciente Agudo y Crónico sin Ventilador",
    description: "Servicio de extensión hospitalaria y/o ambulatoria consistente en el manejo integral del paciente de baja complejidad.",
    letter_prefix: "U",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 13
  },
  {
    code: "HCV",
    name: "Hospitalización Paciente Crónico con Ventilador",
    description: "Este servicio busca mejorar la calidad de vida de los pacientes y de sus familiares.",
    letter_prefix: "V",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 14
  },
  {
    code: "HPED",
    name: "Hospitalización Pediátrica",
    description: "La pediatría es la rama de la medicina que estudia al niño y el adolescente, sus enfermedades y comportamientos.",
    letter_prefix: "D",
    priority_prefix: "P",
    estimated_minutes: 30,
    order_index: 15
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
  { code: "TERAPIA", name: "Salón de Terapias" },
  { code: "ENT-1", name: "Entrevista 1" },
  { code: "ENT-2", name: "Entrevista 2" },
  { code: "CONS-1", name: "Consultorio 1" },
  { code: "MOD-1", name: "Ventanilla 1 (Atención al Paciente)" },
  { code: "MOD-2", name: "Ventanilla 2 (Atención al Paciente)" }
];

async function syncServicesAndCounters() {
  try {
    // 0. Sincronizar Sedes Oficiales HomeCare
    for (const b of officialBranches) {
      const existing = db.prepare("SELECT id FROM branches WHERE id = ? OR code = ?").get(b.id, b.code);
      if (existing) {
        db.prepare(`
          UPDATE branches
          SET code = ?, name = ?, address = ?, phone = ?, business_hours = ?, qr_code_slug = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(b.code, b.name, b.address, b.phone, b.business_hours, b.qr_code_slug, existing.id);
      } else {
        db.prepare(`
          INSERT INTO branches (id, company_id, code, name, address, phone, business_hours, qr_code_slug, is_active)
          VALUES (?, 1, ?, ?, ?, ?, ?, ?, 1)
        `).run(b.id, b.code, b.name, b.address, b.phone, b.business_hours, b.qr_code_slug);
      }
    }

    // Desactivar servicios antiguos de prueba
    db.prepare("UPDATE services SET is_active = 0 WHERE code IN ('CG', 'CM', 'CE', 'OM')").run();
    // Desactivar módulos antiguos de prueba
    db.prepare("UPDATE counters SET is_active = 0 WHERE code IN ('CONS-2', 'CONS-3')").run();

    for (const s of officialServices) {
      const existing = db.prepare("SELECT id FROM services WHERE code = ?").get(s.code);
      if (existing) {
        db.prepare("UPDATE services SET name = ?, description = ?, letter_prefix = ?, priority_prefix = ?, estimated_minutes = ?, order_index = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(s.name, s.description, s.letter_prefix, s.priority_prefix, s.estimated_minutes, s.order_index, existing.id);
      } else {
        db.prepare("INSERT INTO services (company_id, code, name, description, letter_prefix, priority_prefix, estimated_minutes, is_active, order_index) VALUES (1, ?, ?, ?, ?, ?, ?, 1, ?)")
          .run(s.code, s.name, s.description, s.letter_prefix, s.priority_prefix, s.estimated_minutes, s.order_index);
      }
    }

    for (const c of officialCounters) {
      const existing = db.prepare("SELECT id FROM counters WHERE code = ?").get(c.code);
      if (existing) {
        db.prepare("UPDATE counters SET name = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(c.name, existing.id);
      } else {
        db.prepare("INSERT INTO counters (branch_id, code, name, is_active) VALUES (1, ?, ?, 1)")
          .run(c.code, c.name);
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
      ["FON", "FIS", "TO", "TR"].forEach(code => {
        if (serviceMap[code]) insertCounterService.run(counterMap["TERAPIA"], serviceMap[code]);
      });
    }

    ["ENT-1", "ENT-2"].forEach(entCode => {
      if (counterMap[entCode]) {
        ["CUID", "PI", "PSI", "NUT"].forEach(code => {
          if (serviceMap[code]) insertCounterService.run(counterMap[entCode], serviceMap[code]);
        });
      }
    });

    if (counterMap["CONS-1"]) {
      ["MG", "CH", "ENF", "TM", "HAC", "HCV", "HPED"].forEach(code => {
        if (serviceMap[code]) insertCounterService.run(counterMap["CONS-1"], serviceMap[code]);
      });
    }

    // 4. Actualizar Banners Oficiales de HomeCare en la tabla de configuraciones
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

    const bannerSetting = db.prepare("SELECT id FROM settings WHERE key = 'BANNERS_PUBLICIDAD' AND branch_id IS NULL").get();
    if (bannerSetting) {
      db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(JSON.stringify(officialBanners), bannerSetting.id);
    } else {
      db.prepare("INSERT INTO settings (branch_id, key, value, description, data_type) VALUES (NULL, 'BANNERS_PUBLICIDAD', ?, 'Banners multimedia rotativos en pantalla de TV', 'json')")
        .run(JSON.stringify(officialBanners));
    }

    if (db.persistToDisk) db.persistToDisk();
    console.log("Servicios, Modulos y Banners oficiales HomeCare del Quindio sincronizados exitosamente.");
  } catch (err) {
    console.error("Error sincronizando servicios y modulos:", err);
  }
}

module.exports = syncServicesAndCounters;
