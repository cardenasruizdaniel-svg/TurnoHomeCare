const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middlewares/auth');

// Controladores
const AuthController = require('../controllers/authController');
const TicketController = require('../controllers/ticketController');
const ServiceController = require('../controllers/serviceController');
const CounterController = require('../controllers/counterController');
const BranchController = require('../controllers/branchController');
const UserController = require('../controllers/userController');
const SettingsController = require('../controllers/settingsController');
const StatsController = require('../controllers/statsController');
const AuditController = require('../controllers/auditController');
const TunnelController = require('../controllers/tunnelController');

// -------------------------------------------------------------
// 0. CONTROL DE TÚNEL PÚBLICO (4G / 5G)
// -------------------------------------------------------------
router.get('/tunnel/status', TunnelController.getStatus);
router.post('/tunnel/start', TunnelController.start);
router.post('/tunnel/stop', TunnelController.stop);

// -------------------------------------------------------------
// 1. RUTAS DE AUTENTICACIÓN
// -------------------------------------------------------------
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticateToken, AuthController.getMe);

// -------------------------------------------------------------
// 2. RUTAS PÚBLICAS (Móvil, QR, Pantalla TV)
// -------------------------------------------------------------
router.get('/patients/check/:documentNumber', TicketController.checkPatient);
router.post('/tickets/request', TicketController.requestTicket);
router.get('/tickets/track/:id', TicketController.trackTicket);
router.get('/tickets/public-display/:branchId', TicketController.getPublicDisplay);
router.get('/services/public', ServiceController.getAll);
router.get('/branches/public', BranchController.getAll);
router.get('/branches/:id/public', BranchController.getById);
router.get('/settings/public', SettingsController.getAll);
router.get('/counters/public', CounterController.getAll);

// -------------------------------------------------------------
// 3. RUTAS DE FUNCIONARIO / ATENCIÓN DE VENTANILLA (Protegidas)
// -------------------------------------------------------------
router.get('/tickets/queue/:branchId?', authenticateToken, TicketController.getWaitingQueue);
router.post('/tickets/call-next', authenticateToken, TicketController.callNext);
router.post('/tickets/:id/recall', authenticateToken, TicketController.recall);
router.post('/tickets/:id/start-attention', authenticateToken, TicketController.startAttention);
router.post('/tickets/:id/complete', authenticateToken, TicketController.complete);
router.post('/tickets/:id/transfer', authenticateToken, TicketController.transfer);
router.post('/tickets/:id/no-show', authenticateToken, TicketController.markNoShow);
router.post('/tickets/:id/pause', authenticateToken, TicketController.pause);

// -------------------------------------------------------------
// 4. RUTAS DE ADMINISTRACIÓN Y SUPERVISIÓN (Protegidas)
// -------------------------------------------------------------
// Métricas y Dashboard
router.get('/stats/dashboard', authenticateToken, StatsController.getDashboard);
router.get('/stats/history', authenticateToken, StatsController.getHistory);
router.get('/stats/export-csv', authenticateToken, StatsController.exportCSV);

// Servicios
router.get('/services', authenticateToken, ServiceController.getAll);
router.post('/services', authenticateToken, requireRole(['ADMIN']), ServiceController.create);
router.put('/services/:id', authenticateToken, requireRole(['ADMIN']), ServiceController.update);
router.patch('/services/:id/toggle', authenticateToken, requireRole(['ADMIN']), ServiceController.toggleActive);

// Módulos / Ventanillas
router.get('/counters', authenticateToken, CounterController.getAll);
router.post('/counters', authenticateToken, requireRole(['ADMIN']), CounterController.create);
router.put('/counters/:id', authenticateToken, requireRole(['ADMIN']), CounterController.update);

// Sedes
router.get('/branches', authenticateToken, BranchController.getAll);
router.get('/branches/:id', authenticateToken, BranchController.getById);
router.post('/branches', authenticateToken, requireRole(['ADMIN']), BranchController.create);
router.put('/branches/:id', authenticateToken, requireRole(['ADMIN']), BranchController.update);

// Usuarios y Roles
router.get('/users', authenticateToken, requireRole(['ADMIN', 'SUPERVISOR']), UserController.getAll);
router.get('/roles', authenticateToken, requireRole(['ADMIN']), UserController.getRoles);
router.post('/users', authenticateToken, requireRole(['ADMIN']), UserController.create);
router.put('/users/:id', authenticateToken, requireRole(['ADMIN']), UserController.update);

// Configuraciones del Sistema
router.get('/settings', authenticateToken, SettingsController.getAll);
router.post('/settings', authenticateToken, requireRole(['ADMIN']), SettingsController.updateBatch);
router.post('/settings/reset-daily-queue', authenticateToken, requireRole(['ADMIN']), SettingsController.resetDailyQueue);

// Auditoría
router.get('/audit', authenticateToken, requireRole(['ADMIN', 'SUPERVISOR']), AuditController.getLogs);

module.exports = router;
