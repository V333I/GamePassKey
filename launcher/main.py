import customtkinter as ctk
from tkinter import messagebox
import hwid
import api_client
from ui_login import LoginFrame
from ui_library import LibraryFrame

# Configuración global de CustomTkinter
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class GamePassKeyLauncher(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("GamePassKey Launcher")
        self.geometry("900x600")
        self.minsize(800, 500)
        self.configure(fg_color="#0b0e14") # Fondo principal oscuro
        
        # Leer HWID físico
        self.current_hwid = hwid.get_hwid()
        self.current_os = hwid.get_os_info()

        # Configurar contenedor principal
        self.container = ctk.CTkFrame(self, fg_color="transparent")
        self.container.pack(fill="both", expand=True)

        self.current_frame = None
        self.show_login()

    def _clear_container(self):
        if self.current_frame:
            self.current_frame.destroy()

    def show_login(self):
        self._clear_container()
        self.current_frame = LoginFrame(self.container, on_login_success=self.handle_login_success)
        self.current_frame.place(relx=0.5, rely=0.5, anchor="center")

    def show_library(self, user_data):
        self._clear_container()
        self.current_frame = LibraryFrame(self.container, user_data, on_logout=self.handle_logout)
        self.current_frame.pack(fill="both", expand=True)

    def handle_login_success(self, user_data):
        # Una vez logueado, verificamos y registramos el HWID en el backend
        try:
            # Intentamos registrar el dispositivo
            api_client.register_device(self.current_hwid, self.current_os)
            self.show_library(user_data)
        except Exception as e:
            error_msg = str(e)
            if "registrado" in error_msg.lower():
                # Si ya está registrado, es un dispositivo válido para este usuario
                self.show_library(user_data)
            else:
                messagebox.showerror("Error de Dispositivo", f"No se pudo validar el HWID.\n{error_msg}")
                self.handle_logout()

    def handle_logout(self):
        api_client.set_token(None)
        self.show_login()

if __name__ == "__main__":
    app = GamePassKeyLauncher()
    app.mainloop()
