"""
Rutas de Soporte — /soporte
POST /soporte            → Usuario crea un ticket
GET  /soporte            → Admin ve todos los tickets
PUT  /soporte/{id}/resolver → Admin marca ticket como resuelto
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin, registrar_log
from app.models import TicketSoporte, Usuario, Notificacion
from app.schemas import TicketSoporteCreate, TicketSoporteResponse, TicketSoporteResolver

router = APIRouter(prefix="/soporte", tags=["Soporte"])


@router.post("", response_model=TicketSoporteResponse, status_code=status.HTTP_201_CREATED, summary="Crear ticket de soporte")
def crear_ticket(
    datos: TicketSoporteCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """El usuario crea un ticket de soporte."""
    ticket = TicketSoporte(
        id_usuario=usuario.id_usuario,
        asunto=datos.asunto,
        mensaje=datos.mensaje,
        estado="abierto"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    registrar_log(db, "CREAR_TICKET", f"Usuario {usuario.id_usuario} creó ticket: {datos.asunto}", id_usuario=usuario.id_usuario)
    return ticket


@router.get("", summary="Listar tickets (Admin)")
def listar_tickets(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Admin lista todos los tickets."""
    tickets = db.query(TicketSoporte).order_by(TicketSoporte.fecha_creacion.desc()).all()
    resultado = []
    for t in tickets:
        resultado.append({
            "id_ticket": t.id_ticket,
            "id_usuario": t.id_usuario,
            "asunto": t.asunto,
            "mensaje": t.mensaje,
            "estado": t.estado,
            "fecha_creacion": t.fecha_creacion,
            "fecha_cierre": t.fecha_cierre,
            "correo_usuario": t.usuario.correo,
            "nombre_usuario": t.usuario.nombre_usuario,
        })
    return resultado


@router.put("/{id_ticket}/resolver", summary="Resolver ticket (Admin)")
def resolver_ticket(
    id_ticket: int,
    datos: TicketSoporteResolver,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """El administrador marca un ticket como resuelto o cerrado y notifica al usuario."""
    ticket = db.query(TicketSoporte).filter(TicketSoporte.id_ticket == id_ticket).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket no encontrado.")
    
    if ticket.estado != "abierto":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El ticket ya está resuelto o cerrado.")

    # Validar el estado
    nuevo_estado = datos.estado.lower()
    if nuevo_estado not in ["resuelto", "cerrado"]:
        nuevo_estado = "cerrado"

    ticket.estado = nuevo_estado
    ticket.fecha_cierre = datetime.now(timezone.utc)
    
    # Crear notificación si hay respuesta
    if datos.respuesta_admin:
        titulo_noti = "Ticket Resuelto" if nuevo_estado == "resuelto" else "Ticket Cerrado"
        mensaje_noti = f"Tu ticket '{ticket.asunto}' ha sido actualizado: {datos.respuesta_admin}"
        
        notificacion = Notificacion(
            id_usuario=ticket.id_usuario,
            titulo=titulo_noti,
            mensaje=mensaje_noti
        )
        db.add(notificacion)

    db.commit()
    db.refresh(ticket)
    
    registrar_log(db, "RESOLVER_TICKET", f"Ticket {id_ticket} marcado como {nuevo_estado} por Admin.", id_usuario=admin.id_usuario)
    return {"message": f"Ticket marcado como {nuevo_estado}."}
