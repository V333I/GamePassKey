import wmi
import platform
import hashlib

def get_hwid() -> str:
    """
    Genera un HWID (Hardware ID) único basado en los componentes físicos
    del sistema (UUID de la placa base).
    En Linux/Mac usa valores simulados por ahora o nodos de red.
    """
    if platform.system() == "Windows":
        try:
            c = wmi.WMI()
            # Obtenemos el UUID (Identificador Universal Único) del sistema
            cs_product = c.Win32_ComputerSystemProduct()[0]
            uuid = cs_product.UUID
            
            # Generamos un hash seguro para no exponer datos puros
            return hashlib.sha256(uuid.encode('utf-8')).hexdigest()
        except Exception as e:
            print(f"Error obteniendo HWID en Windows: {e}")
            return "FALLBACK-HWID-WINDOWS"
    else:
        # Fallback genérico para otros sistemas operativos durante pruebas
        return "DEV-MAC-LINUX-HWID"

def get_os_info() -> str:
    """
    Devuelve la información del Sistema Operativo actual.
    """
    return f"{platform.system()} {platform.release()}"
