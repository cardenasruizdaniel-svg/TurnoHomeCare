const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function resetAdmin() {
  await db.init();
  console.log('🔄 Inicializando reseteo de roles y usuario admin...');

  // 1. Asegurar roles
  await db.prepare("INSERT OR IGNORE INTO roles (id, name, description) VALUES (1, 'ADMIN', 'Administrador total del sistema')").run();
  await db.prepare("INSERT OR IGNORE INTO roles (id, name, description) VALUES (2, 'SUPERVISOR', 'Supervisor de sede')").run();
  await db.prepare("INSERT OR IGNORE INTO roles (id, name, description) VALUES (3, 'FUNCIONARIO', 'Operador de ventanilla / consultorio')").run();

  // 2. Asegurar sede principal
  await db.prepare("INSERT OR IGNORE INTO branches (id, company_id, code, name, address, phone) VALUES (1, 1, 'MAIN', 'Sede Principal', 'Calle 10', '123456')").run();

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

resetAdmin().catch(err => {
  console.error('❌ Error reseteando admin:', err);
});
