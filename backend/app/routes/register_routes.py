"""
Ruta de registro público — POST /auth/register
Permite que nuevos usuarios creen una cuenta con rol 'cliente'.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
import re

from app.auth import crear_token_acceso, generar_hash_password
from app.database import get_db
from app.dependencies import registrar_log, check_rate_limit
from app.limiter import limiter
from app.models import Rol, Usuario
from app.schemas import TokenResponse

router_register = APIRouter(prefix="/auth", tags=["Autenticación"])


# ── Schema de registro ────────────────────────────────────────────

class RegisterRequest(BaseModel):
    nombre_usuario: str = Field(..., min_length=2, max_length=100, description="Nombre de display")
    correo: str         = Field(..., max_length=150, description="Correo electrónico")
    password: str       = Field(..., min_length=8, description="Contraseña (mín. 8 caracteres, mayúscula y número)")

    @field_validator('password')
    @classmethod
    def validar_password_fuerte(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('La contraseña debe contener al menos una letra mayúscula.')
        if not re.search(r'\d', v):
            raise ValueError('La contraseña debe contener al menos un número.')
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "nombre_usuario": "Juan Pérez",
                "correo": "juan@ejemplo.com",
                "password": "MiClaveSegura123",
            }
        }
    }


# ── Endpoint ──────────────────────────────────────────────────────

@router_register.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo usuario",
    description=(
        "Crea una cuenta nueva con rol 'cliente'. "
        "Devuelve un token JWT listo para usar, igual que el login."
    ),
)
@limiter.limit("5/minute")
def register(
    datos: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
    rate_limit: bool = Depends(check_rate_limit("REGISTRO_FALLIDO")),
):
    """
    Proceso de registro:
    1. Verifica que el correo no esté ya registrado.
    2. Busca el rol 'cliente' en la base de datos.
    3. Crea el usuario con contraseña hasheada.
    4. Genera y devuelve un token JWT.
    """

    # 1. Verificar correo único
    existente = db.query(Usuario).filter(
        Usuario.correo == datos.correo.lower().strip()
    ).first()

    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este correo ya está registrado. Intenta iniciar sesión.",
        )

    # 2. Buscar rol 'cliente' (si no existe, usar id_rol = 2)
    rol_cliente = (
        db.query(Rol).filter(Rol.nombre_rol == "cliente").first()
        or db.query(Rol).filter(Rol.id_rol == 2).first()
    )
    if not rol_cliente:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Rol 'cliente' no encontrado. Contacta al administrador.",
        )

    # 3. Crear usuario
    nuevo_usuario = Usuario(
        id_rol=rol_cliente.id_rol,
        nombre_usuario=datos.nombre_usuario.strip(),
        correo=datos.correo.lower().strip(),
        password_hash=generar_hash_password(datos.password),
        estado="activo",
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # 4. Registrar evento
    registrar_log(
        db,
        accion="REGISTRO_USUARIO",
        descripcion=f"Nuevo usuario registrado: {nuevo_usuario.correo}",
        id_usuario=nuevo_usuario.id_usuario,
        ip_origen=request.client.host if request.client else None,
    )

    import uuid
    from datetime import timedelta
    from app.auth import ACCESS_TOKEN_EXPIRE_MINUTES
    from app.models import Sesion
    
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

    # 5. Generar token y devolver respuesta
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
