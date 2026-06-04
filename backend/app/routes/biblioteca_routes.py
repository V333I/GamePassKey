"""
Rutas de biblioteca — /biblioteca
GET  /biblioteca/mi-biblioteca  → juegos del usuario autenticado
POST /biblioteca                → agregar juego a la biblioteca
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, registrar_log
from app.models import BibliotecaUsuario, Juego, Licencia, Usuario
from app.schemas import BibliotecaAgregar, BibliotecaResponse

router = APIRouter(prefix="/biblioteca", tags=["Biblioteca"])


@router.get("/mi-biblioteca", response_model=List[BibliotecaResponse], summary="Mi biblioteca")
def mi_biblioteca(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Devuelve todos los juegos en la biblioteca del usuario autenticado."""
    return (
        db.query(BibliotecaUsuario)
        .filter(BibliotecaUsuario.id_usuario == usuario.id_usuario)
        .all()
    )


@router.post("", response_model=BibliotecaResponse, status_code=status.HTTP_201_CREATED, summary="Agregar a biblioteca")
def agregar_a_biblioteca(
    datos: BibliotecaAgregar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Agrega un juego a la biblioteca del usuario usando una licencia válida."""
    # Verificar que el juego existe
    juego = db.query(Juego).filter(Juego.id_juego == datos.id_juego).first()
    if not juego:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Juego no encontrado.")

    # Verificar que la licencia existe y pertenece al usuario
    licencia = db.query(Licencia).filter(
        Licencia.id_licencia == datos.id_licencia,
        Licencia.id_usuario == usuario.id_usuario,
        Licencia.id_juego == datos.id_juego,
        Licencia.estado == "activa",
    ).first()
    if not licencia:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes una licencia activa para este juego.",
        )

    # Verificar que no esté ya en la biblioteca
    existente = db.query(BibliotecaUsuario).filter(
        BibliotecaUsuario.id_usuario == usuario.id_usuario,
        BibliotecaUsuario.id_juego == datos.id_juego,
    ).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El juego ya está en tu biblioteca.")

    # Se crea el objeto de la nueva entrada de la biblioteca
    entrada = BibliotecaUsuario(
        id_usuario=usuario.id_usuario,
        id_juego=datos.id_juego,
        id_licencia=datos.id_licencia,
    )
    # Se guarda en la base de datos
    db.add(entrada)
    db.commit()
    db.refresh(entrada)
    # Registrar evento en logs de seguridad
    registrar_log(db, "AGREGAR_BIBLIOTECA", f"Juego {datos.id_juego} agregado a biblioteca.", id_usuario=usuario.id_usuario)
    return entrada
