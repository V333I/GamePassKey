import { api } from './admin_api.js';

export async function loadLogs() {
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
