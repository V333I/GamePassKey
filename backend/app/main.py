"""
GamePassKey API — Punto de entrada principal
Registra todos los módulos de la aplicación.
"""

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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ---------------------------------------------------------------------------
# CORS — preparado para frontend local
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1",
        "http://127.0.0.1:80",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ],
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
