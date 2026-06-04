import { ApiBiblioteca, ApiJuegos, ApiCodigos } from '../api.js';
import { buildGameCard, showToast } from './ui.js';

/**
 * Carga la biblioteca de juegos del usuario logueado, obteniendo primero la lista
 * de juegos adquiridos y luego mapeando la información completa de cada juego.
 * @async
 * @function loadLibrary
 * @returns {Promise<void>}
 */
export async function loadLibrary() {
  const grid    = document.getElementById('games-grid');
  const loading = document.getElementById('library-loading');
  const empty   = document.getElementById('library-empty');

  grid.classList.add('hidden');
  empty.classList.add('hidden');
  loading.style.display = 'flex';

  try {
    // 1. Obtiene las licencias/juegos del usuario
    const items = await ApiBiblioteca.miBiblioteca();

    if (!items.length) {
      empty.classList.remove('hidden');
      return;
    }

    // 2. Obtiene todos los juegos para tener la data completa (título, portada, etc.)
    const todosJuegos = await ApiJuegos.listar('todos');
    const juegosMap = {};
    todosJuegos.forEach(j => { juegosMap[j.id_juego] = j; });

    // 3. Cruza la información y ordena alfabéticamente
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

/**
 * Renderiza una grilla de tarjetas de juego en el contenedor especificado.
 * @param {HTMLElement} container - El elemento contenedor de la grilla.
 * @param {Array<Object>} juegos - Array de objetos de juegos a renderizar.
 */
export function renderGamesGrid(container, juegos) {
  container.innerHTML = '';
  juegos.forEach((j, idx) => container.appendChild(buildGameCard(j, idx, 'library')));
}

/**
 * Filtra los juegos mostrados en la grilla según su estado.
 * @param {string} estado - El estado a filtrar ('todos', 'activo', 'mantenimiento').
 * @param {HTMLElement} [el] - El elemento pestaña clickeado, para darle clase active.
 */
export function filterGames(estado, el) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');

  document.querySelectorAll('#games-grid .game-card').forEach(card => {
    if (estado === 'todos') { card.style.display = ''; return; }
    const cardEstado = card.dataset.estado || 'activo';
    card.style.display = (cardEstado === estado) ? '' : 'none';
  });
}

/**
 * Abre el modal para canjear un código y resetea su estado.
 */
export function openRedeemModal() {
  document.getElementById('modal-redeem').classList.remove('hidden');
  document.getElementById('redeem-error').classList.add('hidden');
  document.getElementById('redeem-codigo').value = '';
}

/**
 * Cierra el modal de canje de códigos.
 */
export function closeRedeemModal() {
  document.getElementById('modal-redeem').classList.add('hidden');
}

/**
 * Procesa el envío del formulario de canje de código.
 * @async
 * @param {Event} event - El evento de envío del formulario.
 */
export async function submitRedeem(event) {
  event.preventDefault();
  const codigo = document.getElementById('redeem-codigo').value.trim();
  
  const errEl = document.getElementById('redeem-error');
  const errMsg = document.getElementById('redeem-error-msg');
  const btn = document.getElementById('btn-redeem');
  const btnText = btn.querySelector('.btn-text');
  const btnLoad = btn.querySelector('.btn-loader');

  // Limpia errores previos y muestra el estado de carga
  errEl.classList.add('hidden');
  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');
  btn.disabled = true;

  try {
    await ApiCodigos.usar({ codigo });
    showToast('¡Código canjeado con éxito! El juego ha sido añadido a tu biblioteca.');
    closeRedeemModal();
    // Refresca la biblioteca tras canjear exitosamente
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
