"""
Rutas de instalaciones — /instalaciones
GET  /instalaciones/mis-instalaciones  → instalaciones del usuario
POST /instalaciones                    → registrar instalación
PUT  /instalaciones/{id}/estado        → actualizar estado
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, registrar_log
from app.models import Dispositivo, Instalacion, Juego, Licencia, Usuario
from app.schemas import InstalacionCreate, InstalacionEstado, InstalacionResponse

router = APIRouter(prefix="/instalaciones", tags=["Instalaciones"])


@router.get("/mis-instalaciones", response_model=List[InstalacionResponse], summary="Mis instalaciones")
def mis_instalaciones(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Lista todas las instalaciones activas del usuario autenticado."""
    return (
        db.query(Instalacion)
        .filter(
            Instalacion.id_usuario == usuario.id_usuario,
            Instalacion.estado == "instalado",
        )
        .all()
    )


@router.post("", response_model=InstalacionResponse, status_code=status.HTTP_201_CREATED, summary="Registrar instalación")
def registrar_instalacion(
    datos: InstalacionCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Registra una nueva instalación de un juego en un dispositivo."""
    # Validar que el juego, licencia y dispositivo existan y pertenezcan al usuario
    licencia = db.query(Licencia).filter(
        Licencia.id_licencia == datos.id_licencia,
        Licencia.id_usuario == usuario.id_usuario,
        Licencia.estado == "activa",
    ).first()
    if not licencia:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Licencia inválida o no autorizada.")

    dispositivo = db.query(Dispositivo).filter(
        Dispositivo.id_dispositivo == datos.id_dispositivo,
        Dispositivo.id_usuario == usuario.id_usuario,
        Dispositivo.estado == "autorizado",
    ).first()
    if not dispositivo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Dispositivo no autorizado.")

    # Verificar que no esté ya instalado en ese dispositivo
    existente = db.query(Instalacion).filter(
        Instalacion.id_usuario == usuario.id_usuario,
        Instalacion.id_juego == datos.id_juego,
        Instalacion.id_dispositivo == datos.id_dispositivo,
        Instalacion.estado == "instalado",
    ).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El juego ya está instalado en este dispositivo.")

    instalacion = Instalacion(
        id_usuario=usuario.id_usuario,
        id_juego=datos.id_juego,
        id_licencia=datos.id_licencia,
        id_dispositivo=datos.id_dispositivo,
        id_codigo=datos.id_codigo,
        ruta_instalacion=datos.ruta_instalacion,
    )
    db.add(instalacion)
    dispositivo.ultimo_uso = datetime.now(timezone.utc)
    db.commit()
    db.refresh(instalacion)
    registrar_log(db, "REGISTRAR_INSTALACION", f"Juego {datos.id_juego} instalado en dispositivo {datos.id_dispositivo}.", id_usuario=usuario.id_usuario)
    return instalacion


@router.put("/{id_instalacion}/estado", response_model=InstalacionResponse, summary="Actualizar estado instalación")
def actualizar_estado_instalacion(
    id_instalacion: int,
    datos: InstalacionEstado,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Actualiza el estado de una instalación (ej. desinstalar)."""
    instalacion = db.query(Instalacion).filter(
        Instalacion.id_instalacion == id_instalacion,
        Instalacion.id_usuario == usuario.id_usuario,
    ).first()
    if not instalacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instalación no encontrada.")

    instalacion.estado = datos.estado
    if datos.ultima_validacion:
        instalacion.ultima_validacion = datos.ultima_validacion
    db.commit()
    db.refresh(instalacion)
    registrar_log(db, "ACTUALIZAR_INSTALACION", f"Instalación {id_instalacion} → {datos.estado}", id_usuario=usuario.id_usuario)
    return instalacion
