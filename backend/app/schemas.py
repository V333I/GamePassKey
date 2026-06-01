"""
Schemas Pydantic — GamePassKey (esquema completo)
Cubre todos los módulos: auth, usuarios, juegos, licencias,
biblioteca, códigos, dispositivos, instalaciones, descargas y logs.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# ===========================================================================
# AUTH
# ===========================================================================

class LoginRequest(BaseModel):
    correo: str = Field(..., description="Correo del usuario", examples=["admin@gamepasskey.local"])
    password: str = Field(..., min_length=6, description="Contraseña")

    model_config = {"json_schema_extra": {"example": {"correo": "admin@gamepasskey.local", "password": "Admin123"}}}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    id_usuario: int
    nombre_usuario: str
    correo: str
    estado: str
    id_rol: int = 1


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    id_usuario: Optional[int] = None
    exp: Optional[datetime] = None


# ===========================================================================
# USUARIOS
# ===========================================================================

class UsuarioBase(BaseModel):
    nombre_usuario: str = Field(..., max_length=100)
    correo: str = Field(..., max_length=150)
    id_rol: int


class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=6, description="Contraseña en texto plano")


class UsuarioUpdate(BaseModel):
    nombre_usuario: Optional[str] = Field(None, max_length=100)
    correo: Optional[str] = Field(None, max_length=150)
    id_rol: Optional[int] = None


class UsuarioEstado(BaseModel):
    estado: str = Field(..., description="activo | bloqueado | inactivo")


class UsuarioUpdatePerfil(BaseModel):
    nombre_usuario: Optional[str] = Field(None, max_length=100)
    password_actual: Optional[str] = None
    password_nuevo: Optional[str] = Field(None, min_length=6)


class UsuarioResponse(BaseModel):
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
    pass


class JuegoUpdate(BaseModel):
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
    id_usuario: int
    id_juego: int
    clave_licencia: str = Field(..., max_length=255)
    fecha_expiracion: Optional[datetime] = None


class LicenciaResponse(BaseModel):
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
    id_licencia: int
    codigo: str = Field(..., max_length=100)
    fecha_expiracion: datetime


class CodigoUsar(BaseModel):
    codigo: str = Field(..., description="Código a canjear")


class CodigoResponse(BaseModel):
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
    id_juego: int
    id_licencia: int


class BibliotecaResponse(BaseModel):
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
    nombre_dispositivo: Optional[str] = Field(None, max_length=150)
    hardware_id: str = Field(..., max_length=255)
    sistema_operativo: Optional[str] = Field(None, max_length=100)


class DispositivoEstado(BaseModel):
    estado: str = Field(..., description="autorizado | bloqueado | eliminado")


class DispositivoResponse(BaseModel):
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
    id_juego: int
    id_licencia: int
    id_dispositivo: int
    id_codigo: Optional[int] = None
    ruta_instalacion: Optional[str] = Field(None, max_length=255)


class InstalacionEstado(BaseModel):
    estado: str = Field(..., description="instalado | desinstalado | bloqueado | error")
    ultima_validacion: Optional[datetime] = None


class InstalacionResponse(BaseModel):
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
    id_juego: int
    id_dispositivo: Optional[int] = None


class DescargaEstado(BaseModel):
    estado: str = Field(..., description="iniciada | completada | fallida | cancelada")


class DescargaResponse(BaseModel):
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
    id_juego: int

class SolicitudResponse(BaseModel):
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
    asunto: str
    mensaje: str

class TicketSoporteResolver(BaseModel):
    estado: str  # "resuelto" o "cerrado"
    respuesta_admin: Optional[str] = None

class TicketSoporteResponse(BaseModel):
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
