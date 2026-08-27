const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('deaturnos_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    localStorage.removeItem('deaturnos_token');
    localStorage.removeItem('deaturnos_user');
    if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/atencion')) {
      window.location.href = '/login';
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Error en la petición al servidor');
  }
  return data;
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/auth/me'),

  // Public / Mobile / QR
  checkPatient: (documentNumber) => request(`/patients/check/${encodeURIComponent(documentNumber)}`),
  requestTicket: (payload) => request('/tickets/request', { method: 'POST', body: JSON.stringify(payload) }),
  trackTicket: (ticketId) => request(`/tickets/track/${ticketId}`),
  getPublicDisplay: (branchId = 1) => request(`/tickets/public-display/${branchId}`),
  getPublicBranches: () => request('/branches/public'),
  getPublicBranch: (id) => request(`/branches/${id}/public`),
  getPublicServices: () => request('/services/public'),
  getPublicCounters: () => request('/counters/public'),
  getPublicSettings: () => request('/settings/public'),

  // Funcionario / Atención
  getWaitingQueue: (branchId, counterId) => request(`/tickets/queue/${branchId || ''}${counterId ? `?counterId=${counterId}` : ''}`),
  callNextTicket: (payload) => request('/tickets/call-next', { method: 'POST', body: JSON.stringify(payload) }),
  recallTicket: (id) => request(`/tickets/${id}/recall`, { method: 'POST' }),
  startAttention: (id) => request(`/tickets/${id}/start-attention`, { method: 'POST' }),
  completeTicket: (id, notes) => request(`/tickets/${id}/complete`, { method: 'POST', body: JSON.stringify({ notes }) }),
  transferTicket: (id, payload) => request(`/tickets/${id}/transfer`, { method: 'POST', body: JSON.stringify(payload) }),
  markNoShow: (id) => request(`/tickets/${id}/no-show`, { method: 'POST' }),
  pauseTicket: (id) => request(`/tickets/${id}/pause`, { method: 'POST' }),

  // Administración
  getDashboardStats: (branchId, date) => request(`/stats/dashboard?${new URLSearchParams({ ...(branchId ? { branchId } : {}), ...(date ? { date } : {}) }).toString()}`),
  getTicketHistory: (params) => request(`/stats/history?${new URLSearchParams(params || {}).toString()}`),
  getExportCSVUrl: (params) => `${API_BASE}/stats/export-csv?${new URLSearchParams(params || {}).toString()}`,

  // CRUD Servicios
  getServices: (all = true) => request(`/services?all=${all}`),
  createService: (data) => request('/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id, data) => request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleServiceActive: (id) => request(`/services/${id}/toggle`, { method: 'PATCH' }),

  // CRUD Módulos
  getCounters: (branchId) => request(`/counters${branchId ? `?branchId=${branchId}` : ''}`),
  createCounter: (data) => request('/counters', { method: 'POST', body: JSON.stringify(data) }),
  updateCounter: (id, data) => request(`/counters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // CRUD Sedes
  getBranches: () => request('/branches'),
  getBranch: (id) => request(`/branches/${id}`),
  createBranch: (data) => request('/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id, data) => request(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // CRUD Usuarios y Roles
  getUsers: () => request('/users'),
  getRoles: () => request('/roles'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Configuración y Copias de Seguridad
  getSettings: () => request('/settings'),
  updateSettings: (payload) => request('/settings', { method: 'POST', body: JSON.stringify(payload) }),
  resetDailyQueue: (branchId) => request('/settings/reset-daily-queue', { method: 'POST', body: JSON.stringify({ branchId }) }),
  getBackupDownloadUrl: () => `${API_BASE}/settings/backup/download?token=${localStorage.getItem('deaturnos_token') || ''}`,
  createBackupSnapshot: () => request('/settings/backup/create', { method: 'POST' }),

  // Túnel de Acceso Público (4G/5G)
  getTunnelStatus: () => request('/tunnel/status'),
  startTunnel: (subdomain) => request('/tunnel/start', { method: 'POST', body: JSON.stringify({ subdomain }) }),
  stopTunnel: () => request('/tunnel/stop', { method: 'POST' }),

  // Auditoría
  getAuditLogs: (params) => request(`/audit?${new URLSearchParams(params || {}).toString()}`)
};
