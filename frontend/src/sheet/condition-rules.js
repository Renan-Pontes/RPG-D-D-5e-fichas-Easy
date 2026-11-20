/* O que cada estado ativo FAZ, para a ficha explicar e marcar onde ele pesa.
 * Puro (sem React nem rede) e só informativo: nada aqui muda número, fórmula ou rolagem.
 *
 * - Textos: data/grimoire/condition-shorts.js (a linha curta de cada artigo de condição do
 *   Grimório; `short2014` onde o artigo diz que 2014 é diferente). Nenhuma regra escrita aqui.
 * - BITES: a mesma regra em forma de dado (ataques, testes, salvaguardas, deslocamento…),
 *   conferida contra o texto do Grimório em tests/condition-rules.test.js.
 * - Edição: a ficha guarda char.rulesVersion; só '2024' é 2024 (como no resto do app). */
import { CONDITION_SHORTS } from '../../data/grimoire/condition-shorts.js';
import { tName } from '../../data/i18n.js';
import { exhaustionLevel, EXHAUSTION_MAX } from './hp-logic.js';
import { hpState } from './hp-feedback.js';

/** Chave da ficha (char.conditions) → id do artigo do Grimório (igual a CONDITION_ARTICLE). */
export const CONDITION_ARTICLE = {
  blinded: 'cego', charmed: 'encantado', deafened: 'surdo', exhausted: 'exaustao',
  frightened: 'amedrontado', grappled: 'agarrado', incapacitated: 'incapacitado',
  invisible: 'invisivel', paralyzed: 'paralisado', petrified: 'petrificado',
  poisoned: 'envenenado', prone: 'prono', restrained: 'restringido',
  stunned: 'atordoado', unconscious: 'inconsciente',
};
export const CONDITION_IDS = Object.keys(CONDITION_ARTICLE);

/** Família: uma cor + um símbolo, usados na linha do estado, na moldura do painel, na borda
 *  da tela e no retrato (src/sheet/condition-fx.css: [data-fam]). */
export const FAMILY = {
  poisoned: 'toxic', frightened: 'fear', charmed: 'mind', stunned: 'stun', paralyzed: 'cold',
  petrified: 'stone', grappled: 'bound', restrained: 'bound', incapacitated: 'bound',
  blinded: 'senses', deafened: 'senses', prone: 'down', unconscious: 'down',
  invisible: 'boon', exhausted: 'weary',
};

/** Quem manda quando há vários estados: o primeiro da lista dá a cor da moldura, a borda da
 *  tela e o filtro do retrato; os demais viram selos pequenos. */
export const PRIORITY = [
  'petrified', 'paralyzed', 'stunned', 'unconscious', 'restrained', 'grappled', 'frightened',
  'poisoned', 'blinded', 'charmed', 'incapacitated', 'prone', 'deafened', 'invisible', 'exhausted',
];
const rank = (id) => { const i = PRIORITY.indexOf(id); return i < 0 ? PRIORITY.length : i; };
export const byPriority = (ids) => [...new Set(ids || [])].filter(id => CONDITION_ARTICLE[id]).sort((a, b) => rank(a) - rank(b));

export const is2024 = (rulesVersion) => rulesVersion === '2024';
const L = (lang) => (lang === 'en' ? 'en' : 'pt');

/** A regra da condição em uma linha, na edição da ficha. '' se a chave não é uma condição. */
export function conditionLine(id, lang, rulesVersion) {
  const e = CONDITION_SHORTS[CONDITION_ARTICLE[id]];
  if (!e) return '';
  const pick = !is2024(rulesVersion) && e.short2014 ? e.short2014 : e.short;
  return pick[L(lang)] || pick.pt || '';
}

// ── Onde cada condição pesa ──
// attacks/checks/initiative: 'adv' | 'dis' · saves: { str|dex|all: 'dis' | 'fail' }
// speed: 'zero' · attackedBy: 'adv' | 'dis' | 'mixed' · noActions · includes: condições embutidas
// when: a desvantagem só vale numa situação. `when` é a ressalva ao lado do nome da fonte
// ("Amedrontado (fonte do medo à vista)") e `clause` a mesma ressalva depois de "Desvantagem"
// ("Desvantagem com a fonte do medo à vista"). As palavras são as da linha curta do Grimório.
export const WHEN = {
  fear: {
    when: { pt: 'fonte do medo à vista', en: 'source of fear in sight' },
    clause: { pt: 'com a fonte do medo à vista', en: 'with the source of fear in sight' },
  },
  grappler: {
    when: { pt: 'contra quem não te agarrou', en: 'against anyone but the grappler' },
    clause: { pt: 'contra quem não te agarrou', en: 'against anyone but the grappler' },
  },
};
const BITES_2024 = {
  blinded: { attacks: 'dis', attackedBy: 'adv' },
  charmed: {},
  deafened: {},
  frightened: { attacks: 'dis', checks: 'dis', when: 'fear' },
  grappled: { speed: 'zero', attacks: 'dis', when: 'grappler' },
  incapacitated: { noActions: true, initiative: 'dis' },
  invisible: { attacks: 'adv', attackedBy: 'dis', initiative: 'adv' },
  paralyzed: { includes: ['incapacitated'], speed: 'zero', saves: { str: 'fail', dex: 'fail' }, attackedBy: 'adv' },
  petrified: { includes: ['incapacitated'], speed: 'zero', saves: { str: 'fail', dex: 'fail' }, attackedBy: 'adv' },
  poisoned: { attacks: 'dis', checks: 'dis' },
  prone: { attacks: 'dis', attackedBy: 'mixed' },
  restrained: { speed: 'zero', attacks: 'dis', attackedBy: 'adv', saves: { dex: 'dis' } },
  stunned: { includes: ['incapacitated'], saves: { str: 'fail', dex: 'fail' }, attackedBy: 'adv' },
  unconscious: { includes: ['incapacitated', 'prone'], speed: 'zero', saves: { str: 'fail', dex: 'fail' }, attackedBy: 'adv' },
};
// 2014: só o que o campo `versions` do artigo diz que muda
const BITES_2014 = {
  ...BITES_2024,
  grappled: { speed: 'zero' },
  incapacitated: { noActions: true },
  invisible: { attacks: 'adv', attackedBy: 'dis' },
  stunned: { ...BITES_2024.stunned, speed: 'zero' },
};
export const bitesFor = (id, rulesVersion) => (is2024(rulesVersion) ? BITES_2024 : BITES_2014)[id] || null;

const emptyBites = () => ({
  attacks: { adv: [], dis: [] },
  checks: { adv: [], dis: [] },
  initiative: { adv: [], dis: [] },
  saves: { str: { dis: [], fail: [] }, dex: { dis: [], fail: [] }, all: { dis: [], fail: [] } },
  speed: { zero: [], half: [], minus: null },
  attackedBy: { adv: [], dis: [], mixed: [] },
  noActions: [],
  d20Penalty: null,     // 2024, Exaustão: { n, src }
  maxHpHalf: [],        // 2014, Exaustão 4
  exhaustion: 0,
  inspiration: false,
  any: false,
});
const push = (list, src) => { if (!list.some(s => s.id === src.id)) list.push(src); };

/**
 * Junta o que todos os estados ativos fazem. Cada entrada guarda a fonte:
 * { id, name, when? } — o nome já vem no idioma pedido.
 */
export function activeBites(char, lang = 'pt') {
  const out = emptyBites();
  const v = char?.rulesVersion;
  const lg = L(lang);
  // Morto (três falhas ou Exaustão 6): não há rolagem para lembrar nem sugestão a fazer.
  // Fica só o nível de Exaustão, para a barra mostrar.
  if (hpFlags(char || {}).dead) { out.exhaustion = exhaustionLevel(char || {}); return out; }
  const apply = (id, src) => {
    const b = bitesFor(id, v);
    if (!b) return;
    const s = b.when ? { ...src, when: WHEN[b.when].when[lg], clause: WHEN[b.when].clause[lg] } : src;
    if (b.attacks) push(out.attacks[b.attacks], s);
    if (b.checks) push(out.checks[b.checks], s);
    if (b.initiative) push(out.initiative[b.initiative], src);
    if (b.speed === 'zero') push(out.speed.zero, src);
    if (b.attackedBy) push(out.attackedBy[b.attackedBy], src);
    if (b.noActions) push(out.noActions, src);
    for (const [ab, kind] of Object.entries(b.saves || {})) push(out.saves[ab][kind], src);
    for (const inc of b.includes || []) apply(inc, src);   // Paralisado já é Incapacitado etc.
  };
  for (const id of byPriority(char?.conditions)) {
    if (id === 'exhausted') continue;   // a Exaustão entra pelo nível, logo abaixo
    apply(id, { id, name: tName('condition', id, lang) });
  }
  // 0 PV: Inconsciente (artigo "zero-pv" do Grimório), mesmo sem a condição marcada.
  if ((char?.currentHp || 0) <= 0 && char?.maxHp > 0 && !(char?.conditions || []).includes('unconscious')) {
    apply('unconscious', { id: 'down', name: lg === 'en' ? '0 HP' : '0 PV' });
  }
  const lv = exhaustionLevel(char || {});
  out.exhaustion = lv;
  if (lv > 0 && lv < EXHAUSTION_MAX) {   // nível 6 é morte: não há rolagem para lembrar
    const src = { id: 'exhausted', name: `${lg === 'en' ? 'Exhaustion' : 'Exaustão'} ${lv}` };
    if (is2024(v)) {
      out.d20Penalty = { n: 2 * lv, src };
      out.speed.minus = { ft: 5 * lv, m: 1.5 * lv, src };
    } else {
      if (lv >= 1) push(out.checks.dis, src);
      if (lv >= 2 && lv < 5) push(out.speed.half, src);
      if (lv >= 3) { push(out.attacks.dis, src); push(out.saves.all.dis, src); }
      if (lv >= 4) push(out.maxHpHalf, src);
      if (lv >= 5) push(out.speed.zero, src);
    }
  }
  out.inspiration = !!char?.inspiration;
  out.any = !!(out.attacks.adv.length || out.attacks.dis.length || out.checks.dis.length || out.initiative.adv.length
    || out.initiative.dis.length || out.speed.zero.length || out.speed.half.length || out.speed.minus
    || out.noActions.length || out.d20Penalty || out.saves.all.dis.length
    || ['str', 'dex'].some(a => out.saves[a].dis.length || out.saves[a].fail.length));
  return out;
}

const srcLabel = (s) => (s.when ? `${s.name} (${s.when})` : s.name);
/** "Amedrontado (fonte do medo à vista) · Envenenado": a ressalva fica presa à fonte dela. */
export const sourceNames = (list) => list.map(srcLabel).join(' · ');

/**
 * Sugestão para o seletor "Próximo d20" (nunca é aplicada sozinha: o jogador toca).
 * kind: 'attacks' | 'checks' | 'initiative'. Vantagem e desvantagem juntas se cancelam
 * (artigo "vantagem-desvantagem"): sugere Normal e diz por quê.
 * Sem ações (Incapacitado, 0 PV…) não há ataque nem teste para sugerir: só a iniciativa segue.
 * `conditional`: TODAS as fontes do lado sugerido têm ressalva (Amedrontado, Agarrado): a marca
 * vira seta vazada + "se…", para não parecer incondicional; `clauses` são as ressalvas.
 * → null | { suggest: 'adv' | 'dis' | 'normal', adv: [fontes], dis: [fontes], conditional, clauses }
 */
export function stanceHint(bites, kind) {
  if (!bites) return null;
  if (kind !== 'initiative' && bites.noActions.length) return null;
  let adv = [...(bites[kind]?.adv || [])];
  let dis = [...(bites[kind]?.dis || [])];
  if (kind === 'initiative') {   // iniciativa é um teste de Destreza (artigo "iniciativa")
    for (const s of bites.checks.adv) push(adv, s);
    for (const s of bites.checks.dis) push(dis, s);
  }
  if (!adv.length && !dis.length) return null;
  const suggest = adv.length && dis.length ? 'normal' : adv.length ? 'adv' : 'dis';
  const side = suggest === 'normal' ? [] : suggest === 'adv' ? adv : dis;
  const conditional = side.length > 0 && side.every(s => !!s.when);
  return { suggest, adv, dis, conditional, clauses: conditional ? [...new Set(side.map(s => s.clause))] : [] };
}

/** Marca de uma metade de salvaguarda: null | { kind: 'fail' | 'dis', sources } */
export function saveBite(bites, ability) {
  if (!bites) return null;
  const own = bites.saves[ability];
  if (own?.fail.length) return { kind: 'fail', sources: own.fail };
  const dis = [...(own?.dis || []), ...bites.saves.all.dis];
  return dis.length ? { kind: 'dis', sources: dis } : null;
}

const fmtM = (m, lang) => (L(lang) === 'en' ? String(m) : String(m).replace('.', ','));

/** Marca do medalhão de Deslocamento: null | { kind: 'zero'|'half'|'minus', text, sources } (o número não muda). */
export function speedBite(bites, lang = 'pt') {
  if (!bites) return null;
  const en = L(lang) === 'en';
  if (bites.speed.zero.length) return { kind: 'zero', text: '→ 0', sources: bites.speed.zero };
  if (bites.speed.half.length) return { kind: 'half', text: en ? '→ half' : '→ metade', sources: bites.speed.half };
  if (bites.speed.minus) {
    const { ft, m, src } = bites.speed.minus;
    return { kind: 'minus', text: en ? `−${ft} ft` : `−${fmtM(m, lang)} m`, sources: [src] };
  }
  return null;
}

/**
 * Linha embaixo da barra de Exaustão. 2024: a penalidade calculada só para mostrar
 * ("−4 em todo Teste de d20 · deslocamento −3 m"). 2014: o efeito de cada nível até o atual,
 * com o número do nível ("nv. 1 …"). Nível 6: morte. → null | { level, text, dead }
 */
export function exhaustionLine(level, lang = 'pt', rulesVersion) {
  const lv = Math.max(0, Math.min(EXHAUSTION_MAX, Math.trunc(+level || 0)));
  if (!lv) return null;
  const en = L(lang) === 'en';
  const name = `${en ? 'Exhaustion' : 'Exaustão'} ${lv}`;
  const levels = CONDITION_SHORTS.exaustao.levels2014;
  if (lv >= EXHAUSTION_MAX) return { level: lv, dead: true, text: `${name}: ${levels[5][L(lang)]}` };
  if (is2024(rulesVersion)) {
    return {
      level: lv, dead: false,
      text: en
        ? `${name}: −${2 * lv} on every D20 Test · Speed −${5 * lv} ft`
        : `${name}: −${2 * lv} em todo Teste de d20 · deslocamento −${fmtM(1.5 * lv, lang)} m`,
    };
  }
  const nv = en ? 'Lv' : 'nv.';   // "nv. 1 desvantagem…": o número é o nível, não uma quantidade
  return { level: lv, dead: false, text: `${name}: ${levels.slice(0, lv).map((t, i) => `${nv} ${i + 1} ${t[L(lang)]}`).join(' · ')}` };
}

// ── Estados do herói, em ordem (lista de estados, faixa do celular, moldura do painel) ──
export function hpFlags(char) {
  const down = (char?.currentHp || 0) <= 0 && (char?.maxHp || 0) > 0;
  const ds = char?.deathSaves || {};
  const exh = exhaustionLevel(char || {});
  const dead = (down && (ds.fail || 0) >= 3) || exh >= EXHAUSTION_MAX;
  const stable = down && !dead && ((ds.success || 0) >= 3 || !!char?.stabilized);
  const state = hpState(char?.currentHp, char?.maxHp);
  return {
    down, dead, stable, dying: down && !dead && !stable,
    bloodied: !down && (state === 'warn' || state === 'crit'),
    near: !down && state === 'crit',
    temp: Math.max(0, char?.tempHp || 0),
    exh,
  };
}

/**
 * Todos os estados ativos do mais grave ao mais leve:
 * [{ key, kind: 'hp'|'cond'|'temp'|'form'|'boon', id?, fam }]
 * O primeiro dá a cor da moldura do painel Vitalidade e do selo no coração.
 */
export function statusList(char) {
  const f = hpFlags(char);
  const out = [];
  if (f.dead) out.push({ key: 'dead', kind: 'hp', fam: 'death' });
  else if (f.dying) out.push({ key: 'dying', kind: 'hp', fam: 'dying' });
  else if (f.stable) out.push({ key: 'stable', kind: 'hp', fam: 'stable' });
  for (const id of byPriority(char?.conditions)) {
    if (id === 'exhausted') continue;
    out.push({ key: `c-${id}`, kind: 'cond', id, fam: FAMILY[id] });
  }
  if (f.near) out.push({ key: 'near', kind: 'hp', fam: 'blood' });
  else if (f.bloodied) out.push({ key: 'bloodied', kind: 'hp', fam: 'blood' });
  if (f.exh > 0) out.push({ key: 'c-exhausted', kind: 'cond', id: 'exhausted', fam: 'weary', level: f.exh });
  if (char?.wildShape?.active) out.push({ key: 'wild', kind: 'form', fam: 'wild' });
  for (const e of char?.tempEffects || []) out.push({ key: `t-${e.id}`, kind: 'temp', id: e.id, fam: 'custom', name: e.name, duration: e.duration });
  if (char?.inspiration) out.push({ key: 'inspired', kind: 'boon', fam: 'gold' });
  return out;
}

const HP_LABEL = {
  dead: { pt: 'Morto', en: 'Dead' },
  dying: { pt: 'Caído', en: 'Down' },
  stable: { pt: 'Estável', en: 'Stable' },
  near: { pt: 'À beira da morte', en: 'Near death' },
  bloodied: { pt: 'Sangrando', en: 'Bloodied' },
  wild: { pt: 'Forma Selvagem', en: 'Wild Shape' },
  inspired: { pt: 'Inspirado', en: 'Inspired' },
};
/** Nome curto de um item de statusList, no idioma. */
export function statusLabel(s, lang = 'pt') {
  const lg = L(lang);
  if (s.kind === 'cond') {
    if (s.id === 'exhausted') return `${lg === 'en' ? 'Exhaustion' : 'Exaustão'}${s.level ? ` ${s.level}` : ''}`;
    return tName('condition', s.id, lang);
  }
  if (s.kind === 'temp') return s.name || (lg === 'en' ? 'Effect' : 'Efeito');
  return HP_LABEL[s.key]?.[lg] || s.key;
}

/**
 * Faixa de estados do celular: só aparece quando há aonde levar o jogador. `main` são os
 * estados com linha na lista (condições, Exaustão, efeitos, Sangrando / à beira) ou na linha
 * dos testes contra a morte (Caído, Estável, Morto). Inspiração, Forma Selvagem e Sangrando
 * (que sozinho não faz nada) são `extra`: só acompanham uma faixa que já existe.
 * → { main: [...], extra: [...], target: 'death' | 'list' | null }
 */
export function stripList(char) {
  const all = statusList(char);
  const lone = (x) => x.kind === 'form' || x.kind === 'boon' || x.key === 'bloodied';
  const main = all.filter(x => !lone(x));
  const extra = main.length ? all.filter(lone) : [];
  const first = main[0];
  const target = !first ? null : (first.key === 'dying' || first.key === 'stable' || first.key === 'dead') ? 'death' : 'list';
  return { main, extra, target };
}

// ── Quem manda no retrato: morto (sozinho) > caído > estável > condições (PRIORITY)
//    > forma selvagem > à beira da morte > sangrando > exaustão ──
export function artStack(char) {
  const f = hpFlags(char);
  const out = [];
  // morto: o retrato é só o do morto (nada de veneno, corrente ou cor de outra condição por cima)
  if (f.dead) return ['dead'];
  if (f.dying) out.push('dying');
  else if (f.stable) out.push('stable');
  // a 0 PV o retrato já está "caído": o "Zz" de Inconsciente fica só para quem dorme com PV
  for (const id of byPriority(char?.conditions)) if (id !== 'exhausted' && !(id === 'unconscious' && f.down)) out.push(id);
  if (char?.wildShape?.active) out.push('wild');
  if (f.near) out.push('near');
  else if (f.bloodied) out.push('bloodied');
  if (f.exh > 0) out.push('exhausted');
  return out;
}

export function condClasses(char) {
  const f = hpFlags(char);
  const out = (char.conditions || []).filter(c => CONDITION_ARTICLE[c] && c !== 'exhausted').map(c => `c-${c}`);
  if (f.exh > 0) out.push('c-exhausted', `exh-${f.exh}`);
  if (f.down) out.push('is-down');
  if (f.dead) out.push('is-dead');
  else if (f.dying) out.push('is-dying');
  else if (f.stable) out.push('is-stable');
  if (f.near) out.push('is-near');
  if (f.bloodied) out.push('is-bloodied');
  if (char.wildShape?.active) out.push('is-wild');
  if (char.inspiration) out.push('is-inspired');
  if ((char.tempEffects || []).length) out.push('has-effect');
  const top = artStack(char)[0];
  if (top) out.push(`pf-${top}`, 'has-status');
  return out;
}
