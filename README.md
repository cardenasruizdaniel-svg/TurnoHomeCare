# DEATurnos - Sistema Profesional de Gestión de Turnos Inteligente con QR

**DEATurnos** es una plataforma SaaS-ready para la gestión, despacho y asignación inteligente de turnos mediante códigos QR, síntesis de voz, clasificación automática de prioridad por edad (adulto mayor), visualización pública en pantallas de TV, panel ergonómico de ventanilla para funcionarios y panel administrativo ejecutivo con analítica y reportes exportables.

Diseñado con arquitectura modular para instituciones prestadoras de salud (**IPS, clínicas, consultorios**), entidades públicas, bancos y centros de atención ciudadana.

---

## 🌟 Características Principales

1. **Pantalla Pública para TV / Monitores (`/pantalla` o `/tv/:branchId`)**:
   - Visualización de ultra alto contraste del turno en llamada (ej: `A-024` o `P-012`) con destellos animados.
   - Indicación del servicio (`CONSULTA GENERAL`) y consultorio/módulo (`Consultorio 3`).
   - Código QR dinámico de alta resolución para que los pacientes soliciten su turno desde su celular.
   - Carrusel/Ticker de los últimos 5 a 10 turnos llamados con marcas de tiempo.
   - **Sistema de Audio Dual**: Campana melódica (ding-dong Web Audio) y **Locución de Voz Sintetizada (TTS)** en español (*"Turno A-024, por favor dirigirse al consultorio 3"*).

2. **Solicitud de Turnos desde el Celular (`/solicitar-turno`)**:
   - Identificación ágil por número de cédula/documento.
   - Si el usuario ya existe en base de datos: saludo personalizado (*"¡Hola Carlos!"*) y selección de servicio en 1 solo paso.
   - Si el usuario es nuevo: Formulario express validado (Cédula, Nombre Completo, Edad, Celular).
   - **Clasificación Automática por Edad**: Configurado por defecto a $\ge 60$ años (`EDAD_PRIORIDAD = 60`), asignando turno prioritario (`P-001`) sin requerir selección manual del paciente.
   - **Prevención de Turnos Duplicados**: Impide que la misma cédula genere múltiples turnos simultáneos en espera.
   - **Seguimiento en Vivo (`/mi-turno/:id`)**: El paciente ve en tiempo real cuántas personas van antes, el turno actual en llamada y recibe una alerta sonora/vibratoria cuando es llamado.

3. **Algoritmo de Prioridad Inteligente (Anti-Bloqueo)**:
   - **Ratio Configurable (por defecto 2:1)**: Por cada 2 turnos normales llamados, se llama automáticamente 1 prioritario (`A-001`, `A-002`, `P-001`, `A-003`, `A-004`, `P-002`...).
   - **Anti-Starvation / Sin Bloqueos**: Si no hay turnos prioritarios en espera, el sistema atiende normalmente; si no hay normales, despacha prioritarios sin detener la fila.
   - **Bloqueo Atómico de Concurrencia**: Transacciones que garantizan que dos funcionarios nunca llamen al mismo turno simultáneamente.

4. **Panel Ergonómico de Funcionario / Ventanilla (`/atencion`)**:
   - Selección de módulo o consultorio asignado.
   - Vista del turno actual en llamada o atención con datos del paciente.
   - Botones rápidos: **LLAMAR SIGUIENTE**, **VOLVER A LLAMAR** (re-call sonoro en TV), **INICIAR ATENCIÓN / FINALIZAR**, **NO SE PRESENTÓ** y **PAUSAR**.
   - Lista en tiempo real de la cola de espera y sugerencia del **SIGUIENTE RECOMENDADO**.

5. **Panel Administrativo & Dashboard Ejecutivo (`/admin/*`)**:
   - **Dashboard**: Métricas en vivo (Turnos hoy, Atendidos, En espera, Prioritarios, Tiempos promedio de espera y atención), gráficos de afluencia por hora, distribución por servicio y productividad por médico/funcionario.
   - **Historial & Reportes**: Filtros multicriterio, consulta de marcas de tiempo y **Exportación directa a CSV / Excel**.
   - **Gestión de Servicios**: CRUD de servicios médicos, prefijos de letra, duraciones estimadas y estados.
   - **Gestión de Módulos**: Configuración de consultorios/ventanillas y mapeo de servicios que atiende cada uno.
   - **Gestión de Sedes & Pósters QR**: Multi-sede con descarga e impresión de pósters oficiales en QR.
   - **Usuarios y Roles**: Control de accesos (Admin, Supervisor, Funcionario).
   - **Configuración Global**: Ajuste dinámico de edad prioritaria, proporción 2:1, volumen, locución de voz y branding institucional (nombre, NIT, colores).
6. **Túnel de Acceso Público para Celulares (4G / 5G)**:
   - **Cero Fricción para el Paciente**: Los usuarios pueden solicitar su turno escaneando el QR desde su celular usando sus propios datos móviles (4G/5G) sin tener que conectarse al Wi-Fi institucional.
   - **Activación en 1 Clic**: El administrador puede activar el túnel seguro HTTPS desde `/admin/configuracion` o ejecutando `INICIAR_CON_TUNEL_PUBLICO.bat`.
   - **Actualización Automática de QR**: Cuando el túnel se activa, la pantalla pública de TV (`/pantalla`) y los pósters QR se actualizan inmediatamente con la URL pública HTTPS segura.

---

## 🛠️ Arquitectura Tecnológica

- **Backend**: Node.js + Express + Socket.IO + SQL.js / SQLite (WAL mode con persistencia atómica en disco) + JWT + Bcrypt.
- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons + Chart.js + QR Code SVG + Web Audio API & Web Speech Synthesis API.
- **Protocolo de Comunicación**: REST API + WebSockets bidireccionales por salas de sede (`branch_{id}`) y turnos individuales (`ticket_{id}`).

---

## 🚀 Instalación y Puesta en Marcha

### Requisitos Previos
- **Node.js** v18 o superior (incluyendo Node 20, 22, 24).
- **npm** v9 o superior.

### 1. Clonar e Instalar Dependencias
Desde la raíz del proyecto `d:\PROGRAMAS\DEATurnos`:

```bash
# Instalar dependencias de raíz, backend y frontend en un solo paso
npm run install:all
```

O de forma manual:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Ejecutar Pruebas Automatizadas (Unitarias y E2E)
```bash
cd backend
npm test          # Ejecuta las 10 pruebas unitarias del algoritmo de prioridad y reglas
npm run test:e2e  # Ejecuta las 14 pruebas de integración HTTP y WebSockets de flujo completo
```

### 3. Iniciar el Servidor en Desarrollo
Desde la raíz del proyecto:
```bash
npm run dev
```

Esto levantará concurrentemente:
- **Backend API & WebSockets**: `http://localhost:5000`
- **Frontend Web Application**: `http://localhost:5173`

---

## 🔑 Credenciales de Acceso por Defecto

El sistema incluye una siembra inicial con los siguientes usuarios demo:

| Rol | Usuario | Contraseña | Propósito |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `admin123` | Control total, configuración de reglas, reportes y sedes |
| **Supervisor** | `supervisor` | `super123` | Supervisión de colas, analítica y monitoreo |
| **Funcionario 1** | `funcionario1` | `func123` | Operador de Ventanilla 1 (Órdenes / Facturación) |
| **Funcionario 2** | `funcionario2` | `func123` | Médico Consultorio 1 (Medicina General) |

*Nota: La pantalla de Login (`/login`) cuenta con botones de acceso rápido con 1 solo click para cada perfil.*

---

## 👥 Pacientes de Prueba Precargados

| Cédula | Nombre Completo | Edad | Clasificación Automática |
| :--- | :--- | :--- | :--- |
| `10203040` | Carlos Pérez | 45 años | Normal (`A-xxx`) |
| `20304050` | María Gómez | 62 años | **Prioritario (60+)** (`P-xxx`) |
| `30405060` | Pedro Rodríguez | 71 años | **Prioritario (60+)** (`P-xxx`) |
| `40506070` | Ana Martínez | 34 años | Normal (`A-xxx`) |
| `50607080` | Guillermo Restrepo | 80 años | **Prioritario (60+)** (`P-xxx`) |
| `60708090` | Sofía Ramírez | 59 años | Normal (`A-xxx`) |

---

## 🧭 Mapa de Rutas Principales

### Rutas Públicas
- `/`: Portal principal con accesos directos y selector de sede.
- `/solicitar-turno`: Interfaz móvil interactiva para que el paciente solicite su turno.
- `/mi-turno/:id`: Pantalla de seguimiento en vivo en el celular del paciente.
- `/pantalla` o `/tv/:branchId`: Pantalla pública de alta visibilidad para televisores.

### Rutas Internas y de Administración
- `/login`: Inicio de sesión institucional con accesos rápidos demo.
- `/atencion`: Panel de atención en ventanilla y consultorios.
- `/admin/dashboard`: Métricas KPI, tiempos y gráficos de afluencia.
- `/admin/turnos`: Historial completo con filtros y exportación CSV/Excel.
- `/admin/servicios`: Catálogo de servicios y consultas médicas.
- `/admin/modulos`: Consultorios, ventanillas y asignación de servicios.
- `/admin/sedes`: Gestión de sedes y póster de impresión QR.
- `/admin/usuarios`: Gestión de funcionarios y roles.
- `/admin/configuracion`: Parámetros de prioridad (edad 60+, ratio 2:1), sonido y branding.
- `/admin/reportes`: Reporte consolidado imprimible.
- `/admin/auditoria`: Trazabilidad inmutable de acciones.

---

## ⚙️ Parámetros de Configuración del Sistema

Todas las reglas de negocio pueden ajustarse desde `/admin/configuracion` sin tocar código fuente:

- `EDAD_PRIORIDAD`: Edad mínima para clasificar automáticamente como prioritario (Default: `60`).
- `RATIO_PRIORIDAD`: Cantidad de turnos normales llamados por cada prioritario (Default: `2`).
- `PREFIJO_NORMAL`: Letra por defecto para turnos estándar (Default: `A`).
- `PREFIJO_PRIORITARIO`: Letra para turnos prioritarios (Default: `P`).
- `DIGITOS_NUMERACION`: Cantidad de dígitos en el consecutivo (Default: `3` ej: `001`).
- `SONIDO_CAMPANA`: Habilita o deshabilita la campana armónica ding-dong (Default: `true`).
- `VOZ_SINTETIZADA`: Habilita o deshabilita la locución hablada por altavoz (Default: `true`).
- `PLANTILLA_VOZ`: Frase pronunciada, compatible con variables `{ticket}` y `{counter}`.
- `PREVENIR_DUPLICADOS`: Impide que una misma cédula genere 2 turnos activos a la vez (Default: `true`).
- `REINICIO_DIARIO`: Reinicia la numeración cada medianoche conservando el historial (Default: `true`).

---

## 📄 Licencia

Desarrollado bajo licencia **MIT**. Listo para uso comercial y despliegue en entornos hospitalarios y empresariales.
