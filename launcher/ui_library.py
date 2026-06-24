import customtkinter as ctk
import api_client
from tkinter import messagebox
from PIL import Image
import requests
import io
import threading
import os
import subprocess

class LibraryFrame(ctk.CTkFrame):
    def __init__(self, master, user_data, on_logout):
        super().__init__(master, fg_color="transparent")
        self.user_data = user_data
        self.on_logout = on_logout
        
        # Header
        self.header = ctk.CTkFrame(self, height=60, fg_color="#12151c", corner_radius=0)
        self.header.pack(fill="x", side="top")
        self.header.pack_propagate(False)
        
        # Logo in header
        self.logo = ctk.CTkLabel(self.header, text="GAMEPASSKEY", font=ctk.CTkFont(size=18, weight="bold"), text_color="#00d4ff")
        self.logo.pack(side="left", padx=20, pady=15)
        
        # User info
        self.user_label = ctk.CTkLabel(self.header, text=f"Hola, {user_data.get('nombre_usuario')}", font=ctk.CTkFont(size=14))
        self.user_label.pack(side="right", padx=20, pady=15)
        
        # Logout button
        self.logout_btn = ctk.CTkButton(self.header, text="Salir", width=80, height=30, fg_color="#ff3355", hover_color="#cc0022", command=self.on_logout)
        self.logout_btn.pack(side="right", padx=10, pady=15)

        # Content area (Scrollable)
        self.scroll_area = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.scroll_area.pack(fill="both", expand=True, padx=20, pady=20)
        
        self.title_lbl = ctk.CTkLabel(self.scroll_area, text="Tu Biblioteca", font=ctk.CTkFont(size=24, weight="bold"))
        self.title_lbl.grid(row=0, column=0, sticky="w", pady=(0, 20))
        
        self.games_grid = ctk.CTkFrame(self.scroll_area, fg_color="transparent")
        self.games_grid.grid(row=1, column=0, sticky="nsew")
        
        # Iniciar carga de biblioteca
        self.load_label = ctk.CTkLabel(self.games_grid, text="Cargando juegos...", text_color="gray")
        self.load_label.grid(row=0, column=0, padx=20, pady=20)
        
        # Cargar de forma asíncrona usando hilos
        threading.Thread(target=self._load_library_thread, daemon=True).start()

    def _load_library_thread(self):
        try:
            games = api_client.get_library()
            # Actualizar GUI en el hilo principal
            self.after(0, lambda: self._render_games(games))
        except Exception as e:
            self.after(0, lambda: self._show_error(str(e)))

    def _show_error(self, msg):
        self.load_label.configure(text=f"Error: {msg}", text_color="#ff4444")

    def _render_games(self, library_items):
        if not self.winfo_exists() or not hasattr(self, 'games_grid') or not self.games_grid.winfo_exists():
            return

        try:
            self.load_label.destroy()
        except:
            pass
        
        if not library_items:
            ctk.CTkLabel(self.games_grid, text="Tu biblioteca está vacía.", text_color="gray").grid(row=0, column=0)
            return

        self.card_widgets = []
        
        for item in library_items:
            juego_info = item.get("juego", {})
            titulo = juego_info.get("titulo", f"Juego #{item.get('id_juego')}")
            estado = juego_info.get("estado", "activo")
            portada_url = juego_info.get("imagen_portada")

            card = ctk.CTkFrame(self.games_grid, width=220, height=320, fg_color="#12151c", border_color="#2a2f3a", border_width=1, corner_radius=10)
            card.grid_propagate(False)

            if portada_url:
                if not portada_url.startswith("http"):
                    if portada_url.startswith("/"):
                        portada_url = portada_url.lstrip("/")
                    portada_url = f"http://localhost/GamePassKey/frontend/{portada_url}"
                    
                try:
                    resp = requests.get(portada_url, stream=True, timeout=5)
                    if resp.status_code == 200:
                        image_data = resp.content
                        image = Image.open(io.BytesIO(image_data))
                        image = image.resize((220, 160))
                        ctk_image = ctk.CTkImage(light_image=image, dark_image=image, size=(220, 160))
                        img_lbl = ctk.CTkLabel(card, text="", image=ctk_image)
                        img_lbl.pack(pady=(0, 10))
                    else:
                        self._add_placeholder(card, titulo)
                except Exception as e:
                    print(f"Error cargando imagen: {e}")
                    self._add_placeholder(card, titulo)
            else:
                self._add_placeholder(card, titulo)

            title_lbl = ctk.CTkLabel(card, text=titulo, font=ctk.CTkFont(size=14, weight="bold"))
            title_lbl.pack(padx=10, pady=(5, 0), anchor="w")
            
            estado_color = "#00d4ff" if estado == "activo" else "#ff3355"
            estado_lbl = ctk.CTkLabel(card, text=estado.upper(), font=ctk.CTkFont(size=10), text_color=estado_color)
            estado_lbl.pack(padx=10, anchor="w")

            btn_color = "#00d4ff" if estado == "activo" else "#333333"
            btn_hover = "#00b8e6" if estado == "activo" else "#333333"
            btn_text_color = "#000000" if estado == "activo" else "#999999"
            btn_text = "JUGAR" if estado == "activo" else "MANTENIMIENTO"
            btn_state = "normal" if estado == "activo" else "disabled"

            play_btn = ctk.CTkButton(
                card, text=btn_text, fg_color=btn_color, hover_color=btn_hover, text_color=btn_text_color, state=btn_state,
                font=ctk.CTkFont(weight="bold"),
                command=lambda t=titulo: self._launch_game(t)
            )
            play_btn.pack(side="bottom", fill="x", padx=10, pady=15)

            self.card_widgets.append(card)

        self.current_max_cols = 0
        self.scroll_area.bind("<Configure>", self._on_resize)
        # Forzar un regrid inicial
        self._regrid_cards(self.scroll_area.winfo_width())

    def _on_resize(self, event):
        # Usamos event.width porque la función se llama al redimensionar scroll_area
        self._regrid_cards(event.width)

    def _regrid_cards(self, width):
        if not hasattr(self, 'card_widgets') or not self.card_widgets:
            return
            
        # Ancho de la tarjeta (220) + padding de grid (20) = 240
        card_total_width = 240 
        
        # Restamos 180px para acomodar scrollbar (20px), paddings del contenedor (40px) 
        # y un margen extra sustancial para asegurar que ninguna tarjeta se corte.
        available_width = max(1, width - 180)
        
        max_cols = max(1, available_width // card_total_width)
        
        if max_cols == self.current_max_cols:
            return
            
        self.current_max_cols = max_cols
        
        for i, card in enumerate(self.card_widgets):
            row = i // max_cols
            col = i % max_cols
            card.grid(row=row, column=col, padx=10, pady=10, sticky="n")

    def _add_placeholder(self, card, title):
        placeholder = ctk.CTkFrame(card, width=220, height=160, fg_color="#0a0c11", corner_radius=0)
        placeholder.pack(pady=(0, 10))
        placeholder.pack_propagate(False)
        lbl = ctk.CTkLabel(placeholder, text=title[:2].upper(), font=ctk.CTkFont(size=40, weight="bold"), text_color="#333333")
        lbl.place(relx=0.5, rely=0.5, anchor="center")

    def _launch_game(self, title):
        # Ocultar temporalmente el launcher para simular inmersión (opcional)
        # self.master.withdraw()
        
        # Directorio base de instalación de juegos simulado
        install_dir = os.path.join(os.path.dirname(__file__), "JuegosInstalados", "".join(x for x in title if x.isalnum() or x in " -_"))
        os.makedirs(install_dir, exist_ok=True)
        
        dummy_exe = os.path.join(install_dir, "game_simulator.py")
        
        # Si el "juego" no está instalado, lo "instalamos" (creamos el script)
        if not os.path.exists(dummy_exe):
            with open(dummy_exe, "w", encoding="utf-8") as f:
                f.write(f'''import tkinter as tk
root = tk.Tk()
root.title("{title} - Ejecutándose vía GamePassKey")
root.geometry("800x600")
root.configure(bg="black")
lbl = tk.Label(root, text="¡Estás jugando a {title}!", font=("Arial", 24, "bold"), fg="#00d4ff", bg="black")
lbl.pack(expand=True)
btn = tk.Button(root, text="Cerrar Juego", command=root.destroy, font=("Arial", 14), bg="#ff3355", fg="white")
btn.pack(pady=40)
root.mainloop()
''')
        
        # Ejecutamos el juego como un proceso independiente
        import sys
        messagebox.showinfo("Lanzando Juego", f"Iniciando el motor de {title}...\nSe ejecutará en una ventana separada.")
        subprocess.Popen([sys.executable, dummy_exe])
