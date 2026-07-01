/**
 * Core API and Authentication Module for Admin/User
 * Capa de comunicación con el backend FastAPI.
 * @module api
 */

/**
 * Base URL for the API
 * @type {string}
 */
export const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8000'
  : 'https://gamepasskey-7.onrender.com';

/**
 * Auth object for managing user session in local storage.
 * @namespace
 */
export const Auth = {
  /**
   * Saves authentication data.
   * @param {Object} data - Auth data containing token and user info.
   */
  save(data) {
    localStorage.setItem('gpk_token', data.access_token);
    // Guarda el objeto del usuario serializado en localStorage
    localStorage.setItem('gpk_user', JSON.stringify({
      id_usuario:     data.id_usuario,
      nombre_usuario: data.nombre_usuario,
      correo:         data.correo,
      estado:         data.estado,
      id_rol:         data.id_rol,
    }));
  },
  
  /** @returns {string|null} The stored token. */
  token()   { return localStorage.getItem('gpk_token'); },
  
  /** @returns {Object|null} The parsed user object. */
  user()    { const u = localStorage.getItem('gpk_user'); return u ? JSON.parse(u) : null; },
  
  /** Clears the authentication data. */
  clear()   { localStorage.removeItem('gpk_token'); localStorage.removeItem('gpk_user'); },
  
  /** @returns {boolean} True if a token exists. */
  isLoggedIn() { return !!this.token(); },
};

/**
 * Wrapper for the native fetch API to include authentication.
 * @async
 * @param {string} path - The API endpoint path.
 * @param {Object} [options={}] - Additional fetch options.
 * @returns {Promise<any>} The parsed JSON response.
 * @throws {Error} If the response is not OK.
 */
export async function apiFetch(path, options = {}) {
  const token = Auth.token();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Manejo de token expirado o no válido
  if (res.status === 401 || res.status === 403) {
    Auth.clear();
    // Redirige al login según el contexto actual (admin o usuario)
    if (window.showLogin) window.showLogin();
    else if (window.location.pathname.includes('admin.html')) window.location.href = 'index.html';
    throw new Error('Sesión expirada o sin permisos. Por favor inicia sesión nuevamente.');
  }

  const data = res.ok ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    // Procesa el mensaje de error del backend, soportando strings o arrays de errores
    const errBody = await res.json().catch(() => ({}));
    let msg = errBody?.detail || `Error ${res.status}`;
    if (Array.isArray(msg)) msg = msg.map(d => d.msg).join(', ');
    throw new Error(msg);
  }

  return data;
}

/** Authentication endpoints @namespace */
export const ApiAuth = {
  /** @returns {Promise<Object>} Devuelve el token, o `{otp_required:true}` si el usuario tiene 2FA. */
  login: (correo, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ correo, password }) }),
  /** @returns {Promise<Object>} Verifica el OTP recibido por Telegram y devuelve el token. */
  verifyOtp: (correo, codigo) => apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ correo, codigo }) }),
  /** @returns {Promise<Object>} */
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
};

/** Games endpoints @namespace */
export const ApiJuegos = {
  /** @returns {Promise<Array>} */
  listar: (estado = 'todos') => apiFetch(`/juegos?estado=${estado}`),
  /** @returns {Promise<Object>} */
  obtener: (id) => apiFetch(`/juegos/${id}`),
};

/** Library endpoints @namespace */
export const ApiBiblioteca = {
  /** @returns {Promise<Array>} */
  miBiblioteca: () => apiFetch('/biblioteca/mi-biblioteca'),
};

/** Licenses endpoints @namespace */
export const ApiLicencias = {
  /** @returns {Promise<Array>} */
  misLicencias: () => apiFetch('/licencias/mis-licencias'),
};

/** Devices endpoints @namespace */
export const ApiDispositivos = {
  /** @returns {Promise<Array>} */
  misDispositivos: () => apiFetch('/dispositivos/mis-dispositivos'),
  /** @returns {Promise<Object>} */
  registrar: (datos) => apiFetch('/dispositivos', { method: 'POST', body: JSON.stringify(datos) }),
  /** @returns {Promise<Object>} */
  desvincular: (id) => apiFetch(`/dispositivos/${id}/desvincular`, { method: 'POST' }),
};

/** Codes endpoints @namespace */
export const ApiCodigos = {
  /** @returns {Promise<Object>} */
  usar: (datos) => apiFetch('/codigos/usar', { method: 'POST', body: JSON.stringify(datos) }),
};

/** User Profile endpoints @namespace */
export const ApiUsuarios = {
  /** @returns {Promise<Object>} */
  miPerfil: () => apiFetch('/usuarios/perfil'),
  /** @returns {Promise<Object>} */
  actualizarPerfil: (datos) => apiFetch('/usuarios/perfil', { method: 'PUT', body: JSON.stringify(datos) }),
};
