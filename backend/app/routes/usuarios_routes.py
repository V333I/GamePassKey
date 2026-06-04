"""
Rutas de usuarios — /usuarios (solo administradores)
GET  /usuarios          → listar todos
GET  /usuarios/{id}     → detalle
POST /usuarios          → crear usuario
PUT  /usuarios/{id}     → actualizar datos
PUT  /usuarios/{id}/estado → cambiar estado
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.auth import generar_hash_password, verificar_password
from app.database import get_db
from app.dependencies import get_current_user, registrar_log, require_admin
from app.models import Rol, Usuario
from app.schemas import UsuarioCreate, UsuarioEstado, UsuarioResponse, UsuarioUpdate, UsuarioUpdatePerfil, PaginatedResponse

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("", response_model=PaginatedResponse[UsuarioResponse], summary="Listar usuarios paginados")
def listar_usuarios(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Lista todos los usuarios del sistema (paginado). Solo administradores."""
    query = db.query(Usuario)
    total = query.count()
    items = query.order_by(Usuario.nombre_usuario).offset(skip).limit(limit).all()
    return {"total": total, "items": items}


@router.get("/perfil", response_model=UsuarioResponse, summary="Mi perfil")
def mi_perfil(
    usuario: Usuario = Depends(get_current_user),
):
    """Devuelve el perfil del usuario autenticado."""
    return usuario


@router.put("/perfil", response_model=UsuarioResponse, summary="Actualizar mi perfil")
def actualizar_mi_perfil(
    datos: UsuarioUpdatePerfil,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Actualiza el nombre de usuario y/o contraseña del perfil actual."""
    if datos.password_nuevo:
        if not datos.password_actual:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Se requiere la contraseña actual para cambiarla.")
        if not verificar_password(datos.password_actual, usuario.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="La contraseña actual es incorrecta.")
        
        usuario.password_hash = generar_hash_password(datos.password_nuevo)

    if datos.nombre_usuario and datos.nombre_usuario.strip():
        usuario.nombre_usuario = datos.nombre_usuario.strip()

    db.commit()
    db.refresh(usuario)
    registrar_log(db, "ACTUALIZAR_PERFIL", "El usuario actualizó su perfil.", id_usuario=usuario.id_usuario)
    return usuario


@router.get("/{id_usuario}", response_model=UsuarioResponse, summary="Detalle de usuario")
def obtener_usuario(
    id_usuario: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Devuelve el detalle de un usuario por ID. Solo administradores."""
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return usuario


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, summary="Crear usuario")
def crear_usuario(
    datos: UsuarioCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Crea un nuevo usuario en el sistema. Solo administradores."""
    # Verificar correo único
    if db.query(Usuario).filter(Usuario.correo == datos.correo.lower().strip()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado.")

    # Verificar que el rol existe
    rol = db.query(Rol).filter(Rol.id_rol == datos.id_rol).first()
    if not rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado.")

    usuario = Usuario(
        id_rol=datos.id_rol,
        nombre_usuario=datos.nombre_usuario,
        correo=datos.correo.lower().strip(),
        password_hash=generar_hash_password(datos.password),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    registrar_log(db, "CREAR_USUARIO", f"Usuario '{usuario.nombre_usuario}' creado.", id_usuario=admin.id_usuario)
    return usuario


@router.put("/{id_usuario}", response_model=UsuarioResponse, summary="Actualizar usuario")
def actualizar_usuario(
    id_usuario: int,
    datos: UsuarioUpdate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Actualiza nombre, correo o rol de un usuario. Solo administradores."""
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        if campo == "correo" and valor:
            valor = valor.lower().strip()
        setattr(usuario, campo, valor)

    db.commit()
    db.refresh(usuario)
    registrar_log(db, "ACTUALIZAR_USUARIO", f"Usuario {id_usuario} actualizado.", id_usuario=admin.id_usuario)
    return usuario


@router.put("/{id_usuario}/estado", response_model=UsuarioResponse, summary="Cambiar estado usuario")
def cambiar_estado_usuario(
    id_usuario: int,
    datos: UsuarioEstado,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Cambia el estado de un usuario (activo/bloqueado/inactivo). Solo administradores."""
    if id_usuario == admin.id_usuario:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes cambiar tu propio estado.")

    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    estados_validos = ["activo", "bloqueado", "inactivo"]
    if datos.estado not in estados_validos:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Estado inválido. Use: {estados_validos}")

    usuario.estado = datos.estado
    db.commit()
    db.refresh(usuario)
    registrar_log(
        db, "CAMBIAR_ESTADO_USUARIO",
        f"Usuario {id_usuario} → {datos.estado}",
        id_usuario=admin.id_usuario,
        nivel="advertencia",
    )
    return usuario
