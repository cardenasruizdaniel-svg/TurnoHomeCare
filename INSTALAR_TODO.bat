@echo off
chcp 65001 >nul
title DEATurnos - Instalador Automatizado
color 0B

echo ================================================================
echo           INSTALADOR COMPLETO DE DEATURNOS PRO
echo   Sistema Profesional de Gestión de Turnos con QR y Prioridad
echo ================================================================
echo.

:: 1. Verificar si Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js no está instalado o no se encuentra en el PATH.
    echo Por favor descargue e instale Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/5] Verificando entorno Node.js y npm...
node -v
npm -v
echo.

:: 2. Instalar dependencias raíz
echo [2/5] Instalando dependencias de la raíz...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Falló la instalación de dependencias raíz.
    pause
    exit /b 1
)
echo.

:: 3. Instalar dependencias del Backend y sembrar base de datos
echo [3/5] Instalando Backend y configurando Base de Datos SQLite...
cd backend
call npm install
call npm run seed
cd ..
echo.

:: 4. Instalar Frontend y compilar bundle de producción
echo [4/5] Instalando y compilando Frontend (Vite + Tailwind)...
cd frontend
call npm install
call npm run build
cd ..
echo.

:: 5. Crear acceso directo en el Escritorio
echo [5/5] Creando acceso directo en el Escritorio de Windows...
call CREAR_ACCESO_DIRECTO.bat
echo.

color 0A
echo ================================================================
echo   ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!
echo ================================================================
echo.
echo Ahora puedes iniciar el sistema haciendo doble click en:
echo  1. El acceso directo 'DEATurnos' creado en tu Escritorio
echo  2. O en el archivo 'INICIAR_SISTEMA.bat' en esta carpeta.
echo.
echo Accesos y Credenciales:
echo  - Administrador: admin / admin123
echo  - Supervisor:    supervisor / super123
echo  - Funcionario:   funcionario1 / func123
echo.
pause
