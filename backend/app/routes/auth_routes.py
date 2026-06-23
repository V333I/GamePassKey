"""
Rutas de autenticación — POST /auth/login, POST /auth/logout

Controla el flujo de inicio de sesión de los usuarios validando contraseñas
contra la base de datos y devolviendo tokens JWT para su uso en la API.
"""

import secrets
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth import crear_token_acceso, verificar_password, generar_hash_password, ACCESS_TOKEN_EXPIRE_MINUTES, decodificar_token
from app.database import get_db
from app.dependencies import registrar_log, security, check_rate_limit
from app.limiter import limiter
from app.models import Usuario, Sesion, CodigoOTP
from app.schemas import LoginRequest, TokenResponse, OTPRequiredResponse, VerifyOTPRequest
from app.telegram_service import enviar_otp_telegram

import re
from pydantic import BaseModel, EmailStr, Field, field_validator

# Parámetros del OTP (2FA por Telegram)
OTP_EXPIRA_MINUTOS = 5
OTP_MAX_INTENTOS = 5


def _ip(request: Request) -> str | None:
    """Devuelve la IP de origen de la petición, si está disponible."""
    return request.client.host if request.client else None


def _crear_sesion_y_token(db: Session, usuario: Usuario, request: Request) -> TokenResponse:
    """
    Crea una sesión stateful (jti) en BD y devuelve el TokenResponse con el JWT.
    Se usa tras validar credenciales (login sin OTP), tras verificar el OTP y
    tras un registro exitoso.
    """
    usuario.ultimo_acceso = datetime.now(timezone.utc)

    jti = str(uuid.uuid4())
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    nueva_sesion = Sesion(
        id_usuario=usuario.id_usuario,
        token_hash=jti,
        ip_origen=_ip(request),
        user_agent=request.headers.get("user-agent"),
        estado="activa",
        fecha_expiracion=expiracion,
    )
    db.add(nueva_sesion)
    db.commit()
    db.refresh(usuario)

    token = crear_token_acceso(
        data={"sub": usuario.correo, "id_usuario": usuario.id_usuario, "jti": jti},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
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


def _generar_y_enviar_otp(db: Session, usuario: Usuario, request: Request) -> None:
    """
    Genera un OTP de 6 dígitos, lo guarda hasheado en BD (invalidando los
    pendientes previos) y lo envía al Telegram del usuario.

    Si el envío falla, lanza HTTPException 503 (fail-closed): no se concede
    acceso si no fue posible entregar el código.
    """
    # Invalidar cualquier OTP pendiente anterior de este usuario.
    db.query(CodigoOTP).filter(
        CodigoOTP.id_usuario == usuario.id_usuario,
        CodigoOTP.estado == "pendiente",
    ).update({"estado": "expirado"})

    codigo = f"{secrets.randbelow(1_000_000):06d}"
    otp = CodigoOTP(
        id_usuario=usuario.id_usuario,
        codigo_hash=generar_hash_password(codigo),
        estado="pendiente",
        # fecha_expiracion en UTC naive para ser coherente con el resto de la BD.
        fecha_expiracion=datetime.utcnow() + timedelta(minutes=OTP_EXPIRA_MINUTOS),
    )
    db.add(otp)
    db.commit()

    try:
        enviar_otp_telegram(usuario.telegram_chat_id, codigo, OTP_EXPIRA_MINUTOS)
    except Exception as exc:  # noqa: BLE001 — registramos cualquier fallo de envío
        registrar_log(
            db, accion="OTP_ENVIO_FALLIDO",
            descripcion=f"No se pudo enviar OTP al usuario {usuario.id_usuario}: {exc}",
            id_usuario=usuario.id_usuario,
            ip_origen=_ip(request),
            nivel="critico",
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo enviar el código de verificación por Telegram. Inténtalo más tarde.",
        )

    registrar_log(
        db, accion="OTP_ENVIADO",
        descripcion=f"Código OTP enviado al usuario {usuario.id_usuario} vía Telegram.",
        id_usuario=usuario.id_usuario,
        ip_origen=_ip(request),
    )

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
@limiter.limit("5/minute")
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
    
    # Iniciar sesión automáticamente (el usuario recién creado aún no tiene
    # Telegram vinculado, por lo que no aplica OTP en el registro).
    return _crear_sesion_y_token(db, nuevo_usuario, request)


@router.post("/login", response_model=None, summary="Iniciar sesión")
@limiter.limit("5/minute")
def login(datos: LoginRequest, request: Request, db: Session = Depends(get_db), rate_limit: bool = Depends(check_rate_limit("LOGIN_FALLIDO"))) -> TokenResponse | OTPRequiredResponse:
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

    # --- 2FA: si el usuario tiene Telegram vinculado, exigir OTP ---
    if usuario.telegram_chat_id:
        _generar_y_enviar_otp(db, usuario, request)
        registrar_log(
            db, accion="LOGIN_OTP_PENDIENTE",
            descripcion=f"Credenciales válidas; OTP enviado a {usuario.nombre_usuario}. Pendiente de verificación.",
            id_usuario=usuario.id_usuario,
            ip_origen=_ip(request),
        )
        # No se emite token todavía: el cliente debe llamar a /auth/verify-otp.
        return OTPRequiredResponse(correo=usuario.correo)

    # --- Sin 2FA: emitir token directamente ---
    registrar_log(
        db, accion="LOGIN_EXITOSO",
        descripcion=f"Usuario {usuario.nombre_usuario} inició sesión.",
        id_usuario=usuario.id_usuario,
        ip_origen=_ip(request),
    )
    return _crear_sesion_y_token(db, usuario, request)


@router.post("/verify-otp", response_model=TokenResponse, summary="Verificar código OTP")
@limiter.limit("10/minute")
def verify_otp(datos: VerifyOTPRequest, request: Request, db: Session = Depends(get_db)):
    """
    Segundo paso del login con 2FA: valida el código OTP enviado por Telegram
    y, si es correcto, crea la sesión y devuelve el token JWT.

    Reglas de seguridad:
    - Solo se acepta el OTP 'pendiente' más reciente del usuario.
    - El código caduca a los OTP_EXPIRA_MINUTOS minutos.
    - Tras OTP_MAX_INTENTOS fallos, el código se invalida (hay que reloguear).
    """
    correo_clean = datos.correo.lower().strip()
    usuario = db.query(Usuario).filter(Usuario.correo == correo_clean).first()

    # Respuesta genérica para no revelar si el correo existe.
    error_generico = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Código incorrecto o solicitud inválida.",
    )

    if usuario is None:
        raise error_generico

    otp = (
        db.query(CodigoOTP)
        .filter(CodigoOTP.id_usuario == usuario.id_usuario, CodigoOTP.estado == "pendiente")
        .order_by(CodigoOTP.id_otp.desc())
        .first()
    )

    if otp is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay ningún código pendiente. Inicia sesión de nuevo.",
        )

    # ¿Expirado por tiempo?
    if datetime.utcnow() > otp.fecha_expiracion:
        otp.estado = "expirado"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código ha expirado. Inicia sesión de nuevo.",
        )

    # ¿Demasiados intentos?
    if otp.intentos >= OTP_MAX_INTENTOS:
        otp.estado = "expirado"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos fallidos. Inicia sesión de nuevo.",
        )

    # Verificar el código contra el hash almacenado.
    if not verificar_password(datos.codigo.strip(), otp.codigo_hash):
        otp.intentos += 1
        db.commit()
        registrar_log(
            db, accion="OTP_FALLIDO",
            descripcion=f"Código OTP incorrecto para el usuario {usuario.id_usuario} (intento {otp.intentos}).",
            id_usuario=usuario.id_usuario,
            ip_origen=_ip(request),
            nivel="advertencia",
        )
        raise error_generico

    # Código correcto -> consumir OTP.
    otp.estado = "usado"
    db.commit()

    # Revalidar el estado de la cuenta antes de emitir el token.
    if usuario.estado != "activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está bloqueada o inactiva. Contacta al administrador.",
        )

    registrar_log(
        db, accion="LOGIN_EXITOSO",
        descripcion=f"Usuario {usuario.nombre_usuario} inició sesión tras verificar OTP.",
        id_usuario=usuario.id_usuario,
        ip_origen=_ip(request),
    )
    return _crear_sesion_y_token(db, usuario, request)


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
