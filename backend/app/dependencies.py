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

security = HTTPBearer()


# ---------------------------------------------------------------------------
# Dependencia principal: usuario autenticado
# ---------------------------------------------------------------------------


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Usuario:
    """
    Valida el Bearer token JWT del header Authorization y chequea estado en BD.
    """
    token = credentials.credentials
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
    if current_user.rol.nombre_rol != "administrador":
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
