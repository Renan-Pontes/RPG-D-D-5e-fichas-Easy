// Aviso curto na tela ("Thalion recebeu Poção de Cura"), independente do ciclo
// de vida do React: continua visível mesmo quando o modal que o chamou fecha.
import './play-styles.css';

let current = null;

export function flash(message, { error = false, ms = 2600 } = {}) {
  if (typeof document === 'undefined' || !message) return;
  try {
    if (current) { current.remove(); current = null; }
    const el = document.createElement('div');
    el.className = `play-flash${error ? ' is-error' : ''}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = message;
    document.body.appendChild(el);
    current = el;
    setTimeout(() => { el.remove(); if (current === el) current = null; }, ms);
  } catch { /* sem DOM: ignora */ }
}

export default flash;
