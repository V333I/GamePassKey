import customtkinter as ctk
import api_client
from tkinter import messagebox

class LoginFrame(ctk.CTkFrame):
    def __init__(self, master, on_login_success):
        super().__init__(master, fg_color="transparent")
        self.on_login_success = on_login_success
        self.correo_pendiente = None  # correo a la espera de verificación OTP

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

        # Contenedor que alterna entre el formulario de login y el de OTP
        self.body = ctk.CTkFrame(self, fg_color="transparent")
        self.body.pack()

        self._build_login_view()
        self._build_otp_view()

        # Loader / mensajes de estado (compartido por ambas vistas)
        self.status_label = ctk.CTkLabel(self, text="", text_color="gray")
        self.status_label.pack(pady=(10, 0))

        self._mostrar_login()

    # ------------------------------------------------------------ Construcción
    def _build_login_view(self):
        self.login_view = ctk.CTkFrame(self.body, fg_color="transparent")

        self.email_entry = ctk.CTkEntry(self.login_view, placeholder_text="Correo Electrónico", width=300, height=45, fg_color="#12151c", border_color="#2a2f3a", text_color="#ffffff")
        self.email_entry.pack(pady=10)

        self.password_entry = ctk.CTkEntry(self.login_view, placeholder_text="Contraseña", show="*", width=300, height=45, fg_color="#12151c", border_color="#2a2f3a", text_color="#ffffff")
        self.password_entry.pack(pady=10)

        self.login_button = ctk.CTkButton(
            self.login_view, text="ENTRAR", width=300, height=45,
            fg_color="#ff6b35", hover_color="#e55a2b", text_color="#ffffff",
            font=ctk.CTkFont(family="Arial", size=14, weight="bold"),
            command=self.handle_login
        )
        self.login_button.pack(pady=30)

    def _build_otp_view(self):
        self.otp_view = ctk.CTkFrame(self.body, fg_color="transparent")

        self.otp_info = ctk.CTkLabel(
            self.otp_view,
            text="Te enviamos un código de verificación por Telegram.\nIntrodúcelo para continuar.",
            font=ctk.CTkFont(family="Arial", size=13),
            text_color="gray",
            justify="center"
        )
        self.otp_info.pack(pady=(0, 20))

        self.otp_entry = ctk.CTkEntry(
            self.otp_view, placeholder_text="Código de 6 dígitos",
            width=300, height=45, justify="center",
            fg_color="#12151c", border_color="#2a2f3a", text_color="#ffffff",
            font=ctk.CTkFont(family="Arial", size=18, weight="bold")
        )
        self.otp_entry.pack(pady=10)
        self.otp_entry.bind("<Return>", lambda _e: self.handle_verify_otp())

        self.otp_button = ctk.CTkButton(
            self.otp_view, text="VERIFICAR", width=300, height=45,
            fg_color="#ff6b35", hover_color="#e55a2b", text_color="#ffffff",
            font=ctk.CTkFont(family="Arial", size=14, weight="bold"),
            command=self.handle_verify_otp
        )
        self.otp_button.pack(pady=(30, 5))

        self.otp_back_button = ctk.CTkButton(
            self.otp_view, text="← Volver al inicio de sesión", width=300, height=35,
            fg_color="transparent", hover_color="#1a1f29", text_color="gray",
            command=self._cancelar_otp
        )
        self.otp_back_button.pack()

    # ------------------------------------------------------------ Navegación
    def _mostrar_login(self):
        self.otp_view.pack_forget()
        self.login_view.pack()
        self.subtitle_label.configure(text="Iniciar Sesión en el Launcher")

    def _mostrar_otp(self):
        self.login_view.pack_forget()
        self.otp_view.pack()
        self.subtitle_label.configure(text="Verificación en dos pasos (2FA)")
        self.otp_entry.delete(0, "end")
        self.otp_entry.focus()

    def _cancelar_otp(self):
        self.correo_pendiente = None
        self.status_label.configure(text="")
        self.otp_button.configure(state="normal", text="VERIFICAR")
        self._mostrar_login()

    # ------------------------------------------------------------ Login (paso 1)
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

            # Si el backend pide OTP (usuario con Telegram vinculado), pasamos al
            # segundo paso en lugar de entrar directamente.
            if user_data.get("otp_required"):
                self.correo_pendiente = user_data.get("correo", email)
                self.login_button.configure(state="normal", text="ENTRAR")
                self.status_label.configure(text="Código enviado por Telegram.", text_color="#00d4ff")
                self._mostrar_otp()
                return

            self.status_label.configure(text="¡Conectado!", text_color="#00d4ff")
            self.on_login_success(user_data)
        except Exception as e:
            self.status_label.configure(text=str(e), text_color="#ff4444")
            self.login_button.configure(state="normal", text="ENTRAR")
            messagebox.showerror("Error de Login", str(e))

    # ------------------------------------------------------------ OTP (paso 2)
    def handle_verify_otp(self):
        codigo = self.otp_entry.get().strip()

        if not codigo:
            messagebox.showerror("Error", "Introduce el código que recibiste por Telegram")
            return

        self.otp_button.configure(state="disabled", text="VERIFICANDO...")
        self.status_label.configure(text="Verificando código...", text_color="gray")

        self.after(100, lambda: self._do_verify_otp(codigo))

    def _do_verify_otp(self, codigo):
        try:
            user_data = api_client.verify_otp(self.correo_pendiente, codigo)
            self.status_label.configure(text="¡Conectado!", text_color="#00d4ff")
            self.correo_pendiente = None
            self.on_login_success(user_data)
        except Exception as e:
            self.status_label.configure(text=str(e), text_color="#ff4444")
            self.otp_button.configure(state="normal", text="VERIFICAR")
            self.otp_entry.delete(0, "end")
            messagebox.showerror("Error de Verificación", str(e))
