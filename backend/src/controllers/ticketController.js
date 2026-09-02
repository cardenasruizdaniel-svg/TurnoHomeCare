const TicketService = require('../services/ticketService');
const socketHandler = require('../socket/socketHandler');
const db = require('../config/database');

class TicketController {
  /**
   * Consulta si una cédula/documento ya existe en el sistema
   */
  static async checkPatient(req, res) {
    try {
      const { documentNumber } = req.params;
      if (!documentNumber) {
        return res.status(400).json({ success: false, error: 'DOCUMENTO_REQUERIDO' });
      }

      const patient = await db.prepare(`
        SELECT id, document_number, full_name, age, phone, is_priority_auto
        FROM patients 
        WHERE document_number = ?
      `).get(documentNumber.trim());

      if (patient) {
        return res.json({
          success: true,
          exists: true,
          patient: {
            id: patient.id,
            document_number: patient.document_number,
            full_name: patient.full_name,
            age: patient.age,
            phone: patient.phone,
            is_priority_auto: patient.is_priority_auto === 1
          }
        });
      }

      return res.json({
        success: true,
        exists: false,
        patient: null
      });
    } catch (err) {
      console.error('Error al consultar paciente:', err);
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Solicitar un nuevo turno desde el celular / QR
   */
  static async requestTicket(req, res) {
    try {
      const { branchId = 1, serviceId, patientData, appointmentTime = null, targetCounterId = null } = req.body;

      if (!serviceId || !patientData || !patientData.documentNumber) {
        return res.status(400).json({
          success: false,
          error: 'CAMPOS_INCOMPLETOS',
          message: 'Debe ingresar el servicio y los datos del paciente (cédula).'
        });
      }

      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const result = await TicketService.createTicket({
        branchId: Number(branchId),
        serviceId: Number(serviceId),
        patientData,
        ipAddress,
        appointmentTime: appointmentTime || null,
        targetCounterId: targetCounterId ? Number(targetCounterId) : null
      });

      // Si fue creado exitosamente (no duplicado), emitir evento de tiempo real
      if (!result.is_duplicate) {
        socketHandler.emitTicketCreated(branchId, {
          ticket: result.ticket,
          queue_position: result.queue_position
        });
      }

      return res.status(result.is_duplicate ? 200 : 201).json({
        success: true,
        ...result
      });
    } catch (err) {
      console.error('Error al solicitar turno:', err);
      return res.status(400).json({
        success: false,
        error: err.message,
        message: err.message === 'DATOS_INCOMPLETOS_REGISTRO' 
          ? 'Por favor complete todos los datos requeridos (Cédula, Nombre, Edad, Teléfono)'
          : err.message
      });
    }
  }

  /**
   * Obtiene la información para la Pantalla Pública TV
   */
  static async getPublicDisplay(req, res) {
    try {
      const branchId = Number(req.params.branchId || 1);
      const data = await TicketService.getPublicDisplayData(branchId);
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Obtiene la cola de espera activa para el funcionario
   */
  static async getWaitingQueue(req, res) {
    try {
      const branchId = Number(req.params.branchId || (req.user ? req.user.branch_id : 1) || 1);
      const counterId = req.query.counterId ? Number(req.query.counterId) : null;
      const data = await TicketService.getWaitingQueue(branchId, counterId);
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Llamar al siguiente turno recomendado o uno específico
   */
  static async callNext(req, res) {
    try {
      const { counterId, branchId, specificTicketId } = req.body;
      const userId = req.user.id;
      const activeBranchId = Number(branchId || req.user.branch_id || 1);

      if (!counterId) {
        return res.status(400).json({ success: false, error: 'MODULO_REQUERIDO', message: 'Debe seleccionar un módulo o consultorio' });
      }

      const calledTicket = await TicketService.callNextTicket({
        counterId: Number(counterId),
        userId,
        branchId: activeBranchId,
        specificTicketId: specificTicketId ? Number(specificTicketId) : null
      });

      if (!calledTicket) {
        return res.json({
          success: true,
          calledTicket: null,
          message: 'No hay más turnos en espera para los servicios asignados a este módulo.'
        });
      }

      // Emitir llamado a pantalla de TV y celular
      socketHandler.emitTicketCalled(activeBranchId, calledTicket);

      return res.json({
        success: true,
        calledTicket,
        message: `Turno ${calledTicket.ticket_number} llamado con éxito.`
      });
    } catch (err) {
      console.error('Error al llamar turno:', err);
      return res.status(400).json({ success: false, error: err.message, message: err.message });
    }
  }

  /**
   * Re-llamar el turno actual
   */
  static async recall(req, res) {
    try {
      const ticketId = Number(req.params.id);
      const userId = req.user.id;

      const ticket = await TicketService.recallTicket(ticketId, userId);
      const fullTicket = await db.prepare(`
        SELECT t.*, s.name as service_name, s.code as service_code,
               c.name as counter_name, c.code as counter_code
        FROM tickets t
        JOIN services s ON t.service_id = s.id
        LEFT JOIN counters c ON t.counter_id = c.id
        WHERE t.id = ?
      `).get(ticket.id);

      socketHandler.emitTicketRecalled(ticket.branch_id, fullTicket);

      res.json({ success: true, ticket: fullTicket });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Iniciar atención
   */
  static async startAttention(req, res) {
    try {
      const ticketId = Number(req.params.id);
      const userId = req.user.id;

      const ticket = await TicketService.startAttention(ticketId, userId);
      socketHandler.emitTicketStatusChanged(ticket.branch_id, ticket);

      res.json({ success: true, ticket });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Finalizar atención
   */
  static async complete(req, res) {
    try {
      const ticketId = Number(req.params.id);
      const { notes } = req.body;
      const userId = req.user.id;

      const ticket = await TicketService.completeTicket(ticketId, userId, notes);
      socketHandler.emitTicketStatusChanged(ticket.branch_id, ticket);

      res.json({ success: true, ticket });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Marcar como No Se Presentó
   */
  static async markNoShow(req, res) {
    try {
      const ticketId = Number(req.params.id);
      const userId = req.user.id;

      const ticket = await TicketService.markNoShow(ticketId, userId);
      socketHandler.emitTicketStatusChanged(ticket.branch_id, ticket);

      res.json({ success: true, ticket });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Derivar / Transferir turno a consultorio u otro servicio
   */
  static async transfer(req, res) {
    try {
      const ticketId = Number(req.params.id);
      const { targetServiceId, targetCounterId, notes, fromCounterId } = req.body;
      const userId = req.user.id;

      const ticket = await TicketService.transferTicket({
        ticketId,
        targetServiceId: targetServiceId ? Number(targetServiceId) : null,
        targetCounterId: targetCounterId ? Number(targetCounterId) : null,
        notes,
        userId,
        fromCounterId: fromCounterId ? Number(fromCounterId) : null
      });

      socketHandler.emitTicketStatusChanged(ticket.branch_id, ticket);
      socketHandler.emitQueueUpdated(ticket.branch_id);

      res.json({
        success: true,
        message: 'Turno derivado exitosamente',
        ticket
      });
    } catch (err) {
      console.error('Error al transferir turno:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Pausar turno
   */
  static async pause(req, res) {
    try {
      const ticketId = Number(req.params.id);
      const userId = req.user.id;

      const ticket = await TicketService.pauseTicket(ticketId, userId);
      socketHandler.emitTicketStatusChanged(ticket.branch_id, ticket);

      res.json({ success: true, ticket });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Seguimiento en vivo desde el celular
   */
  static async trackTicket(req, res) {
    try {
      const ticketId = Number(req.params.id);
      const data = await TicketService.getTicketTracking(ticketId);
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  /**
   * Obtiene datos de la programación de turnos (agenda, métricas, módulo workload)
   */
  static async getSchedule(req, res) {
    try {
      const branchId = Number(req.query.branchId || (req.user ? req.user.branch_id : 1) || 1);
      const { startDate, endDate, date, serviceId, counterId, userId, status, search } = req.query;

      const data = await TicketService.getScheduleData({
        branchId,
        startDate,
        endDate,
        date,
        serviceId,
        counterId,
        userId,
        status,
        search
      });

      res.json({ success: true, ...data });
    } catch (err) {
      console.error('Error obteniendo agenda de turnos:', err);
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Crear un turno programado para fecha futura u hoy
   */
  static async createSchedule(req, res) {
    try {
      const {
        branchId = 1,
        scheduledDate,
        appointmentTime,
        serviceId,
        counterId,
        userId,
        patientData,
        ticketType,
        notes
      } = req.body;

      if (!serviceId || !patientData || !patientData.documentNumber) {
        return res.status(400).json({
          success: false,
          error: 'CAMPOS_INCOMPLETOS',
          message: 'Debe seleccionar un servicio y proporcionar cédula del paciente.'
        });
      }

      const createdByUserId = req.user ? req.user.id : null;
      const result = await TicketService.createScheduledTicket({
        branchId: Number(branchId),
        scheduledDate,
        appointmentTime,
        serviceId: Number(serviceId),
        counterId: counterId ? Number(counterId) : null,
        userId: userId ? Number(userId) : null,
        patientData,
        ticketType,
        notes,
        createdByUserId
      });

      if (!result.is_duplicate) {
        socketHandler.emitTicketCreated(branchId, { ticket: result.ticket });
      }

      res.status(result.is_duplicate ? 200 : 201).json({
        success: true,
        ...result
      });
    } catch (err) {
      console.error('Error al programar turno:', err);
      res.status(400).json({ success: false, error: err.message, message: err.message });
    }
  }

  /**
   * Editar directamente un turno que NO ha sido llamado
   */
  static async editUncalled(req, res) {
    try {
      const ticketId = Number(req.params.id);
      const {
        patientData,
        serviceId,
        scheduledDate,
        appointmentTime,
        counterId,
        userId,
        ticketType,
        notes
      } = req.body;

      const modifiedByUserId = req.user ? req.user.id : null;

      const ticket = await TicketService.editUncalledTicket({
        ticketId,
        patientData,
        serviceId,
        scheduledDate,
        appointmentTime,
        counterId,
        userId,
        ticketType,
        notes,
        modifiedByUserId
      });

      socketHandler.emitTicketStatusChanged(ticket.branch_id, ticket);
      socketHandler.emitQueueUpdated(ticket.branch_id);

      res.json({
        success: true,
        message: 'Turno actualizado exitosamente.',
        ticket
      });
    } catch (err) {
      console.error('Error editando turno no llamado:', err);
      res.status(400).json({ success: false, error: err.message, message: err.message });
    }
  }

  /**
   * Cancelar directamente un turno que NO ha sido llamado
   */
  static async cancelUncalled(req, res) {
    try {
      const ticketId = Number(req.params.id);
      const { reason } = req.body;
      const cancelledByUserId = req.user ? req.user.id : null;

      const result = await TicketService.cancelUncalledTicket({
        ticketId,
        reason,
        cancelledByUserId
      });

      const branchId = Number(req.query.branchId || (req.user ? req.user.branch_id : 1) || 1);
      socketHandler.emitTicketStatusChanged(branchId, { id: ticketId, status: 'CANCELADO' });
      socketHandler.emitQueueUpdated(branchId);

      res.json(result);
    } catch (err) {
      console.error('Error cancelando turno no llamado:', err);
      res.status(400).json({ success: false, error: err.message, message: err.message });
    }
  }

}

module.exports = TicketController;
