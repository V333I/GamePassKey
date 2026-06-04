/**
 * GamePassKey — API Service
 * Capa de comunicación con el backend FastAPI en localhost:8000
 */

export const API_BASE = 'http://localhost:8000';

// ── Token management ─────────────────────────────────────────────
export const Auth = {
  save(data) {
    localStorage.setItem('gpk_token', data.access_token);
    localStorage.setItem('gpk_user', JSON.stringify({
      id_usuario:     data.id_usuario,
      nombre_usuario: data.nombre_usuario,
      correo:         data.correo,
      estado:         data.estado,
      id_rol:         data.id_rol,
    }));
  },
  token()   { return localStorage.getItem('gpk_token'); },
  user()    { const u = localStorage.getItem('gpk_user'); return u ? JSON.parse(u) : null; },
  clear()   { localStorage.removeItem('gpk_token'); localStorage.removeItem('gpk_user'); },
  isLoggedIn() { return !!this.token(); },
};

// ── Base fetch wrapper ────────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const token = Auth.token();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    Auth.clear();
    // Assuming showLogin is available globally or imported if needed
    if (window.showLogin) window.showLogin();
    throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
  }

  const data = res.ok ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.detail || `Error ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ── Auth ──────────────────────────────────────────────────────────
export const ApiAuth = {
  login: (correo, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ correo, password }) }),
};

// ── Juegos ────────────────────────────────────────────────────────
export const ApiJuegos = {
  listar: (estado = 'todos') =>
    apiFetch(`/juegos?estado=${estado}`),
  obtener: (id) =>
    apiFetch(`/juegos/${id}`),
};

// ── Biblioteca ────────────────────────────────────────────────────
export const ApiBiblioteca = {
  miBiblioteca: () =>
    apiFetch('/biblioteca/mi-biblioteca'),
};

// ── Licencias ─────────────────────────────────────────────────────
export const ApiLicencias = {
  misLicencias: () =>
    apiFetch('/licencias/mis-licencias'),
};

// ── Dispositivos ──────────────────────────────────────────────────
export const ApiDispositivos = {
  misDispositivos: () =>
    apiFetch('/dispositivos/mis-dispositivos'),
  registrar: (datos) =>
    apiFetch('/dispositivos', { method: 'POST', body: JSON.stringify(datos) }),
  desvincular: (id) =>
    apiFetch(`/dispositivos/${id}/desvincular`, { method: 'POST' }),
};

// ── Códigos ───────────────────────────────────────────────────────
export const ApiCodigos = {
  usar: (datos) => apiFetch('/codigos/usar', { method: 'POST', body: JSON.stringify(datos) }),
};

// ── Perfil ────────────────────────────────────────────────────────
export const ApiUsuarios = {
  miPerfil: () => apiFetch('/usuarios/perfil'),
  actualizarPerfil: (datos) => apiFetch('/usuarios/perfil', { method: 'PUT', body: JSON.stringify(datos) }),
};
