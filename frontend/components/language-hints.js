// Sugestões de idioma para iniciantes (sem React; usado pelo LanguagePicker e pela etapa Idiomas).
import Utils from '../utils.js';

// 2024: idioma que combina com a espécie escolhida (só sugestão; a espécie não dá idiomas).
const SPECIES_LANGUAGE = {
  dwarf: 'Dwarvish', elf: 'Elvish', drow: 'Elvish', 'half-elf': 'Elvish', gnome: 'Gnomish', halfling: 'Halfling',
  orc: 'Orc', 'half-orc': 'Orc', goliath: 'Giant', dragonborn: 'Draconic', tiefling: 'Infernal', aasimar: 'Celestial',
};
export const speciesLanguageHint = (char) => {
  if (char?.rulesVersion !== '2024' || !char.race) return null;
  const id = String(char.race);
  const key = Object.keys(SPECIES_LANGUAGE).sort((a, b) => b.length - a.length).find(k => id === k || id.startsWith(`${k}-`));
  if (!key) return null;
  const lang = SPECIES_LANGUAGE[key];
  // Infernal/Celestial são raros em 2024: só sugere se o herói tiver vaga para idioma raro (ex.: Ladino).
  let rare = false, allowance = 0;
  try { rare = Utils.isRareLanguage(char, lang); allowance = Utils.rareLanguageAllowance(char); } catch { /* sem dados: segue */ }
  return rare && !allowance ? null : lang;
};

// Idiomas úteis em muitas aventuras (todos da lista Padrão nas duas regras), em ordem de preferência.
const USEFUL = ['Dwarvish', 'Elvish', 'Giant', 'Goblin', 'Orc', 'Gnomish', 'Halfling'];

/**
 * Sugestão para iniciantes: { ids, kind }. kind 'species' = o idioma do povo da
 * espécie (2024); kind 'recommended' = idiomas úteis que o herói ainda não fala
 * (Humano, espécies sem idioma próprio e fichas 2014, sem repetir os fixos).
 */
export const languageSuggestions = (char) => {
  const hint = speciesLanguageHint(char);
  if (hint) return { ids: [hint], kind: 'species' };
  let fixed = [];
  try { fixed = Utils.fixedLanguages(char); } catch { fixed = []; }
  let need = 0;
  try { need = Utils.languageChoiceCount(char); } catch { need = 0; }
  if (!need) return { ids: [], kind: 'recommended' };
  return { ids: USEFUL.filter(id => !fixed.includes(id)).slice(0, Math.min(need, 3)), kind: 'recommended' };
};

