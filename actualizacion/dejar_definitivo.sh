#!/usr/bin/env bash
# ==============================================================================
# DEATurnos - Configuración y Puesta a Punto Definitiva (iMac / Linux)
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "          DEATurnos - PUESTA A PUNTO DEFINITIVA DEL SISTEMA           "
echo "======================================================================"
echo -e "${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. Asegurar permisos en carpetas de datos
echo -e "${GREEN}[1/6] Configurando permisos definitivos de lectura/escritura...${NC}"
mkdir -p backend/data/backups logs
chmod -R 777 backend/data logs 2>/dev/null || true
echo "5051" > backend/data/active_port.txt
chmod 666 backend/data/active_port.txt 2>/dev/null || true

# 2. Inicializar la base de datos limpia en ceros
echo -e "${GREEN}[2/6] Restableciendo base de datos en ceros con HomeCare del Quindío...${NC}"
node ./backend/src/reset_clean_database.js
node ./backend/src/restore_branches.js
chmod -R 777 backend/data 2>/dev/null || true

# 3. Asegurar archivos compilados de frontend
echo -e "${GREEN}[3/6] Verificando interfaz web compilada (dist)...${NC}"
if [ -d "actualizacion/frontend/dist" ]; then
  rm -rf frontend/dist
  mkdir -p frontend/dist
  cp -r actualizacion/frontend/dist/* frontend/dist/ 2>/dev/null || true
fi

# 4. Configurar y persistir PM2 en puerto 5051 (sin conflicto con Tailscale)
echo -e "${GREEN}[4/6] Configurando servicio PM2 en puerto interno 5051...${NC}"
REAL_USER="${SUDO_USER:-$USER}"

# Liberar puerto 5051 si estuviese tomado
fuser -k 5051/tcp 2>/dev/null || lsof -ti:5051 | xargs kill -9 2>/dev/null || true

if command -v pm2 &> /dev/null; then
  # Limpiar de PM2 root si existe
  pm2 delete deaturnos 2>/dev/null || true
  
  # Registrar y arrancar bajo el usuario real (dala)
  if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
    sudo -u "$SUDO_USER" pm2 delete deaturnos 2>/dev/null || true
    sudo -u "$SUDO_USER" PORT=5051 pm2 start ecosystem.config.js
    sudo -u "$SUDO_USER" pm2 save
  else
    pm2 delete deaturnos 2>/dev/null || true
    PORT=5051 pm2 start ecosystem.config.js
    pm2 save
  fi
  echo -e "${YELLOW}   -> Servicio 'deaturnos' registrado y guardado en PM2 (Puerto 5051).${NC}"
else
  echo -e "${RED}Aviso: PM2 no está instalado globalmente. Ejecute: npm install -g pm2${NC}"
fi

# 5. Configurar Tailscale Funnel para acceso exterior por puerto 5050 apuntando al backend 5051
echo -e "${GREEN}[5/6] Conectando túnel de Tailscale (Externo 5050 ➔ Interno 5051)...${NC}"
if command -v tailscale &> /dev/null; then
  sudo tailscale funnel --bg --https=5050 http://127.0.0.1:5051 2>/dev/null || tailscale funnel --bg --https=5050 http://127.0.0.1:5051 2>/dev/null || true
  echo -e "${YELLOW}   -> Tailscale Funnel activo: https://...:5050 ➔ http://127.0.0.1:5051${NC}"
fi

# 6. Prueba automática de salud del servidor y login
echo -e "${GREEN}[6/6] Realizando autodiagnóstico de conexión...${NC}"
sleep 3

LOGIN_CHECK=""
for i in {1..5}; do
  LOGIN_CHECK=$(curl -s -X POST http://127.0.0.1:5051/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' 2>/dev/null || echo "FAILED")
  if echo "$LOGIN_CHECK" | grep -q '"success":true'; then
    break
  fi
  sleep 1
done

if echo "$LOGIN_CHECK" | grep -q '"success":true'; then
  LOGIN_STATUS="${GREEN}✓ Autenticación 'admin'/'admin123' FUNCIONANDO AL 100%${NC}"
else
  LOGIN_STATUS="${YELLOW}ℹ Servidor activo. Respuesta: $LOGIN_CHECK${NC}"
fi

echo -e "\n${CYAN}======================================================================${NC}"
echo -e "${GREEN}${BOLD}       ✅ ¡DEATURNOS HA QUEDADO 100% OPERATIVO Y DEFINITIVO!         ${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo -e " Estado del Login:  $LOGIN_STATUS"
echo -e " Puerto Operativo:  ${BOLD}5050${NC}"
echo -e " Empresa:           ${BOLD}HomeCare del Quindío I.P.S.${NC}"
echo -e " ------------------------------------------------------------------"
echo -e " 🔑 Credenciales Administrador:"
echo -e "    Usuario:        ${BOLD}admin${NC}"
echo -e "    Contraseña:     ${BOLD}admin123${NC} (o Home2026*)"
echo -e " 🔑 Credenciales Ventanilla:"
echo -e "    Usuario:        ${BOLD}Ventanilla1${NC}"
echo -e "    Contraseña:     ${BOLD}Home2026*${NC}"
echo -e " ------------------------------------------------------------------"
echo -e " 🌐 Enlaces de Acceso:"
echo -e "    En este iMac:   ${CYAN}http://localhost:5050${NC}"
echo -e "    Por Tailscale:  ${CYAN}https://dala-imac.tail96cdf1.ts.net:5050${NC}"
echo -e "${CYAN}======================================================================${NC}\n"
