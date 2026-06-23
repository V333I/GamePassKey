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
