"""
Dependencias de FastAPI reutilizables.

Incluye:
- get_current_user  : Valida el JWT y retorna el usuario autenticado.
- require_admin     : Verifica que el usuario tenga rol de administrador.
- registrar_log     : Registra eventos en logs_seguridad.
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth import decodificar_token
from app.database import get_db
from app.models import LogSeguridad, Usuario, Sesion

# auto_error=False para permitir extraer el token de la cookie si el header no está
security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Dependencia principal: usuario autenticado
# ---------------------------------------------------------------------------


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Usuario:
    """
    Valida el token JWT desde la cookie 'gpk_token' o del header Authorization.
    """
    token = request.cookies.get("gpk_token")
    is_cookie = True
    
    if not token and credentials:
        token = credentials.credentials
        is_cookie = False
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Prevención CSRF: Si usamos cookies (samesite=none), exigir cabecera custom
    if is_cookie and request.headers.get("X-Requested-With") != "XMLHttpRequest":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Petición bloqueada por prevención CSRF (Falta cabecera X-Requested-With).",
        )
        
    payload = decodificar_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    correo: str | None = payload.get("sub")
    jti: str | None = payload.get("jti")
    
    if correo is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token malformado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if jti:
        sesion = db.query(Sesion).filter(Sesion.token_hash == jti).first()
        if not sesion or sesion.estado != "activa":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión cerrada o expirada.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    usuario = db.query(Usuario).filter(Usuario.correo == correo).first()
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if usuario.estado != "activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está inactiva o bloqueada.",
        )

    return usuario


# ---------------------------------------------------------------------------
# Dependencia: solo administradores
# ---------------------------------------------------------------------------


def require_admin(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    """
    Verifica que el usuario autenticado tenga rol 'administrador'.

    Returns:
        Usuario: El mismo usuario si es administrador.

    Raises:
        HTTPException 403: Si el usuario no tiene rol de administrador.
    """
    if current_user.rol.nombre_rol.lower() != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de administrador.",
        )
    return current_user


# ---------------------------------------------------------------------------
# Utilidad: registrar evento en logs_seguridad
# ---------------------------------------------------------------------------


def registrar_log(
    db: Session,
    accion: str,
    descripcion: str = "",
    id_usuario: int | None = None,
    ip_origen: str | None = None,
    nivel: str = "info",
) -> None:
    """
    Inserta un registro en la tabla logs_seguridad.

    Args:
        db          : Sesión de base de datos activa.
        accion      : Nombre corto de la acción (ej. 'LOGIN', 'CREAR_JUEGO').
        descripcion : Detalle adicional del evento.
        id_usuario  : ID del usuario que realizó la acción (opcional).
        ip_origen   : IP de donde proviene la petición (opcional).
        nivel       : 'info', 'advertencia' o 'critico'.
    """
    log = LogSeguridad(
        id_usuario=id_usuario,
        accion=accion,
        descripcion=descripcion,
        ip_origen=ip_origen,
        nivel=nivel,
    )
    db.add(log)
    db.commit()


# ---------------------------------------------------------------------------
# Dependencia: Rate Limiting por IP y Acción (Protección Fuerza Bruta)
# ---------------------------------------------------------------------------


def check_rate_limit(accion_fallida: str, max_intentos: int = 5, ventana_minutos: int = 15):
    """
    Retorna una dependencia que cuenta los eventos en logs_seguridad
    para la IP de origen en los últimos X minutos.
    Si excede `max_intentos`, lanza un HTTPException 429.
    """
    def dependency(request: Request, db: Session = Depends(get_db)):
        from datetime import datetime, timedelta, timezone
        
        ip_origen = request.client.host if request.client else None
        if not ip_origen:
            return True
            
        ahora = datetime.now(timezone.utc)
        limite_tiempo = ahora - timedelta(minutes=ventana_minutos)
        
        # OJO: fecha_evento en la BD se guarda como datetime.utcnow(), sin timezone
        # Por lo que es mejor usar datetime.utcnow() para comparar con la BD local
        limite_tiempo_utc = datetime.utcnow() - timedelta(minutes=ventana_minutos)
        
        fallos = db.query(LogSeguridad).filter(
            LogSeguridad.accion == accion_fallida,
            LogSeguridad.ip_origen == ip_origen,
            LogSeguridad.fecha_evento >= limite_tiempo_utc
        ).count()
        
        if fallos >= max_intentos:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demasiados intentos fallidos. Por favor, intenta de nuevo en {ventana_minutos} minutos."
            )
        return True
        
    return dependency
