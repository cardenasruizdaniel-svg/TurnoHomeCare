let ioInstance = null;

function setupSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // console.log(`[Socket] Cliente conectado: ${socket.id}`);

    // Unirse a la sala de una sede
    socket.on('join_branch', (branchId) => {
      const room = `branch_${branchId}`;
      socket.join(room);
      // console.log(`[Socket] ${socket.id} se unió a ${room}`);
    });

    // Unirse a la sala de seguimiento de un turno específico
    socket.on('join_ticket', (ticketId) => {
      const room = `ticket_${ticketId}`;
      socket.join(room);
      // console.log(`[Socket] ${socket.id} siguiendo turno ${room}`);
    });

    socket.on('disconnect', () => {
      // console.log(`[Socket] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  return ioInstance;
}

/**
 * Notificaciones en tiempo real
 */
function emitTicketCreated(branchId, ticketData) {
  if (!ioInstance) return;
  ioInstance.to(`branch_${branchId}`).emit('ticket:created', ticketData);
}

function emitTicketCalled(branchId, ticketData) {
  if (!ioInstance) return;
  // Emitir a la pantalla pública y funcionarios de la sede
  ioInstance.to(`branch_${branchId}`).emit('ticket:called', ticketData);
  // Emitir al suscriptor individual del turno móvil
  if (ticketData && ticketData.id) {
    ioInstance.to(`ticket_${ticketData.id}`).emit('ticket:my_status', ticketData);
  }
}

function emitTicketRecalled(branchId, ticketData) {
  if (!ioInstance) return;
  ioInstance.to(`branch_${branchId}`).emit('ticket:recalled', ticketData);
  if (ticketData && ticketData.id) {
    ioInstance.to(`ticket_${ticketData.id}`).emit('ticket:my_status', ticketData);
  }
}

function emitTicketStatusChanged(branchId, ticketData) {
  if (!ioInstance) return;
  ioInstance.to(`branch_${branchId}`).emit('ticket:status_changed', ticketData);
  if (ticketData && ticketData.id) {
    ioInstance.to(`ticket_${ticketData.id}`).emit('ticket:my_status', ticketData);
  }
}

function emitQueueUpdated(branchId) {
  if (!ioInstance) return;
  ioInstance.to(`branch_${branchId}`).emit('queue:updated', { branchId });
}

function emitConfigUpdated(branchId = null) {
  if (!ioInstance) return;
  if (branchId) {
    ioInstance.to(`branch_${branchId}`).emit('config:updated', { branchId });
  } else {
    ioInstance.emit('config:updated', { global: true });
  }
}

module.exports = {
  setupSocket,
  getIO,
  emitTicketCreated,
  emitTicketCalled,
  emitTicketRecalled,
  emitTicketStatusChanged,
  emitQueueUpdated,
  emitConfigUpdated
};
