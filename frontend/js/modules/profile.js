import { Auth, ApiUsuarios } from '../api.js';
import { makeBadge, showToast } from './ui.js';
import { logout } from './auth.js';

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
  } catch {}
}

export function openEditProfileModal() {
  document.getElementById('modal-edit-profile').classList.remove('hidden');
  document.getElementById('edit-profile-error').classList.add('hidden');
  document.getElementById('edit-profile-name').value = document.getElementById('profile-name').textContent;
  document.getElementById('edit-profile-pass-current').value = '';
  document.getElementById('edit-profile-pass-new').value = '';
}

export function closeEditProfileModal() {
  document.getElementById('modal-edit-profile').classList.add('hidden');
}

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
