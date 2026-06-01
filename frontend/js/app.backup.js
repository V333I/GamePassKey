// ── Register modal ──────────────────────────────────────────────
function openRegisterModal() {
  document.getElementById('modal-register').classList.remove('hidden');
  document.getElementById('reg-error').classList.add('hidden');
  document.getElementById('register-form').reset();
}
function closeRegisterModal(e) {
  if (e.target === document.getElementById('modal-register'))
    document.getElementById('modal-register').classList.add('hidden');
}

const COVER_PALETTES = [
  ['#0d1b4b', '#1a3a8f', '#2255cc'],
  ['#1a0a2e', '#4a0e8f', '#7b3fff'],
  ['#0a2218', '#0d5c3a', '#00c96a'],
  ['#2d0808', '#8f1a1a', '#cc3333'],
  ['#1a1208', '#8f5a0a', '#e8a020'],
  ['#0a0d1a', '#0d2255', '#1a4aaa'],
  ['#1a0a2e', '#2d1a5e', '#6633cc'],
  ['#081a1a', '#0d4a4a', '#00aaaa'],
];

// ── Toast system ─────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── View switcher ─────────────────────────────────────────────────
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const v = document.getElementById(viewId);
  if (v) { v.classList.remove('hidden'); v.classList.add('active'); }
}
function showLogin() { showView('view-login'); }
function showDashboard() { showView('view-dashboard'); }

// ── Sidebar section switcher ──────────────────────────────────────
function switchSection(name, el) {
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');

  // Ocultar todas las secciones correctamente
  document.querySelectorAll('.content-section').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });

  // Mostrar la sección objetivo
  const section = document.getElementById(`section-${name}`);
  if (section) {
    section.classList.remove('hidden');
    section.classList.add('active');
  }

  const loaders = {
    biblioteca:   loadLibrary,
    juegos:       loadCatalog,
    licencias:    loadLicenses,
    dispositivos: loadDevices,
    perfil:       loadProfile,
  };
  if (loaders[name]) loaders[name]();
}

// ── Search filter ─────────────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.game-card').forEach(card => {
    const title = card.dataset.title?.toLowerCase() || '';
    const genre = card.dataset.genre?.toLowerCase() || '';
    card.style.display = (title.includes(q) || genre.includes(q)) ? '' : 'none';
  });
});

// ── Game cover generator ─────────────────────────────────────────
function generateCover(title, index, coverUrl) {
  if (coverUrl) {
    return `
      <div style="position: absolute; inset: -20px; background-image: url('${coverUrl}'); background-size: cover; background-position: center; filter: blur(15px); opacity: 0.4; z-index: 0;"></div>
      <img src="${coverUrl}" class="game-cover-img" alt="${title}" style="position: relative; z-index: 1; object-fit: contain;" />
    `;
  }
  const pal = COVER_PALETTES[index % COVER_PALETTES.length];
  const abbr = title.slice(0, 2).toUpperCase();
  return `
    <div class="game-cover-bg" style="background: linear-gradient(135deg, ${pal[0]} 0%, ${pal[1]} 60%, ${pal[2]} 100%);">
      <div style="text-align:center; padding: 10px;">
        <div style="font-size:2.4rem; font-weight:900; color:rgba(255,255,255,0.15); letter-spacing:0.1em; line-height:1;">${abbr}</div>
      </div>
    </div>`;
}

// ── Status badge ─────────────────────────────────────────────────
function makeBadge(estado) {
  const map = {
    activo:       { cls: 'badge-active',      label: 'READY' },
    inactivo:     { cls: 'badge-inactive',    label: 'OFFLINE' },
    mantenimiento:{ cls: 'badge-maintenance', label: 'MAINT.' },
    activa:       { cls: 'badge-active',      label: 'ACTIVA' },
    revocada:     { cls: 'badge-inactive',    label: 'REVOCADA' },
    expirada:     { cls: 'badge-maintenance', label: 'EXPIRADA' },
    autorizado:   { cls: 'badge-active',      label: 'AUTORIZADO' },
    bloqueado:    { cls: 'badge-inactive',    label: 'BLOQUEADO' },
  };
  const b = map[estado] || { cls: 'badge-inactive', label: estado?.toUpperCase() || '—' };
  return `<span class="badge ${b.cls}">${b.label}</span>`;
}

// ── Build a game card ─────────────────────────────────────────────
function buildGameCard(juego, idx, context = 'library') {
  const card = document.createElement('div');
  card.className = 'game-card';
  card.dataset.title = juego.titulo;
  card.dataset.genre = juego.genero || '';
  card.dataset.estado = juego.estado || 'activo';
  card.onclick = () => openGameModal(juego, idx, context);

  card.innerHTML = `
    <div class="game-cover">
      ${generateCover(juego.titulo, idx, juego.imagen_portada)}
        <div class="game-cover-overlay">
          ${juego.estado === 'mantenimiento'
            ? `<button class="btn-play" style="background:rgba(20,20,30,0.9); border:1px solid rgba(255,255,255,0.1); color:var(--text-muted);">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                 MANTENIMIENTO
               </button>`
            : `<button class="btn-play">
                 <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                 ${context === 'catalog' ? 'VER JUEGO' : 'JUGAR'}
               </button>`
          }
        </div>
    </div>
    <div class="game-info">
      <div class="game-title">${juego.titulo}</div>
      <div class="game-meta">
        <span class="game-genre">${juego.genero || 'Sin género'}</span>
        <span class="game-year">${juego.fecha_lanzamiento ? juego.fecha_lanzamiento.slice(0,4) : '—'}</span>
      </div>
      <div class="game-footer">
        ${makeBadge(juego.estado)}
        <span style="font-size:0.68rem;color:var(--text-muted)">v${juego.version_actual || '1.0'}</span>
      </div>
    </div>`;
  return card;
}

// ── Open game modal ───────────────────────────────────────────────
async function openGameModal(juego, idx, context = 'library') {
  document.getElementById('modal-cover').innerHTML = generateCover(juego.titulo, idx, juego.imagen_portada);
  document.getElementById('modal-genres').innerHTML = juego.genero
    ? juego.genero.split(',').map(g => `<span class="badge badge-maintenance">${g.trim()}</span>`).join('')
    : '';
  document.getElementById('modal-title').textContent  = juego.titulo;
  document.getElementById('modal-desc').textContent   = juego.descripcion || 'Sin descripción disponible.';
  document.getElementById('modal-dev').textContent    = juego.desarrollador || '—';
  document.getElementById('modal-ver').textContent    = juego.version_actual || '—';
  document.getElementById('modal-date').textContent   = juego.fecha_lanzamiento || '—';
  document.getElementById('modal-status').innerHTML   = makeBadge(juego.estado);
  
  const actionsDiv = document.querySelector('#modal-game .modal-actions');
  
  if (juego.estado === 'mantenimiento') {
    actionsDiv.innerHTML = `
      <button class="btn-primary" disabled style="background:#2a2f3a; border-color:#2a2f3a; color:var(--text-muted); cursor:not-allowed;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        NO DISPONIBLE
      </button>
    `;
  } else if (context === 'catalog') {
    actionsDiv.innerHTML = `<div class="spinner"></div> Verificando biblioteca...`;
    document.getElementById('modal-game').classList.remove('hidden');

    try {
      const myGames = await ApiBiblioteca.miBiblioteca();
      const yaLoTiene = myGames.some(g => g.id_juego === juego.id_juego);
      
      if (yaLoTiene) {
        actionsDiv.innerHTML = `
          <button class="btn-primary" disabled style="background:#10b981;border-color:#10b981;cursor:default;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            YA EN BIBLIOTECA
          </button>
        `;
      } else {
        actionsDiv.innerHTML = `
          <button class="btn-primary" onclick="solicitarJuego(${juego.id_juego}, this)" style="background:var(--accent-orange);border-color:var(--accent-orange);box-shadow:0 0 15px rgba(255,107,53,0.3);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            SOLICITAR CÓDIGO
          </button>
        `;
      }
    } catch (e) {
      actionsDiv.innerHTML = `<span style="color:var(--accent-red)">Error al verificar biblioteca</span>`;
    }
    return; // El modal ya se mostró
  } else {
    actionsDiv.innerHTML = `
      <button class="btn-primary" id="modal-play-btn">
        <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        JUGAR
      </button>
    `;
  }
  
  document.getElementById('modal-game').classList.remove('hidden');
}

function closeModal(e) {
  if (e.target === document.getElementById('modal-game'))
    document.getElementById('modal-game').classList.add('hidden');
}

// ── Library Loader ────────────────────────────────────────────────
async function loadLibrary() {
  const grid    = document.getElementById('games-grid');
  const loading = document.getElementById('library-loading');
  const empty   = document.getElementById('library-empty');

  grid.classList.add('hidden');
  empty.classList.add('hidden');
  loading.style.display = 'flex';

  try {
    const items = await ApiBiblioteca.miBiblioteca();

    if (!items.length) {
      // Biblioteca vacía — mostrar estado vacío con invitación a canjear código
      empty.classList.remove('hidden');
      return;
    }

    // Enriquecer con datos completos del juego
    const todosJuegos = await ApiJuegos.listar('todos');
    const juegosMap = {};
    todosJuegos.forEach(j => { juegosMap[j.id_juego] = j; });

    const juegos = items.map(b => juegosMap[b.id_juego])
                        .filter(Boolean)
                        .sort((a, b) => a.titulo.localeCompare(b.titulo));
    
    renderGamesGrid(grid, juegos);

    if (!grid.children.length) {
      empty.classList.remove('hidden');
    } else {
      grid.classList.remove('hidden');
    }
  } catch (err) {
    showToast(err.message || 'Error cargando biblioteca', 'error');
    empty.classList.remove('hidden');
  } finally {
    loading.style.display = 'none';
  }
}

function renderGamesGrid(container, juegos) {
  container.innerHTML = '';
  juegos.forEach((j, idx) => container.appendChild(buildGameCard(j, idx, 'library')));
}

// ── Catalog Loader ────────────────────────────────────────────────
async function loadCatalog() {
  const grid    = document.getElementById('catalog-grid');
  const loading = document.getElementById('catalog-loading');

  grid.innerHTML = '';
  loading.style.display = 'flex';

  try {
    const juegos = await ApiJuegos.listar('todos');
    juegos.forEach((j, idx) => grid.appendChild(buildGameCard(j, idx, 'catalog')));
    if (!juegos.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted);">No hay juegos en el catálogo aún.</div>`;
    }
  } catch (err) {
    showToast(err.message || 'Error cargando catálogo', 'error');
  } finally {
    loading.style.display = 'none';
  }
}

// ── Licenses Loader ───────────────────────────────────────────────
async function loadLicenses() {
  const list = document.getElementById('licenses-list');
  list.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando licencias...</p></div>`;

  try {
    const [licencias, juegos] = await Promise.all([
      ApiLicencias.misLicencias(),
      ApiJuegos.listar('activo').catch(() => []),
    ]);
    const gamesMap = {};
    juegos.forEach(j => { gamesMap[j.id_juego] = j; });

    if (!licencias.length) {
      list.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <h3>Sin licencias</h3><p>Aún no tienes licencias. Canjea un código en tu biblioteca.</p></div>`;
      return;
    }

    list.innerHTML = '';
    licencias.forEach(lic => {
      const item = document.createElement('div');
      item.className = 'list-item';
      const exp = lic.fecha_expiracion
        ? new Date(lic.fecha_expiracion).toLocaleDateString('es')
        : 'Sin expiración';
      const juego = gamesMap[lic.id_juego];
      item.innerHTML = `
        <div class="list-item-left">
          <div class="list-item-icon">${juego ? juego.titulo.slice(0,2).toUpperCase() : 'GP'}</div>
          <div>
            <div class="list-item-title">${juego ? juego.titulo : `Juego #${lic.id_juego}`}</div>
            <div class="list-item-sub" style="font-family:var(--font-mono);font-size:0.72rem">${lic.clave_licencia}</div>
          </div>
        </div>
        <div class="list-item-right">
          <div class="info-pair"><label>Expira</label><span>${exp}</span></div>
          ${makeBadge(lic.estado)}
        </div>`;
      list.appendChild(item);
    });
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

// ── Devices Loader ────────────────────────────────────────────────
async function loadDevices() {
  const list = document.getElementById('devices-list');
  list.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando dispositivos...</p></div>`;

  try {
    const dispositivos = await ApiDispositivos.misDispositivos();
    const btnRegister = document.getElementById('btn-show-register-device');
    
    // Deshabilitar botón si ya hay 2 dispositivos
    if (dispositivos.length >= 2) {
      btnRegister.disabled = true;
      btnRegister.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Límite Alcanzado (2/2)`;
      btnRegister.style.opacity = '0.5';
      btnRegister.style.cursor = 'not-allowed';
    } else {
      btnRegister.disabled = false;
      btnRegister.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Registrar Dispositivo`;
      btnRegister.style.opacity = '1';
      btnRegister.style.cursor = 'pointer';
    }

    if (!dispositivos.length) {
      list.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        <h3>Sin dispositivos</h3><p>No tienes dispositivos registrados.</p></div>`;
      return;
    }

    list.innerHTML = '';
    dispositivos.forEach(d => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div class="list-item-left">
          <div class="list-item-title">${d.nombre_dispositivo || 'Dispositivo sin nombre'}</div>
          <div class="list-item-sub">${d.sistema_operativo || '—'} · HW: ${d.hardware_id.slice(0, 20)}…</div>
        </div>
        <div class="list-item-right">
          <div class="info-pair">
            <label>Último uso</label>
            <span>${d.ultimo_uso ? new Date(d.ultimo_uso).toLocaleDateString('es') : '—'}</span>
          </div>
          ${makeBadge(d.estado)}
        </div>`;
      list.appendChild(item);
    });
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

// ── Profile Loader ────────────────────────────────────────────────
async function loadProfile() {
  const user = Auth.user();
  if (!user) return;

  try {
    const perfil = await ApiUsuarios.miPerfil().catch(() => user);
    document.getElementById('profile-name').textContent  = perfil.nombre_usuario;
    document.getElementById('profile-email').textContent = perfil.correo;
    document.getElementById('profile-estado').textContent = perfil.estado;
    document.getElementById('p-id').textContent      = perfil.id_usuario;
    document.getElementById('p-nombre').textContent  = perfil.nombre_usuario;
    document.getElementById('p-correo').textContent  = perfil.correo;
    document.getElementById('p-estado').innerHTML    = makeBadge(perfil.estado);
  } catch {}
}

// ── Filter games (library) ────────────────────────────────────────
function filterGames(estado, el) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');

  document.querySelectorAll('#games-grid .game-card').forEach(card => {
    if (estado === 'todos') { card.style.display = ''; return; }
    const cardEstado = card.dataset.estado || 'activo';
    card.style.display = (cardEstado === estado) ? '' : 'none';
  });
}

// ── Login form ────────────────────────────────────────────────────
function togglePassword() {
  const input = document.getElementById('login-password');
  input.type = input.type === 'password' ? 'text' : 'password';
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const correo   = document.getElementById('login-correo').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl  = document.getElementById('login-error');
  const errorMsg = document.getElementById('login-error-msg');
  const btnText  = document.querySelector('#btn-login .btn-text');
  const btnLoad  = document.querySelector('#btn-login .btn-loader');

  // UI: loading
  errorEl.classList.add('hidden');
  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');
  document.getElementById('btn-login').disabled = true;

  try {
    const data = await ApiAuth.login(correo, password);
    Auth.save(data);

    // Update UI
    document.getElementById('nav-username').textContent = data.nombre_usuario;

    // Detectar si es admin consultando el perfil
    try {
      const perfil = await ApiUsuarios.miPerfil();
      // Rol 1 = administrador
      if (perfil.id_rol === 1) {
        document.getElementById('nav-role').textContent = 'ADMINISTRADOR';
        document.getElementById('btn-admin-link').classList.remove('hidden');
      } else {
        document.getElementById('nav-role').textContent = 'USUARIO';
      }
    } catch { document.getElementById('nav-role').textContent = 'USUARIO'; }

    showToast(`¡Bienvenido, ${data.nombre_usuario}!`);
    showDashboard();
    loadLibrary();

  } catch (err) {
    errorMsg.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
    document.getElementById('btn-login').disabled = false;
  }
});

// ── Register form ─────────────────────────────────────────────────
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre   = document.getElementById('reg-nombre').value.trim();
  const correo   = document.getElementById('reg-correo').value.trim();
  const pass1    = document.getElementById('reg-password').value;
  const pass2    = document.getElementById('reg-password2').value;
  const errorEl  = document.getElementById('reg-error');
  const errorMsg = document.getElementById('reg-error-msg');
  const btnText  = document.querySelector('#btn-register .btn-text');
  const btnLoad  = document.querySelector('#btn-register .btn-loader');

  errorEl.classList.add('hidden');

  // Validaciones locales
  if (!nombre) { errorMsg.textContent = 'El nombre es obligatorio.'; errorEl.classList.remove('hidden'); return; }
  if (pass1.length < 6) { errorMsg.textContent = 'La contraseña debe tener al menos 6 caracteres.'; errorEl.classList.remove('hidden'); return; }
  if (pass1 !== pass2) { errorMsg.textContent = 'Las contraseñas no coinciden.'; errorEl.classList.remove('hidden'); return; }

  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');
  document.getElementById('btn-register').disabled = true;

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nombre_usuario: nombre, correo, password: pass1 }),
    });
    Auth.save(data);
    document.getElementById('nav-username').textContent = data.nombre_usuario;
    document.getElementById('modal-register').classList.add('hidden');
    showToast(`¡Bienvenido, ${data.nombre_usuario}! Cuenta creada exitosamente.`);
    showDashboard();
    loadLibrary();
  } catch (err) {
    errorMsg.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
    document.getElementById('btn-register').disabled = false;
  }
});

// ── Editar Perfil ──────────────────────────────────────────────────
function openEditProfileModal() {
  document.getElementById('modal-edit-profile').classList.remove('hidden');
  document.getElementById('edit-profile-error').classList.add('hidden');
  document.getElementById('edit-profile-name').value = document.getElementById('profile-name').textContent;
  document.getElementById('edit-profile-pass-current').value = '';
  document.getElementById('edit-profile-pass-new').value = '';
}

function closeEditProfileModal() {
  document.getElementById('modal-edit-profile').classList.add('hidden');
}

async function submitEditProfile(event) {
  event.preventDefault();
  const name = document.getElementById('edit-profile-name').value.trim();
  const passCurrent = document.getElementById('edit-profile-pass-current').value;
  const passNew = document.getElementById('edit-profile-pass-new').value;

  const errEl = document.getElementById('edit-profile-error');
  const errMsg = document.getElementById('edit-profile-error-msg');
  const btn = document.getElementById('btn-edit-profile');
  const btnText = btn.querySelector('.btn-text');
  const btnLoad = btn.querySelector('.btn-loader');

  errEl.classList.add('hidden');

  const datos = {};
  if (name && name !== document.getElementById('profile-name').textContent) {
    datos.nombre_usuario = name;
  }
  if (passNew) {
    if (!passCurrent) {
      errMsg.textContent = 'Debes ingresar tu contraseña actual para cambiarla.';
      errEl.classList.remove('hidden');
      return;
    }
    datos.password_actual = passCurrent;
    datos.password_nuevo = passNew;
  }

  if (Object.keys(datos).length === 0) {
    closeEditProfileModal();
    return;
  }

  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');
  btn.disabled = true;

  try {
    const resp = await ApiUsuarios.actualizarPerfil(datos);
    showToast('Perfil actualizado correctamente');
    closeEditProfileModal();

    if (datos.password_nuevo) {
      showToast('Contraseña cambiada. Por favor inicia sesión nuevamente.', 'error');
      setTimeout(() => logout(), 2000);
    } else {
      // Actualizar solo nombre de usuario en UI
      document.getElementById('profile-name').textContent = resp.nombre_usuario;
      document.getElementById('p-nombre').textContent = resp.nombre_usuario;
      document.getElementById('nav-username').textContent = resp.nombre_usuario;
      
      // Actualizar nombre en localstorage
      const user = Auth.user();
      if (user) {
        user.nombre_usuario = resp.nombre_usuario;
        localStorage.setItem('gamepass_user', JSON.stringify(user));
      }
    }
  } catch (err) {
    errMsg.textContent = err.message || 'Error al actualizar perfil.';
    errEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
    btn.disabled = false;
  }
}


// ── Canjear Código ──────────────────────────────────────────────────
function openRedeemModal() {
  document.getElementById('modal-redeem').classList.remove('hidden');
  document.getElementById('redeem-error').classList.add('hidden');
  document.getElementById('redeem-codigo').value = '';
}

function closeRedeemModal() {
  document.getElementById('modal-redeem').classList.add('hidden');
}

async function submitRedeem(event) {
  event.preventDefault();
  const codigo = document.getElementById('redeem-codigo').value.trim();
  
  const errEl = document.getElementById('redeem-error');
  const errMsg = document.getElementById('redeem-error-msg');
  const btn = document.getElementById('btn-redeem');
  const btnText = btn.querySelector('.btn-text');
  const btnLoad = btn.querySelector('.btn-loader');

  errEl.classList.add('hidden');
  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');
  btn.disabled = true;

  try {
    await ApiCodigos.usar({ codigo });
    showToast('¡Código canjeado con éxito! El juego ha sido añadido a tu biblioteca.');
    closeRedeemModal();
    loadLibrary(); // Recargar la biblioteca
  } catch (err) {
    errMsg.textContent = err.message || 'Error al canjear el código.';
    errEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
    btn.disabled = false;
  }
}

// ── Logout ────────────────────────────────────────────────────────
function logout() {
  Auth.clear();
  document.getElementById('login-correo').value   = '';
  document.getElementById('login-password').value = '';
  showToast('Sesión cerrada correctamente');
  showLogin();
}

// ── Registrar Dispositivo ──────────────────────────────────────────
function showRegisterDevice() {
  document.getElementById('modal-register-device').classList.remove('hidden');
  document.getElementById('reg-dev-error').classList.add('hidden');
  
  // Limpiar campos y generar HWID
  document.getElementById('reg-dev-name').value = '';
  document.getElementById('reg-dev-hwid').value = 'HWID-' + Math.random().toString(36).substring(2, 12).toUpperCase();
  
  // Preseleccionar SO
  const ua = navigator.userAgent;
  const osSelect = document.getElementById('reg-dev-os');
  if (ua.indexOf("Windows") !== -1) {
    osSelect.value = 'Windows 11'; 
  }
}

function closeRegisterDevice() {
  document.getElementById('modal-register-device').classList.add('hidden');
}

// Funciones helper para modales genéricos
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// Enviar ticket de soporte
async function enviarSoporte(event) {
  event.preventDefault();
  const asunto = document.getElementById('soporte-asunto').value;
  const mensaje = document.getElementById('soporte-mensaje').value;

  try {
    await apiFetch('/soporte', {
      method: 'POST',
      body: JSON.stringify({ asunto, mensaje })
    });
    showToast('Tu mensaje ha sido enviado correctamente al administrador.');
    closeModal('modal-soporte');
    document.getElementById('form-soporte').reset();
  } catch (error) {
    showToast('Error al enviar mensaje: ' + error.message, 'error');
  }
}

async function submitRegisterDevice(event) {
  event.preventDefault();
  const name = document.getElementById('reg-dev-name').value.trim();
  const hwid = document.getElementById('reg-dev-hwid').value;
  const os = document.getElementById('reg-dev-os').value;
  
  const errEl = document.getElementById('reg-dev-error');
  const errMsg = document.getElementById('reg-dev-error-msg');
  const btn = document.getElementById('btn-reg-dev');
  const btnText = btn.querySelector('.btn-text');
  const btnLoad = btn.querySelector('.btn-loader');

  errEl.classList.add('hidden');
  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');
  btn.disabled = true;

  try {
    await ApiDispositivos.registrar({
      nombre_dispositivo: name,
      hardware_id: hwid,
      sistema_operativo: os
    });
    
    showToast('Dispositivo registrado correctamente');
    closeRegisterDevice();
    loadDevices(); // Recargar la lista
  } catch (err) {
    errMsg.textContent = err.message || 'Error al registrar el dispositivo.';
    errEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
    btn.disabled = false;
  }
}

// ── App init ──────────────────────────────────────────────────────
function checkAdminRole() {
  const user = Auth.user();
  const isAdmin = user && (user.id_rol === 1 || user.id_rol === '1');
  if (isAdmin) {
    document.getElementById('nav-role').textContent = 'ADMINISTRADOR';
    document.getElementById('btn-admin-link').classList.remove('hidden');
  } else {
    document.getElementById('nav-role').textContent = 'USUARIO';
    document.getElementById('btn-admin-link').classList.add('hidden');
  }
}

// ── Init Dashboard ──────────────────────────────────────────────────
function initDashboard() {
  const user = Auth.user();
  if (!user) return showLogin();
  
  document.getElementById('nav-username').textContent = user.nombre_usuario;
  const rolStr = user.id_rol === 1 ? 'ADMINISTRADOR' : 'USUARIO';
  document.getElementById('nav-role').textContent = rolStr;
  
  if (user.id_rol === 1) {
    document.getElementById('btn-admin-link').classList.remove('hidden');
  } else {
    document.getElementById('btn-admin-link').classList.add('hidden');
  }

  showDashboard();
  loadLibrary();
  loadProfile();
  loadNotifications(); // Cargar notificaciones al inicio
}


// ── Notificaciones y Solicitudes ──────────────────────────────────
let notificacionesActivas = [];

async function loadNotifications() {
  try {
    const res = await apiFetch('/notificaciones');
    notificacionesActivas = res || [];
    updateNotificationBell();
  } catch (err) {
    console.error("Error cargando notificaciones:", err);
  }
}

function updateNotificationBell() {
  const dot = document.getElementById('notification-dot');
  const noLeidas = notificacionesActivas.filter(n => !n.leida).length;
  if (noLeidas > 0) {
    dot.classList.remove('hidden');
  } else {
    dot.classList.add('hidden');
  }
}

function toggleNotifications() {
  const modal = document.getElementById('modal-notifications');
  if (modal.classList.contains('hidden')) {
    modal.classList.remove('hidden');
    renderNotifications();
  } else {
    modal.classList.add('hidden');
  }
}

function closeNotifications() {
  document.getElementById('modal-notifications').classList.add('hidden');
}

function renderNotifications() {
  const list = document.getElementById('notifications-list');
  if (!notificacionesActivas.length) {
    list.innerHTML = `<div class="empty-state"><p>No tienes notificaciones.</p></div>`;
    return;
  }
  
  list.innerHTML = notificacionesActivas.map(n => {
    const codeMatch = n.mensaje.match(/GPK-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
    let codeHtml = '';
    if (codeMatch) {
      const code = codeMatch[0];
      codeHtml = `
        <div style="margin-top: 12px; padding: 12px; background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
          <code style="color: #00d4ff; font-weight: 600; font-family: monospace; font-size: 0.9rem; letter-spacing: 1px;">${code}</code>
          <div style="display: flex; gap: 6px;">
            <button onclick="event.stopPropagation(); navigator.clipboard.writeText('${code}').then(()=>showToast('Código copiado'));" class="btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.7rem;">Copiar</button>
            <button onclick="event.stopPropagation(); closeNotifications(); document.getElementById('redeem-codigo').value='${code}'; openRedeemModal();" class="btn-primary btn-sm" style="padding: 4px 8px; font-size: 0.7rem;">Canjear</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="notification-item ${n.leida ? 'read' : 'unread'}" style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;" onclick="markAsRead(${n.id_notificacion}, this)">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <strong style="color: ${n.leida ? 'var(--text-muted)' : 'var(--accent-blue)'};">${n.titulo}</strong>
          ${!n.leida ? '<span style="width:8px;height:8px;background:var(--accent-orange);border-radius:50%;display:inline-block;"></span>' : ''}
        </div>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin:0; line-height: 1.4;">${n.mensaje}</p>
        ${codeHtml}
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:8px;">
          ${new Date(n.fecha_creacion).toLocaleString('es')}
        </div>
      </div>
    `;
  }).join('');
}

async function markAsRead(id, el) {
  try {
    await apiFetch(`/notificaciones/${id}/leer`, { method: 'PUT' });
    const notif = notificacionesActivas.find(n => n.id_notificacion === id);
    if (notif) notif.leida = 1;
    updateNotificationBell();
    
    // Actualizar UI del item
    el.classList.remove('unread');
    el.classList.add('read');
    const strong = el.querySelector('strong');
    if (strong) strong.style.color = 'var(--text-muted)';
    const dot = el.querySelector('span');
    if (dot) dot.remove();
    
  } catch (err) {
    console.error("Error al marcar como leída", err);
  }
}

async function solicitarJuego(idJuego, btn) {
  const originalText = btn.innerHTML;
  btn.innerHTML = '<div class="btn-loader"></div>';
  btn.disabled = true;
  
  try {
    await apiFetch('/solicitudes', {
      method: 'POST',
      body: JSON.stringify({ id_juego: idJuego })
    });
    showToast('Solicitud enviada al administrador.');
    btn.innerHTML = 'SOLICITUD PENDIENTE';
    btn.style.background = 'transparent';
    btn.style.border = '1px solid var(--accent-orange)';
    btn.style.color = 'var(--accent-orange)';
  } catch (err) {
    showToast(err.message || 'Error al solicitar el juego', 'error');
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

(function init() {
  if (Auth.isLoggedIn()) {
    initDashboard();
  } else {
    showLogin();
  }
})();
