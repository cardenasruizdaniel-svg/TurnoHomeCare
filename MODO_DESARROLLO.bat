@echo off
chcp 65001 >nul
title DEATurnos - Modo Desarrollo (Hot Reload)
color 0E

echo ================================================================
echo             INICIANDO DEATURNOS EN MODO DESARROLLO
echo ================================================================
echo.
echo Backend:  http://localhost:5000/api
echo Frontend: http://localhost:5173 (con Hot Module Reload)
echo.

start "" powershell -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5173'"

cd "%~dp0"
call npm run dev

pause
