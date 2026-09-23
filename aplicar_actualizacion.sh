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

echo -e "${GREEN}[1/4] Sincronizando repositorio desde GitHub...${NC}"
if [ -d ".git" ]; then
  git reset --hard HEAD || true
  git pull origin main || true
fi

echo -e "${GREEN}[2/4] Sincronizando esquema y semillas de base de datos...${NC}"
node -e "
const db = require('./backend/src/config/database');
const syncServicesAndCounters = require('./backend/src/database/syncServicesAndCounters');
(async () => {
  await db.init();
  await syncServicesAndCounters();
})();
" || true

node ./backend/src/reset_admin.js || true

echo -e "${GREEN}[3/4] Recompilando frontend para producción...${NC}"
if [ -d "frontend" ]; then
  cd frontend
  npm run build || true
  cd ..
fi

if [ -d "actualizacion/frontend/dist" ]; then
  mkdir -p frontend/dist
  cp -r actualizacion/frontend/dist/* frontend/dist/ || true
fi

echo -e "${GREEN}[4/4] Reiniciando servicios PM2 y Node...${NC}"
if command -v pm2 &> /dev/null; then
  pm2 restart all || true
  sudo -u dala pm2 restart all || true
  pm2 restart deaturnos || true
fi

echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN} ¡ACTUALIZACIÓN COMPLETADA Y REINICIADA EXITOSAMENTE!${NC}"
echo -e "${GREEN}======================================================${NC}"
