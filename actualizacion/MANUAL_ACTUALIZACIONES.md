# 🔄 Manual de Actualizaciones del Sistema DEATurnos

Este documento describe el funcionamiento del **Módulo de Actualización Automática en 1-Clic** de **DEATurnos**, el cual permite aplicar correcciones, mejoras y nuevas funcionalidades desde la carpeta `actualizacion/` **sin perder ni alterar la información registrada** en el sistema.

---

## 🛡️ Garantía de Protección de Datos

El motor de actualización cuenta con un sistema de **protección atómica** que garantiza:
- **0% Pérdida de Datos**: Mantiene intactos todos los turnos del historial, pacientes, sedes, módulos de atención, usuarios y contraseñas.
- **Respaldo Preventivo Automático**: Antes de aplicar cualquier cambio, genera una copia de seguridad timestamped de la base de datos en:
  `backend/data/backups/deaturnos_backup_BEFORE_UPDATE_[fecha_hora].db`
- **Exclusión de Archivos Sensibles**: Nunca sobrescribe ni borra `deaturnos.db`, `.env`, ni `active_port.txt`.

---

## 📂 ¿Cómo Funciona la Carpeta `actualizacion/`?

La carpeta raíz `actualizacion/` sirve como buzón de depósito de parches y mejoras.

```
DEATurnos/
├── actualizacion/             <-- Coloque aquí los archivos a actualizar
│   ├── backend/               <-- (Opcional) Nuevos controladores o servicios
│   ├── frontend/dist/         <-- (Opcional) Nuevas vistas compiladas
│   ├── package.json           <-- (Opcional) Si hay nuevas librerías
│   └── .gitkeep
```

---

## ⚡ Formas de Aplicar la Actualización

### 🪟 Opción A: En Servidores Windows
1. Copie o extraiga los archivos nuevos dentro de la carpeta `actualizacion/`.
2. Haga doble clic en el archivo ejecutable:
   ```cmd
   APLICAR_ACTUALIZACION.bat
   ```
3. El sistema respaldará la base de datos, copiará los archivos actualizados, sincronizará la estructura de datos y recompilará la aplicación automáticamente.

---

### 🐧 Opción B: En Servidores Linux (Ubuntu / Debian / CentOS)
1. Coloque los archivos en la carpeta `actualizacion/`.
2. Ejecute el comando desde la terminal:
   ```bash
   sudo bash aplicar_actualizacion.sh
   ```
   *(o ejecutando `npm run update`)*.
3. El script actualizará el código, compilará el frontend y reiniciará el servicio PM2 o Nginx en segundo plano.

---

### 🌐 Opción C: Desde la Consola de Comandos (CLI / NPM)
En cualquier sistema operativo con Node.js:
```bash
npm run update
```

---

## 📜 Historial de Actualizaciones

Una vez procesada la actualización:
1. La carpeta `actualizacion/` quedará limpia y lista para futuras versiones.
2. Los archivos aplicados se archivarán automáticamente en:
   `actualizacion/historial/actualizacion_[fecha_hora]/`
3. Cada actualización genera un reporte `informe.txt` con los elementos procesados.

---

## 💡 Recomendaciones para Desarrolladores

Al preparar un paquete de actualización para clientes:
1. **Solamente incluya los archivos modificados** (ejemplo: sólo la carpeta `backend/src` o `frontend/dist`).
2. No incluya carpetas de base de datos ni `.env`.
3. Comprima los archivos en un `.zip` o colóquelos directamente dentro de `actualizacion/`.
