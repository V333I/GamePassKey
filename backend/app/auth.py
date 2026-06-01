"""
Funciones de autenticación para GamePassKey.

Gestiona:
- Hash y verificación de contraseñas con bcrypt directo.
- Creación y decodificación de tokens JWT (python-jose).

Nota: Se usa la librería 'bcrypt' directamente en lugar de passlib
debido a incompatibilidades de passlib con Python 3.14+.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from dotenv import load_dotenv
from jose import JWTError, jwt

load_dotenv()

# ---------------------------------------------------------------------------
# Configuración desde variables de entorno
# ---------------------------------------------------------------------------

SECRET_KEY: str = os.getenv("SECRET_KEY", "clave_predeterminada_insegura")
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

# ---------------------------------------------------------------------------
# Funciones de contraseña (bcrypt directo)
# ---------------------------------------------------------------------------


def generar_hash_password(password: str) -> str:
    """
    Genera el hash bcrypt de una contraseña en texto plano.

    Args:
        password: Contraseña en texto plano proporcionada por el usuario.

    Returns:
        str: Hash bcrypt listo para almacenar en la base de datos.

    Ejemplo:
        hash = generar_hash_password("mi_contraseña_segura")
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verificar_password(password_plano: str, password_hash: str) -> bool:
    """
    Verifica que una contraseña en texto plano coincida con su hash bcrypt.

    Args:
        password_plano: Contraseña ingresada por el usuario en el login.
        password_hash : Hash almacenado en la base de datos.

    Returns:
        bool: True si coinciden, False en caso contrario.
    """
    try:
        return bcrypt.checkpw(
            password_plano.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Funciones de JWT
# ---------------------------------------------------------------------------


def crear_token_acceso(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Crea un token JWT firmado con los datos proporcionados.

    Args:
        data         : Diccionario con los datos a codificar en el token.
        expires_delta: Tiempo de vida del token. Si no se proporciona,
                       se usa ACCESS_TOKEN_EXPIRE_MINUTES del entorno.

    Returns:
        str: Token JWT firmado listo para enviar al cliente.
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decodificar_token(token: str) -> Optional[dict]:
    """
    Decodifica y valida un token JWT.

    Args:
        token: Token JWT recibido en el header de autorización.

    Returns:
        dict: Payload del token si es válido, None si es inválido o expiró.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
