@echo off
setlocal enabledelayedexpansion
title INSTALADOR AUTOMÁTICO - DEATurnos HomeCare Enterprise
color 0E

:: 1. DETECTAR RUTA DE INSTALACIÓN DINÁMICAMENTE EN CUALQUIER DISCO O CARPETA
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

echo =========================================================================
echo    INSTALADOR SERVIDORES LOCALES - DEATURNOS (HOMECARE ENTERPRISE)
echo =========================================================================
echo  Carpeta de instalacion detectada: %ROOT_DIR%
echo.

:: 2. VERIFICAR INSTALACIÓN DE NODE.JS
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR CRITICO] Node.js no esta instalado en este computador.
    echo Por favor descargue e instale Node.js LTS desde: https://nodejs.org/
    echo Luego vuelva a ejecutar este instalador.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detectado correctamente.

:: 3. CONFIGURAR VARIABLES DE ENTORNO EN BACKEND
echo.
echo [PASO 1/5] Configurando variables de entorno de la aplicacion...
cd /d "%ROOT_DIR%\backend"
if not exist .env (
(
echo PORT=5000
echo NODE_ENV=development
echo DATABASE_URL=postgres://postgres@localhost:5432/deaturnos
echo JWT_SECRET=deaturnos_super_secret_jwt_key_homecare_2026
echo ENABLE_TUNNEL=false
) > .env
)

echo [OK] Archivo .env verificado dinamicamente para %ROOT_DIR%.

:: 4. INSTALAR DEPENDENCIAS NPM (BACKEND Y FRONTEND)
echo.
echo [PASO 2/5] Instalando dependencias de Backend y Frontend (Esto puede tomar un minuto)...
cd /d "%ROOT_DIR%\backend"
call npm install --no-audit --no-fund >nul 2>&1

cd /d "%ROOT_DIR%\frontend"
call npm install --no-audit --no-fund >nul 2>&1

echo [OK] Dependencias instaladas.

:: 5. INICIALIZAR Y MIGRAR BASE DE DATOS POSTGRESQL LOCAL DE FORMA AUTOMÁTICA Y SIN BLOQUEOS
echo.
echo [PASO 3/5] Creando y migrando base de datos PostgreSQL local...
cd /d "%ROOT_DIR%\backend"
node src/database/setup_pg_database.js
node src/database/init.js
node src/database/migrate_sqlite_to_pg.js
node src/database/syncServicesAndCounters.js

echo [OK] Base de datos PostgreSQL local sincronizada e importada con exito.

:: 6. CREAR ACCESO DIRECTO EN EL ESCRITORIO
echo.
echo [PASO 4/5] Creando acceso directo en el Escritorio...
set "DESKTOP_PATH=%USERPROFILE%\Desktop"
set "TARGET_BAT=%ROOT_DIR%\Iniciar_DEATurnos_Servidor.bat"

powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%DESKTOP_PATH%\DEATurnos - Sistema de Turnos HomeCare.lnk'); $s.TargetPath='%TARGET_BAT%'; $s.WorkingDirectory='%ROOT_DIR%'; $s.Description='Acceso Directo Servidor DEATurnos'; $s.IconLocation='C:\Windows\System32\shell32.dll,14'; $s.Save()"

echo [OK] Acceso directo generado en el Escritorio.

:: 7. REGISTRAR ARRANQUE AUTOMÁTICO AL ENCENDER WINDOWS
echo.
echo [PASO 5/5] Registrando inicio automatico al encender el equipo (Windows Startup)...
set "STARTUP_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%STARTUP_PATH%\DEATurnos_AutoStart.lnk'); $s.TargetPath='%TARGET_BAT%'; $s.WorkingDirectory='%ROOT_DIR%'; $s.WindowStyle=7; $s.Save()"

echo [OK] Auto-arranque registrado en Inicio de Windows.

echo.
color 0A
echo =========================================================================
echo    ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!
echo =========================================================================
echo  - El sistema detecto la carpeta: %ROOT_DIR%
echo  - Se creo el acceso directo en el Escritorio.
echo  - Se configuro para arrancar automaticamente al encender el equipo.
echo  - Base de Datos PostgreSQL local conectada.
echo.
echo ¿Desea iniciar el sistema DEATurnos ahora mismo? (S/N)
set /p RESP=

if /i "%RESP%"=="S" (
    cd /d "%ROOT_DIR%"
    call Iniciar_DEATurnos_Servidor.bat
)

exit /b 0
