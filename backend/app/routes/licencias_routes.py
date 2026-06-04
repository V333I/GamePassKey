"""
Rutas de licencias — /licencias
GET  /licencias/mis-licencias   → licencias del usuario autenticado
GET  /licencias/{id}            → detalle de una licencia
POST /licencias                 → crear licencia (admin)
PUT  /licencias/{id}/revocar    → revocar licencia (admin)
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, registrar_log, require_admin
from app.models import Licencia, Usuario
from app.schemas import LicenciaCreate, LicenciaResponse

router = APIRouter(prefix="/licencias", tags=["Licencias"])


@router.get("", response_model=List[LicenciaResponse], summary="Listar todas las licencias")
def listar_todas_licencias(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Devuelve todas las licencias. Solo administradores."""
    return db.query(Licencia).order_by(Licencia.fecha_compra.desc()).all()


@router.get("/mis-licencias", response_model=List[LicenciaResponse], summary="Mis licencias")
def mis_licencias(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Devuelve todas las licencias del usuario autenticado."""
    return db.query(Licencia).filter(Licencia.id_usuario == usuario.id_usuario).all()


@router.get("/{id_licencia}", response_model=LicenciaResponse, summary="Detalle de licencia")
def obtener_licencia(
    id_licencia: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Devuelve el detalle de una licencia. Solo el dueño o un admin puede verla."""
    licencia = db.query(Licencia).filter(Licencia.id_licencia == id_licencia).first()
    if not licencia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licencia no encontrada.")

    if licencia.id_usuario != usuario.id_usuario and usuario.rol.nombre_rol != "administrador":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    return licencia


@router.post("", response_model=LicenciaResponse, status_code=status.HTTP_201_CREATED, summary="Crear licencia")
def crear_licencia(
    datos: LicenciaCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Crea una nueva licencia. Solo administradores."""
    existente = db.query(Licencia).filter(Licencia.clave_licencia == datos.clave_licencia).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La clave de licencia ya existe.")

    licencia = Licencia(**datos.model_dump())
    db.add(licencia)
    db.commit()
    db.refresh(licencia)
    registrar_log(db, "CREAR_LICENCIA", f"Licencia {licencia.clave_licencia} creada.", id_usuario=admin.id_usuario)
    return licencia


@router.put("/{id_licencia}/revocar", response_model=LicenciaResponse, summary="Revocar licencia")
def revocar_licencia(
    id_licencia: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Revoca una licencia activa. Solo administradores."""
    licencia = db.query(Licencia).filter(Licencia.id_licencia == id_licencia).first()
    if not licencia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licencia no encontrada.")

    licencia.estado = "revocada"
    db.commit()
    db.refresh(licencia)
    registrar_log(db, "REVOCAR_LICENCIA", f"Licencia {id_licencia} revocada.", id_usuario=admin.id_usuario, nivel="advertencia")
    return licencia
