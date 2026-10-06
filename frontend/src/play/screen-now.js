// "O que está na TV agora" — uma regra só para o cabeçalho (📺 Telão) e para
// Jogar › Telão, igual ao que o /tv desenha (src/screen/TVScreen.jsx):
//   combate ativo → mapa + iniciativa; cartão do Mundo aparece sobreposto ao lado;
//                   "Anteriormente…" e cena ficam guardados até o combate acabar.
//   sem combate   → o cartão (entrada, cena, recapitulação) ou a capa.
// Sem React; testado em tests/play-model.test.js.
import { screenMode } from '../player/player-model.js';

/**
 * @returns {{ mode: 'combat'|'recap'|'card'|'rest', round: number|null,
 *            card: object|null, overlay: object|null, waiting: object|null }}
 *   card    — cartão em destaque (fora do combate)
 *   overlay — cartão do Mundo mostrado junto do combate
 *   waiting — cartão escolhido que só aparece quando o combate acabar
 */
export function screenNow({ combat, card } = {}) {
  const mode = screenMode({ combat, card });
  const c = card || null;
  if (mode === 'combat') {
    const overlay = c && c.type === 'entry' ? c : null;
    return { mode, round: combat?.round ?? null, card: null, overlay, waiting: c && !overlay ? c : null };
  }
  return { mode, round: null, card: mode === 'rest' ? null : c, overlay: null, waiting: null };
}

/** Rótulo do tipo do cartão no idioma da tela. */
export function cardKind(card, lang) {
  if (!card) return '';
  return (lang === 'en' ? (card.kindLabelEn || card.kindLabel) : card.kindLabel) || '';
}
