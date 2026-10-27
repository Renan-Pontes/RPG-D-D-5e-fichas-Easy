// Regras puras do toast de revelação do jogador (RevealToast.jsx).
//
// Dois caminhos podem avisar a mesma revelação: o cartão da Tela e o
// contador worldNewCount. Para não duplicar sem engolir revelações novas:
//   • cada revelação é identificada por `id@revealedAt` (o servidor renova
//     revealedAt quando o cartão sobe de nível ou um segredo é revelado);
//   • um cartão mostrado na Tela cobre só as revelações daquele cartão que
//     aconteceram ATÉ o instante da Tela (card.at, hora do servidor);
//   • MOSTRAR não é revelar (D9): o cartão da Tela só avisa quando a revelação
//     foi feita junto com o "mostrar" ("👁 Revelar e mostrar"), isto é, quando
//     card.revealedAt está a até 2 min antes de card.at.
import { revealedSince } from './player-model.js';

const ts = (iso) => (iso ? Date.parse(iso) : NaN);

export const revealKey = (entry) => `${entry?.id}@${entry?.revealedAt || ''}`;

/**
 * Entradas que merecem toast agora, mais novas primeiro.
 *   entries    lista leve do Mundo do jogador
 *   seenAt     última visita ao Mundo (r.seenAt)
 *   max        quantas revelações novas o contador indicou (count - prev)
 *   toasted    Set de revealKey() já avisadas nesta sessão
 *   shownCards Map entryId → card.at dos cartões já toastados pelo telão
 */
export function freshReveals(entries, seenAt, max, toasted = new Set(), shownCards = new Map()) {
  const n = Math.max(0, Math.floor(Number(max) || 0));
  if (!n) return [];
  return revealedSince(entries, seenAt)
    .filter(e => !toasted.has(revealKey(e)))
    .filter(e => {
      const shownAt = ts(shownCards.get(e.id));
      if (!Number.isFinite(shownAt)) return true;
      const r = ts(e.revealedAt);
      return Number.isFinite(r) && r > shownAt;
    })
    .slice(0, n);
}

export const REVEAL_SHOW_WINDOW_MS = 120_000;

/**
 * O cartão da Tela é uma revelação de verdade? (D9) Só quando o cartão foi
 * revelado junto com o "mostrar": revealedAt entre card.at − 2 min e card.at
 * (com 5 s de folga para relógios). Mostrar um cartão revelado há mais tempo
 * não avisa — o jogador já foi avisado quando ele foi revelado.
 */
export function isRevealShow(card, windowMs = REVEAL_SHOW_WINDOW_MS) {
  if (!card || card.type !== 'entry') return false;
  const at = ts(card.at);
  const rev = ts(card.revealedAt);
  if (!Number.isFinite(at) || !Number.isFinite(rev)) return false;
  return rev <= at + 5000 && at - rev <= windowMs;
}

/** Chave da revelação do cartão da Tela (a mesma de revealKey para a entrada). */
export const cardRevealKey = (card) => `${card?.entryId}@${card?.revealedAt || ''}`;
