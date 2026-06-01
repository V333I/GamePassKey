import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine
from app.models import Base

print("Creando tablas faltantes...")
Base.metadata.create_all(bind=engine)
print("Tablas creadas correctamente.")
