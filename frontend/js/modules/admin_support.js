import { api } from './admin_api.js';
import { showToast, openModal, closeModal, makeBadge } from './admin_ui.js';

export async function checkOpenTickets() {
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

export async function loadSoporte() {
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

export function resolverTicket(id) {
  document.getElementById('rt-id').value = id;
  document.getElementById('form-resolver-ticket').reset();
  openModal('modal-resolver-ticket');
}

export async function submitResolverTicket(estado) {
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
