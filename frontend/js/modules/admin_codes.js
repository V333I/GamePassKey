import { Auth } from './api.js';
import { api } from './admin_api.js';
import { showToast, closeModal } from './admin_ui.js';

/**
 * Función: autoGenerarCodigo.
 * (Documentación autogenerada)
 * @function autoGenerarCodigo
 */
export function autoGenerarCodigo() {
  document.getElementById('c-codigo').value = '';
  document.getElementById('codigo-preview-text').textContent = 'GENERADO DE FORMA SEGURA POR EL SERVIDOR';
}

/**
 * Función: copiarCodigo.
 * (Documentación autogenerada)
 * @function copiarCodigo
 */
export function copiarCodigo() {
  const code = document.getElementById('codigo-preview-text').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Código copiado al portapapeles');
  }).catch(() => {
    showToast('No se pudo copiar automáticamente', 'error');
  });
}

/**
 * Función: loadCodigos.
 * (Documentación autogenerada)
 * @function loadCodigos
 */
export async function loadCodigos() {
  const wrap  = document.getElementById('codigos-table-wrap');
  const estado = document.getElementById('codigos-estado-filter')?.value || '';
  wrap.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando códigos...</p></div>`;

  try {
    const url = `/codigos/${estado ? `?estado=${estado}` : ''}`;
    const codigos = await api(url);

    const total      = codigos.length;
    const disponible = codigos.filter(c => c.estado === 'disponible').length;
    const usado      = codigos.filter(c => c.estado === 'usado').length;
    const expirado   = codigos.filter(c => c.estado === 'expirado').length;
    document.getElementById('cs-total').textContent      = total;
    document.getElementById('cs-disponibles').textContent = disponible;
    document.getElementById('cs-usados').textContent      = usado;
    document.getElementById('cs-expirados').textContent   = expirado;

    if (!codigos.length) {
      wrap.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>
        <h3>Sin códigos</h3>
        <p>Genera el primer código con el botón "Generar Código".</p></div>`;
      return;
    }

    const estadoBadge = (e) => {
      const map = { disponible: 'codigo-disponible', usado: 'codigo-usado', expirado: 'codigo-expirado' };
      return `<span class="badge ${map[e] || ''} level-badge">${e?.toUpperCase()}</span>`;
    };

    wrap.innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>ID</th>
          <th>Código</th>
          <th>Licencia</th>
          <th>Estado</th>
          <th>Generado</th>
          <th>Expira</th>
          <th>Usado</th>
          <th>Acciones</th>
        </tr></thead>
        <tbody>${codigos.map(c => `
          <tr>
            <td><span style="font-family:var(--font-mono);color:var(--text-muted)">#${c.id_codigo}</span></td>
            <td>
              <span style="font-family:var(--font-mono);font-size:0.8rem;letter-spacing:0.08em;color:var(--accent-cyan)">${c.codigo}</span>
            </td>
            <td><span style="font-family:var(--font-mono)">#${c.id_licencia}</span></td>
            <td>${estadoBadge(c.estado)}</td>
            <td style="color:var(--text-muted);font-size:0.75rem">${new Date(c.fecha_generacion).toLocaleString('es')}</td>
            <td style="color:var(--text-muted);font-size:0.75rem">${new Date(c.fecha_expiracion).toLocaleString('es')}</td>
            <td style="color:var(--text-muted);font-size:0.75rem">${c.fecha_uso ? new Date(c.fecha_uso).toLocaleString('es') : '—'}</td>
            <td><div class="table-actions">
              <button class="btn-icon" title="Copiar código" onclick="navigator.clipboard.writeText('${c.codigo}').then(()=>showToast('Código copiado'))">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    console.error('Códigos:', err.message);
  }
}

/**
 * Función: submitCodigo.
 * (Documentación autogenerada)
 * @function submitCodigo
 */
export async function submitCodigo(e) {
  e.preventDefault();
  const errEl  = document.getElementById('form-codigo-error');
  const errMsg = document.getElementById('form-codigo-error-msg');
  const btnText = document.querySelector('#btn-submit-codigo .btn-text');
  const btnLoad = document.querySelector('#btn-submit-codigo .btn-loader');
  errEl.classList.add('hidden');

  const codigo    = document.getElementById('c-codigo').value.trim();
  const idJuego = parseInt(document.getElementById('c-juego').value);
  const expiracion = document.getElementById('c-expiracion').value;

  if (!idJuego) { errMsg.textContent = 'Selecciona un juego.'; errEl.classList.remove('hidden'); return; }
  if (!idJuego) { errMsg.textContent = 'Selecciona un juego.'; errEl.classList.remove('hidden'); return; }
  if (!expiracion) { errMsg.textContent = 'La fecha de expiración es obligatoria.'; errEl.classList.remove('hidden'); return; }

  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');

  try {
    const nuevaLicencia = await api('/licencias', {
      method: 'POST',
      body: JSON.stringify({
        id_usuario: Auth.user().id_usuario,
        id_juego: idJuego,
        clave_licencia: codigo || null,
        fecha_expiracion: new Date(expiracion).toISOString()
      })
    });

    const resCodigo = await api('/codigos/generar', {
      method: 'POST',
      body: JSON.stringify({
        codigo: codigo || null,
        id_licencia: nuevaLicencia.id_licencia,
        fecha_expiracion: new Date(expiracion).toISOString(),
      }),
    });
    showToast(`Código "${resCodigo.codigo}" generado correctamente.`);
    closeModal('modal-codigo');
    document.getElementById('form-codigo').reset();
    document.getElementById('codigo-preview-text').textContent = 'XXXX-XXXX-XXXX-XXXX';
    loadCodigos();
  } catch (err) {
    errMsg.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
  }
}
