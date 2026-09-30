// Lógica pura de dados (sem DOM/three) — testável em node.
//
// Convenções:
//  - "die" = número de lados (4, 6, 8, 10, 12, 20, 100).
//  - Resultados SEMPRE vêm prontos (sorteio local, servidor ou dado físico);
//    a animação 3D só mostra o valor já decidido.

export const DICE = [4, 6, 8, 10, 12, 20, 100];
export const DIE_SIDES = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100 };

export function sidesOf(die) {
  if (typeof die === 'number') return die;
  const n = DIE_SIDES[String(die).toLowerCase()];
  return n || parseInt(String(die).replace(/^d/i, ''), 10) || 20;
}

/** Sorteio local justo (crypto quando existir). */
export function rollDie(sides, rng) {
  if (rng) return 1 + Math.floor(rng() * sides);
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
  if (c?.getRandomValues) {
    const buf = new Uint32Array(1);
    c.getRandomValues(buf);
    return 1 + (buf[0] % sides);
  }
  return 1 + Math.floor(Math.random() * sides);
}

/** d100 = dado das dezenas (00..90) + dado das unidades (0..9); 100 = 00 + 0. */
export function splitD100(value) {
  const v = Math.max(1, Math.min(100, Math.round(value)));
  const tens = v === 100 ? 0 : Math.floor(v / 10) * 10;
  const units = v % 10;
  return { tens, units };
}

/** Rótulos das faces na ordem usada pela geometria (índice → texto). */
export function faceLabels(kind) {
  switch (kind) {
    case 'd10': return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    case 'd100': return ['00', '10', '20', '30', '40', '50', '60', '70', '80', '90'];
    default: {
      const n = sidesOf(kind);
      return Array.from({ length: n }, (_, i) => String(i + 1));
    }
  }
}

/** Qual rótulo de face mostra `value` num dado físico do tipo `kind`. */
export function faceLabelFor(kind, value) {
  if (kind === 'd10') return String(value % 10);            // d10 físico: "0" = 10
  if (kind === 'd100') return String(value).padStart(2, '0');
  return String(value);
}

/**
 * Converte um grupo lógico (ex.: 1d100 = 57) em dados físicos a desenhar.
 * Retorna [{ kind: 'd20'|'d10'|'d100'..., value, label }].
 */
export function physicalDice(die, values) {
  const sides = sidesOf(die);
  const out = [];
  for (const raw of values || []) {
    const v = typeof raw === 'object' && raw ? raw.value : raw;
    if (v == null || Number.isNaN(+v)) continue;
    if (sides === 100) {
      const { tens, units } = splitD100(+v);
      out.push({ kind: 'd100', value: tens, label: faceLabelFor('d100', tens), group: v });
      out.push({ kind: 'd10', value: units, label: faceLabelFor('d10', units), group: v });
    } else {
      const kind = `d${sides}`;
      out.push({ kind, value: +v, label: faceLabelFor(kind, +v), dimmed: typeof raw === 'object' && raw.kept === false });
    }
  }
  return out;
}

/**
 * Parser de fórmula rápida: "2d6+3", "d20 + 1d4 - 1", "4d6", "+5".
 * Retorna { terms: [{count, sides, sign}], mod, text } ou null se inválida.
 */
export function parseFormula(input) {
  if (input == null) return null;
  const src = String(input).toLowerCase().replace(/\s+/g, '').replace(/,/g, '.');
  if (!src || src.length > 60) return null;
  const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/gy;
  const terms = [];
  let mod = 0;
  let idx = 0;
  let m;
  while (idx < src.length) {
    re.lastIndex = idx;
    m = re.exec(src);
    if (!m || m.index !== idx) return null;
    if (m[3] !== undefined) {
      const sign = m[1] === '-' ? -1 : 1;
      if (idx > 0 && !m[1]) return null;           // "2d6d8" sem operador
      const count = m[2] === '' ? 1 : parseInt(m[2], 10);
      const sides = parseInt(m[3], 10);
      if (!count || count > 50 || !DICE.includes(sides)) return null;
      terms.push({ count, sides, sign });
    } else {
      if (idx > 0 && !m[4]) return null;
      const n = parseInt(m[5], 10);
      if (n > 999) return null;
      mod += m[4] === '-' ? -n : n;
    }
    idx = re.lastIndex;
  }
  if (!terms.length) return null;
  return { terms, mod, text: formatFormula(terms, mod) };
}

export function formatMod(mod) {
  if (!mod) return '';
  return mod > 0 ? `+${mod}` : `${mod}`;
}

export function formatFormula(terms, mod = 0) {
  const parts = terms.map((t, i) => `${t.sign < 0 ? '-' : i > 0 ? '+' : ''}${t.count}d${t.sides}`);
  return parts.join('') + formatMod(mod);
}

/**
 * Rola uma fórmula já parseada. `adv` ('adv'|'dis'|'normal') só vale para um único d20.
 * `preset` permite injetar valores já decididos (na ordem dos dados).
 */
export function rollFormula(parsed, { adv = 'normal', rng, preset } = {}) {
  const queue = preset ? [...preset] : null;
  const next = (sides) => (queue && queue.length ? queue.shift() : rollDie(sides, rng));
  const singleD20 = parsed.terms.length === 1 && parsed.terms[0].count === 1 && parsed.terms[0].sides === 20;
  const groups = [];
  let total = parsed.mod;
  let isCrit = false;
  let isFumble = false;
  for (const t of parsed.terms) {
    if (singleD20 && adv !== 'normal') {
      const a = next(20);
      const b = next(20);
      const keep = adv === 'adv' ? Math.max(a, b) : Math.min(a, b);
      const keptIdx = keep === a ? 0 : 1;
      groups.push({ sides: 20, sign: 1, rolls: [{ value: a, kept: keptIdx === 0 }, { value: b, kept: keptIdx === 1 }] });
      total += keep;
      isCrit = keep === 20;
      isFumble = keep === 1;
      continue;
    }
    const rolls = [];
    for (let i = 0; i < t.count; i++) {
      const v = next(t.sides);
      rolls.push({ value: v, kept: true });
      total += t.sign * v;
    }
    if (t.sides === 20 && t.count === 1 && parsed.terms.length === 1) {
      isCrit = rolls[0].value === 20;
      isFumble = rolls[0].value === 1;
    }
    groups.push({ sides: t.sides, sign: t.sign, rolls });
  }
  return { groups, mod: parsed.mod, total, isCrit, isFumble, adv: singleD20 ? adv : 'normal' };
}

/** Texto curto "[4, 2] +3". */
export function breakdown(result) {
  const parts = (result.groups || []).map(g => {
    const vals = (g.rolls || []).map(r => {
      if (typeof r !== 'object' || r == null) return `${r}`;
      return r.kept === false ? `~${r.value}~` : `${r.value}`;
    }).join(', ');
    return `${g.sign < 0 ? '−' : ''}[${vals}]`;
  });
  return `${parts.join(' ')}${result.mod ? ` ${formatMod(result.mod)}` : ''}`;
}

/** Resultado de teste contra CD. Sem CD → null. */
export function checkOutcome(total, dc) {
  if (dc == null || dc === '' || Number.isNaN(+dc) || total == null) return null;
  return +total >= +dc ? 'pass' : 'fail';
}

/**
 * Normaliza a entrada do jogador que rolou dado físico.
 * mode 'natural' → soma o modificador; mode 'total' → usa o número como total.
 */
export function physicalEntry(raw, { mode = 'natural', modifier = 0, sides = 20 } = {}) {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return { error: 'empty' };
  if (mode === 'natural') {
    if (n < 1 || n > sides) return { error: 'range' };
    return { natural: n, modifier, total: n + modifier };
  }
  if (n < -20 || n > 99) return { error: 'range' };
  return { natural: null, modifier: null, total: n };
}

/**
 * Preferência de animação do usuário ('3d' | '2d' | 'off') + ambiente →
 * modo efetivo: '3d' | '2d' | 'static' (sem movimento) | 'off' (sem overlay).
 */
export function resolveAnimMode(pref, { reducedMotion = false, webgl = true } = {}) {
  if (pref === 'off') return 'off';
  if (reducedMotion) return 'static';
  if (pref === '2d') return '2d';
  return webgl ? '3d' : '2d';
}
