// Encaixe medido do texto da TV (V9). A TV não rola: em vez de cortar com reticências
// ou line-clamp, cada elemento marcado com `data-fit="<escala mínima>"` tem a letra
// reduzida em passos (CSS: `font-size: calc(var(--fit, 1) * …cqw)`, com o piso de
// legibilidade `--tv-min` em tv-styles.css) até caber na própria caixa. Com
// `data-fit-cols="2"`, se nem a menor letra cabe, o texto passa a 2 colunas (e 3, se
// pedir; classe `.is-fit-cols` e `--fit-cols`) e mede de novo. Se ainda não cabe, ganha
// `.is-fit-over` e mede outra vez (o CSS de cada um decide: o nome ganha mais uma linha;
// o texto longo termina num degradê) e, no fim, `.is-fit-free` na menor letra.
// Os pequenos (nomes, `data-fit` sem colunas) encaixam primeiro: a altura deles muda o
// espaço que sobra para os textos grandes. DOM puro, sem React; a conta é bestScale
// (tv-logic.js, testada).
import { bestScale } from './tv-logic.js';

// Cabe = nada passa da caixa: sem coluna a mais à direita (scrollWidth) e, com
// parágrafos, o pé de cada um dentro da área do texto (a margem do último de cada
// coluna não conta); texto sem parágrafos, pela altura. 1 px de folga no arredondamento
// dos nomes; o texto longo mede sem folga, senão a última linha perde o pé das letras.
// Mede pelo offset* (posição do layout): os parágrafos do recap entram subindo
// (transform) e o retângulo na tela ainda está deslocado quando a TV mede.
function fits(el, slack) {
  if (el.scrollWidth > el.clientWidth + slack) return false;
  if (!el.children.length || el.children[0].offsetParent !== el.offsetParent) return el.scrollHeight <= el.clientHeight + slack;
  const limit = el.offsetTop + el.clientTop + el.clientHeight - parseFloat(getComputedStyle(el).paddingBottom || 0);
  for (const kid of el.children) {
    if (kid.offsetTop + kid.offsetHeight > limit + slack) return false;
  }
  return true;
}

export function fitText(el) {
  const min = parseFloat(el.dataset.fit) || 0.5;
  const maxCols = Math.max(1, parseInt(el.dataset.fitCols, 10) || 1);
  const slack = el.dataset.fitCols ? 0 : 1;
  el.classList.remove('is-fit-over', 'is-fit-free');
  for (let cols = 1; cols <= maxCols; cols++) {
    el.style.setProperty('--fit-cols', String(cols));
    el.classList.toggle('is-fit-cols', cols > 1);
    const scale = bestScale((s) => { el.style.setProperty('--fit', String(s)); return fits(el, slack); }, { min });
    if (scale != null) { el.style.setProperty('--fit', String(scale)); return scale; }
  }
  // Não coube: `.is-fit-over` (o CSS de cada um afrouxa: o nome ganha uma linha) e mede de
  // novo; se nem assim, fica na menor letra com `.is-fit-free` (sem limite de altura).
  el.classList.add('is-fit-over');
  const relaxed = bestScale((s) => { el.style.setProperty('--fit', String(s)); return fits(el, slack); }, { min });
  if (relaxed != null) { el.style.setProperty('--fit', String(relaxed)); return relaxed; }
  el.style.setProperty('--fit', String(min));
  el.classList.add('is-fit-free');
  return min;
}

export function fitAll(root) {
  if (!root) return;
  const all = [...root.querySelectorAll('[data-fit]')];
  for (const el of all.filter(e => !e.dataset.fitCols)) fitText(el);
  for (const el of all.filter(e => e.dataset.fitCols)) fitText(el);
}
