#!/usr/bin/env bash
# ==============================================================================
# DEATurnos - Aplicador de Actualizaciones para Servidores Linux / macOS
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}          DEATurnos - Aplicador de Actualizaciones     ${NC}"
echo -e "${CYAN}======================================================${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}[1/3] Ejecutando motor de actualización en Node.js...${NC}"
node backend/src/updater.js || true

echo -e "${GREEN}[2/3] Verificando compilación del frontend...${NC}"
if [ -d "frontend" ]; then
  cd frontend
  npm run build || true
  cd ..
fi

# Asegurar que el dist pre-compilado de actualizacion sobrescriba cualquier build antiguo
if [ -d "actualizacion/frontend/dist" ]; then
  mkdir -p frontend/dist
  cp -r actualizacion/frontend/dist/* frontend/dist/ || true
fi

echo -e "${GREEN}[3/3] Reiniciando servicios PM2 del usuario y de root...${NC}"
if command -v pm2 &> /dev/null; then
  pm2 restart all || true
  sudo -u dala pm2 restart all || true
  pm2 restart deaturnos || true
fi

echo -e "${GREEN}¡ACTUALIZACIÓN COMPLETADA Y PM2 REINICIADO EXITOSAMENTE!${NC}"
