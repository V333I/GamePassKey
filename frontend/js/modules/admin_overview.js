import { api } from './admin_api.js';
import { setAllUsers, setAllGames } from './admin_state.js';

export async function loadOverview() {
  try {
    const usuarios = await api('/usuarios');
    setAllUsers(usuarios);
    document.getElementById('stat-usuarios').textContent = usuarios.length;
  } catch (err) {
    document.getElementById('stat-usuarios').textContent = 'ERR';
    console.error('Usuarios:', err.message);
  }

  try {
    const juegos = await api('/juegos?estado=todos');
    setAllGames(juegos);
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
