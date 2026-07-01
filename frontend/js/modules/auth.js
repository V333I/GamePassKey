import { apiFetch, Auth, ApiAuth, ApiUsuarios } from '../api.js';
import { showToast, showDashboard, showLogin, switchSection } from './ui.js';
import { loadLibrary } from './library.js';

/**
 * Función: togglePassword.
 * (Documentación autogenerada)
 * @function togglePassword
 */
export function togglePassword() {
  const input = document.getElementById('login-password');
  input.type = input.type === 'password' ? 'text' : 'password';
}

// Correo pendiente de verificación OTP (entre el paso 1 y el paso 2 del login).
let otpCorreoPendiente = null;

/**
 * Completa el inicio de sesión una vez obtenido el token (con o sin OTP).
 * @param {Object} data - Respuesta del backend con access_token y datos del usuario.
 */
async function completarLogin(data) {
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
  switchSection('biblioteca', document.querySelector('[onclick="switchSection(\\\'biblioteca\\\', this)"]'));
  loadLibrary();

  // Show 2FA recommendation if Telegram is not linked
  try {
    const perfilInfo = await ApiUsuarios.miPerfil();
    if (!perfilInfo.telegram_chat_id) {
      document.getElementById('modal-recommend-2fa').classList.remove('hidden');
    }
  } catch(e) {}
}

/** Muestra el formulario de OTP y oculta el de login. */
function mostrarPasoOtp(correo) {
  otpCorreoPendiente = correo;
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('otp-form').classList.remove('hidden');
  document.getElementById('otp-error').classList.add('hidden');
  const input = document.getElementById('otp-codigo');
  input.value = '';
  input.focus();
}

/** Vuelve del formulario de OTP al de login (cancelar verificación). */
export function cancelarOtp() {
  otpCorreoPendiente = null;
  document.getElementById('otp-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
}

/**
 * Función: initAuth.
 * (Documentación autogenerada)
 * @function initAuth
 */
export function initAuth() {
  document.getElementById('btn-recovery-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    openRecoveryModal();
  });

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const correo   = document.getElementById('login-correo').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl  = document.getElementById('login-error');
    const errorMsg = document.getElementById('login-error-msg');
    const btnText  = document.querySelector('#btn-login .btn-text');
    const btnLoad  = document.querySelector('#btn-login .btn-loader');

    errorEl.classList.add('hidden');
    
    if (!correo || !password) {
      errorMsg.textContent = 'Por favor, completa ambos campos antes de continuar.';
      errorEl.classList.remove('hidden');
      return;
    }

    btnText.classList.add('hidden');
    btnLoad.classList.remove('hidden');
    document.getElementById('btn-login').disabled = true;

    try {
      const data = await ApiAuth.login(correo, password);

      // El usuario tiene 2FA: el backend no devuelve token, pide verificar OTP.
      if (data.otp_required) {
        showToast('Te enviamos un código de verificación por Telegram.');
        mostrarPasoOtp(data.correo || correo);
        return;
      }

      await completarLogin(data);

    } catch (err) {
      errorMsg.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      btnText.classList.remove('hidden');
      btnLoad.classList.add('hidden');
      document.getElementById('btn-login').disabled = false;
    }
  });

  document.getElementById('otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const codigo   = document.getElementById('otp-codigo').value.trim();
    const errorEl  = document.getElementById('otp-error');
    const errorMsg = document.getElementById('otp-error-msg');
    const btnText  = document.querySelector('#btn-otp .btn-text');
    const btnLoad  = document.querySelector('#btn-otp .btn-loader');

    errorEl.classList.add('hidden');

    if (!otpCorreoPendiente) { cancelarOtp(); return; }
    if (!codigo) { errorMsg.textContent = 'Ingresa el código recibido.'; errorEl.classList.remove('hidden'); return; }

    btnText.classList.add('hidden');
    btnLoad.classList.remove('hidden');
    document.getElementById('btn-otp').disabled = true;

    try {
      const data = await ApiAuth.verifyOtp(otpCorreoPendiente, codigo);
      otpCorreoPendiente = null;
      document.getElementById('otp-form').classList.add('hidden');
      document.getElementById('login-form').classList.remove('hidden');
      await completarLogin(data);
    } catch (err) {
      errorMsg.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      btnText.classList.remove('hidden');
      btnLoad.classList.add('hidden');
      document.getElementById('btn-otp').disabled = false;
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
      switchSection('biblioteca', document.querySelector('[onclick="switchSection(\\\'biblioteca\\\', this)"]'));
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

/**
 * Función: logout.
 * (Documentación autogenerada)
 * @function logout
 */
export async function logout() {
  try { await ApiAuth.logout(); } catch(e) {}
  Auth.clear();
  document.getElementById('login-correo').value   = '';
  document.getElementById('login-password').value = '';
  showToast('Sesión cerrada correctamente');
  showLogin();
}

// --- RECUPERACIÓN DE CONTRASEÑA ---

let recoveryEmailPending = '';

export function openRecoveryModal() {
  document.getElementById('modal-recovery').classList.remove('hidden');
  document.getElementById('recovery-step1-form').classList.remove('hidden');
  document.getElementById('recovery-step2-form').classList.add('hidden');
  document.getElementById('recovery-email').value = '';
  document.getElementById('recovery-code').value = '';
  document.getElementById('recovery-new-password').value = '';
  document.getElementById('recovery-error-1').classList.add('hidden');
  document.getElementById('recovery-error-2').classList.add('hidden');
}

export function closeRecoveryModal() {
  document.getElementById('modal-recovery').classList.add('hidden');
  recoveryEmailPending = '';
}

export async function submitRecoveryStep1(e) {
  e.preventDefault();
  const correo = document.getElementById('recovery-email').value.trim();
  const errorEl = document.getElementById('recovery-error-1');
  const errorMsg = document.getElementById('recovery-error-msg-1');
  const btn = document.getElementById('btn-recovery-step1');
  
  errorEl.classList.add('hidden');
  if (!correo) return;
  
  btn.disabled = true;
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-loader').classList.remove('hidden');
  
  try {
    await ApiAuth.recuperarPassword(correo);
    recoveryEmailPending = correo;
    document.getElementById('recovery-step1-form').classList.add('hidden');
    document.getElementById('recovery-step2-form').classList.remove('hidden');
    showToast('Código enviado a tu Telegram.');
  } catch (err) {
    errorMsg.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-loader').classList.add('hidden');
  }
}

export async function submitRecoveryStep2(e) {
  e.preventDefault();
  const codigo = document.getElementById('recovery-code').value.trim();
  const nuevaPass = document.getElementById('recovery-new-password').value;
  const errorEl = document.getElementById('recovery-error-2');
  const errorMsg = document.getElementById('recovery-error-msg-2');
  const btn = document.getElementById('btn-recovery-step2');
  
  errorEl.classList.add('hidden');
  if (!codigo || !nuevaPass) return;
  if (nuevaPass.length < 6) {
    errorMsg.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
    errorEl.classList.remove('hidden');
    return;
  }
  
  btn.disabled = true;
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-loader').classList.remove('hidden');
  
  try {
    const res = await ApiAuth.resetPassword(recoveryEmailPending, codigo, nuevaPass);
    showToast(res.mensaje || 'Contraseña cambiada exitosamente.');
    closeRecoveryModal();
    // Pre-llenar el correo en el login
    document.getElementById('login-correo').value = recoveryEmailPending;
    document.getElementById('login-password').focus();
  } catch (err) {
    errorMsg.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-loader').classList.add('hidden');
  }
}
