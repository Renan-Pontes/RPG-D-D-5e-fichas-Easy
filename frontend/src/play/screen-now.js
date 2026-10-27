// "O que está na Tela agora" — INVÓLUCRO. A regra única mora em
// src/stage/stage-now.js (o palco: frente, fundo e sobreposições), usada pela
// TV, por Jogar › Tela, pelo 📺 do cabeçalho e pela Mesa do jogador.
// Fica aqui a regra antiga, só do cartão (`screenCard`), para quem ainda não
// tem o palco (resposta de um servidor antigo):
//   combate ativo → mapa; cartão do Mundo aparece sobreposto ao lado;
//                   "Anteriormente…" e cena ficam guardados até o combate acabar.
//   sem combate   → o cartão (entrada, cena, recapitulação) ou a capa.
// Sem React; testado em tests/play-model.test.js.
import { screenMode } from '../player/player-model.js';

export { stageNow, screenLine } from '../stage/stage-now.js';

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
