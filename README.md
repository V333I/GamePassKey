# 🎮 GamePassKey

**GamePassKey** es una plataforma web integral para la distribución, administración y validación de licencias de aplicaciones y videojuegos interactivos. Su estética está orientada al "Dark Mode" y al estilo "Tech/Terminal", ofreciendo portales dedicados tanto para **Usuarios Finales** como para **Administradores**.

---

## 🚀 Características Principales

### 👤 Portal del Usuario
- **Autenticación Segura**: Sistema de Login y Registro protegido mediante JSON Web Tokens (JWT).
- **Catálogo Inteligente**: Visualización ordenada alfabéticamente de todos los títulos. Si el usuario ya posee un juego, el botón de solicitud se bloquea automáticamente mostrando "YA EN BIBLIOTECA".
- **Mi Biblioteca**: Espacio personal ordenado alfabéticamente donde se alojan los juegos a los que el usuario tiene acceso.
- **Canje de Códigos**: Sistema integrado para activar códigos de un solo uso y añadir juegos a la biblioteca de forma instantánea.
- **Gestión de Perfil**: Edición de nombre de usuario y contraseña.
- **Gestión de Dispositivos**: Registro y vinculación de equipos autorizados mediante Hardware ID (Límite máximo de 2 dispositivos por usuario).
- **Centro de Notificaciones**: Bandeja de notificaciones integrada para recibir respuestas del administrador, códigos de activación y cambios de estado.
- **Sistema de Soporte**: Creación de tickets de soporte técnico o peticiones administrativas.

### 🛡️ Panel de Administración
- **Notificaciones en Tiempo Real**: Alerta visual dinámica en el menú lateral que avisa instantáneamente cuando existen tickets de soporte abiertos pendientes de revisión.
- **Dashboard Estadístico**: Resumen en tiempo real de juegos, usuarios activos, licencias, códigos, dispositivos y tickets de soporte.
- **Gestión de Juegos (CRUD)**: Creación, lectura, actualización y eliminación de títulos del catálogo.
- **Gestión de Usuarios**: Cambio de roles (Usuario/Administrador) y bloqueo/reactivación de cuentas.
- **Administración de Licencias**: Revocación y control del estado de las licencias asignadas.
- **Generador de Códigos**: Herramienta para seleccionar un juego del catálogo y generar licencias/códigos automáticamente.
- **Resolución de Soporte**: Recepción y respuesta a los tickets creados por los usuarios con la capacidad de enviar mensajes al usuario.
- **Sistema de Logs**: Registro de auditoría completo que monitorea todas las acciones críticas.

### 🖥️ Launcher de Escritorio (Desktop App)
- **Diseño Dark Tech**: Interfaz inmersiva con colores oscuros y acentos vibrantes que unifican la experiencia con el portal web.
- **Validación HWID Automática**: El launcher valida silenciosamente la máquina del usuario en cada inicio de sesión.
- **Grilla Responsiva**: Los juegos instalados se distribuyen dinámicamente ocupando el 100% de la ventana sin importar la resolución del monitor.
- **Simulador de Ejecución**: Lanza juegos directamente desde el cliente con aislamiento de procesos.

---

## 🛠️ Tecnologías Utilizadas

### Backend
- **Python 3.10+**
- **FastAPI**: Framework de alto rendimiento para construir la API REST.
- **SQLAlchemy**: ORM para la interacción con la base de datos.
- **MySQL / PyMySQL**: Motor de base de datos relacional.
- **PyJWT & Passlib**: Para la autenticación y encriptación de contraseñas (Bcrypt).
- **Uvicorn**: Servidor ASGI para despliegue.

### Frontend
- **HTML5 & CSS3 (Vanilla)**: Diseñado completamente desde cero utilizando variables CSS personalizadas y Grid/Flexbox sin depender de frameworks pesados.
- **JavaScript (Vanilla JS)**: Lógica asíncrona, Fetch API, manipulación del DOM y manejo de sesión local.

### Launcher (Desktop)
- **Python (CustomTkinter)**: Interfaz gráfica moderna, elegante y 100% responsiva para el cliente de escritorio.

---

## ⚙️ Requisitos Previos

1. Tener **Python 3.10** o superior instalado.
2. Tener un servidor **MySQL** (ej. a través de XAMPP, WAMP, o Docker).
3. (Opcional) Un servidor web ligero para el frontend (ej. Apache de XAMPP, o la extensión Live Server de VS Code).

---

## 📦 Instalación y Despliegue

### 1. Configuración de la Base de Datos
1. Inicia tu servidor MySQL.
2. Crea una base de datos vacía, por ejemplo: `gamepasskey`.
3. *(Opcional)* Si cuentas con el volcado SQL del proyecto, impórtalo. De lo contrario, SQLAlchemy creará las tablas automáticamente al iniciar el servidor (si está configurado con `Base.metadata.create_all`).

### 2. Configuración del Backend
Navega a la carpeta del backend:
```bash
cd backend
```

Instala las dependencias necesarias:
```bash
pip install -r requirements.txt
```

Crea un archivo `.env` en el directorio raíz del backend y ajusta tus credenciales:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=gamepasskey

SECRET_KEY=tu_clave_secreta_super_segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
```

Levanta el servidor con Uvicorn:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
> El backend estará disponible en `http://localhost:8000`. Puedes ver la documentación interactiva de la API (Swagger) en `http://localhost:8000/docs`.

### 3. Configuración del Frontend
Si usas **XAMPP**, simplemente mueve la carpeta completa del proyecto a `htdocs/GamePassKey` y accede desde tu navegador a:
```text
http://localhost/GamePassKey/frontend/index.html
```
*(Asegúrate de que la ruta base en `frontend/js/api.js` coincida con la URL de tu backend, por defecto `http://localhost:8000`)*.

### 4. Ejecución del Launcher
Navega a la carpeta del launcher e instala sus dependencias:
```bash
cd launcher
pip install -r requirements.txt
```
Inicia la aplicación de escritorio:
```bash
python main.py
```

---

## 🔒 Credenciales por Defecto
Si acabas de inicializar la base de datos con los datos semilla, puedes acceder con:
- **Administrador**:
  - Correo: `admin@gamepass.local`
  - Contraseña: `admin`

---

## 📂 Estructura del Proyecto

```text
GamePassKey/
├── backend/
│   ├── app/              # Código fuente de FastAPI
│   ├── .env.example      # Plantilla de variables de entorno
│   └── requirements.txt  # Dependencias del backend
├── frontend/
│   ├── css/              # Hojas de estilo Vanilla CSS
│   ├── js/               # Lógica del cliente
│   ├── index.html        # Vista Principal del Usuario
│   ├── admin.html        # Vista del Dashboard Administrativo
│   └── login.html        # Pantalla de Acceso/Registro
└── launcher/
    ├── main.py           # Archivo de inicio del Launcher Desktop
    ├── ui_login.py       # Interfaz de inicio de sesión del launcher
    ├── ui_library.py     # Interfaz de biblioteca (Grilla Responsiva)
    ├── api_client.py     # Conexión entre el Launcher y el Backend
    ├── hwid.py           # Lógica de extracción segura de Hardware ID
    └── requirements.txt  # Dependencias del launcher (CustomTkinter, etc.)
```

---
*Desarrollado con precisión y pasión para una experiencia de usuario impecable.* 🚀
