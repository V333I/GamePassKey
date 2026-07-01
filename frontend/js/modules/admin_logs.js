import { api } from './admin_api.js';

let currentLogPage = 0;
const LOG_PAGE_LIMIT = 100;

/**
 * Carga el registro de eventos (logs) desde la API, con soporte para paginación y filtrado por nivel.
 * @async
 * @param {number} [page=0] - El índice de la página actual.
 * @returns {Promise<void>}
 */
export async function loadLogs(page = 0) {
  currentLogPage = page;
  const wrap = document.getElementById('logs-table-wrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando logs...</p></div>`;
  const nivel = document.getElementById('log-nivel-filter')?.value || '';
  try {
    const skip = page * LOG_PAGE_LIMIT;
    const url = `/logs?skip=${skip}&limite=${LOG_PAGE_LIMIT}${nivel ? `&nivel=${nivel}` : ''}`;
    const res = await api(url);
    const logs = res.items || res; // fallback
    const total = res.total || logs.length;
    
    document.getElementById('stat-logs').textContent = total;
    
    if (!logs.length) {
      wrap.innerHTML = `<div class="empty-state"><h3>Sin logs</h3><p>No hay eventos registrados aún.</p></div>`;
      return;
    }
    
    const totalPages = Math.ceil(total / LOG_PAGE_LIMIT);
    
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
      </table>
      ${totalPages > 1 ? `
        <div class="pagination-controls">
          <button ${page === 0 ? 'disabled' : ''} onclick="loadLogs(${page - 1})">&laquo; Anterior</button>
          <span>Página ${page + 1} de ${totalPages}</span>
          <button ${page >= totalPages - 1 ? 'disabled' : ''} onclick="loadLogs(${page + 1})">Siguiente &raquo;</button>
        </div>
      ` : ''}
    `;
  } catch (err) {
    console.error(err);
    wrap.innerHTML = `<div class="empty-state" style="color:var(--accent-red)"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

/**
 * Exporta todos los logs disponibles a un archivo CSV compatible con Excel.
 */
export async function exportarLogsExcel() {
  try {
    const btn = document.querySelector('button[onclick="exportarLogsExcel()"]');
    if(btn) btn.disabled = true;
    
    // Obtenemos los logs, podemos pedir hasta 10000 para asegurar que bajen todos o la mayoría
    const url = `/logs?skip=0&limite=10000`;
    const res = await api(url);
    const logs = res.items || res;
    
    if (!logs || !logs.length) {
      alert("No hay logs disponibles para exportar.");
      if(btn) btn.disabled = false;
      return;
    }
    
    // BOM para UTF-8 en Excel
    let csvContent = "\uFEFFFecha,Acción,Usuario ID,Descripción,IP,Nivel\n";
    
    logs.forEach(l => {
      const fecha = new Date(l.fecha_evento).toLocaleString('es').replace(/,/g, '');
      const accion = `"${l.accion}"`;
      const userId = l.id_usuario || '';
      const descripcion = `"${(l.descripcion || '').replace(/"/g, '""')}"`;
      const ip = `"${l.ip_origen || ''}"`;
      const nivel = `"${l.nivel}"`;
      
      csvContent += `${fecha},${accion},${userId},${descripcion},${ip},${nivel}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", blobUrl);
    link.setAttribute("download", `GamePassKey_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    
    if(btn) btn.disabled = false;
  } catch (err) {
    console.error("Error al exportar logs:", err);
    alert("Hubo un error al exportar los logs: " + err.message);
    const btn = document.querySelector('button[onclick="exportarLogsExcel()"]');
    if(btn) btn.disabled = false;
  }
}

window.loadLogs = loadLogs;
