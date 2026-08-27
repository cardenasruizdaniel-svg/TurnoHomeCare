@echo off
chcp 65001 >nul
title DEATurnos - Servidor en Ejecución
color 0A

echo ================================================================
echo                      INICIANDO DEATURNOS PRO
echo        Sistema Profesional de Gestión de Turnos con QR
echo ================================================================
echo.

:: Verificar si existe la carpeta node_modules en backend
if not exist "%~dp0backend\node_modules\" (
    color 0C
    echo [AVISO] Las dependencias no están instaladas.
    echo Ejecutando instalador automático por primera vez...
    echo.
    call "%~dp0INSTALAR_TODO.bat"
)

:: Si frontend dist no existe, compilarlo
if not exist "%~dp0frontend\dist\" (
    echo [INFO] Compilando frontend para producción...
    cd "%~dp0frontend"
    call npm run build
    cd "%~dp0"
)

echo [INFO] Iniciando Servidor API y WebSockets en http://localhost:5000 ...
echo [INFO] Abriendo navegador automáticamente...
echo.

:: Abrir navegador tras 2 segundos
start "" powershell -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5000'"

cd "%~dp0backend"
node src/server.js

pause
