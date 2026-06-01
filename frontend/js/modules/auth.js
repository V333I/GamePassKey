import { apiFetch, Auth, ApiAuth, ApiUsuarios } from '../api.js';
import { showToast, showDashboard, showLogin } from './ui.js';
import { loadLibrary } from './library.js';

export function togglePassword() {
  const input = document.getElementById('login-password');
  input.type = input.type === 'password' ? 'text' : 'password';
}

export function initAuth() {
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const correo   = document.getElementById('login-correo').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl  = document.getElementById('login-error');
    const errorMsg = document.getElementById('login-error-msg');
    const btnText  = document.querySelector('#btn-login .btn-text');
    const btnLoad  = document.querySelector('#btn-login .btn-loader');

    errorEl.classList.add('hidden');
    btnText.classList.add('hidden');
    btnLoad.classList.remove('hidden');
    document.getElementById('btn-login').disabled = true;

    try {
      const data = await ApiAuth.login(correo, password);
      Auth.save(data);

      document.getElementById('nav-username').textContent = data.nombre_usuario;

      try {
        const perfil = await ApiUsuarios.miPerfil();
        if (perfil.id_rol === 1) {
          document.getElementById('nav-role').textContent = 'ADMINISTRADOR';
          document.getElementById('btn-admin-link').classList.remove('hidden');
        } else {
          document.getElementById('nav-role').textContent = 'USUARIO';
        }
      } catch { document.getElementById('nav-role').textContent = 'USUARIO'; }

      showToast(`¡Bienvenido, ${data.nombre_usuario}!`);
      showDashboard();
      loadLibrary();

    } catch (err) {
      errorMsg.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      btnText.classList.remove('hidden');
      btnLoad.classList.add('hidden');
      document.getElementById('btn-login').disabled = false;
    }
  });

  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre   = document.getElementById('reg-nombre').value.trim();
    const correo   = document.getElementById('reg-correo').value.trim();
    const pass1    = document.getElementById('reg-password').value;
    const pass2    = document.getElementById('reg-password2').value;
    const errorEl  = document.getElementById('reg-error');
    const errorMsg = document.getElementById('reg-error-msg');
    const btnText  = document.querySelector('#btn-register .btn-text');
    const btnLoad  = document.querySelector('#btn-register .btn-loader');

    errorEl.classList.add('hidden');

    if (!nombre) { errorMsg.textContent = 'El nombre es obligatorio.'; errorEl.classList.remove('hidden'); return; }
    if (pass1.length < 6) { errorMsg.textContent = 'La contraseña debe tener al menos 6 caracteres.'; errorEl.classList.remove('hidden'); return; }
    if (pass1 !== pass2) { errorMsg.textContent = 'Las contraseñas no coinciden.'; errorEl.classList.remove('hidden'); return; }

    btnText.classList.add('hidden');
    btnLoad.classList.remove('hidden');
    document.getElementById('btn-register').disabled = true;

    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nombre_usuario: nombre, correo, password: pass1 }),
      });
      Auth.save(data);
      document.getElementById('nav-username').textContent = data.nombre_usuario;
      document.getElementById('modal-register').classList.add('hidden');
      showToast(`¡Bienvenido, ${data.nombre_usuario}! Cuenta creada exitosamente.`);
      showDashboard();
      loadLibrary();
    } catch (err) {
      errorMsg.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      btnText.classList.remove('hidden');
      btnLoad.classList.add('hidden');
      document.getElementById('btn-register').disabled = false;
    }
  });
}

export async function logout() {
  try { await ApiAuth.logout(); } catch(e) {}
  Auth.clear();
  document.getElementById('login-correo').value   = '';
  document.getElementById('login-password').value = '';
  showToast('Sesión cerrada correctamente');
  showLogin();
}
