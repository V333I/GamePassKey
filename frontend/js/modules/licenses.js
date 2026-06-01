import { ApiLicencias, ApiJuegos } from '../api.js';
import { makeBadge } from './ui.js';

export async function loadLicenses() {
  const list = document.getElementById('licenses-list');
  list.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando licencias...</p></div>`;

  try {
    const [licencias, juegos] = await Promise.all([
      ApiLicencias.misLicencias(),
      ApiJuegos.listar('activo').catch(() => []),
    ]);
    const gamesMap = {};
    juegos.forEach(j => { gamesMap[j.id_juego] = j; });

    if (!licencias.length) {
      list.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <h3>Sin licencias</h3><p>Aún no tienes licencias. Canjea un código en tu biblioteca.</p></div>`;
      return;
    }

    list.innerHTML = '';
    licencias.forEach(lic => {
      const item = document.createElement('div');
      item.className = 'list-item';
      const exp = lic.fecha_expiracion
        ? new Date(lic.fecha_expiracion).toLocaleDateString('es')
        : 'Sin expiración';
      const juego = gamesMap[lic.id_juego];
      item.innerHTML = `
        <div class="list-item-left">
          <div class="list-item-icon">${juego ? juego.titulo.slice(0,2).toUpperCase() : 'GP'}</div>
          <div>
            <div class="list-item-title">${juego ? juego.titulo : `Juego #${lic.id_juego}`}</div>
            <div class="list-item-sub" style="font-family:var(--font-mono);font-size:0.72rem">${lic.clave_licencia}</div>
          </div>
        </div>
        <div class="list-item-right">
          <div class="info-pair"><label>Expira</label><span>${exp}</span></div>
          ${makeBadge(lic.estado)}
        </div>`;
      list.appendChild(item);
    });
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}
