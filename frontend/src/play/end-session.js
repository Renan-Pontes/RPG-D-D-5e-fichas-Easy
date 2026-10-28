// A folha "ENCERRAR A SESSÃO N" (V12, especificação §4.9 e W7) — lógica pura, sem React
// (testada em tests/end-session.test.js):
//   ENCERRAR A SESSÃO 4 · 2h10
//   ☑ Encerrar o combate (rodada 3 · Goblin ×2 de pé)    ← só com combate
//   ☑ Limpar a Tela (volta para a capa; tira o teste)
//   ☑ Fechar os testes abertos (1)                        ← só se há
//   ☑ Levar para a Sessão 5: 1 cena, 6 pistas, 4 pessoas ← só com o plano desta sessão
//   Quem teve um momento hoje?  (Pipo ✓) (Dagna) …
//   [Continuar jogando] [Encerrar] [Encerrar e escrever o resumo]
// O toque em Encerrar manda tudo numa chamada (POST …/diary/sessions/:n/end, `endBody`);
// num servidor de antes dela (404 em HTML), `oldServerSteps` diz o que dá para fazer com as
// rotas que ele já tem (o resto a folha avisa que falta atualizar).
import { playedScenes } from '../campaigns/diary-summary.js';

const tt = (lang, pt, en) => (lang === 'en' ? en : pt);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const filled = (s) => typeof s === 'string' && s.trim().length > 0;
const sceneName = (s) => String(s?.text || '').split('\n')[0].trim();
const realScene = (s) => !!s && (filled(sceneName(s)) || !!s.nodeRef);
const realSecret = (s) => !!s && (filled(s.text) || !!s.ref);
const baseName = (n) => String(n || '?').replace(/\s*#\d+$/, '').trim() || '?';

/** "Encerrar a Sessão 4 · 2h10" (sem o relógio, só o número). */
export function endTitle(n, length, lang = 'pt') {
  const head = tt(lang, `Encerrar a Sessão ${n}`, `End session ${n}`);
  return length ? `${head} · ${length}` : head;
}

/**
 * O resumo do combate para a linha da folha: "rodada 3 · Goblin ×2 de pé" (o mesmo monstro)
 * ou "rodada 3 · 3 monstros de pé". `combat` = o do pulso ({active, round, order}).
 */
export function combatLine(combat, lang = 'pt') {
  if (!combat?.active) return '';
  const standing = (combat.order || []).filter(o => o.kind === 'monster' && !o.defeated);
  const round = Number.isInteger(combat.round) ? tt(lang, `rodada ${combat.round}`, `round ${combat.round}`) : '';
  let foes = '';
  if (standing.length) {
    const names = [...new Set(standing.map(o => baseName(o.name)))];
    foes = names.length === 1
      ? `${names[0]}${standing.length > 1 ? ` ×${standing.length}` : ''} ${tt(lang, 'de pé', 'standing')}`
      : tt(lang, `${standing.length} monstros de pé`, `${standing.length} monsters standing`);
  } else if ((combat.order || []).some(o => o.kind === 'monster')) {
    foes = tt(lang, 'todos os monstros caíram', 'all monsters are down');
  }
  return [round, foes].filter(Boolean).join(' · ');
}

/**
 * O que "Levar para a Sessão N+1" leva (a mesma regra do servidor, world_rules.plan_leftovers):
 * as cenas não feitas, as pistas não achadas, as pessoas e os lugares. null = não é o plano
 * desta sessão (já é o da próxima, ou não há o que levar nem o que arquivar).
 */
export function carryCounts(plan, n) {
  if (!plan) return null;
  const fs = Number.isInteger(plan.forSession) ? plan.forSession : null;
  if (fs && fs > n) return null;
  return leftoverCounts(plan);
}

/** O que sobrou de um plano (o ⋯ do Plano › "Começar o plano da Sessão N" também mostra); null = plano em branco. */
export function leftoverCounts(plan) {
  if (!plan) return null;
  const scenes = (plan.scenes || []).filter(s => realScene(s) && !s.done).length;
  const clues = (plan.secrets || []).filter(s => realSecret(s) && !s.discovered).length;
  const people = (plan.npcIds || []).length;
  const places = (plan.placeIds || []).length;
  const any = (plan.scenes || []).some(realScene) || (plan.secrets || []).some(realSecret) || people || places
    || filled(plan.strongStart) || filled(plan.monsters) || filled(plan.rewards);
  return any ? { scenes, clues, people, places } : null;
}

/** "1 cena, 6 pistas, 4 pessoas e 1 lugar" (o que for zero sai; nada → "nada sobrou"). */
export function carryText(c, lang = 'pt') {
  const parts = [];
  if (c.scenes) parts.push(tt(lang, plural(c.scenes, 'cena', 'cenas'), plural(c.scenes, 'scene', 'scenes')));
  if (c.clues) parts.push(tt(lang, plural(c.clues, 'pista', 'pistas'), plural(c.clues, 'clue', 'clues')));
  if (c.people) parts.push(tt(lang, plural(c.people, 'pessoa', 'pessoas'), plural(c.people, 'person', 'people')));
  if (c.places) parts.push(tt(lang, plural(c.places, 'lugar', 'lugares'), plural(c.places, 'place', 'places')));
  if (!parts.length) return tt(lang, 'nada sobrou', 'nothing left');
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} ${tt(lang, 'e', 'and')} ${parts[parts.length - 1]}`;
}

/**
 * As caixas da folha, na ordem, todas marcadas: [{id, label, sub}]. `openChecks` = testes
 * abertos (null = não se sabe: a caixa aparece sem o número).
 */
export function endRows({ n, combat = null, openChecks = null, plan = null, lang = 'pt' } = {}) {
  const rows = [];
  if (combat?.active) {
    rows.push({ id: 'endCombat', label: tt(lang, 'Encerrar o combate', 'End combat'), sub: combatLine(combat, lang) });
  }
  rows.push({ id: 'clearStage', label: tt(lang, 'Limpar a Tela', 'Clear the screen'),
    sub: tt(lang, 'volta para a capa; tira o teste', 'back to the cover; the check goes away') });
  if (openChecks == null || openChecks > 0) {
    rows.push({ id: 'closeChecks', label: openChecks ? tt(lang, `Fechar os testes abertos (${openChecks})`, `Close open checks (${openChecks})`)
      : tt(lang, 'Fechar os testes abertos', 'Close open checks'), sub: '' });
  }
  const carry = carryCounts(plan, n);
  if (carry) {
    rows.push({ id: 'carry', label: tt(lang, `Levar para a Sessão ${n + 1}`, `Carry to session ${n + 1}`),
      sub: `${carryText(carry, lang)} · ${tt(lang, 'o plano de hoje fica guardado na Crônica', "today's plan is kept in the Chronicle")}` });
  }
  return rows;
}

/**
 * "Quem teve um momento hoje?": um chip por personagem da mesa. Marcado de início quem tem
 * um momento ligado a uma cena jogada hoje (feita nesta sessão ou a de "agora"); já marcado na sessão
 * (`done === n`) fica ✓ e travado. O chip leva o momento em aberto que o toque marca (o da
 * cena jogada, senão o 1º em aberto); sem nenhum, o servidor cria um ★ "Sessão N".
 * → [{charId, name, momentId, text, on, locked}]
 */
export function momentChips({ members = [], spotlights = {}, plan = null, sceneId = null, doneBefore = null, n = null } = {}) {
  const played = new Set(playedScenes(plan, sceneId, doneBefore).map(s => s.id));
  return (members || []).filter(m => m.role !== 'dm' && m.character?.id).map(m => {
    const list = spotlights?.[String(m.character.id)] || [];
    const today = list.find(x => x.done != null && x.done === n);
    const open = list.filter(x => x.done == null);
    const pick = open.find(x => x.plan && played.has(x.plan)) || open[0] || null;
    return {
      charId: m.character.id, name: m.character.name || '?', momentId: today ? today.id : pick?.id || null,
      text: (today || pick)?.text || '', on: !!today || !!(pick?.plan && played.has(pick.plan)), locked: !!today,
    };
  });
}

/** As caixas como começam: todas marcadas ({id: true}). */
export const initialChecks = (rows) => Object.fromEntries((rows || []).map(r => [r.id, true]));

/**
 * O corpo do POST …/end. `checks` = {id: marcado} das caixas (initialChecks + toques); a que
 * não aparece vale "sim" (sem combate, sem teste aberto: o servidor não tem o que fazer),
 * menos "Levar", que só vai com a caixa. `chips` = os de momentChips com o `on` de agora.
 */
export function endBody(checks, chips = [], { n = null, lang = 'pt' } = {}) {
  const on = (id) => checks?.[id] !== false;
  return {
    endCombat: on('endCombat'), clearStage: on('clearStage'), closeChecks: on('closeChecks'), carry: checks?.carry === true,
    moments: chips.filter(c => c.on && !c.locked).map(c => (c.momentId ? { charId: c.charId, id: c.momentId }
      : { charId: c.charId, text: tt(lang, `Teve um momento na Sessão ${n}`, `Had a moment in session ${n}`) })),
  };
}

/**
 * Servidor sem o POST …/end (404 em HTML): o que a folha ainda faz com as rotas antigas, na
 * ordem — o combate, os testes e a Tela antes de desligar o "ao vivo" (como antes). O plano
 * não é arquivado nem levado (o servidor não sabe guardar) e os momentos ficam.
 * → ['combat', 'checks', 'stage', 'live']
 */
export function oldServerSteps(body, { combatActive = false } = {}) {
  const out = [];
  if (body.endCombat && combatActive) out.push('combat');
  if (body.closeChecks) out.push('checks');
  if (body.clearStage) out.push('stage');
  out.push('live');
  return out;
}
