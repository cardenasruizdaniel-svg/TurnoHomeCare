-- ==========================================================
-- DEATurnos - Esquema PostgreSQL para Producción en Render
-- ==========================================================

-- 1. Empresas / Instituciones
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nit VARCHAR(100),
    logo_url TEXT,
    slogan TEXT DEFAULT 'Bienestar en casa.',
    primary_color VARCHAR(50) DEFAULT '#e1136c',
    secondary_color VARCHAR(50) DEFAULT '#00b0b9',
    accent_color VARCHAR(50) DEFAULT '#7cb518',
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sedes
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(100),
    business_hours TEXT DEFAULT 'Lunes a Viernes: 7:00 AM - 6:00 PM | Sábados: 8:00 AM - 1:00 PM',
    qr_code_slug VARCHAR(100) UNIQUE,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Roles del Sistema
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 4. Usuarios / Funcionarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Servicios / Consultas
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    letter_prefix VARCHAR(10) NOT NULL DEFAULT 'A',
    priority_prefix VARCHAR(10) NOT NULL DEFAULT 'P',
    estimated_minutes INTEGER DEFAULT 15,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Módulos / Consultorios / Ventanillas
CREATE TABLE IF NOT EXISTS counters (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    current_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Servicios Habilitados por Módulo (M:N)
CREATE TABLE IF NOT EXISTS counter_services (
    counter_id INTEGER NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (counter_id, service_id)
);

-- 8. Pacientes / Usuarios Ciudadanos
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    document_number VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK(age >= 0 AND age <= 130),
    phone VARCHAR(100) NOT NULL,
    is_priority_auto INTEGER DEFAULT 0 CHECK(is_priority_auto IN (0, 1)),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_doc ON patients(document_number);

-- 9. Turnos (Tickets)
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    counter_id INTEGER REFERENCES counters(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ticket_type VARCHAR(50) NOT NULL DEFAULT 'NORMAL' CHECK(ticket_type IN ('NORMAL', 'PRIORITARIO', 'ESPECIAL')),
    status VARCHAR(50) NOT NULL DEFAULT 'ESPERANDO' CHECK(status IN ('PROGRAMADO', 'CONFIRMADO', 'ESPERANDO', 'LLAMADO', 'EN_ATENCION', 'FINALIZADO', 'NO_PRESENTO', 'CANCELADO', 'PAUSADO')),
    sequence_number INTEGER NOT NULL,
    created_date VARCHAR(20) NOT NULL,
    scheduled_date VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP,
    attended_at TIMESTAMP,
    completed_at TIMESTAMP,
    wait_time_seconds INTEGER DEFAULT 0,
    attention_time_seconds INTEGER DEFAULT 0,
    call_count INTEGER DEFAULT 0,
    appointment_time VARCHAR(20),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_branch_status ON tickets(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_date ON tickets(created_date);
CREATE INDEX IF NOT EXISTS idx_tickets_scheduled_date ON tickets(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tickets_patient ON tickets(patient_id);

-- 10. Trazabilidad de Eventos del Turno
CREATE TABLE IF NOT EXISTS ticket_events (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    counter_id INTEGER REFERENCES counters(id) ON DELETE SET NULL,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Configuraciones Dinámicas del Sistema
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    data_type VARCHAR(50) NOT NULL DEFAULT 'string' CHECK(data_type IN ('string', 'number', 'boolean', 'json')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_settings_branch_key UNIQUE(branch_id, key)
);

-- 12. Registro de Auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(255) NOT NULL,
    entity_id VARCHAR(255),
    ip_address VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
