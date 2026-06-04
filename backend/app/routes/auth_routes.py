"""
Rutas de autenticación — POST /auth/login, POST /auth/logout
"""

import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth import crear_token_acceso, verificar_password, ACCESS_TOKEN_EXPIRE_MINUTES, decodificar_token
from app.database import get_db
from app.dependencies import registrar_log, security, check_rate_limit
from app.models import Usuario, Sesion
from app.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse, summary="Iniciar sesión")
def login(datos: LoginRequest, request: Request, db: Session = Depends(get_db), rate_limit: bool = Depends(check_rate_limit("LOGIN_FALLIDO"))):
    """Autentica al usuario y devuelve un token JWT stateful."""

    usuario: Usuario | None = (
        db.query(Usuario).filter(Usuario.correo == datos.correo.lower().strip()).first()
    )

    if usuario is None or not verificar_password(datos.password, usuario.password_hash):
        registrar_log(
            db, accion="LOGIN_FALLIDO",
            descripcion=f"Intento fallido para correo: {datos.correo}",
            ip_origen=request.client.host if request.client else None,
            nivel="advertencia",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if usuario.estado != "activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está bloqueada o inactiva. Contacta al administrador.",
        )

    usuario.ultimo_acceso = datetime.now(timezone.utc)
    
    # Crear ID de sesión (jti)
    jti = str(uuid.uuid4())
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Registrar sesión en BD
    nueva_sesion = Sesion(
        id_usuario=usuario.id_usuario,
        token_hash=jti,
        ip_origen=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        estado="activa",
        fecha_expiracion=expiracion
    )
    db.add(nueva_sesion)
    db.commit()
    db.refresh(usuario)

    # El payload incluye el jti
    token = crear_token_acceso(
        data={"sub": usuario.correo, "id_usuario": usuario.id_usuario, "jti": jti},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    registrar_log(
        db, accion="LOGIN_EXITOSO",
        descripcion=f"Usuario {usuario.nombre_usuario} inició sesión (jti: {jti[:8]}...).",
        id_usuario=usuario.id_usuario,
        ip_origen=request.client.host if request.client else None,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        id_usuario=usuario.id_usuario,
        nombre_usuario=usuario.nombre_usuario,
        correo=usuario.correo,
        estado=usuario.estado,
        id_rol=usuario.id_rol,
    )


@router.post("/logout", summary="Cerrar sesión")
def logout(credentials = Depends(security), db: Session = Depends(get_db)):
    """Invalida el token JWT actual cerrando la sesión en BD."""
    token = credentials.credentials
    payload = decodificar_token(token)
    if not payload:
        return {"mensaje": "Sesión cerrada localmente."}
        
    jti = payload.get("jti")
    if jti:
        sesion = db.query(Sesion).filter(Sesion.token_hash == jti).first()
        if sesion and sesion.estado == "activa":
            sesion.estado = "cerrada"
            db.commit()
            
    return {"mensaje": "Sesión cerrada exitosamente."}
