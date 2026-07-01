import { Auth, ApiUsuarios } from '../api.js';
import { makeBadge, showToast } from './ui.js';
import { logout } from './auth.js';

// Chat ID de Telegram actual del usuario (para detectar cambios al editar).
let telegramChatIdActual = '';

/**
 * Función: loadProfile.
 * (Documentación autogenerada)
 * @function loadProfile
 */
export async function loadProfile() {
  const user = Auth.user();
  if (!user) return;

  try {
    const perfil = await ApiUsuarios.miPerfil().catch(() => user);
    document.getElementById('profile-name').textContent  = perfil.nombre_usuario;
    document.getElementById('profile-email').textContent = perfil.correo;
    document.getElementById('profile-estado').textContent = perfil.estado;
    document.getElementById('p-id').textContent      = perfil.id_usuario;
    document.getElementById('p-nombre').textContent  = perfil.nombre_usuario;
    document.getElementById('p-correo').textContent  = perfil.correo;
    document.getElementById('p-estado').innerHTML    = makeBadge(perfil.estado);

    telegramChatIdActual = perfil.telegram_chat_id || '';
    const telEl = document.getElementById('p-telegram');
    if (telEl) {
      telEl.innerHTML = telegramChatIdActual
        ? makeBadge('Activa') + ` <span style="color:var(--text-secondary);font-size:0.8rem">(${telegramChatIdActual})</span>`
        : '<span style="color:var(--text-secondary)">Desactivada</span>';
    }
  } catch {}
}

/**
 * Función: openEditProfileModal.
 * (Documentación autogenerada)
 * @function openEditProfileModal
 */
export function openEditProfileModal() {
  document.getElementById('modal-edit-profile').classList.remove('hidden');
  document.getElementById('edit-profile-error').classList.add('hidden');
  document.getElementById('edit-profile-name').value = document.getElementById('profile-name').textContent;
  document.getElementById('edit-profile-pass-current').value = '';
  document.getElementById('edit-profile-pass-new').value = '';
  
  updateTelegramLinkUI();
}

/**
 * Función: closeEditProfileModal.
 * (Documentación autogenerada)
 * @function closeEditProfileModal
 */
export function closeEditProfileModal() {
  document.getElementById('modal-edit-profile').classList.add('hidden');
}

let pollingInterval = null;

export function updateTelegramLinkUI() {
  const icon = document.getElementById('telegram-status-icon');
  const text = document.getElementById('telegram-status-text');
  const btnLink = document.getElementById('btn-telegram-link');
  const btnUnlink = document.getElementById('btn-telegram-unlink');
  const input = document.getElementById('edit-profile-telegram');

  if (telegramChatIdActual) {
    icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C853" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    text.textContent = 'Vinculado y Activo';
    text.style.color = '#00C853';
    if(btnLink) btnLink.classList.add('hidden');
    if(btnUnlink) btnUnlink.classList.remove('hidden');
    if (input) input.value = telegramChatIdActual;
  } else {
    icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    text.textContent = 'No vinculado';
    text.style.color = 'var(--text-primary)';
    if(btnLink) btnLink.classList.remove('hidden');
    if(btnUnlink) btnUnlink.classList.add('hidden');
    if (input) input.value = '';
  }
}

export async function initiateTelegramLink() {
  const btn = document.getElementById('btn-telegram-link');
  if(!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:white;"></span> Esperando...';
  
  try {
    const res = await ApiUsuarios.telegramLink();
    window.open(res.link, '_blank');
    
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
      try {
        const statusRes = await ApiUsuarios.telegramStatus();
        if (statusRes.vinculado) {
          clearInterval(pollingInterval);
          telegramChatIdActual = statusRes.chat_id;
          updateTelegramLinkUI();
          
          // Actualizar UI principal del perfil de fondo
          const telEl = document.getElementById('p-telegram');
          if (telEl) {
            telEl.innerHTML = makeBadge('Activa') + ` <span style="color:var(--text-secondary);font-size:0.8rem">(${telegramChatIdActual})</span>`;
          }
          showToast('¡Telegram vinculado exitosamente!');
        }
      } catch (err) {}
    }, 3000);
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Reintentar';
    showToast('Error al generar enlace de Telegram', 'error');
  }
}

export function unlinkTelegram() {
  telegramChatIdActual = '';
  const input = document.getElementById('edit-profile-telegram');
  if (input) input.value = '';
  updateTelegramLinkUI();
}

/**
 * Función: submitEditProfile.
 * (Documentación autogenerada)
 * @function submitEditProfile
 */
export async function submitEditProfile(event) {
  event.preventDefault();
  const name = document.getElementById('edit-profile-name').value.trim();
  const passCurrent = document.getElementById('edit-profile-pass-current').value;
  const passNew = document.getElementById('edit-profile-pass-new').value;

  const errEl = document.getElementById('edit-profile-error');
  const errMsg = document.getElementById('edit-profile-error-msg');
  const btn = document.getElementById('btn-edit-profile');
  const btnText = btn.querySelector('.btn-text');
  const btnLoad = btn.querySelector('.btn-loader');

  errEl.classList.add('hidden');

  const datos = {};
  if (name && name !== document.getElementById('profile-name').textContent) {
    datos.nombre_usuario = name;
  }

  // Telegram 2FA: solo enviar si cambió (cadena vacía = desvincular).
  const telInput = document.getElementById('edit-profile-telegram');
  if (telInput) {
    const telNuevo = telInput.value.trim();
    if (telNuevo !== telegramChatIdActual) {
      datos.telegram_chat_id = telNuevo;
    }
  }

  if (passNew) {
    if (!passCurrent) {
      errMsg.textContent = 'Debes ingresar tu contraseña actual para cambiarla.';
      errEl.classList.remove('hidden');
      return;
    }
    datos.password_actual = passCurrent;
    datos.password_nuevo = passNew;
  }

  if (Object.keys(datos).length === 0) {
    closeEditProfileModal();
    return;
  }

  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');
  btn.disabled = true;

  try {
    const resp = await ApiUsuarios.actualizarPerfil(datos);
    showToast('Perfil actualizado correctamente');
    closeEditProfileModal();

    if (datos.password_nuevo) {
      showToast('Contraseña cambiada. Por favor inicia sesión nuevamente.', 'error');
      setTimeout(() => logout(), 2000);
    } else {
      document.getElementById('profile-name').textContent = resp.nombre_usuario;
      document.getElementById('p-nombre').textContent = resp.nombre_usuario;
      document.getElementById('nav-username').textContent = resp.nombre_usuario;

      // Refrescar el estado de Telegram 2FA mostrado en la tarjeta.
      telegramChatIdActual = resp.telegram_chat_id || '';
      const telEl = document.getElementById('p-telegram');
      if (telEl) {
        telEl.innerHTML = telegramChatIdActual
          ? makeBadge('Activa') + ` <span style="color:var(--text-secondary);font-size:0.8rem">(${telegramChatIdActual})</span>`
          : '<span style="color:var(--text-secondary)">Desactivada</span>';
      }

      const user = Auth.user();
      if (user) {
        user.nombre_usuario = resp.nombre_usuario;
        localStorage.setItem('gpk_user', JSON.stringify(user));
      }
    }
  } catch (err) {
    errMsg.textContent = err.message || 'Error al actualizar perfil.';
    errEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
    btn.disabled = false;
  }
}
