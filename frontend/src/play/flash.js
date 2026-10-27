// Aviso curto na tela ("Thalion recebeu Poção de Cura"), independente do ciclo
// de vida do React: continua visível mesmo quando o modal que o chamou fecha.
// Um por vez. Com `action` ({label, onClick}) ganha um botão de 44 px — o
// "↶ Desfazer" dos avisos reversíveis (princípio 5: fazer agora, desfazer depois).
import './play-styles.css';

let current = null;

export function flash(message, { error = false, ms, action = null } = {}) {
  if (typeof document === 'undefined' || !message) return;
  try {
    if (current) { current.remove(); current = null; }
    const el = document.createElement('div');
    el.className = `play-flash${error ? ' is-error' : ''}${action ? ' has-action' : ''}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    const text = document.createElement('span');
    text.className = 'play-flash-text';
    text.textContent = message;
    el.appendChild(text);
    if (action?.label && action.onClick) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'play-flash-act';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        el.remove();
        if (current === el) current = null;
        action.onClick();
      });
      el.appendChild(btn);
    }
    document.body.appendChild(el);
    current = el;
    setTimeout(() => { el.remove(); if (current === el) current = null; }, ms ?? (action ? 6000 : 2600));
  } catch { /* sem DOM: ignora */ }
}

export default flash;
