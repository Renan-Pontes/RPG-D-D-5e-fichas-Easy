/* Ilustrações do site (geradas para a Forja; ficam em public/art/). */
const CLASS_ART = new Set(['artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard']);
const SPECIES_ART = ['aasimar', 'dragonborn', 'dwarf', 'elf', 'gnome', 'goliath', 'halfling', 'human', 'orc', 'tiefling'];
// Raças 2014 / sub-raças → ilustração da espécie mais próxima.
const SPECIES_ALIAS = { 'half-orc': 'orc', 'half-elf': 'elf', drow: 'elf' };

export const classArt = (id) => (CLASS_ART.has(id) ? `/art/classes/${id}.webp` : null);

export function speciesArt(id) {
  if (!id) return null;
  const s = String(id).toLowerCase();
  if (SPECIES_ALIAS[s]) return `/art/species/${SPECIES_ALIAS[s]}.webp`;
  const base = SPECIES_ART.find((b) => s === b || s.startsWith(`${b}-`));
  return base ? `/art/species/${base}.webp` : null;
}

export const HERO_ART = '/art/hero-forge.webp';
export const GRIMOIRE_ART = '/art/grimoire-book.webp';

/** Esconde a imagem se o arquivo não existir (evita ícone de imagem quebrada). */
export const hideOnError = (e) => { e.currentTarget.style.display = 'none'; };
