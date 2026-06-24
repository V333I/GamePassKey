import requests
from typing import Dict, Any, Optional

BASE_URL = "http://localhost:8000"
_token: Optional[str] = None

def set_token(token: str):
    global _token
    _token = token

def get_token() -> Optional[str]:
    return _token

def get_headers() -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if _token:
        headers["Authorization"] = f"Bearer {_token}"
    return headers

def login(correo: str, password: str) -> Dict[str, Any]:
    url = f"{BASE_URL}/auth/login"
    data = {"correo": correo, "password": password}
    response = requests.post(url, json=data)

    if response.status_code == 200:
        result = response.json()
        # Si el usuario tiene 2FA por Telegram vinculado, el backend NO devuelve
        # token todavía: responde {otp_required: true} y hay que verificar el
        # código con verify_otp(). En ese caso aún no fijamos el token.
        if result.get("otp_required"):
            return result
        set_token(result.get("access_token"))
        return result
    else:
        raise Exception(response.json().get("detail", "Error de autenticación"))


def verify_otp(correo: str, codigo: str) -> Dict[str, Any]:
    """
    Segundo paso del login con 2FA. Envía el código OTP recibido por Telegram a
    /auth/verify-otp y, si es correcto, fija el token y devuelve los datos del
    usuario (mismo formato que un login normal).
    """
    url = f"{BASE_URL}/auth/verify-otp"
    data = {"correo": correo, "codigo": codigo}
    response = requests.post(url, json=data)

    if response.status_code == 200:
        result = response.json()
        set_token(result.get("access_token"))
        return result
    else:
        raise Exception(response.json().get("detail", "Código incorrecto o solicitud inválida."))

def get_library() -> list:
    url_lib = f"{BASE_URL}/biblioteca/mi-biblioteca"
    response_lib = requests.get(url_lib, headers=get_headers())
    
    if response_lib.status_code != 200:
        raise Exception(response_lib.json().get("detail", "Error al obtener la biblioteca"))
        
    url_games = f"{BASE_URL}/juegos?estado=todos"
    response_games = requests.get(url_games, headers=get_headers())
    
    if response_games.status_code != 200:
        raise Exception(response_games.json().get("detail", "Error al obtener los juegos"))
        
    library_items = response_lib.json()
    all_games = response_games.json()
    
    # Mapear los juegos por id
    games_map = {g["id_juego"]: g for g in all_games}
    
    # Enriquecer los items de la biblioteca con los datos del juego
    enriched_library = []
    for item in library_items:
        game_data = games_map.get(item["id_juego"])
        if game_data:
            item["juego"] = game_data
            enriched_library.append(item)
            
    return enriched_library

def register_device(hwid: str, os_info: str) -> Dict[str, Any]:
    url = f"{BASE_URL}/dispositivos"
    data = {
        "nombre_dispositivo": f"PC-{hwid[:6]}",
        "hardware_id": hwid,
        "sistema_operativo": os_info
    }
    response = requests.post(url, json=data, headers=get_headers())
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(response.json().get("detail", "Error al registrar el dispositivo"))
