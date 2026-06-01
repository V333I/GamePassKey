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

function initDashboard() {
  const user = Auth.user();
  if (!user) return ui.showLogin();
  
  document.getElementById('nav-username').textContent = user.nombre_usuario;
  const rolStr = user.id_rol === 1 ? 'ADMINISTRADOR' : 'USUARIO';
  document.getElementById('nav-role').textContent = rolStr;
  
  if (user.id_rol === 1) {
    document.getElementById('btn-admin-link').classList.remove('hidden');
  } else {
    document.getElementById('btn-admin-link').classList.add('hidden');
  }

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

(function init() {
  ui.initSearchFilter();
  auth.initAuth();
  
  if (Auth.isLoggedIn()) {
    initDashboard();
  } else {
    ui.showLogin();
  }
})();
