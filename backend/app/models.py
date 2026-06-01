"""
Modelos SQLAlchemy — GamePassKey (esquema completo)
Cubre las 11 tablas de la base de datos + solicitudes y notificaciones.
"""

from datetime import date, datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Rol
# ---------------------------------------------------------------------------

class Rol(Base):
    __tablename__ = "roles"

    id_rol       = Column(Integer, primary_key=True, autoincrement=True)
    nombre_rol   = Column(String(50), nullable=False, unique=True)
    descripcion  = Column(String(255), nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)

    usuarios = relationship("Usuario", back_populates="rol")


# ---------------------------------------------------------------------------
# Usuario
# ---------------------------------------------------------------------------

class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario    = Column(Integer, primary_key=True, autoincrement=True)
    id_rol        = Column(Integer, ForeignKey("roles.id_rol"), nullable=False)
    nombre_usuario= Column(String(100), nullable=False)
    correo        = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    estado        = Column(
        Enum("activo", "bloqueado", "inactivo", name="estado_usuario"),
        default="activo", nullable=False
    )
    ultimo_acceso = Column(DateTime, nullable=True)
    fecha_creacion= Column(DateTime, default=datetime.utcnow, nullable=False)

    rol           = relationship("Rol", back_populates="usuarios")
    licencias     = relationship("Licencia", back_populates="usuario")
    biblioteca    = relationship("BibliotecaUsuario", back_populates="usuario")
    dispositivos  = relationship("Dispositivo", back_populates="usuario")
    instalaciones = relationship("Instalacion", back_populates="usuario")
    descargas     = relationship("Descarga", back_populates="usuario")
    sesiones      = relationship("Sesion", back_populates="usuario")
    logs          = relationship("LogSeguridad", back_populates="usuario")


# ---------------------------------------------------------------------------
# Juego
# ---------------------------------------------------------------------------

class Juego(Base):
    __tablename__ = "juegos"

    id_juego         = Column(Integer, primary_key=True, autoincrement=True)
    titulo           = Column(String(150), nullable=False, index=True)
    descripcion      = Column(Text, nullable=True)
    genero           = Column(String(100), nullable=True)
    desarrollador    = Column(String(150), nullable=True)
    version_actual   = Column(String(50), nullable=True)
    ruta_instalador  = Column(String(255), nullable=True)
    imagen_portada   = Column(String(255), nullable=True)
    estado           = Column(
        Enum("activo", "inactivo", "mantenimiento", name="estado_juego"),
        default="activo", nullable=True
    )
    fecha_lanzamiento = Column(Date, nullable=True)
    fecha_creacion    = Column(DateTime, default=datetime.utcnow, nullable=False)

    licencias     = relationship("Licencia", back_populates="juego")
    biblioteca    = relationship("BibliotecaUsuario", back_populates="juego")
    instalaciones = relationship("Instalacion", back_populates="juego")
    descargas     = relationship("Descarga", back_populates="juego")


# ---------------------------------------------------------------------------
# Licencia
# ---------------------------------------------------------------------------

class Licencia(Base):
    __tablename__ = "licencias"

    id_licencia      = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario       = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_juego         = Column(Integer, ForeignKey("juegos.id_juego"), nullable=False)
    clave_licencia   = Column(String(255), unique=True, nullable=False)
    estado           = Column(
        Enum("activa", "revocada", "expirada", name="estado_licencia"),
        default="activa", nullable=True
    )
    fecha_compra     = Column(DateTime, default=datetime.utcnow, nullable=True)
    fecha_expiracion = Column(DateTime, nullable=True)

    usuario       = relationship("Usuario", back_populates="licencias")
    juego         = relationship("Juego", back_populates="licencias")
    codigos       = relationship("CodigoUsoUnico", back_populates="licencia")
    biblioteca    = relationship("BibliotecaUsuario", back_populates="licencia")
    instalaciones = relationship("Instalacion", back_populates="licencia")


# ---------------------------------------------------------------------------
# Código de uso único
# ---------------------------------------------------------------------------

class CodigoUsoUnico(Base):
    __tablename__ = "codigos_uso_unico"

    id_codigo        = Column(Integer, primary_key=True, autoincrement=True)
    id_licencia      = Column(Integer, ForeignKey("licencias.id_licencia"), nullable=False)
    codigo           = Column(String(100), unique=True, nullable=False)
    estado           = Column(
        Enum("disponible", "usado", "expirado", "revocado", name="estado_codigo"),
        default="disponible", nullable=True
    )
    fecha_generacion = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_expiracion = Column(DateTime, nullable=False)
    fecha_uso        = Column(DateTime, nullable=True)

    licencia      = relationship("Licencia", back_populates="codigos")
    instalaciones = relationship("Instalacion", back_populates="codigo")


# ---------------------------------------------------------------------------
# Biblioteca de usuario
# ---------------------------------------------------------------------------

class BibliotecaUsuario(Base):
    __tablename__ = "biblioteca_usuario"

    id_biblioteca = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario    = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_juego      = Column(Integer, ForeignKey("juegos.id_juego"), nullable=False)
    id_licencia   = Column(Integer, ForeignKey("licencias.id_licencia"), nullable=False)
    fecha_agregado= Column(DateTime, default=datetime.utcnow, nullable=False)

    usuario   = relationship("Usuario", back_populates="biblioteca")
    juego     = relationship("Juego", back_populates="biblioteca")
    licencia  = relationship("Licencia", back_populates="biblioteca")


# ---------------------------------------------------------------------------
# Dispositivo
# ---------------------------------------------------------------------------

class Dispositivo(Base):
    __tablename__ = "dispositivos"

    id_dispositivo    = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario        = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    nombre_dispositivo= Column(String(150), nullable=True)
    hardware_id       = Column(String(255), nullable=False, index=True)
    sistema_operativo = Column(String(100), nullable=True)
    ip_registro       = Column(String(45), nullable=True)
    estado            = Column(
        Enum("autorizado", "bloqueado", "eliminado", name="estado_dispositivo"),
        default="autorizado", nullable=True
    )
    fecha_registro    = Column(DateTime, default=datetime.utcnow, nullable=False)
    ultimo_uso        = Column(DateTime, nullable=True)

    usuario       = relationship("Usuario", back_populates="dispositivos")
    instalaciones = relationship("Instalacion", back_populates="dispositivo")
    descargas     = relationship("Descarga", back_populates="dispositivo")


# ---------------------------------------------------------------------------
# Instalación
# ---------------------------------------------------------------------------

class Instalacion(Base):
    __tablename__ = "instalaciones"

    id_instalacion   = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario       = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_juego         = Column(Integer, ForeignKey("juegos.id_juego"), nullable=False)
    id_licencia      = Column(Integer, ForeignKey("licencias.id_licencia"), nullable=False)
    id_dispositivo   = Column(Integer, ForeignKey("dispositivos.id_dispositivo"), nullable=False)
    id_codigo        = Column(Integer, ForeignKey("codigos_uso_unico.id_codigo"), nullable=True)
    estado           = Column(
        Enum("instalado", "desinstalado", "bloqueado", "error", name="estado_instalacion"),
        default="instalado", nullable=True
    )
    ruta_instalacion  = Column(String(255), nullable=True)
    fecha_instalacion = Column(DateTime, default=datetime.utcnow, nullable=False)
    ultima_validacion = Column(DateTime, nullable=True)

    usuario    = relationship("Usuario", back_populates="instalaciones")
    juego      = relationship("Juego", back_populates="instalaciones")
    licencia   = relationship("Licencia", back_populates="instalaciones")
    dispositivo= relationship("Dispositivo", back_populates="instalaciones")
    codigo     = relationship("CodigoUsoUnico", back_populates="instalaciones")


# ---------------------------------------------------------------------------
# Descarga
# ---------------------------------------------------------------------------

class Descarga(Base):
    __tablename__ = "descargas"

    id_descarga    = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario     = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_juego       = Column(Integer, ForeignKey("juegos.id_juego"), nullable=False)
    id_dispositivo = Column(Integer, ForeignKey("dispositivos.id_dispositivo"), nullable=True)
    ip_descarga    = Column(String(45), nullable=True)
    estado         = Column(
        Enum("iniciada", "completada", "fallida", "cancelada", name="estado_descarga"),
        default="iniciada", nullable=True
    )
    fecha_descarga = Column(DateTime, default=datetime.utcnow, nullable=False)

    usuario    = relationship("Usuario", back_populates="descargas")
    juego      = relationship("Juego", back_populates="descargas")
    dispositivo= relationship("Dispositivo", back_populates="descargas")


# ---------------------------------------------------------------------------
# Sesión
# ---------------------------------------------------------------------------

class Sesion(Base):
    __tablename__ = "sesiones"

    id_sesion       = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario      = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    token_hash      = Column(String(255), nullable=False)
    ip_origen       = Column(String(45), nullable=True)
    user_agent      = Column(String(255), nullable=True)
    estado          = Column(
        Enum("activa", "cerrada", "expirada", name="estado_sesion"),
        default="activa", nullable=True
    )
    fecha_inicio    = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_expiracion= Column(DateTime, nullable=False)

    usuario = relationship("Usuario", back_populates="sesiones")


# ---------------------------------------------------------------------------
# Log de seguridad
# ---------------------------------------------------------------------------

class LogSeguridad(Base):
    __tablename__ = "logs_seguridad"

    id_log      = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario  = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    accion      = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)
    ip_origen   = Column(String(45), nullable=True)
    nivel       = Column(
        Enum("info", "advertencia", "critico", name="nivel_log"),
        default="info", nullable=True
    )
    fecha_evento= Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    usuario = relationship("Usuario", back_populates="logs")


# ---------------------------------------------------------------------------
# Solicitudes de Activación
# ---------------------------------------------------------------------------

class SolicitudActivacion(Base):
    __tablename__ = "solicitudes_activacion"

    id_solicitud     = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario       = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_juego         = Column(Integer, ForeignKey("juegos.id_juego"), nullable=False)
    estado           = Column(
        Enum("pendiente", "aprobada", "rechazada", name="estado_solicitud"),
        default="pendiente", nullable=True
    )
    fecha_solicitud  = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_resolucion = Column(DateTime, nullable=True)

    usuario = relationship("Usuario", backref="solicitudes")
    juego   = relationship("Juego", backref="solicitudes")


# ---------------------------------------------------------------------------
# Notificaciones
# ---------------------------------------------------------------------------

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id_notificacion = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario      = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    titulo          = Column(String(150), nullable=False)
    mensaje         = Column(Text, nullable=False)
    leida           = Column(Integer, default=0, nullable=True) # Usamos Integer como Booleano (0 o 1) por compatibilidad MySQL/SQLite
    fecha_creacion  = Column(DateTime, default=datetime.utcnow, nullable=False)

    usuario = relationship("Usuario", backref="notificaciones")

# ---------------------------------------------------------------------------
# Tickets de Soporte
# ---------------------------------------------------------------------------

class TicketSoporte(Base):
    __tablename__ = "tickets_soporte"

    id_ticket      = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario     = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    asunto         = Column(String(150), nullable=False)
    mensaje        = Column(Text, nullable=False)
    estado         = Column(
        Enum("abierto", "resuelto", "cerrado", name="estado_ticket"),
        default="abierto", nullable=True
    )
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_cierre   = Column(DateTime, nullable=True)

    usuario = relationship("Usuario", backref="tickets_soporte")
