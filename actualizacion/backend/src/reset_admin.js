const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function resetAdmin() {
  await db.init();
  console.log('🔄 Inicializando reseteo de roles y usuario admin...');

  // 1. Asegurar roles
  await db.prepare("INSERT OR IGNORE INTO roles (id, name, description) VALUES (1, 'ADMIN', 'Administrador total del sistema')").run();
  await db.prepare("INSERT OR IGNORE INTO roles (id, name, description) VALUES (2, 'SUPERVISOR', 'Supervisor de sede')").run();
  await db.prepare("INSERT OR IGNORE INTO roles (id, name, description) VALUES (3, 'FUNCIONARIO', 'Operador de ventanilla / consultorio')").run();

  // 2. Asegurar sedes oficiales HomeCare del Quindío I.P.S.
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

  // 3. Resetear usuario 'admin' a la clave admin123
  const hash123 = bcrypt.hashSync('admin123', 10);
  const hashHome = bcrypt.hashSync('Home2026*', 10);

  await db.prepare("DELETE FROM users WHERE username = 'admin' OR id = 1").run();
  await db.prepare(`
    INSERT INTO users (id, branch_id, role_id, username, email, password_hash, full_name, is_active)
    VALUES (1, 1, 1, 'admin', 'admin@homecare.com', ?, 'Administrador General', 1)
  `).run(hash123);

  // Asegurar módulos
  const modules = [
    { id: 2, u: 'Consultorio1' },
    { id: 3, u: 'Ventanilla1' },
    { id: 4, u: 'Ventanilla2' }
  ];
  for (const m of modules) {
    const exists = await db.prepare("SELECT id FROM users WHERE username = ?").get(m.u);
    if (!exists) {
      await db.prepare("INSERT INTO users (id, branch_id, role_id, username, email, password_hash, full_name, is_active) VALUES (?, 1, 3, ?, ?, ?, ?, 1)")
        .run(m.id, m.u, `${m.u.toLowerCase()}@homecare.com`, hashHome, m.u);
    }
  }

  console.log('========================================================');
  console.log(' ✅ USUARIO "admin" RESTABLECIDO EXITOSAMENTE');
  console.log(' Usuario: admin');
  console.log(' Contraseña: admin123');
  console.log('========================================================');
}

if (require.main === module) {
  resetAdmin().catch(err => {
    console.error('❌ Error reseteando admin:', err);
  });
}

module.exports = resetAdmin;
