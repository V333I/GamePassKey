import { api } from './admin_api.js';
import { setAllUsers, setEditingUserId, editingUserId } from './admin_state.js';
import { makeBadge, openModal, closeModal, showToast } from './admin_ui.js';
import { abrirDispositivosUsuario } from './admin_devices.js';

export async function loadUsuarios() {
  const wrap = document.getElementById('usuarios-table-wrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando...</p></div>`;
  try {
    const usuarios = await api('/usuarios');
    setAllUsers(usuarios);
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

export function abrirCambioEstado(id, nombre, estadoActual) {
  setEditingUserId(id);
  document.getElementById('estado-user-nombre').textContent = nombre;
  document.getElementById('estado-nuevo').value = estadoActual;
  openModal('modal-estado-usuario');
}

export async function confirmarCambioEstado() {
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

export async function submitUsuario(e) {
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
