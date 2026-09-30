# 📱 Manual Paso a Paso: Configuración de Notificaciones Automáticas por WhatsApp y Correo Electrónico

Este manual explica detalladamente cómo configurar los servicios de envío automático por **WhatsApp** y **Correo Electrónico (SMTP)** para que al crear o guardar una Cotización / Programación, la información sea enviada de forma instantánea al cliente o paciente registrado.

---

## ⚙️ 1. Configuración de Correo Electrónico (SMTP)

El sistema soporta cualquier proveedor de correo corporativo o personal (Gmail, Outlook/Office365, Hostinger, cPanel, Mailgun, etc.).

### 📧 Parámetros Requeridos en la Base de Datos (`settings`):

| Clave (`key`) | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `SMTP_HOST` | Servidor de correo de salida | `smtp.gmail.com` o `smtp.hostinger.com` |
| `SMTP_PORT` | Puerto de conexión | `587` (TLS) o `465` (SSL) |
| `SMTP_USER` | Usuario / Correo de envío | `notificaciones@homecarequindio.com` |
| `SMTP_PASS` | Contraseña o Clave de Aplicación | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | Nombre del remitente visible | `HomeCare del Quindío <notificaciones@homecarequindio.com>` |

### 🔐 Paso a Paso para configurar Gmail con Contraseña de Aplicación:
1. Ingrese a la cuenta de Gmail desde el navegador.
2. Vaya a **Cuenta de Google** ➔ **Seguridad**.
3. Asegúrese de tener activada la **Verificación en 2 Pasos**.
4. En el buscador superior escriba **Contraseñas de aplicaciones**.
5. Seleccione la opción **Crear contraseña de aplicación**, escriba el nombre `DEATurnos` y haga clic en **Crear**.
6. Copie el código de 16 letras generado y asígnelo al campo `SMTP_PASS`.

---

## 💬 2. Configuración del Servicio de WhatsApp (API / Webhook)

El sistema utiliza endpoints HTTP REST compatibles con proveedores como **UltraMsg**, **Evolution API**, **Waboxapp** o cualquier gateway de WhatsApp Web.

### 📱 Parámetros Requeridos en la Base de Datos (`settings`):

| Clave (`key`) | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `WHATSAPP_API_URL` | Endpoint HTTP POST del proveedor | `https://api.ultramsg.com/instance10293/messages/chat` |
| `WHATSAPP_TOKEN` | Token de autorización de la API | `tok_abc123xyz987` |

### 🚀 Paso a Paso para configurar UltraMsg (o similar):
1. Inicie sesión en [UltraMsg.com](https://ultramsg.com) o su proveedor preferido.
2. Escanee el código QR con el WhatsApp de la empresa (`HomeCare del Quindío`).
3. Copie su **Instance ID** y su **Token**.
4. La URL del API tendrá el formato:  
   `https://api.ultramsg.com/{INSTANCE_ID}/messages/chat`
5. Guarde esta URL en el parámetro `WHATSAPP_API_URL` y el Token en `WHATSAPP_TOKEN`.

---

## ⚡ 3. Funcionamiento Automático al Crear / Guardar

1. Al presionar **"+ NUEVA COTIZACIÓN / PROGRAMACIÓN"** o **"+ PROGRAMAR TURNO"**:
2. El sistema valida los datos del cliente:
   - **Si el cliente tiene Teléfono:** El sistema envía automáticamente el mensaje formateado con los detalles del turno/cotización por WhatsApp.
   - **Si el cliente tiene Correo:** El sistema envía automáticamente la plantilla HTML de confirmación.
   - **Si no tiene ninguno de los dos datos:** El turno se guarda normalmente **sin arrojar ningún error**.

---

## 🛠️ 4. Verificación de Funcionamiento

Para comprobar que el envío automático está funcionando:
1. Ingrese al módulo de **Programación de Turnos** o haga clic en el botón superior **"+ NUEVA COTIZACIÓN / PROGRAMACIÓN"**.
2. Digite un paciente de prueba ingresando su número de WhatsApp y correo.
3. Haga clic en **Guardar**.
4. Revise en el teléfono de prueba el mensaje recibido por WhatsApp.
