"""
Rutas de autenticación — POST /auth/login, POST /auth/logout

Controla el flujo de inicio de sesión de los usuarios validando contraseñas
contra la base de datos y devolviendo tokens JWT para su uso en la API.
"""

import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth import crear_token_acceso, verificar_password, generar_hash_password, ACCESS_TOKEN_EXPIRE_MINUTES, decodificar_token
from app.database import get_db
from app.dependencies import registrar_log, security, check_rate_limit
from app.models import Usuario, Sesion
from app.schemas import LoginRequest, TokenResponse

import re
from pydantic import BaseModel, EmailStr, Field, field_validator

class RegisterRequest(BaseModel):
    nombre_usuario: str
    correo: EmailStr
    password: str = Field(..., min_length=8)

    @field_validator('password')
    @classmethod
    def validar_password_fuerte(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('La contraseña debe contener al menos una letra mayúscula.')
        if not re.search(r'[0-9]', v):
            raise ValueError('La contraseña debe contener al menos un número.')
        return v

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/register", response_model=TokenResponse, summary="Registrar usuario")
def register(datos: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario con rol de USUARIO (2) e inicia sesión automáticamente.
    """
    import re
    if re.search(r'[<>]', datos.nombre_usuario) or re.search(r'[<>]', datos.correo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Caracteres no permitidos en el nombre o correo."
        )

    correo_clean = datos.correo.lower().strip()
    
    # Verificar si el correo ya existe
    if db.query(Usuario).filter(Usuario.correo == correo_clean).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo ya está registrado."
        )
        
    # Crear el usuario
    nuevo_usuario = Usuario(
        id_rol=2, # 2 = USUARIO
        nombre_usuario=datos.nombre_usuario,
        correo=correo_clean,
        password_hash=generar_hash_password(datos.password),
        estado="activo",
        ultimo_acceso=datetime.now(timezone.utc)
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    registrar_log(
        db, accion="REGISTRO_USUARIO",
        descripcion=f"Nuevo usuario registrado: {nuevo_usuario.nombre_usuario} ({nuevo_usuario.correo})",
        id_usuario=nuevo_usuario.id_usuario,
        ip_origen=request.client.host if request.client else None,
    )
    
    # Iniciar sesión automáticamente
    jti = str(uuid.uuid4())
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    nueva_sesion = Sesion(
        id_usuario=nuevo_usuario.id_usuario,
        token_hash=jti,
        ip_origen=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        estado="activa",
        fecha_expiracion=expiracion
    )
    db.add(nueva_sesion)
    db.commit()
    
    token = crear_token_acceso(
        data={"sub": nuevo_usuario.correo, "id_usuario": nuevo_usuario.id_usuario, "jti": jti},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        id_usuario=nuevo_usuario.id_usuario,
        nombre_usuario=nuevo_usuario.nombre_usuario,
        correo=nuevo_usuario.correo,
        estado=nuevo_usuario.estado,
        id_rol=nuevo_usuario.id_rol,
    )


@router.post("/login", response_model=TokenResponse, summary="Iniciar sesión")
def login(datos: LoginRequest, request: Request, db: Session = Depends(get_db), rate_limit: bool = Depends(check_rate_limit("LOGIN_FALLIDO"))):
    """
    Autentica al usuario y devuelve un token JWT stateful.
    
    Flujo:
    1. Busca al usuario por su correo electrónico (case-insensitive).
    2. Comprueba que el hash de su contraseña coincida.
    3. Verifica que la cuenta esté 'activa' y no bloqueada.
    4. Crea un ID de sesión único (jti) y lo guarda en la base de datos para control (stateful).
    5. Genera el Token JWT conteniendo el `sub`, `id_usuario` y `jti`.
    6. Registra el evento en los logs de seguridad.
    
    Implementa Rate Limiting para evitar ataques de fuerza bruta.
    """

    # Buscar usuario
    usuario: Usuario | None = (
        db.query(Usuario).filter(Usuario.correo == datos.correo.lower().strip()).first()
    )

    # Validar existencia y contraseña
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

    # Validar estado de la cuenta
    if usuario.estado != "activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está bloqueada o inactiva. Contacta al administrador.",
        )

    # Actualizar última conexión
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

    # El payload incluye el jti para futuras validaciones stateful
    token = crear_token_acceso(
        data={"sub": usuario.correo, "id_usuario": usuario.id_usuario, "jti": jti},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Auditoría
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
    """
    Invalida el token JWT actual cerrando la sesión en BD.
    
    Extrae el `jti` (JWT ID) del token proporcionado en la cabecera, busca la
    sesión correspondiente en la base de datos y cambia su estado a 'cerrada'.
    Esto impide que el mismo token pueda usarse nuevamente (logout real stateful).
    """
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
