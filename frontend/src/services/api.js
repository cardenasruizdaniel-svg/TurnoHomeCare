const API_BASE = '/api';

function buildQueryString(params = {}) {
  const cleanParams = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '' && val !== 'undefined' && val !== 'null') {
      cleanParams[key] = val;
    }
  }
  const qs = new URLSearchParams(cleanParams).toString();
  return qs ? `?${qs}` : '';
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('deaturnos_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Error en la petición al servidor');
  }

  return data;
}

export const api = {
  // Autenticación
  login: (usernameOrCredentials, password) => {
    const body = typeof usernameOrCredentials === 'object' && usernameOrCredentials !== null
      ? usernameOrCredentials
      : { username: usernameOrCredentials, password };
    return request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
  },
  getMe: () => request('/auth/me'),

  // Datos Institucionales y Sedes
  getCompany: () => request('/branches/public'),
  getBranches: () => request('/branches'),
  getPublicBranches: () => request('/branches/public'),
  createBranch: (data) => request('/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id, data) => request(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBranch: (id) => request(`/branches/${id}`, { method: 'DELETE' }),

  // Servicios Médicos
  getServices: () => request('/services'),
  getPublicServices: () => request('/services/public'),
  createService: (data) => request('/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id, data) => request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteService: (id) => request(`/services/${id}`, { method: 'DELETE' }),

  // Módulos / Consultorios
  getCounters: (branchId) => request(`/counters${branchId ? `?branchId=${branchId}` : ''}`),
  createCounter: (data) => request('/counters', { method: 'POST', body: JSON.stringify(data) }),
  updateCounter: (id, data) => request(`/counters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCounter: (id) => request(`/counters/${id}`, { method: 'DELETE' }),

  // Usuarios / Funcionarios
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Pacientes
  checkPatient: (documentNumber) => request(`/patients/check/${documentNumber}`),

  // Turnos Operativos
  requestTicket: (ticketData) => request('/tickets/request', { method: 'POST', body: JSON.stringify(ticketData) }),
  callNextTicket: (data) => request('/tickets/call-next', { method: 'POST', body: JSON.stringify(data) }),
  callSpecificTicket: (data) => request('/tickets/call-specific', { method: 'POST', body: JSON.stringify(data) }),
  startAttention: (ticketIdOrData) => {
    const id = typeof ticketIdOrData === 'object' && ticketIdOrData !== null ? ticketIdOrData.id : ticketIdOrData;
    return request(`/tickets/${id}/start-attention`, { method: 'POST', body: JSON.stringify({ id }) });
  },
  completeTicket: (ticketIdOrData, notes = null) => {
    let id = ticketIdOrData;
    let bodyNotes = notes;
    if (typeof ticketIdOrData === 'object' && ticketIdOrData !== null) {
      id = ticketIdOrData.id || ticketIdOrData.ticketId;
      bodyNotes = ticketIdOrData.notes || notes;
    }
    return request(`/tickets/${id}/complete`, { method: 'POST', body: JSON.stringify({ id, notes: bodyNotes }) });
  },
  markNoShow: (ticketIdOrData) => {
    const id = typeof ticketIdOrData === 'object' && ticketIdOrData !== null ? ticketIdOrData.id : ticketIdOrData;
    return request(`/tickets/${id}/no-show`, { method: 'POST', body: JSON.stringify({ id }) });
  },
  transferTicket: (ticketIdOrData, data = {}) => {
    let id = ticketIdOrData;
    let payload = data;
    if (typeof ticketIdOrData === 'object' && ticketIdOrData !== null) {
      id = ticketIdOrData.id || ticketIdOrData.ticketId;
      payload = ticketIdOrData;
    }
    return request(`/tickets/${id}/transfer`, { method: 'POST', body: JSON.stringify({ id, ...payload }) });
  },
  pauseTicket: (ticketIdOrData) => {
    const id = typeof ticketIdOrData === 'object' && ticketIdOrData !== null ? ticketIdOrData.id : ticketIdOrData;
    return request(`/tickets/${id}/pause`, { method: 'POST', body: JSON.stringify({ id }) });
  },
  recallTicket: (ticketIdOrData) => {
    const id = typeof ticketIdOrData === 'object' && ticketIdOrData !== null ? ticketIdOrData.id : ticketIdOrData;
    return request(`/tickets/${id}/recall`, { method: 'POST', body: JSON.stringify({ id }) });
  },
  trackTicket: (id) => request(`/tickets/track/${id}`),

  // Colas y Pantalla Pública
  getWaitingQueue: (branchId, counterId) => request(`/tickets/queue/${branchId}${counterId ? `?counterId=${counterId}` : ''}`),
  getPublicDisplay: (branchId) => request(`/tickets/public-display/${branchId}`),

  // Estadísticas y Reportes
  getDashboardStats: (branchId, date) => request(`/stats/dashboard${buildQueryString({ branchId, date })}`),
  getTicketHistory: (params) => request(`/stats/tickets${buildQueryString(params)}`),
  getExportCSVUrl: (params) => `${API_BASE}/stats/export/csv${buildQueryString(params)}`,

  // Configuraciones y Branding
  getSettings: (branchId) => request(`/settings${branchId ? `?branchId=${branchId}` : ''}`),
  getPublicSettings: (branchId) => request(`/settings/public${branchId ? `?branchId=${branchId}` : ''}`),
  updateSetting: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  updateSettingsBatch: (data) => request('/settings/batch', { method: 'PUT', body: JSON.stringify(data) }),

  // Túnel de Acceso Público (4G/5G)
  getTunnelStatus: () => request('/tunnel/status'),
  startTunnel: (subdomain) => request('/tunnel/start', { method: 'POST', body: JSON.stringify({ subdomain }) }),
  stopTunnel: () => request('/tunnel/stop', { method: 'POST' }),

  // Auditoría
  getAuditLogs: (params) => request(`/audit${buildQueryString(params)}`),
  syncOfficialData: () => request('/settings/sync-official-data', { method: 'POST' }),

  // Programación de Turnos y Edición/Cancelación Directa
  getSchedule: (params) => request(`/schedule${buildQueryString(params)}`),
  createSchedule: (payload) => request('/schedule', { method: 'POST', body: JSON.stringify(payload) }),
  editUncalledTicket: (id, payload) => request(`/tickets/${id}/edit-uncalled`, { method: 'PUT', body: JSON.stringify(payload) }),
  cancelUncalledTicket: (id, reason) => request(`/tickets/${id}/cancel-uncalled`, { method: 'POST', body: JSON.stringify({ reason }) })
};
