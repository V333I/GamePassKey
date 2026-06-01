import { api } from './admin_api.js';
import { allUsers, allGames, setAllUsers, setAllGames } from './admin_state.js';
import { populateLicenciaSelects, generarClave } from './admin_licenses.js';
import { autoGenerarCodigo } from './admin_codes.js';
import { loadOverview } from './admin_overview.js';
import { loadJuegos } from './admin_games.js';
import { loadUsuarios } from './admin_users.js';
import { loadLicencias } from './admin_licenses.js';
import { loadCodigos } from './admin_codes.js';
import { loadSolicitudes } from './admin_requests.js';
import { loadLogs } from './admin_logs.js';
import { loadSoporte } from './admin_support.js';

import { Auth, ApiAuth } from './api.js';

export function showToast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icon = type === 'success'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
}

export function openModal(id) { 
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('hidden');
    m.style.display = 'none';
    void m.offsetHeight;
    m.style.display = 'flex';
    void m.offsetHeight;
    requestAnimationFrame(() => {
      m.style.display = ''; 
      m.style.opacity = '1';
    });
  }

  if (id === 'modal-licencia') {
    if (!allUsers.length || !allGames.length) {
      Promise.all([
        api('/usuarios').then(u => setAllUsers(u)),
        api('/juegos?estado=todos').then(g => setAllGames(g)),
      ]).then(populateLicenciaSelects).catch(() => {});
    } else {
      populateLicenciaSelects();
    }
    generarClave();
  }
  if (id === 'modal-juego') {
    const isEdit = !!document.getElementById('juego-id').value;
    if (!isEdit) {
      document.getElementById('modal-juego-title').textContent = 'Nuevo Juego';
      document.getElementById('form-juego').reset();
    }
    document.getElementById('form-juego-error').classList.add('hidden');
  }
  if (id === 'modal-codigo') {
    autoGenerarCodigo();
    document.getElementById('c-expiracion').value = '';
    document.getElementById('form-codigo-error').classList.add('hidden');
    api('/juegos?estado=todos').then(juegos => {
      const sel = document.getElementById('c-juego');
      if (sel) {
        sel.innerHTML = '<option value="">Seleccionar juego...</option>' +
          juegos.map(j => `<option value="${j.id_juego}">Juego #${j.id_juego} - ${j.titulo}</option>`).join('');
      }
    }).catch(() => {});
  }
}

export function closeModal(id) { 
  const m = document.getElementById(id);
  if (m) {
    m.style.opacity = '0';
    m.classList.add('hidden');
    m.style.display = 'none';
    void m.offsetHeight;
  }
}

export function closeModalOverlay(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

export function switchSection(name, el) {
  window.currentAdminSection = name;
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  const targetEl = el || document.querySelector(`.sidebar-item[data-section="${name}"]`);
  if (targetEl) targetEl.classList.add('active');
  document.querySelectorAll('.content-section').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const sec = document.getElementById(`section-${name}`);
  if (sec) { sec.classList.remove('hidden'); sec.classList.add('active'); }
  const loaders = { overview: loadOverview, juegos: loadJuegos, usuarios: loadUsuarios, licencias: loadLicencias, codigos: loadCodigos, solicitudes: loadSolicitudes, logs: loadLogs, soporte: loadSoporte };
  if (loaders[name]) loaders[name]();
}

export function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    let existing = document.getElementById('dynamic-confirm-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dynamic-confirm-modal';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '9999';
    
    overlay.innerHTML = `
      <div class="modal-card modal-form" style="max-width:400px; text-align:center;">
        <div class="modal-form-header" style="justify-content:center; padding-bottom:10px; border-bottom:none;">
          <h2 style="color:var(--text-primary); font-size:1.2rem;">${title}</h2>
        </div>
        <div style="padding:10px 20px 25px;">
          <p style="color:var(--text-secondary); font-size:0.95rem; line-height:1.5;">${message}</p>
        </div>
        <div class="modal-form-actions" style="justify-content:center; gap:16px;">
          <button type="button" class="btn-secondary" id="dyn-btn-cancel">Cancelar</button>
          <button type="button" class="btn-admin-primary" id="dyn-btn-confirm" style="min-width:120px;">
            <span class="btn-text">ACEPTAR</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnConfirm = overlay.querySelector('#dyn-btn-confirm');
    const btnCancel = overlay.querySelector('#dyn-btn-cancel');

    const closeAndResolve = (val) => {
      overlay.remove();
      resolve(val);
    };

    btnConfirm.onclick = () => closeAndResolve(true);
    btnCancel.onclick = () => closeAndResolve(false);
    overlay.onclick = (e) => {
      if (e.target === overlay) closeAndResolve(false);
    };
  });
}

export function makeBadge(estado) {
  const map = {
    activo:        'badge-active',
    activa:        'badge-active',
    autorizado:    'badge-active',
    inactivo:      'badge-inactive',
    revocada:      'badge-inactive',
    bloqueado:     'badge-inactive',
    mantenimiento: 'badge-maintenance',
    expirada:      'badge-maintenance',
  };
  return `<span class="badge ${map[estado] || 'badge-inactive'}">${estado?.toUpperCase() || '—'}</span>`;
}

export async function logout() {
  try { await ApiAuth.logout(); } catch(e) {}
  Auth.clear();
  window.location.href = 'index.html';
}
