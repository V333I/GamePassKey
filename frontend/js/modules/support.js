import { apiFetch } from '../api.js';
import { showToast, closeModal } from './ui.js';

export async function enviarSoporte(event) {
  event.preventDefault();
  const asunto = document.getElementById('soporte-asunto').value;
  const mensaje = document.getElementById('soporte-mensaje').value;

  try {
    await apiFetch('/soporte', {
      method: 'POST',
      body: JSON.stringify({ asunto, mensaje })
    });
    showToast('Tu mensaje ha sido enviado correctamente al administrador.');
    closeModal('modal-soporte');
    document.getElementById('form-soporte').reset();
  } catch (error) {
    showToast('Error al enviar mensaje: ' + error.message, 'error');
  }
}
