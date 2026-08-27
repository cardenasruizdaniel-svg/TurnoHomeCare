const db = require('../config/database');
const SettingsService = require('./settingsService');
const AuditService = require('./auditService');
const TunnelService = require('./tunnelService');

class TicketService {
  /**
   * Busca o crea un paciente por número de documento y clasifica su prioridad por edad
   */
  static getOrCreatePatient({ documentNumber, fullName, age, phone }) {
    const priorityMinAge = SettingsService.get('EDAD_PRIORIDAD') || 60;
    const isPriorityAuto = Number(age) >= priorityMinAge ? 1 : 0;

    let patient = db.prepare('SELECT * FROM patients WHERE document_number = ?').get(documentNumber);

    if (patient) {
      // Si se proporcionaron nuevos datos, actualizamos
      if (fullName || age || phone) {
        db.prepare(`
          UPDATE patients 
          SET full_name = COALESCE(?, full_name),
              age = COALESCE(?, age),
              phone = COALESCE(?, phone),
              is_priority_auto = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(fullName, age, phone, isPriorityAuto, patient.id);
        patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patient.id);
      }
    } else {
      if (!fullName || age === undefined || !phone) {
        throw new Error('DATOS_INCOMPLETOS_REGISTRO');
      }
      const result = db.prepare(`
        INSERT INTO patients (document_number, full_name, age, phone, is_priority_auto)
        VALUES (?, ?, ?, ?, ?)
      `).run(documentNumber, fullName, Number(age), phone, isPriorityAuto);
      patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
    }

    return patient;
  }

  /**
   * Crea un nuevo turno validando duplicados, horarios y reglas de prioridad
   */
  static createTicket({ branchId = 1, serviceId, patientData, ipAddress = null }) {
    const branch = db.prepare('SELECT * FROM branches WHERE id = ? AND is_active = 1').get(branchId);
    if (!branch) {
      throw new Error('SEDE_NO_ENCONTRADA_O_INACTIVA');
    }

    const service = db.prepare('SELECT * FROM services WHERE id = ? AND is_active = 1').get(serviceId);
    if (!service) {
      throw new Error('SERVICIO_NO_ENCONTRADO_O_INACTIVO');
    }

    // 1. Obtener o crear paciente
    const patient = this.getOrCreatePatient(patientData);

    // 2. Control anti-duplicados si está habilitado
    const preventDuplicates = SettingsService.get('PREVENIR_DUPLICADOS', branchId);
    if (preventDuplicates) {
      const activeTicket = db.prepare(`
        SELECT t.*, s.name as service_name, b.name as branch_name
        FROM tickets t
        JOIN services s ON t.service_id = s.id
        JOIN branches b ON t.branch_id = b.id
        WHERE t.patient_id = ? 
          AND t.branch_id = ?
          AND t.status IN ('ESPERANDO', 'LLAMADO', 'EN_ATENCION')
        ORDER BY t.id DESC LIMIT 1
      `).get(patient.id, branchId);

      if (activeTicket) {
        return {
          is_duplicate: true,
          message: 'Ya tienes un turno activo en proceso.',
          ticket: activeTicket
        };
      }
    }

    // 3. Determinar tipo de turno y prefijo
    const priorityMinAge = SettingsService.get('EDAD_PRIORIDAD', branchId) || 60;
    const isPriority = patient.age >= priorityMinAge || patient.is_priority_auto === 1;
    const ticketType = isPriority ? 'PRIORITARIO' : 'NORMAL';

    const defaultNormalPrefix = SettingsService.get('PREFIJO_NORMAL', branchId) || 'A';
    const defaultPriorityPrefix = SettingsService.get('PREFIJO_PRIORITARIO', branchId) || 'P';
    const numDigits = SettingsService.get('DIGITOS_NUMERACION', branchId) || 3;

    // Usar prefijo del servicio si tiene letra asignada, o prefijo prioritario
    const prefix = isPriority 
      ? (service.priority_prefix || defaultPriorityPrefix)
      : (service.letter_prefix || defaultNormalPrefix);

    // 4. Calcular consecutivo del día
    const today = new Date().toISOString().slice(0, 10);
    
    let createdTicket = null;

    const transaction = db.transaction(() => {
      // Obtener el número secuencial más alto del día para esta sede y prefijo
      const lastSequence = db.prepare(`
        SELECT MAX(sequence_number) as max_seq
        FROM tickets
        WHERE branch_id = ? AND created_date = ? AND ticket_type = ?
      `).get(branchId, today, ticketType);

      const nextSequence = (lastSequence && lastSequence.max_seq ? lastSequence.max_seq : 0) + 1;
      const formattedSeq = String(nextSequence).padStart(numDigits, '0');
      const ticketNumber = `${prefix}-${formattedSeq}`;

      const insertStmt = db.prepare(`
        INSERT INTO tickets (
          ticket_number, branch_id, service_id, patient_id, 
          ticket_type, status, sequence_number, created_date
        ) VALUES (?, ?, ?, ?, ?, 'ESPERANDO', ?, ?)
      `);

      const result = insertStmt.run(
        ticketNumber, branchId, service.id, patient.id,
        ticketType, nextSequence, today
      );

      const ticketId = result.lastInsertRowid;

      // Registrar evento
      db.prepare(`
        INSERT INTO ticket_events (ticket_id, from_status, to_status, metadata)
        VALUES (?, NULL, 'ESPERANDO', ?)
      `).run(ticketId, JSON.stringify({ ip: ipAddress, age: patient.age, isPriority }));

      createdTicket = db.prepare(`
        SELECT t.*, s.name as service_name, s.code as service_code, 
               p.full_name as patient_name, p.document_number, p.age as patient_age,
               b.name as branch_name
        FROM tickets t
        JOIN services s ON t.service_id = s.id
        JOIN patients p ON t.patient_id = p.id
        JOIN branches b ON t.branch_id = b.id
        WHERE t.id = ?
      `).get(ticketId);
    });

    transaction();

    // 5. Calcular cuántos turnos hay antes
    const queuePosition = this.getQueuePosition(createdTicket.id, branchId, service.id);

    AuditService.log({
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
  static getQueuePosition(ticketId, branchId, serviceId) {
    const targetTicket = db.prepare('SELECT id, created_at, status FROM tickets WHERE id = ?').get(ticketId);
    if (!targetTicket || targetTicket.status !== 'ESPERANDO') {
      return { ahead_count: 0, estimated_wait_minutes: 0 };
    }

    const aheadCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE branch_id = ? 
        AND service_id = ?
        AND status = 'ESPERANDO'
        AND created_at < ?
    `).get(branchId, serviceId, targetTicket.created_at).count;

    const service = db.prepare('SELECT estimated_minutes FROM services WHERE id = ?').get(serviceId);
    const estimatedMinutes = ((aheadCount + 1) * (service ? service.estimated_minutes : 15));

    return { ahead_count: aheadCount, estimated_wait_minutes: estimatedMinutes };
  }

  /**
   * Algoritmo inteligente de prioridad (2 normales x 1 prioritario configurable con fallback anti-bloqueo)
   */
  static getNextRecommendedTicket(counterId, branchId) {
    // 1. Obtener servicios asignados a este módulo
    const assignedServices = db.prepare(`
      SELECT service_id FROM counter_services WHERE counter_id = ?
    `).all(counterId).map(s => s.service_id);

    if (assignedServices.length === 0) {
      // Si no tiene asignación específica, atiende todos los servicios de la sede
      const allServices = db.prepare('SELECT id FROM services WHERE is_active = 1').all().map(s => s.id);
      assignedServices.push(...allServices);
    }

    const placeholders = assignedServices.map(() => '?').join(',');

    // 2. Obtener turnos en espera para esos servicios
    const waitingTickets = db.prepare(`
      SELECT t.*, s.name as service_name, p.full_name as patient_name, p.age as patient_age
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN patients p ON t.patient_id = p.id
      WHERE t.branch_id = ?
        AND t.status = 'ESPERANDO'
        AND t.service_id IN (${placeholders})
      ORDER BY t.created_at ASC
    `).all(branchId, ...assignedServices);

    if (waitingTickets.length === 0) {
      return null;
    }

    const normalTickets = waitingTickets.filter(t => t.ticket_type === 'NORMAL');
    const priorityTickets = waitingTickets.filter(t => t.ticket_type === 'PRIORITARIO' || t.ticket_type === 'ESPECIAL');

    // Si solo existe uno de los tipos, retornamos el más antiguo (Anti-bloqueo total)
    if (priorityTickets.length === 0) return normalTickets[0];
    if (normalTickets.length === 0) return priorityTickets[0];

    // 3. Evaluar la proporción de atención histórica del día (Ratio de Prioridad)
    const ratioPriority = SettingsService.get('RATIO_PRIORIDAD', branchId) || 2;
    const today = new Date().toISOString().slice(0, 10);

    // Obtener los últimos turnos llamados ordenados por el historial exacto de eventos
    const recentCalled = db.prepare(`
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
  static callNextTicket({ counterId, userId, branchId, specificTicketId = null }) {
    let calledTicket = null;

    const transaction = db.transaction(() => {
      // 1. Verificar si el módulo o funcionario tiene un turno en 'LLAMADO' o 'EN_ATENCION' sin finalizar
      const currentActive = db.prepare(`
        SELECT * FROM tickets 
        WHERE counter_id = ? AND status IN ('LLAMADO', 'EN_ATENCION')
        LIMIT 1
      `).get(counterId);

      if (currentActive) {
        // Marcamos automáticamente el anterior como finalizado o solicitamos finalizar
        // Para fluidez de trabajo, si estaba en 'LLAMADO' y nunca inició atención, pasa a NO_PRESENTO o FINALIZADO
        db.prepare(`
          UPDATE tickets 
          SET status = 'FINALIZADO', completed_at = CURRENT_TIMESTAMP,
              attention_time_seconds = CASE 
                WHEN attended_at IS NOT NULL THEN (strftime('%s', 'now') - strftime('%s', attended_at))
                ELSE 0 END
          WHERE id = ?
        `).run(currentActive.id);

        db.prepare(`
          INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, metadata)
          VALUES (?, ?, 'FINALIZADO', ?, ?, 'Auto-finalizado al llamar siguiente')
        `).run(currentActive.id, currentActive.status, userId, counterId);
      }

      // 2. Seleccionar el turno a llamar
      let targetTicket = null;
      if (specificTicketId) {
        targetTicket = db.prepare(`
          SELECT * FROM tickets WHERE id = ? AND status = 'ESPERANDO'
        `).get(specificTicketId);
      } else {
        targetTicket = this.getNextRecommendedTicket(counterId, branchId);
        // Fallback: si no hay turnos para los servicios asignados pero hay en la sede, llamar el más antiguo
        if (!targetTicket) {
          targetTicket = db.prepare(`
            SELECT * FROM tickets 
            WHERE branch_id = ? AND status = 'ESPERANDO'
            ORDER BY created_at ASC LIMIT 1
          `).get(branchId);
        }
      }

      if (!targetTicket) {
        return null;
      }

      // 3. Actualizar estado a 'LLAMADO' de forma atómica
      const updateResult = db.prepare(`
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
      db.prepare(`
        INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id)
        VALUES (?, 'ESPERANDO', 'LLAMADO', ?, ?)
      `).run(targetTicket.id, userId, counterId);

      calledTicket = db.prepare(`
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

    transaction();

    if (calledTicket) {
      AuditService.log({
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
  static recallTicket(ticketId, userId) {
    const ticket = db.prepare(`
      SELECT t.*, s.name as service_name, c.name as counter_name, c.code as counter_code,
             p.full_name as patient_name
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      LEFT JOIN counters c ON t.counter_id = c.id
      JOIN patients p ON t.patient_id = p.id
      WHERE t.id = ?
    `).get(ticketId);

    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    db.prepare(`
      UPDATE tickets 
      SET call_count = call_count + 1,
          called_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(ticketId);

    db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, metadata)
      VALUES (?, ?, 'LLAMADO', ?, ?, 'Re-llamado de turno')
    `).run(ticketId, ticket.status, userId, ticket.counter_id);

    AuditService.log({
      userId,
      action: 'RECALL_TICKET',
      entity: 'TICKET',
      entityId: ticket.id,
      details: { ticket_number: ticket.ticket_number, call_count: ticket.call_count + 1 }
    });

    return db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  }

  /**
   * Iniciar atención del turno
   */
  static startAttention(ticketId, userId) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    db.prepare(`
      UPDATE tickets
      SET status = 'EN_ATENCION',
          attended_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(ticketId);

    db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id)
      VALUES (?, ?, 'EN_ATENCION', ?, ?)
    `).run(ticketId, ticket.status, userId, ticket.counter_id);

    AuditService.log({
      userId,
      action: 'START_ATTENTION',
      entity: 'TICKET',
      entityId: ticket.id,
      details: { ticket_number: ticket.ticket_number }
    });

    return db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  }

  /**
   * Finalizar atención del turno
   */
  static completeTicket(ticketId, userId, notes = null) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    db.prepare(`
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

    db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, metadata)
      VALUES (?, ?, 'FINALIZADO', ?, ?, ?)
    `).run(ticketId, ticket.status, userId, ticket.counter_id, notes ? JSON.stringify({ notes }) : null);

    AuditService.log({
      userId,
      action: 'COMPLETE_TICKET',
      entity: 'TICKET',
      entityId: ticket.id,
      details: { ticket_number: ticket.ticket_number }
    });

    return db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  }

  /**
   * Marcar como No Se Presentó
   */
  static markNoShow(ticketId, userId) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    db.prepare(`
      UPDATE tickets
      SET status = 'NO_PRESENTO',
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(ticketId);

    db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id)
      VALUES (?, ?, 'NO_PRESENTO', ?, ?)
    `).run(ticketId, ticket.status, userId, ticket.counter_id);

    AuditService.log({
      userId,
      action: 'NO_SHOW_TICKET',
      entity: 'TICKET',
      entityId: ticket.id,
      details: { ticket_number: ticket.ticket_number }
    });

    return db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  }

  /**
   * Pausar o transferir turno
   */
  static pauseTicket(ticketId, userId) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) throw new Error('TURNO_NO_ENCONTRADO');

    db.prepare(`
      UPDATE tickets
      SET status = 'PAUSADO'
      WHERE id = ?
    `).run(ticketId);

    db.prepare(`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id)
      VALUES (?, ?, 'PAUSADO', ?, ?)
    `).run(ticketId, ticket.status, userId, ticket.counter_id);

    return db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  }

  /**
   * Datos para la Pantalla Pública TV
   */
  static getPublicDisplayData(branchId = 1) {
    const historyCount = SettingsService.get('HISTORIAL_PANTALLA_CANTIDAD', branchId) || 6;

    // Turno actualmente en llamado o atención más reciente
    const currentTicket = db.prepare(`
      SELECT t.*, s.name as service_name, s.code as service_code,
             c.name as counter_name, c.code as counter_code
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN counters c ON t.counter_id = c.id
      WHERE t.branch_id = ? 
        AND t.status IN ('LLAMADO', 'EN_ATENCION')
      ORDER BY t.called_at DESC LIMIT 1
    `).get(branchId);

    // Historial de últimos turnos llamados
    const recentTickets = db.prepare(`
      SELECT t.*, s.name as service_name, s.code as service_code,
             c.name as counter_name, c.code as counter_code
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN counters c ON t.counter_id = c.id
      WHERE t.branch_id = ?
        AND t.status IN ('LLAMADO', 'EN_ATENCION', 'FINALIZADO', 'NO_PRESENTO')
        AND (? IS NULL OR t.id != ?)
      ORDER BY t.called_at DESC LIMIT ?
    `).all(branchId, currentTicket ? currentTicket.id : null, currentTicket ? currentTicket.id : null, historyCount);

    const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId);
    const company = branch ? db.prepare('SELECT * FROM companies WHERE id = ?').get(branch.company_id) : null;
    const settings = SettingsService.getAll(branchId);

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
   * Obtiene la cola de espera activa para la sede o módulo
   */
  static getWaitingQueue(branchId = 1, counterId = null) {
    let serviceFilter = '';
    const params = [branchId];
    let assignedServiceNames = [];

    if (counterId) {
      const assigned = db.prepare(`
        SELECT cs.service_id, s.name, s.letter_prefix 
        FROM counter_services cs
        JOIN services s ON cs.service_id = s.id
        WHERE cs.counter_id = ?
      `).all(counterId);
      
      assignedServiceNames = assigned.map(a => a.name);

      if (assigned.length > 0) {
        const placeholders = assigned.map(() => '?').join(',');
        serviceFilter = `AND t.service_id IN (${placeholders})`;
        params.push(...assigned.map(a => a.service_id));
      }
    }

    // Turnos asignados específicamente a este módulo
    const waiting = db.prepare(`
      SELECT t.*, s.name as service_name, s.letter_prefix,
             p.full_name as patient_name, p.document_number, p.age as patient_age
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN patients p ON t.patient_id = p.id
      WHERE t.branch_id = ?
        AND t.status = 'ESPERANDO'
        ${serviceFilter}
      ORDER BY t.created_at ASC
    `).all(...params);

    // Todos los turnos en espera de la sede (para visibilidad global)
    const allBranchWaiting = db.prepare(`
      SELECT t.*, s.name as service_name, s.letter_prefix,
             p.full_name as patient_name, p.document_number, p.age as patient_age
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN patients p ON t.patient_id = p.id
      WHERE t.branch_id = ?
        AND t.status = 'ESPERANDO'
      ORDER BY t.created_at ASC
    `).all(branchId);

    const recommended = counterId ? this.getNextRecommendedTicket(counterId, branchId) : null;

    return {
      waiting_tickets: waiting,
      total_waiting: waiting.length,
      all_branch_waiting: allBranchWaiting,
      total_branch_waiting: allBranchWaiting.length,
      assigned_services: assignedServiceNames,
      recommended_ticket: recommended || (allBranchWaiting.length > 0 ? allBranchWaiting[0] : null)
    };
  }

  /**
   * Consulta el estado de un turno para seguimiento móvil
   */
  static getTicketTracking(ticketId) {
    const ticket = db.prepare(`
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
    const currentInService = db.prepare(`
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
}

module.exports = TicketService;
