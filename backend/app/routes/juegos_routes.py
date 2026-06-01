"""
Rutas de juegos — /juegos
GET  /juegos            → listar todos (público)
GET  /juegos/{id}       → detalle (público)
POST /juegos            → crear (admin)
PUT  /juegos/{id}       → actualizar (admin)
DELETE /juegos/{id}     → eliminar lógico (admin)
"""

import os
import shutil
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, registrar_log, require_admin
from app.models import Juego, Usuario, SolicitudActivacion, Descarga, Instalacion, BibliotecaUsuario, Licencia, CodigoUsoUnico
from app.schemas import JuegoCreate, JuegoResponse, JuegoUpdate

router = APIRouter(prefix="/juegos", tags=["Juegos"])

@router.post("/upload-cover", summary="Subir carátula de un juego")
async def upload_cover(
    file: UploadFile = File(...),
    current_user: Usuario = Depends(require_admin)
):
    try:
        # Validar tipo
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")
        
        # Generar nombre unico
        ext = file.filename.split(".")[-1]
        filename = f"{uuid.uuid4().hex}.{ext}"
        
        # Definir ruta donde se guarda. El path asume que backend/ y frontend/ son hermanos.
        # Desde C:\xampp\htdocs\GamePassKey\backend\app\routes\juegos_routes.py
        # El directorio base del proyecto es 3 niveles arriba.
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        covers_dir = os.path.join(base_dir, "frontend", "assets", "covers")
        
        os.makedirs(covers_dir, exist_ok=True)
        file_path = os.path.join(covers_dir, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Devolver URL relativa para el frontend
        return {"imagen_portada": f"assets/covers/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("", response_model=List[JuegoResponse], summary="Listar juegos")
def listar_juegos(
    estado: str = "activo",
    db: Session = Depends(get_db),
):
    """Devuelve todos los juegos. Por defecto solo los activos."""
    query = db.query(Juego)
    if estado != "todos":
        query = query.filter(Juego.estado == estado)
    return query.order_by(Juego.titulo).all()


@router.get("/{id_juego}", response_model=JuegoResponse, summary="Detalle de juego")
def obtener_juego(id_juego: int, db: Session = Depends(get_db)):
    """Devuelve el detalle de un juego por su ID."""
    juego = db.query(Juego).filter(Juego.id_juego == id_juego).first()
    if not juego:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Juego no encontrado.")
    return juego


@router.post("", response_model=JuegoResponse, status_code=status.HTTP_201_CREATED, summary="Crear juego")
def crear_juego(
    datos: JuegoCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Crea un nuevo juego. Solo administradores."""
    juego = Juego(**datos.model_dump())
    db.add(juego)
    db.commit()
    db.refresh(juego)
    registrar_log(db, "CREAR_JUEGO", f"Juego '{juego.titulo}' creado.", id_usuario=admin.id_usuario)
    return juego


@router.put("/{id_juego}", response_model=JuegoResponse, summary="Actualizar juego")
def actualizar_juego(
    id_juego: int,
    datos: JuegoUpdate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Actualiza los campos de un juego. Solo administradores."""
    juego = db.query(Juego).filter(Juego.id_juego == id_juego).first()
    if not juego:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Juego no encontrado.")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(juego, campo, valor)

    db.commit()
    db.refresh(juego)
    registrar_log(db, "ACTUALIZAR_JUEGO", f"Juego '{juego.titulo}' actualizado.", id_usuario=admin.id_usuario)
    return juego


@router.delete("/{id_juego}", status_code=status.HTTP_200_OK, summary="Eliminar juego")
def eliminar_juego(
    id_juego: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Elimina un juego por completo (con datos en cascada). Solo administradores."""
    juego = db.query(Juego).filter(Juego.id_juego == id_juego).first()
    if not juego:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Juego no encontrado.")

    db.query(SolicitudActivacion).filter(SolicitudActivacion.id_juego == id_juego).delete()
    db.query(Descarga).filter(Descarga.id_juego == id_juego).delete()
    db.query(Instalacion).filter(Instalacion.id_juego == id_juego).delete()
    db.query(BibliotecaUsuario).filter(BibliotecaUsuario.id_juego == id_juego).delete()
    
    licencias = db.query(Licencia).filter(Licencia.id_juego == id_juego).all()
    for lic in licencias:
        db.query(CodigoUsoUnico).filter(CodigoUsoUnico.id_licencia == lic.id_licencia).delete()
        db.delete(lic)
        
    db.delete(juego)
    db.commit()
    registrar_log(db, "ELIMINAR_JUEGO", f"Juego '{juego.titulo}' eliminado completamente.", id_usuario=admin.id_usuario)
    return {"mensaje": f"Juego '{juego.titulo}' eliminado correctamente."}
