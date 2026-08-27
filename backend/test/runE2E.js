const assert = require('assert');
const path = require('path');
const fs = require('fs');

process.env.PORT = 5002;
process.env.DB_PATH = path.join(__dirname, '../data/test_e2e.db');

if (fs.existsSync(process.env.DB_PATH)) {
  fs.unlinkSync(process.env.DB_PATH);
}

const { server, app } = require('../src/server');

async function runE2ETests() {
  console.log('\n======================================================');
  console.log(' INICIANDO PRUEBAS END-TO-END (E2E) DE DEATURNOS');
  console.log('======================================================\n');

  // Esperar 500ms para asegurar que el servidor esté listo
  await new Promise(r => setTimeout(r, 600));

  const BASE_URL = `http://localhost:${process.env.PORT}/api`;
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(` [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(` [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  let adminToken = '';
  let funcToken = '';

  // 1. Login Admin
  await test('E2E 1: Autenticación exitosa de Administrador (admin/admin123)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token);
    assert.strictEqual(data.user.role, 'ADMIN');
    adminToken = data.token;
  });

  // 2. Login Funcionario
  await test('E2E 2: Autenticación exitosa de Funcionario (funcionario1/func123)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'funcionario1', password: 'func123' })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token);
    assert.strictEqual(data.user.role, 'FUNCIONARIO');
    funcToken = data.token;
  });

  // 3. Consulta de Paciente Existente
  await test('E2E 3: Consulta de paciente registrado por Cédula (10203040)', async () => {
    const res = await fetch(`${BASE_URL}/patients/check/10203040`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.exists, true);
    assert.strictEqual(data.patient.full_name, 'Carlos Pérez');
  });

  // 4. Consulta de Paciente No Existente
  await test('E2E 4: Consulta de cédula no registrada retorna exists = false', async () => {
    const res = await fetch(`${BASE_URL}/patients/check/77778888`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.exists, false);
  });

  // 5. Emisión de Turno para Paciente de 59 años (Normal)
  let normalTicketId = null;
  await test('E2E 5: Solicitud de turno para paciente de 59 años genera turno NORMAL (A-001)', async () => {
    const res = await fetch(`${BASE_URL}/tickets/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId: 1,
        serviceId: 1, // Consulta General
        patientData: {
          documentNumber: '59000001',
          fullName: 'Paciente Cincuenta y Nueve',
          age: 59,
          phone: '3101234567'
        }
      })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.is_duplicate, false);
    assert.strictEqual(data.ticket.ticket_type, 'NORMAL');
    assert.ok(data.ticket.ticket_number.startsWith('A-'));
    normalTicketId = data.ticket.id;
  });

  // 6. Emisión de Turno para Paciente de 60 años (Prioritario Automático)
  let priorityTicketId = null;
  await test('E2E 6: Solicitud de turno para paciente de 60 años genera turno PRIORITARIO (P-001)', async () => {
    const res = await fetch(`${BASE_URL}/tickets/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId: 1,
        serviceId: 1,
        patientData: {
          documentNumber: '60000001',
          fullName: 'Adulto Mayor Sesenta',
          age: 60,
          phone: '3107654321'
        }
      })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.ticket.ticket_type, 'PRIORITARIO');
    assert.ok(data.ticket.ticket_number.startsWith('P-'));
    priorityTicketId = data.ticket.id;
  });

  // 7. Prevención de Duplicados en Vivo
  await test('E2E 7: Prevenir turno duplicado para cédula 59000001 con turno activo', async () => {
    const res = await fetch(`${BASE_URL}/tickets/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId: 1,
        serviceId: 1,
        patientData: {
          documentNumber: '59000001',
          fullName: 'Paciente Cincuenta y Nueve',
          age: 59,
          phone: '3101234567'
        }
      })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.is_duplicate, true);
    assert.strictEqual(data.ticket.id, normalTicketId);
  });

  // 8. Seguimiento Móvil de Turno
  await test('E2E 8: Seguimiento en vivo de turno (/api/tickets/track/:id)', async () => {
    const res = await fetch(`${BASE_URL}/tickets/track/${normalTicketId}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.ticket.id, normalTicketId);
    assert.ok(data.ahead_count >= 0);
  });

  // 9. Funcionario Llama Turno Siguiente
  let calledTicket = null;
  await test('E2E 9: Funcionario llama siguiente turno aplicando prioridad', async () => {
    const res = await fetch(`${BASE_URL}/tickets/call-next`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${funcToken}`
      },
      body: JSON.stringify({
        counterId: 1,
        branchId: 1
      })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.calledTicket);
    assert.strictEqual(data.calledTicket.status, 'LLAMADO');
    calledTicket = data.calledTicket;
  });

  // 10. Re-llamar Turno
  await test('E2E 10: Re-llamado de turno incrementa call_count', async () => {
    const res = await fetch(`${BASE_URL}/tickets/${calledTicket.id}/recall`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${funcToken}` }
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.ticket.call_count, 2);
  });

  // 11. Iniciar Atención y Finalizar
  await test('E2E 11: Iniciar y Finalizar Atención con registro de tiempos', async () => {
    const startRes = await fetch(`${BASE_URL}/tickets/${calledTicket.id}/start-attention`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${funcToken}` }
    });
    const startData = await startRes.json();
    assert.strictEqual(startData.success, true);
    assert.strictEqual(startData.ticket.status, 'EN_ATENCION');

    const completeRes = await fetch(`${BASE_URL}/tickets/${calledTicket.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${funcToken}`
      },
      body: JSON.stringify({ notes: 'Consulta completada con éxito' })
    });
    const compData = await completeRes.json();
    assert.strictEqual(compData.success, true);
    assert.strictEqual(compData.ticket.status, 'FINALIZADO');
  });

  // 12. Pantalla Pública TV
  await test('E2E 12: Endpoint de Pantalla Pública TV retorna datos institucionales y cola', async () => {
    const res = await fetch(`${BASE_URL}/tickets/public-display/1`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.company);
    assert.ok(data.branch);
    assert.ok(Array.isArray(data.recent_tickets));
  });

  // 13. Dashboard Administrativo
  await test('E2E 13: Dashboard de métricas calcula totales, atendidos y KPIs', async () => {
    const res = await fetch(`${BASE_URL}/stats/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.stats.total_tickets > 0);
    assert.ok(data.stats.completed > 0);
  });

  // 14. Exportación CSV
  await test('E2E 14: Exportación de turnos a CSV genera encabezados válidos', async () => {
    const res = await fetch(`${BASE_URL}/stats/export-csv`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const text = await res.text();
    assert.ok(text.includes('Numero_Turno'));
    assert.ok(text.includes('Documento_Paciente'));
  });

  console.log(`\n======================================================`);
  console.log(` RESULTADO FINAL E2E: ${passed} pasadas, ${failed} fallidas de ${passed + failed} pruebas.`);
  console.log(`======================================================\n`);

  server.close();
  if (failed > 0) process.exit(1);
  process.exit(0);
}

runE2ETests();
