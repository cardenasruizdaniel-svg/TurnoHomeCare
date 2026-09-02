# 📖 Manual de Instalación y Administración del Servidor DEATurnos (HomeCare Enterprise)

Este manual contiene las instrucciones completas paso a paso para convertir cualquier computador con sistema operativo **Windows** en el **Servidor Principal** de **DEATurnos (HomeCare Enterprise)**, permitiendo su instalación en **cualquier disco (`C:\`, `D:\`, `E:\`, etc.)**, inicio transparente al encender el equipo y acceso desde cualquier computador o tablet de la red local.

---

## 📌 Requisitos Previos del Sistema

Antes de iniciar la instalación en el computador servidor, asegúrese de contar con los siguientes programas instalados:

1. **Sistema Operativo**: Windows 10, Windows 11 o Windows Server (64 bits).
2. **Node.js LTS** (Versión 18 o 20):
   - Descarga oficial: [https://nodejs.org/](https://nodejs.org/)
   - Durante la instalación, deje todas las opciones por defecto y presione *Next*.
3. **PostgreSQL** (Versión 14, 15 o 16):
   - Descarga oficial: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
   - Puerto por defecto: `5432`.
   - Usuario por defecto: `postgres`.

---

## 🚀 Paso 1: Ubicación del Proyecto en Cualquier Disco

El sistema **DEATurnos** incluye un detector de rutas dinámico (`%~dp0`), por lo cual puede copiar o mover la carpeta del proyecto a **cualquier disco o ubicación deseada**:

- Ejemplos válidos de instalación:
  - `C:\DEATurnos`
  - `C:\Program Files\DEATurnos`
  - `D:\DEATurnos`
  - `E:\Sistemas\DEATurnos`

> 💡 **Nota**: No requiere modificar ningún archivo de configuración. El sistema detectará automáticamente en qué disco y carpeta fue ubicado.

---

## ⚙️ Paso 2: Instalación Automatizada con Un Solo Clic

1. Abra la carpeta donde copió el proyecto (por ejemplo `C:\DEATurnos`).
2. Haga **clic derecho** sobre el archivo:
   ```cmd
   Instalar_DEATurnos_Servidor.bat
   ```
3. Seleccione **Ejecutar como Administrador** (o haga doble clic sobre él).

### ¿Qué realiza el instalador automáticamente?
- **Paso 1**: Detecta dinámicamente la ruta y letra de disco donde se encuentra la aplicación.
- **Paso 2**: Instala los paquetes y dependencias de la aplicación (`npm install`).
- **Paso 3**: Genera la base de datos `deaturnos` en el motor local PostgreSQL (`localhost:5432`), crea las 12 tablas oficiales e importa todos los datos y usuarios existentes.
- **Paso 4**: Crea el acceso directo oficial en el **Escritorio de Windows**:
  - 🖥️ **`DEATurnos - Sistema de Turnos HomeCare`**
- **Paso 5**: Registra el inicio automático en la carpeta **`Startup` de Windows** para que el sistema arranque solo al encender el computador.

---

## 🖥️ Paso 3: Uso Diario y Acceso Transparente

### A. Al Encender el Computador Servidor
- El programa se ejecutará automáticamente en segundo plano al iniciar sesión en Windows.
- Se abrirá la interfaz del sistema en el navegador web automáticamente en `http://localhost:5173`.

### B. Mediante el Acceso Directo del Escritorio
- Simplemente haga doble clic en el acceso directo del escritorio:
  **`DEATurnos - Sistema de Turnos HomeCare`**

---

## 🌐 Paso 4: Acceso desde Otros Equipos de la Red Local (Ventanillas / Consultorios)

Para que los médicos y operadores de ventanilla puedan acceder al sistema desde sus computadores o tablets conectadas a la misma red Wi-Fi o cableada (LAN):

1. En el computador servidor, abra una terminal (CMD) y ejecute:
   ```cmd
   ipconfig
   ```
2. Identifique la dirección IP local de la máquina (ejemplo: `192.168.1.50` o `10.0.0.15`).
3. Desde los otros computadores o dispositivos de la clínica, abra Google Chrome o Edge e ingrese:
   ```text
   http://192.168.1.50:5173
   ```
4. El operador podrá iniciar sesión con su usuario asignado (ej: `Ventanilla1`, `Consultorio1`, etc.).

---

## 🔑 Credenciales Oficiales de Inicio de Sesión

| Usuario | Nombre visible | Rol | Contraseña por defecto |
|---|---|---|---|
| `admin` | Ing. Daniel Cárdenas Ruiz | Administrador General | `Home2026*` |
| `Consultorio1` | Consultorio 1 | Operador / Médico | `Home2026*` |
| `Ventanilla1` | Ventanilla 1 | Operador / Ventanilla | `Home2026*` |
| `Ventanilla2` | Ventanilla 2 | Operador / Ventanilla | `Home2026*` |
| `Entrevista1` | Entrevista 1 | Operador / Entrevista | `Home2026*` |
| `Entrevista2` | Entrevista 2 | Operador / Entrevista | `Home2026*` |

---

## 🛠️ Solución de Problemas Frecuentes

### 1. ¿Qué hacer si no abre la página web al encender el equipo?
- Haga doble clic en el acceso directo del escritorio **`DEATurnos - Sistema de Turnos HomeCare`** o ejecute `Iniciar_DEATurnos_Servidor.bat`.

### 2. ¿Qué hacer si se cambia de carpeta o de disco el proyecto?
- Simplemente ejecute de nuevo el archivo `Instalar_DEATurnos_Servidor.bat` en la nueva ubicación. El instalador actualizará automáticamente las rutas y los accesos directos.

### 3. ¿Cómo hacer una copia de seguridad (Backup)?
- Ejecute en la consola de comandos:
  ```cmd
  pg_dump -U postgres -d deaturnos -F c -f "C:\Backup_DEATurnos.dump"
  ```
