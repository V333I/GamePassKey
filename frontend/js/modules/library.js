import { ApiBiblioteca, ApiJuegos, ApiCodigos } from '../api.js';
import { buildGameCard, showToast } from './ui.js';

export async function loadLibrary() {
  const grid    = document.getElementById('games-grid');
  const loading = document.getElementById('library-loading');
  const empty   = document.getElementById('library-empty');

  grid.classList.add('hidden');
  empty.classList.add('hidden');
  loading.style.display = 'flex';

  try {
    const items = await ApiBiblioteca.miBiblioteca();

    if (!items.length) {
      empty.classList.remove('hidden');
      return;
    }

    const todosJuegos = await ApiJuegos.listar('todos');
    const juegosMap = {};
    todosJuegos.forEach(j => { juegosMap[j.id_juego] = j; });

    const juegos = items.map(b => juegosMap[b.id_juego])
                        .filter(Boolean)
                        .sort((a, b) => a.titulo.localeCompare(b.titulo));
    
    renderGamesGrid(grid, juegos);

    if (!grid.children.length) {
      empty.classList.remove('hidden');
    } else {
      grid.classList.remove('hidden');
    }
  } catch (err) {
    showToast(err.message || 'Error cargando biblioteca', 'error');
    empty.classList.remove('hidden');
  } finally {
    loading.style.display = 'none';
  }
}

export function renderGamesGrid(container, juegos) {
  container.innerHTML = '';
  juegos.forEach((j, idx) => container.appendChild(buildGameCard(j, idx, 'library')));
}

export function filterGames(estado, el) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');

  document.querySelectorAll('#games-grid .game-card').forEach(card => {
    if (estado === 'todos') { card.style.display = ''; return; }
    const cardEstado = card.dataset.estado || 'activo';
    card.style.display = (cardEstado === estado) ? '' : 'none';
  });
}

export function openRedeemModal() {
  document.getElementById('modal-redeem').classList.remove('hidden');
  document.getElementById('redeem-error').classList.add('hidden');
  document.getElementById('redeem-codigo').value = '';
}

export function closeRedeemModal() {
  document.getElementById('modal-redeem').classList.add('hidden');
}

export async function submitRedeem(event) {
  event.preventDefault();
  const codigo = document.getElementById('redeem-codigo').value.trim();
  
  const errEl = document.getElementById('redeem-error');
  const errMsg = document.getElementById('redeem-error-msg');
  const btn = document.getElementById('btn-redeem');
  const btnText = btn.querySelector('.btn-text');
  const btnLoad = btn.querySelector('.btn-loader');

  errEl.classList.add('hidden');
  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');
  btn.disabled = true;

  try {
    await ApiCodigos.usar({ codigo });
    showToast('¡Código canjeado con éxito! El juego ha sido añadido a tu biblioteca.');
    closeRedeemModal();
    loadLibrary();
  } catch (err) {
    errMsg.textContent = err.message || 'Error al canjear el código.';
    errEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
    btn.disabled = false;
  }
}
