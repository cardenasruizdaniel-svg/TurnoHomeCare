#!/usr/bin/env bash
# ==============================================================================
# DEATurnos - Script de Instalación Automatizado y Limpio para Servidor Linux
# Soporta: Ubuntu, Debian, CentOS, AlmaLinux, Rocky Linux y derivados.
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "    DEATurnos - Instalador Automatizado para Servidor Linux          "
echo "======================================================================"
echo -e "${NC}"

# 1. Verificar permisos de Root / Sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Este script debe ejecutarse con privilegios de superusuario (sudo).${NC}"
  echo -e "Por favor ejecute: ${YELLOW}sudo bash install_linux.sh${NC}"
  exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}[1/7] Detectando sistema operativo y actualizando paquetes...${NC}"

if command -v apt-get &> /dev/null; then
  PKG_MANAGER="apt"
  apt-get update -y
  apt-get install -y curl git build-essential sqlite3 nginx ufw ca-certificates gnupg
elif command -v dnf &> /dev/null; then
  PKG_MANAGER="dnf"
  dnf install -y curl git gcc-c++ make sqlite nginx firewalld ca-certificates
elif command -v yum &> /dev/null; then
  PKG_MANAGER="yum"
  yum install -y curl git gcc-c++ make sqlite nginx firewalld ca-certificates
else
  echo -e "${RED}[ERROR] Gestor de paquetes no soportado. Instale Node.js 20+ y Nginx manualmente.${NC}"
  exit 1
fi

# 2. Instalar Node.js 20 LTS si no está instalado o versión es antigua
echo -e "${GREEN}[2/7] Verificando instalación de Node.js (20 LTS recomendado)...${NC}"
NEED_NODE=true

if command -v node &> /dev/null; then
  NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VER" -ge 18 ]; then
    echo -e "${CYAN}-> Node.js v$(node -v) detectado.${NC}"
    NEED_NODE=false
  fi
fi

if [ "$NEED_NODE" = true ]; then
  echo -e "${YELLOW}-> Instalando Node.js 20 LTS...${NC}"
  if [ "$PKG_MANAGER" = "apt" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  else
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs || yum install -y nodejs
  fi
fi

# 3. Instalar PM2 para gestión en segundo plano de Node.js
echo -e "${GREEN}[3/7] Instalando gestor de procesos PM2...${NC}"
npm install -g pm2 --silent || true

# 4. Instalar dependencias del proyecto
echo -e "${GREEN}[4/7] Instalando dependencias de Backend y Frontend...${NC}"
npm run install:all

# 5. Compilar el Frontend para producción
echo -e "${GREEN}[5/7] Compilando aplicación de Frontend (Vite)...${NC}"
npm run build

# 6. Inicializar base de datos SQLite y seed de datos iniciales
echo -e "${GREEN}[6/7] Inicializando base de datos...${NC}"
cd backend
npm run seed || true
cd ..

# Crear carpeta de datos si no existe y ajustar permisos
mkdir -p backend/data
chmod -R 777 backend/data

# 7. Configuración de PM2 y autostart del servidor
echo -e "${GREEN}[7/7] Configurando servicio PM2 en segundo plano...${NC}"
pm2 stop deaturnos 2>/dev/null || true
pm2 delete deaturnos 2>/dev/null || true

pm2 start ecosystem.config.js
pm2 save

# Habilitar inicio automático con el sistema
pm2 startup systemd -u root --hp /root || true

# 8. Configuración opcional de Nginx
if command -v nginx &> /dev/null; then
  echo -e "${CYAN}-> Configurando Nginx como Proxy Inverso...${NC}"
  if [ -d "/etc/nginx/sites-available" ]; then
    cp nginx_deaturnos.conf /etc/nginx/sites-available/deaturnos.conf
    ln -sf /etc/nginx/sites-available/deaturnos.conf /etc/nginx/sites-enabled/default || true
    ln -sf /etc/nginx/sites-available/deaturnos.conf /etc/nginx/sites-enabled/deaturnos.conf || true
  elif [ -d "/etc/nginx/conf.d" ]; then
    cp nginx_deaturnos.conf /etc/nginx/conf.d/deaturnos.conf
  fi

  nginx -t && systemctl restart nginx || true
  systemctl enable nginx || true
fi

# 9. Configuración del Firewall
echo -e "${CYAN}-> Configurando reglas de Firewall (Permitiendo puertos HTTP 80 y 5000)...${NC}"
if command -v ufw &> /dev/null; then
  ufw allow 80/tcp || true
  ufw allow 5000/tcp || true
elif command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-port=80/tcp || true
  firewall-cmd --permanent --add-port=5000/tcp || true
  firewall-cmd --reload || true
fi

# Obtener dirección IP Local de la máquina Linux
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo -e "${GREEN}${BOLD}"
echo "======================================================================"
echo "    ¡INSTALACIÓN COMPLETADA EXITOSAMENTE EN SU SERVIDOR LINUX!      "
echo "======================================================================"
echo -e "${NC}"
echo -e "📌 Acceso Local (Red Local): ${CYAN}http://${LOCAL_IP}${NC} o ${CYAN}http://${LOCAL_IP}:5000${NC}"
echo -e "📌 Pantalla TV:              ${CYAN}http://${LOCAL_IP}/pantalla${NC}"
echo -e "📌 Panel de Administración:  ${CYAN}http://${LOCAL_IP}/admin${NC}"
echo -e "📌 Panel de Atención:        ${CYAN}http://${LOCAL_IP}/modulo${NC}"
echo -e ""
echo -e "${YELLOW}======================================================================${NC}"
echo -e "${YELLOW} 🌐 ACCESO DESDE AFUERA DE LA RED (INTERNET):${NC}"
echo -e " Para activar el acceso remoto público por HTTPS gratuito y sin abrir puertos,"
echo -e " ejecute el siguiente comando en cualquier momento:"
echo -e " ${CYAN}sudo bash setup_tunnel_linux.sh${NC}"
echo -e "${YELLOW}======================================================================${NC}"
