/**
 * Main Application Entry Point for Admin Dashboard
 * Handles initialization and attaches modules to the global scope.
 * @module main_admin
 */
import { Auth } from './modules/api.js';
import * as adminUi from './modules/admin_ui.js';
import * as adminApi from './modules/admin_api.js';
import * as adminOverview from './modules/admin_overview.js';
import * as adminGames from './modules/admin_games.js';
import * as adminUsers from './modules/admin_users.js';
import * as adminDevices from './modules/admin_devices.js';
import * as adminLicenses from './modules/admin_licenses.js';
import * as adminCodes from './modules/admin_codes.js';
import * as adminRequests from './modules/admin_requests.js';
import * as adminSupport from './modules/admin_support.js';
import * as adminLogs from './modules/admin_logs.js';

// Attach UI / Navigation globals for inline HTML usage
window.showToast = adminUi.showToast;
window.openModal = adminUi.openModal;
window.closeModal = adminUi.closeModal;
window.closeModalOverlay = adminUi.closeModalOverlay;
window.switchSection = adminUi.switchSection;
window.showConfirmModal = adminUi.showConfirmModal;
window.makeBadge = adminUi.makeBadge;
window.logout = adminUi.logout;

// Attach Data/Action globals needed by inline HTML event handlers
window.loadOverview = adminOverview.loadOverview;

window.loadJuegos = adminGames.loadJuegos;
window.editJuego = adminGames.editJuego;
window.submitJuego = adminGames.submitJuego;
window.eliminarJuego = adminGames.eliminarJuego;

window.loadUsuarios = adminUsers.loadUsuarios;
window.abrirCambioEstado = adminUsers.abrirCambioEstado;
window.confirmarCambioEstado = adminUsers.confirmarCambioEstado;
window.submitUsuario = adminUsers.submitUsuario;

window.abrirDispositivosUsuario = adminDevices.abrirDispositivosUsuario;
window.desvincularDispositivo = adminDevices.desvincularDispositivo;

window.loadLicencias = adminLicenses.loadLicencias;
window.revocarLicencia = adminLicenses.revocarLicencia;
window.generarClave = adminLicenses.generarClave;
window.submitLicencia = adminLicenses.submitLicencia;
window.populateLicenciaSelects = adminLicenses.populateLicenciaSelects;

window.autoGenerarCodigo = adminCodes.autoGenerarCodigo;
window.copiarCodigo = adminCodes.copiarCodigo;
window.loadCodigos = adminCodes.loadCodigos;
window.submitCodigo = adminCodes.submitCodigo;

window.loadSolicitudes = adminRequests.loadSolicitudes;
window.aprobarSolicitud = adminRequests.aprobarSolicitud;
window.rechazarSolicitud = adminRequests.rechazarSolicitud;
window.checkPendingRequests = adminRequests.checkPendingRequests;

window.loadSoporte = adminSupport.loadSoporte;
window.checkOpenTickets = adminSupport.checkOpenTickets;
window.resolverTicket = adminSupport.resolverTicket;
window.submitResolverTicket = adminSupport.submitResolverTicket;

window.loadLogs = adminLogs.loadLogs;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Verifica si el usuario está autenticado, sino lo redirige
  if (!Auth.token()) {
    window.location.href = 'index.html';
    return;
  }
  const user = Auth.user();
  if (user) document.getElementById('nav-username').textContent = user.nombre_usuario;
  
  adminOverview.loadOverview();
  
  // Soporte notificaciones en tiempo real (cada 30 seg)
  adminSupport.checkOpenTickets();
  adminRequests.checkPendingRequests();
  
  // Polling general en segundo plano (cada 30 segundos)
  setInterval(() => {
    adminSupport.checkOpenTickets();
    adminRequests.checkPendingRequests();
    
    // Auto-refrescar la tabla actual solo si el admin no tiene un modal abierto
    // Esto evita que la interfaz se reinicie mientras se edita algo
    const isModalOpen = document.querySelectorAll('.modal-overlay:not(.hidden)').length > 0;
    if (!isModalOpen && window.currentAdminSection) {
      switch(window.currentAdminSection) {
        case 'overview': adminOverview.loadOverview(); break;
        case 'juegos': adminGames.loadJuegos(); break;
        case 'usuarios': adminUsers.loadUsuarios(); break;
        case 'licencias': adminLicenses.loadLicencias(); break;
        case 'codigos': adminCodes.loadCodigos(); break;
        case 'solicitudes': adminRequests.loadSolicitudes(); break;
        case 'soporte': adminSupport.loadSoporte(); break;
        case 'logs': adminLogs.loadLogs(); break;
      }
    }
  }, 30000);
});
