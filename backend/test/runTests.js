const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Usar base de datos temporal de pruebas
process.env.DB_PATH = path.join(__dirname, '../data/test_deaturnos.db');
if (fs.existsSync(process.env.DB_PATH)) {
  fs.unlinkSync(process.env.DB_PATH);
}

const db = require('../src/config/database');
const initDatabase = require('../src/database/init');
const seedDatabase = require('../src/database/seed');
const TicketService = require('../src/services/ticketService');
const SettingsService = require('../src/services/settingsService');
const StatsService = require('../src/services/statsService');

async function runTests() {
  console.log('\n Iniciando Suite de Pruebas de DEATurnos...\n');
  await seedDatabase();

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(` [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(` [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // PRUEBA 1: Paciente existente solicita turno
  // -------------------------------------------------------------
  test('Prueba 1: Consulta de paciente existente (Carlos Pérez)', () => {
    const patient = TicketService.getOrCreatePatient({ documentNumber: '10203040' });
    assert.strictEqual(patient.full_name, 'Carlos Pérez');
    assert.strictEqual(patient.age, 45);
    assert.strictEqual(patient.is_priority_auto, 0);
  });

  // -------------------------------------------------------------
  // PRUEBA 2: Paciente nuevo solicita turno
  // -------------------------------------------------------------
  test('Prueba 2: Creación de paciente nuevo y persistencia en BD', () => {
    const newDoc = '99887766';
    const patient = TicketService.getOrCreatePatient({
      documentNumber: newDoc,
      fullName: 'Laura Restrepo',
      age: 28,
      phone: '3001122334'
    });
    assert.strictEqual(patient.document_number, newDoc);
    assert.strictEqual(patient.age, 28);
    assert.strictEqual(patient.is_priority_auto, 0);
  });

  // -------------------------------------------------------------
  // PRUEBA 3: Clasificación de edad 59 años (Normal)
  // -------------------------------------------------------------
  test('Prueba 3: Paciente de 59 años debe clasificarse como NORMAL', () => {
    const res = TicketService.createTicket({
      branchId: 1,
      serviceId: 1, // CG
      patientData: {
        documentNumber: '59595959',
        fullName: 'Usuario Cincuenta y Nueve',
        age: 59,
        phone: '3105959590'
      }
    });
    assert.strictEqual(res.ticket.ticket_type, 'NORMAL');
    assert.ok(res.ticket.ticket_number.startsWith('A-'));
  });

  // -------------------------------------------------------------
  // PRUEBA 4: Clasificación de edad 60 años (Prioritario)
  // -------------------------------------------------------------
  test('Prueba 4: Paciente de 60 años debe clasificarse automáticamente como PRIORITARIO', () => {
    const res = TicketService.createTicket({
      branchId: 1,
      serviceId: 1, // CG
      patientData: {
        documentNumber: '60606060',
        fullName: 'Usuario Sesenta',
        age: 60,
        phone: '3106060600'
      }
    });
    assert.strictEqual(res.ticket.ticket_type, 'PRIORITARIO');
    assert.ok(res.ticket.ticket_number.startsWith('P-'));
  });

  // -------------------------------------------------------------
  // PRUEBA 5: Clasificación de edad 80 años (Prioritario)
  // -------------------------------------------------------------
  test('Prueba 5: Paciente de 80 años debe clasificarse automáticamente como PRIORITARIO', () => {
    const res = TicketService.createTicket({
      branchId: 1,
      serviceId: 1, // CG
      patientData: {
        documentNumber: '80808080',
        fullName: 'Usuario Ochenta',
        age: 80,
        phone: '3108080800'
      }
    });
    assert.strictEqual(res.ticket.ticket_type, 'PRIORITARIO');
    assert.ok(res.ticket.ticket_number.startsWith('P-'));
  });

  // -------------------------------------------------------------
  // PRUEBA 6: Prevención de turnos duplicados
  // -------------------------------------------------------------
  test('Prueba 6: Prevenir que la misma cédula solicite un segundo turno si ya tiene uno en espera', () => {
    const doc = '11223344';
    const firstRes = TicketService.createTicket({
      branchId: 1,
      serviceId: 1,
      patientData: { documentNumber: doc, fullName: 'Mario Bros', age: 40, phone: '3120000000' }
    });
    assert.strictEqual(firstRes.is_duplicate, false);

    // Segundo intento con el mismo documento
    const secondRes = TicketService.createTicket({
      branchId: 1,
      serviceId: 1,
      patientData: { documentNumber: doc }
    });
    assert.strictEqual(secondRes.is_duplicate, true);
    assert.strictEqual(secondRes.ticket.id, firstRes.ticket.id);
  });

  // -------------------------------------------------------------
  // PRUEBA 7: Algoritmo de Prioridad 2:1 Inteligente
  // -------------------------------------------------------------
  test('Prueba 7: Algoritmo de Prioridad despacha en proporción 2 normales x 1 prioritario', () => {
    // Limpiamos cola de prueba para aislar el test
    db.prepare("DELETE FROM tickets WHERE branch_id = 2").run();

    // Insertar 4 normales y 2 prioritarios
    const n1 = TicketService.createTicket({ branchId: 2, serviceId: 1, patientData: { documentNumber: 'N101', fullName: 'Normal 1', age: 30, phone: '111' } });
    const n2 = TicketService.createTicket({ branchId: 2, serviceId: 1, patientData: { documentNumber: 'N102', fullName: 'Normal 2', age: 31, phone: '222' } });
    const p1 = TicketService.createTicket({ branchId: 2, serviceId: 1, patientData: { documentNumber: 'P101', fullName: 'Prioritario 1', age: 65, phone: '333' } });
    const n3 = TicketService.createTicket({ branchId: 2, serviceId: 1, patientData: { documentNumber: 'N103', fullName: 'Normal 3', age: 32, phone: '444' } });
    const n4 = TicketService.createTicket({ branchId: 2, serviceId: 1, patientData: { documentNumber: 'N104', fullName: 'Normal 4', age: 33, phone: '555' } });
    const p2 = TicketService.createTicket({ branchId: 2, serviceId: 1, patientData: { documentNumber: 'P102', fullName: 'Prioritario 2', age: 70, phone: '666' } });

    // Llamada 1: Debe ser Normal 1 (primer turno normal)
    const call1 = TicketService.callNextTicket({ counterId: 1, userId: 1, branchId: 2 });
    assert.strictEqual(call1.ticket_number, n1.ticket.ticket_number);

    // Llamada 2: Debe ser Normal 2 (segundo turno normal)
    const call2 = TicketService.callNextTicket({ counterId: 1, userId: 1, branchId: 2 });
    assert.strictEqual(call2.ticket_number, n2.ticket.ticket_number);

    // Llamada 3: Como ya se atendieron 2 normales, AHORA TOCA PRIORITARIO (P1)
    const call3 = TicketService.callNextTicket({ counterId: 1, userId: 1, branchId: 2 });
    assert.strictEqual(call3.ticket_number, p1.ticket.ticket_number);

    // Llamada 4: Reinicia ciclo -> Normal 3
    const call4 = TicketService.callNextTicket({ counterId: 1, userId: 1, branchId: 2 });
    assert.strictEqual(call4.ticket_number, n3.ticket.ticket_number);

    // Llamada 5: Segundo del ciclo -> Normal 4
    const call5 = TicketService.callNextTicket({ counterId: 1, userId: 1, branchId: 2 });
    assert.strictEqual(call5.ticket_number, n4.ticket.ticket_number);

    // Llamada 6: Cumplió 2 normales -> Prioritario 2
    const call6 = TicketService.callNextTicket({ counterId: 1, userId: 1, branchId: 2 });
    assert.strictEqual(call6.ticket_number, p2.ticket.ticket_number);
  });

  // -------------------------------------------------------------
  // PRUEBA 8: Anti-Bloqueo cuando no hay turnos prioritarios
  // -------------------------------------------------------------
  test('Prueba 8: Anti-bloqueo: Continúa atendiendo normales si no hay prioritarios', () => {
    db.prepare("DELETE FROM tickets WHERE branch_id = 2").run();
    const n1 = TicketService.createTicket({ branchId: 2, serviceId: 1, patientData: { documentNumber: 'NN1', fullName: 'Normal A', age: 20, phone: '1' } });
    const n2 = TicketService.createTicket({ branchId: 2, serviceId: 1, patientData: { documentNumber: 'NN2', fullName: 'Normal B', age: 21, phone: '2' } });
    const n3 = TicketService.createTicket({ branchId: 2, serviceId: 1, patientData: { documentNumber: 'NN3', fullName: 'Normal C', age: 22, phone: '3' } });

    // Llamar 3 seguidos aunque la regla pida prioritario al 3ro, no debe bloquearse
    const c1 = TicketService.callNextTicket({ counterId: 1, userId: 1, branchId: 2 });
    const c2 = TicketService.callNextTicket({ counterId: 1, userId: 1, branchId: 2 });
    const c3 = TicketService.callNextTicket({ counterId: 1, userId: 1, branchId: 2 });

    assert.strictEqual(c1.ticket_number, n1.ticket.ticket_number);
    assert.strictEqual(c2.ticket_number, n2.ticket.ticket_number);
    assert.strictEqual(c3.ticket_number, n3.ticket.ticket_number);
  });

  // -------------------------------------------------------------
  // PRUEBA 9: Anti-Bloqueo cuando no hay turnos normales
  // -------------------------------------------------------------
  test('Prueba 9: Anti-bloqueo: Continúa atendiendo prioritarios si no hay normales', () => {
    db.prepare("DELETE FROM tickets WHERE branch_id = 2").run();
    const p1 = TicketService.createTicket({ branchId: 2, serviceId: 1, patientData: { documentNumber: 'PP1', fullName: 'Prio A', age: 65, phone: '1' } });
    const p2 = TicketService.createTicket({ branchId: 2, serviceId: 1, patientData: { documentNumber: 'PP2', fullName: 'Prio B', age: 75, phone: '2' } });

    const c1 = TicketService.callNextTicket({ counterId: 1, userId: 1, branchId: 2 });
    const c2 = TicketService.callNextTicket({ counterId: 1, userId: 1, branchId: 2 });

    assert.strictEqual(c1.ticket_number, p1.ticket.ticket_number);
    assert.strictEqual(c2.ticket_number, p2.ticket.ticket_number);
  });

  // -------------------------------------------------------------
  // PRUEBA 10: Métricas de Dashboard y Tiempos de Espera
  // -------------------------------------------------------------
  test('Prueba 10: Cálculo correcto de KPIs y Métricas en Dashboard', () => {
    const stats = StatsService.getDashboardStats();
    assert.ok(stats.total_tickets > 0);
    assert.ok(Array.isArray(stats.by_service));
    assert.ok(Array.isArray(stats.hourly_distribution));
  });

  console.log(`\n Resultado Final: ${passed} pasadas, ${failed} fallidas de ${passed + failed} pruebas.\n`);
  if (failed > 0) process.exit(1);
}

runTests();
