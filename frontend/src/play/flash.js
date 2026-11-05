// Aviso curto na tela ("Thalion recebeu Poção de Cura"), independente do ciclo
// de vida do React: continua visível mesmo quando o modal que o chamou fecha.
// Um por vez. Com `action` ({label, onClick}) ganha um botão de 44 px — o
// "↶ Desfazer" dos avisos reversíveis (princípio 5: fazer agora, desfazer depois).
// `short` (e `action.short`): a forma curta que o CSS mostra no aviso apertado do
// celular de 320 px ("✓ Vale de Brumafria" e "↶"); o botão guarda o nome inteiro no
// aria-label. `long`: o aviso que não cabe em 2 linhas no celular ("substitui X, que
// esperava o fim do combate"): lá ele ganha até 4 linhas, com o botão embaixo (stage.css).
import './play-styles.css';

let current = null;

// O texto com a forma curta ao lado (uma das duas aparece, pelo CSS).
function twoForms(parent, long, short) {
  if (!short || short === long) { parent.textContent = long; return; }
  for (const [cls, txt] of [['play-flash-long', long], ['play-flash-short', short]]) {
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = txt;
    parent.appendChild(span);
  }
}

export function flash(message, { error = false, ms, action = null, short = '', long = false } = {}) {
  if (typeof document === 'undefined' || !message) return;
  try {
    if (current) { current.remove(); current = null; }
    const el = document.createElement('div');
    el.className = `play-flash${error ? ' is-error' : ''}${action ? ' has-action' : ''}${long ? ' is-long' : ''}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    const text = document.createElement('span');
    text.className = 'play-flash-text';
    twoForms(text, message, short);
    el.appendChild(text);
    if (action?.label && action.onClick) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'play-flash-act';
      twoForms(btn, action.label, action.short);
      if (action.short && action.short !== action.label) btn.setAttribute('aria-label', action.label);
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
