@echo off
title DEATurnos - HomeCare Enterprise (Local con PostgreSQL)
color 0A
echo =========================================================================
echo       DEATurnos (HomeCare Enterprise) - Iniciador Local PostgreSQL
echo =========================================================================
echo.

echo [1/3] Verificando entorno y conexion a PostgreSQL local...
cd /d "d:\PROGRAMAS\DEATurnos\backend"
if not exist .env (
    echo PORT=5000 > .env
    echo NODE_ENV=development >> .env
    echo DATABASE_URL=postgres://postgres@localhost:5432/deaturnos >> .env
    echo JWT_SECRET=deaturnos_super_secret_jwt_key_homecare_2026 >> .env
    echo ENABLE_TUNNEL=false >> .env
)

echo [2/3] Sincronizando base de datos PostgreSQL local...
node src/database/init.js
node src/database/syncServicesAndCounters.js

echo.
echo [3/3] Iniciando Servidor Backend (Puerto 5000) y Frontend (Puerto 5173)...
echo.
echo Presione cualquier tecla si desea abrir la aplicacion en el navegador...
echo.

start "DEATurnos Backend API" cmd /k "cd /d d:\PROGRAMAS\DEATurnos\backend && npm run dev"
start "DEATurnos Frontend Application" cmd /k "cd /d d:\PROGRAMAS\DEATurnos\frontend && npm run dev"

timeout /t 3 >nul
start http://localhost:5173

echo =========================================================================
echo   !SISTEMA LOCAL EN EJECUCION CON BASE DE DATOS POSTGRESQL EN PUERTO 5432!
echo   Frontend: http://localhost:5173
echo   Backend API: http://localhost:5000/api
echo =========================================================================
pause
