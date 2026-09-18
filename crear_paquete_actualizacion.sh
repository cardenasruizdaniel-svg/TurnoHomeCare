#!/usr/bin/env bash
# ==============================================================================
# DEATurnos - Generador de Paquete de Actualización para iMac y Servidores Linux
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "    DEATurnos - Generador de Paquete de Actualización (iMac / Linux)  "
echo "======================================================================"
echo -e "${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}[1/3] Compilando aplicación Frontend...${NC}"
if [ -d "frontend" ]; then
  cd frontend
  npm run build
  cd ..
fi

echo -e "${GREEN}[2/3] Empaquetando archivos de actualización en 'actualizacion/'...${NC}"
mkdir -p actualizacion/backend/src
mkdir -p actualizacion/frontend/dist

cp -rf backend/src/* actualizacion/backend/src/
cp -rf frontend/dist/* actualizacion/frontend/dist/
cp -f package.json actualizacion/
cp -f aplicar_actualizacion.sh actualizacion/
cp -f MANUAL_ACTUALIZACIONES.md actualizacion/

echo -e "${GREEN}[3/3] Generando archivo comprimido 'paquete_actualizacion.zip'...${NC}"
if command -v zip &> /dev/null; then
  zip -r -q paquete_actualizacion.zip actualizacion/
  echo -e " Archive generado: ${CYAN}paquete_actualizacion.zip${NC}"
fi

echo -e "${GREEN}${BOLD}"
echo "======================================================================"
echo " ¡PAQUETE DE ACTUALIZACIÓN PREPARADO EXITOSAMENTE!                    "
echo "======================================================================"
echo -e "${NC}"
echo -e "📌 Para aplicar en su iMac vía Tailscale / SSH:"
echo -e " ${YELLOW}1. Transferir el archivo paquete_actualizacion.zip o la carpeta actualizacion hacia el iMac:${NC}"
echo -e "    ${CYAN}scp -r actualizacion dala@<IP_TAILSCALE_IMAC>:/home/dala/PROGRAMAS/DEATurnero/${NC}"
echo -e " ${YELLOW}2. En la terminal del iMac ejecute:${NC}"
echo -e "    ${CYAN}cd /home/dala/PROGRAMAS/DEATurnero${NC}"
echo -e "    ${CYAN}sudo bash aplicar_actualizacion.sh${NC}"
echo -e ""
