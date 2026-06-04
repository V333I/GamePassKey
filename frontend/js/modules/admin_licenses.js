import { api } from './admin_api.js';
import { allUsers, allGames, setAllUsers, setAllGames } from './admin_state.js';
import { showToast, showConfirmModal, closeModal, makeBadge } from './admin_ui.js';

/**
 * Carga la tabla de licencias desde la API y mapea los nombres de usuarios y juegos.
 * @async
 * @returns {Promise<void>}
 */
export async function loadLicencias() {
  const wrap = document.getElementById('licencias-table-wrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando...</p></div>`;

  try {
    if (!allUsers.length) {
      const uRes = await api('/usuarios?limit=500');
      setAllUsers(uRes.items || uRes);
    }
    if (!allGames.length) setAllGames(await api('/juegos?estado=todos'));

    const misLicencias = await api('/licencias').catch(() => []);

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

/**
 * Solicita confirmación y revoca una licencia específica.
 * @async
 * @param {number} id - El ID de la licencia a revocar.
 * @returns {Promise<void>}
 */
export async function revocarLicencia(id) {
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

/**
 * Genera aleatoriamente una clave de licencia en formato GPK-XXXX-XXXX-XXXX y
 * la coloca en el campo correspondiente del formulario de creación.
 */
export function generarClave() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({length: 4}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  document.getElementById('l-clave').value = `GPK-${seg()}-${seg()}-${seg()}`;
}

/**
 * Procesa el envío del formulario para crear una nueva licencia y la asocia a un usuario y juego.
 * @async
 * @param {Event} e - Evento de envío del formulario.
 * @returns {Promise<void>}
 */
export async function submitLicencia(e) {
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

/**
 * Llena los menús desplegables (selects) de usuarios y juegos en el modal de creación de licencias.
 * Muestra solo juegos activos.
 */
export function populateLicenciaSelects() {
  const userSel = document.getElementById('l-usuario');
  const gameSel = document.getElementById('l-juego');
  userSel.innerHTML = '<option value="">Seleccionar usuario...</option>' +
    allUsers.map(u => `<option value="${u.id_usuario}">${u.nombre_usuario} (${u.correo})</option>`).join('');
  gameSel.innerHTML = '<option value="">Seleccionar juego...</option>' +
    allGames.filter(g => g.estado === 'activo').map(g => `<option value="${g.id_juego}">${g.titulo}</option>`).join('');
}
