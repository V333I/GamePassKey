"""
Configuración de la base de datos MySQL con SQLAlchemy.
Lee las credenciales desde variables de entorno definidas en el archivo .env.
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Carga las variables del archivo .env ubicado en la raíz del proyecto backend
load_dotenv()

# ---------------------------------------------------------------------------
# Construcción de la URL de conexión
# ---------------------------------------------------------------------------

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "gamepasskey")

DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# ---------------------------------------------------------------------------
# Motor y sesión de SQLAlchemy
# ---------------------------------------------------------------------------

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Verifica la conexión antes de usarla
    pool_recycle=3600,        # Recicla conexiones cada hora
    echo=False,               # Cambiar a True para ver queries en consola (debug)
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base declarativa compartida por todos los modelos
Base = declarative_base()


# ---------------------------------------------------------------------------
# Dependencia de FastAPI para inyección de sesión de base de datos
# ---------------------------------------------------------------------------


def get_db():
    """
    Generador que provee una sesión de base de datos por request.
    Garantiza el cierre de la sesión al finalizar, incluso si hay errores.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
