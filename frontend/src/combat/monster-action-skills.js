/**
 * monster-action-skills.js
 *
 * D&D 5e 2024 Taxonomy: 4 Canonical Action Groups covering all 18 SRD skills:
 * - Search (Busca): Survival, Insight, Medicine, Perception
 * - Study (Estudo): Arcana, Religion, Nature, Investigation, History
 * - Influence (Influência): Animal Handling, Deception, Intimidation, Performance, Persuasion
 * - Hide (Furtividade): Acrobatics, Athletics, Sleight of Hand, Stealth
 *
 * Provides consolidated summary calculation with exceptions exposed:
 * e.g. "Search: 15/+5 (20/+5 Perception)"
 */

export const ACTION_SKILL_GROUPS = [
  {
    key: 'search',
    namePt: 'Busca',
    nameEn: 'Search',
    icon: '🔍',
    skills: [
      { id: 'survival', namePt: 'Sobrevivência', nameEn: 'Survival', abil: 'wis' },
      { id: 'insight', namePt: 'Intuição', nameEn: 'Insight', abil: 'wis' },
      { id: 'medicine', namePt: 'Medicina', nameEn: 'Medicine', abil: 'wis' },
      { id: 'perception', namePt: 'Percepção', nameEn: 'Perception', abil: 'wis' },
    ],
  },
  {
    key: 'study',
    namePt: 'Estudo',
    nameEn: 'Study',
    icon: '📚',
    skills: [
      { id: 'arcana', namePt: 'Arcanismo', nameEn: 'Arcana', abil: 'int' },
      { id: 'religion', namePt: 'Religião', nameEn: 'Religion', abil: 'int' },
      { id: 'nature', namePt: 'Natureza', nameEn: 'Nature', abil: 'int' },
      { id: 'investigation', namePt: 'Investigação', nameEn: 'Investigation', abil: 'int' },
      { id: 'history', namePt: 'História', nameEn: 'History', abil: 'int' },
    ],
  },
  {
    key: 'influence',
    namePt: 'Influência',
    nameEn: 'Influence',
    icon: '💬',
    skills: [
      { id: 'animalHandling', namePt: 'Adestrar Animais', nameEn: 'Animal Handling', abil: 'wis' },
      { id: 'deception', namePt: 'Enganação', nameEn: 'Deception', abil: 'cha' },
      { id: 'intimidation', namePt: 'Intimidação', nameEn: 'Intimidation', abil: 'cha' },
      { id: 'performance', namePt: 'Atuação', nameEn: 'Performance', abil: 'cha' },
      { id: 'persuasion', namePt: 'Persuasão', nameEn: 'Persuasion', abil: 'cha' },
    ],
  },
  {
    key: 'hide',
    namePt: 'Furtividade',
    nameEn: 'Hide',
    icon: '👣',
    skills: [
      { id: 'acrobatics', namePt: 'Acrobacia', nameEn: 'Acrobatics', abil: 'dex' },
      { id: 'athletics', namePt: 'Atletismo', nameEn: 'Athletics', abil: 'str' },
      { id: 'sleightOfHand', namePt: 'Prestidigitação', nameEn: 'Sleight of Hand', abil: 'dex' },
      { id: 'stealth', namePt: 'Furtividade', nameEn: 'Stealth', abil: 'dex' },
    ],
  },
];

/**
 * Computes consolidated notation and skill metrics for an action group.
 * @param {object} group
 * @param {object} abils
 * @param {Map} explicitMap
 * @param {string} lang
 * @returns {{ groupTitle: string, consolidatedText: string, baseline: string, exceptions: Array, skills: Array }}
 */
export function computeActionGroupData(group, abils, explicitMap, lang = 'pt') {
  const isPt = lang === 'pt';
  const groupTitle = isPt ? group.namePt : group.nameEn;

  const groupSkills = group.skills.map((s) => {
    const cleanId = s.id.toLowerCase().replace(/[\s_\-]/g, '');
    const cleanEn = s.nameEn.toLowerCase().replace(/[\s_\-]/g, '');
    const cleanPt = s.namePt.toLowerCase().replace(/[\s_\-]/g, '');

    let explicit = explicitMap ? explicitMap.get(cleanId) : undefined;
    if (explicit == null && explicitMap) explicit = explicitMap.get(cleanEn);
    if (explicit == null && explicitMap) explicit = explicitMap.get(cleanPt);
    if (explicit == null && cleanId === 'animalhandling' && explicitMap) {
      explicit = explicitMap.get('animalhandle') ?? explicitMap.get('handling');
    }
    if (explicit == null && cleanId === 'sleightofhand' && explicitMap) {
      explicit = explicitMap.get('sleight');
    }

    const abilScore = (abils && abils[s.abil] != null) ? abils[s.abil] : 10;
    const abilMod = Math.floor((abilScore - 10) / 2);
    const bonus = explicit != null ? explicit : abilMod;
    const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
    const passive = 10 + bonus;
    const isTrained = explicit != null;
    const name = isPt ? s.namePt : s.nameEn;
    const abilUpper = s.abil.toUpperCase();

    return {
      ...s,
      name,
      bonus,
      bonusStr,
      passive,
      isTrained,
      abilUpper,
      notationPair: `${passive}/${bonusStr}`,
    };
  });

  const counts = new Map();
  for (const s of groupSkills) {
    counts.set(s.notationPair, (counts.get(s.notationPair) || 0) + 1);
  }

  let baseline = groupSkills[0].notationPair;
  let maxCount = 0;
  for (const [pair, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      baseline = pair;
    }
  }

  const exceptions = groupSkills.filter((s) => s.notationPair !== baseline);

  let consolidatedText = `${groupTitle}: ${baseline}`;
  if (exceptions.length > 0) {
    const excStr = exceptions.map((e) => `${e.notationPair} ${e.name}`).join(', ');
    consolidatedText += ` (${excStr})`;
  }

  return {
    groupTitle,
    consolidatedText,
    baseline,
    exceptions,
    skills: groupSkills,
  };
}
