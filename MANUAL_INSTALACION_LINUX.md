# 🐧 Guía Completa de Instalación y Despliegue de DEATurnos en Servidores Linux

Esta guía detalla el procedimiento para realizar una instalación **limpia, profesional y automatizada** del sistema **DEATurnos** en un servidor con sistema operativo **Linux** (Ubuntu, Debian, CentOS, AlmaLinux, Rocky Linux, Fedora, etc.), incluyendo la configuración de **acceso remoto seguro desde fuera de la red (Internet)**.

---

## 📋 Requisitos Mínimos del Servidor
- **Sistema Operativo**: Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+, AlmaLinux/Rocky 8+).
- **RAM**: 1 GB mínimo (2 GB recomendado).
- **Disco**: 5 GB libres.
- **Acceso**: Privilegios de superusuario (`root` o usuario con `sudo`).

---

## ⚡ Opción 1: Instalación Automatizada en 1 Paso (Recomendada)

El proyecto incluye el instalador automático `install_linux.sh` que detecta la distribución de Linux, instala Node.js 20 LTS, Nginx, PM2, compila el frontend, configura la base de datos y activa el firewall.

### Pasos:
1. Copie o clone la carpeta del proyecto en su servidor Linux (ejemplo en `/opt/deaturnos`):
   ```bash
   cd /opt/deaturnos
   ```

2. Dar permisos de ejecución e iniciar el instalador:
   ```bash
   sudo chmod +x install_linux.sh setup_tunnel_linux.sh
   sudo bash install_linux.sh
   ```

El script se encargará de:
- Actualizar paquetes del sistema.
- Instalar **Node.js 20 LTS**, **Nginx**, **Git**, **SQLite3** y **PM2**.
- Instalar dependencias y compilar el frontend optimizado con Vite.
- Inicializar la base de datos y sembrar los datos iniciales.
- Registrar **PM2** para que DEATurnos inicie automáticamente si el servidor Linux se reinicia.
- Configurar **Nginx** como Proxy Inverso habilitando soporte para WebSockets (`/socket.io`).
- Configurar reglas de **Firewall** (UFW o Firewalld) para abrir el puerto HTTP (80 y 5000).

---

## 🌐 Configuración para Acceso desde Afuera de la Red (Internet)

Para permitir que los usuarios, celulares o pantallas fuera de la red local puedan acceder al sistema de turnos de manera segura por HTTPS, dispone de **3 alternativas**:

### 🏆 Método A: Cloudflare Tunnel (Recomendado - Gratuito, Seguro y Sin Abrir Puertos)
No requiere disponer de IP pública fija ni realizar apertura de puertos (port forwarding) en el router o proveedor de internet.

Ejecute el asistente remoto:
```bash
sudo bash setup_tunnel_linux.sh
```
Seleccione la **Opción 1**. El sistema instalará `cloudflared` y creará un túnel HTTPS seguro apuntando al puerto 5000.

Para consultar la URL pública generada, ejecute:
```bash
pm2 logs deaturnos-tunnel
```
*Ejemplo de URL obtenida*: `https://nombre-generado.trycloudflare.com`

---

### 🚀 Método B: LocalTunnel Rápido
Ideal para realizar pruebas remotas inmediatas sin configuración adicional.

Ejecute el asistente:
```bash
sudo bash setup_tunnel_linux.sh
```
Seleccione la **Opción 2**. Para ver la URL en vivo:
```bash
pm2 logs deaturnos-tunnel
```

---

### 🔒 Método C: Dominio Propio + Nginx + Certbot (SSL Let's Encrypt)
Si dispone de una IP pública en el servidor Linux y un nombre de dominio (ejemplo: `turnos.miclinica.com`):

1. Apunte el registro A de su dominio a la IP pública de su servidor Linux.
2. Ejecute el asistente:
   ```bash
   sudo bash setup_tunnel_linux.sh
   ```
3. Seleccione la **Opción 3** e ingrese su dominio. Certbot instalará el certificado SSL de Let's Encrypt y configurará Nginx con HTTPS automáticamente.

---

## 🐳 Opción 2: Despliegue con Docker y Docker Compose

Si prefiere un entorno totalmente aislado y contenerizado:

1. Asegúrese de tener Docker instalado:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

2. Inicie el sistema con Docker Compose:
   ```bash
   docker compose up -d
   ```

3. Verifique el estado de los contenedores:
   ```bash
   docker compose ps
   ```

---

## 🛠️ Comandos de Administración en Linux

### Consultar Estado de la Aplicación (PM2):
```bash
pm2 status
```

### Ver Logs en Tiempo Real:
```bash
pm2 logs deaturnos
```

### Reiniciar el Servidor de Turnos:
```bash
pm2 restart deaturnos
```

### Consultar Estado de Nginx:
```bash
sudo systemctl status nginx
```

---

## 📂 Ubicación de la Base de Datos en Linux
La base de datos SQLite se almacena automáticamente en:
`/opt/deaturnos/backend/data/deaturnos.db`

Para respaldar la base de datos:
```bash
cp /opt/deaturnos/backend/data/deaturnos.db ~/deaturnos_backup_$(date +%F).db
```

---

## 🎯 Resumen de URLs de Acceso

- **Red Local / Servidor**: `http://IP_DEL_SERVIDOR` (o `http://IP_DEL_SERVIDOR:5000`)
- **Pantalla TV Público**: `http://IP_DEL_SERVIDOR/pantalla`
- **Módulo de Atención**: `http://IP_DEL_SERVIDOR/modulo`
- **Panel Administrativo**: `http://IP_DEL_SERVIDOR/admin`
- **Solicitar Turno por QR**: `http://IP_DEL_SERVIDOR/solicitar-turno`
