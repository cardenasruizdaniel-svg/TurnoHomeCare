const db = require('../config/database');

class StatsService {
  /**
   * Obtiene las métricas KPI en tiempo real para el Dashboard
   */
  static getDashboardStats(branchId = null, targetDate = null) {
    const date = targetDate || new Date().toISOString().slice(0, 10);
    const branchFilter = branchId ? 'AND branch_id = ?' : '';
    const params = branchId ? [date, branchId] : [date];

    // 1. Conteo general
    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'FINALIZADO' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'ESPERANDO' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status IN ('LLAMADO', 'EN_ATENCION') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'NO_PRESENTO' THEN 1 ELSE 0 END) as no_show,
        SUM(CASE WHEN status = 'CANCELADO' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN ticket_type = 'PRIORITARIO' THEN 1 ELSE 0 END) as priority_count,
        SUM(CASE WHEN ticket_type = 'NORMAL' THEN 1 ELSE 0 END) as normal_count,
        AVG(CASE WHEN wait_time_seconds > 0 THEN wait_time_seconds ELSE NULL END) as avg_wait_seconds,
        AVG(CASE WHEN attention_time_seconds > 0 THEN attention_time_seconds ELSE NULL END) as avg_attention_seconds
      FROM tickets
      WHERE created_date = ? ${branchFilter}
    `).get(...params);

    const avgWaitMinutes = totals.avg_wait_seconds ? Math.round(totals.avg_wait_seconds / 60) : 0;
    const avgAttentionMinutes = totals.avg_attention_seconds ? Math.round(totals.avg_attention_seconds / 60) : 0;

    // 2. Turnos por hora (06:00 a 20:00)
    const hourly = db.prepare(`
      SELECT 
        strftime('%H', created_at) as hour,
        COUNT(*) as count
      FROM tickets
      WHERE created_date = ? ${branchFilter}
      GROUP BY hour
      ORDER BY hour ASC
    `).all(...params);

    // 3. Distribución por servicio
    const byService = db.prepare(`
      SELECT 
        s.id as service_id,
        s.name as service_name,
        s.code as service_code,
        COUNT(t.id) as count
      FROM services s
      LEFT JOIN tickets t ON t.service_id = s.id AND t.created_date = ? ${branchId ? 'AND t.branch_id = ' + Number(branchId) : ''}
      WHERE s.is_active = 1
      GROUP BY s.id, s.name, s.code
      ORDER BY count DESC
    `).all(date);

    // 4. Productividad por funcionario
    const byUser = db.prepare(`
      SELECT 
        u.id as user_id,
        u.full_name,
        COUNT(t.id) as attended_count,
        AVG(t.attention_time_seconds) as avg_att_sec
      FROM users u
      JOIN tickets t ON t.user_id = u.id AND t.created_date = ? AND t.status = 'FINALIZADO' ${branchId ? 'AND t.branch_id = ' + Number(branchId) : ''}
      GROUP BY u.id, u.full_name
      ORDER BY attended_count DESC
    `).all(date);

    return {
      date,
      total_tickets: totals.total_tickets || 0,
      completed: totals.completed || 0,
      waiting: totals.waiting || 0,
      in_progress: totals.in_progress || 0,
      no_show: totals.no_show || 0,
      cancelled: totals.cancelled || 0,
      priority_count: totals.priority_count || 0,
      normal_count: totals.normal_count || 0,
      avg_wait_minutes: avgWaitMinutes,
      avg_attention_minutes: avgAttentionMinutes,
      hourly_distribution: hourly,
      by_service: byService,
      by_user: byUser.map(u => ({
        ...u,
        avg_attention_minutes: u.avg_att_sec ? Math.round(u.avg_att_sec / 60) : 0
      }))
    };
  }

  /**
   * Consulta el historial detallado de turnos con filtros
   */
  static getTicketHistory({
    branchId = null,
    startDate = null,
    endDate = null,
    serviceId = null,
    status = null,
    ticketType = null,
    userId = null,
    search = null,
    limit = 100,
    offset = 0
  }) {
    let sql = `
      SELECT 
        t.*,
        s.name as service_name, s.code as service_code,
        b.name as branch_name,
        c.name as counter_name,
        u.full_name as user_name,
        p.full_name as patient_name, p.document_number, p.age as patient_age, p.phone as patient_phone
      FROM tickets t
      JOIN services s ON t.service_id = s.id
      JOIN branches b ON t.branch_id = b.id
      JOIN patients p ON t.patient_id = p.id
      LEFT JOIN counters c ON t.counter_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (branchId) {
      sql += ' AND t.branch_id = ?';
      params.push(branchId);
    }
    if (startDate) {
      sql += ' AND t.created_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND t.created_date <= ?';
      params.push(endDate);
    }
    if (serviceId) {
      sql += ' AND t.service_id = ?';
      params.push(serviceId);
    }
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }
    if (ticketType) {
      sql += ' AND t.ticket_type = ?';
      params.push(ticketType);
    }
    if (userId) {
      sql += ' AND t.user_id = ?';
      params.push(userId);
    }
    if (search) {
      sql += ' AND (t.ticket_number LIKE ? OR p.document_number LIKE ? OR p.full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Total count for pagination
    const countSql = sql.replace(/SELECT\s+[\s\S]+?\s+FROM/, 'SELECT COUNT(*) as total FROM');
    const totalCount = db.prepare(countSql).get(...params).total;

    sql += ' ORDER BY t.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(sql).all(...params);

    return {
      total: totalCount,
      limit,
      offset,
      data: rows.map(r => ({
        ...r,
        wait_time_minutes: r.wait_time_seconds ? (r.wait_time_seconds / 60).toFixed(1) : 0,
        attention_time_minutes: r.attention_time_seconds ? (r.attention_time_seconds / 60).toFixed(1) : 0
      }))
    };
  }

  /**
   * Genera CSV para exportación rápida
   */
  static exportTicketsCSV(filters) {
    const result = this.getTicketHistory({ ...filters, limit: 5000, offset: 0 });
    const headers = [
      'ID', 'Numero_Turno', 'Tipo', 'Estado', 'Sede', 'Servicio',
      'Documento_Paciente', 'Nombre_Paciente', 'Edad', 'Telefono',
      'Modulo_Consultorio', 'Funcionario', 'Fecha_Creacion', 'Hora_Llamado',
      'Hora_Finalizacion', 'Tiempo_Espera_Min', 'Tiempo_Atencion_Min', 'Veces_Llamado'
    ];

    const rows = result.data.map(t => [
      t.id,
      `"${t.ticket_number}"`,
      `"${t.ticket_type}"`,
      `"${t.status}"`,
      `"${t.branch_name}"`,
      `"${t.service_name}"`,
      `"${t.document_number}"`,
      `"${t.patient_name}"`,
      t.patient_age,
      `"${t.patient_phone || ''}"`,
      `"${t.counter_name || ''}"`,
      `"${t.user_name || ''}"`,
      `"${t.created_at}"`,
      `"${t.called_at || ''}"`,
      `"${t.completed_at || ''}"`,
      t.wait_time_minutes,
      t.attention_time_minutes,
      t.call_count
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csvContent;
  }
}

module.exports = StatsService;
