import { ApiBiblioteca, ApiJuegos } from '../api.js';
import { solicitarJuego } from './catalog.js';
import { loadLibrary } from './library.js';
import { loadCatalog } from './catalog.js';
import { loadLicenses } from './licenses.js';
import { loadDevices } from './devices.js';
import { loadProfile } from './profile.js';

export const COVER_PALETTES = [
  ['#0d1b4b', '#1a3a8f', '#2255cc'],
  ['#1a0a2e', '#4a0e8f', '#7b3fff'],
  ['#0a2218', '#0d5c3a', '#00c96a'],
  ['#2d0808', '#8f1a1a', '#cc3333'],
  ['#1a1208', '#8f5a0a', '#e8a020'],
  ['#0a0d1a', '#0d2255', '#1a4aaa'],
  ['#1a0a2e', '#2d1a5e', '#6633cc'],
  ['#081a1a', '#0d4a4a', '#00aaaa'],
];

/**
 * Escapa caracteres especiales de HTML para prevenir inyecciones XSS.
 * @param {string} str - La cadena a escapar.
 * @returns {string} La cadena escapada segura.
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(str).replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Muestra el modal de registro de usuario y limpia los campos y errores previos.
 */
export function openRegisterModal() {
  document.getElementById('modal-register').classList.remove('hidden');
  document.getElementById('reg-error').classList.add('hidden');
  document.getElementById('register-form').reset();
}

/**
 * Cierra el modal de registro si se hace click fuera de él.
 * @param {Event} e - El evento de click disparado.
 */
export function closeRegisterModal(e) {
  if (e.target === document.getElementById('modal-register'))
    document.getElementById('modal-register').classList.add('hidden');
}

/**
 * Muestra una notificación flotante estilo toast en la pantalla.
 * @param {string} msg - El mensaje a mostrar.
 * @param {string} [type='success'] - El tipo de notificación ('success', 'error', etc.).
 */
export function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const v = document.getElementById(viewId);
  if (v) { v.classList.remove('hidden'); v.classList.add('active'); }
}
export function showLogin() { showView('view-login'); }
export function showDashboard() { showView('view-dashboard'); }

/**
 * Cambia la sección principal visible del Dashboard y actualiza el menú lateral.
 * @param {string} name - Nombre de la sección (ej. 'biblioteca', 'juegos', etc.).
 * @param {HTMLElement} [el] - Elemento de menú que activó el cambio, si lo hay.
 */
export function switchSection(name, el) {
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');

  document.querySelectorAll('.content-section').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });

  const section = document.getElementById(`section-${name}`);
  if (section) {
    section.classList.remove('hidden');
    section.classList.add('active');
  }

  // Llama a la función de carga correspondiente a la nueva sección
  const loaders = {
    biblioteca:   loadLibrary,
    juegos:       loadCatalog,
    licencias:    loadLicenses,
    dispositivos: loadDevices,
    perfil:       loadProfile,
  };
  if (loaders[name]) loaders[name]();
}

export function initSearchFilter() {
  const searchInput = document.getElementById('search-input');
  if(searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.game-card').forEach(card => {
        const title = card.dataset.title?.toLowerCase() || '';
        const genre = card.dataset.genre?.toLowerCase() || '';
        card.style.display = (title.includes(q) || genre.includes(q)) ? '' : 'none';
      });
    });
  }
}

export function generateCover(title, index, coverUrl) {
  if (coverUrl) {
    return `
      <div style="position: absolute; inset: -20px; background-image: url('${coverUrl}'); background-size: cover; background-position: center; filter: blur(15px); opacity: 0.4; z-index: 0;"></div>
      <img src="${coverUrl}" class="game-cover-img" alt="" aria-label="${title}" onerror="this.style.opacity='0'; this.style.visibility='hidden';" style="position: relative; z-index: 1; object-fit: contain; color: transparent;" />
    `;
  }
  const pal = COVER_PALETTES[index % COVER_PALETTES.length];
  const abbr = title.slice(0, 2).toUpperCase();
  return `
    <div class="game-cover-bg" style="background: linear-gradient(135deg, ${pal[0]} 0%, ${pal[1]} 60%, ${pal[2]} 100%);">
      <div style="text-align:center; padding: 10px;">
        <div style="font-size:2.4rem; font-weight:900; color:rgba(255,255,255,0.15); letter-spacing:0.1em; line-height:1;">${abbr}</div>
      </div>
    </div>`;
}

export function makeBadge(estado) {
  const map = {
    activo:       { cls: 'badge-active',      label: 'READY' },
    inactivo:     { cls: 'badge-inactive',    label: 'OFFLINE' },
    mantenimiento:{ cls: 'badge-maintenance', label: 'MAINT.' },
    activa:       { cls: 'badge-active',      label: 'ACTIVA' },
    revocada:     { cls: 'badge-inactive',    label: 'REVOCADA' },
    expirada:     { cls: 'badge-maintenance', label: 'EXPIRADA' },
    autorizado:   { cls: 'badge-active',      label: 'AUTORIZADO' },
    bloqueado:    { cls: 'badge-inactive',    label: 'BLOQUEADO' },
  };
  const b = map[estado] || { cls: 'badge-inactive', label: estado?.toUpperCase() || '—' };
  return `<span class="badge ${b.cls}">${b.label}</span>`;
}

/**
 * Construye el elemento HTML (tarjeta) para un juego y le asigna sus clases, 
 * badges y eventos, basándose en la información del juego.
 * @param {Object} juego - Objeto con los datos del juego.
 * @param {number} idx - Índice para generar una portada colorida si no tiene imagen.
 * @param {string} [context='library'] - Contexto de visualización ('library' o 'catalog').
 * @returns {HTMLElement} El elemento div que representa la tarjeta.
 */
export function buildGameCard(juego, idx, context = 'library') {
  const card = document.createElement('div');
  card.className = 'game-card';
  card.dataset.title = juego.titulo;
  card.dataset.genre = juego.genero || '';
  card.dataset.estado = juego.estado || 'activo';
  card.onclick = () => openGameModal(juego, idx, context);

  card.innerHTML = `
    <div class="game-cover">
      ${generateCover(juego.titulo, idx, juego.imagen_portada)}
        <div class="game-cover-overlay">
          ${juego.estado === 'mantenimiento'
            ? `<button class="btn-play" style="background:rgba(20,20,30,0.9); border:1px solid rgba(255,255,255,0.1); color:var(--text-muted);">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                 MANTENIMIENTO
               </button>`
            : `<button class="btn-play">
                 <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                 ${context === 'catalog' ? 'VER JUEGO' : 'JUGAR'}
               </button>`
          }
        </div>
    </div>
    <div class="game-info">
      <div class="game-title">${escapeHTML(juego.titulo)}</div>
      <div class="game-meta">
        <span class="game-genre">${escapeHTML(juego.genero || 'Sin género')}</span>
        <span class="game-year">${escapeHTML(juego.fecha_lanzamiento ? juego.fecha_lanzamiento.slice(0,4) : '—')}</span>
      </div>
      <div class="game-footer">
        ${makeBadge(juego.estado)}
        <span style="font-size:0.68rem;color:var(--text-muted)">v${escapeHTML(juego.version_actual || '1.0')}</span>
      </div>
    </div>`;
  return card;
}

export async function openGameModal(juego, idx, context = 'library') {
  document.getElementById('modal-cover').innerHTML = generateCover(juego.titulo, idx, juego.imagen_portada);
  document.getElementById('modal-genres').innerHTML = juego.genero
    ? juego.genero.split(',').map(g => `<span class="badge badge-maintenance">${g.trim()}</span>`).join('')
    : '';
  document.getElementById('modal-title').textContent  = juego.titulo;
  document.getElementById('modal-desc').textContent   = juego.descripcion || 'Sin descripción disponible.';
  document.getElementById('modal-dev').textContent    = juego.desarrollador || '—';
  document.getElementById('modal-ver').textContent    = juego.version_actual || '—';
  document.getElementById('modal-date').textContent   = juego.fecha_lanzamiento || '—';
  document.getElementById('modal-status').innerHTML   = makeBadge(juego.estado);
  
  const actionsDiv = document.querySelector('#modal-game .modal-actions');
  
  if (juego.estado === 'mantenimiento') {
    actionsDiv.innerHTML = `
      <button class="btn-primary" disabled style="background:#2a2f3a; border-color:#2a2f3a; color:var(--text-muted); cursor:not-allowed;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        NO DISPONIBLE
      </button>
    `;
  } else if (context === 'catalog') {
    actionsDiv.innerHTML = `<div class="spinner"></div> Verificando biblioteca...`;
    document.getElementById('modal-game').classList.remove('hidden');

    try {
      const myGames = await ApiBiblioteca.miBiblioteca();
      const yaLoTiene = myGames.some(g => g.id_juego === juego.id_juego);
      
      if (yaLoTiene) {
        actionsDiv.innerHTML = `
          <button class="btn-primary" disabled style="background:#10b981;border-color:#10b981;cursor:default;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            YA EN BIBLIOTECA
          </button>
        `;
      } else {
        actionsDiv.innerHTML = `
          <button class="btn-primary" id="btn-solicitar-juego" style="background:var(--accent-orange);border-color:var(--accent-orange);box-shadow:0 0 15px rgba(255,107,53,0.3);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            SOLICITAR CÓDIGO
          </button>
        `;
        setTimeout(() => {
          const btn = document.getElementById('btn-solicitar-juego');
          if(btn) btn.onclick = () => window.solicitarJuego(juego.id_juego, btn);
        }, 0);
      }
    } catch (e) {
      actionsDiv.innerHTML = `<span style="color:var(--accent-red)">Error al verificar biblioteca</span>`;
    }
    return;
  } else {
    actionsDiv.innerHTML = `
      <button class="btn-primary" id="modal-play-btn">
        <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        JUGAR
      </button>
    `;
  }
  
  document.getElementById('modal-game').classList.remove('hidden');
}

export function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

export function closeModal(id) {
  if (typeof id === 'string') {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  } else if (id && id.target === document.getElementById('modal-game')) {
    document.getElementById('modal-game').classList.add('hidden');
  }
}
