/*
 * Lógica pura das etapas Espécie, Escolhas da espécie e Idiomas da criação
 * (sem React). Ver README.md.
 *
 * Textos de sabor e explicações são resumos próprios (não copiados de livros).
 */
import Utils from '../../utils.js';
import { tName } from '../../data/i18n.js';
import { findFeat } from '../../data/feats.js';
import { featTakenIssue } from '../progression/feat-rules.js';
import {
  speciesDef, speciesChoiceSpecs, speciesChoiceIssues, speciesGrants, speciesFeatEntry, withSpeciesFeat, SKILL_IDS,
} from '../progression/species.js';
import { startingTools } from './start-data.js';
import { STANDARD_ARRAY_BY_CLASS } from './ability-helpers.js';

const b = (pt, en) => ({ pt, en });
const rv = (char) => (char?.rulesVersion === '2014' ? '2014' : '2024');
const list = (v) => (Array.isArray(v) ? v : v != null && v !== '' ? [v] : []);
const SKILL_IDS_SET = new Set(SKILL_IDS);

// ---------------------------------------------------------------------------
// Lista curta
// ---------------------------------------------------------------------------

/** 2024: as 9 espécies do SRD 5.2.1 + Aasimar (PHB 2024). */
export const CORE_SPECIES_2024 = ['dragonborn', 'dwarf', 'elf', 'gnome', 'goliath', 'halfling', 'human', 'orc', 'tiefling', 'aasimar'];

/**
 * 2014: as raças do SRD 5.1 / Livro do Jogador, com as sub-raças agrupadas.
 * `srd` = sub-raça presente no SRD 5.1 (as outras são do Livro do Jogador 2014).
 */
export const CORE_GROUPS_2014 = [
  { id: 'dwarf', name: b('Anão', 'Dwarf'), members: ['dwarf-hill', 'dwarf-mountain'], srd: ['dwarf-hill'] },
  { id: 'elf', name: b('Elfo', 'Elf'), members: ['elf-high', 'elf-wood', 'drow'], srd: ['elf-high'] },
  { id: 'halfling', name: b('Halfling', 'Halfling'), members: ['halfling-light', 'halfling-stout'], srd: ['halfling-light'] },
  { id: 'human', name: b('Humano', 'Human'), members: ['human'], srd: ['human'] },
  { id: 'dragonborn', name: b('Draconato', 'Dragonborn'), members: ['dragonborn'], srd: ['dragonborn'] },
  { id: 'gnome', name: b('Gnomo', 'Gnome'), members: ['gnome-rock', 'gnome-forest'], srd: ['gnome-rock'] },
  { id: 'half-elf', name: b('Meio-Elfo', 'Half-Elf'), members: ['half-elf'], srd: ['half-elf'] },
  { id: 'half-orc', name: b('Meio-Orc', 'Half-Orc'), members: ['half-orc'], srd: ['half-orc'] },
  { id: 'tiefling', name: b('Tiferino', 'Tiefling'), members: ['tiefling'], srd: ['tiefling'] },
];

/** Raças legadas que não fazem sentido em ficha 2024 (o Humano 2024 cumpre o papel). */
export const HIDDEN_2024 = ['human-variant', 'custom-lineage'];

/** "Bom para começar": poucas escolhas e traços fáceis de usar. */
export const RECOMMENDED = {
  '2024': ['human', 'dwarf', 'orc'],
  '2014': ['human', 'dwarf-hill', 'half-orc'],
};

/** Uma linha de sabor (resumo próprio). Chave = id da espécie ou do grupo 2014. */
export const FLAVOR = {
  dragonborn: b('Descendentes de dragões, com escamas e um sopro de energia.', 'Dragon-descended folk with scales and a breath weapon.'),
  dwarf: b('Povo robusto das montanhas, difícil de derrubar e resistente a veneno.', 'Sturdy mountain folk, hard to bring down and resistant to poison.'),
  elf: b('Povo mágico e de vida longa, com sentidos aguçados.', 'Long-lived magical folk with keen senses.'),
  gnome: b('Pequenos, curiosos e espertos, com um toque de magia.', 'Small, curious and clever, with a touch of magic.'),
  goliath: b('Gigantes de sangue: altos, fortes e com um poder herdado.', 'Giant-blooded: tall, strong and with an inherited power.'),
  halfling: b('Pequenos, corajosos e sortudos; passam despercebidos.', 'Small, brave and lucky; they slip by unnoticed.'),
  human: b('Versáteis e ambiciosos; se adaptam a qualquer papel.', 'Versatile and ambitious; they fit any role.'),
  orc: b('Fortes e incansáveis; se levantam quando deveriam cair.', 'Strong and tireless; they get back up when they should fall.'),
  tiefling: b('Com sangue de demônios ou diabos e magia sombria de nascença.', 'Fiend-blooded, born with dark magic.'),
  aasimar: b('Tocados por seres celestiais: curam com as mãos e brilham em batalha.', 'Touched by celestials: they heal with a touch and shine in battle.'),
  'half-elf': b('Entre dois povos: carismáticos e cheios de talentos.', 'Between two peoples: charismatic and multi-talented.'),
  'half-orc': b('Fortes e ferozes; acertos críticos mais pesados.', 'Strong and fierce; their critical hits hit harder.'),
  'dwarf-hill': b('Mais vida (+1 PV por nível) e intuição.', 'More Hit Points (+1 per level) and good intuition.'),
  'dwarf-mountain': b('Mais força e treino com armaduras leves e médias.', 'Extra strength and training with light and medium armor.'),
  'elf-high': b('Ganha um truque de mago e mais inteligência.', 'Gains a wizard cantrip and extra intelligence.'),
  'elf-wood': b('Mais rápido e ótimo para se esconder na natureza.', 'Faster and great at hiding in the wild.'),
  drow: b('Enxerga longe no escuro e tem magia própria, mas sofre sob o sol.', 'Sees far in darkness and has innate magic, but suffers in sunlight.'),
  'halfling-light': b('Some atrás de outras pessoas e conquista com charme.', 'Hides behind others and wins people over.'),
  'halfling-stout': b('Mais resistente, aguenta até veneno.', 'Hardier, even shrugs off poison.'),
  'gnome-rock': b('Inventor de engenhocas que entende de objetos.', 'A tinkerer of gadgets who knows objects.'),
  'gnome-forest': b('Cria ilusões simples e fala com animais pequenos.', 'Creates small illusions and talks to small animals.'),
};

// ---------------------------------------------------------------------------
// Dados de uma espécie
// ---------------------------------------------------------------------------

/** Todas as espécies da regra da ficha (com legadas em 2024). */
export const allSpecies = (char) => Utils.races(char);

export const findSpecies = (char, id = char?.race) => allSpecies(char).find(r => r.id === id) || null;

/** Grupo 2014 de uma raça (ou null). */
export const groupOf = (raceId) => CORE_GROUPS_2014.find(g => g.members.includes(raceId)) || null;

/** Ids da lista curta (2024: espécies; 2014: todas as sub-raças dos grupos). */
export function coreIds(char) {
  return rv(char) === '2014' ? CORE_GROUPS_2014.flatMap(g => g.members) : CORE_SPECIES_2024;
}

/** Espécies de outros livros (lista recolhida), filtradas pela busca. */
export function moreSpecies(char, query = '') {
  const core = new Set(coreIds(char));
  const is24 = rv(char) === '2024';
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(query).trim();
  return allSpecies(char)
    .filter(r => !core.has(r.id) && !(is24 && HIDDEN_2024.includes(r.id)))
    .filter(r => !q || norm(`${tName('race', r.id, 'pt')} ${tName('race', r.id, 'en')} ${r.id} ${r.source || ''}`).includes(q))
    .sort((a, b2) => tName('race', a.id, 'pt').localeCompare(tName('race', b2.id, 'pt')));
}

export const isCore = (char, id = char?.race) => coreIds(char).includes(id);
export const isRecommended = (char, id) => RECOMMENDED[rv(char)].includes(id);

const isDarkvisionTrait = (t) => /darkvision/i.test(t?.name?.en || '');

/** Alcance da visão no escuro (pés) de uma espécie, sem contar escolhas ainda não feitas. */
export function darkvisionOf(char, id) {
  const r = findSpecies(char, id);
  if (!r) return 0;
  const g = speciesGrants({ rulesVersion: char?.rulesVersion, race: id, level: 1, speciesChoices: {} });
  let dv = Math.max(g.darkvision || 0, r.darkvision || 0);
  if (!dv) {
    const t = (r.traits || []).find(isDarkvisionTrait);
    const n = t && +(/(\d+)/.exec(`${t.desc?.en || ''} ${t.name?.en || ''}`)?.[1]);
    if (n) dv = n;
  }
  return dv;
}

/** Deslocamento em pés (considera o efeito fixo da espécie, ex.: Elfo da Floresta 35). */
export function speedOf(char, id) {
  const r = findSpecies(char, id);
  const g = speciesGrants({ rulesVersion: char?.rulesVersion, race: id, level: 1, speciesChoices: {} });
  return g.speed || r?.speed || 30;
}

/** 30 → "9 m (30 pés)" / "30 ft (9 m)". 1,5 m a cada 5 pés. */
export function formatFeet(ft, lang) {
  const m = Math.round(ft * 0.3 * 10) / 10;
  const mStr = lang === 'pt' ? String(m).replace('.', ',') : String(m);
  return lang === 'pt' ? `${mStr} m (${ft} pés)` : `${ft} ft (${mStr} m)`;
}

const SIZE_NAMES = { Tiny: b('Miúdo', 'Tiny'), Small: b('Pequeno', 'Small'), Medium: b('Médio', 'Medium'), Large: b('Grande', 'Large') };

/** Tamanho traduzido; "Médio ou Pequeno (você escolhe)" quando a espécie deixa escolher. */
export function sizeLabel(char, id, lang) {
  const r = findSpecies(char, id);
  const def = speciesDef({ rulesVersion: char?.rulesVersion, race: id });
  if (def?.choices?.some(c => c.key === 'size')) return lang === 'pt' ? 'Médio ou Pequeno (você escolhe)' : 'Medium or Small (your choice)';
  const s = r?.size || 'Medium';
  return SIZE_NAMES[s]?.[lang] || s;
}

/** Traços sem a visão no escuro (que aparece à parte): os primeiros `n` e o resto. */
export function splitTraits(char, id, n = 3) {
  const traits = (findSpecies(char, id)?.traits || []).filter(t => !isDarkvisionTrait(t));
  return { main: traits.slice(0, n), rest: traits.slice(n) };
}

const ABBR = { str: b('FOR', 'STR'), dex: b('DES', 'DEX'), con: b('CON', 'CON'), int: b('INT', 'INT'), wis: b('SAB', 'WIS'), cha: b('CAR', 'CHA') };

/** Bônus racial 2014 em texto: "+2 CON, +1 SAB", "+1 em todos", "+1 em dois outros à sua escolha". */
export function raceBonusText(char, id, lang) {
  if (rv(char) !== '2014') return '';
  const asi = findSpecies(char, id)?.asi || {};
  const parts = [];
  for (const [k, v] of Object.entries(asi)) {
    if (!v) continue;
    if (k === 'all') parts.push(lang === 'pt' ? `+${v} em todos os atributos` : `+${v} to every ability`);
    else if (k === 'other') parts.push(lang === 'pt' ? `+1 em ${v === 1 ? 'outro atributo' : `${v} outros atributos`} à sua escolha` : `+1 to ${v === 1 ? 'one other ability' : `${v} other abilities`} of your choice`);
    else if (ABBR[k]) parts.push(`+${v} ${ABBR[k][lang]}`);
  }
  const choices = speciesDef({ rulesVersion: '2014', race: id })?.choices || [];
  const asiChoice = choices.find(c => c.key === 'asi');
  if (asiChoice) parts.push(asiChoice.label[lang] + (lang === 'pt' ? ' à sua escolha' : ' of your choice'));
  return parts.join(', ');
}

/** Idiomas da espécie em texto (2014) ou o aviso de 2024. */
export function speciesLanguagesText(char, id, lang) {
  if (rv(char) === '2024') {
    return lang === 'pt'
      ? 'Em 2024 a espécie não dá idiomas: todo herói fala Comum + 2 à escolha (etapa Idiomas).'
      : 'In 2024 species grant no languages: every hero speaks Common + 2 of choice (Languages step).';
  }
  const langs = findSpecies(char, id)?.languages || [];
  return langs.map(l => {
    const m = /^\+(\d+)/.exec(l);
    if (m) return lang === 'pt' ? `mais ${m[1]} à sua escolha` : `${m[1]} more of your choice`;
    return Utils.languageLabel(l, lang);
  }).join(', ');
}

/** Nomes das escolhas que a espécie pede na etapa seguinte. */
export function pendingChoiceLabels(char, id, lang) {
  const def = speciesDef({ rulesVersion: char?.rulesVersion, race: id });
  const legacyAsiOff = rv(char) === '2024';
  return (def?.choices || []).filter(c => !c.when && !(legacyAsiOff && c.key === 'asi')).map(c => c.label[lang]);
}

// ---------------------------------------------------------------------------
// Etapa Espécie
// ---------------------------------------------------------------------------

const uniq = (arr) => [...new Set(arr.filter(Boolean))];

/** Ferramentas que a espécie dá (2014: fixas da raça + a escolhida, ex.: Anão ferreiro, Gnomo das Rochas funileiro). */
export const speciesToolIds = (char) => {
  try { return speciesGrants(char).tools || []; } catch { return []; }
};

/** Ferramentas que vêm de outra fonte (classe, antecedente, talentos), para não apagá-las. */
function otherToolIds(char) {
  let fixed = [];
  try { fixed = startingTools(char).fixed || []; } catch { fixed = []; }
  let granted = [];
  try { granted = Utils.classGrants(char).tools || []; } catch { granted = []; }
  const tc = char?.creation?.toolChoices || {};
  const chosen = Object.entries(tc).filter(([k, v]) => k !== 'species' && Array.isArray(v)).flatMap(([, v]) => v);
  return new Set([...fixed, ...granted, ...chosen]);
}

/**
 * Patch de ferramentas ao mudar a espécie ou as escolhas dela: tira de `toolProfs`
 * as ferramentas que a espécie anterior deu (menos as que vêm de outra fonte) e
 * põe as da espécie nova. A origem fica em `creation.toolChoices.species`.
 */
export function syncSpeciesTools(prev, next) {
  const old = Array.isArray(prev?.creation?.toolChoices?.species) ? prev.creation.toolChoices.species : [];
  const now = speciesToolIds(next);
  const others = otherToolIds(next);
  const toolProfs = uniq([...(next.toolProfs || prev.toolProfs || []).filter(t => !old.includes(t) || others.has(t) || now.includes(t)), ...now]);
  const creation = { ...(next.creation || prev.creation || {}), toolChoices: { ...(next.creation?.toolChoices || prev.creation?.toolChoices || {}), species: now } };
  return { toolProfs, creation };
}

/** Ferramentas da espécie que sumiram de `toolProfs` (ex.: trocar de classe limpou a lista). null = tudo certo. */
export function missingSpeciesToolsPatch(char) {
  const now = speciesToolIds(char);
  const rec = char?.creation?.toolChoices?.species;
  const same = Array.isArray(rec) && rec.length === now.length && now.every(t => rec.includes(t));
  if (same && now.every(t => (char.toolProfs || []).includes(t))) return null;
  return syncSpeciesTools(char, char);
}

/** Tamanho já marcado quando a espécie deixa escolher (Médio, o recomendado). */
function defaultChoices(char, id) {
  const specs = speciesChoiceSpecs({ ...char, race: id, speciesChoices: {} });
  return specs.some(c => c.key === 'size' && c.options?.some(o => o.id === 'Medium')) ? { size: 'Medium' } : {};
}

/**
 * Patch para trocar de espécie: limpa escolhas da espécie, talento da espécie,
 * (2014) o bônus racial, troca as ferramentas da raça e tira só os idiomas que
 * deixaram de valer (os idiomas fixos da raça antiga e o que passar do limite).
 * Mesma espécie = patch vazio.
 */
export function selectSpecies(char, id) {
  if (char.race === id) return {};
  const oldFixed = (() => { try { return Utils.fixedLanguages(char); } catch { return []; } })();
  const patch = {
    race: id,
    speciesChoices: defaultChoices(char, id),
    feats: withSpeciesFeat(char.feats, null),
    ...(rv(char) === '2014' ? { raceBonus: {} } : {}),
  };
  const langs = (char.languages || []).filter(l => !oldFixed.includes(l) && !/^\+\d/.test(l));
  const next = { ...char, ...patch, languages: langs };
  patch.languages = typeof Utils.trimLanguages === 'function' ? Utils.trimLanguages(next) : [];
  Object.assign(patch, syncSpeciesTools(char, { ...next, languages: patch.languages }));
  return patch;
}

export function speciesIssues(char) {
  const old = rv(char) === '2014';
  if (!char.race) return [old ? b('Escolha uma raça para o seu herói.', 'Pick a race for your hero.') : b('Escolha uma espécie para o seu herói.', 'Pick a species for your hero.')];
  if (!findSpecies(char)) return [old ? b('Essa raça não existe nestas regras. Escolha outra.', 'That race does not exist in these rules. Pick another.') : b('Essa espécie não existe nestas regras. Escolha outra.', 'That species does not exist in these rules. Pick another.')];
  return [];
}

// ---------------------------------------------------------------------------
// Etapa Escolhas da espécie
// ---------------------------------------------------------------------------

export const hasSpeciesChoices = (char) => speciesChoiceSpecs(char).length > 0;

/** Ficha sem as perícias escolhidas na espécie (para saber o que já veio de classe/antecedente/talento). */
export const withoutSpeciesSkill = (char) => {
  const sc = { ...(char.speciesChoices || {}) };
  delete sc.skill;
  return { ...char, speciesChoices: sc };
};

/** Ficha sem o talento da espécie (para checar repetição com o talento de origem). */
export const withoutSpeciesFeat = (char) => ({ ...char, feats: (char.feats || []).filter(f => f?.origin !== 'species') });

/** Perícias escolhidas na espécie que o herói já tinha por outra fonte. */
export function repeatedSpeciesSkills(char) {
  const chosen = list(char.speciesChoices?.skill);
  if (!chosen.length || !speciesChoiceSpecs(char).some(c => c.key === 'skill')) return [];
  const base = withoutSpeciesSkill(char);
  return chosen.filter(id => Utils.hasSkillProf(base, id));
}

/** O talento da espécie repete um talento que não pode ser repetido (ex.: Alerta do antecedente)? */
export function repeatedSpeciesFeat(char) {
  const e = speciesFeatEntry(char);
  if (!e?.id || !speciesChoiceSpecs(char).some(c => c.key === 'feat')) return null;
  const feat = findFeat(e.id);
  if (!feat) return null;
  return featTakenIssue(withoutSpeciesFeat(char), feat, e.picks || {}) ? feat : null;
}

const MENTAL = ['int', 'wis', 'cha'];

/**
 * Atributo de conjuração sugerido: o da classe (se ela usa magia); senão o maior
 * atributo mental já distribuído; antes da etapa Atributos, o que a sugestão de
 * atributos da classe deixa mais alto (Monge → SAB, Ladino → INT, Guerreiro → CAR).
 */
export function recommendedSpellAbility(char) {
  const cls = Utils.spellcastingAbility(char);
  if (MENTAL.includes(cls)) return cls;
  // Atributos já distribuídos (voltou depois da etapa Atributos) valem mais que a sugestão.
  const own = char?.abilities || {};
  const assigned = new Set(MENTAL.map(k => own[k] || 0)).size > 1;
  const a = (assigned ? own : STANDARD_ARRAY_BY_CLASS[char?.className]) || own;
  return MENTAL.reduce((best, k) => ((a[k] || 0) > (a[best] || 0) ? k : best), 'cha');
}

/** Talento de Origem sugerido por classe para o Humano 2024 (Versátil). */
const FEAT_BY_CLASS = {
  barbarian: 'tough', fighter: 'tough', paladin: 'tough', monk: 'tough',
  rogue: 'skilled', ranger: 'skilled', bard: 'skilled',
  cleric: 'alert', druid: 'alert', sorcerer: 'alert', warlock: 'alert', wizard: 'alert', artificer: 'alert',
};
const FEAT_WHY = {
  tough: b('mais Pontos de Vida para quem luta na linha de frente', 'more Hit Points for front-line fighters'),
  skilled: b('3 perícias a mais, ótimo para quem resolve problemas fora do combate', '3 extra skills, great for solving problems outside combat'),
  alert: b('age mais cedo no combate, bom para quem conjura magias', 'acts earlier in combat, good for spellcasters'),
};

/**
 * Talento recomendado para a escolha `feat` da espécie (só talentos de Origem, 2024):
 * { id, name, why } ou null. Não repete o talento do antecedente (Habilidoso pode repetir).
 */
export function recommendedSpeciesFeat(char) {
  const spec = speciesChoiceSpecs(char).find(c => c.key === 'feat');
  if (!spec || spec.kind !== 'origin') return null;
  const taken = new Set((char.feats || []).filter(f => f?.origin !== 'species').map(f => f?.id).filter(Boolean));
  const usable = (id) => {
    const f = findFeat(id, '2024') || findFeat(id);
    return f && (f.repeatable || !taken.has(f.id)) ? f : null;
  };
  const first = FEAT_BY_CLASS[char.className] || 'skilled';
  const feat = usable(first) || usable('skilled');
  if (!feat) return null;
  return { id: feat.id, name: feat.name, why: FEAT_WHY[feat.base || feat.id] || FEAT_WHY[first] || null };
}

/** Perícias marcadas no talento da espécie (ex.: Habilidoso do Humano) que o herói já tem por outra fonte. */
export function repeatedSpeciesFeatSkills(char) {
  const e = speciesFeatEntry(char);
  if (!e?.picks || !speciesChoiceSpecs(char).some(c => c.key === 'feat')) return [];
  const isSkill = (id) => SKILL_IDS_SET.has(id);
  const ids = [...list(e.picks.skill), ...list(e.picks.skillOrTool)].filter(isSkill);
  const base = withoutSpeciesFeat(char);
  return [...new Set(ids)].filter(id => Utils.hasSkillProf(base, id));
}

/** "A", "A e B", "A, B e C". */
const joinPt = (xs, and) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${and} ${xs[xs.length - 1]}`);

export function speciesChoicesIssues(char) {
  const out = speciesChoiceIssues(char).map(i => {
    const c = speciesChoiceSpecs(char).find(x => x.key === i.key);
    const label = c?.label || b(i.key, i.key);
    if (i.key === 'skill' && (c?.count || 1) > 1) {
      return b(`Escolha ${c.count} perícias em "${label.pt}".`, `Pick ${c.count} skills in "${label.en}".`);
    }
    if (i.key === 'feat') return b(`Escolha o talento em "${label.pt}" (e complete as escolhas dele).`, `Pick the feat in "${label.en}" (and finish its choices).`);
    return b(`Falta escolher: ${label.pt}.`, `Still to choose: ${label.en}.`);
  });
  for (const id of repeatedSpeciesSkills(char)) {
    out.push(b(
      `Você já tem a perícia ${tName('skill', id, 'pt')} pela classe ou antecedente. Troque por outra.`,
      `You already have ${tName('skill', id, 'en')} from your class or background. Pick another.`,
    ));
  }
  const dup = repeatedSpeciesFeatSkills(char);
  if (dup.length) {
    const e = speciesFeatEntry(char);
    const f = e?.id ? findFeat(e.id) : null;
    const fname = (l) => f?.name?.[l] || e?.name || '';
    const many = dup.length > 1;
    out.push(b(
      `${joinPt(dup.map(id => tName('skill', id, 'pt')), 'e')} já ${many ? 'vêm' : 'vem'} da classe, do antecedente ou da espécie. No talento ${fname('pt')}, troque por ${many ? 'outras' : 'outra'}.`,
      `You already have ${joinPt(dup.map(id => tName('skill', id, 'en')), 'and')} from your class, background or species. In the ${fname('en')} feat, pick ${many ? 'others' : 'another'}.`,
    ));
  }
  const feat = repeatedSpeciesFeat(char);
  if (feat) {
    out.push(b(
      `Você já tem o talento ${feat.name.pt} (do antecedente). Escolha outro talento para a espécie.`,
      `You already have the ${feat.name.en} feat (from your background). Pick a different species feat.`,
    ));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Etapa Idiomas
// ---------------------------------------------------------------------------

/** Idiomas escolhidos (sem os fixos e sem marcadores "+N"). */
export const chosenLanguages = (char) => (Utils.chosenLanguageIds
  ? Utils.chosenLanguageIds(char)
  : (char.languages || []).filter(l => !Utils.fixedLanguages(char).includes(l) && !/^\+\d/.test(l)));

/** A etapa só aparece se há idioma para escolher (ou escolhido a mais para desmarcar). */
export const languagesApply = (char) => Utils.languageChoiceCount(char) > 0 || chosenLanguages(char).length > 0;

export function languagesIssues(char) {
  if (typeof Utils.languageIssues === 'function') return Utils.languageIssues(char);
  const need = Utils.languageChoiceCount(char);
  const n = chosenLanguages(char).length;
  if (n < need) return [b(`Escolha mais ${need - n} idioma(s).`, `Pick ${need - n} more language(s).`)];
  if (n > need) return [b(`Você marcou ${n - need} idioma(s) a mais. Desmarque.`, `You picked ${n - need} too many language(s). Unselect.`)];
  return [];
}

/** De onde vem cada idioma fixo: [{ id, why: {pt,en} }]. */
export function fixedLanguageReasons(char) {
  const race = rv(char) === '2014' ? findSpecies(char) : null;
  const fromRace = new Set((race?.languages || []).filter(l => !/^\+\d/.test(l)));
  const classLangs = new Set(Utils.CLASS_LANGUAGES?.[char.className] || []);
  const raceName = (l) => tName('race', char.race, l);
  const className = (l) => tName('class', char.className, l);
  return Utils.fixedLanguages(char).map(id => {
    let why;
    if (fromRace.has(id)) why = b(`da sua raça (${raceName('pt')})`, `from your race (${raceName('en')})`);
    else if (classLangs.has(id)) why = b(`da sua classe (${className('pt')}): idioma secreto`, `from your class (${className('en')}): secret language`);
    else if (id === 'Common') why = b('todo herói fala', 'every hero speaks it');
    else why = b('de uma escolha de classe ou talento', 'from a class choice or feat');
    return { id, why };
  });
}

/** Explicação de cada vaga de idioma: [{ n, text: {pt,en} }]. */
export function languageSlotReasons(char) {
  const raceName = (l) => tName('race', char.race, l);
  const bgName = (l) => tName('background', char.background, l);
  return Utils.languageChoiceSources(char).map(s => {
    let text;
    if (s.source === 'origin') {
      text = b('Todo herói das regras 2024 fala Comum e mais 2 idiomas da lista Padrão.', 'Every 2024 hero speaks Common plus 2 languages from the Standard list.');
    } else if (s.source === 'class') {
      text = b('Gíria de Ladrão: o Ladino aprende mais 1 idioma, que pode ser raro.', "Thieves' Cant: the Rogue learns 1 more language, which may be rare.");
    } else if (s.source === 'race') {
      text = b(`Sua raça (${raceName('pt')}) fala ${s.n === 1 ? 'mais 1 idioma' : `mais ${s.n} idiomas`} à sua escolha.`, `Your race (${raceName('en')}) speaks ${s.n} more language${s.n > 1 ? 's' : ''} of your choice.`);
    } else if (s.source === 'background') {
      text = b(`Seu antecedente (${bgName('pt')}) ensinou ${s.n === 1 ? '1 idioma' : `${s.n} idiomas`} à sua escolha.`, `Your background (${bgName('en')}) taught you ${s.n} language${s.n > 1 ? 's' : ''} of your choice.`);
    } else {
      text = b(`Mais ${s.n} idioma(s) à escolha.`, `${s.n} more language(s) of your choice.`);
    }
    return { n: s.n, source: s.source, text };
  });
}
