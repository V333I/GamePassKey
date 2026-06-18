from slowapi import Limiter
from slowapi.util import get_remote_address

# Inicializa el Rate Limiter usando la IP del cliente como llave
limiter = Limiter(key_func=get_remote_address)
