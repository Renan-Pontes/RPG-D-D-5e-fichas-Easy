// Regras do painel de Pontos de Vida (src/sheet/HpTracker.jsx). Puro: sem React nem rede.
//
// Dados de Vida por tipo: a ficha guardava só o total gasto (`hitDiceUsed`). Na
// multiclasse cada tipo conta à parte, então o gasto por tipo vai em `hitDiceUsedBy`
// ({ "8": 2 }) e `hitDiceUsed` continua sendo a soma (o servidor e o resto do app leem ele).
// Ficha antiga (sem o mapa): o gasto conta primeiro nos dados maiores.

export const SLICES = 10;          // fatias da barra de PV
export const EXHAUSTION_MAX = 6;   // níveis de exaustão (5e 2014 e 2024)

const int = (v, d = 0) => (Number.isFinite(+v) ? Math.trunc(+v) : d);
const dice = (byDie) => Object.entries(byDie || {}).map(([d, n]) => [int(d), int(n)]).filter(([d, n]) => d > 0 && n > 0).sort((a, b) => b[0] - a[0]);

/** [{ die, total, used, left }] do maior para o menor. */
export function hitDicePools(byDie, char = {}) {
  const list = dice(byDie);
  const by = char.hitDiceUsedBy && typeof char.hitDiceUsedBy === 'object' ? char.hitDiceUsedBy : null;
  let rest = Math.max(0, int(char.hitDiceUsed));
  return list.map(([die, total]) => {
    let used;
    if (by) used = Math.min(total, Math.max(0, int(by[die])));
    else { used = Math.min(total, rest); rest -= used; }
    return { die, total, used, left: total - used };
  });
}

/** Cura de um Dado de Vida: rolagem + mod. de CON, nunca menos que 0. */
export const hitDieHeal = (rolled, conMod) => Math.max(0, int(rolled) + int(conMod));

/**
 * Gasta um Dado de Vida do tipo `die` com o valor `rolled`. Devolve o patch da ficha
 * ({ currentHp, hitDiceUsed, hitDiceUsedBy, gained }) ou null se não há dado livre.
 */
export function spendHitDie(char, byDie, die, rolled, conMod) {
  const pools = hitDicePools(byDie, char);
  const pool = pools.find(p => p.die === int(die));
  if (!pool || pool.left <= 0) return null;
  const usedBy = Object.fromEntries(pools.map(p => [String(p.die), p.used]));
  usedBy[String(pool.die)] = pool.used + 1;
  const gain = hitDieHeal(rolled, conMod);
  const max = Math.max(1, int(char.maxHp, 1));
  const cur = Math.max(0, int(char.currentHp));
  const next = Math.min(max, cur + gain);
  return {
    currentHp: next,
    hitDiceUsed: Object.values(usedBy).reduce((a, b) => a + b, 0),
    hitDiceUsedBy: usedBy,
    gained: next - cur,
  };
}

/**
 * Depois do descanso longo o total gasto já veio certo (`hitDiceUsed` novo): acerta o
 * mapa por tipo devolvendo primeiro os dados maiores.
 */
export function usedByAfterRest(char, byDie, newTotal) {
  const pools = hitDicePools(byDie, char);
  let give = Math.max(0, pools.reduce((a, p) => a + p.used, 0) - Math.max(0, int(newTotal)));
  const out = {};
  for (const p of pools) {
    const back = Math.min(p.used, give);
    give -= back;
    out[String(p.die)] = p.used - back;
  }
  return out;
}

/** "8d6 + 4d8 + 15" (Dados de Vida, do menor ao maior, + CON × nível): o jeito do livro. */
export function hpFormula(byDie, conMod, level) {
  const d = dice(byDie).slice().reverse().map(([die, n]) => `${n}d${die}`).join(' + ');
  if (!d) return '';
  const flat = int(conMod) * Math.max(1, int(level, 1));
  return flat ? `${d} ${flat > 0 ? '+' : '−'} ${Math.abs(flat)}` : d;
}

/** Quantas das 10 fatias estão cheias (arredonda para cima: 1 PV ainda acende uma). */
export function filledSlices(current, max, slices = SLICES) {
  const m = Math.max(1, int(max, 1));
  const c = Math.max(0, Math.min(m, int(current)));
  return c === 0 ? 0 : Math.max(1, Math.ceil((c / m) * slices));
}

// ── Exaustão ──
/** Nível 0–6. Ficha antiga só tinha a condição 'exhausted' (vale 1). */
export function exhaustionLevel(char) {
  const lv = int(char?.exhaustionLevel, -1);
  if (lv >= 0) return Math.min(EXHAUSTION_MAX, lv);
  return (char?.conditions || []).includes('exhausted') ? 1 : 0;
}

/** Patch para mudar o nível, mantendo a condição 'exhausted' em sincronia. */
export function setExhaustion(char, level) {
  const lv = Math.max(0, Math.min(EXHAUSTION_MAX, int(level)));
  const conds = (char?.conditions || []).filter(c => c !== 'exhausted');
  return { exhaustionLevel: lv, conditions: lv > 0 ? [...conds, 'exhausted'] : conds };
}

/** Tocar a fatia `i` (0-based): acende até ela; tocar a última acesa apaga ela. */
export const toggleTo = (current, i) => (i + 1 === current ? i : i + 1);

// ── Arrastar para dano/cura ──
/** Faixa do controle de PV: dano até zerar (contando PV temporários), cura até o máximo. */
export function hpSliderRange(char) {
  const max = Math.max(1, int(char.maxHp, 1));
  const cur = Math.max(0, int(char.currentHp));
  const temp = Math.max(0, int(char.tempHp));
  return { min: -(cur + temp), max: max - cur };
}

/** Texto da lente sobre o botão de arrastar: '−7' (dano) ou '+4' (cura). */
export const deltaLabel = (d) => (int(d) < 0 ? `−${Math.abs(int(d))}` : int(d) > 0 ? `+${int(d)}` : '0');

// ── Arrastar sobre a própria barra (v1.0.63) ──
// O botão fica na ponta do preenchimento; arrastar mede só a distância desde onde ele
// estava: o número cresce exponencialmente (perto = ajuste fino, longe = golpe grande) e,
// ao soltar, o valor entra e o botão volta para a ponta da barra.
export const DRAG_SCALE = 38;   // px por "e" de crescimento

/** Valor (com sinal) para um arrasto de `dx` px, preso em [min, max]. */
export function dragAmount(dx, { min = -Infinity, max = Infinity } = {}) {
  const d = Math.abs(int(dx));
  if (d < 6) return 0;                                     // zona morta: toque não é arrasto
  const v = Math.max(1, Math.round(Math.exp((d - 6) / DRAG_SCALE)));
  return Math.max(min, Math.min(max, Math.sign(dx) * v));
}

/** Descanso curto: quantos Dados de Vida um arrasto para a direita pede (1, 2, 3… até o que há). */
export function diceForDrag(dx, available) {
  const d = int(dx);
  if (d < 12 || available <= 0) return 0;
  return Math.min(available, 1 + Math.floor((d - 12) / 34));
}

/**
 * Escolhe `n` dados de TODAS as pilhas (todas as classes), dos MENORES para os maiores:
 * pedir pouca cura gasta d6 antes de d8/d10/d12; pedindo mais, passa para os maiores.
 * Devolve [{ die, count }] do menor para o maior.
 */
export function pickDice(pools, n) {
  let need = Math.max(0, int(n));
  const out = [];
  for (const p of pools.slice().sort((a, b) => a.die - b.die)) {
    if (!need) break;
    const k = Math.min(p.left, need);
    if (k > 0) { out.push({ die: p.die, count: k }); need -= k; }
  }
  return out;
}

/** "2d8 + 1d6 + 6" (cada dado soma o mod. de CON). */
export function diceLabel(picks, conMod) {
  const d = picks.map(p => `${p.count}d${p.die}`).join(' + ');
  const n = picks.reduce((a, p) => a + p.count, 0);
  const flat = int(conMod) * n;
  return !d ? '' : flat ? `${d} ${flat > 0 ? '+' : '−'} ${Math.abs(flat)}` : d;
}

/**
 * Gasta vários Dados de Vida de uma vez. `rolls` = [[valores do 1º tipo], …] na ordem de
 * `picks`. Devolve { patch, gained, detail } ou null.
 */
export function spendHitDiceRolls(char, byDie, picks, rolls, conMod) {
  let c = { ...char };
  let gained = 0;
  const detail = [];
  picks.forEach((p, i) => {
    (rolls[i] || []).forEach(r => {
      const step = spendHitDie(c, byDie, p.die, r, conMod);
      if (!step) return;
      gained += step.gained;
      detail.push(r);
      const { gained: _g, ...patch } = step;
      c = { ...c, ...patch };
    });
  });
  if (!detail.length) return null;
  return { patch: { currentHp: c.currentHp, hitDiceUsed: c.hitDiceUsed, hitDiceUsedBy: c.hitDiceUsedBy }, gained, detail };
}

// ── Teste contra a morte (regra das duas edições) ──
/** Resultado de um d20: 20 = volta com 1 PV; 1 = duas falhas; ≥10 sucesso; senão falha. */
export function deathSaveResult(char, d20) {
  const ds = { success: 0, fail: 0, ...(char.deathSaves || {}) };
  const n = int(d20);
  if (n === 20) return { kind: 'crit', patch: { currentHp: 1, deathSaves: { success: 0, fail: 0 }, conditions: (char.conditions || []).filter(c => c !== 'unconscious') } };
  if (n === 1) { const fail = Math.min(3, ds.fail + 2); return { kind: fail >= 3 ? 'dead' : 'fumble', patch: { deathSaves: { ...ds, fail } } }; }
  if (n >= 10) { const success = Math.min(3, ds.success + 1); return { kind: success >= 3 ? 'stable' : 'success', patch: { deathSaves: { ...ds, success } } }; }
  const fail = Math.min(3, ds.fail + 1);
  return { kind: fail >= 3 ? 'dead' : 'fail', patch: { deathSaves: { ...ds, fail } } };
}

/** Dados de Vida ainda não gastos, por tipo, do menor ao maior: "5/8 d6 · 3/4 d8". */
export function hitDiceLeftLabel(pools) {
  return pools.slice().sort((a, b) => a.die - b.die).map(p => `${p.left}/${p.total} d${p.die}`).join(' · ');
}
