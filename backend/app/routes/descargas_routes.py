"""
Rutas de descargas — /descargas
GET  /descargas/mis-descargas  → historial de descargas del usuario
POST /descargas                → registrar inicio de descarga
PUT  /descargas/{id}/estado    → actualizar estado de descarga
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, registrar_log
from app.models import Descarga, Juego, Usuario
from app.schemas import DescargaCreate, DescargaEstado, DescargaResponse

router = APIRouter(prefix="/descargas", tags=["Descargas"])


@router.get("/mis-descargas", response_model=List[DescargaResponse], summary="Mis descargas")
def mis_descargas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Devuelve el historial de descargas del usuario autenticado."""
    return (
        db.query(Descarga)
        .filter(Descarga.id_usuario == usuario.id_usuario)
        .order_by(Descarga.fecha_descarga.desc())
        .all()
    )


@router.post("", response_model=DescargaResponse, status_code=status.HTTP_201_CREATED, summary="Registrar descarga")
def registrar_descarga(
    datos: DescargaCreate,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Registra el inicio de una descarga de juego."""
    juego = db.query(Juego).filter(Juego.id_juego == datos.id_juego, Juego.estado == "activo").first()
    if not juego:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Juego no encontrado o inactivo.")

    ip = request.client.host if request.client else None
    descarga = Descarga(
        id_usuario=usuario.id_usuario,
        id_juego=datos.id_juego,
        id_dispositivo=datos.id_dispositivo,
        ip_descarga=ip,
        estado="iniciada",
    )
    db.add(descarga)
    db.commit()
    db.refresh(descarga)
    registrar_log(db, "INICIAR_DESCARGA", f"Descarga de '{juego.titulo}' iniciada.", id_usuario=usuario.id_usuario, ip_origen=ip)
    return descarga


@router.put("/{id_descarga}/estado", response_model=DescargaResponse, summary="Actualizar estado descarga")
def actualizar_estado_descarga(
    id_descarga: int,
    datos: DescargaEstado,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Actualiza el estado de una descarga (completada, fallida, cancelada)."""
    descarga = db.query(Descarga).filter(
        Descarga.id_descarga == id_descarga,
        Descarga.id_usuario == usuario.id_usuario,
    ).first()
    if not descarga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Descarga no encontrada.")

    descarga.estado = datos.estado
    db.commit()
    db.refresh(descarga)
    return descarga
