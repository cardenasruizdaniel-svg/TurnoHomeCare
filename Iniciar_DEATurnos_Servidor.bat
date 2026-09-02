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
    echo DATABASE_URL=postgres://postgres@localhost:5432/deaturnos >> .env
    echo JWT_SECRET=deaturnos_super_secret_jwt_key_homecare_2026 >> .env
    echo ENABLE_TUNNEL=false >> .env
)

echo [1/2] Verificando base de datos PostgreSQL local...
node src/database/init.js >nul 2>&1
node src/database/syncServicesAndCounters.js >nul 2>&1

echo [2/2] Activando servicios de red (Backend: 5000 | Frontend: 5173)...
start "DEATurnos API Backend" /min cmd /c "cd /d ""%ROOT_DIR%\backend"" && npm start"
start "DEATurnos App Frontend" /min cmd /c "cd /d ""%ROOT_DIR%\frontend"" && npm run dev"

timeout /t 4 >nul
start http://localhost:5173

echo =========================================================================
echo  ¡SISTEMA ACTIVO Y EN EJECUCION TRANSPARENTE!
echo  Acceso Local: http://localhost:5173
echo  Servidor API: http://localhost:5000/api
echo =========================================================================
exit
