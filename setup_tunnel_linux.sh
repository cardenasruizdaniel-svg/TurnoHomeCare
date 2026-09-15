#!/usr/bin/env bash
# ==============================================================================
# DEATurnos - Configuración de Acceso Remoto desde Afuera de la Red (Internet)
# Soporta Cloudflare Tunnel (cloudflared), LocalTunnel y Certbot SSL
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "   DEATurnos - Configuración de Acceso Remoto (Internet / Afuera)    "
echo "======================================================================"
echo -e "${NC}"

echo -e "Seleccione la opción que desea utilizar para dar acceso desde fuera de la red:"
echo -e "1) ${BOLD}Cloudflare Tunnel (Recomendado)${NC}: HTTPS seguro y gratuito. No requiere abrir puertos en el router."
echo -e "2) ${BOLD}LocalTunnel Rápido${NC}: URL pública instantánea para pruebas o uso inmediato."
echo -e "3) ${BOLD}Certbot / Let's Encrypt SSL${NC}: Si posee un dominio propio apuntando a la IP pública de este servidor."
echo -e "4) Salir"
echo ""

read -p "Ingrese una opción [1-4]: " OPTION

case $OPTION in
  1)
    echo -e "${GREEN}[1/3] Instalando Cloudflare Tunnel (cloudflared)...${NC}"
    if ! command -v cloudflared &> /dev/null; then
      if command -v apt-get &> /dev/null; then
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /etc/apt/keyrings/cloudflare-main.gpg >/dev/null
        echo "deb [signed-by=/etc/apt/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs 2>/dev/null || echo 'bookworm') main" | tee /etc/apt/sources.list.d/cloudflared.list
        apt-get update && apt-get install -y cloudflared
      else
        curl -L --output /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
        chmod +x /usr/local/bin/cloudflared
      fi
    fi

    echo -e "${GREEN}[2/3] Iniciando túnel rápido de Cloudflare para el puerto 5000...${NC}"
    echo -e "${YELLOW}Generando URL pública con HTTPS encriptado...${NC}"
    
    # Detener túnel previo si existía
    pm2 stop deaturnos-tunnel 2>/dev/null || true
    pm2 delete deaturnos-tunnel 2>/dev/null || true

    pm2 start "cloudflared tunnel --url http://localhost:5000" --name "deaturnos-tunnel"
    pm2 save

    sleep 4
    echo -e "${GREEN}[3/3] ¡Túnel Cloudflare activo en segundo plano!${NC}"
    echo -e "Para ver la URL pública generada por Cloudflare, ejecute:"
    echo -e "  ${CYAN}pm2 logs deaturnos-tunnel${NC}"
    ;;

  2)
    echo -e "${GREEN}Iniciando LocalTunnel para puerto 5000...${NC}"
    pm2 stop deaturnos-tunnel 2>/dev/null || true
    pm2 delete deaturnos-tunnel 2>/dev/null || true

    pm2 start "npx localtunnel --port 5000" --name "deaturnos-tunnel"
    pm2 save

    sleep 3
    echo -e "${GREEN}¡LocalTunnel iniciado!${NC}"
    echo -e "Para ver la URL generada en vivo, ejecute:"
    echo -e "  ${CYAN}pm2 logs deaturnos-tunnel${NC}"
    ;;

  3)
    read -p "Ingrese su nombre de dominio (ej: turnos.miclinica.com): " DOMAIN_NAME
    if [ -z "$DOMAIN_NAME" ]; then
      echo -e "${RED}Dominio no válido.${NC}"
      exit 1
    fi

    echo -e "${GREEN}Instalando Certbot y generando certificado SSL...${NC}"
    if command -v apt-get &> /dev/null; then
      apt-get install -y certbot python3-certbot-nginx
    fi

    certbot --nginx -d "$DOMAIN_NAME"
    echo -e "${GREEN}¡Certificado SSL instalado correctamente para $DOMAIN_NAME!${NC}"
    ;;

  *)
    echo "Operación cancelada."
    exit 0
    ;;
esac
