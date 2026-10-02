/* Funções puras da criação de personagem (sem React). Ver README.md. */
import Utils from '../../utils.js';
import SRD from '../../data/srd.js';

export const newCharacter = (rulesVersion = '2024') => ({
  ...Utils.makeNew(),
  rulesVersion,
  level: 1,
  xp: 0,
  creation: {},
});

/** Talento de origem (2024) gravado em char.feats com origin: 'background'. */
export const originFeatEntry = (char) => (char.feats || []).find(f => f?.origin === 'background') || null;

/** Perícias escolhidas no talento de origem (ex.: Habilidoso). */
export const originFeatSkills = (char) => {
  const p = originFeatEntry(char)?.picks || {};
  return [...(p.skillOrTool || []), ...(p.skill || [])].filter(id => SRD.SKILLS.some(s => s.id === id));
};

/** Ficha pronta para salvar: idiomas e perícias consolidados, PV cheios, sem os rascunhos da criação. */
export function finalizeCharacter(char) {
  const { creation, ...rest } = char;
  const normalized = {
    ...rest,
    languages: Utils.languagesFor(char),
    skillProfs: [...new Set([...(char.skillProfs || []), ...Utils.backgroundSkills(char), ...originFeatSkills(char)])],
  };
  const maxHp = Utils.maxHpDefault(normalized);
  return { ...normalized, maxHp, currentHp: maxHp };
}
