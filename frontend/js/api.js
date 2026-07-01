/**
 * GamePassKey — API Service
 * Capa de comunicación con el backend FastAPI en localhost:8000
 * @module api
 */

/**
 * Base URL for the API
 * Detecta si está en localhost o en producción (Render)
 * @type {string}
 */
export const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8000'
  : 'https://gamepasskey-7.onrender.com'; // URL que te dará Render para tu backend

// ── Token management ─────────────────────────────────────────────
/**
 * Auth object for managing user session and tokens in local storage.
 * @namespace
 */
export const Auth = {
  /**
   * Saves the authentication data (token and user details) to local storage.
   * @param {Object} data - The authentication data object.
   * @param {string} data.access_token - The JWT access token.
   * @param {number} data.id_usuario - The user's ID.
   * @param {string} data.nombre_usuario - The user's name.
   * @param {string} data.correo - The user's email.
   * @param {string} data.estado - The user's status.
   * @param {number} data.id_rol - The user's role ID (1 for Admin, 2 for User).
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
  
  /**
   * Retrieves the access token from local storage.
   * @returns {string|null} The stored token or null if not found.
   */
  token()   { return localStorage.getItem('gpk_token'); },
  
  /**
   * Retrieves the user details from local storage.
   * @returns {Object|null} The parsed user object or null if not found.
   */
  user()    { 
    const u = localStorage.getItem('gpk_user'); 
    return u ? JSON.parse(u) : null; 
  },
  
  /**
   * Clears the authentication data from local storage, effectively logging the user out.
   */
  clear()   { 
    localStorage.removeItem('gpk_token'); 
    localStorage.removeItem('gpk_user'); 
  },
  
  /**
   * Checks if the user is currently logged in.
   * @returns {boolean} True if a token exists, false otherwise.
   */
  isLoggedIn() { return !!this.token(); },
};

// ── Base fetch wrapper ────────────────────────────────────────────
/**
 * Wrapper for the native fetch API to include authentication headers and error handling.
 * @async
 * @param {string} path - The API endpoint path (appended to API_BASE).
 * @param {Object} [options={}] - Additional fetch options (e.g., method, body).
 * @returns {Promise<any>} The parsed JSON response data.
 * @throws {Error} If the response is not OK or if the session has expired.
 */
export async function apiFetch(path, options = {}) {
  const token = Auth.token();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  
  // Si hay token disponible, lo añade a la cabecera de Autorización
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Manejo de token expirado o no válido (401 Unauthorized)
  if (res.status === 401) {
    Auth.clear();
    if (window.showLogin) window.showLogin();
    
    let msg = 'Sesión expirada. Por favor inicia sesión nuevamente.';
    try {
      const errBody = await res.clone().json();
      if (errBody && errBody.detail) {
        msg = errBody.detail;
      }
    } catch (e) {}
    throw new Error(msg);
  }

  // Intenta parsear la respuesta a JSON si fue exitosa, o devuelve null
  const data = res.ok ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    // Si la respuesta no es OK, extrae el mensaje de error del cuerpo
    const errBody = await res.json().catch(() => ({}));
    
    let msg = `Error ${res.status}`;
    if (errBody && errBody.detail) {
      if (Array.isArray(errBody.detail)) {
        // Si es un error de validación de Pydantic, unimos los mensajes
        msg = errBody.detail.map(err => err.msg).join(' | ');
      } else if (typeof errBody.detail === 'string') {
        msg = errBody.detail;
      }
    }
    
    if (res.status === 403 && (msg.toLowerCase().includes('inactiva') || msg.toLowerCase().includes('bloqueada'))) {
      Auth.clear();
      if (window.showLogin) window.showLogin();
    }
    
    throw new Error(msg);
  }

  return data;
}

// ── Auth ──────────────────────────────────────────────────────────
/**
 * Authentication API endpoints.
 * @namespace
 */
export const ApiAuth = {
  /**
   * Authenticates a user.
   * @param {string} correo - The user's email.
   * @param {string} password - The user's password.
   * @returns {Promise<Object>} The authentication token and user data.
   */
  login: (correo, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ correo, password }) }),

  /**
   * Verifica el código OTP recibido por Telegram y completa el inicio de sesión.
   * @param {string} correo - The user's email.
   * @param {string} codigo - The OTP code received via Telegram.
   * @returns {Promise<Object>} The authentication token and user data.
   */
  verifyOtp: (correo, codigo) =>
    apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ correo, codigo }) }),

  recuperarPassword: (correo) =>
    apiFetch('/auth/recuperar-password', { method: 'POST', body: JSON.stringify({ correo }) }),

  resetPassword: (correo, codigo, nueva_password) =>
    apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ correo, codigo, nueva_password }) }),
};

// ── Juegos ────────────────────────────────────────────────────────
/**
 * Games API endpoints.
 * @namespace
 */
export const ApiJuegos = {
  /**
   * Retrieves a list of games.
   * @param {string} [estado='todos'] - The state of the games to retrieve.
   * @returns {Promise<Array>} List of games.
   */
  listar: (estado = 'todos') =>
    apiFetch(`/juegos?estado=${estado}`),
    
  /**
   * Retrieves a specific game by ID.
   * @param {number} id - The ID of the game.
   * @returns {Promise<Object>} Game details.
   */
  obtener: (id) =>
    apiFetch(`/juegos/${id}`),
};

// ── Biblioteca ────────────────────────────────────────────────────
/**
 * Library API endpoints.
 * @namespace
 */
export const ApiBiblioteca = {
  /**
   * Retrieves the authenticated user's library of games.
   * @returns {Promise<Array>} List of games in the library.
   */
  miBiblioteca: () =>
    apiFetch('/biblioteca/mi-biblioteca'),
};

// ── Licencias ─────────────────────────────────────────────────────
/**
 * Licenses API endpoints.
 * @namespace
 */
export const ApiLicencias = {
  /**
   * Retrieves the authenticated user's licenses.
   * @returns {Promise<Array>} List of licenses.
   */
  misLicencias: () =>
    apiFetch('/licencias/mis-licencias'),
};

// ── Dispositivos ──────────────────────────────────────────────────
/**
 * Devices API endpoints.
 * @namespace
 */
export const ApiDispositivos = {
  /**
   * Retrieves the authenticated user's linked devices.
   * @returns {Promise<Array>} List of devices.
   */
  misDispositivos: () =>
    apiFetch('/dispositivos/mis-dispositivos'),
    
  /**
   * Registers a new device for the authenticated user.
   * @param {Object} datos - The device details.
   * @returns {Promise<Object>} The registered device data.
   */
  registrar: (datos) =>
    apiFetch('/dispositivos', { method: 'POST', body: JSON.stringify(datos) }),
    
  /**
   * Unlinks a specific device.
   * @param {number} id - The ID of the device to unlink.
   * @returns {Promise<Object>} Unlink confirmation.
   */
  desvincular: (id) =>
    apiFetch(`/dispositivos/${id}/desvincular`, { method: 'POST' }),
};

// ── Códigos ───────────────────────────────────────────────────────
/**
 * Codes (Keys) API endpoints.
 * @namespace
 */
export const ApiCodigos = {
  /**
   * Uses/redeems a code.
   * @param {Object} datos - The code details to redeem.
   * @param {string} datos.codigo - The code string.
   * @returns {Promise<Object>} Result of the redemption process.
   */
  usar: (datos) => apiFetch('/codigos/usar', { method: 'POST', body: JSON.stringify(datos) }),
};

// ── Perfil ────────────────────────────────────────────────────────
/**
 * User Profile API endpoints.
 * @namespace
 */
export const ApiUsuarios = {
  /**
   * Retrieves the authenticated user's profile.
   * @returns {Promise<Object>} The user profile data.
   */
  miPerfil: () => apiFetch('/usuarios/perfil'),
  
  /**
   * Updates the authenticated user's profile.
   * @param {Object} datos - The updated profile data.
   * @returns {Promise<Object>} The updated profile data.
   */
  actualizarPerfil: (datos) =>
    apiFetch('/usuarios/perfil', { method: 'PUT', body: JSON.stringify(datos) }),
    
  telegramLink: () => apiFetch('/usuarios/perfil/telegram-link', { method: 'POST' }),
  telegramStatus: () => apiFetch('/usuarios/perfil/telegram-status'),
};
