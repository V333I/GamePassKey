"""
Rutas de códigos de uso único — /codigos
GET  /codigos/licencia/{id}  → códigos de una licencia (admin)
POST /codigos/generar        → generar código (admin)
POST /codigos/usar           → canjear un código (usuario autenticado)
"""

import secrets
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, registrar_log, require_admin, check_rate_limit
from app.models import BibliotecaUsuario, CodigoUsoUnico, Licencia, Usuario
from app.schemas import CodigoGenerar, CodigoResponse, CodigoUsar

router = APIRouter(prefix="/codigos", tags=["Códigos de Uso Único"])


@router.get("/", response_model=List[CodigoResponse], summary="Listar todos los códigos")
def listar_codigos(
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Lista todos los códigos del sistema. Filtrable por estado. Solo administradores."""
    q = db.query(CodigoUsoUnico)
    if estado:
        q = q.filter(CodigoUsoUnico.estado == estado)
    return q.order_by(CodigoUsoUnico.fecha_generacion.desc()).all()


@router.get("/licencia/{id_licencia}", response_model=List[CodigoResponse], summary="Códigos de una licencia")
def codigos_por_licencia(
    id_licencia: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Lista todos los códigos asociados a una licencia. Solo administradores."""
    return db.query(CodigoUsoUnico).filter(CodigoUsoUnico.id_licencia == id_licencia).all()


@router.post("/generar", response_model=CodigoResponse, status_code=status.HTTP_201_CREATED, summary="Generar código")
def generar_codigo(
    datos: CodigoGenerar,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Genera un nuevo código de uso único para una licencia. Solo administradores."""
    licencia = db.query(Licencia).filter(Licencia.id_licencia == datos.id_licencia).first()
    if not licencia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licencia no encontrada.")

    existente = db.query(CodigoUsoUnico).filter(CodigoUsoUnico.codigo == datos.codigo).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El código ya existe.")

    codigo = CodigoUsoUnico(
        id_licencia=datos.id_licencia,
        codigo=datos.codigo,
        fecha_expiracion=datos.fecha_expiracion,
    )
    db.add(codigo)
    db.commit()
    db.refresh(codigo)
    registrar_log(db, "GENERAR_CODIGO", f"Código {codigo.codigo} generado.", id_usuario=admin.id_usuario)
    return codigo


@router.post("/usar", response_model=CodigoResponse, summary="Canjear código")
def usar_codigo(
    datos: CodigoUsar,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
    rate_limit: bool = Depends(check_rate_limit("CANJEAR_CODIGO_FALLIDO"))
):
    """Canjea un código de uso único. Asigna la licencia al usuario y agrega el juego a su biblioteca."""
    from datetime import datetime, timezone

    # 1. Buscar el código
    codigo = db.query(CodigoUsoUnico).filter(CodigoUsoUnico.codigo == datos.codigo).first()
    if not codigo:
        registrar_log(db, "CANJEAR_CODIGO_FALLIDO", f"Intento de canjear código inexistente: {datos.codigo}", id_usuario=usuario.id_usuario, ip_origen=request.client.host if request.client else None, nivel="advertencia")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Código no encontrado.")

    if codigo.estado != "disponible":
        registrar_log(db, "CANJEAR_CODIGO_FALLIDO", f"Intento de canjear código no disponible ({codigo.estado}): {datos.codigo}", id_usuario=usuario.id_usuario, ip_origen=request.client.host if request.client else None, nivel="advertencia")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El código no está disponible. Estado actual: {codigo.estado}.",
        )

    ahora = datetime.now(timezone.utc)
    expiracion = codigo.fecha_expiracion
    if expiracion.tzinfo is None:
        expiracion = expiracion.replace(tzinfo=timezone.utc)
    if expiracion < ahora:
        codigo.estado = "expirado"
        db.commit()
        registrar_log(db, "CANJEAR_CODIGO_FALLIDO", f"Intento de canjear código expirado: {datos.codigo}", id_usuario=usuario.id_usuario, ip_origen=request.client.host if request.client else None, nivel="advertencia")
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="El código ha expirado.")

    # 2. Obtener la licencia vinculada al código
    licencia = db.query(Licencia).filter(Licencia.id_licencia == codigo.id_licencia).first()
    if not licencia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licencia asociada no encontrada.")

    # 3. Reasignar la licencia al usuario que canjea (si no es ya suya)
    if licencia.id_usuario != usuario.id_usuario:
        licencia.id_usuario = usuario.id_usuario
        licencia.estado = "activa"

    # 4. Marcar el código como usado
    codigo.estado = "usado"
    codigo.fecha_uso = ahora
    db.commit()

    # 5. Agregar juego a la biblioteca si no está ya
    en_biblioteca = db.query(BibliotecaUsuario).filter(
        BibliotecaUsuario.id_usuario == usuario.id_usuario,
        BibliotecaUsuario.id_juego == licencia.id_juego,
    ).first()

    if not en_biblioteca:
        entrada = BibliotecaUsuario(
            id_usuario=usuario.id_usuario,
            id_juego=licencia.id_juego,
            id_licencia=licencia.id_licencia,
        )
        db.add(entrada)
        db.commit()

    db.refresh(codigo)
    registrar_log(
        db, "CANJEAR_CODIGO",
        f"Código {datos.codigo} canjeado. Juego {licencia.id_juego} agregado a biblioteca.",
        id_usuario=usuario.id_usuario,
    )
    return codigo
