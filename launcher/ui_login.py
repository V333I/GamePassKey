import customtkinter as ctk
import api_client
from tkinter import messagebox

class LoginFrame(ctk.CTkFrame):
    def __init__(self, master, on_login_success):
        super().__init__(master, fg_color="transparent")
        self.on_login_success = on_login_success

        # Título
        self.title_label = ctk.CTkLabel(
            self, text="GAMEPASSKEY", 
            font=ctk.CTkFont(family="Arial", size=28, weight="bold"),
            text_color="#00d4ff"
        )
        self.title_label.pack(pady=(40, 5))

        self.subtitle_label = ctk.CTkLabel(
            self, text="Iniciar Sesión en el Launcher", 
            font=ctk.CTkFont(family="Arial", size=14),
            text_color="gray"
        )
        self.subtitle_label.pack(pady=(0, 40))

        # Inputs
        self.email_entry = ctk.CTkEntry(self, placeholder_text="Correo Electrónico", width=300, height=45, fg_color="#12151c", border_color="#2a2f3a", text_color="#ffffff")
        self.email_entry.pack(pady=10)

        self.password_entry = ctk.CTkEntry(self, placeholder_text="Contraseña", show="*", width=300, height=45, fg_color="#12151c", border_color="#2a2f3a", text_color="#ffffff")
        self.password_entry.pack(pady=10)

        # Botón
        self.login_button = ctk.CTkButton(
            self, text="ENTRAR", width=300, height=45, 
            fg_color="#ff6b35", hover_color="#e55a2b", text_color="#ffffff",
            font=ctk.CTkFont(family="Arial", size=14, weight="bold"),
            command=self.handle_login
        )
        self.login_button.pack(pady=30)
        
        # Loader (oculto por defecto)
        self.status_label = ctk.CTkLabel(self, text="", text_color="gray")
        self.status_label.pack()

    def handle_login(self):
        email = self.email_entry.get().strip()
        password = self.password_entry.get().strip()
        
        if not email or not password:
            messagebox.showerror("Error", "Por favor completa todos los campos")
            return

        self.login_button.configure(state="disabled", text="CONECTANDO...")
        self.status_label.configure(text="Verificando credenciales...", text_color="gray")
        
        # Simulamos proceso asíncrono básico con after de tkinter
        self.after(100, lambda: self._do_api_login(email, password))

    def _do_api_login(self, email, password):
        try:
            user_data = api_client.login(email, password)
            self.status_label.configure(text="¡Conectado!", text_color="#00d4ff")
            self.on_login_success(user_data)
        except Exception as e:
            self.status_label.configure(text=str(e), text_color="#ff4444")
            self.login_button.configure(state="normal", text="ENTRAR")
            messagebox.showerror("Error de Login", str(e))
