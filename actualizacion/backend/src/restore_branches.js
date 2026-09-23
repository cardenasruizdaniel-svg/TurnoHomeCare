const db = require('./config/database');
const syncServicesAndCounters = require('./database/syncServicesAndCounters');

async function restoreBranches() {
  await db.init();
  console.log('🔄 Restaurando Sedes y Módulos en la base de datos...');

  // 1. Asegurar Empresa ID 1
  const company = await db.prepare("SELECT id FROM companies WHERE id = 1").get();
  if (!company) {
    await db.prepare(`
      INSERT INTO companies (id, name, nit, logo_url, slogan, primary_color, secondary_color, accent_color)
      VALUES (1, 'HomeCare del Quindío I.P.S.', '901.458.789-2', '/homecare-logo.png', 'Bienestar en casa.', '#e1136c', '#00b0b9', '#7cb518')
    `).run();
  }

  // 2. Reactivar/Crear Sede 1 y Sede 2
  await db.prepare(`
    INSERT INTO branches (id, company_id, code, name, address, phone, business_hours, qr_code_slug, is_active)
    VALUES (1, 1, 'SEDE-ARMENIA', 'Sede Principal (Armenia)', 'Carrera 13 #3N 50, medicentro Alcazar cons 706', '+57 323 479 0311', 'Lunes a Viernes: 7:00 AM - 6:00 PM', 'sede-armenia', 1)
    ON CONFLICT(id) DO UPDATE SET is_active = 1, name = 'Sede Principal (Armenia)', company_id = 1
  `).run();

  await db.prepare(`
    INSERT INTO branches (id, company_id, code, name, address, phone, business_hours, qr_code_slug, is_active)
    VALUES (2, 1, 'SEDE-CIRCASIA', 'Sede Circasia', 'Calle 6 No 15-19', '+57 323 479 0311', 'Lunes a Viernes: 7:00 AM - 5:00 PM', 'sede-circasia', 1)
    ON CONFLICT(id) DO UPDATE SET is_active = 1, name = 'Sede Circasia', company_id = 1
  `).run();

  // 3. Ejecutar sincronización de servicios y módulos
  await syncServicesAndCounters();

  console.log('========================================================');
  console.log(' ✅ SEDES Y MÓDULOS RESTAURADOS EXITOSAMENTE');
  console.log(' Sede 1: Sede Principal (Armenia)');
  console.log(' Sede 2: Sede Circasia');
  console.log('========================================================');
}

restoreBranches().catch(err => {
  console.error('❌ Error restaurando sedes:', err);
});
