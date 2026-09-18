@echo off
TITLE Creador de Paquete de Actualización - DEATurnos
COLOR 0D
cls

echo ======================================================================
echo       DEATurnos - Creador de Paquete de Actualización (iMac / Linux)
echo ======================================================================
echo.
echo Este script compilará el sistema y empaquetará las mejoras para
echo ser transferidas por Tailscale / SCP al equipo iMac o servidor Linux.
echo.
pause

echo.
echo [1/3] Compilando la versión más reciente del Frontend...
cd frontend
call npm run build
cd ..

echo.
echo [2/3] Preparando carpeta de actualización 'actualizacion'...
if not exist "actualizacion" mkdir actualizacion

echo Copiando archivos del Backend...
if not exist "actualizacion\backend\src" mkdir actualizacion\backend\src
xcopy /E /Y /I backend\src actualizacion\backend\src

echo Copiando frontend compilado...
if not exist "actualizacion\frontend\dist" mkdir actualizacion\frontend\dist
xcopy /E /Y /I frontend\dist actualizacion\frontend\dist

copy /Y package.json actualizacion\package.json
copy /Y aplicar_actualizacion.sh actualizacion\aplicar_actualizacion.sh
copy /Y MANUAL_ACTUALIZACIONES.md actualizacion\MANUAL_ACTUALIZACIONES.md

echo.
echo ======================================================================
echo  ✅ ¡CARPETA 'actualizacion' PREPARADA EXITOSAMENTE!
echo  
echo  Para actualizar su iMac a traves de Tailscale / SSH:
echo  1. Copie los archivos de la carpeta 'actualizacion' hacia el iMac en:
echo     /home/dala/PROGRAMAS/DEATurnero/actualizacion/
echo  2. En la terminal del iMac ejecute:
echo     cd /home/dala/PROGRAMAS/DEATurnero
echo     sudo bash aplicar_actualizacion.sh
echo ======================================================================
echo.
pause
