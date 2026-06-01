"""
Rutas de Notificaciones — /notificaciones
GET  /notificaciones                 → Ver notificaciones del usuario
PUT  /notificaciones/{id}/leer       → Marcar como leída
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Notificacion, Usuario
from app.schemas import NotificacionResponse

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


@router.get("", response_model=List[NotificacionResponse], summary="Mis notificaciones")
def mis_notificaciones(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Devuelve las notificaciones del usuario actual."""
    return db.query(Notificacion).filter(
        Notificacion.id_usuario == usuario.id_usuario
    ).order_by(Notificacion.fecha_creacion.desc()).all()


@router.put("/{id_notificacion}/leer", response_model=NotificacionResponse, summary="Marcar como leída")
def leer_notificacion(
    id_notificacion: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Marca una notificación como leída."""
    notificacion = db.query(Notificacion).filter(
        Notificacion.id_notificacion == id_notificacion,
        Notificacion.id_usuario == usuario.id_usuario
    ).first()

    if not notificacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada.")

    notificacion.leida = 1
    db.commit()
    db.refresh(notificacion)
    return notificacion
