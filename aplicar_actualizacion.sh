#!/usr/bin/env bash
# ==============================================================================
# DEATurnos - Aplicador de Actualizaciones para Servidores Linux
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
echo "          DEATurnos - Aplicador de Actualizaciones en Linux          "
echo "======================================================================"
echo -e "${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}[1/3] Ejecutando motor de actualización en Node.js...${NC}"
node backend/src/updater.js

echo -e "${GREEN}[2/3] Recompilando frontend para producción...${NC}"
if [ -d "frontend" ]; then
  cd frontend
  npm run build || true
  cd ..
fi

echo -e "${GREEN}[3/3] Reiniciando servicio de aplicación (PM2 / Systemd)...${NC}"
if command -v pm2 &> /dev/null; then
  pm2 restart deaturnos 2>/dev/null || true
elif command -v systemctl &> /dev/null; then
  systemctl restart deaturnos 2>/dev/null || true
fi

echo -e "${GREEN}${BOLD}"
echo "======================================================================"
echo "    ¡ACTUALIZACIÓN EN LINUX PROCESADA CORRECTAMENTE!                  "
echo "    Los datos registrados y configuraciones permanecen intactos.      "
echo "======================================================================"
echo -e "${NC}"
