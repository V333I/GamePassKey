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
  const telInput = document.getElementById('edit-profile-telegram');
  if (telInput) telInput.value = telegramChatIdActual;
}

/**
 * Función: closeEditProfileModal.
 * (Documentación autogenerada)
 * @function closeEditProfileModal
 */
export function closeEditProfileModal() {
  document.getElementById('modal-edit-profile').classList.add('hidden');
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
