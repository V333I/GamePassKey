"""
Modelos SQLAlchemy — GamePassKey (esquema completo)
Cubre las 11 tablas de la base de datos + solicitudes y notificaciones.
Cada clase representa una tabla en la base de datos relacional y define
su estructura, tipos de datos, restricciones y relaciones.
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
    """
    Modelo de la tabla 'roles'.
    Define los diferentes niveles de acceso del sistema (ej. admin, usuario).
    """
    __tablename__ = "roles"

    id_rol       = Column(Integer, primary_key=True, autoincrement=True)
    nombre_rol   = Column(String(50), nullable=False, unique=True)
    descripcion  = Column(String(255), nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relación uno a muchos con usuarios
    usuarios = relationship("Usuario", back_populates="rol")


# ---------------------------------------------------------------------------
# Usuario
# ---------------------------------------------------------------------------

class Usuario(Base):
    """
    Modelo de la tabla 'usuarios'.
    Almacena la información de autenticación y datos básicos de los clientes
    y administradores de la plataforma.
    """
    __tablename__ = "usuarios"

    id_usuario    = Column(Integer, primary_key=True, autoincrement=True)
    id_rol        = Column(Integer, ForeignKey("roles.id_rol"), nullable=False)
    nombre_usuario= Column(String(100), nullable=False)
    correo        = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    telegram_chat_id = Column(String(50), nullable=True)  # Chat de Telegram para 2FA (OTP). NULL = sin OTP.
    telegram_link_token = Column(String(100), nullable=True, unique=True, index=True) # Token temporal para Deep Linking
    telegram_link_expires = Column(DateTime, nullable=True) # Expiración del token
    estado        = Column(
        Enum("activo", "bloqueado", "inactivo", name="estado_usuario"),
        default="activo", nullable=False
    )
    ultimo_acceso = Column(DateTime, nullable=True)
    fecha_creacion= Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relaciones con otras tablas
    rol           = relationship("Rol", back_populates="usuarios")
    licencias     = relationship("Licencia", back_populates="usuario")
    biblioteca    = relationship("BibliotecaUsuario", back_populates="usuario")
    dispositivos  = relationship("Dispositivo", back_populates="usuario")
    instalaciones = relationship("Instalacion", back_populates="usuario")
    descargas     = relationship("Descarga", back_populates="usuario")
    sesiones      = relationship("Sesion", back_populates="usuario")
    logs          = relationship("LogSeguridad", back_populates="usuario")
    codigos_otp   = relationship("CodigoOTP", back_populates="usuario")


# ---------------------------------------------------------------------------
# Juego
# ---------------------------------------------------------------------------

class Juego(Base):
    """
    Modelo de la tabla 'juegos'.
    Contiene el catálogo de aplicaciones/juegos disponibles en la plataforma,
    incluyendo sus metadatos y rutas de instalación.
    """
    __tablename__ = "juegos"

    id_juego         = Column(Integer, primary_key=True, autoincrement=True)
    titulo           = Column(String(150), nullable=False, index=True)
    descripcion      = Column(Text, nullable=True)
    genero           = Column(String(100), nullable=True)
    desarrollador    = Column(String(150), nullable=True)
    version_actual   = Column(String(50), nullable=True)
    ruta_instalador  = Column(String(255), nullable=True)
    imagen_portada   = Column(String(2048), nullable=True)
    estado           = Column(
        Enum("activo", "inactivo", "mantenimiento", name="estado_juego"),
        default="activo", nullable=True
    )
    fecha_lanzamiento = Column(Date, nullable=True)
    fecha_creacion    = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relaciones
    licencias     = relationship("Licencia", back_populates="juego")
    biblioteca    = relationship("BibliotecaUsuario", back_populates="juego")
    instalaciones = relationship("Instalacion", back_populates="juego")
    descargas     = relationship("Descarga", back_populates="juego")


# ---------------------------------------------------------------------------
# Licencia
# ---------------------------------------------------------------------------

class Licencia(Base):
    """
    Modelo de la tabla 'licencias'.
    Representa el derecho de uso (compra/suscripción) de un usuario sobre un juego.
    """
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

    # Relaciones
    usuario       = relationship("Usuario", back_populates="licencias")
    juego         = relationship("Juego", back_populates="licencias")
    codigos       = relationship("CodigoUsoUnico", back_populates="licencia")
    biblioteca    = relationship("BibliotecaUsuario", back_populates="licencia")
    instalaciones = relationship("Instalacion", back_populates="licencia")


# ---------------------------------------------------------------------------
# Código de uso único
# ---------------------------------------------------------------------------

class CodigoUsoUnico(Base):
    """
    Modelo de la tabla 'codigos_uso_unico'.
    Tokens de seguridad generados para instalaciones específicas,
    evitando que una misma licencia se use simultáneamente sin control.
    """
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
    """
    Modelo de la tabla 'biblioteca_usuario'.
    Tabla intermedia/registro para acceder rápidamente a los juegos que posee
    el usuario listos para visualizar o descargar.
    """
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
    """
    Modelo de la tabla 'dispositivos'.
    Registra las computadoras autorizadas por el usuario (HWID, OS) para
    evitar el abuso de compartir licencias indiscriminadamente.
    """
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
    """
    Modelo de la tabla 'instalaciones'.
    Registra qué juego está instalado, con qué licencia, en qué dispositivo.
    Permite trazar el uso activo de las licencias.
    """
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
    """
    Modelo de la tabla 'descargas'.
    Historial de intentos de descarga de los binarios/instaladores de los juegos.
    """
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
    """
    Modelo de la tabla 'sesiones'.
    Gestión de las sesiones web/API activas para el control de autenticación.
    """
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
    """
    Modelo de la tabla 'logs_seguridad'.
    Registro de auditoría (Audit Log) para trackear acciones sensibles
    realizadas por administradores o anomalías de usuarios.
    """
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
    """
    Modelo de la tabla 'solicitudes_activacion'.
    Permite a un usuario normal pedir autorización/licencia para un juego específico.
    """
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
    """
    Modelo de la tabla 'notificaciones'.
    Alertas internas para el panel de usuario (ej. solicitud aprobada).
    """
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
    """
    Modelo de la tabla 'tickets_soporte'.
    Sistema básico de contacto/ayuda entre el usuario y el administrador.
    """
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


# ---------------------------------------------------------------------------
# Código OTP (2FA por Telegram)
# ---------------------------------------------------------------------------

class CodigoOTP(Base):
    """
    Modelo de la tabla 'codigos_otp'.
    Almacena los códigos de un solo uso (One-Time Password) que se envían por
    Telegram durante el inicio de sesión de los usuarios con 2FA habilitado.
    El código se guarda hasheado (bcrypt), nunca en texto plano.
    """
    __tablename__ = "codigos_otp"

    id_otp           = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario       = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    codigo_hash      = Column(String(255), nullable=False)
    proposito        = Column(
        Enum("login", "recuperacion", name="proposito_otp"),
        default="login", nullable=False
    )
    estado           = Column(
        Enum("pendiente", "usado", "expirado", name="estado_otp"),
        default="pendiente", nullable=False
    )
    intentos         = Column(Integer, default=0, nullable=False)
    fecha_creacion   = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_expiracion = Column(DateTime, nullable=False)

    usuario = relationship("Usuario", back_populates="codigos_otp")
