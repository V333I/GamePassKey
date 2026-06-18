"""
Schemas Pydantic — GamePassKey (esquema completo)
Cubre todos los módulos: auth, usuarios, juegos, licencias,
biblioteca, códigos, dispositivos, instalaciones, descargas y logs.
Define las estructuras de datos esperadas en las peticiones (Request)
y las devueltas en las respuestas (Response) de la API, validando los datos.
"""

import re
from datetime import date, datetime
from typing import Optional, List, Generic, TypeVar

from pydantic import BaseModel, Field, field_validator

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """
    Schema genérico para respuestas paginadas.
    Permite encapsular listas de cualquier otro schema junto con el total de registros.
    """
    total: int
    items: List[T]

# ===========================================================================
# AUTH
# ===========================================================================

class LoginRequest(BaseModel):
    """Schema para la petición de inicio de sesión."""
    correo: str = Field(..., description="Correo del usuario", examples=["admin@gamepasskey.local"])
    password: str = Field(..., min_length=6, description="Contraseña")

    model_config = {"json_schema_extra": {"example": {"correo": "admin@gamepasskey.local", "password": "Admin123"}}}


class TokenResponse(BaseModel):
    """Schema para la respuesta de un inicio de sesión exitoso (JWT)."""
    access_token: str
    token_type: str = "bearer"
    id_usuario: int
    nombre_usuario: str
    correo: str
    estado: str
    id_rol: int = 1


class TokenPayload(BaseModel):
    """Schema para los datos internos que se guardan en el token JWT."""
    sub: Optional[str] = None
    id_usuario: Optional[int] = None
    exp: Optional[datetime] = None


# ===========================================================================
# USUARIOS
# ===========================================================================

class UsuarioBase(BaseModel):
    """Schema base para los datos de un usuario."""
    nombre_usuario: str = Field(..., max_length=100)
    correo: str = Field(..., max_length=150)
    id_rol: int


class UsuarioCreate(UsuarioBase):
    """Schema para la creación de un nuevo usuario."""
    password: str = Field(..., min_length=8, description="Contraseña en texto plano")

    @field_validator('password')
    @classmethod
    def validar_password_fuerte(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('La contraseña debe contener al menos una letra mayúscula.')
        if not re.search(r'[0-9]', v):
            raise ValueError('La contraseña debe contener al menos un número.')
        return v


class UsuarioUpdate(BaseModel):
    """Schema para la actualización de datos de un usuario por un administrador."""
    nombre_usuario: Optional[str] = Field(None, max_length=100)
    correo: Optional[str] = Field(None, max_length=150)
    id_rol: Optional[int] = None


class UsuarioEstado(BaseModel):
    """Schema para cambiar el estado de un usuario."""
    estado: str = Field(..., description="activo | bloqueado | inactivo")


class UsuarioUpdatePerfil(BaseModel):
    """Schema para la actualización del perfil por el propio usuario."""
    nombre_usuario: Optional[str] = Field(None, max_length=100)
    password_actual: Optional[str] = None
    password_nuevo: Optional[str] = Field(None, min_length=6)


class UsuarioResponse(BaseModel):
    """Schema de respuesta con los datos de un usuario (excluye contraseña)."""
    id_usuario: int
    id_rol: int
    nombre_usuario: str
    correo: str
    estado: str
    ultimo_acceso: Optional[datetime] = None
    fecha_creacion: datetime

    model_config = {"from_attributes": True}


# ===========================================================================
# JUEGOS
# ===========================================================================

class JuegoBase(BaseModel):
    """Schema base para los datos de un juego."""
    titulo: str = Field(..., max_length=150)
    descripcion: Optional[str] = None
    genero: Optional[str] = Field(None, max_length=100)
    desarrollador: Optional[str] = Field(None, max_length=150)
    version_actual: Optional[str] = Field(None, max_length=50)
    ruta_instalador: Optional[str] = Field(None, max_length=255)
    imagen_portada: Optional[str] = Field(None, max_length=255)
    estado: Optional[str] = Field("activo", description="activo | inactivo | mantenimiento")
    fecha_lanzamiento: Optional[date] = None


class JuegoCreate(JuegoBase):
    """Schema para la creación de un nuevo juego en el catálogo."""
    pass


class JuegoUpdate(BaseModel):
    """Schema para actualizar metadatos de un juego."""
    titulo: Optional[str] = Field(None, max_length=150)
    descripcion: Optional[str] = None
    genero: Optional[str] = Field(None, max_length=100)
    desarrollador: Optional[str] = Field(None, max_length=150)
    version_actual: Optional[str] = Field(None, max_length=50)
    ruta_instalador: Optional[str] = Field(None, max_length=255)
    imagen_portada: Optional[str] = Field(None, max_length=255)
    estado: Optional[str] = None
    fecha_lanzamiento: Optional[date] = None


class JuegoResponse(BaseModel):
    """Schema de respuesta con los detalles de un juego."""
    id_juego: int
    titulo: str
    descripcion: Optional[str] = None
    genero: Optional[str] = None
    desarrollador: Optional[str] = None
    version_actual: Optional[str] = None
    ruta_instalador: Optional[str] = None
    imagen_portada: Optional[str] = None
    estado: Optional[str] = None
    fecha_lanzamiento: Optional[date] = None
    fecha_creacion: datetime

    model_config = {"from_attributes": True}


# ===========================================================================
# LICENCIAS
# ===========================================================================

class LicenciaCreate(BaseModel):
    """Schema para asignar una licencia a un usuario."""
    id_usuario: int
    id_juego: int
    clave_licencia: Optional[str] = Field(None, max_length=255)
    fecha_expiracion: Optional[datetime] = None


class LicenciaResponse(BaseModel):
    """Schema de respuesta con los datos de una licencia."""
    id_licencia: int
    id_usuario: int
    id_juego: int
    clave_licencia: str
    estado: Optional[str] = None
    fecha_compra: Optional[datetime] = None
    fecha_expiracion: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ===========================================================================
# CÓDIGOS DE USO ÚNICO
# ===========================================================================

class CodigoGenerar(BaseModel):
    """Schema para generar un token de instalación temporal para un juego."""
    id_licencia: int
    codigo: Optional[str] = Field(None, max_length=100)
    fecha_expiracion: datetime


class CodigoUsar(BaseModel):
    """Schema para consumir un token de instalación."""
    codigo: str = Field(..., description="Código a canjear")


class CodigoResponse(BaseModel):
    """Schema de respuesta con los detalles de un código de instalación."""
    id_codigo: int
    id_licencia: int
    codigo: str
    estado: Optional[str] = None
    fecha_generacion: datetime
    fecha_expiracion: datetime
    fecha_uso: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ===========================================================================
# BIBLIOTECA
# ===========================================================================

class BibliotecaAgregar(BaseModel):
    """Schema para registrar que un juego fue añadido a la biblioteca del usuario."""
    id_juego: int
    id_licencia: int


class BibliotecaResponse(BaseModel):
    """Schema de respuesta de un ítem en la biblioteca."""
    id_biblioteca: int
    id_usuario: int
    id_juego: int
    id_licencia: int
    fecha_agregado: datetime
    juego: Optional[JuegoResponse] = None

    model_config = {"from_attributes": True}


# ===========================================================================
# DISPOSITIVOS
# ===========================================================================

class DispositivoCreate(BaseModel):
    """Schema para registrar un nuevo dispositivo (PC) de un usuario."""
    nombre_dispositivo: Optional[str] = Field(None, max_length=150)
    hardware_id: str = Field(..., max_length=255)
    sistema_operativo: Optional[str] = Field(None, max_length=100)


class DispositivoEstado(BaseModel):
    """Schema para bloquear o autorizar un dispositivo."""
    estado: str = Field(..., description="autorizado | bloqueado | eliminado")


class DispositivoResponse(BaseModel):
    """Schema de respuesta con los detalles de un dispositivo autorizado."""
    id_dispositivo: int
    id_usuario: int
    nombre_dispositivo: Optional[str] = None
    hardware_id: str
    sistema_operativo: Optional[str] = None
    ip_registro: Optional[str] = None
    estado: Optional[str] = None
    fecha_registro: datetime
    ultimo_uso: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ===========================================================================
# INSTALACIONES
# ===========================================================================

class InstalacionCreate(BaseModel):
    """Schema para registrar que un juego fue instalado."""
    id_juego: int
    id_licencia: int
    id_dispositivo: int
    id_codigo: Optional[int] = None
    ruta_instalacion: Optional[str] = Field(None, max_length=255)


class InstalacionEstado(BaseModel):
    """Schema para actualizar el estado de una instalación (ej. desinstalado)."""
    estado: str = Field(..., description="instalado | desinstalado | bloqueado | error")
    ultima_validacion: Optional[datetime] = None


class InstalacionResponse(BaseModel):
    """Schema de respuesta con el historial de instalaciones."""
    id_instalacion: int
    id_usuario: int
    id_juego: int
    id_licencia: int
    id_dispositivo: int
    id_codigo: Optional[int] = None
    estado: Optional[str] = None
    ruta_instalacion: Optional[str] = None
    fecha_instalacion: datetime
    ultima_validacion: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ===========================================================================
# DESCARGAS
# ===========================================================================

class DescargaCreate(BaseModel):
    """Schema para registrar el inicio de una descarga del juego."""
    id_juego: int
    id_dispositivo: Optional[int] = None


class DescargaEstado(BaseModel):
    """Schema para actualizar si la descarga terminó bien o falló."""
    estado: str = Field(..., description="iniciada | completada | fallida | cancelada")


class DescargaResponse(BaseModel):
    """Schema de respuesta de un registro de descarga."""
    id_descarga: int
    id_usuario: int
    id_juego: int
    id_dispositivo: Optional[int] = None
    ip_descarga: Optional[str] = None
    estado: Optional[str] = None
    fecha_descarga: datetime

    model_config = {"from_attributes": True}


# ===========================================================================
# LOGS DE SEGURIDAD
# ===========================================================================

class LogResponse(BaseModel):
    """Schema de respuesta de auditoría (logs) de las acciones de la plataforma."""
    id_log: int
    id_usuario: Optional[int] = None
    accion: str
    descripcion: Optional[str] = None
    ip_origen: Optional[str] = None
    nivel: Optional[str] = None
    fecha_evento: datetime

    model_config = {"from_attributes": True}


# ===========================================================================
# SOLICITUDES DE ACTIVACIÓN
# ===========================================================================

class SolicitudCreate(BaseModel):
    """Schema para que un usuario pida acceso a un juego."""
    id_juego: int

class SolicitudResponse(BaseModel):
    """Schema de respuesta con el estado de una solicitud (aprobada/rechazada/pendiente)."""
    id_solicitud: int
    id_usuario: int
    id_juego: int
    estado: str
    fecha_solicitud: datetime
    fecha_resolucion: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ===========================================================================
# NOTIFICACIONES
# ===========================================================================

class NotificacionResponse(BaseModel):
    """Schema de respuesta para notificar mensajes al usuario."""
    id_notificacion: int
    id_usuario: int
    titulo: str
    mensaje: str
    leida: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True

# ===========================================================================
# SOPORTE
# ===========================================================================

class TicketSoporteCreate(BaseModel):
    """Schema para abrir un ticket de soporte/ayuda."""
    asunto: str
    mensaje: str

class TicketSoporteResolver(BaseModel):
    """Schema para que un admin resuelva o cierre un ticket."""
    estado: str  # "resuelto" o "cerrado"
    respuesta_admin: Optional[str] = None

class TicketSoporteResponse(BaseModel):
    """Schema de respuesta con los datos de un ticket de soporte."""
    id_ticket: int
    id_usuario: int
    asunto: str
    mensaje: str
    estado: str
    fecha_creacion: datetime
    fecha_cierre: Optional[datetime] = None
    
    # Datos opcionales del usuario para el panel admin
    correo_usuario: Optional[str] = None
    nombre_usuario: Optional[str] = None

    class Config:
        from_attributes = True
