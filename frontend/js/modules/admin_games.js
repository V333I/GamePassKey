import { Auth, API_BASE } from './api.js';
import { api } from './admin_api.js';
import { allGames, setAllGames } from './admin_state.js';
import { makeBadge, showConfirmModal, showToast, closeModal } from './admin_ui.js';

export async function loadJuegos() {
  const wrap = document.getElementById('juegos-table-wrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando...</p></div>`;
  try {
    const juegos = await api('/juegos?estado=todos');
    setAllGames(juegos);
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

export function editJuego(id) {
  const j = allGames.find(g => g.id_juego === id);
  if (!j) return;
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
  document.getElementById('modal-juego').classList.remove('hidden');
}

export async function submitJuego(e) {
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

export async function eliminarJuego(id) {
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
