// Regras puras do toast de revelação do jogador (RevealToast.jsx).
//
// Dois caminhos podem avisar a mesma revelação: o cartão do telão e o
// contador worldNewCount. Para não duplicar sem engolir revelações novas:
//   • cada revelação é identificada por `id@revealedAt` (o servidor renova
//     revealedAt quando o cartão sobe de nível ou um segredo é revelado);
//   • um cartão mostrado no telão cobre só as revelações daquele cartão que
//     aconteceram ATÉ o instante do telão (card.at, hora do servidor).
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
