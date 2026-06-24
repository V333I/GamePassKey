"""
Rutas de dispositivos — /dispositivos
GET  /dispositivos/mis-dispositivos    → dispositivos del usuario
POST /dispositivos                     → registrar dispositivo
PUT  /dispositivos/{id}/estado         → cambiar estado (admin)
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, registrar_log, require_admin
from app.models import Dispositivo, Usuario
from app.schemas import DispositivoCreate, DispositivoEstado, DispositivoResponse

router = APIRouter(prefix="/dispositivos", tags=["Dispositivos"])


@router.get("/mis-dispositivos", response_model=List[DispositivoResponse], summary="Mis dispositivos")
def mis_dispositivos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Lista todos los dispositivos registrados del usuario autenticado."""
    return (
        db.query(Dispositivo)
        .filter(
            Dispositivo.id_usuario == usuario.id_usuario,
            Dispositivo.estado != "eliminado",
        )
        .all()
    )


@router.post("", response_model=DispositivoResponse, status_code=status.HTTP_201_CREATED, summary="Registrar dispositivo")
def registrar_dispositivo(
    datos: DispositivoCreate,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Registra un nuevo dispositivo para el usuario autenticado (máx 2)."""
    # Bloqueo a nivel de usuario para evitar bypass por condiciones de carrera (Race Conditions)
    db.query(Usuario).filter(Usuario.id_usuario == usuario.id_usuario).with_for_update().first()

    # Verificar límite de 2 dispositivos
    activos = db.query(Dispositivo).filter(
        Dispositivo.id_usuario == usuario.id_usuario,
        Dispositivo.estado != "eliminado"
    ).count()
    if activos >= 2:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Has alcanzado el límite máximo de 2 dispositivos registrados.")
    existente = db.query(Dispositivo).filter(
        Dispositivo.hardware_id == datos.hardware_id,
        Dispositivo.id_usuario == usuario.id_usuario,
    ).first()
    if existente:
        # Si ya existe pero fue eliminado, lo reactiva
        if existente.estado == "eliminado":
            existente.estado = "autorizado"
            existente.ultimo_uso = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existente)
            return existente
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El dispositivo ya está registrado.")

    ip = request.client.host if request.client else None
    dispositivo = Dispositivo(
        id_usuario=usuario.id_usuario,
        nombre_dispositivo=datos.nombre_dispositivo,
        hardware_id=datos.hardware_id,
        sistema_operativo=datos.sistema_operativo,
        ip_registro=ip,
    )
    db.add(dispositivo)
    db.commit()
    db.refresh(dispositivo)
    registrar_log(db, "REGISTRAR_DISPOSITIVO", f"Dispositivo {datos.hardware_id} registrado.", id_usuario=usuario.id_usuario, ip_origen=ip)
    return dispositivo

@router.get("/usuario/{id_usuario}", response_model=List[DispositivoResponse], summary="Dispositivos de un usuario")
def dispositivos_usuario(
    id_usuario: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Devuelve los dispositivos de un usuario específico. Solo administradores."""
    # Verificamos que el usuario existe
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
        
    return (
        db.query(Dispositivo)
        .filter(
            Dispositivo.id_usuario == id_usuario,
            Dispositivo.estado != "eliminado",
        )
        .all()
    )



@router.post("/{id_dispositivo}/desvincular", response_model=dict, summary="Desvincular dispositivo")
def desvincular_dispositivo(
    id_dispositivo: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """
    Desvincula un dispositivo del usuario.
    Verifica que el dispositivo pertenezca al usuario y aplica un cooldown de 30 días para volver a desvincular.
    """
    from datetime import datetime, timedelta, timezone
    from app.models import LogSeguridad

    # 1. Verificar propiedad del dispositivo
    dispositivo = db.query(Dispositivo).filter(Dispositivo.id_dispositivo == id_dispositivo).first()
    if not dispositivo or dispositivo.id_usuario != usuario.id_usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispositivo no encontrado o no te pertenece.")
    
    if dispositivo.estado == "eliminado":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El dispositivo ya está desvinculado.")

    # 2. Verificar Cooldown (1 vez cada 30 días)
    limite_tiempo_utc = datetime.utcnow() - timedelta(days=30)
    
    ultimo_desvinculo = db.query(LogSeguridad).filter(
        LogSeguridad.accion == "DESVINCULAR_DISPOSITIVO",
        LogSeguridad.id_usuario == usuario.id_usuario,
        LogSeguridad.fecha_evento >= limite_tiempo_utc
    ).order_by(LogSeguridad.fecha_evento.desc()).first()

    if ultimo_desvinculo:
        dias_restantes = 30 - (datetime.utcnow() - ultimo_desvinculo.fecha_evento).days
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Ya has desvinculado un dispositivo recientemente. Por seguridad, debes esperar {dias_restantes} días para desvincular otro."
        )

    # 3. Proceder con la desvinculación
    dispositivo.estado = "eliminado"
    db.commit()
    
    # 4. Registrar acción para iniciar cooldown
    registrar_log(
        db, "DESVINCULAR_DISPOSITIVO",
        f"Dispositivo {dispositivo.nombre_dispositivo} ({dispositivo.hardware_id}) desvinculado por el usuario.",
        id_usuario=usuario.id_usuario,
        ip_origen=request.client.host if request.client else None
    )

    return {"message": "Dispositivo desvinculado con éxito."}

@router.put("/{id_dispositivo}/estado", response_model=DispositivoResponse, summary="Cambiar estado dispositivo")
def cambiar_estado_dispositivo(
    id_dispositivo: int,
    datos: DispositivoEstado,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Cambia el estado de un dispositivo. Solo administradores."""
    dispositivo = db.query(Dispositivo).filter(Dispositivo.id_dispositivo == id_dispositivo).first()
    if not dispositivo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispositivo no encontrado.")

    dispositivo.estado = datos.estado
    db.commit()
    db.refresh(dispositivo)
    registrar_log(
        db, "CAMBIAR_ESTADO_DISPOSITIVO",
        f"Dispositivo {id_dispositivo} → {datos.estado}",
        id_usuario=admin.id_usuario,
        nivel="advertencia",
    )
    return dispositivo
