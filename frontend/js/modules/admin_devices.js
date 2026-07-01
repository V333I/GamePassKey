import { api } from './admin_api.js';
import { openModal, showConfirmModal, showToast } from './admin_ui.js';

/**
 * Función: abrirDispositivosUsuario.
 * (Documentación autogenerada)
 * @function abrirDispositivosUsuario
 */
export async function abrirDispositivosUsuario(id_usuario, nombre_usuario) {
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

/**
 * Función: desvincularDispositivo.
 * (Documentación autogenerada)
 * @function desvincularDispositivo
 */
export async function desvincularDispositivo(id_dispositivo, id_usuario, nombre_usuario) {
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
    abrirDispositivosUsuario(id_usuario, nombre_usuario);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
