import { api } from './admin_api.js';
import { showToast, showConfirmModal } from './admin_ui.js';

export async function loadSolicitudes() {
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

export async function aprobarSolicitud(id) {
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

export async function rechazarSolicitud(id) {
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

export async function checkPendingRequests() {
  try {
    const solicitudes = await api('/solicitudes');
    const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
    const badge = document.getElementById('solicitudes-badge');
    if (badge) {
      if (pendientes > 0) {
        badge.textContent = pendientes;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error("Error al revisar solicitudes pendientes:", err);
  }
}
