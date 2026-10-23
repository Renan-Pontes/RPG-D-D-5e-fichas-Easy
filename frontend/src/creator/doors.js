/*
 * "Portas para o futuro": com os atributos de agora, em quais classes o herói
 * poderia entrar por multiclasse mais adiante. Só apresentação — lê a regra de
 * src/progression/multiclass.js (cada grupo precisa de um atributo >= 13, e a
 * classe atual também precisa cumprir a própria) e os valores finais de
 * quickSummary (já com o bônus esperado do antecedente/raça). Funções puras
 * (testadas em tests/creator-doors.test.js).
 */
import { MULTICLASS_PREREQS } from '../progression/multiclass.js';
import { quickSummary, abilitiesIssues, ABILITY_NAMES } from './ability-helpers.js';

/** Valor mínimo pedido pela multiclasse. */
export const DOOR_MIN = 13;
/** As 13 classes, na ordem do livro (artífice por último). */
export const DOOR_CLASSES = Object.keys(MULTICLASS_PREREQS);

const SHORT = {
  str: { pt: 'FOR', en: 'STR' }, dex: { pt: 'DES', en: 'DEX' }, con: { pt: 'CON', en: 'CON' },
  int: { pt: 'INT', en: 'INT' }, wis: { pt: 'SAB', en: 'WIS' }, cha: { pt: 'CAR', en: 'CHA' },
};
const k = (lang) => (lang === 'pt' ? 'pt' : 'en');
const or = (lang) => (lang === 'pt' ? ' ou ' : ' or ');
const and = (lang) => (lang === 'pt' ? ' e ' : ' and ');

/**
 * Os atributos já foram distribuídos? Mesma ideia de abilitiesSet (decision.js),
 * mas sem exigir creation.abilityMethod: quem fica no conjunto padrão (o
 * método já marcado) nunca grava o método, e mesmo assim terminou a etapa.
 */
export const abilitiesReady = (char) => !!char && abilitiesIssues(char).length === 0;

/** Grupos do pré-requisito que ainda não têm nenhum atributo >= 13. */
export const missingGroups = (groups, scores) =>
  (groups || []).filter(g => !g.some(a => (scores?.[a] || 0) >= DOOR_MIN));

/**
 * Estado das portas:
 *   { ready, scores, own: { id, need, missing, ok } | null, doors: [{ id, own, need, missing, ok, open }], openCount }
 * ok = cumpre o pré-requisito da classe; open = porta acesa (cumpre o da classe
 * nova e o da classe atual). A classe atual aparece com own: true e nunca "abre".
 */
export function multiclassDoors(char) {
  const ready = abilitiesReady(char);
  const scores = quickSummary(char || {}).final;
  const ownId = char && MULTICLASS_PREREQS[char.className] ? char.className : null;
  const ownMissing = ownId ? missingGroups(MULTICLASS_PREREQS[ownId], scores) : [];
  const own = ownId ? { id: ownId, need: MULTICLASS_PREREQS[ownId], missing: ownMissing, ok: ownMissing.length === 0 } : null;
  const doors = DOOR_CLASSES.map(id => {
    const need = MULTICLASS_PREREQS[id];
    const missing = missingGroups(need, scores);
    const isOwn = id === ownId;
    return { id, own: isOwn, need, missing, ok: missing.length === 0, open: !isOwn && missing.length === 0 && ownMissing.length === 0 };
  });
  // A classe atual vem primeiro ("seu caminho"); as outras seguem a ordem do livro.
  doors.sort((a, c) => Number(c.own) - Number(a.own));
  return { ready, scores, own, doors, openCount: doors.filter(d => d.open).length };
}

/** Pré-requisito curto, para a porta: "FOR ou DES 13" / "FOR 13 · CAR 13". */
export function needShort(groups, lang = 'pt') {
  return (groups || []).map(g => `${g.map(a => SHORT[a]?.[k(lang)] || a).join(or(lang))} ${DOOR_MIN}`).join(' · ');
}

/** Pré-requisito por extenso: "Força ou Destreza 13" / "Força 13 e Carisma 13". */
export function needLong(groups, lang = 'pt') {
  return (groups || []).map(g => `${g.map(a => ABILITY_NAMES[a]?.[k(lang)] || a).join(or(lang))} ${DOOR_MIN}`).join(and(lang));
}

/** Valores atuais dos atributos citados: "Força 12 e Destreza 11". */
export function haveLong(groups, scores, lang = 'pt') {
  const ids = [...new Set((groups || []).flat())];
  return ids.map(a => `${ABILITY_NAMES[a]?.[k(lang)] || a} ${scores?.[a] ?? '—'}`).join(and(lang));
}

/** Valores atuais curtos: "FOR 12 · DES 11". */
export function haveShort(groups, scores, lang = 'pt') {
  const ids = [...new Set((groups || []).flat())];
  return ids.map(a => `${SHORT[a]?.[k(lang)] || a} ${scores?.[a] ?? '—'}`).join(' · ');
}
