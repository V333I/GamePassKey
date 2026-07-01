import { showToast } from './admin_ui.js';
import { Auth, API_BASE } from './api.js';

/**
 * Función: api.
 * (Documentación autogenerada)
 * @function api
 */
export async function api(path, options = {}) {
  const headers = { 
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers || {})
  };
  
  if (Auth.token()) headers['Authorization'] = `Bearer ${Auth.token()}`;
  
  options.credentials = 'include';
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    showToast('Sin permisos de administrador. Redirigiendo...', 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
    throw new Error('No autorizado');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let msg = err.detail || `Error ${res.status}`;
    if (Array.isArray(err.detail)) {
      msg = err.detail.map(d => d.msg).join(', ');
    }
    throw new Error(msg);
  }
  return res.json().catch(() => ({}));
}
