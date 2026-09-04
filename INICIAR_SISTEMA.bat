@echo off
setlocal enabledelayedexpansion
title DEATurnos - Servidor HomeCare Enterprise
color 0B

:: Detectar ruta raiz dinamicamente en cualquier disco (C:, D:, etc.)
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

echo =========================================================================
echo    HomeCare Enterprise - Servidor de Gestión de Turnos por Fechas
echo =========================================================================
echo  Ubicacion: %ROOT_DIR%
echo.

cd /d "%ROOT_DIR%\backend"
if not exist .env (
    echo PORT=5000 > .env
    echo NODE_ENV=development >> .env
    echo DATABASE_URL=postgres://postgres:admin123@localhost:5432/deaturnos >> .env
    echo JWT_SECRET=deaturnos_super_secret_jwt_key_homecare_2026 >> .env
    echo ENABLE_TUNNEL=false >> .env
)

echo [1/2] Verificando base de datos y esquema...
node src/database/init.js >nul 2>&1
node src/database/syncServicesAndCounters.js >nul 2>&1

echo [2/2] Activando Servidor Unificado DEATurnos (Puerto 5000)...
start "DEATurnos Servidor Unificado" /min cmd /c "cd /d ""%ROOT_DIR%\backend"" && npm start"

timeout /t 3 >nul
start http://localhost:5000

echo =========================================================================
echo  ¡SISTEMA ACTIVO Y EN EJECUCION TRANSPARENTE!
echo  Acceso Local: http://localhost:5000
echo  Servidor API: http://localhost:5000/api
echo =========================================================================
exit
