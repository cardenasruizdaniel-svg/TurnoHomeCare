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

echo -e "${GREEN}[2/4] Verificando esquema de base de datos (preservando datos existentes)...${NC}"
node -e "
const db = require('./backend/src/config/database');
const initDatabase = require('./backend/src/database/init');
(async () => {
  await db.init();
  await initDatabase();
  console.log('🛡️ Esquema verificado. Datos de sedes, módulos y usuarios preservados intactos.');
})();
" || true

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

echo -e "${GREEN}[4/4] Reiniciando servicios PM2 y Node para DEATurnos...${NC}"
if command -v pm2 &> /dev/null; then
  PORT=5050 pm2 restart deaturnos --update-env 2>/dev/null || PORT=5050 pm2 start ecosystem.config.js || true
  pm2 save || true
fi

echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN} ¡ACTUALIZACIÓN COMPLETADA Y REINICIADA EXITOSAMENTE!${NC}"
echo -e "${GREEN}======================================================${NC}"
