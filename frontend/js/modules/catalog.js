import { ApiJuegos, apiFetch } from '../api.js';
import { buildGameCard, showToast } from './ui.js';

export async function loadCatalog() {
  const grid    = document.getElementById('catalog-grid');
  const loading = document.getElementById('catalog-loading');

  grid.innerHTML = '';
  loading.style.display = 'flex';

  try {
    const juegos = await ApiJuegos.listar('todos');
    juegos.forEach((j, idx) => grid.appendChild(buildGameCard(j, idx, 'catalog')));
    if (!juegos.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted);">No hay juegos en el catálogo aún.</div>`;
    }
  } catch (err) {
    showToast(err.message || 'Error cargando catálogo', 'error');
  } finally {
    loading.style.display = 'none';
  }
}

export async function solicitarJuego(idJuego, btn) {
  const originalText = btn.innerHTML;
  btn.innerHTML = '<div class="btn-loader"></div>';
  btn.disabled = true;
  
  try {
    await apiFetch('/solicitudes', {
      method: 'POST',
      body: JSON.stringify({ id_juego: idJuego })
    });
    showToast('Solicitud enviada al administrador.');
    btn.innerHTML = 'SOLICITUD PENDIENTE';
    btn.style.background = 'transparent';
    btn.style.border = '1px solid var(--accent-orange)';
    btn.style.color = 'var(--accent-orange)';
  } catch (err) {
    showToast(err.message || 'Error al solicitar el juego', 'error');
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}
