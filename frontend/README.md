# GamePassKey — Frontend

Portal web interactivo construido con **HTML5, Vanilla CSS y Vanilla JavaScript**.
Sirve como interfaz gráfica para los usuarios de GamePassKey (Jugadores) y los Administradores de la plataforma.

---

## Estructura del proyecto

```
frontend/
├── admin.html       ← Panel de administración (Gestión de usuarios, juegos, licencias y códigos)
├── index.html       ← Portal del usuario (Biblioteca, Catálogo, Perfil, Dispositivos)
├── css/
│   ├── admin.css    ← Estilos específicos del panel de administración
│   ├── login.css    ← Estilos de las vistas de autenticación
│   └── style.css    ← Estilos principales (Variables, utilidades, layout, componentes)
├── js/
│   ├── admin.js     ← Lógica e interacciones del panel de administración
│   ├── api.js       ← Cliente HTTP (Fetch) para comunicación con el Backend (FastAPI)
│   ├── app.js       ← Lógica e interacciones del portal del usuario
│   └── auth.js      ← Gestión de sesiones JWT y autenticación
└── README.md        ← Este archivo
```

---

## Características Principales

1. **Diseño "Glassmorphism" Moderno**: Interfaz altamente estética con paleta de colores oscuros, desenfoques y acentos en tonos cian y naranja.
2. **Sistema de Autenticación**: Login, registro y cierre de sesión con tokens JWT almacenados de forma segura en `localStorage`.
3. **Roles y Permisos**: Redirecciones automáticas basadas en el rol del usuario (Administrador vs Usuario estándar).
4. **Catálogo y Biblioteca Dinámica**: 
   - Grid de juegos con filtrado por estado (Todos / Disponibles).
   - Sistema de carátulas auto-escalables e inteligentes (evitando recortes).
   - Distinción visual de juegos en modo de Mantenimiento.
5. **Panel Lateral Retráctil**: Diseño web "Responsive" real que permite colapsar el menú de navegación para dividir la pantalla cómodamente.
6. **Sistema de Notificaciones**: Panel flotante con capacidades de análisis de mensajes para extraer Códigos de Uso y canjearlos instantáneamente a la biblioteca.
7. **Modales y Cuadros de Diálogo**: Utilización intensiva de "Pop-ups" limpios para evitar recargar la página (por ejemplo, para resolver tickets de soporte con respuestas personalizadas).
8. **Gestión de Dispositivos**: Restricciones de UI en tiempo real (por ejemplo, bloqueo automático del botón de registro al alcanzar el máximo de dispositivos autorizados).
9. **Arquitectura Vanilla**: No requiere `npm`, Node.js o frameworks externos pesados como React/Vue. Funciona directamente en cualquier servidor web estándar (Apache, Nginx, Live Server).

---

## Cómo Ejecutar (Desarrollo local)

Puesto que es un proyecto de Vanilla JS (frontend puro), no necesitas compilar nada.

**Opción A: Live Server (Recomendado)**
Si usas VSCode, instala la extensión "Live Server", haz clic derecho en `index.html` y selecciona "Open with Live Server".

**Opción B: Servidor HTTP local (Python)**
Si tienes Python instalado, navega a la carpeta `frontend/` y ejecuta:
```bash
python -m http.server 3000
```
Luego abre tu navegador en `http://localhost:3000`.

**Opción C: XAMPP / WAMP**
Coloca la carpeta del proyecto en `htdocs` y accede vía `http://localhost/GamePassKey/frontend/`.

> ⚠️ **Importante**: El frontend está pre-configurado en `js/api.js` para conectarse a `http://localhost:8000/api`. Asegúrate de que el Backend de FastAPI está encendido y escuchando en ese puerto.
