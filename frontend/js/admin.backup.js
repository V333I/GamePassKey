/**
 * GamePassKey — Admin Panel Logic
 * Gestión de juegos, usuarios, licencias y logs
 * Nota: API_BASE y Auth ya vienen definidos en api.js
 */

// ── Estado global ─────────────────────────────────────────────────
let allUsers      = [];
let allGames      = [];
let editingUserId = null;

// ── Fetch base ────────────────────────────────────────────────────
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Auth.token()) headers['Authorization'] = `Bearer ${Auth.token()}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    showToast('Sin permisos de administrador. Redirigiendo...', 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
    throw new Error('No autorizado');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let msg = err.detail || `Error ${res.status}`;
    if (Array.isArray(err.detail)) {
      msg = err.detail.map(d => d.msg).join(', ');
    }
    throw new Error(msg);
  }
  return res.json().catch(() => ({}));
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icon = type === 'success'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
}

// ── Modal helpers ─────────────────────────────────────────────────
function openModal(id) { 
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('hidden');
    
    // HACK ULTRA AGRESIVO PARA FORZAR REPINTADO EN NAVEGADORES BUGUEADOS
    m.style.display = 'none';
    void m.offsetHeight;
    m.style.display = 'flex';
    void m.offsetHeight;
    
    requestAnimationFrame(() => {
      m.style.display = ''; // Limpia el estilo inline y deja que CSS tome el control
      m.style.opacity = '1';
    });
  }

  // Lógica de inicialización por modal
  if (id === 'modal-licencia') {
    if (!allUsers.length || !allGames.length) {
      Promise.all([
        api('/usuarios').then(u => allUsers = u),
        api('/juegos?estado=todos').then(g => allGames = g),
      ]).then(populateLicenciaSelects).catch(() => {});
    } else {
      populateLicenciaSelects();
    }
    generarClave();
  }
  if (id === 'modal-juego') {
    const isEdit = !!document.getElementById('juego-id').value;
    if (!isEdit) {
      document.getElementById('modal-juego-title').textContent = 'Nuevo Juego';
      document.getElementById('form-juego').reset();
    }
    document.getElementById('form-juego-error').classList.add('hidden');
  }
  if (id === 'modal-codigo') {
    autoGenerarCodigo();
    document.getElementById('c-expiracion').value = '';
    document.getElementById('form-codigo-error').classList.add('hidden');
    api('/juegos?estado=todos').then(juegos => {
      const sel = document.getElementById('c-juego');
      if (sel) {
        sel.innerHTML = '<option value="">Seleccionar juego...</option>' +
          juegos.map(j => `<option value="${j.id_juego}">Juego #${j.id_juego} - ${j.titulo}</option>`).join('');
      }
    }).catch(() => {});
  }
}
function closeModal(id) { 
  const m = document.getElementById(id);
  if (m) {
    m.style.opacity = '0';
    m.classList.add('hidden');
    m.style.display = 'none';
    void m.offsetHeight;
  }
}
function closeModalOverlay(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

// ── Section switcher ──────────────────────────────────────────────
function switchSection(name, el) {
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  const targetEl = el || document.querySelector(`.sidebar-item[data-section="${name}"]`);
  if (targetEl) targetEl.classList.add('active');
  document.querySelectorAll('.content-section').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const sec = document.getElementById(`section-${name}`);
  if (sec) { sec.classList.remove('hidden'); sec.classList.add('active'); }
  const loaders = { overview: loadOverview, juegos: loadJuegos, usuarios: loadUsuarios, licencias: loadLicencias, codigos: loadCodigos, solicitudes: loadSolicitudes, logs: loadLogs, soporte: loadSoporte };
  if (loaders[name]) loaders[name]();
}

// ── Custom Confirm Modal ─────────────────────────────────────────
function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    let existing = document.getElementById('dynamic-confirm-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dynamic-confirm-modal';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '9999';
    
    overlay.innerHTML = `
      <div class="modal-card modal-form" style="max-width:400px; text-align:center;">
        <div class="modal-form-header" style="justify-content:center; padding-bottom:10px; border-bottom:none;">
          <h2 style="color:var(--text-primary); font-size:1.2rem;">${title}</h2>
        </div>
        <div style="padding:10px 20px 25px;">
          <p style="color:var(--text-secondary); font-size:0.95rem; line-height:1.5;">${message}</p>
        </div>
        <div class="modal-form-actions" style="justify-content:center; gap:16px;">
          <button type="button" class="btn-secondary" id="dyn-btn-cancel">Cancelar</button>
          <button type="button" class="btn-admin-primary" id="dyn-btn-confirm" style="min-width:120px;">
            <span class="btn-text">ACEPTAR</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnConfirm = overlay.querySelector('#dyn-btn-confirm');
    const btnCancel = overlay.querySelector('#dyn-btn-cancel');

    const closeAndResolve = (val) => {
      overlay.remove();
      resolve(val);
    };

    btnConfirm.onclick = () => closeAndResolve(true);
    btnCancel.onclick = () => closeAndResolve(false);
    overlay.onclick = (e) => {
      if (e.target === overlay) closeAndResolve(false);
    };
  });
}

// ── Badge helpers ─────────────────────────────────────────────────
function makeBadge(estado) {
  const map = {
    activo:        'badge-active',
    activa:        'badge-active',
    autorizado:    'badge-active',
    inactivo:      'badge-inactive',
    revocada:      'badge-inactive',
    bloqueado:     'badge-inactive',
    mantenimiento: 'badge-maintenance',
    expirada:      'badge-maintenance',
  };
  return `<span class="badge ${map[estado] || 'badge-inactive'}">${estado?.toUpperCase() || '—'}</span>`;
}

// ══════════════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════════════
async function loadOverview() {
  // Llamadas independientes para que un error no rompa todo
  try {
    const usuarios = await api('/usuarios');
    allUsers = usuarios;
    document.getElementById('stat-usuarios').textContent = usuarios.length;
  } catch (err) {
    document.getElementById('stat-usuarios').textContent = 'ERR';
    console.error('Usuarios:', err.message);
  }

  try {
    const juegos = await api('/juegos?estado=todos');
    allGames = juegos;
    document.getElementById('stat-juegos').textContent = juegos.filter(j => j.estado === 'activo').length;
  } catch (err) {
    document.getElementById('stat-juegos').textContent = 'ERR';
    console.error('Juegos:', err.message);
  }

  try {
    const tickets = await api('/soporte');
    const abiertos = tickets.filter(t => t.estado === 'abierto').length;
    document.getElementById('stat-soporte').textContent = abiertos;
  } catch (err) {
    document.getElementById('stat-soporte').textContent = 'ERR';
    console.error('Soporte:', err.message);
  }

  try {
    const logs = await api('/logs?limite=5');
    document.getElementById('stat-logs').textContent = logs.length;

    const logsEl = document.getElementById('recent-logs');
    if (!logs.length) {
      logsEl.innerHTML = `<p style="padding:20px;color:var(--text-muted);font-size:0.83rem;">Sin eventos recientes.</p>`;
    } else {
      logsEl.innerHTML = logs.map(l => `
        <div class="log-mini-item">
          <span class="log-mini-time">${new Date(l.fecha_evento).toLocaleString('es')}</span>
          <span class="log-mini-action">${l.accion}</span>
          <span class="log-mini-desc">${l.descripcion || '—'}</span>
          <span class="level-badge level-${l.nivel}">${l.nivel}</span>
        </div>`).join('');
    }
  } catch (err) {
    document.getElementById('stat-logs').textContent = 'ERR';
    document.getElementById('recent-logs').innerHTML =
      `<p style="padding:20px;color:var(--accent-red);font-size:0.83rem;">Error logs: ${err.message}</p>`;
    console.error('Logs:', err.message);
  }

  try {
    const licencias = await api('/licencias/mis-licencias');
    document.getElementById('stat-licencias').textContent = licencias.length;
  } catch (err) {
    document.getElementById('stat-licencias').textContent = '—';
    console.error('Licencias:', err.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// JUEGOS
// ══════════════════════════════════════════════════════════════════
async function loadJuegos() {
  const wrap = document.getElementById('juegos-table-wrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando...</p></div>`;
  try {
    const juegos = await api('/juegos?estado=todos');
    allGames = juegos;
    if (!juegos.length) {
      wrap.innerHTML = `<div class="empty-state"><h3>Sin juegos</h3><p>Agrega el primer juego con el botón "Nuevo Juego".</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>ID</th><th>Título</th><th>Género</th><th>Desarrollador</th><th>Versión</th><th>Lanzamiento</th><th>Estado</th><th>Acciones</th>
        </tr></thead>
        <tbody>${juegos.map(j => `
          <tr>
            <td><span style="font-family:var(--font-mono);color:var(--text-muted)">#${j.id_juego}</span></td>
            <td><strong>${j.titulo}</strong></td>
            <td style="color:var(--text-secondary)">${j.genero || '—'}</td>
            <td style="color:var(--text-secondary)">${j.desarrollador || '—'}</td>
            <td><span style="font-family:var(--font-mono);font-size:0.75rem">${j.version_actual || '—'}</span></td>
            <td style="color:var(--text-secondary)">${j.fecha_lanzamiento || '—'}</td>
            <td>${makeBadge(j.estado)}</td>
            <td><div class="table-actions">
              <button class="btn-icon" title="Editar" onclick="editJuego(${j.id_juego})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button type="button" class="btn-icon danger" style="margin-left: 10px;" title="Eliminar" onclick="event.preventDefault(); event.stopPropagation(); eliminarJuego(${j.id_juego})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function editJuego(id) {
  const j = allGames.find(g => g.id_juego === id);
  if (!j) return;
  // Llenar el formulario con los datos actuales del juego
  document.getElementById('juego-id').value        = j.id_juego;
  document.getElementById('j-titulo').value         = j.titulo || '';
  document.getElementById('j-genero').value         = j.genero || '';
  document.getElementById('j-desarrollador').value  = j.desarrollador || '';
  document.getElementById('j-version').value        = j.version_actual || '';
  document.getElementById('j-fecha').value          = j.fecha_lanzamiento || '';
  document.getElementById('j-estado').value         = j.estado || 'activo';
  document.getElementById('j-descripcion').value    = j.descripcion || '';
  document.getElementById('j-ruta').value           = j.ruta_instalador || '';
  document.getElementById('modal-juego-title').textContent = 'Editar Juego: ' + j.titulo;
  document.getElementById('form-juego-error').classList.add('hidden');
  // Abrir directamente sin pasar por el override que resetea el form
  document.getElementById('modal-juego').classList.remove('hidden');
}

async function submitJuego(e) {
  e.preventDefault();
  const id      = document.getElementById('juego-id').value;
  const errEl   = document.getElementById('form-juego-error');
  const errMsg  = document.getElementById('form-juego-error-msg');
  const btnText = document.querySelector('#btn-submit-juego .btn-text');
  const btnLoad = document.querySelector('#btn-submit-juego .btn-loader');

  errEl.classList.add('hidden');
  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');

  const payload = {
    titulo:          document.getElementById('j-titulo').value.trim(),
    genero:          document.getElementById('j-genero').value.trim() || null,
    desarrollador:   document.getElementById('j-desarrollador').value.trim() || null,
    version_actual:  document.getElementById('j-version').value.trim() || null,
    fecha_lanzamiento: document.getElementById('j-fecha').value || null,
    estado:          document.getElementById('j-estado').value,
    descripcion:     document.getElementById('j-descripcion').value.trim() || null,
    ruta_instalador: document.getElementById('j-ruta').value.trim() || null,
  };

  try {
    const fileInput = document.getElementById('j-caratula');
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${API_BASE}/juegos/upload-cover`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Auth.token()}` },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.detail || 'Error al subir la carátula');
      }
      const data = await res.json();
      payload.imagen_portada = data.imagen_portada;
    }

    if (id) {
      await api(`/juegos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast(`Juego actualizado correctamente.`);
    } else {
      await api('/juegos', { method: 'POST', body: JSON.stringify(payload) });
      showToast(`Juego "${payload.titulo}" creado.`);
    }
    closeModal('modal-juego');
    document.getElementById('juego-id').value = '';
    document.getElementById('modal-juego-title').textContent = 'Nuevo Juego';
    document.getElementById('form-juego').reset();
    loadJuegos();
  } catch (err) {
    errMsg.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
  }
}

async function eliminarJuego(id) {
  const j = allGames.find(g => g.id_juego === id);
  if(!j) return;
  const titulo = j.titulo;
  const confirmed = await showConfirmModal('Eliminar Juego', `¿Eliminar completamente "${titulo}"? Se perderán las licencias y datos asociados.`);
  if (!confirmed) return;
  try {
    await api(`/juegos/${id}`, { method: 'DELETE' });
    showToast(`Juego "${titulo}" eliminado.`);
    loadJuegos();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════════
// USUARIOS
// ══════════════════════════════════════════════════════════════════
async function loadUsuarios() {
  const wrap = document.getElementById('usuarios-table-wrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando...</p></div>`;
  try {
    const usuarios = await api('/usuarios');
    allUsers = usuarios;
    wrap.innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>ID</th><th>Nombre</th><th>Correo</th><th>Rol ID</th><th>Estado</th><th>Último acceso</th><th>Acciones</th>
        </tr></thead>
        <tbody>${usuarios.map(u => `
          <tr>
            <td><span style="font-family:var(--font-mono);color:var(--text-muted)">#${u.id_usuario}</span></td>
            <td><strong>${u.nombre_usuario}</strong></td>
            <td style="font-size:0.8rem;color:var(--text-secondary)">${u.correo}</td>
            <td><span style="font-family:var(--font-mono)">${u.id_rol}</span></td>
            <td>${makeBadge(u.estado)}</td>
            <td style="color:var(--text-muted);font-size:0.78rem">${u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es') : '-'}</td>
            <td><div class="table-actions">
              <button class="btn-icon" style="color:#00d4ff;" title="Ver Dispositivos" onclick="abrirDispositivosUsuario(${u.id_usuario}, '${u.nombre_usuario}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </button>
              <button class="btn-icon warning" title="Cambiar estado" onclick="abrirCambioEstado(${u.id_usuario}, '${u.nombre_usuario}', '${u.estado}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
              </button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function abrirCambioEstado(id, nombre, estadoActual) {
  editingUserId = id;
  document.getElementById('estado-user-nombre').textContent = nombre;
  document.getElementById('estado-nuevo').value = estadoActual;
  openModal('modal-estado-usuario');
}

// ── Gestión de Dispositivos del Admin ───────────────────────────────────────
async function abrirDispositivosUsuario(id_usuario, nombre_usuario) {
  document.getElementById('modal-dispositivos-title').textContent = `Dispositivos de ${nombre_usuario}`;
  const content = document.getElementById('admin-dispositivos-content');
  content.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando dispositivos...</p></div>`;
  openModal('modal-admin-dispositivos');

  try {
    const dispositivos = await api(`/dispositivos/usuario/${id_usuario}`);
    if (!dispositivos.length) {
      content.innerHTML = `<div class="empty-state"><h3>Sin dispositivos</h3><p>Este usuario no tiene ordenadores registrados activos.</p></div>`;
      return;
    }

    content.innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>Nombre</th><th>Sistema Operativo</th><th>Hardware ID</th><th>Último Uso</th><th>Acciones</th>
        </tr></thead>
        <tbody>${dispositivos.map(d => `
          <tr>
            <td><strong>${d.nombre_dispositivo}</strong></td>
            <td style="font-size:0.8rem;color:var(--text-secondary)">${d.sistema_operativo}</td>
            <td><span style="font-family:var(--font-mono);color:var(--text-muted);font-size:0.8rem;">${d.hardware_id}</span></td>
            <td style="color:var(--text-muted);font-size:0.78rem">${d.ultimo_uso ? new Date(d.ultimo_uso).toLocaleString('es') : '-'}</td>
            <td>
              <button class="btn-primary" style="background:#ff3355; border-color:#ff3355; padding: 6px 12px; font-size:0.8rem;" 
                      onclick="desvincularDispositivo(${d.id_dispositivo}, ${id_usuario}, '${nombre_usuario}')">
                Desvincular
              </button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

async function desvincularDispositivo(id_dispositivo, id_usuario, nombre_usuario) {
  const confirmed = await showConfirmModal(
    'Desvincular Dispositivo', 
    '¿Estás seguro de desvincular este dispositivo? El usuario tendrá que volver a registrar un PC para jugar.'
  );
  if (!confirmed) return;
  
  try {
    await api(`/dispositivos/${id_dispositivo}/estado`, { 
      method: 'PUT', 
      body: JSON.stringify({ estado: 'eliminado' }) 
    });
    showToast('Dispositivo desvinculado con éxito.');
    abrirDispositivosUsuario(id_usuario, nombre_usuario); // Recargar la tabla
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmarCambioEstado() {
  const nuevoEstado = document.getElementById('estado-nuevo').value;
  try {
    await api(`/usuarios/${editingUserId}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    showToast(`Estado actualizado a: ${nuevoEstado}`);
    closeModal('modal-estado-usuario');
    loadUsuarios();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitUsuario(e) {
  e.preventDefault();
  const errEl  = document.getElementById('form-usuario-error');
  const errMsg = document.getElementById('form-usuario-error-msg');
  errEl.classList.add('hidden');

  const payload = {
    nombre_usuario: document.getElementById('u-nombre').value.trim(),
    correo:         document.getElementById('u-correo').value.trim(),
    password:       document.getElementById('u-password').value,
    id_rol:         parseInt(document.getElementById('u-rol').value),
  };

  try {
    await api('/usuarios', { method: 'POST', body: JSON.stringify(payload) });
    showToast(`Usuario "${payload.nombre_usuario}" creado.`);
    closeModal('modal-usuario');
    document.getElementById('form-usuario').reset();
    loadUsuarios();
  } catch (err) {
    errMsg.textContent = err.message;
    
    // Hack de repintado para el mensaje de error
    errEl.classList.remove('hidden');
    errEl.style.display = 'none';
    void errEl.offsetHeight;
    errEl.style.display = 'block';
    void errEl.offsetHeight;
    
    requestAnimationFrame(() => {
      errEl.style.display = ''; 
    });
  }
}

// ══════════════════════════════════════════════════════════════════
// LICENCIAS
// ══════════════════════════════════════════════════════════════════
async function loadLicencias() {
  const wrap = document.getElementById('licencias-table-wrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando...</p></div>`;

  // Necesitamos todos los usuarios para mostrar los nombres
  try {
    if (!allUsers.length) allUsers = await api('/usuarios');
    if (!allGames.length) allGames = await api('/juegos?estado=todos');

    // Recolectar licencias de todos los usuarios
    const licenciasPromises = allUsers.map(u =>
      api(`/licencias/mis-licencias`).catch(() => [])
    );

    // Obtener licencias del admin (todas si es admin)
    const misLicencias = await api('/licencias/mis-licencias').catch(() => []);

    const usersMap = {};
    allUsers.forEach(u => { usersMap[u.id_usuario] = u; });
    const gamesMap = {};
    allGames.forEach(g => { gamesMap[g.id_juego] = g; });

    if (!misLicencias.length) {
      wrap.innerHTML = `<div class="empty-state"><h3>Sin licencias</h3><p>Crea la primera licencia con el botón "Nueva Licencia".</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>ID</th><th>Clave</th><th>Usuario ID</th><th>Juego</th><th>Estado</th><th>Expira</th><th>Acciones</th>
        </tr></thead>
        <tbody>${misLicencias.map(l => `
          <tr>
            <td><span style="font-family:var(--font-mono);color:var(--text-muted)">#${l.id_licencia}</span></td>
            <td><span style="font-family:var(--font-mono);font-size:0.75rem">${l.clave_licencia}</span></td>
            <td><span style="font-family:var(--font-mono)">#${l.id_usuario}</span></td>
            <td>${gamesMap[l.id_juego]?.titulo || `Juego #${l.id_juego}`}</td>
            <td>${makeBadge(l.estado)}</td>
            <td style="color:var(--text-muted);font-size:0.78rem">${l.fecha_expiracion ? new Date(l.fecha_expiracion).toLocaleDateString('es') : '—'}</td>
            <td><div class="table-actions">
              ${l.estado === 'activa' ? `
              <button class="btn-icon danger" title="Revocar" onclick="revocarLicencia(${l.id_licencia})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </button>` : '<span style="color:var(--text-muted);font-size:0.75rem">—</span>'}
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

async function revocarLicencia(id) {
  const confirmed = await showConfirmModal('Revocar Licencia', '¿Revocar esta licencia? El usuario perderá acceso al juego.');
  if (!confirmed) return;
  try {
    await api(`/licencias/${id}/revocar`, { method: 'PUT' });
    showToast('Licencia revocada.');
    loadLicencias();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function generarClave() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({length: 4}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  document.getElementById('l-clave').value = `GPK-${seg()}-${seg()}-${seg()}`;
}

async function submitLicencia(e) {
  e.preventDefault();
  const errEl  = document.getElementById('form-licencia-error');
  const errMsg = document.getElementById('form-licencia-error-msg');
  errEl.classList.add('hidden');

  const exp = document.getElementById('l-expiracion').value;
  const payload = {
    id_usuario:      parseInt(document.getElementById('l-usuario').value),
    id_juego:        parseInt(document.getElementById('l-juego').value),
    clave_licencia:  document.getElementById('l-clave').value.trim(),
    fecha_expiracion: exp ? new Date(exp).toISOString() : null,
  };

  try {
    await api('/licencias', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Licencia creada correctamente.');
    closeModal('modal-licencia');
    document.getElementById('form-licencia').reset();
    loadLicencias();
  } catch (err) {
    errMsg.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

// Poblar selects del modal de licencia
function populateLicenciaSelects() {
  const userSel = document.getElementById('l-usuario');
  const gameSel = document.getElementById('l-juego');
  userSel.innerHTML = '<option value="">Seleccionar usuario...</option>' +
    allUsers.map(u => `<option value="${u.id_usuario}">${u.nombre_usuario} (${u.correo})</option>`).join('');
  gameSel.innerHTML = '<option value="">Seleccionar juego...</option>' +
    allGames.filter(g => g.estado === 'activo').map(g => `<option value="${g.id_juego}">${g.titulo}</option>`).join('');
}

// ══════════════════════════════════════════════════════════════════
// CÓDIGOS DE USO ÚNICO
// ══════════════════════════════════════════════════════════════════
function autoGenerarCodigo() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({length:4}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  const code = `GPK-${seg()}-${seg()}-${seg()}`;
  document.getElementById('c-codigo').value = code;
  document.getElementById('codigo-preview-text').textContent = code;
}

function copiarCodigo() {
  const code = document.getElementById('codigo-preview-text').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Código copiado al portapapeles');
  }).catch(() => {
    showToast('No se pudo copiar automáticamente', 'error');
  });
}

async function loadCodigos() {
  const wrap  = document.getElementById('codigos-table-wrap');
  const estado = document.getElementById('codigos-estado-filter')?.value || '';
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando códigos...</p></div>`;

  try {
    const url = `/codigos/${estado ? `?estado=${estado}` : ''}`;
    const codigos = await api(url);

    // Actualizar stats
    const total      = codigos.length;
    const disponible = codigos.filter(c => c.estado === 'disponible').length;
    const usado      = codigos.filter(c => c.estado === 'usado').length;
    const expirado   = codigos.filter(c => c.estado === 'expirado').length;
    document.getElementById('cs-total').textContent      = total;
    document.getElementById('cs-disponibles').textContent = disponible;
    document.getElementById('cs-usados').textContent      = usado;
    document.getElementById('cs-expirados').textContent   = expirado;

    if (!codigos.length) {
      wrap.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>
        <h3>Sin códigos</h3>
        <p>Genera el primer código con el botón "Generar Código".</p></div>`;
      return;
    }

    const estadoBadge = (e) => {
      const map = { disponible: 'codigo-disponible', usado: 'codigo-usado', expirado: 'codigo-expirado' };
      return `<span class="badge ${map[e] || ''} level-badge">${e?.toUpperCase()}</span>`;
    };

    wrap.innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>ID</th>
          <th>Código</th>
          <th>Licencia</th>
          <th>Estado</th>
          <th>Generado</th>
          <th>Expira</th>
          <th>Usado</th>
          <th>Acciones</th>
        </tr></thead>
        <tbody>${codigos.map(c => `
          <tr>
            <td><span style="font-family:var(--font-mono);color:var(--text-muted)">#${c.id_codigo}</span></td>
            <td>
              <span style="font-family:var(--font-mono);font-size:0.8rem;letter-spacing:0.08em;color:var(--accent-cyan)">${c.codigo}</span>
            </td>
            <td><span style="font-family:var(--font-mono)">#${c.id_licencia}</span></td>
            <td>${estadoBadge(c.estado)}</td>
            <td style="color:var(--text-muted);font-size:0.75rem">${new Date(c.fecha_generacion).toLocaleString('es')}</td>
            <td style="color:var(--text-muted);font-size:0.75rem">${new Date(c.fecha_expiracion).toLocaleString('es')}</td>
            <td style="color:var(--text-muted);font-size:0.75rem">${c.fecha_uso ? new Date(c.fecha_uso).toLocaleString('es') : '—'}</td>
            <td><div class="table-actions">
              <button class="btn-icon" title="Copiar código" onclick="navigator.clipboard.writeText('${c.codigo}').then(()=>showToast('Código copiado'))">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    console.error('Códigos:', err.message);
  }
}

async function submitCodigo(e) {
  e.preventDefault();
  const errEl  = document.getElementById('form-codigo-error');
  const errMsg = document.getElementById('form-codigo-error-msg');
  const btnText = document.querySelector('#btn-submit-codigo .btn-text');
  const btnLoad = document.querySelector('#btn-submit-codigo .btn-loader');
  errEl.classList.add('hidden');

  const codigo    = document.getElementById('c-codigo').value.trim();
  const idJuego = parseInt(document.getElementById('c-juego').value);
  const expiracion = document.getElementById('c-expiracion').value;

  if (!codigo) { errMsg.textContent = 'El código no puede estar vacío.'; errEl.classList.remove('hidden'); return; }
  if (!idJuego) { errMsg.textContent = 'Selecciona un juego.'; errEl.classList.remove('hidden'); return; }
  if (!expiracion) { errMsg.textContent = 'La fecha de expiración es obligatoria.'; errEl.classList.remove('hidden'); return; }

  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');

  try {
    // 1. Crear una licencia asignada al admin para este juego
    const nuevaLicencia = await api('/licencias', {
      method: 'POST',
      body: JSON.stringify({
        id_usuario: Auth.user().id_usuario, // Asignada al admin temporalmente
        id_juego: idJuego,
        clave_licencia: codigo, // Usamos el código generado como clave interna
        fecha_expiracion: new Date(expiracion).toISOString()
      })
    });

    // 2. Generar el código de uso único vinculado a esta licencia
    await api('/codigos/generar', {
      method: 'POST',
      body: JSON.stringify({
        codigo: codigo,
        id_licencia: nuevaLicencia.id_licencia,
        fecha_expiracion: new Date(expiracion).toISOString(),
      }),
    });
    showToast(`Código "${codigo}" generado correctamente.`);
    closeModal('modal-codigo');
    document.getElementById('form-codigo').reset();
    document.getElementById('codigo-preview-text').textContent = 'XXXX-XXXX-XXXX-XXXX';
    loadCodigos();
  } catch (err) {
    errMsg.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
  }
}


// ══════════════════════════════════════════════════════════════════
// LOGS
// ══════════════════════════════════════════════════════════════════
async function loadLogs() {
  const wrap = document.getElementById('logs-table-wrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando logs...</p></div>`;
  const nivel = document.getElementById('log-nivel-filter')?.value || '';
  try {
    const url = `/logs?limite=100${nivel ? `&nivel=${nivel}` : ''}`;
    const logs = await api(url);
    document.getElementById('stat-logs').textContent = logs.length;
    if (!logs.length) {
      wrap.innerHTML = `<div class="empty-state"><h3>Sin logs</h3><p>No hay eventos registrados aún.</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>Fecha</th><th>Acción</th><th>Usuario ID</th><th>Descripción</th><th>IP</th><th>Nivel</th>
        </tr></thead>
        <tbody>${logs.map(l => `
          <tr class="log-row-${l.nivel}">
            <td><span style="font-family:var(--font-mono);font-size:0.72rem">${new Date(l.fecha_evento).toLocaleString('es')}</span></td>
            <td><strong>${l.accion}</strong></td>
            <td><span style="font-family:var(--font-mono);color:var(--text-muted)">${l.id_usuario ? `#${l.id_usuario}` : '—'}</span></td>
            <td style="color:var(--text-secondary);font-size:0.8rem">${l.descripcion || '—'}</td>
            <td><span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted)">${l.ip_origen || '—'}</span></td>
            <td><span class="level-badge level-${l.nivel}">${l.nivel}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

// ══════════════════════════════════════════════════════════════════
// SOLICITUDES DE ACTIVACIÓN
// ══════════════════════════════════════════════════════════════════

async function loadSolicitudes() {
  const wrap = document.getElementById('solicitudes-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando solicitudes...</p></div>`;
  
  try {
    const sol = await api('/solicitudes');
    if (!sol.length) {
      wrap.innerHTML = `<div class="empty-state"><h3>Sin solicitudes</h3><p>No hay peticiones de acceso pendientes.</p></div>`;
      return;
    }
    
    wrap.innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>ID</th><th>Usuario</th><th>Juego</th><th>Fecha</th><th>Estado</th><th>Acciones</th>
        </tr></thead>
        <tbody>${sol.map(s => `
          <tr>
            <td>#${s.id_solicitud}</td>
            <td><strong>${s.nombre_usuario}</strong><br><small style="color:var(--text-muted)">${s.correo}</small></td>
            <td><strong>${s.titulo_juego}</strong></td>
            <td>${new Date(s.fecha_solicitud).toLocaleString('es')}</td>
            <td>
              <span class="badge ${s.estado === 'pendiente' ? 'badge-maintenance' : s.estado === 'aprobada' ? 'badge-active' : 'badge-inactive'}">${s.estado.toUpperCase()}</span>
            </td>
            <td>
              ${s.estado === 'pendiente' ? `
                <div class="action-buttons">
                  <button class="btn-icon" onclick="aprobarSolicitud(${s.id_solicitud})" title="Aprobar y Generar Código">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </button>
                  <button class="btn-icon" onclick="rechazarSolicitud(${s.id_solicitud})" title="Rechazar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              ` : '—'}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

async function aprobarSolicitud(id) {
  const confirmed = await showConfirmModal('Aprobar Solicitud', '¿Seguro que quieres aprobar esta solicitud? Se generará un código y se enviará al usuario.');
  if (!confirmed) return;
  try {
    await api(`/solicitudes/${id}/aprobar`, { method: 'PUT' });
    showToast('Solicitud aprobada correctamente.');
    loadSolicitudes();
  } catch (err) {
    showToast(err.message || 'Error al aprobar solicitud.', 'error');
  }
}

async function rechazarSolicitud(id) {
  const confirmed = await showConfirmModal('Rechazar Solicitud', '¿Seguro que quieres rechazar esta solicitud?');
  if (!confirmed) return;
  try {
    await api(`/solicitudes/${id}/rechazar`, { method: 'PUT' });
    showToast('Solicitud rechazada.', 'error');
    loadSolicitudes();
  } catch (err) {
    showToast(err.message || 'Error al rechazar solicitud.', 'error');
  }
}

// ── SOPORTE ────────────────────────────────────────────────────────────────
async function checkOpenTickets() {
  try {
    const tickets = await api('/soporte');
    const abiertos = tickets.filter(t => t.estado === 'abierto').length;
    const badge = document.getElementById('soporte-badge');
    if (badge) {
      if (abiertos > 0) {
        badge.textContent = abiertos;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (e) {
    console.error('Error checking tickets:', e);
  }
}

async function loadSoporte() {
  const wrap = document.getElementById('soporte-table-wrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando tickets...</p></div>`;
  try {
    const tickets = await api('/soporte');
    if (!tickets.length) {
      wrap.innerHTML = `<div class="empty-state" style="padding:40px;"><svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" fill="none" stroke-width="1.5" style="opacity:0.5;margin-bottom:20px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><h3>No hay tickets</h3><p>La bandeja de soporte está vacía.</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>ID</th><th>Usuario / Correo</th><th>Asunto</th><th>Mensaje</th><th>Estado</th><th>Fecha</th><th>Acciones</th>
        </tr></thead>
        <tbody>${tickets.map(t => `
          <tr>
            <td><span style="font-family:var(--font-mono);color:var(--text-muted)">#${t.id_ticket}</span></td>
            <td><strong>${t.nombre_usuario || 'Usuario'}</strong><br><span style="font-size:0.8rem;color:var(--text-secondary)">${t.correo_usuario || ''}</span></td>
            <td><strong>${t.asunto}</strong></td>
            <td style="max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${t.mensaje}">${t.mensaje}</td>
            <td>${makeBadge(t.estado)}</td>
            <td style="color:var(--text-muted);font-size:0.78rem">${new Date(t.fecha_creacion).toLocaleString('es')}</td>
            <td><div class="table-actions">
              ${t.estado === 'abierto' ? `
              <button class="btn-primary" style="background:#10b981; border-color:#10b981; padding:6px 10px; font-size:0.8rem;" onclick="resolverTicket(${t.id_ticket})">
                Marcar Resuelto
              </button>` : `<span style="font-size:0.8rem; color:var(--text-muted);">Cerrado</span>`}
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function resolverTicket(id) {
  document.getElementById('rt-id').value = id;
  document.getElementById('form-resolver-ticket').reset();
  openModal('modal-resolver-ticket');
}

async function submitResolverTicket(estado) {
  const id = document.getElementById('rt-id').value;
  const respuesta = document.getElementById('rt-respuesta').value.trim();

  try {
    await api(`/soporte/${id}/resolver`, { 
      method: 'PUT',
      body: JSON.stringify({ estado: estado, respuesta_admin: respuesta })
    });
    showToast(`Ticket marcado como ${estado}.`);
    closeModal('modal-resolver-ticket');
    loadSoporte();
    checkOpenTickets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Logout ────────────────────────────────────────────────────────
function logout() {
  Auth.clear();
  window.location.href = 'index.html';
}

// ── Init ──────────────────────────────────────────────────────────
(function init() {
  if (!Auth.token()) {
    window.location.href = 'index.html';
    return;
  }
  const user = Auth.user();
  if (user) document.getElementById('nav-username').textContent = user.nombre_usuario;
  loadOverview();
  
  // Soporte notificaciones en tiempo real (cada 30 seg)
  checkOpenTickets();
  setInterval(checkOpenTickets, 30000);
})();
