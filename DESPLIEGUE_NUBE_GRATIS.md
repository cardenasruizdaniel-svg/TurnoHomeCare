# Guía Completa de Despliegue en la Nube Gratuita - DEATurnos para HomeCare del Quindío I.P.S.

Esta guía te explica paso a paso cómo publicar el sistema **DEATurnos** en una plataforma gratuita en la nube con HTTPS automático para que la **IPS HomeCare del Quindío** pueda utilizarlo en vivo, permitiendo que cualquier paciente escanee el código QR desde su celular y los funcionarios atiendan desde cualquier computador.

---

## 🏆 Opción 1: Despliegue en Render.com (Recomendado - 100% Gratuito)

**Render** ofrece un plan gratuito para aplicaciones web con soporte completo para Node.js, WebSockets (Socket.IO) y certificados SSL (HTTPS) automáticos.

### Paso 1: Subir el Proyecto a tu GitHub

1. Abre una terminal (o PowerShell / Git Bash) en la carpeta del proyecto `d:\PROGRAMAS\DEATurnos`.
2. Inicializa Git (si aún no lo has hecho):
   ```bash
   git init
   git add .
   git commit -m "Sistema DEATurnos HomeCare del Quindío v1.0"
   ```
3. Ve a tu cuenta de [GitHub.com](https://github.com) y crea un nuevo repositorio (puedes llamarlo `deaturnos-homecare` y ponerlo **Público** o **Privado**).
4. Vincula y sube el código:
   ```bash
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/deaturnos-homecare.git
   git push -u origin main
   ```

---

### Paso 2: Crear el Servicio en Render

1. Ingresa a [https://render.com](https://render.com) y regístrate o inicia sesión con tu cuenta de **GitHub**.
2. En el panel principal de Render, haz clic en **`New +`** $\rightarrow$ **`Web Service`**.
3. Selecciona la opción **`Build and deploy from a Git repository`** y presiona **Next**.
4. Conecta tu repositorio de GitHub `deaturnos-homecare`.

---

### Paso 3: Configurar los Parámetros del Despliegue

Diligencia los siguientes campos en el formulario de Render:

| Campo | Valor a colocar |
| :--- | :--- |
| **Name** | `homecare-turnos` *(o el nombre que prefieras)* |
| **Region** | `Oregon (US West)` o `Ohio (US East)` |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** |

---

### Paso 4: Configurar Variables de Entorno (Environment Variables)

Baja a la sección **`Advanced`** $\rightarrow$ **`Add Environment Variable`** y agrega:

- `NODE_ENV` = `production`
- `JWT_SECRET` = *(coloca una clave secreta segura, ej: `HomeCareQuindio2026_ClaveSegura!`)*
- `DB_PATH` = `./data/deaturnos.db`

---

### Paso 5: Desplegar y Obtener URL Pública

1. Haz clic en el botón inferior **`Create Web Service`**.
2. Render comenzará a compilar el frontend y levantar el backend (tarda aprox. 2 a 3 minutos).
3. Cuando finalice, verás el estado en verde **`Live`** y Render te entregará tu URL pública permanente:
   $$\text{https://homecare-turnos.onrender.com}$$

---

## 📱 ¿Cómo se usa en la IPS una vez desplegado?

1. **Pantalla de TV de la Sala de Espera**:
   - En el televisor o monitor de la IPS, abre el navegador en:
     `https://homecare-turnos.onrender.com/pantalla`
   - Haz clic en *"Click para Activar Sonido / Voz"* para que el altavoz anuncie los turnos.
   - El código QR gigante en la TV apuntará automáticamente a `https://homecare-turnos.onrender.com/solicitar-turno?branchId=1`.

2. **Celulares de los Pacientes**:
   - Los pacientes escanean el código QR en la pantalla con su cámara o datos móviles 4G/5G y piden su turno sin necesidad de conectarse a ningún Wi-Fi.

3. **Médicos y Funcionarios en Ventanilla**:
   - Cada funcionario ingresa desde su computador a:
     `https://homecare-turnos.onrender.com/atencion`
   - Inician sesión y llaman sus turnos.

4. **Administración y Reportes**:
   - Ingresa a: `https://homecare-turnos.onrender.com/admin/dashboard`
   - Credenciales por defecto: `admin` / `admin123`.

---

## ⚡ Opción 2: Despliegue en Railway.app (Alternativa Rápida)

1. Ingresa a [https://railway.app](https://railway.app) e inicia sesión con GitHub.
2. Haz clic en **`New Project`** $\rightarrow$ **`Deploy from GitHub repo`** $\rightarrow$ Selecciona `deaturnos-homecare`.
3. Railway detectará automáticamente el archivo `Dockerfile` o `package.json` incluido en el proyecto.
4. En **Settings** $\rightarrow$ **Networking**, haz clic en **`Generate Domain`** para obtener tu enlace HTTPS.

---

## 💡 Consejo Pro para HomeCare del Quindío (Dominio Propio)

Si la IPS cuenta con su propio dominio institucional (ej. `homecarequindio.com`), tanto en **Render** como en **Railway** puedes ir a **Settings** $\rightarrow$ **Custom Domains** y vincular un subdominio profesional como:
$$\text{turnos.homecarequindio.com}$$
¡Render generará el certificado de seguridad SSL (candado verde) de forma automática y gratuita!
