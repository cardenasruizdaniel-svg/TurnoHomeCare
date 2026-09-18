# 🍎 Guía de Actualización del iMac vía Tailscale (DEATurnos)

Esta guía explica el procedimiento paso a paso para enviar y aplicar la actualización más reciente en su equipo **iMac** ubicado en la ruta:
`cd /home/dala/PROGRAMAS/DEATurnero`

---

## 🛡️ Garantía de Seguridad de la Base de Datos del iMac

Al ejecutar este proceso en su iMac:
- **0% Pérdida de Datos**: La base de datos del iMac (`/home/dala/PROGRAMAS/DEATurnero/backend/data/deaturnos.db`), su historial de turnos, pacientes registrados, sedes y configuraciones **NUNCA serán borrados ni sobrescritos**.
- **Copia de Respado Preventiva**: El script genera automáticamente un respaldo preventivo de la base de datos del iMac antes de aplicar cualquier mejora.

---

## ⚡ Paso 1: Generar el Paquete de Actualización en este Equipo

En su computadora actual (donde se han programado las mejoras de roles, videos y rediseño de TV):

1. Ejecute el creador de paquete:
   - **En Windows**: Haga doble clic en `CREAR_PAQUETE_ACTUALIZACION.bat`
   - **En Linux / Mac**: Ejecute `bash crear_paquete_actualizacion.sh`

2. Este comando compilará el código y dejará lista la carpeta `actualizacion/` con todos los componentes actualizados.

---

## 🌐 Paso 2: Enviar los Archivos al iMac por Tailscale

Dispone de **3 alternativas fáciles** para pasar los archivos a su iMac:

### 🚀 Opción A: Usando la Red de Tailscale (SCP / Terminal)
Abra una terminal de comandos y envíe la carpeta `actualizacion` hacia su iMac reemplazando `<IP_TAILSCALE_IMAC>` por la IP de su iMac en Tailscale:

```bash
scp -r actualizacion dala@<IP_TAILSCALE_IMAC>:/home/dala/PROGRAMAS/DEATurnero/
```

### 📁 Opción B: Usando Tailscale File Send
Si utiliza la interfaz gráfica de Tailscale en la barra de tareas de Windows/Mac:
1. Haga clic derecho sobre la carpeta `actualizacion` o el archivo `paquete_actualizacion.zip`.
2. Seleccione **Send with Tailscale...** y elija su equipo **iMac**.
3. En el iMac, mueva los archivos recibidos hacia `/home/dala/PROGRAMAS/DEATurnero/actualizacion/`.

### 💻 Opción C: Carpeta Compartida en Red Local
Si ambos equipos están en la misma red local o conectados a la carpeta compartida:
1. Copie la carpeta `actualizacion` de esta máquina.
2. Péguela dentro de `/home/dala/PROGRAMAS/DEATurnero/` en su iMac.

---

## ⚙️ Paso 3: Aplicar la Actualización en el iMac

Abra la Terminal en su iMac e ingrese los siguientes comandos:

```bash
# 1. Navegar a la carpeta del proyecto en el iMac
cd /home/dala/PROGRAMAS/DEATurnero

# 2. Dar permisos de ejecución y aplicar la actualización limpia
sudo chmod +x aplicar_actualizacion.sh
sudo bash aplicar_actualizacion.sh
```

---

## 🎯 Resultado de la Actualización en el iMac

Una vez completado el proceso:
1. El iMac tendrá activadas todas las mejoras:
   - **Pantalla TV rediseñada**: Banners publicitarios más grandes y QR compacto.
   - **Soporte para Videos MP4/WebM** en la publicidad de la pantalla TV.
   - **Sistema de Roles y Matriz de Permisos 100% Parametrizable** con ocultamiento dinámico de módulos.
   - **Modulo de Actualizaciones en 1-Clic**.
2. Todos los datos de turnos y configuraciones de su iMac continuarán **100% intactos y funcionando normalmente**.
