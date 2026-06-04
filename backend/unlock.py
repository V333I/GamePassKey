from app.database import SessionLocal
from app.models import LogSeguridad
import logging

db = SessionLocal()
try:
    deleted = db.query(LogSeguridad).filter(LogSeguridad.accion == "LOGIN_FALLIDO").delete()
    db.commit()
    print(f"Borrados {deleted} registros de LOGIN_FALLIDO.")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
