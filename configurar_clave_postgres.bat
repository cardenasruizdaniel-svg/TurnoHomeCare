@echo off
title Configurar Clave de PostgreSQL - DEATurnos
color 0B
echo =========================================================================
echo       DEATurnos - Configurar Contraseña de PostgreSQL Local
echo =========================================================================
echo.
echo Ingrese la contraseña de su usuario 'postgres' local de este equipo:
set /p CLAVE=

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

cd /d "%ROOT_DIR%\backend"
node -e "
const fs = require('fs');
const path = require('path');
const pass = process.argv[1] || '';
const envPath = path.join(process.cwd(), '.env');
let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const url = 'DATABASE_URL=postgres://postgres:' + pass + '@localhost:5432/deaturnos';
if (text.includes('DATABASE_URL=')) {
  text = text.replace(/DATABASE_URL=.*/g, url);
} else {
  text += '\n' + url + '\n';
}
fs.writeFileSync(envPath, text, 'utf8');
console.log('✅ Contraseña guardada en backend/.env');
" "%CLAVE%"

node src/database/setup_pg_database.js

echo.
echo Presione cualquier tecla para cerrar...
pause
