// Fila de rolagens da Tela (V10, especificação §5.4) — "as roladas acontecem nela".
// Lógica pura (sem React); testada em tests/roll-queue.test.js.
//
// O servidor manda, a cada GET da Tela, a JANELA das rolagens públicas dos
// últimos 90 s pelo relógio DELE (`rolls`, em ordem (resolved_at, id)) e a hora
// dele (`now`). Aqui:
//   · ao abrir, tudo o que já está na janela é marcado como visto (a TV reaberta
//     não reprisa nada) e vai direto para as "Últimas rolagens";
//   · cada rolagem nova entra UMA vez (ids vistos, em memória);
//   · com menos de 10 s pelo relógio do servidor (now − at; o relógio da TV não
//     conta) ela ganha o CARTÃO GRANDE no centro (o dado 3D, quem, o quê e o
//     total). Onda 3 (E2.1): as dos jogadores (rolador da Mesa e ficha) também —
//     antes eram uma faixa de 16 px no canto que sumia em 12 s —, num cartão um
//     pouco menor (`bigSize` 'small'; 20 e 1 naturais ficam do tamanho do mestre);
//   · os cartões vão em fila: 8 s cada (6 s o do jogador), 4 s quando há mais de
//     um esperando;
//   · depois do cartão (ou direto, quando chega velha: TV reconectando) a
//     rolagem entra nas ÚLTIMAS ROLAGENS: as 5 mais novas, com nome e total, num
//     canto da TV; somem sozinhas 2 min depois da última rolagem que chegou
//     (relógio da TV) e ficam escondidas enquanto há cartão grande.
// Isso corrige os 3 bugs medidos: pedido antigo resolvido depois de um novo
// (ordem por resolved_at), 2 rolagens em menos de 2 s (fila) e TV com o relógio
// errado (idade pelo relógio do servidor).

export const BIG_FRESH_S = 10;
export const BIG_MS = 8000;
export const BIG_MS_SMALL = 6000;
export const BIG_MS_BUSY = 4000;
export const HIST_MAX = 5;
export const HIST_MS = 120_000;
export const SEEN_MAX = 200;

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const PLAYER_KINDS = ['player', 'sheet'];

export function createQueue() {
  return { primed: false, seen: [], big: [], hist: [], histAt: null };
}

/** Idade da rolagem em segundos pelo relógio do SERVIDOR (sem a hora: velha). */
export function rollAgeS(roll, now) {
  const at = Date.parse(roll?.at || '');
  const n = Date.parse(now || '');
  if (!Number.isFinite(at) || !Number.isFinite(n)) return Infinity;
  return Math.max(0, (n - at) / 1000);
}

/** Ganha o cartão grande? Toda rolagem pública fresca (E2.1: as dos jogadores também). */
export function isBig(roll) {
  return !!roll;
}

/**
 * O tamanho do cartão: 'small' para a rolagem comum de jogador (rolador da Mesa e
 * ficha) — um pouco menor que a do mestre —, 'full' para o resto e para o 20 e o 1
 * naturais de qualquer um.
 */
export function bigSize(roll) {
  if (!roll) return 'full';
  if (roll.crit || roll.fail) return 'full';
  return PLAYER_KINDS.includes(roll.kind) ? 'small' : 'full';
}

/** O histórico com a rolagem `r` no fim (as 5 mais novas; a mesma nunca duas vezes). */
function pushHist(hist, r) {
  return [...hist.filter(h => h.id !== r.id), r].slice(-HIST_MAX);
}

/**
 * Junta a resposta do GET da Tela ({rolls, now}) à fila. `tvNow` = Date.now() da
 * TV (o relógio das "Últimas rolagens"). Devolve uma fila nova.
 */
export function ingest(queue, { rolls = [], now } = {}, tvNow = Date.now()) {
  const q = queue || createQueue();
  const list = Array.isArray(rolls) ? rolls.filter(r => r && r.id != null) : [];
  if (!q.primed) {
    // a TV (re)aberta: nada é reprisado, mas o que rolou há pouco já fica nas Últimas
    const recent = list.slice(-HIST_MAX);
    const youngest = recent.length ? Math.min(...recent.map(r => rollAgeS(r, now))) : Infinity;
    return {
      ...q, primed: true, seen: list.map(r => r.id).slice(-SEEN_MAX), hist: recent,
      histAt: recent.length ? tvNow - (Number.isFinite(youngest) ? youngest * 1000 : 0) : null,
    };
  }
  const seen = new Set(q.seen);
  const fresh = list.filter(r => !seen.has(r.id));
  if (!fresh.length) return q;
  const big = [...q.big];
  let hist = q.hist;
  let histAt = q.histAt;
  for (const r of fresh) {
    seen.add(r.id);
    if (isBig(r) && rollAgeS(r, now) < BIG_FRESH_S) big.push(r);
    else { hist = pushHist(hist, r); histAt = tvNow; }
  }
  return { ...q, seen: [...q.seen, ...fresh.map(r => r.id)].slice(-SEEN_MAX), big, hist, histAt };
}

/** O cartão que está na tela agora (o 1º da fila) e quanto ele dura. */
export function currentBig(queue) {
  return queue?.big?.[0] || null;
}
export function bigDuration(queue) {
  if ((queue?.big?.length || 0) > 1) return BIG_MS_BUSY;
  return bigSize(currentBig(queue)) === 'small' ? BIG_MS_SMALL : BIG_MS;
}

/**
 * O cartão atual terminou (tempo ou toque): ele vai para as Últimas rolagens e a
 * fila passa para o próximo. `id` que não é o atual não mexe.
 */
export function nextBig(queue, id, tvNow = Date.now()) {
  if (!queue?.big?.length || (id != null && queue.big[0].id !== id)) return queue;
  const [done, ...big] = queue.big;
  return { ...queue, big, hist: pushHist(queue.hist || [], done), histAt: tvNow };
}

/** As Últimas rolagens sem nada depois de 2 min da última que chegou (relógio da TV). */
export function pruneHist(queue, tvNow = Date.now()) {
  if (!queue?.hist?.length || queue.histAt == null) return queue;
  return tvNow - queue.histAt >= HIST_MS ? { ...queue, hist: [], histAt: null } : queue;
}

/** Quando as Últimas rolagens vencem (ms a partir de tvNow) ou null (vazias). */
export function histNextExpiry(queue, tvNow = Date.now()) {
  if (!queue?.hist?.length || queue.histAt == null) return null;
  return Math.max(0, queue.histAt + HIST_MS - tvNow);
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
 * A linha em 2 partes: `head` (quem e o quê) e `tail` (o resultado). Na lista do
 * mestre só o `head` ganha reticências; o `tail` (o total, "d20 11 · ACERTA · 6
 * cortante", os alvos da salvaguarda) nunca é cortado.
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
 * A linha da lista do mestre (Jogar › Tela › Últimas 5, Testes): texto de verdade,
 * nada só por ícone.
 *   monstro:     "Goblin #2 ⚔ Dagna · d20 11 · ACERTA · 6 cortante"
 *   salvaguarda: "Dragão · Sopro de Fogo · DES CD 13 · Dagna 9 ✗ · Pipo 17 ✓"
 *   o resto:     "Dagna · Percepção · 14"
 */
export function rollLine(roll, lang = 'pt', labels = {}) {
  const { head, tail } = rollParts(roll, lang, labels);
  return [head, tail].filter(Boolean).join(' · ');
}

/**
 * Uma linha das "Últimas rolagens" da TV (E2.1), lida a 3 m: quem (o nome inteiro,
 * nunca cortado antes do rótulo), o quê (o rótulo, o único que ganha reticências) e o
 * resultado curto.
 *   jogador/mestre: {who:'Dagna', what:'Percepção', result:'17'}
 *   monstro:        {who:'Goblin #2', what:'⚔ Dagna', result:'ACERTA'} (sem o bônus nem o dano)
 *   salvaguarda:    {who:'Dragão', what:'Sopro de Fogo', result:'2 ✓ · 1 ✗'}
 * `mark`: 'crit' | 'fail' | '' (o filete dourado/vermelho da linha).
 */
export function histParts(roll, lang = 'pt') {
  if (!roll) return { who: '', what: '', result: '', mark: '' };
  const who = rollWho(roll, lang);
  const mark = roll.crit ? 'crit' : roll.fail ? 'fail' : '';
  if (roll.kind === 'monster') {
    const result = !roll.hit ? L(lang, 'ERRA', 'MISS') : roll.crit ? L(lang, 'CRÍTICO', 'CRITICAL') : L(lang, 'ACERTA', 'HIT');
    return { who, what: `⚔ ${roll.label || '?'}`, result, mark };
  }
  if (roll.kind === 'save') {
    const t = roll.targets || [];
    const ok = t.filter(x => x.ok).length;
    return { who, what: roll.label || '', result: `${ok} ✓ · ${t.length - ok} ✗`, mark };
  }
  const what = roll.label || `${roll.count > 1 ? roll.count : ''}${roll.diceType === 'mixed' ? '' : roll.diceType || ''}`;
  return { who, what, result: roll.total != null ? String(roll.total) : '', mark };
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
