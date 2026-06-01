"""
Rutas de logs de seguridad — /logs (solo administradores)
GET /logs              → listar logs con filtros opcionales
GET /logs/usuario/{id} → logs de un usuario específico
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models import LogSeguridad, Usuario
from app.schemas import LogResponse

router = APIRouter(prefix="/logs", tags=["Logs de Seguridad"])


@router.get("", response_model=List[LogResponse], summary="Listar logs de seguridad")
def listar_logs(
    nivel: Optional[str] = Query(None, description="Filtrar por nivel: info | advertencia | critico"),
    accion: Optional[str] = Query(None, description="Filtrar por nombre de acción"),
    limite: int = Query(100, ge=1, le=500, description="Número máximo de registros"),
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """
    Lista los logs de seguridad con filtros opcionales.
    Ordenados del más reciente al más antiguo. Solo administradores.
    """
    query = db.query(LogSeguridad)

    if nivel:
        query = query.filter(LogSeguridad.nivel == nivel)
    if accion:
        query = query.filter(LogSeguridad.accion.ilike(f"%{accion}%"))

    return query.order_by(LogSeguridad.fecha_evento.desc()).limit(limite).all()


@router.get("/usuario/{id_usuario}", response_model=List[LogResponse], summary="Logs de un usuario")
def logs_por_usuario(
    id_usuario: int,
    limite: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Lista los logs asociados a un usuario específico. Solo administradores."""
    return (
        db.query(LogSeguridad)
        .filter(LogSeguridad.id_usuario == id_usuario)
        .order_by(LogSeguridad.fecha_evento.desc())
        .limit(limite)
        .all()
    )
