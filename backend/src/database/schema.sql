-- ==========================================================
-- DEATurnos - Esquema de Base de Datos SQLite (WAL Mode)
-- ==========================================================

PRAGMA foreign_keys = ON;

-- 1. Empresas / Instituciones
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    nit TEXT,
    logo_url TEXT,
    slogan TEXT DEFAULT 'Bienestar en casa.',
    primary_color TEXT DEFAULT '#e1136c',
    secondary_color TEXT DEFAULT '#00b0b9',
    accent_color TEXT DEFAULT '#7cb518',
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sedes
CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    business_hours TEXT DEFAULT 'Lunes a Viernes: 7:00 AM - 6:00 PM | Sábados: 8:00 AM - 1:00 PM',
    qr_code_slug TEXT UNIQUE,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 3. Roles del Sistema
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE, -- 'ADMIN', 'SUPERVISOR', 'FUNCIONARIO'
    description TEXT
);

-- 4. Usuarios / Funcionarios
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER,
    role_id INTEGER NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 5. Servicios / Consultas
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    code TEXT NOT NULL, -- 'CG', 'CM', 'CE', 'OM'
    name TEXT NOT NULL,
    description TEXT,
    letter_prefix TEXT NOT NULL DEFAULT 'A',
    priority_prefix TEXT NOT NULL DEFAULT 'P',
    estimated_minutes INTEGER DEFAULT 15,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 6. Módulos / Consultorios / Ventanillas
CREATE TABLE IF NOT EXISTS counters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    code TEXT NOT NULL, -- 'MOD-1', 'CONS-3'
    name TEXT NOT NULL, -- 'Módulo 1', 'Consultorio 3'
    current_user_id INTEGER,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (current_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Servicios Habilitados por Módulo (M:N)
CREATE TABLE IF NOT EXISTS counter_services (
    counter_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    PRIMARY KEY (counter_id, service_id),
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- 8. Pacientes / Usuarios Ciudadanos
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK(age >= 0 AND age <= 130),
    phone TEXT NOT NULL,
    is_priority_auto INTEGER DEFAULT 0 CHECK(is_priority_auto IN (0, 1)),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_doc ON patients(document_number);

-- 9. Turnos (Tickets)
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT NOT NULL, -- e.g. 'A-024', 'P-012'
    branch_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    counter_id INTEGER,
    user_id INTEGER,
    ticket_type TEXT NOT NULL DEFAULT 'NORMAL' CHECK(ticket_type IN ('NORMAL', 'PRIORITARIO', 'ESPECIAL')),
    status TEXT NOT NULL DEFAULT 'ESPERANDO' CHECK(status IN ('ESPERANDO', 'LLAMADO', 'EN_ATENCION', 'FINALIZADO', 'NO_PRESENTO', 'CANCELADO', 'PAUSADO')),
    sequence_number INTEGER NOT NULL,
    created_date TEXT NOT NULL, -- YYYY-MM-DD para reinicio diario
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    called_at DATETIME,
    attended_at DATETIME,
    completed_at DATETIME,
    wait_time_seconds INTEGER DEFAULT 0,
    attention_time_seconds INTEGER DEFAULT 0,
    call_count INTEGER DEFAULT 0,
    appointment_time TEXT, -- Hora asignada de cita e.g. '10:30' o '08:00'
    notes TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_branch_status ON tickets(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_date ON tickets(created_date);
CREATE INDEX IF NOT EXISTS idx_tickets_patient ON tickets(patient_id);

-- 10. Trazabilidad de Eventos del Turno
CREATE TABLE IF NOT EXISTS ticket_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    user_id INTEGER,
    counter_id INTEGER,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL
);

-- 11. Configuraciones Dinámicas del Sistema
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER, -- NULL = Configuración Global
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    data_type TEXT NOT NULL DEFAULT 'string' CHECK(data_type IN ('string', 'number', 'boolean', 'json')),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, key)
);

-- 12. Registro de Auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    ip_address TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
