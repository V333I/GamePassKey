"""
Servicio de Telegram — envío de mensajes a través del Bot API.

Se usa para entregar los códigos OTP (2FA) durante el inicio de sesión.
El backend SOLO envía mensajes (sendMessage); no recibe ni hace polling,
por lo que funciona en localhost sin webhook.

Configuración (.env):
    TELEGRAM_BOT_TOKEN  → token del bot generado con @BotFather.

Cada usuario guarda su `telegram_chat_id` en su perfil (lo obtiene, por
ejemplo, escribiéndole a @userinfobot en Telegram).
"""

import os

import requests
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN: str | None = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API_BASE = "https://api.telegram.org"


def telegram_configurado() -> bool:
    """Indica si el bot está configurado (token presente en el entorno)."""
    return bool(TELEGRAM_BOT_TOKEN)


def enviar_mensaje_telegram(chat_id: str, texto: str) -> None:
    """
    Envía un mensaje de texto a un chat de Telegram.

    Args:
        chat_id: ID del chat destino (el `telegram_chat_id` del usuario).
        texto  : Contenido del mensaje (soporta HTML).

    Raises:
        RuntimeError: Si el bot no está configurado o la API de Telegram falla.
    """
    if not TELEGRAM_BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN no está configurado en el entorno.")

    url = f"{TELEGRAM_API_BASE}/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        respuesta = requests.post(
            url,
            json={"chat_id": chat_id, "text": texto, "parse_mode": "HTML"},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"No se pudo contactar con Telegram: {exc}") from exc

    if respuesta.status_code != 200:
        raise RuntimeError(
            f"Telegram rechazó el mensaje (HTTP {respuesta.status_code}): {respuesta.text}"
        )


def enviar_otp_telegram(chat_id: str, codigo: str, minutos_validez: int) -> None:
    """
    Envía un código OTP formateado al chat de Telegram del usuario.

    Args:
        chat_id        : ID del chat destino.
        codigo         : Código OTP de un solo uso.
        minutos_validez: Minutos de validez del código (para informar al usuario).
    """
    mensaje = (
        "🔐 <b>GamePassKey — Código de verificación</b>\n\n"
        f"Tu código de acceso es: <b>{codigo}</b>\n\n"
        f"Válido por {minutos_validez} minutos. No lo compartas con nadie.\n"
        "Si no intentaste iniciar sesión, ignora este mensaje."
    )
    enviar_mensaje_telegram(chat_id, mensaje)

def enviar_recuperacion_telegram(chat_id: str, codigo: str, minutos_validez: int) -> None:
    """
    Envía un código OTP para recuperar contraseña.
    """
    mensaje = (
        "⚠️ <b>GamePassKey — Recuperación de Contraseña</b>\n\n"
        f"Tu código para restablecer la contraseña es: <b>{codigo}</b>\n\n"
        f"Válido por {minutos_validez} minutos.\n"
        "Si no solicitaste esto, alguien podría estar intentando acceder a tu cuenta."
    )
    enviar_mensaje_telegram(chat_id, mensaje)

# --- TELEGRAM LONG POLLING PARA DEEP LINKING ---
import threading
import time
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models import Usuario

_polling_thread_started = False

def start_telegram_polling():
    """Inicia el hilo de polling si no se ha iniciado ya."""
    global _polling_thread_started
    if not telegram_configurado() or _polling_thread_started:
        return
    _polling_thread_started = True
    thread = threading.Thread(target=_polling_loop, daemon=True)
    thread.start()

def _polling_loop():
    last_update_id = 0
    url = f"{TELEGRAM_API_BASE}/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
    
    while True:
        try:
            resp = requests.get(url, params={"offset": last_update_id, "timeout": 5}, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok"):
                    for update in data.get("result", []):
                        last_update_id = update["update_id"] + 1
                        message = update.get("message")
                        if message and "text" in message:
                            text = message["text"].strip()
                            if text.startswith("/start "):
                                token = text.split(" ")[1]
                                _process_magic_link(token, str(message["chat"]["id"]))
        except Exception:
            pass
        time.sleep(1)

def _process_magic_link(token: str, chat_id: str):
    db = SessionLocal()
    try:
        usuario = db.query(Usuario).filter(Usuario.telegram_link_token == token).first()
        if usuario:
            if usuario.telegram_link_expires and usuario.telegram_link_expires.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc):
                usuario.telegram_chat_id = chat_id
                usuario.telegram_link_token = None
                usuario.telegram_link_expires = None
                db.commit()
                enviar_mensaje_telegram(chat_id, "✅ ¡Cuenta vinculada exitosamente con GamePassKey!")
            else:
                enviar_mensaje_telegram(chat_id, "❌ El enlace de vinculación ha expirado. Por favor genera uno nuevo.")
        else:
            # Token no encontrado (podría ser un código inválido o viejo)
            pass
    except Exception:
        pass
    finally:
        db.close()
