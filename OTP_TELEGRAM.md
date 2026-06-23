# Configuración y prueba — 2FA por OTP vía Telegram

Guía para configurar y probar el inicio de sesión en dos pasos (verificación OTP
enviada por un bot de Telegram) en el **portal web** de GamePassKey.

## ¿Qué se desarrolló?

- El login web ahora es de **dos pasos** para usuarios con Telegram vinculado:
  1. `POST /auth/login` valida correo + contraseña. Si el usuario tiene
     `telegram_chat_id`, **no** devuelve token: genera un código OTP de 6 dígitos,
     lo envía por Telegram y responde `{ "otp_required": true }`.
  2. `POST /auth/verify-otp` recibe `{correo, codigo}`, valida el código y recién
     ahí entrega el JWT y crea la sesión.
- Quien **no** tenga Telegram vinculado inicia sesión en un solo paso (igual que antes).
- Cada usuario activa o desactiva el 2FA desde **Mi Perfil → Editar Perfil → Telegram Chat ID**.

**Reglas de seguridad:** el OTP se guarda hasheado (bcrypt), caduca a los **5 minutos**,
admite máximo **5 intentos**, se invalidan los OTP pendientes anteriores al pedir uno
nuevo, y el envío es *fail-closed*: si Telegram falla, el login devuelve **503** y no
concede acceso.

---

## Requisitos previos

- Backend funcionando (FastAPI + venv del proyecto).
- **MySQL en ejecución** (en WAMP, icono en verde) con la base `gamepasskey`.
- Una cuenta de Telegram.

---

## Paso 1 — Crear la tabla y la columna en la base de datos

No hay migraciones automáticas, así que ejecuta **una sola vez** el script SQL incluido.
Desde la carpeta `backend/`:

```bash
mysql -u root -p gamepasskey < sql/otp_telegram.sql
```

> Alternativa: abre `backend/sql/otp_telegram.sql` y pega su contenido en
> phpMyAdmin (pestaña SQL) o MySQL Workbench.

Esto añade la columna `usuarios.telegram_chat_id` y crea la tabla `codigos_otp`.
Verificación rápida:

```sql
DESCRIBE usuarios;     -- debe aparecer telegram_chat_id
SHOW TABLES LIKE 'codigos_otp';
```

---

## Paso 2 — Crear el bot de Telegram y obtener el token

1. En Telegram, abre **@BotFather**.
2. Envía `/newbot` y sigue las instrucciones (nombre y username del bot).
3. BotFather te dará un **token** con esta forma:
   `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

---

## Paso 3 — Configurar el token en el `.env`

Edita `backend/.env` y pega el token en la variable (ya está añadida, vacía):

```env
TELEGRAM_BOT_TOKEN=123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Guarda y **reinicia** el backend para que tome el cambio.

> Si dejas `TELEGRAM_BOT_TOKEN` vacío, cualquier usuario con Telegram vinculado
> recibirá un error **503** al iniciar sesión (comportamiento intencional: no se
> concede acceso si no se puede enviar el código).

---

## Paso 4 — Obtener tu Chat ID de Telegram

El backend solo **envía** mensajes, así que necesita el Chat ID del usuario:

1. En Telegram, abre **tu bot** (el que creaste) y pulsa **Start** / envíale `/start`.
   > Esto es obligatorio: Telegram no deja que el bot te escriba si tú no le
   > escribiste primero.
2. Abre **@userinfobot** y envíale cualquier mensaje. Te responderá con tu
   **Id** (un número como `123456789`). Ese es tu Chat ID.

---

## Paso 5 — Vincular tu cuenta en el portal

1. Levanta backend y frontend:
   ```bash
   # backend/  (con el venv activo)
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

   # frontend/  (en otra terminal)
   python -m http.server 3000
   ```
2. Inicia sesión normalmente en el portal.
3. Ve a **Mi Perfil → Editar Perfil**.
4. En **Telegram Chat ID (2FA)** pega tu Chat ID numérico y guarda.
5. En la tarjeta de perfil debe aparecer **Verificación 2FA (Telegram): Activa**.

Para **desactivar** el 2FA: vuelve a Editar Perfil, deja el campo vacío y guarda.

---

## Paso 6 — Probar el flujo completo

### Caso feliz (con 2FA activado)

1. Cierra sesión e inicia sesión de nuevo con correo + contraseña.
2. El formulario cambia a **"VERIFICAR CÓDIGO"** y debe llegarte el código por Telegram.
3. Ingresa los 6 dígitos → entras al dashboard.

### Casos límite a verificar

| Prueba | Resultado esperado |
|--------|--------------------|
| Código incorrecto | "Código incorrecto o solicitud inválida". Tras 5 fallos pide reloguear. |
| Esperar > 5 min y enviar | "El código ha expirado. Inicia sesión de nuevo." |
| Pedir login dos veces seguidas | Solo el **último** código es válido (los anteriores quedan expirados). |
| Usuario **sin** Telegram vinculado | Inicia sesión en un solo paso, sin pedir OTP. |
| `TELEGRAM_BOT_TOKEN` vacío + usuario con 2FA | Error 503 al hacer login. |

### Probar desde Swagger (opcional)

Con el backend arriba, abre `http://localhost:8000/docs`:

1. `POST /auth/login` con `{ "correo": "...", "password": "..." }`.
   - Sin 2FA → devuelve `access_token`.
   - Con 2FA → devuelve `{ "otp_required": true, "correo": "..." }` y te llega el código.
2. `POST /auth/verify-otp` con `{ "correo": "...", "codigo": "123456" }` → devuelve el token.

---

## Solución de problemas

- **`Can't connect to MySQL server on 'localhost' [WinError 10061]`**
  MySQL no está corriendo o el puerto no coincide. Inicia MySQL en WAMP (icono verde)
  y revisa que `DB_PORT` en `.env` coincida con el puerto de WAMP (3306 ó 3308).
  Comprueba con:
  ```bash
  python -c "from app.database import engine; engine.connect(); print('MySQL OK')"
  ```

- **`ModuleNotFoundError: No module named 'app'`**
  No ejecutes `python app\main.py`. Arranca con `uvicorn app.main:app --reload`
  desde la carpeta `backend/`.

- **Error 503 "No se pudo enviar el código de verificación por Telegram"**
  Falta `TELEGRAM_BOT_TOKEN` en `.env`, el token es inválido, o el usuario nunca
  le escribió `/start` al bot. Revisa también la conexión a internet del servidor.

- **No llega el mensaje pero no hay error visible**
  Confirma que el Chat ID guardado es el tuyo y que iniciaste el chat con **tu** bot
  (no con @userinfobot). Revisa la tabla `logs_seguridad`: busca `OTP_ENVIADO` o
  `OTP_ENVIO_FALLIDO`.

- **El código siempre dice incorrecto**
  Asegúrate de no tener varias sesiones de login abiertas generando códigos nuevos;
  solo el último OTP pendiente es válido.

---

## Limitación conocida

El **launcher de escritorio** no implementa el segundo paso (OTP). Si una cuenta
activa el 2FA, su inicio de sesión en el launcher dejará de funcionar (recibe
`otp_required` sin token). El 2FA, por ahora, está pensado solo para el portal web.
