"""
Script de datos de prueba — GamePassKey
Inserta juegos, usuarios de prueba y licencias en la base de datos.
Ejecutar una sola vez: python seed_data.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import Juego, Usuario, Licencia, BibliotecaUsuario, Rol
from app.auth import generar_hash_password

db = SessionLocal()

print("🌱 Iniciando carga de datos de prueba...")

# ── Juegos ────────────────────────────────────────────────────────
juegos_data = [
    {
        "titulo": "Cyber Protocol",
        "descripcion": "Un thriller de acción cyberpunk donde debes hackear corporaciones megapoderosas para liberar a la humanidad de un control digital. Combate en tiempo real con mecánicas de sigilo avanzadas.",
        "genero": "Sci-Fi, Action",
        "desarrollador": "NeonForge Studios",
        "version_actual": "2.3.1",
        "ruta_instalador": "games/cyber_protocol/setup.exe",
        "imagen_portada": None,
        "estado": "activo",
        "fecha_lanzamiento": "2024-03-15",
    },
    {
        "titulo": "Fantasy Realm Online",
        "descripcion": "Un MMORPG épico con mundos abiertos procedurales, más de 500 horas de contenido, batallas masivas entre facciones y un sistema de crafting profundo.",
        "genero": "RPG, Fantasy",
        "desarrollador": "Arcane Worlds",
        "version_actual": "5.1.0",
        "ruta_instalador": "games/fantasy_realm/setup.exe",
        "imagen_portada": None,
        "estado": "activo",
        "fecha_lanzamiento": "2024-01-20",
    },
    {
        "titulo": "Apex Racing GT",
        "descripcion": "El simulador de carreras más realista del mercado. Más de 200 vehículos, 50 pistas reales y un motor de física que reproduce cada curva con precisión milimétrica.",
        "genero": "Simulator, Racing",
        "desarrollador": "SpeedTech Interactive",
        "version_actual": "3.0.2",
        "ruta_instalador": "games/apex_racing/setup.exe",
        "imagen_portada": None,
        "estado": "activo",
        "fecha_lanzamiento": "2025-02-10",
    },
    {
        "titulo": "Retro Dungeon",
        "descripcion": "Un roguelite de píxeles con generación procedural infinita. Cada partida es única. Descubre secretos, forja alianzas con personajes misteriosos y sobrevive al calabozo eterno.",
        "genero": "Pixel Art, Roguelite",
        "desarrollador": "PixelCraft Indie",
        "version_actual": "1.8.5",
        "ruta_instalador": "games/retro_dungeon/setup.exe",
        "imagen_portada": None,
        "estado": "activo",
        "fecha_lanzamiento": "1999-06-01",
    },
    {
        "titulo": "Space Command",
        "descripcion": "Conquista la galaxia en este grandioso juego de estrategia en tiempo real. Gestiona recursos, construye flotas estelares y negocia o combate con civilizaciones alienígenas.",
        "genero": "Strategy, Sci-Fi",
        "desarrollador": "Orbital Games",
        "version_actual": "4.2.0",
        "ruta_instalador": "games/space_command/setup.exe",
        "imagen_portada": None,
        "estado": "activo",
        "fecha_lanzamiento": "2024-11-05",
    },
    {
        "titulo": "Shadow Blade",
        "descripcion": "Acción de hack-and-slash con un sistema de combate fluido inspirado en el arte marcial japonés. Domina más de 200 combos y enfrenta a los señores del mal en épicas batallas.",
        "genero": "Action, Hack & Slash",
        "desarrollador": "Katana Entertainment",
        "version_actual": "2.1.3",
        "ruta_instalador": "games/shadow_blade/setup.exe",
        "imagen_portada": None,
        "estado": "activo",
        "fecha_lanzamiento": "2023-08-22",
    },
    {
        "titulo": "Neon City Builders",
        "descripcion": "Construye y administra la metrópolis cyberpunk de tus sueños. Gestiona la economía, el crimen, el transporte y mantén felices a tus millones de ciudadanos digitales.",
        "genero": "Strategy, City Builder",
        "desarrollador": "Urban Pixel Labs",
        "version_actual": "1.5.0",
        "ruta_instalador": "games/neon_city/setup.exe",
        "imagen_portada": None,
        "estado": "activo",
        "fecha_lanzamiento": "2025-01-15",
    },
    {
        "titulo": "Void Hunters",
        "descripcion": "Shooter espacial multijugador en primera persona. Forma equipos de hasta 6 jugadores, explora estaciones espaciales abandonadas y caza criaturas del vacío interdimensional.",
        "genero": "FPS, Multiplayer",
        "desarrollador": "Darkspace Dev",
        "version_actual": "3.7.2",
        "ruta_instalador": "games/void_hunters/setup.exe",
        "imagen_portada": None,
        "estado": "activo",
        "fecha_lanzamiento": "2024-07-30",
    },
    {
        "titulo": "Dragon Chronicles",
        "descripcion": "RPG de mundo abierto donde encarnas a un jinete de dragones. Explora un continente vasto, personaliza tu bestia alada y decide el destino de reinos enteros con tus decisiones.",
        "genero": "RPG, Adventure",
        "desarrollador": "Epic Dragon Studios",
        "version_actual": "6.0.1",
        "ruta_instalador": "games/dragon_chronicles/setup.exe",
        "imagen_portada": None,
        "estado": "activo",
        "fecha_lanzamiento": "2023-12-01",
    },
    {
        "titulo": "Quantum Break 2",
        "descripcion": "Manipula el tiempo para resolver puzzles imposibles y combatir enemigos. Una narrativa cinematográfica que combina jugabilidad y serie de acción en vivo.",
        "genero": "Action, Sci-Fi",
        "desarrollador": "TimeWarp Games",
        "version_actual": "1.0.0",
        "ruta_instalador": "games/quantum_break2/setup.exe",
        "imagen_portada": None,
        "estado": "mantenimiento",
        "fecha_lanzamiento": "2025-06-01",
    },
]

print(f"  → Insertando {len(juegos_data)} juegos...")
juegos_creados = []
for jd in juegos_data:
    existente = db.query(Juego).filter(Juego.titulo == jd["titulo"]).first()
    if not existente:
        j = Juego(**jd)
        db.add(j)
        db.flush()
        juegos_creados.append(j)
        print(f"    ✅ {jd['titulo']}")
    else:
        juegos_creados.append(existente)
        print(f"    ⚠️  {jd['titulo']} ya existe, omitido.")

db.commit()
for j in juegos_creados:
    db.refresh(j)

# ── Usuarios de prueba ────────────────────────────────────────────
print("\n  → Insertando usuarios de prueba...")

rol_cliente = db.query(Rol).filter(Rol.nombre_rol == "cliente").first()
if not rol_cliente:
    print("    ❌ Rol 'cliente' no encontrado. Asegúrate de tener los roles en la BD.")
    db.close()
    sys.exit(1)

usuarios_data = [
    {"nombre_usuario": "Carlos Gamer",  "correo": "carlos@gamepasskey.com",  "password": "Carlos123"},
    {"nombre_usuario": "María Pro",     "correo": "maria@gamepasskey.com",   "password": "Maria123"},
    {"nombre_usuario": "Test Usuario",  "correo": "test@gamepasskey.com",    "password": "Test1234"},
]

usuarios_creados = []
for ud in usuarios_data:
    existente = db.query(Usuario).filter(Usuario.correo == ud["correo"]).first()
    if not existente:
        u = Usuario(
            id_rol=rol_cliente.id_rol,
            nombre_usuario=ud["nombre_usuario"],
            correo=ud["correo"],
            password_hash=generar_hash_password(ud["password"]),
            estado="activo",
        )
        db.add(u)
        db.flush()
        usuarios_creados.append(u)
        print(f"    ✅ {ud['nombre_usuario']} ({ud['correo']})")
    else:
        usuarios_creados.append(existente)
        print(f"    ⚠️  {ud['correo']} ya existe, omitido.")

db.commit()
for u in usuarios_creados:
    db.refresh(u)

# ── Licencias para el admin (id=1) ────────────────────────────────
print("\n  → Creando licencias para Admin Root...")

admin = db.query(Usuario).filter(Usuario.correo == "admin@gamepasskey.local").first()
if admin:
    import uuid
    # Asignar los primeros 5 juegos al admin
    for juego in juegos_creados[:5]:
        existe = db.query(Licencia).filter(
            Licencia.id_usuario == admin.id_usuario,
            Licencia.id_juego == juego.id_juego,
        ).first()
        if not existe:
            lic = Licencia(
                id_usuario=admin.id_usuario,
                id_juego=juego.id_juego,
                clave_licencia=f"GPK-ADMIN-{uuid.uuid4().hex[:12].upper()}",
                estado="activa",
                fecha_compra=datetime.utcnow(),
                fecha_expiracion=datetime.utcnow() + timedelta(days=365),
            )
            db.add(lic)
            db.flush()

            # Agregar a biblioteca
            en_bib = db.query(BibliotecaUsuario).filter(
                BibliotecaUsuario.id_usuario == admin.id_usuario,
                BibliotecaUsuario.id_juego == juego.id_juego,
            ).first()
            if not en_bib:
                bib = BibliotecaUsuario(
                    id_usuario=admin.id_usuario,
                    id_juego=juego.id_juego,
                    id_licencia=lic.id_licencia,
                )
                db.add(bib)
            print(f"    ✅ Licencia + biblioteca: {juego.titulo}")
        else:
            print(f"    ⚠️  Admin ya tiene licencia de {juego.titulo}")
    db.commit()
else:
    print("    ⚠️  Admin no encontrado.")

# ── Licencias para Carlos ─────────────────────────────────────────
print("\n  → Creando licencias para Carlos Gamer...")
carlos = next((u for u in usuarios_creados if u.correo == "carlos@gamepasskey.com"), None)
if not carlos:
    carlos = db.query(Usuario).filter(Usuario.correo == "carlos@gamepasskey.com").first()

if carlos:
    for juego in juegos_creados[2:7]:
        existe = db.query(Licencia).filter(
            Licencia.id_usuario == carlos.id_usuario,
            Licencia.id_juego == juego.id_juego,
        ).first()
        if not existe:
            lic = Licencia(
                id_usuario=carlos.id_usuario,
                id_juego=juego.id_juego,
                clave_licencia=f"GPK-CARLOS-{uuid.uuid4().hex[:12].upper()}",
                estado="activa",
                fecha_compra=datetime.utcnow(),
                fecha_expiracion=datetime.utcnow() + timedelta(days=180),
            )
            db.add(lic)
            db.flush()
            bib = BibliotecaUsuario(
                id_usuario=carlos.id_usuario,
                id_juego=juego.id_juego,
                id_licencia=lic.id_licencia,
            )
            db.add(bib)
            print(f"    ✅ {juego.titulo}")
    db.commit()

db.close()
print("\n✅ ¡Datos de prueba cargados exitosamente!")
print("\n👥 Usuarios disponibles:")
print("   Admin:   admin@gamepasskey.local  / Admin123")
print("   Carlos:  carlos@gamepasskey.com   / Carlos123")
print("   María:   maria@gamepasskey.com    / Maria123")
print("   Test:    test@gamepasskey.com     / Test1234")
