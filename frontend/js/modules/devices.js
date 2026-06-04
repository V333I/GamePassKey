import { ApiDispositivos } from '../api.js';
import { makeBadge, showToast } from './ui.js';

export async function loadDevices() {
  const list = document.getElementById('devices-list');
  list.innerHTML = `<div class="loading-state"><div class="spinner-large"></div><p>Cargando dispositivos...</p></div>`;

  try {
    const dispositivos = await ApiDispositivos.misDispositivos();
    const btnRegister = document.getElementById('btn-show-register-device');
    
    if (dispositivos.length >= 2) {
      btnRegister.disabled = true;
      btnRegister.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Límite Alcanzado (2/2)`;
      btnRegister.style.opacity = '0.5';
      btnRegister.style.cursor = 'not-allowed';
    } else {
      btnRegister.disabled = false;
      btnRegister.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Registrar Dispositivo`;
      btnRegister.style.opacity = '1';
      btnRegister.style.cursor = 'pointer';
    }

    if (!dispositivos.length) {
      list.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        <h3>Sin dispositivos</h3><p>No tienes dispositivos registrados.</p></div>`;
      return;
    }

    list.innerHTML = '';
    dispositivos.forEach(d => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div class="list-item-left">
          <div class="list-item-title">${d.nombre_dispositivo || 'Dispositivo sin nombre'}</div>
          <div class="list-item-sub">${d.sistema_operativo || '—'} · HW: ${d.hardware_id.slice(0, 20)}…</div>
        </div>
        <div class="list-item-right">
          <div class="info-pair">
            <label>Último uso</label>
            <span>${d.ultimo_uso ? new Date(d.ultimo_uso).toLocaleDateString('es') : '—'}</span>
          </div>
          ${makeBadge(d.estado)}
          ${d.estado === 'autorizado' ? `<button class="btn-logout" style="padding:4px 8px; font-size:0.8rem; margin-left: 10px; border-color: rgba(255, 107, 53, 0.3); color: var(--accent-orange)" onclick="desvincularDispositivo(${d.id_dispositivo}, event)">Desvincular</button>` : ''}
        </div>`;
      list.appendChild(item);
    });
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

export function showRegisterDevice() {
  document.getElementById('modal-register-device').classList.remove('hidden');
  document.getElementById('reg-dev-error').classList.add('hidden');
  
  document.getElementById('reg-dev-name').value = '';
  document.getElementById('reg-dev-hwid').value = 'HWID-' + Math.random().toString(36).substring(2, 12).toUpperCase();
  
  const ua = navigator.userAgent;
  const osSelect = document.getElementById('reg-dev-os');
  if (ua.indexOf("Windows") !== -1) {
    osSelect.value = 'Windows 11'; 
  }
}

export function closeRegisterDevice() {
  document.getElementById('modal-register-device').classList.add('hidden');
}

export async function submitRegisterDevice(event) {
  event.preventDefault();
  const name = document.getElementById('reg-dev-name').value.trim();
  const hwid = document.getElementById('reg-dev-hwid').value;
  const os = document.getElementById('reg-dev-os').value;
  
  const errEl = document.getElementById('reg-dev-error');
  const errMsg = document.getElementById('reg-dev-error-msg');
  const btn = document.getElementById('btn-reg-dev');
  const btnText = btn.querySelector('.btn-text');
  const btnLoad = btn.querySelector('.btn-loader');

  errEl.classList.add('hidden');
  btnText.classList.add('hidden');
  btnLoad.classList.remove('hidden');
  btn.disabled = true;

  try {
    await ApiDispositivos.registrar({
      nombre_dispositivo: name,
      hardware_id: hwid,
      sistema_operativo: os
    });
    
    showToast('Dispositivo registrado correctamente');
    closeRegisterDevice();
    loadDevices();
  } catch (err) {
    errMsg.textContent = err.message || 'Error al registrar el dispositivo.';
    errEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    btnLoad.classList.add('hidden');
    btn.disabled = false;
  }
}

export async function desvincularDispositivo(id, event) {
  const btn = event ? event.target.closest('button') : null;
  const oldText = btn ? btn.innerHTML : 'Desvincular';
  
  if (btn) {
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px"></span>';
    btn.disabled = true;
  }
  
  try {
    await ApiDispositivos.desvincular(id);
    showToast('Dispositivo desvinculado con éxito.', 'success');
    loadDevices();
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) {
      btn.innerHTML = oldText;
      btn.disabled = false;
    }
  }
}

window.desvincularDispositivo = desvincularDispositivo;
