from app.database import engine
from sqlalchemy import text

with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE codigos_otp ADD COLUMN proposito ENUM('login', 'recuperacion') NOT NULL DEFAULT 'login' AFTER codigo_hash;"))
        print('Columna proposito agregada exitosamente.')
    except Exception as e:
        print('Error (probablemente ya existe):', e)
