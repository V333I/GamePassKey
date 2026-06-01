"""
Rutas de Solicitudes — /solicitudes
POST /solicitudes                 → Usuario solicita acceso a un juego
GET  /solicitudes                 → Admin ve todas las solicitudes
PUT  /solicitudes/{id}/aprobar    → Admin aprueba (crea licencia, código y notifica)
PUT  /solicitudes/{id}/rechazar   → Admin rechaza (notifica)
"""

from datetime import datetime, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, registrar_log, require_admin
from app.models import SolicitudActivacion, Notificacion, Usuario, Juego, Licencia, CodigoUsoUnico
from app.schemas import SolicitudCreate, SolicitudResponse

router = APIRouter(prefix="/solicitudes", tags=["Solicitudes"])


@router.post("", response_model=SolicitudResponse, status_code=status.HTTP_201_CREATED, summary="Solicitar acceso a un juego")
def solicitar_juego(
    datos: SolicitudCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """El usuario solicita acceso a un juego específico."""
    juego = db.query(Juego).filter(Juego.id_juego == datos.id_juego).first()
    if not juego:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Juego no encontrado.")

    # Verificar si ya tiene una solicitud pendiente
    existente = db.query(SolicitudActivacion).filter(
        SolicitudActivacion.id_usuario == usuario.id_usuario,
        SolicitudActivacion.id_juego == datos.id_juego,
        SolicitudActivacion.estado == "pendiente"
    ).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya tienes una solicitud pendiente para este juego.")

    solicitud = SolicitudActivacion(
        id_usuario=usuario.id_usuario,
        id_juego=datos.id_juego,
        estado="pendiente"
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    registrar_log(db, "SOLICITUD_CREADA", f"Usuario {usuario.id_usuario} solicitó el juego {juego.id_juego}.", id_usuario=usuario.id_usuario)
    return solicitud


@router.get("", summary="Listar todas las solicitudes (Admin)")
def listar_solicitudes(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Lista todas las solicitudes con información del usuario y del juego."""
    solicitudes = db.query(SolicitudActivacion).order_by(SolicitudActivacion.fecha_solicitud.desc()).all()
    resultado = []
    for sol in solicitudes:
        resultado.append({
            "id_solicitud": sol.id_solicitud,
            "id_usuario": sol.id_usuario,
            "nombre_usuario": sol.usuario.nombre_usuario,
            "correo": sol.usuario.correo,
            "id_juego": sol.id_juego,
            "titulo_juego": sol.juego.titulo,
            "estado": sol.estado,
            "fecha_solicitud": sol.fecha_solicitud,
            "fecha_resolucion": sol.fecha_resolucion
        })
    return resultado


@router.put("/{id_solicitud}/aprobar", summary="Aprobar solicitud")
def aprobar_solicitud(
    id_solicitud: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Aprueba la solicitud, genera licencia y código, y notifica al usuario."""
    solicitud = db.query(SolicitudActivacion).filter(SolicitudActivacion.id_solicitud == id_solicitud).first()
    if not solicitud:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada.")
    if solicitud.estado != "pendiente":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La solicitud ya fue procesada.")

    # 1. Generar código y licencia
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    seg = lambda: ''.join(secrets.choice(chars) for _ in range(4))
    codigo_str = f"GPK-{seg()}-{seg()}-{seg()}"

    # Licencia interna asignada al admin temporalmente (o al usuario directamente)
    # Lo asignamos al admin temporalmente para que el usuario deba canjear el código
    nueva_licencia = Licencia(
        id_usuario=admin.id_usuario, 
        id_juego=solicitud.id_juego,
        clave_licencia=codigo_str
    )
    db.add(nueva_licencia)
    db.flush()

    ahora = datetime.now(timezone.utc)
    # Expiración: 7 días para canjear
    import datetime as dt
    expiracion = ahora + dt.timedelta(days=7)

    nuevo_codigo = CodigoUsoUnico(
        id_licencia=nueva_licencia.id_licencia,
        codigo=codigo_str,
        fecha_expiracion=expiracion
    )
    db.add(nuevo_codigo)

    # 2. Actualizar estado de solicitud
    solicitud.estado = "aprobada"
    solicitud.fecha_resolucion = ahora

    # 3. Notificar al usuario
    notificacion = Notificacion(
        id_usuario=solicitud.id_usuario,
        titulo=f"¡Solicitud Aprobada: {solicitud.juego.titulo}!",
        mensaje=f"Felicidades, tu solicitud ha sido aceptada. Tu código de acceso es: {codigo_str}. Ve a la sección de Biblioteca, pulsa 'Canjear Código' y cópialo para empezar a jugar."
    )
    db.add(notificacion)
    
    db.commit()
    registrar_log(db, "SOLICITUD_APROBADA", f"Solicitud {id_solicitud} aprobada. Código enviado.", id_usuario=admin.id_usuario)
    return {"message": "Solicitud aprobada y código enviado."}


@router.put("/{id_solicitud}/rechazar", summary="Rechazar solicitud")
def rechazar_solicitud(
    id_solicitud: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Rechaza la solicitud y notifica al usuario."""
    solicitud = db.query(SolicitudActivacion).filter(SolicitudActivacion.id_solicitud == id_solicitud).first()
    if not solicitud:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada.")
    if solicitud.estado != "pendiente":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La solicitud ya fue procesada.")

    solicitud.estado = "rechazada"
    solicitud.fecha_resolucion = datetime.now(timezone.utc)

    # Notificar al usuario
    notificacion = Notificacion(
        id_usuario=solicitud.id_usuario,
        titulo=f"Solicitud Rechazada: {solicitud.juego.titulo}",
        mensaje=f"Lamentamos informarte que tu solicitud para acceder a {solicitud.juego.titulo} no ha podido ser procesada en este momento."
    )
    db.add(notificacion)

    db.commit()
    registrar_log(db, "SOLICITUD_RECHAZADA", f"Solicitud {id_solicitud} rechazada.", id_usuario=admin.id_usuario)
    return {"message": "Solicitud rechazada."}
