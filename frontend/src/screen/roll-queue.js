// Fila de rolagens da Tela (V10, especificação §5.4) — "as roladas acontecem nela".
// Lógica pura (sem React); testada em tests/roll-queue.test.js.
//
// O servidor manda, a cada GET da Tela, a JANELA das rolagens públicas dos
// últimos 90 s pelo relógio DELE (`rolls`, em ordem (resolved_at, id)) e a hora
// dele (`now`). Aqui:
//   · ao abrir, tudo o que já está na janela é marcado como visto (a TV reaberta
//     não reprisa nada);
//   · cada rolagem nova entra UMA vez (ids vistos, em memória);
//   · "grande" (o dado 3D no centro) só com menos de 10 s pelo relógio do
//     servidor (now − at; o relógio da TV não conta) e se for das que importam:
//     crítico/falha, ataque e salvaguarda de monstro, 🎲 do mestre "Na tela",
//     "📺 Rolar e mostrar" e 20/1 de teste; o resto vai ao FEED (até 4 linhas
//     pequenas no canto, que somem 12 s depois de chegar à TV, pelo relógio dela);
//   · as grandes vão em fila: 8 s cada, ou 4 s quando há mais de uma esperando;
//   · enquanto há dado grande o feed fica escondido e o relógio dele PARA
//     (`feedHeldAt`): os 12 s de cada linha só contam com ela à vista, então uma
//     fila de dados grandes não faz linha nenhuma sumir sem ter aparecido.
// Isso corrige os 3 bugs medidos: pedido antigo resolvido depois de um novo
// (ordem por resolved_at), 2 rolagens em menos de 2 s (fila) e TV com o relógio
// errado (idade pelo relógio do servidor).

export const BIG_FRESH_S = 10;
export const BIG_MS = 8000;
export const BIG_MS_BUSY = 4000;
export const FEED_MS = 12000;
export const FEED_MAX = 4;
export const SEEN_MAX = 200;

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export function createQueue() {
  return { primed: false, seen: [], big: [], feed: [], feedHeldAt: null };
}

/** Idade da rolagem em segundos pelo relógio do SERVIDOR (sem a hora: velha). */
export function rollAgeS(roll, now) {
  const at = Date.parse(roll?.at || '');
  const n = Date.parse(now || '');
  if (!Number.isFinite(at) || !Number.isFinite(n)) return Infinity;
  return Math.max(0, (n - at) / 1000);
}

/** Merece o dado grande? (rolagem normal de jogador vai só ao feed) */
export function isBig(roll) {
  if (!roll) return false;
  if (roll.crit || roll.fail) return true;
  return ['monster', 'save', 'dm', 'request'].includes(roll.kind);
}

/**
 * Junta a resposta do GET da Tela ({rolls, now}) à fila. `tvNow` = Date.now() da
 * TV (só para o feed sumir 12 s depois de CHEGAR). Devolve uma fila nova.
 */
export function ingest(queue, { rolls = [], now } = {}, tvNow = Date.now()) {
  const q = queue || createQueue();
  const list = Array.isArray(rolls) ? rolls.filter(r => r && r.id != null) : [];
  if (!q.primed) {
    return { ...q, primed: true, seen: list.map(r => r.id).slice(-SEEN_MAX) };
  }
  const seen = new Set(q.seen);
  const fresh = list.filter(r => !seen.has(r.id));
  if (!fresh.length) return q;
  const big = [...q.big];
  const feed = [...q.feed];
  for (const r of fresh) {
    seen.add(r.id);
    if (isBig(r) && rollAgeS(r, now) < BIG_FRESH_S) big.push(r);
    else feed.push({ ...r, arrivedAt: tvNow });
  }
  // chegou dado grande: o feed se esconde e o relógio dele para
  const feedHeldAt = q.feedHeldAt ?? (big.length ? tvNow : null);
  return { ...q, seen: [...q.seen, ...fresh.map(r => r.id)].slice(-SEEN_MAX), big, feed: feed.slice(-FEED_MAX), feedHeldAt };
}

/** A grande que está na tela agora (a 1ª da fila) e quanto ela dura. */
export function currentBig(queue) {
  return queue?.big?.[0] || null;
}
export function bigDuration(queue) {
  return (queue?.big?.length || 0) > 1 ? BIG_MS_BUSY : BIG_MS;
}

/**
 * A grande atual terminou (tempo ou toque): passa para a próxima. Sem mais nenhuma,
 * o feed volta e cada linha recomeça de onde parou (o tempo escondida não conta).
 */
export function nextBig(queue, id, tvNow = Date.now()) {
  if (!queue?.big?.length || (id != null && queue.big[0].id !== id)) return queue;
  const big = queue.big.slice(1);
  if (big.length || queue.feedHeldAt == null) return { ...queue, big };
  const held = queue.feedHeldAt;
  const feed = queue.feed.map(r => ({ ...r, arrivedAt: tvNow - Math.max(0, held - (r.arrivedAt || 0)) }));
  return { ...queue, big, feed, feedHeldAt: null };
}

/** O feed sem o que já passou de 12 s À VISTA na TV (parado enquanto há dado grande). */
export function pruneFeed(queue, tvNow = Date.now()) {
  if (!queue?.feed?.length || queue.feedHeldAt != null) return queue;
  const feed = queue.feed.filter(r => tvNow - (r.arrivedAt || 0) < FEED_MS);
  return feed.length === queue.feed.length ? queue : { ...queue, feed };
}

/** Quando o próximo item do feed vence (ms a partir de tvNow) ou null (vazio ou parado). */
export function feedNextExpiry(queue, tvNow = Date.now()) {
  if (!queue?.feed?.length || queue.feedHeldAt != null) return null;
  const first = Math.min(...queue.feed.map(r => (r.arrivedAt || 0) + FEED_MS));
  return Math.max(0, first - tvNow);
}

// ---------------------------------------------------------------------------
// Textos (a TV fala a língua da campanha). `labels` injeta os rótulos de tipo de
// dano e de atributo (combat/monster-i18n.js) para este arquivo ficar puro.
// ---------------------------------------------------------------------------

/** Quem rolou: o mestre aparece como "Mestre"; o resto já vem com o nome. */
export function rollWho(roll, lang = 'pt') {
  if (!roll) return '';
  if (roll.kind === 'dm' && !roll.who) return L(lang, 'Mestre', 'GM');
  return roll.who || L(lang, 'Rolagem', 'Roll');
}

/** "ACERTA · 6 cortante" / "ERRA" / "CRÍTICO · 14 cortante" (o ataque de monstro). */
export function attackOutcome(roll, lang = 'pt', { damageLabel = (t) => t } = {}) {
  if (!roll || roll.kind !== 'monster') return '';
  if (!roll.hit) return roll.fail ? L(lang, '1 natural · ERRA', 'natural 1 · MISS') : L(lang, 'ERRA', 'MISS');
  const dmg = (roll.damage || []).filter(p => p && p.amount > 0)
    .map(p => `${p.amount} ${damageLabel(p.type)}`.trim()).join(' + ');
  return [roll.crit ? L(lang, 'CRÍTICO', 'CRITICAL') : L(lang, 'ACERTA', 'HIT'), dmg].filter(Boolean).join(' · ');
}

/** "Sopro de Fogo · DES CD 13" (o cabeçalho da salvaguarda em área). */
export function saveHead(roll, lang = 'pt', { abilityLabel = (a) => String(a || '').toUpperCase() } = {}) {
  if (!roll || roll.kind !== 'save') return '';
  const ab = roll.ability ? abilityLabel(roll.ability) : '';
  const dc = roll.dc != null ? `${L(lang, 'CD', 'DC')} ${roll.dc}` : '';
  return [roll.label, [ab, dc].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
}

/** "Dagna 9 ✗ · Kaelor 15 ✓" (os alvos da salvaguarda). */
export function saveTargets(roll) {
  return (roll?.targets || []).map(t => `${t.who} ${t.total ?? '—'} ${t.ok ? '✓' : '✗'}`).join(' · ');
}

/**
 * A linha em 2 partes: `head` (quem e o quê) e `tail` (o resultado). No feed da TV
 * só o `head` ganha reticências; o `tail` (o total, "d20 11 · ACERTA · 6 cortante",
 * os alvos da salvaguarda) nunca é cortado.
 */
export function rollParts(roll, lang = 'pt', labels = {}) {
  if (!roll) return { head: '', tail: '' };
  const who = rollWho(roll, lang);
  if (roll.kind === 'monster') {
    return { head: `${who} ⚔ ${roll.label || '?'}`, tail: `d20 ${roll.total ?? '?'} · ${attackOutcome(roll, lang, labels)}` };
  }
  if (roll.kind === 'save') {
    return { head: [who, saveHead(roll, lang, labels)].filter(Boolean).join(' · '), tail: saveTargets(roll) };
  }
  const what = roll.label || `${roll.count > 1 ? roll.count : ''}${roll.diceType === 'mixed' ? '' : roll.diceType || ''}`;
  return { head: [who, what].filter(Boolean).join(' · '), tail: roll.total != null ? String(roll.total) : '' };
}

/**
 * A linha do feed (e da lista do mestre): texto de verdade, nada só por ícone.
 *   monstro:     "Goblin #2 ⚔ Dagna · d20 11 · ACERTA · 6 cortante"
 *   salvaguarda: "Dragão · Sopro de Fogo · DES CD 13 · Dagna 9 ✗ · Pipo 17 ✓"
 *   o resto:     "Dagna · Percepção · 14"
 */
export function rollLine(roll, lang = 'pt', labels = {}) {
  const { head, tail } = rollParts(roll, lang, labels);
  return [head, tail].filter(Boolean).join(' · ');
}

/**
 * Os dados do dado grande: grupos por tipo de dado ({die, rolls:[{value, kept}]})
 * na ordem em que vieram (fórmula mista: um grupo por tipo). Salvaguarda: nenhum.
 */
export function rollGroups(roll) {
  if (!roll || roll.kind === 'save') return [];
  const base = parseInt(String(roll.diceType || 'd20').replace(/^d/i, ''), 10) || 20;
  const groups = [];
  for (const r of roll.rolls || []) {
    const die = r.die ? (parseInt(String(r.die).replace(/^d/i, ''), 10) || base) : base;
    const last = groups[groups.length - 1];
    const sign = r.sign === -1 ? -1 : 1;
    if (last && last.die === die && last.sign === sign) last.rolls.push({ value: r.value, kept: r.kept !== false });
    else groups.push({ die, sign, rolls: [{ value: r.value, kept: r.kept !== false }] });
  }
  return groups;
}

/** Mostrar "= total" no dado grande? Só quando há bônus ou mais de um dado contando. */
export function showsSum(roll) {
  if (!roll || roll.kind === 'monster' || roll.kind === 'save') return false;
  const kept = (roll.rolls || []).filter(r => r.kept !== false).length;
  return !!roll.modifier || kept > 1;
}
