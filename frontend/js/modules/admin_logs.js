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
    
    // Obtenemos los logs, pidiendo en bloques de 500 para respetar el límite de validación del backend
    let todosLosLogs = [];
    let skip = 0;
    const limite = 500;
    let hayMas = true;
    
    while (hayMas) {
      const url = `/logs?skip=${skip}&limite=${limite}`;
      const res = await api(url);
      const chunk = res.items || res;
      
      if (!chunk || chunk.length === 0) {
        hayMas = false;
      } else {
        todosLosLogs = todosLosLogs.concat(chunk);
        if (chunk.length < limite) {
          hayMas = false;
        } else {
          skip += limite;
        }
      }
    }
    
    const logs = todosLosLogs;
    
    if (!logs || !logs.length) {
      alert("No hay logs disponibles para exportar.");
      if(btn) btn.disabled = false;
      return;
    }
    
    // =========================================================================
    // HOJA 1: RESUMEN EJECUTIVO (Dashboard)
    // =========================================================================
    const totalLogs = logs.length;
    const loginsExitosos = logs.filter(l => l.accion === 'LOGIN_EXITOSO').length;
    const loginsFallidos = logs.filter(l => l.accion === 'LOGIN_FALLIDO').length;
    const otpEnviados = logs.filter(l => l.accion === 'OTP_ENVIADO').length;
    const codigosCanjeados = logs.filter(l => l.accion === 'CANJEAR_CODIGO').length;
    
    const dashboardData = [
      ["GAMEPASSKEY - REPORTE DE SEGURIDAD Y AUDITORÍA", ""],
      ["Fecha de generación:", new Date().toLocaleString('es')],
      ["", ""],
      ["MÉTRICAS PRINCIPALES", "CANTIDAD"],
      ["Total de Eventos Registrados", totalLogs],
      ["Inicios de Sesión Exitosos", loginsExitosos],
      ["Inicios de Sesión Fallidos", loginsFallidos],
      ["Códigos OTP 2FA Enviados", otpEnviados],
      ["Juegos Canjeados (Licencias)", codigosCanjeados]
    ];
    
    const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardData);
    
    // Estilos Hoja 1
    const titleStyle = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 }, fill: { fgColor: { rgb: "091221" } }, alignment: { horizontal: "center" } };
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "00d4ff" } } };
    const labelStyle = { font: { bold: true, color: { rgb: "333333" } } };
    const valStyle = { font: { bold: true, color: { rgb: "0052cc" } }, alignment: { horizontal: "center" } };
    
    wsDashboard['A1'].s = titleStyle;
    wsDashboard['B1'].s = titleStyle;
    wsDashboard['A2'].s = labelStyle;
    wsDashboard['A4'].s = headerStyle;
    wsDashboard['B4'].s = headerStyle;
    
    // Estilizar las filas de métricas
    for(let r=4; r<=8; r++) {
      const cellA = XLSX.utils.encode_cell({c:0, r:r});
      const cellB = XLSX.utils.encode_cell({c:1, r:r});
      if(wsDashboard[cellA]) wsDashboard[cellA].s = { font: { bold: true }, border: { bottom: { style: "thin", color: { rgb: "DDDDDD" } } } };
      if(wsDashboard[cellB]) wsDashboard[cellB].s = { ...valStyle, border: { bottom: { style: "thin", color: { rgb: "DDDDDD" } } } };
    }
    
    // Combinar celdas A1:B1
    if(!wsDashboard['!merges']) wsDashboard['!merges'] = [];
    wsDashboard['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
    
    wsDashboard['!cols'] = [{ wch: 35 }, { wch: 15 }];
    
    // =========================================================================
    // HOJA 2: LOGS DETALLADOS
    // =========================================================================
    
    // Construir tabla de logs con metadatos arriba
    const logsData = [
      ["REGISTRO DETALLADO DE EVENTOS DEL SISTEMA", "", "", "", "", ""],
      ["", "", "", "", "", ""],
      ["FECHA", "ACCIÓN", "USUARIO ID", "DESCRIPCIÓN", "DIRECCIÓN IP", "NIVEL DE RIESGO"]
    ];
    
    logs.forEach(l => {
      logsData.push([
        new Date(l.fecha_evento).toLocaleString('es'),
        l.accion,
        l.id_usuario ? `#${l.id_usuario}` : 'N/A',
        l.descripcion || '',
        l.ip_origen || '',
        l.nivel.toUpperCase()
      ]);
    });
    
    const wsLogs = XLSX.utils.aoa_to_sheet(logsData);
    
    // Estilos Hoja 2
    wsLogs['A1'].s = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 }, fill: { fgColor: { rgb: "333333" } }, alignment: { horizontal: "center" } };
    wsLogs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    
    const thStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "091221" } }, alignment: { horizontal: "center" }, border: { bottom: { style: "medium", color: { rgb: "00d4ff" } } } };
    const colsCount = 6;
    for(let c=0; c<colsCount; c++) {
      const cell = XLSX.utils.encode_cell({c:c, r:2});
      if(wsLogs[cell]) wsLogs[cell].s = thStyle;
    }
    
    // Colorear niveles de riesgo
    for(let r=3; r<logsData.length; r++) {
      const levelCell = XLSX.utils.encode_cell({c:5, r:r});
      if(wsLogs[levelCell]) {
        let fgColor = "E8F5E9"; // info (light green)
        let fontColor = "2E7D32";
        if(wsLogs[levelCell].v === "ADVERTENCIA") { fgColor = "FFF3E0"; fontColor = "E65100"; }
        else if(wsLogs[levelCell].v === "CRÍTICO") { fgColor = "FFEBEE"; fontColor = "C62828"; }
        
        wsLogs[levelCell].s = { 
          fill: { fgColor: { rgb: fgColor } },
          font: { bold: true, color: { rgb: fontColor } },
          alignment: { horizontal: "center" }
        };
      }
      
      // Bordes sutiles para todas las celdas de la fila
      for(let c=0; c<colsCount; c++) {
        const rowCell = XLSX.utils.encode_cell({c:c, r:r});
        if(wsLogs[rowCell]) {
          wsLogs[rowCell].s = { ...wsLogs[rowCell].s, border: { bottom: { style: "thin", color: { rgb: "EEEEEE" } } } };
        }
      }
    }
    
    wsLogs['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 12 }, { wch: 60 }, { wch: 18 }, { wch: 18 }];
    
    // =========================================================================
    // GENERAR LIBRO Y DESCARGAR
    // =========================================================================
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsDashboard, "Dashboard y Resumen");
    XLSX.utils.book_append_sheet(workbook, wsLogs, "Logs Detallados");
    
    XLSX.writeFile(workbook, `GamePassKey_Seguridad_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    if(btn) btn.disabled = false;
  } catch (err) {
    console.error("Error al exportar logs:", err);
    alert("Hubo un error al exportar los logs: " + err.message);
    const btn = document.querySelector('button[onclick="exportarLogsExcel()"]');
    if(btn) btn.disabled = false;
  }
}

window.loadLogs = loadLogs;
