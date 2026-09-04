# 📖 Manual de Instalación y Operación del Servidor DEATurnos (HomeCare Enterprise)

Este manual contiene las instrucciones completas paso a paso para instalar y operar **DEATurnos (HomeCare Enterprise)** en cualquier computador con **Windows** en **cualquier disco (`C:\`, `D:\`, `E:\`, etc.)**, garantizando inicio transparente al encender el equipo y acceso desde cualquier computador o tablet de la red local sin errores de proxy o caídas.

---

## 📌 Requisitos Previos del Sistema

Antes de iniciar la instalación en el computador servidor, asegúrese de contar con los siguientes programas instalados:

1. **Sistema Operativo**: Windows 10, Windows 11 o Windows Server (64 bits).
2. **Node.js LTS** (Versión 18, 20 o 24):
   - Descarga oficial: [https://nodejs.org/](https://nodejs.org/)
   - Durante la instalación, deje todas las opciones por defecto y presione *Next*.
3. **PostgreSQL** (Versión 14, 15 o 16):
   - Descarga oficial: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
   - Puerto por defecto: `5432`.
   - Usuario por defecto: `postgres`.

---

## 🚀 Paso 1: Ubicación de la Carpeta en Cualquier Disco

El sistema **DEATurnos** incluye un detector de rutas dinámico (`%~dp0`), por lo cual puede copiar o mover la carpeta del proyecto a **cualquier disco o ubicación deseada**:

- Ejemplos válidos de instalación:
  - `C:\DEATurnos`
  - `C:\Program Files\DEATurnos`
  - `D:\DEATurnos`
  - `E:\Sistemas\DEATurnos`

> 💡 **Nota**: No requiere modificar ningún archivo de configuración. El sistema detectará automáticamente en qué disco y carpeta fue ubicado.

---

## ⚙️ Paso 2: Instalación Automatizada de 1 Clic (`INSTALAR_SISTEMA.bat`)

1. Abra la carpeta donde copió el proyecto (por ejemplo `C:\DEATurnos`).
2. Haga **clic derecho** sobre el archivo:
   ```cmd
   INSTALAR_SISTEMA.bat
   ```
3. Seleccione **Ejecutar como Administrador** (o haga doble clic sobre él).

### ¿Qué realiza el instalador automáticamente?
- **Paso 1/6**: Configura dinámicamente las variables de entorno `.env`.
- **Paso 2/6**: Instala todos los paquetes y librerías del sistema.
- **Paso 3/6**: Compila la interfaz web para producción (eliminando dependencias de servidores de desarrollo y errores de proxy).
- **Paso 4/6**: Genera la base de datos `deaturnos` en el PostgreSQL local (`localhost:5432`), crea las 12 tablas oficiales e importa todos los datos y usuarios existentes.
- **Paso 5/6**: Crea el acceso directo oficial en el **Escritorio de Windows**:
  - 🖥️ **`DEATurnos - HomeCare Enterprise`**
- **Paso 6/6**: Registra el inicio automático en la carpeta **`Startup` de Windows** para que el servidor arranque solo al encender el computador.

---

## 🖥️ Paso 3: Uso Diario y Acceso Transparente (Puerto 5000)

### A. Al Encender el Computador Servidor
- El programa se ejecutará automáticamente en segundo plano al iniciar sesión en Windows.
- Se abrirá la interfaz del sistema en el navegador web automáticamente en **`http://localhost:5000`**.

### B. Mediante el Acceso Directo del Escritorio
- Simplemente haga doble clic en el acceso directo del escritorio:
  **`DEATurnos - HomeCare Enterprise`**

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
   http://192.168.1.50:5000
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

## 🛠️ Archivos Ejecutables en la Carpeta Raíz

Para evitar confusiones, la carpeta del proyecto ha sido depurada y solo contiene **3 ejecutables oficiales**:

1. ⚙️ **`INSTALAR_SISTEMA.bat`**: Ejecutador principal para instalar el servidor en cualquier máquina.
2. 🚀 **`INICIAR_SISTEMA.bat`**: Ejecutador del servicio en puerto 5000 (usado por el acceso directo y el inicio automático de Windows).
3. 🔑 **`configurar_clave_postgres.bat`**: Herramienta rápida si su instalación de PostgreSQL exige una clave personalizada.
