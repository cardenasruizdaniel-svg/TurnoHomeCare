@echo off
TITLE Aplicador de Actualizaciones - DEATurnos
COLOR 0A
cls

echo ======================================================================
echo          DEATurnos - Aplicador de Actualización del Sistema
echo ======================================================================
echo.
echo Este proceso tomará los archivos ubicados en la carpeta "actualizacion"
echo y los aplicará de forma limpia sin afectar la información registrada
echo (turnos, pacientes, sedes, configuraciones ni base de datos).
echo.
pause

node backend/src/updater.js
if %errorlevel% neq 0 (
    COLOR 0C
    echo.
    echo [ERROR] Ocurrio un problema durante la actualizacion.
    pause
    exit /b %errorlevel%
)

echo.
echo Recompilando vista del sistema...
cd frontend
call npm run build
cd ..

echo.
echo ======================================================================
echo    ¡ACTUALIZACIÓN COMPLETADA CON ÉXITO!
echo    Puede reiniciar el sistema ejecutando INICIAR_SISTEMA.bat
echo ======================================================================
echo.
pause
