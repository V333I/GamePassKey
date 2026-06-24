# GamePassKey — Backend

API REST construida con **FastAPI** y **MySQL** para la gestión de usuarios,
licencias, juegos, biblioteca y códigos de uso único de la plataforma GamePassKey.

---

## Estructura del proyecto

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          ← Punto de entrada FastAPI + CORS
│   ├── database.py      ← Conexión SQLAlchemy con MySQL
│   ├── models.py        ← Modelos ORM (tablas de la BD)
│   ├── schemas.py       ← Schemas Pydantic (validación de datos)
│   ├── auth.py          ← Hash de contraseñas y generación de JWT
│   ├── telegram_service.py ← Envío de códigos OTP vía Bot API de Telegram (2FA)
│   └── routes/
│       ├── __init__.py
│       └── auth_routes.py  ← Rutas de autenticación (login, verify-otp, logout)
├── sql/
│   └── otp_telegram.sql ← Script manual: tabla codigos_otp + columna telegram_chat_id
├── .env.example         ← Plantilla de variables de entorno
├── requirements.txt     ← Dependencias Python
└── README.md            ← Este archivo
```

---

## Requisitos previos

- Python **3.10** o superior
- MySQL **8.0** o superior en ejecución local
- La base de datos `gamepasskey` ya creada en MySQL

---

## 1. Crear el entorno virtual

Abre una terminal en la carpeta `backend/` y ejecuta:

```bash
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Windows (CMD)
python -m venv venv
venv\Scripts\activate.bat

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

Verifica que el entorno está activo: el prompt mostrará `(venv)` al inicio.

---

## 2. Instalar dependencias

Con el entorno virtual activado:

```bash
pip install -r requirements.txt
```

---

## 3. Configurar el archivo `.env`

Copia la plantilla y edítala con tus credenciales reales:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Abre `.env` y actualiza los valores:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=TU_CONTRASEÑA_MYSQL
DB_NAME=gamepasskey

SECRET_KEY=genera_una_clave_con_el_comando_de_abajo
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# 2FA por Telegram — token del bot de @BotFather (vacío = 2FA deshabilitado)
TELEGRAM_BOT_TOKEN=
```

### Generar una `SECRET_KEY` segura

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copia la salida y pégala como valor de `SECRET_KEY` en tu `.env`.

> ⚠️ **Importante:** Nunca subas el archivo `.env` a un repositorio.
> Añade `.env` a tu `.gitignore`.

---

## 4. Preparar la base de datos MySQL

Asegúrate de que la base de datos `gamepasskey` existe y que la tabla `usuarios`
tiene al menos los campos definidos en `app/models.py`.

Si deseas que SQLAlchemy cree las tablas automáticamente durante el desarrollo,
puedes añadir estas líneas al final de `app/database.py` (solo en desarrollo):

```python
# Solo para desarrollo — eliminar en producción
from app import models
models.Base.metadata.create_all(bind=engine)
```

O ejecutar desde la terminal (con el venv activado):

```bash
python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

Para el **2FA por Telegram**, ejecuta además (una sola vez) el script que crea la
tabla `codigos_otp` y la columna `usuarios.telegram_chat_id`:

```bash
mysql -u root -p gamepasskey < sql/otp_telegram.sql
```

---

## 5. Ejecutar el servidor

Con el entorno virtual activado y el `.env` configurado, desde la carpeta `backend/`:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

La API estará disponible en: **http://localhost:8000**

| Ruta        | Descripción                           |
|-------------|---------------------------------------|
| `/`         | Estado de la API                      |
| `/docs`     | Documentación interactiva (Swagger)   |
| `/redoc`    | Documentación alternativa (ReDoc)     |
| `/auth/login` | Endpoint de inicio de sesión       |

---

## 6. Probar el login desde `/docs`

1. Abre tu navegador en **http://localhost:8000/docs**
2. Busca la sección **Autenticación**
3. Haz clic en `POST /auth/login`
4. Haz clic en **"Try it out"**
5. Introduce el body de la petición:

```json
{
  "correo": "tu_correo@ejemplo.com",
  "password": "tu_contraseña"
}
```

6. Haz clic en **"Execute"**
7. Si las credenciales son correctas, recibirás:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "id_usuario": 1,
  "nombre_usuario": "Juan Pérez",
  "correo": "juan@ejemplo.com",
  "estado": "activo"
}
```

### Códigos de respuesta

| Código | Significado                                  |
|--------|----------------------------------------------|
| `200`  | Login exitoso — devuelve token y datos        |
| `401`  | Correo no existe o contraseña incorrecta      |
| `403`  | Cuenta bloqueada o inactiva                   |
| `422`  | Datos inválidos (correo mal formado, etc.)    |

---

## 7. Probar con `curl` (opcional)

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"correo": "tu_correo@ejemplo.com", "password": "tu_contraseña"}'
```

---

## Variables de entorno disponibles

| Variable                    | Descripción                               | Valor por defecto |
|-----------------------------|-------------------------------------------|-------------------|
| `DB_HOST`                   | Host del servidor MySQL                   | `localhost`       |
| `DB_PORT`                   | Puerto MySQL                              | `3306`            |
| `DB_USER`                   | Usuario MySQL                             | `root`            |
| `DB_PASSWORD`               | Contraseña MySQL                          | —                 |
| `DB_NAME`                   | Nombre de la base de datos                | `gamepasskey`     |
| `SECRET_KEY`                | Clave secreta para firmar JWT             | —                 |
| `ALGORITHM`                 | Algoritmo JWT                             | `HS256`           |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token en minutos           | `60`              |
| `TELEGRAM_BOT_TOKEN`        | Token del bot de Telegram para el 2FA (OTP) | — (opcional)   |

---

## Verificación en dos pasos (2FA por Telegram)

Si un usuario tiene su `telegram_chat_id` vinculado, el login se vuelve de dos pasos:

1. `POST /auth/login` valida correo + contraseña y, en lugar del token, envía un
   código OTP de 6 dígitos por Telegram y responde `{ "otp_required": true }`.
2. `POST /auth/verify-otp` (`{correo, codigo}`) valida el código y devuelve el JWT.

El OTP se guarda hasheado en `codigos_otp`, caduca a los 5 minutos, admite hasta 5
intentos y el envío es *fail-closed* (si Telegram falla, el login responde 503).
Requisitos: ejecutar `sql/otp_telegram.sql`, definir `TELEGRAM_BOT_TOKEN` y que cada
usuario vincule su Chat ID. **Guía paso a paso:** ver `OTP_TELEGRAM.md` en la raíz.

---

## Módulos de la API

La API está dividida en los siguientes módulos principales, todos completamente funcionales:

- **`routes/auth_routes.py`** — Autenticación y gestión de sesiones (JWT), incluyendo el 2FA por Telegram (`/auth/login` + `/auth/verify-otp`).
- **`routes/juegos_routes.py`** — Catálogo de juegos (CRUD para administradores, listado para usuarios).
- **`routes/biblioteca_routes.py`** — Gestión de la biblioteca de juegos de cada usuario.
- **`routes/licencias_routes.py`** — Sistema de licencias y seriales para validación.
- **`routes/codigos_routes.py`** — Generación y canje de códigos promocionales de un solo uso.
- **`routes/dispositivos_routes.py`** — Registro de HWID y validación de dispositivos vinculados.
- **`routes/usuarios_routes.py`** — Gestión de usuarios, perfiles y roles.
- **`routes/notificaciones_routes.py`** — Sistema de notificaciones en tiempo real para usuarios.
- **`routes/soporte_routes.py`** — Sistema de tickets de soporte técnico con respuestas directas del administrador.
