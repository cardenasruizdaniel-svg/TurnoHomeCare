@echo off
chcp 65001 >nul
title DEATurnos - Servidor con Túnel Público para Celulares (4G/5G)
color 0D

echo ================================================================
echo         INICIANDO DEATURNOS CON TÚNEL PÚBLICO (4G/5G)
echo ================================================================
echo.
echo [INFO] Generando túnel seguro HTTPS para que los pacientes
echo        puedan solicitar su turno desde su celular con datos móviles.
echo.

:: Verificar instalación
if not exist "%~dp0backend\node_modules\" (
    echo [INFO] Instalando dependencias por primera vez...
    call "%~dp0INSTALAR_TODO.bat"
)

:: Compilar frontend si no existe dist
if not exist "%~dp0frontend\dist\" (
    echo [INFO] Compilando frontend para producción...
    cd "%~dp0frontend"
    call npm run build
    cd "%~dp0"
)

start "" powershell -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5000'"

cd "%~dp0backend"
node src/server.js --tunnel

pause
