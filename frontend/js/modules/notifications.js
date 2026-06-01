import { apiFetch } from '../api.js';
import { showToast } from './ui.js';
import { openRedeemModal } from './library.js';

export let notificacionesActivas = [];

export async function loadNotifications() {
  try {
    const res = await apiFetch('/notificaciones');
    notificacionesActivas = res || [];
    updateNotificationBell();
  } catch (err) {
    console.error("Error cargando notificaciones:", err);
  }
}

export function updateNotificationBell() {
  const dot = document.getElementById('notification-dot');
  if(!dot) return;
  const noLeidas = notificacionesActivas.filter(n => !n.leida).length;
  if (noLeidas > 0) {
    dot.classList.remove('hidden');
  } else {
    dot.classList.add('hidden');
  }
}

export function toggleNotifications() {
  const modal = document.getElementById('modal-notifications');
  if (modal.classList.contains('hidden')) {
    modal.classList.remove('hidden');
    renderNotifications();
  } else {
    modal.classList.add('hidden');
  }
}

export function closeNotifications() {
  document.getElementById('modal-notifications').classList.add('hidden');
}

export function renderNotifications() {
  const list = document.getElementById('notifications-list');
  if (!notificacionesActivas.length) {
    list.innerHTML = `<div class="empty-state"><p>No tienes notificaciones.</p></div>`;
    return;
  }
  
  list.innerHTML = notificacionesActivas.map(n => {
    const codeMatch = n.mensaje.match(/GPK-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
    let codeHtml = '';
    if (codeMatch) {
      const code = codeMatch[0];
      codeHtml = `
        <div style="margin-top: 12px; padding: 12px; background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
          <code style="color: #00d4ff; font-weight: 600; font-family: monospace; font-size: 0.9rem; letter-spacing: 1px;">${code}</code>
          <div style="display: flex; gap: 6px;">
            <button onclick="event.stopPropagation(); window.markAsRead(${n.id_notificacion}, this.closest('.notification-item')); navigator.clipboard.writeText('${code}').then(()=>window.showToast('Código copiado'));" class="btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.7rem;">Copiar</button>
            <button onclick="event.stopPropagation(); window.markAsRead(${n.id_notificacion}, this.closest('.notification-item')); window.closeNotifications(); document.getElementById('redeem-codigo').value='${code}'; window.openRedeemModal();" class="btn-primary btn-sm" style="padding: 4px 8px; font-size: 0.7rem;">Canjear</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="notification-item ${n.leida ? 'read' : 'unread'}" style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;" onclick="window.markAsRead(${n.id_notificacion}, this)">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <strong style="color: ${n.leida ? 'var(--text-muted)' : 'var(--accent-blue)'};">${n.titulo}</strong>
          ${!n.leida ? '<span style="width:8px;height:8px;background:var(--accent-orange);border-radius:50%;display:inline-block;"></span>' : ''}
        </div>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin:0; line-height: 1.4;">${n.mensaje}</p>
        ${codeHtml}
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:8px;">
          ${new Date(n.fecha_creacion).toLocaleString('es')}
        </div>
      </div>
    `;
  }).join('');
}

export async function markAsRead(id, el) {
  try {
    await apiFetch(`/notificaciones/${id}/leer`, { method: 'PUT' });
    const notif = notificacionesActivas.find(n => n.id_notificacion === id);
    if (notif) notif.leida = 1;
    updateNotificationBell();
    
    el.classList.remove('unread');
    el.classList.add('read');
    const strong = el.querySelector('strong');
    if (strong) strong.style.color = 'var(--text-muted)';
    const dot = el.querySelector('span');
    if (dot) dot.remove();
    
  } catch (err) {
    console.error("Error al marcar como leída", err);
  }
}
