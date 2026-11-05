// Raio-X › as seções da página e o resumo de uma linha das recolhidas (F2.6), sem React —
// testado em tests/insights-sections.test.js.
// - O topo (Resumo, Ideias, Momentos, Equilíbrio) fica aberto; as seções de analista (papel,
//   perícias, dano, lacunas, escolas, cada personagem, tabela, contra quem) começam recolhidas
//   no PC e no celular, cada uma com a linha que diz o que tem dentro.
// - O índice preso tem um chip por seção: toque leva até ela (e abre a recolhida).
import { abilShort, axisLabel, DAMAGE_TYPES, damageLabel, firstName, fmt, schoolLabel, SCHOOLS, skillLabel, t } from './party-metrics.js';
import { difficultyText } from './versus.js';

export const SECTIONS = [
  { id: 'quads', label: ['Resumo', 'Summary'], top: true },
  { id: 'ideas', label: ['Ideias', 'Ideas'], top: true },
  { id: 'moments', label: ['Momentos', 'Moments'], top: true },
  { id: 'balance', label: ['Equilíbrio', 'Balance'], top: true },
  { id: 'roles', label: ['Papel do grupo', 'Party roles'] },
  { id: 'skills', label: ['Perícias', 'Skills'] },
  { id: 'damage', label: ['Dano', 'Damage'] },
  { id: 'gaps', label: ['Lacunas', 'Gaps'] },
  { id: 'schools', label: ['Escolas', 'Schools'] },
  { id: 'chars', label: ['Cada personagem', 'Each character'] },
  { id: 'table', label: ['Tabela', 'Table'] },
  { id: 'versus', label: ['Contra quem?', 'Against whom?'] },
];
export const FOLDS = SECTIONS.filter(s => !s.top).map(s => s.id);
export const sectionLabel = (id, lang) => { const s = SECTIONS.find(x => x.id === id); return s ? s.label[lang === 'en' ? 1 : 0] : id; };
// os ids que a página já usava ("Ver os momentos", "Ver todas" das Fraquezas) ficam
export const sectionDomId = (id) => (id === 'moments' ? 'ins-moments' : id === 'gaps' ? 'ins-gaps' : `ins-sec-${id}`);

/** A seção recolhível está aberta? Só se o mestre abriu (lembrado no aparelho): começa fechada. */
export const foldOpen = (open, id) => !!open?.[id];

/** Abrir uma seção (o índice, "Ver todas"): o mapa novo de abertas, ou o mesmo se já estava. */
export const withOpen = (open, id) => (FOLDS.includes(id) && !open?.[id] ? { ...(open || {}), [id]: true } : open || {});

const joinAnd = (list, lang) => (list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} ${t(lang, 'e', 'and')} ${list.at(-1)}`);

/**
 * O resumo de uma linha de cada seção recolhida, do que já está calculado na página.
 *   calc     — as contas do Raio-X (axes, skills, damage, schools, gaps)
 *   facts    — quem entra; shownAxes — os eixos à vista; gapCount — linhas de lacuna
 *   versus   — o "Contra quem?" escolhido (versus.versus) ou null
 * → {roles, skills, damage, gaps, schools, chars, table, versus}
 */
export function sectionSummaries({ calc, facts, shownAxes, gapCount = 0, topGap = '', versus = null, lang = 'pt' }) {
  const out = {};
  const a = calc.axes.axes;
  // papel: os 2 eixos mais altos e o mais baixo (o melhor de cada)
  const byBest = shownAxes.slice().sort((x, y) => a[y].best - a[x].best || shownAxes.indexOf(x) - shownAxes.indexOf(y));
  if (byBest.length) {
    const top = byBest.slice(0, 2).map(k => `${axisLabel(k, lang)} ${fmt(a[k].best, lang)}`);
    const low = byBest.at(-1);
    out.roles = t(lang, `Forte em ${joinAnd(top, lang)} · mais fraco em ${axisLabel(low, lang)} ${fmt(a[low].best, lang)}`,
      `Strong at ${joinAnd(top, lang)} · weakest at ${axisLabel(low, lang)} ${fmt(a[low].best, lang)}`);
  } else out.roles = t(lang, 'Todos os eixos escondidos (Ajustar)', 'All axes hidden (Adjust)');
  // perícias: a melhor e a mais fraca do grupo (passiva do melhor)
  const sk = calc.skills.slice().sort((x, y) => y.passive - x.passive || y.chanceGroup - x.chanceGroup);
  if (sk.length) {
    const best = sk[0];
    const worst = sk.at(-1);
    out.skills = t(lang, `Melhor: ${skillLabel(best.skill, lang)} ${best.passive} (${best.who.map(firstName).join(', ')}) · mais fraca: ${skillLabel(worst.skill, lang)} ${worst.passive}`,
      `Best: ${skillLabel(best.skill, lang)} ${best.passive} (${best.who.map(firstName).join(', ')}) · weakest: ${skillLabel(worst.skill, lang)} ${worst.passive}`);
  }
  // dano: quantos dos 13 tipos e os que faltam
  const missing = DAMAGE_TYPES.filter(k => !(calc.damage[k] || []).length);
  out.damage = missing.length
    ? t(lang, `${DAMAGE_TYPES.length - missing.length} de ${DAMAGE_TYPES.length} tipos · falta ${joinAnd(missing.map(k => damageLabel(k, lang)), lang)}`,
      `${DAMAGE_TYPES.length - missing.length} of ${DAMAGE_TYPES.length} types · missing ${joinAnd(missing.map(k => damageLabel(k, lang)), lang)}`)
    : t(lang, 'Os 13 tipos de dano', 'All 13 damage types');
  // lacunas: quantas e a mais séria
  out.gaps = gapCount
    ? t(lang, `${gapCount} lacuna${gapCount === 1 ? '' : 's'} · a mais séria: ${topGap}`, `${gapCount} gap${gapCount === 1 ? '' : 's'} · most serious: ${topGap}`)
    : t(lang, 'Nenhuma lacuna', 'No gaps');
  // escolas: quantas magias e a escola mais conhecida
  const schoolN = SCHOOLS.map(s => [s, (calc.schools[s] || []).reduce((n, x) => n + x.n, 0)]).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]);
  const casters = facts.filter(f => SCHOOLS.some(s => (calc.schools[s] || []).some(x => x.id === f.id)));
  const none = SCHOOLS.length - schoolN.length;
  out.schools = schoolN.length
    ? [t(lang, `${casters.length} conjurador${casters.length === 1 ? '' : 'es'} · mais magias de ${schoolLabel(schoolN[0][0], lang)} (${schoolN[0][1]})`,
      `${casters.length} caster${casters.length === 1 ? '' : 's'} · most spells in ${schoolLabel(schoolN[0][0], lang)} (${schoolN[0][1]})`),
    none ? t(lang, `${none} escola${none === 1 ? '' : 's'} sem nenhuma`, `${none} school${none === 1 ? '' : 's'} with none`) : null].filter(Boolean).join(' · ')
    : t(lang, 'Ninguém conhece magias ainda', 'Nobody knows spells yet');
  // cada personagem: o atributo mais alto de cada um
  out.chars = facts.map(f => {
    const ab = Object.keys(f.scores).sort((x, y) => f.scores[y] - f.scores[x])[0];
    return `${firstName(f.name)} ${abilShort(ab, lang)} ${f.scores[ab]}`;
  }).join(' · ');
  // tabela: as faixas de CA e PV
  if (facts.length) {
    const acs = facts.map(f => f.ac);
    const hps = facts.map(f => f.maxHp);
    const range = (l) => (Math.min(...l) === Math.max(...l) ? `${l[0]}` : `${Math.min(...l)}–${Math.max(...l)}`);
    out.table = t(lang, `CA ${range(acs)} · PV ${range(hps)} · atributos, salvaguardas, perícias e dano de cada um`,
      `AC ${range(acs)} · HP ${range(hps)} · abilities, saves, skills and damage of each one`);
  }
  // contra quem: o monstro escolhido (dificuldade e o que importa) ou o convite
  if (versus) {
    const diff = difficultyText(versus.difficulty, versus.name, lang);
    out.versus = [diff || `${versus.name}`, versus.parts?.[0] || ''].filter(Boolean).join(' · ');
  } else {
    out.versus = t(lang, 'Escolha um monstro: o dano e as salvaguardas do grupo contra ele, e a dificuldade', 'Pick a monster: the party’s damage and saves against it, and the difficulty');
  }
  return out;
}
