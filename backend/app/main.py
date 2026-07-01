"""
GamePassKey API — Punto de entrada principal
Registra todos los módulos de la aplicación.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.limiter import limiter

from app.routes import (
    auth_routes,
    biblioteca_routes,
    codigos_routes,
    descargas_routes,
    dispositivos_routes,
    instalaciones_routes,
    juegos_routes,
    licencias_routes,
    logs_routes,
    register_routes,
    usuarios_routes,
    solicitudes_routes,
    notificaciones_routes,
    soporte_routes,
)

# ---------------------------------------------------------------------------
# Inicialización
# ---------------------------------------------------------------------------

app = FastAPI(
    title="GamePassKey API",
    description=(
        "API backend para GamePassKey: gestión de usuarios, licencias, "
        "juegos, biblioteca, códigos de uso único, dispositivos e instalaciones."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

@app.on_event("startup")
def startup_event():
    from app.telegram_service import start_telegram_polling
    start_telegram_polling()
    
    # Asegurar que existan los roles básicos en la base de datos
    from app.database import SessionLocal
    from app.models import Rol
    db = SessionLocal()
    try:
        if not db.query(Rol).filter(Rol.id_rol == 1).first():
            db.add(Rol(id_rol=1, nombre_rol="Administrador", descripcion="Acceso total"))
        if not db.query(Rol).filter(Rol.id_rol == 2).first():
            db.add(Rol(id_rol=2, nombre_rol="Usuario", descripcion="Acceso estándar"))
            
        # Ampliar el límite de caracteres para la imagen de portada en Postgres/MySQL
        from sqlalchemy import text
        try:
            db.execute(text("ALTER TABLE juegos ALTER COLUMN imagen_portada TYPE VARCHAR(2048);"))
        except Exception:
            # En caso de estar en MySQL (local) o que la sintaxis varíe
            try:
                db.execute(text("ALTER TABLE juegos MODIFY imagen_portada VARCHAR(2048);"))
            except Exception:
                pass
                
        db.commit()
    finally:
        db.close()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ---------------------------------------------------------------------------
# CORS — preparado para frontend local y producción
# ---------------------------------------------------------------------------

# Obtenemos los orígenes permitidos desde las variables de entorno, separados por comas.
# Si no existe, usamos ["*"] (modo de desarrollo inseguro).
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]
else:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Registro de todos los routers
# ---------------------------------------------------------------------------

app.include_router(auth_routes.router)
app.include_router(register_routes.router_register)
app.include_router(usuarios_routes.router)
app.include_router(juegos_routes.router)
app.include_router(licencias_routes.router)
app.include_router(biblioteca_routes.router)
app.include_router(codigos_routes.router)
app.include_router(dispositivos_routes.router)
app.include_router(instalaciones_routes.router)
app.include_router(descargas_routes.router)
app.include_router(logs_routes.router)
app.include_router(solicitudes_routes.router)
app.include_router(notificaciones_routes.router)
app.include_router(soporte_routes.router)

# ---------------------------------------------------------------------------
# Ruta raíz
# ---------------------------------------------------------------------------


@app.get("/", tags=["Estado"])
def raiz():
    """Verifica que la API está en funcionamiento."""
    return {"mensaje": "API GamePassKey funcionando correctamente"}
