/**
 * Main Application Entry Point
 * Handles application initialization, routing (dashboard vs login), and module exports.
 * @module main
 */
import { Auth } from './api.js';
import * as ui from './modules/ui.js';
import * as auth from './modules/auth.js';
import * as catalog from './modules/catalog.js';
import * as library from './modules/library.js';
import * as devices from './modules/devices.js';
import * as profile from './modules/profile.js';
import * as support from './modules/support.js';
import * as notifications from './modules/notifications.js';

// Expose modules to window for inline HTML onclick handlers
Object.assign(window, ui);
Object.assign(window, auth);
Object.assign(window, catalog);
Object.assign(window, library);
Object.assign(window, devices);
Object.assign(window, profile);
Object.assign(window, support);
Object.assign(window, notifications);

/**
 * Initializes the main dashboard view for an authenticated user.
 * Loads user details, sets up UI roles, and triggers background data fetching.
 */
function initDashboard() {
  const user = Auth.user();
  
  // Si no hay usuario autenticado, redirigir al login
  if (!user) return ui.showLogin();
  
  // Mostrar el nombre de usuario en la navegación
  document.getElementById('nav-username').textContent = user.nombre_usuario;
  
  // Determinar y mostrar el rol del usuario
  const rolStr = user.id_rol === 1 ? 'ADMINISTRADOR' : 'USUARIO';
  document.getElementById('nav-role').textContent = rolStr;
  
  // Mostrar u ocultar el botón de acceso administrativo según el rol
  if (user.id_rol === 1) {
    document.getElementById('btn-admin-link').classList.remove('hidden');
  } else {
    document.getElementById('btn-admin-link').classList.add('hidden');
  }

  // Cargar módulos iniciales del panel
  ui.showDashboard();
  library.loadLibrary();
  profile.loadProfile();
  notifications.loadNotifications();
  
  // Polling en segundo plano para notificaciones (cada 30 segundos)
  setInterval(() => {
    if (Auth.isLoggedIn()) {
      notifications.loadNotifications();
    }
  }, 30000);
}

/**
 * Self-invoking function that starts the application setup.
 * Checks authentication status and routes the user to the correct initial view.
 */
(function init() {
  ui.initSearchFilter();
  auth.initAuth();
  
  // Verifica si el usuario ya inició sesión
  if (Auth.isLoggedIn()) {
    initDashboard();
  } else {
    ui.showLogin();
  }
})();
