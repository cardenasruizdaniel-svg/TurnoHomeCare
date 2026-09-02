const db = require('../config/database');
const SettingsService = require('./settingsService');
const AuditService = require('./auditService');
const TunnelService = require('./tunnelService');

class TicketService {
  /**
   * Busca o crea un paciente por número de documento y clasifica su prioridad por edad
   */
  static async getOrCreatePatient({ documentNumber, fullName, age, phone }) {
    const priorityMinAge = await SettingsService.get('EDAD_PRIORIDAD') || 60;
    const isPriorityAuto = Number(age) >= priorityMinAge ? 1 : 0;

    let patient = await db.prepare('SELECT * FROM patients WHERE document_number = ?').get(documentNumber);

    if (patient) {
      // Si se proporcionaron nuevos datos, actualizamos
      if (fullName || age || phone) {
        await db.prepare(`
          UPDATE patients 
          SET full_name = COALESCE(?, full_name),
              age = COALESCE(?, age),
              phone = COALESCE(?, phone),
              is_priority_auto = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(fullName, age, phone, isPriorityAuto, patient.id);
        patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(patient.id);
      }
    } else {
      if (!fullName || age === undefined || !phone) {
        throw new Error('DATOS_INCOMPLETOS_REGISTRO');
      }
      const result = await db.prepare(`
        INSERT INTO patients (document_number, full_name, age, phone, is_priority_auto)
        VALUES (?, ?, ?, ?, ?)
      `).run(documentNumber, fullName, Number(age), phone, isPriorityAuto);
      patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
    }

    return patient;
  }

  /**
   * Crea un nuevo turno validando duplicados, horarios y reglas de prioridad
   */
  static async createTicket({ branchId = 1, serviceId, patientData, ipAddress = null, appointmentTime = null, targetCounterId = null }) {
    const branch = await db.prepare('SELECT * FROM branches WHERE id = ? AND is_active = 1').get(branchId);
    if (!branch) {
      throw new Error('SEDE_NO_ENCONTRADA_O_INACTIVA');
    }

    const service = await db.prepare('SELECT * FROM services WHERE id = ? AND is_active = 1').get(serviceId);
    if (!service) {
      throw new Error('SERVICIO_NO_ENCONTRADO_O_INACTIVO');
    }

    // 1. Obtener o crear paciente
    const patient = await this.getOrCreatePatient(patientData);
    // 2. Control anti-duplicados por servicio si está habilitado
    const preventDuplicates = await SettingsService.get('PREVENIR_DUPLICADOS', branchId);
    if (preventDuplicates) {
      const activeTicket = await db.prepare(`
        SELECT t.*, s.name as service_name, b.name as branch_name
        FROM tickets t
        JOIN services s ON t.service_id = s.id
        JOIN branches b ON t.branch_id = b.id
        WHERE t.patient_id = ? 
          AND t.branch_id = ?
          AND t.service_id = ?
          AND t.status IN ('ESPERANDO', 'LLAMADO', 'EN_ATENCION')
        ORDER BY t.id DESC LIMIT 1
      `).get(patient.id, branchId, service.id);

      if (activeTicket) {
        return {
          is_duplicate: true,
          message: `Ya tienes el turno ${activeTicket.ticket_number} activo en espera para ${activeTicket.service_name}.`,
          ticket: activeTicket
        };
      }
    }

    // 3. Determinar tipo de turno y prefijo
    const priorityMinAge = await SettingsService.get('EDAD_PRIORIDAD', branchId) || 60;
    const isPriority = patient.age >= priorityMinAge || patient.is_priority_auto === 1;
    const ticketType = isPriority ? 'PRIORITARIO' : 'NORMAL';

    const defaultNormalPrefix = await SettingsService.get('PREFIJO_NORMAL', branchId) || 'A';
    const defaultPriorityPrefix = await SettingsService.get('PREFIJO_PRIORITARIO', branchId) || 'P';
    const numDigits = await SettingsService.get('DIGITOS_NUMERACION', branchId) || 3;

    // Usar prefijo del servicio si tiene letra asignada, o prefijo prioritario
    const prefix = isPriority 
      ? (service.priority_prefix || defaultPriorityPrefix)
      : (service.letter_prefix || defaultNormalPrefix);

    // 4. Calcular consecutivo del día en hora local
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    let createdTicket = null;

    const transaction = db.transaction(async () => {
      // Obtener el número secuencial más alto del día para esta sede y servicio
      const lastSequence = await db.prepare(`
        SELECT MAX(sequence_number) as max_seq
        FROM tickets
        WHERE branch_id = ? 
          AND (created_date = ? OR DATE(created_at) = ?)
          AND service_id = ?
      `).get(branchId, today, today, service.id);

      const nextSequence = (lastSequence && lastSequence.max_seq ? Number(lastSequence.max_seq) : 0) + 1;
      const formattedSeq = String(nextSequence).padStart(numDigits, '0');
      const ticketNumber = `${prefix}-${formattedSeq}`;

      const insertStmt = await db.prepare(`
        INSERT INTO tickets (
          ticket_number, branch_id, service_id, patient_id, counter_id,
          ticket_type, status, sequence_number, created_date, appointment_time
        ) VALUES (?, ?, ?, ?, ?, ?, 'ESPERANDO', ?, ?, ?)
      `);

      const result = insertStmt.run(
        ticketNumber,
        branchId,
        service.id,
        patient.id,
        targetCounterId ? Number(targetCounterId) : null,
        ticketType,
        nextSequence,
        today,
        appointmentTime || null
      );

      const ticketId = result.lastInsertRowid;

      // Registrar evento
      await db.prepare(`
        INSERT INTO ticket_events (ticket_id, from_status, to_status, counter_id, metadata)
        VALUES (?, NULL, 'ESPERANDO', ?, ?)
      `).run(ticketId, targetCounterId ? Number(targetCounterId) : null, JSON.stringify({ ip: ipAddress, age: patient.age, isPriority, appointmentTime }));

      createdTicket = await db.prepare(`
        SELECT t.*, s.name as service_name, s.code as service_code, 
               p.full_name as patient_name, p.document_number, p.age as patient_age,
               b.name as branch_name,
               c.name as counter_name, c.code as counter_code
        FROM tickets t
        JOIN services s ON t.service_id = s.id
        JOIN patients p ON t.patient_id = p.id
        JOIN branches b ON t.branch_id = b.id
        LEFT JOIN counters c ON t.counter_id = c.id
        WHERE t.id = ?
      `).get(ticketId);
    });

    await transaction();

    // 5. Calcular cuántos turnos hay antes
    const queuePosition = this.getQueuePosition(createdTicket.id, branchId, service.id);

    await AuditService.log({
      action: 'CREATE_TICKET',
      entity: 'TICKET',
      entityId: createdTicket.id,
      ipAddress,
      details: { ticket_number: createdTicket.ticket_number, patient_doc: patient.document_number, isPriority }
    });

    return {
      is_duplicate: false,
      ticket: createdTicket,
      queue_position: queuePosition.ahead_count,
      estimated_wait_minutes: queuePosition.estimated_wait_minutes
    };
  }

  /**
   * Obtiene la posición en la cola y tiempo estimado
   */
  static async getQueuePosition(ticketId, branchId, serviceId) {
    const targetTicket = await db.prepare('SELECT id, created_at, status FROM tickets WHERE id = ?').get(ticketId);
    if (!targetTicket || targetTicket.status !== 'ESPERANDO') {
      return { ahead_count: 0, estimated_wait_minutes: 0 };
    }

    const countBefore = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM tickets 
      WHERE branch_id = ? 
        AND service_id = ? 
        AND status = 'ESPERANDO' 
        AND (
          ticket_type = 'PRIORITARIO' AND (SELECT ticket_type FROM tickets WHERE id = ?) = 'NORMAL'
          OR created_at < ?
        )
        AND id != ?
    `).get(branchId, serviceId, ticketId, targetTicket.created_at, ticketId);

    const service = await db.prepare('SELECT estimated_minutes FROM services WHERE id = ?').get(serviceId);
    const estPerTicket = service ? service.estimated_minutes : 15;

    return {
      ahead_count: countBefore ? countBefore.count : 0,
      estimated_wait_minutes: (countBefore ? countBefore.count : 0) * estPerTicket
    };
  }

  /**
   * Algoritmo inteligente de prioridad (2 normales x 1 prioritario configurable con fallback anti-bloqueo)
   */
  static async getNextRecommendedTicket(counterId, branchId) {
    // 1. Primero: Buscar si hay algún turno derivado o asignado ESPECÍFICAMENTE a este módulo/consultorio
    const directAssigned = await db.prepare(`
      SELECT t.*, s.name as service_name, p.full_name as patient_name, p.age as patient_age
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN patients p ON t.patient_id = p.id
      WHERE t.branch_id = ?
        AND t.status = 'ESPERANDO'
        AND t.counter_id = ?
      ORDER BY t.created_at ASC LIMIT 1
    `).get(branchId, counterId);

    if (directAssigned) {
      return directAssigned;
    }

    // 2. Obtener servicios asignados a este módulo
    const assignedServices = await db.prepare(`
      SELECT service_id FROM counter_services WHERE counter_id = ?
    `).all(counterId).map(s => s.service_id);

    if (assignedServices.length === 0) {
      return null;
    }

    const placeholders = assignedServices.map(() => '?').join(',');

    // 3. Obtener turnos generales en espera para los servicios de este módulo
    const waitingTickets = await db.prepare(`
      SELECT t.*, s.name as service_name, p.full_name as patient_name, p.age as patient_age
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN patients p ON t.patient_id = p.id
      WHERE t.branch_id = ?
        AND t.status = 'ESPERANDO'
        AND (t.counter_id IS NULL OR t.counter_id = ?)
        AND t.service_id IN (${placeholders})
      ORDER BY t.created_at ASC
    `).all(branchId, counterId, ...assignedServices);

    if (waitingTickets.length === 0) {
      return null;
    }

    const normalTickets = waitingTickets.filter(t => t.ticket_type === 'NORMAL');
    const priorityTickets = waitingTickets.filter(t => t.ticket_type === 'PRIORITARIO' || t.ticket_type === 'ESPECIAL');

    // Si solo existe uno de los tipos, retornamos el más antiguo (Anti-bloqueo total)
    if (priorityTickets.length === 0) return normalTickets[0];
    if (normalTickets.length === 0) return priorityTickets[0];

    // 4. Evaluar la proporción de atención histórica del día (Ratio de Prioridad)
    const ratioPriority = await SettingsService.get('RATIO_PRIORIDAD', branchId) || 2;
    const _now = new Date(); const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

    // Obtener los últimos turnos llamados ordenados por el historial exacto de eventos
    const recentCalled = await db.prepare(`
      SELECT t.ticket_type, te.id as event_id
      FROM ticket_events te
      JOIN tickets t ON te.ticket_id = t.id
      WHERE t.branch_id = ? 
        AND t.created_date = ? 
        AND te.to_status = 'LLAMADO'
      ORDER BY te.id DESC LIMIT 20
    `).all(branchId, today);

    // Contar cuántos NORMALES consecutivos se han llamado desde el último PRIORITARIO
    let consecutiveNormals = 0;
    for (const t of recentCalled) {
      if (t.ticket_type === 'NORMAL') {
        consecutiveNormals++;
      } else if (t.ticket_type === 'PRIORITARIO') {
        break; // Detener conteo al encontrar el último prioritario
      }
    }

    // Si ya atendimos la cantidad requerida de normales (ej: 2) y hay prioritarios en espera -> LLAMAR PRIORITARIO
    if (consecutiveNormals >= ratioPriority && priorityTickets.length > 0) {
      return priorityTickets[0];
    }

    // De lo contrario, si hay normales disponibles -> LLAMAR NORMAL
    if (normalTickets.length > 0) {
      return normalTickets[0];
    }

    // Fallback prioritario
    return priorityTickets[0];
  }

  /**
   * Llamar siguiente turno con bloqueo de concurrencia atómica
   */
  static async callNextTicket({ counterId, userId, branchId, specificTicketId = null }) {
    await this.activateScheduledTicketsForToday();
    let calledTicket = null;

    const transaction = db.transaction(async () => {
      // 1. Verificar si el módulo o funcionario tiene un turno en 'LLAMADO' o 'EN_ATENCION' sin finalizar
      const currentActive = await db.prepare(`
        SELECT * FROM tickets 
        WHERE counter_id = ? AND status IN ('LLAMADO', 'EN_ATENCION')
        LIMIT 1
      `).get(counterId);

      if (currentActive) {
        // Marcamos automáticamente el anterior como finalizado o solicitamos finalizar
        // Para fluidez de trabajo, si estaba en 'LLAMADO' y nunca inició atención, pasa a NO_PRESENTO o FINALIZADO
        await db.prepare(`
          UPDATE tickets 
          SET status = 'FINALIZADO', completed_at = CURRENT_TIMESTAMP,
              attention_time_seconds = CASE 
                WHEN attended_at IS NOT NULL THEN (strftime('%s', 'now') - strftime('%s', attended_at))
                ELSE 0 END
          WHERE id = ?
        `).run(currentActive.id);

        await db.prepare(`
          INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, metadata)
          VALUES (?, ?, 'FINALIZADO', ?, ?, 'Auto-finalizado al llamar siguiente')
        `).run(currentActive.id, currentActive.status, userId, counterId);
      }

      // 2. Seleccionar el turno a llamar
      let targetTicket = null;
      if (specificTicketId) {
        targetTicket = await db.prepare(`
          SELECT * FROM tickets WHERE id = ? AND status = 'ESPERANDO'
        `).get(specificTicketId);
      } else {
        targetTicket = await this.getNextRecommendedTicket(counterId, branchId);
        // Si no hay turnos para los servicios asignados a este consultorio/módulo, no roba turnos de otros módulos
      }

      if (!targetTicket) {
        return null;
      }

      // 3. Actualizar estado a 'LLAMADO' de forma atómica
      const updateResult = await db.prepare(`
        UPDATE tickets
        SET status = 'LLAMADO',
            counter_id = ?,
            user_id = ?,
            called_at = CURRENT_TIMESTAMP,
            call_count = call_count + 1,
            wait_time_seconds = (strftime('%s', 'now') - strftime('%s', created_at))
        WHERE id = ? AND status = 'ESPERANDO'
      `).run(counterId, userId, targetTicket.id);

      if (updateResult.changes === 0) {
        // Otro funcionario lo llamó milisegundos antes
        throw new Error('TURNO_YA_TOMADO_POR_OTRO_FUNCIONARIO');
      }

      // 4. Registrar evento
      await db.prepare(`
        INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id)
        VALUES (?, 'ESPERANDO', 'LLAMADO', ?, ?)
      `).run(targetTicket.id, userId, counterId);

      calledTicket = await db.prepare(`
        SELECT t.*, s.name as service_name, s.code as service_code,
               c.name as counter_name, c.code as counter_code,
               u.full_name as user_name,
               p.full_name as patient_name, p.document_number, p.age as patient_age
        FROM tickets t
        JOIN services s ON t.service_id = s.id
        JOIN counters c ON t.counter_id = c.id
        JOIN users u ON t.user_id = u.id
        JOIN patients p ON t.patient_id = p.id
        WHERE t.id = ?
      `).get(targetTicket.id);
    });

    await transaction();

    if (calledTicket) {
      await AuditService.log({
        userId,
        action: 'CALL_TICKET',
        entity: 'TICKET',
        entityId: calledTicket.id,
        details: { ticket_number: calledTicket.ticket_number, counter: calledTicket.counter_name }
      });
    }

    return calledTicket;
  }

  /**
   * Re-llamar un turno activo
   */
  static async recallTicket(ticketId, userId) {
    const ticket = await db.prepare(`
      SELECT t.*, s.name as service_name, c.name as counter_name, c.code as counter_code,
             p.full_name as patient_name
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      LEFT JOIN counters c ON t.counter_id = c.id
      JOIN patients p ON t.patient_id = p.id
      WHERE t.id = ?
    `).get(ticketId);

    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    await db.prepare(`
      UPDATE tickets 
      SET call_count = call_count + 1,
          called_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(ticketId);

    await db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, metadata)
      VALUES (?, ?, 'LLAMADO', ?, ?, 'Re-llamado de turno')
    `).run(ticketId, ticket.status, userId, ticket.counter_id);

    await AuditService.log({
      userId,
      action: 'RECALL_TICKET',
      entity: 'TICKET',
      entityId: ticket.id,
      details: { ticket_number: ticket.ticket_number, call_count: ticket.call_count + 1 }
    });

    return await db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  }

  /**
   * Iniciar atención del turno
   */
  static async startAttention(ticketId, userId) {
    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    await db.prepare(`
      UPDATE tickets
      SET status = 'EN_ATENCION',
          attended_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(ticketId);

    await db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id)
      VALUES (?, ?, 'EN_ATENCION', ?, ?)
    `).run(ticketId, ticket.status, userId, ticket.counter_id);

    await AuditService.log({
      userId,
      action: 'START_ATTENTION',
      entity: 'TICKET',
      entityId: ticket.id,
      details: { ticket_number: ticket.ticket_number }
    });

    return await db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  }

  /**
   * Finalizar atención del turno
   */
  static async completeTicket(ticketId, userId, notes = null) {
    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    await db.prepare(`
      UPDATE tickets
      SET status = 'FINALIZADO',
          completed_at = CURRENT_TIMESTAMP,
          notes = COALESCE(?, notes),
          attention_time_seconds = CASE 
            WHEN attended_at IS NOT NULL THEN (strftime('%s', 'now') - strftime('%s', attended_at))
            ELSE (strftime('%s', 'now') - strftime('%s', called_at))
          END
      WHERE id = ?
    `).run(notes, ticketId);

    await db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, metadata)
      VALUES (?, ?, 'FINALIZADO', ?, ?, ?)
    `).run(ticketId, ticket.status, userId, ticket.counter_id, notes ? JSON.stringify({ notes }) : null);

    await AuditService.log({
      userId,
      action: 'COMPLETE_TICKET',
      entity: 'TICKET',
      entityId: ticket.id,
      details: { ticket_number: ticket.ticket_number }
    });

    return await db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  }

  /**
   * Marcar como No Se Presentó
   */
  static async markNoShow(ticketId, userId) {
    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    await db.prepare(`
      UPDATE tickets
      SET status = 'NO_PRESENTO',
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(ticketId);

    await db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id)
      VALUES (?, ?, 'NO_PRESENTO', ?, ?)
    `).run(ticketId, ticket.status, userId, ticket.counter_id);

    await AuditService.log({
      userId,
      action: 'NO_SHOW_TICKET',
      entity: 'TICKET',
      entityId: ticket.id,
      details: { ticket_number: ticket.ticket_number }
    });

    return await db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  }

  /**
   * Pausar o transferir turno
   */
  static async pauseTicket(ticketId, userId) {
    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    await db.prepare(`
      UPDATE tickets
      SET status = 'PAUSADO'
      WHERE id = ?
    `).run(ticketId);

    await db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id)
      VALUES (?, ?, 'PAUSADO', ?, ?)
    `).run(ticketId, ticket.status, userId, ticket.counter_id);

    return await db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  }

  /**
   * Derivar / Transferir turno de un módulo a otro consultorio o servicio
   */
  static async transferTicket({ ticketId, targetServiceId, targetCounterId = null, notes = null, userId, fromCounterId = null }) {
    const ticket = await db.prepare(`
      SELECT t.*, s.name as current_service_name, p.full_name as patient_name
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN patients p ON t.patient_id = p.id
      WHERE t.id = ?
    `).get(ticketId);

    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    let finalServiceId = targetServiceId ? Number(targetServiceId) : null;
    const finalCounterId = targetCounterId ? Number(targetCounterId) : null;

    if (!finalServiceId && finalCounterId) {
      const primaryCounterService = await db.prepare(`
        SELECT service_id FROM counter_services WHERE counter_id = ? LIMIT 1
      `).get(finalCounterId);
      if (primaryCounterService) {
        finalServiceId = primaryCounterService.service_id;
      }
    }

    if (!finalServiceId) {
      finalServiceId = ticket.service_id;
    }

    const fromCounter = fromCounterId 
      ? await db.prepare('SELECT * FROM counters WHERE id = ?').get(fromCounterId)
      : (ticket.counter_id ? await db.prepare('SELECT * FROM counters WHERE id = ?').get(ticket.counter_id) : null);

    const toCounter = finalCounterId 
      ? await db.prepare('SELECT * FROM counters WHERE id = ?').get(finalCounterId)
      : null;

    const targetService = await db.prepare('SELECT * FROM services WHERE id = ?').get(finalServiceId);

    const transferNote = `[Derivado de ${fromCounter ? fromCounter.name : 'Ventanilla'} ➔ ${toCounter ? toCounter.name : (targetService ? targetService.name : 'Consultorio')}] ${notes || ''}`.trim();

    const updatedNotes = ticket.notes ? `${ticket.notes}\n${transferNote}` : transferNote;

    // Actualizar turno: pasa a 'ESPERANDO' y asignado al nuevo consultorio
    await db.prepare(`
      UPDATE tickets
      SET status = 'ESPERANDO',
          service_id = ?,
          counter_id = ?,
          notes = ?,
          called_at = NULL,
          attended_at = NULL
      WHERE id = ?
    `).run(finalServiceId, finalCounterId, updatedNotes, ticketId);

    // Registrar evento de derivación
    await db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, metadata)
      VALUES (?, ?, 'ESPERANDO', ?, ?, ?)
    `).run(
      ticketId,
      ticket.status,
      userId,
      fromCounterId || ticket.counter_id,
      JSON.stringify({
        action: 'TRANSFER_TICKET',
        from_counter: fromCounter ? fromCounter.name : null,
        to_service: targetService ? targetService.name : null,
        to_counter: toCounter ? toCounter.name : null,
        notes
      })
    );

    await AuditService.log({
      userId,
      action: 'TRANSFER_TICKET',
      entity: 'TICKET',
      entityId: ticket.id,
      details: {
        ticket_number: ticket.ticket_number,
        from_counter: fromCounter ? fromCounter.name : null,
        to_service: targetService ? targetService.name : null,
        to_counter: toCounter ? toCounter.name : null,
        notes
      }
    });

    return await db.prepare(`
      SELECT t.*, s.name as service_name, s.code as service_code,
             p.full_name as patient_name, p.document_number, p.age as patient_age
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN patients p ON t.patient_id = p.id
      WHERE t.id = ?
    `).get(ticketId);
  }

  /**
   * Datos para la Pantalla Pública TV
   */
  static async getPublicDisplayData(branchId = 1) {
    await this.activateScheduledTicketsForToday();
    const historyCount = await SettingsService.get('HISTORIAL_PANTALLA_CANTIDAD', branchId) || 6;

    // Turno actualmente en llamado o atención más reciente
    const currentTicket = await db.prepare(`
      SELECT t.*, s.name as service_name, s.code as service_code,
             c.name as counter_name, c.code as counter_code,
             p.full_name as patient_name, p.document_number
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN counters c ON t.counter_id = c.id
      JOIN patients p ON t.patient_id = p.id
      WHERE t.branch_id = ? 
        AND t.status IN ('LLAMADO', 'EN_ATENCION')
      ORDER BY t.called_at DESC LIMIT 1
    `).get(branchId);

    // Historial de últimos turnos llamados
    const recentTickets = await db.prepare(`
      SELECT t.*, s.name as service_name, s.code as service_code,
             c.name as counter_name, c.code as counter_code,
             p.full_name as patient_name, p.document_number
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN counters c ON t.counter_id = c.id
      JOIN patients p ON t.patient_id = p.id
      WHERE t.branch_id = ?
        AND t.status IN ('LLAMADO', 'EN_ATENCION', 'FINALIZADO', 'NO_PRESENTO')
        AND (? IS NULL OR t.id != ?)
      ORDER BY t.called_at DESC LIMIT ?
    `).all(branchId, currentTicket ? currentTicket.id : null, currentTicket ? currentTicket.id : null, historyCount);

    const branch = await db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId);
    const company = branch ? await db.prepare('SELECT * FROM companies WHERE id = ?').get(branch.company_id) : null;
    const settings = await SettingsService.getAll(branchId);

    const effectiveBaseUrl = TunnelService.getEffectivePublicUrl(process.env.PORT || 5000);
    const publicRequestUrl = `${effectiveBaseUrl}/solicitar-turno?branchId=${branchId}`;

    return {
      current_ticket: currentTicket || null,
      recent_tickets: recentTickets || [],
      branch: branch || null,
      company: company || null,
      settings: settings,
      effective_base_url: effectiveBaseUrl,
      public_request_url: publicRequestUrl
    };
  }

  /**
   * Obtiene la cola de espera activa para la sede o módulo y la agenda del día
   */
  static async getWaitingQueue(branchId = 1, counterId = null) {
    await this.activateScheduledTicketsForToday();
    let counterFilter = '';
    const params = [branchId];
    let assignedServiceNames = [];

    if (counterId) {
      const assigned = await db.prepare(`
        SELECT cs.service_id, s.name, s.letter_prefix 
        FROM counter_services cs
        JOIN services s ON cs.service_id = s.id
        WHERE cs.counter_id = ?
      `).all(counterId);
      
      assignedServiceNames = assigned.map(a => a.name);

      if (assigned.length > 0) {
        const placeholders = assigned.map(() => '?').join(',');
        counterFilter = `AND (t.counter_id = ? OR (t.counter_id IS NULL AND t.service_id IN (${placeholders})))`;
        params.push(counterId, ...assigned.map(a => a.service_id));
      } else {
        counterFilter = `AND (t.counter_id = ? OR t.counter_id IS NULL)`;
        params.push(counterId);
      }
    }

    // Turnos asignados específicamente a este módulo en estado ESPERANDO
    const waiting = await db.prepare(`
      SELECT t.*, s.name as service_name, s.letter_prefix, s.code as service_code,
             p.full_name as patient_name, p.document_number, p.age as patient_age, p.phone as patient_phone,
             c.name as counter_name, c.code as counter_code
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN patients p ON t.patient_id = p.id
      LEFT JOIN counters c ON t.counter_id = c.id
      WHERE t.branch_id = ?
        AND t.status = 'ESPERANDO'
        ${counterFilter}
      ORDER BY 
        CASE 
          WHEN t.appointment_time IS NOT NULL AND t.appointment_time != '' THEN t.appointment_time 
          ELSE '99:99' 
        END ASC,
        t.created_at ASC
    `).all(...params);

    // Todos los turnos en espera de la sede (para visibilidad global)
    const allBranchWaiting = await db.prepare(`
      SELECT t.*, s.name as service_name, s.letter_prefix, s.code as service_code,
             p.full_name as patient_name, p.document_number, p.age as patient_age, p.phone as patient_phone,
             c.name as counter_name, c.code as counter_code
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN patients p ON t.patient_id = p.id
      LEFT JOIN counters c ON t.counter_id = c.id
      WHERE t.branch_id = ?
        AND t.status = 'ESPERANDO'
      ORDER BY t.created_at ASC
    `).all(branchId);

    // Agenda completa del día para el médico / consultorio (incluye todos los estados)
    let agendaTickets = [];
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    if (counterId) {
      agendaTickets = await db.prepare(`
        SELECT t.*, s.name as service_name, s.letter_prefix, s.code as service_code,
               c.name as counter_name, c.code as counter_code,
               p.full_name as patient_name, p.document_number, p.age as patient_age, p.phone as patient_phone
        FROM tickets t
        JOIN services s ON t.service_id = s.id
        JOIN patients p ON t.patient_id = p.id
        LEFT JOIN counters c ON t.counter_id = c.id
        WHERE t.branch_id = ?
          AND (t.created_date = ? OR DATE(t.created_at) = ?)
          ${counterFilter}
        ORDER BY 
          CASE 
            WHEN t.status = 'EN_ATENCION' THEN 1
            WHEN t.status = 'LLAMADO' THEN 2
            WHEN t.status = 'ESPERANDO' THEN 3
            ELSE 4
          END,
          CASE 
            WHEN t.appointment_time IS NOT NULL AND t.appointment_time != '' THEN t.appointment_time 
            ELSE '99:99' 
          END ASC,
          t.created_at ASC
      `).all(branchId, today, today, ...params.slice(1));
    }

    // Turno actualmente en atención o llamado en ESTE puesto/módulo
    let counterActiveTicket = null;
    if (counterId) {
      counterActiveTicket = await db.prepare(`
        SELECT t.*, s.name as service_name, s.code as service_code,
               c.name as counter_name, c.code as counter_code,
               p.full_name as patient_name, p.document_number, p.age as patient_age, p.phone as patient_phone
        FROM tickets t
        JOIN services s ON t.service_id = s.id
        JOIN patients p ON t.patient_id = p.id
        LEFT JOIN counters c ON t.counter_id = c.id
        WHERE t.counter_id = ? AND t.status IN ('LLAMADO', 'EN_ATENCION')
        ORDER BY t.called_at DESC LIMIT 1
      `).get(counterId);
    }

    // Conteo desglosado por servicio
    const serviceCounts = await db.prepare(`
      SELECT s.id, s.name, s.code, s.letter_prefix, COUNT(t.id) as count
      FROM services s
      LEFT JOIN tickets t ON t.service_id = s.id AND t.status = 'ESPERANDO' AND t.branch_id = ?
      WHERE s.is_active = 1
      GROUP BY s.id
    `).all(branchId);

    const recommended = counterId ? await this.getNextRecommendedTicket(counterId, branchId) : null;

    return {
      counter_active_ticket: counterActiveTicket || null,
      waiting_tickets: waiting,
      total_waiting: waiting.length,
      agenda_tickets: agendaTickets || [],
      all_branch_waiting: allBranchWaiting,
      total_branch_waiting: allBranchWaiting.length,
      assigned_services: assignedServiceNames,
      service_counts: serviceCounts || [],
      recommended_ticket: recommended || (allBranchWaiting.length > 0 ? allBranchWaiting[0] : null)
    };
  }

  /**
   * Consulta el estado de un turno para seguimiento móvil
   */
  static async getTicketTracking(ticketId) {
    const ticket = await db.prepare(`
      SELECT t.*, s.name as service_name, s.estimated_minutes,
             b.name as branch_name, b.address as branch_address,
             c.name as counter_name, c.code as counter_code,
             p.full_name as patient_name, p.document_number
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN branches b ON t.branch_id = b.id
      JOIN patients p ON t.patient_id = p.id
      LEFT JOIN counters c ON t.counter_id = c.id
      WHERE t.id = ?
    `).get(ticketId);

    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    // Turno actualmente en atención en su servicio
    const currentInService = await db.prepare(`
      SELECT t.ticket_number, c.name as counter_name
      FROM tickets t
      LEFT JOIN counters c ON t.counter_id = c.id
      WHERE t.branch_id = ? AND t.service_id = ? AND t.status IN ('LLAMADO', 'EN_ATENCION')
      ORDER BY t.called_at DESC LIMIT 1
    `).get(ticket.branch_id, ticket.service_id);

    // Contar cuántos hay antes
    const queuePos = this.getQueuePosition(ticket.id, ticket.branch_id, ticket.service_id);

    return {
      ticket,
      current_calling_ticket: currentInService ? currentInService.ticket_number : 'Ninguno en llamada',
      current_counter: currentInService ? currentInService.counter_name : null,
      ahead_count: queuePos.ahead_count,
      estimated_wait_minutes: queuePos.estimated_wait_minutes
    };
  }

  /**
   * Reinicia la cola diaria y resetea el turnero para iniciar desde el turno 1
   */
  static async resetDailyQueue({ branchId = 1, userId = null }) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    // Finalizar todos los turnos pendientes o en atención para que la cola quede en 0
    await db.prepare(`
      UPDATE tickets 
      SET status = 'FINALIZADO',
          completed_at = CURRENT_TIMESTAMP,
          notes = 'Reinicio manual de turnero diario'
      WHERE branch_id = ? 
        AND (created_date = ? OR DATE(created_at) = ?)
        AND status IN ('ESPERANDO', 'LLAMADO', 'EN_ATENCION', 'PAUSADO')
    `).run(branchId, today, today);

    // Marcar los consecutivos anteriores de hoy para que la próxima secuencia comience en 1
    await db.prepare(`
      UPDATE tickets
      SET created_date = created_date || '-RESET'
      WHERE branch_id = ? AND created_date = ?
    `).run(branchId, today);

    await AuditService.log({
      userId,
      action: 'RESET_DAILY_QUEUE',
      entity: 'TICKETS',
      entityId: branchId,
      details: { branchId, date: today }
    });

    return { success: true, message: 'Turnero reiniciado a 1 exitosamente.' };
  }

  /**
   * Activa automáticamente turnos programados cuya fecha es hoy o anterior
   */
  static async activateScheduledTicketsForToday() {
    try {
      const _now = new Date(); const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
      const info = await db.prepare(`
        UPDATE tickets 
        SET status = 'ESPERANDO'
        WHERE status IN ('PROGRAMADO', 'CONFIRMADO')
          AND scheduled_date IS NOT NULL
          AND scheduled_date <= ?
      `).run(today);
    } catch (e) {
      console.error('Error en activateScheduledTicketsForToday:', e);
    }
  }

  /**
   * Crea una programación de turno para fecha hoy o futura
   */
  static async createScheduledTicket({
    branchId = 1,
    scheduledDate,
    appointmentTime = null,
    serviceId,
    counterId = null,
    userId = null,
    patientData,
    ticketType = null,
    notes = null,
    createdByUserId = null
  }) {
    await this.activateScheduledTicketsForToday();

    const _now = new Date(); const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    const targetDate = scheduledDate || today;

    const branch = await db.prepare('SELECT * FROM branches WHERE id = ? AND is_active = 1').get(branchId);
    if (!branch) throw new Error('SEDE_NO_ENCONTRADA_O_INACTIVA');

    const service = await db.prepare('SELECT * FROM services WHERE id = ? AND is_active = 1').get(serviceId);
    if (!service) throw new Error('SERVICIO_NO_ENCONTRADO_O_INACTIVO');

    // 1. Obtener o crear paciente
    const patient = await this.getOrCreatePatient(patientData);

    // 2. Prevenir duplicados coincidentes en la misma fecha y servicio
    const existingActive = await db.prepare(`
      SELECT t.*, s.name as service_name
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      WHERE t.patient_id = ?
        AND t.branch_id = ?
        AND t.service_id = ?
        AND (t.scheduled_date = ? OR t.created_date = ?)
        AND t.status IN ('PROGRAMADO', 'CONFIRMADO', 'ESPERANDO', 'LLAMADO', 'EN_ATENCION')
      LIMIT 1
    `).get(patient.id, branchId, service.id, targetDate, targetDate);

    if (existingActive) {
      return {
        is_duplicate: true,
        message: `El paciente ${patient.full_name} ya tiene un turno (${existingActive.ticket_number}) activo para ${existingActive.service_name} en la fecha ${targetDate}.`,
        ticket: existingActive
      };
    }

    // 3. Determinar tipo de turno y prefijo
    const priorityMinAge = await SettingsService.get('EDAD_PRIORIDAD', branchId) || 60;
    const isPriorityAuto = patient.age >= priorityMinAge || patient.is_priority_auto === 1;
    const finalTicketType = ticketType || (isPriorityAuto ? 'PRIORITARIO' : 'NORMAL');
    const isPriority = finalTicketType === 'PRIORITARIO' || finalTicketType === 'ESPECIAL';

    const defaultNormalPrefix = await SettingsService.get('PREFIJO_NORMAL', branchId) || 'A';
    const defaultPriorityPrefix = await SettingsService.get('PREFIJO_PRIORITARIO', branchId) || 'P';
    const numDigits = await SettingsService.get('DIGITOS_NUMERACION', branchId) || 3;

    const prefix = isPriority
      ? (service.priority_prefix || defaultPriorityPrefix)
      : (service.letter_prefix || defaultNormalPrefix);

    // Estado inicial: PROGRAMADO si es futuro, ESPERANDO si es hoy o anterior
    const initialStatus = targetDate > today ? 'PROGRAMADO' : 'ESPERANDO';

    let createdTicket = null;

    const transaction = db.transaction(async () => {
      const lastSeq = await db.prepare(`
        SELECT MAX(sequence_number) as max_seq
        FROM tickets
        WHERE branch_id = ? 
          AND service_id = ?
          AND (scheduled_date = ? OR created_date = ?)
      `).get(branchId, service.id, targetDate, targetDate);

      const nextSequence = (lastSeq && lastSeq.max_seq ? Number(lastSeq.max_seq) : 0) + 1;
      const formattedSeq = String(nextSequence).padStart(numDigits, '0');
      const ticketNumber = `${prefix}-${formattedSeq}`;

      const res = await db.prepare(`
        INSERT INTO tickets (
          ticket_number, branch_id, service_id, patient_id, counter_id, user_id,
          ticket_type, status, sequence_number, created_date, scheduled_date, appointment_time, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ticketNumber,
        branchId,
        service.id,
        patient.id,
        counterId ? Number(counterId) : null,
        userId ? Number(userId) : null,
        finalTicketType,
        initialStatus,
        nextSequence,
        today,
        targetDate,
        appointmentTime || null,
        notes || null
      );

      const ticketId = res.lastInsertRowid;

      await db.prepare(`
        INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, metadata)
        VALUES (?, NULL, ?, ?, ?, ?)
      `).run(
        ticketId,
        initialStatus,
        createdByUserId ? Number(createdByUserId) : null,
        counterId ? Number(counterId) : null,
        JSON.stringify({ scheduledDate: targetDate, appointmentTime, isPriority, notes })
      );

      createdTicket = await db.prepare(`
        SELECT t.*, s.name as service_name, s.code as service_code, 
               p.full_name as patient_name, p.document_number, p.age as patient_age, p.phone as patient_phone,
               b.name as branch_name,
               c.name as counter_name, c.code as counter_code,
               u.full_name as staff_name
        FROM tickets t
        JOIN services s ON t.service_id = s.id
        JOIN patients p ON t.patient_id = p.id
        JOIN branches b ON t.branch_id = b.id
        LEFT JOIN counters c ON t.counter_id = c.id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.id = ?
      `).get(ticketId);
    });

    await transaction();

    await AuditService.log({
      userId: createdByUserId,
      action: 'CREATE_SCHEDULED_TICKET',
      entity: 'TICKET',
      entityId: createdTicket.id,
      details: {
        ticket_number: createdTicket.ticket_number,
        scheduled_date: targetDate,
        patient_doc: patient.document_number,
        counter_id: counterId
      }
    });

    return {
      is_duplicate: false,
      ticket: createdTicket
    };
  }

  /**
   * Obtiene la lista de turnos programados, calendario por días y métricas
   */
  static async getScheduleData({
    branchId = 1,
    startDate = null,
    endDate = null,
    date = null,
    serviceId = null,
    counterId = null,
    userId = null,
    status = null,
    search = null
  }) {
    await this.activateScheduledTicketsForToday();

    const _now = new Date(); const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    const targetDate = date || today;

    let conditions = ['t.branch_id = ?'];
    let params = [branchId];

    if (date) {
      conditions.push('(t.scheduled_date = ? OR (t.scheduled_date IS NULL AND t.created_date = ?))');
      params.push(date, date);
    } else if (startDate && endDate) {
      conditions.push('COALESCE(t.scheduled_date, t.created_date) BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    if (serviceId) {
      conditions.push('t.service_id = ?');
      params.push(Number(serviceId));
    }

    if (counterId) {
      conditions.push('t.counter_id = ?');
      params.push(Number(counterId));
    }

    if (userId) {
      conditions.push('t.user_id = ?');
      params.push(Number(userId));
    }

    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(p.full_name LIKE ? OR p.document_number LIKE ? OR t.ticket_number LIKE ?)');
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const tickets = await db.prepare(`
      SELECT t.*, s.name as service_name, s.code as service_code, s.estimated_minutes,
             p.full_name as patient_name, p.document_number, p.age as patient_age, p.phone as patient_phone,
             c.name as counter_name, c.code as counter_code,
             u.full_name as staff_name
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN patients p ON t.patient_id = p.id
      LEFT JOIN counters c ON t.counter_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      ${whereClause}
      ORDER BY 
        COALESCE(t.scheduled_date, t.created_date) ASC,
        CASE WHEN t.appointment_time IS NOT NULL AND t.appointment_time != '' THEN t.appointment_time ELSE '99:99' END ASC,
        t.created_at ASC
    `).all(...params);

    // Resumen de calendario por fecha
    const calendarRows = await db.prepare(`
      SELECT 
        COALESCE(scheduled_date, created_date) as day,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PROGRAMADO' THEN 1 ELSE 0 END) as programados,
        SUM(CASE WHEN status = 'ESPERANDO' THEN 1 ELSE 0 END) as esperando,
        SUM(CASE WHEN status IN ('LLAMADO', 'EN_ATENCION') THEN 1 ELSE 0 END) as en_atencion,
        SUM(CASE WHEN status = 'FINALIZADO' THEN 1 ELSE 0 END) as finalizados,
        SUM(CASE WHEN status = 'CANCELADO' THEN 1 ELSE 0 END) as cancelados,
        SUM(CASE WHEN status = 'NO_PRESENTO' THEN 1 ELSE 0 END) as no_presentados
      FROM tickets
      WHERE branch_id = ?
      GROUP BY day
    `).all(branchId);

    const calendarSummary = {};
    for (const r of calendarRows) {
      if (r.day) {
        calendarSummary[r.day] = r;
      }
    }

    // Métricas del día seleccionado
    const metricsRow = await db.prepare(`
      SELECT 
        COUNT(*) as total_dia,
        SUM(CASE WHEN status = 'PROGRAMADO' THEN 1 ELSE 0 END) as programados_hoy,
        SUM(CASE WHEN status = 'ESPERANDO' THEN 1 ELSE 0 END) as en_espera,
        SUM(CASE WHEN status = 'FINALIZADO' THEN 1 ELSE 0 END) as atendidos,
        SUM(CASE WHEN status = 'CANCELADO' THEN 1 ELSE 0 END) as cancelados,
        SUM(CASE WHEN status = 'NO_PRESENTO' THEN 1 ELSE 0 END) as no_presentados
      FROM tickets
      WHERE branch_id = ?
        AND (scheduled_date = ? OR (scheduled_date IS NULL AND created_date = ?))
    `).get(branchId, targetDate, targetDate);

    const activeCountersCount = await db.prepare(`
      SELECT COUNT(DISTINCT counter_id) as count
      FROM tickets
      WHERE branch_id = ?
        AND (scheduled_date = ? OR (scheduled_date IS NULL AND created_date = ?))
        AND counter_id IS NOT NULL
        AND status IN ('PROGRAMADO', 'ESPERANDO', 'LLAMADO', 'EN_ATENCION')
    `).get(branchId, targetDate, targetDate);

    const dashboardMetrics = {
      programadosHoy: metricsRow ? (metricsRow.programados_hoy || 0) : 0,
      enEspera: metricsRow ? (metricsRow.en_espera || 0) : 0,
      atendidos: metricsRow ? (metricsRow.atendidos || 0) : 0,
      cancelados: metricsRow ? (metricsRow.cancelados || 0) : 0,
      noPresentados: metricsRow ? (metricsRow.no_presentados || 0) : 0,
      modulosActivos: activeCountersCount ? (activeCountersCount.count || 0) : 0
    };

    // Desglose por Módulo / Consultorio para la fecha seleccionada
    const allCounters = await db.prepare(`
      SELECT id, name, code, is_active FROM counters WHERE branch_id = ? ORDER BY code ASC
    `).all(branchId);

    const moduleWorkload = allCounters.map(counter => {
      const counterTickets = tickets.filter(t => t.counter_id === counter.id);
      return {
        counter_id: counter.id,
        counter_name: counter.name,
        counter_code: counter.code,
        is_active: counter.is_active === 1,
        total_tickets: counterTickets.length,
        tickets: counterTickets
      };
    });

    const unassignedTickets = tickets.filter(t => !t.counter_id);
    if (unassignedTickets.length > 0) {
      moduleWorkload.unshift({
        counter_id: null,
        counter_name: 'Sin Módulo Asignado',
        counter_code: 'GENERAL',
        is_active: true,
        total_tickets: unassignedTickets.length,
        tickets: unassignedTickets
      });
    }

    return {
      tickets,
      calendarSummary,
      dashboardMetrics,
      moduleWorkload,
      selectedDate: targetDate
    };
  }

  /**
   * Editar directamente cualquier turno que NO haya sido llamado aún
   */
  static async editUncalledTicket({
    ticketId,
    patientData = null,
    serviceId = null,
    scheduledDate = null,
    appointmentTime = null,
    counterId = null,
    userId = null,
    ticketType = null,
    notes = null,
    modifiedByUserId = null
  }) {
    await this.activateScheduledTicketsForToday();

    const ticket = await db.prepare(`
      SELECT t.*, p.document_number, p.full_name as patient_name
      FROM tickets t
      JOIN patients p ON t.patient_id = p.id
      WHERE t.id = ?
    `).get(ticketId);

    if (!ticket) {
      throw new Error('TURNO_NO_ENCONTRADO');
    }

    const editableStatuses = ['PROGRAMADO', 'CONFIRMADO', 'ESPERANDO', 'PAUSADO'];
    if (!editableStatuses.includes(ticket.status)) {
      throw new Error(`NO_EDITABLE_ESTADO: El turno ${ticket.ticket_number} ya se encuentra en estado ${ticket.status} y no se puede modificar libremente.`);
    }

    const _now = new Date(); const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    const beforeMetadata = {
      service_id: ticket.service_id,
      counter_id: ticket.counter_id,
      user_id: ticket.user_id,
      scheduled_date: ticket.scheduled_date,
      appointment_time: ticket.appointment_time,
      ticket_type: ticket.ticket_type,
      status: ticket.status
    };

    let updatedPatientId = ticket.patient_id;
    if (patientData && patientData.documentNumber) {
      const patient = await this.getOrCreatePatient(patientData);
      updatedPatientId = patient.id;
    }

    const newScheduledDate = scheduledDate || ticket.scheduled_date || ticket.created_date || today;
    const newServiceId = serviceId ? Number(serviceId) : ticket.service_id;
    const newCounterId = counterId !== undefined ? (counterId ? Number(counterId) : null) : ticket.counter_id;
    const newUserId = userId !== undefined ? (userId ? Number(userId) : null) : ticket.user_id;
    const newTicketType = ticketType || ticket.ticket_type;
    const newAppointmentTime = appointmentTime !== undefined ? appointmentTime : ticket.appointment_time;
    const newNotes = notes !== undefined ? notes : ticket.notes;

    let newStatus = ticket.status;
    if (newScheduledDate > today) {
      newStatus = 'PROGRAMADO';
    } else if (newScheduledDate <= today && ticket.status === 'PROGRAMADO') {
      newStatus = 'ESPERANDO';
    }

    await db.prepare(`
      UPDATE tickets
      SET patient_id = ?,
          service_id = ?,
          counter_id = ?,
          user_id = ?,
          ticket_type = ?,
          scheduled_date = ?,
          appointment_time = ?,
          notes = ?,
          status = ?
      WHERE id = ?
    `).run(
      updatedPatientId,
      newServiceId,
      newCounterId,
      newUserId,
      newTicketType,
      newScheduledDate,
      newAppointmentTime,
      newNotes,
      newStatus,
      ticketId
    );

    const afterMetadata = {
      service_id: newServiceId,
      counter_id: newCounterId,
      user_id: newUserId,
      scheduled_date: newScheduledDate,
      appointment_time: newAppointmentTime,
      ticket_type: newTicketType,
      status: newStatus
    };

    await db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      ticketId,
      ticket.status,
      newStatus,
      modifiedByUserId ? Number(modifiedByUserId) : null,
      newCounterId,
      JSON.stringify({ action: 'EDIT_UNCALLED', before: beforeMetadata, after: afterMetadata })
    );

    await AuditService.log({
      userId: modifiedByUserId,
      action: 'EDIT_UNCALLED_TICKET',
      entity: 'TICKET',
      entityId: ticketId,
      details: {
        ticket_number: ticket.ticket_number,
        before: beforeMetadata,
        after: afterMetadata
      }
    });

    return await db.prepare(`
      SELECT t.*, s.name as service_name, s.code as service_code, 
             p.full_name as patient_name, p.document_number, p.age as patient_age, p.phone as patient_phone,
             c.name as counter_name, c.code as counter_code,
             u.full_name as staff_name
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN patients p ON t.patient_id = p.id
      LEFT JOIN counters c ON t.counter_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `).get(ticketId);
  }

  /**
   * Cancelar directamente cualquier turno que NO haya sido llamado aún
   */
  static async cancelUncalledTicket({ ticketId, reason = null, cancelledByUserId = null }) {
    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) {
      throw new Error('TURNO_NO_ENCONTRADO');
    }

    const cancelableStatuses = ['PROGRAMADO', 'CONFIRMADO', 'ESPERANDO', 'PAUSADO'];
    if (!cancelableStatuses.includes(ticket.status)) {
      throw new Error(`NO_CANCELABLE_ESTADO: El turno ${ticket.ticket_number} está en estado ${ticket.status} y no puede cancelarse directamente.`);
    }

    const fromStatus = ticket.status;
    const cancelNote = reason ? `Cancelado: ${reason}` : 'Cancelado sin motivo especificado';
    const updatedNotes = ticket.notes ? `${ticket.notes} | ${cancelNote}` : cancelNote;

    await db.prepare(`
      UPDATE tickets
      SET status = 'CANCELADO',
          notes = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(updatedNotes, ticketId);

    await db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, metadata)
      VALUES (?, ?, 'CANCELADO', ?, ?, ?)
    `).run(
      ticketId,
      fromStatus,
      cancelledByUserId ? Number(cancelledByUserId) : null,
      ticket.counter_id,
      JSON.stringify({ reason, cancelledByUserId })
    );

    await AuditService.log({
      userId: cancelledByUserId,
      action: 'CANCEL_UNCALLED_TICKET',
      entity: 'TICKET',
      entityId: ticketId,
      details: {
        ticket_number: ticket.ticket_number,
        from_status: fromStatus,
        reason
      }
    });

    return {
      success: true,
      ticketId,
      ticket_number: ticket.ticket_number,
      message: `El turno ${ticket.ticket_number} ha sido cancelado exitosamente.`
    };
  }

}

module.exports = TicketService;
