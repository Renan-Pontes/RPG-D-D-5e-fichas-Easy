/*
 * A crônica da criação: frases curtas que contam a origem do herói conforme as
 * escolhas são feitas. Texto próprio (não vem dos livros). Funções puras.
 * O jogador pode levar a crônica para a história da ficha (etapa Detalhes).
 */
import { tName } from '../../data/i18n.js';
import { findOption } from '../progression/options.js';
import { groupOf } from './species-helpers.js';
import { quickSummary, abilitiesIssues, ABILITIES } from './ability-helpers.js';
import { chosenCantrips, chosenSpells } from './spell-helpers.js';

const b = (pt, en) => ({ pt, en });
const k = (lang) => (lang === 'pt' ? 'pt' : 'en');
const low = (s) => String(s || '').toLowerCase();
const andList = (a, lang) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} ${lang === 'pt' ? 'e' : 'and'} ${a[a.length - 1]}` : a[0] || '');

/** Nascimento, pelo povo (2014: o grupo da sub-raça). */
const BIRTH = {
  dragonborn: b('Você nasceu draconato, com o sangue de um dragão correndo nas veias.', 'You were born dragonborn, with a dragon\'s blood in your veins.'),
  dwarf: b('Você nasceu anão, sob montanhas onde a pedra guarda a memória dos ancestrais.', 'You were born a dwarf, beneath mountains where stone keeps the memory of the ancestors.'),
  elf: b('Você nasceu elfo, num reino de árvores e estrelas, e viu os anos passarem devagar.', 'You were born an elf, in a realm of trees and stars, and watched the years go by slowly.'),
  gnome: b('Você nasceu gnomo, curioso com tudo o que se move.', 'You were born a gnome, curious about everything that moves.'),
  goliath: b('Você nasceu golias, nos picos gelados, herdeiro de gigantes.', 'You were born a goliath on the frozen peaks, heir to giants.'),
  halfling: b('Você nasceu halfling, numa vila tranquila onde a sorte sempre parecia estar do seu lado.', 'You were born a halfling, in a quiet village where luck always seemed to be on your side.'),
  human: b('Você nasceu humano, de um povo de vida curta e ambição sem fim.', 'You were born human, of a short-lived people with endless ambition.'),
  orc: b('Você nasceu orc, de um povo forte que não desiste enquanto houver fôlego.', 'You were born an orc, of a strong people who never quit while there is breath.'),
  'half-orc': b('Você nasceu meio-orc, com a força de dois povos e o lugar de nenhum.', 'You were born half-orc, with the strength of two peoples and a place in neither.'),
  'half-elf': b('Você nasceu meio-elfo, entre dois mundos que nunca te aceitaram por inteiro.', 'You were born half-elf, between two worlds that never fully took you in.'),
  tiefling: b('Você nasceu tiferino, com chifres e um legado infernal que nunca pediu.', 'You were born a tiefling, with horns and an infernal legacy you never asked for.'),
  aasimar: b('Você nasceu aasimar, com uma centelha celestial que às vezes brilha nos seus olhos.', 'You were born aasimar, with a celestial spark that sometimes shines in your eyes.'),
};

/** Juventude, pelo antecedente (2024 e 2014). */
const YOUTH = {
  acolyte: b('servindo num templo entre velas e orações', 'serving in a temple among candles and prayers'),
  artisan: b('com as mãos calejadas de tanto criar', 'with hands calloused from making things'),
  charlatan: b('vendendo promessas falsas em praças e tavernas', 'selling false promises in squares and taverns'),
  criminal: b('aprendendo a sobreviver nas sombras da cidade', 'learning to survive in the city\'s shadows'),
  entertainer: b('arrancando aplausos de estrada em estrada', 'earning applause from road to road'),
  farmer: b('acordando antes do sol para cuidar da terra', 'rising before the sun to tend the land'),
  guard: b('vigiando muralhas e portões noite após noite', 'watching walls and gates night after night'),
  guide: b('levando viajantes por caminhos que poucos conheciam', 'leading travelers down paths few knew'),
  hermit: b('longe de todos, em busca de respostas no silêncio', 'far from everyone, seeking answers in silence'),
  merchant: b('negociando em caravanas e mercados distantes', 'trading in caravans and distant markets'),
  noble: b('entre banquetes, intrigas e deveres de família', 'among feasts, intrigue and family duties'),
  sage: b('perdido entre livros e perguntas sem resposta', 'lost among books and unanswered questions'),
  sailor: b('com o cheiro do mar e o balanço do convés', 'with the smell of the sea and the sway of the deck'),
  scribe: b('copiando à mão os segredos de outros', 'copying other people\'s secrets by hand'),
  soldier: b('aprendendo disciplina no campo de batalha', 'learning discipline on the battlefield'),
  wayfarer: b('sem teto fixo e com o mundo inteiro por casa', 'with no fixed roof and the whole world for a home'),
  folkHero: b('defendendo a sua aldeia quando ninguém mais quis', 'defending your village when no one else would'),
  guildArtisan: b('aprendendo um ofício sob as regras de uma guilda', 'learning a trade under a guild\'s rules'),
  outlander: b('nos ermos, longe de qualquer cidade', 'in the wilds, far from any city'),
  urchin: b('nas ruas, onde cada dia era uma luta', 'on the streets, where every day was a fight'),
  gladiator: b('na arena, entre gritos da plateia e o som do aço', 'in the arena, between the crowd\'s roar and the ring of steel'),
  knight: b('servindo a um senhor e jurando lealdade', 'serving a lord and swearing loyalty'),
  pirate: b('sob a bandeira negra, saqueando os mares', 'under the black flag, plundering the seas'),
  spy: b('vivendo de segredos que não podia contar', 'living on secrets you could not tell'),
  cityWatch: b('patrulhando as ruas da cidade com a guarda', 'patrolling the city streets with the watch'),
  farTraveler: b('numa terra tão distante que poucos aqui a conhecem', 'in a land so far away that few here have heard of it'),
  inheritor: b('à espera de uma herança que mudaria tudo', 'waiting for an inheritance that would change everything'),
};

/** O chamado, pela classe. */
const CALL = {
  barbarian: b('a fúria que você guardava encontrou um nome, e você aprendeu a deixá-la sair na hora certa', 'the rage you kept inside found a name, and you learned to let it out at the right moment'),
  bard: b('uma canção antiga revelou que palavras e música também são magia', 'an old song revealed that words and music are magic too'),
  cleric: b('uma divindade respondeu às suas preces, e você passou a carregar a luz dela', 'a deity answered your prayers, and you began to carry its light'),
  druid: b('a natureza falou com você, e você jurou guardar o equilíbrio do mundo selvagem', 'nature spoke to you, and you swore to guard the balance of the wild'),
  fighter: b('você pegou em armas de verdade e descobriu que nasceu para o combate', 'you took up real weapons and found you were born for battle'),
  monk: b('você encontrou um mosteiro onde corpo e espírito são uma só arma', 'you found a monastery where body and spirit are a single weapon'),
  paladin: b('você fez um juramento sagrado, e o poder dele passou a correr nas suas veias', 'you swore a sacred oath, and its power began to run in your veins'),
  ranger: b('as trilhas selvagens viraram sua casa, e você aprendeu a caçar o que ameaça os outros', 'the wild trails became your home, and you learned to hunt what threatens others'),
  rogue: b('você aprendeu que astúcia e sombras vencem mais batalhas que a força', 'you learned that cunning and shadows win more battles than strength'),
  sorcerer: b('uma magia que já estava no seu sangue despertou, sem pedir licença', 'a magic already in your blood awoke without asking'),
  warlock: b('você fez um pacto com um ser de outro mundo e ganhou poderes em troca de uma promessa', 'you made a pact with an otherworldly being and gained power in exchange for a promise'),
  wizard: b('um livro de magias caiu nas suas mãos, e você passou noites decifrando o arcano', 'a spellbook fell into your hands, and you spent nights deciphering the arcane'),
  artificer: b('você descobriu que engenhocas e magia podem ser a mesma coisa', 'you discovered that gadgets and magic can be the same thing'),
};

/** Uma linha por escolha de classe marcante (id da opção, sem o sufixo 2014). */
const TALE = {
  archery: b('Aprendeu a acertar de longe o que outros mal enxergavam.', 'You learned to hit from afar what others could barely see.'),
  blindFighting: b('Treinou de olhos vendados até que a escuridão deixou de ser um problema.', 'You trained blindfolded until darkness stopped being a problem.'),
  defense: b('Aprendeu antes de tudo a não ser atingido, com cada placa da armadura no lugar certo.', 'Above all you learned not to get hit, every armor plate in the right place.'),
  dueling: b('Lutava com uma lâmina só, como os duelistas das cortes.', 'You fought with a single blade, like court duelists.'),
  greatWeaponFighting: b('Preferia armas que pedem as duas mãos e golpes que racham escudos.', 'You favored two-handed weapons and blows that split shields.'),
  interception: b('Aprendeu a se jogar entre os amigos e o golpe.', 'You learned to throw yourself between your friends and the blow.'),
  protection: b('Fez do escudo uma muralha para quem lutasse ao seu lado.', 'You made your shield a wall for those fighting beside you.'),
  thrownWeaponFighting: b('Nenhum alvo ficava longe demais para uma lâmina arremessada.', 'No target was too far for a thrown blade.'),
  twoWeaponFighting: b('Lutava com uma arma em cada mão, num redemoinho de aço.', 'You fought with a weapon in each hand, a whirlwind of steel.'),
  unarmedFighting: b('Descobriu que os próprios punhos também são armas.', 'You discovered your own fists are weapons too.'),
  protector: b('Seu deus o quis na linha de frente, de armadura pesada e arma em punho.', 'Your god wanted you on the front line, in heavy armor, weapon in hand.'),
  thaumaturge: b('Seu deus o quis estudioso, guardião de milagres e saberes antigos.', 'Your god wanted you studious, a keeper of miracles and old lore.'),
  warden: b('A natureza fez de você seu guardião, de armadura e arma na mão.', 'Nature made you its warden, armored and armed.'),
  magician: b('A natureza te ensinou seus truques mais antigos.', 'Nature taught you its oldest tricks.'),
  armorOfShadows: b('Seu patrono te vestiu com uma armadura feita de sombras.', 'Your patron clothed you in armor made of shadows.'),
  eldritchMind: b('Seu patrono blindou sua mente contra qualquer distração.', 'Your patron shielded your mind against any distraction.'),
  pactOfTheBlade: b('Do pacto nasceu uma lâmina que surge na sua mão quando você a chama.', 'From the pact came a blade that appears in your hand when you call it.'),
  pactOfTheChain: b('Do pacto nasceu um familiar, um pequeno espírito que nunca te deixa.', 'From the pact came a familiar, a small spirit that never leaves you.'),
  pactOfTheTome: b('Do pacto nasceu um Livro das Sombras, escrito numa língua que só você lê.', 'From the pact came a Book of Shadows, written in a tongue only you can read.'),
};

const POOL_TALE = {
  weaponMastery: (names, lang) => (lang === 'pt' ? `Ninguém manejava ${andList(names, lang)} como você.` : `No one handled ${andList(names, lang)} like you.`),
  musicalInstrument: (names, lang) => (lang === 'pt' ? `Nas estradas, aprendeu a tocar ${andList(names, lang)}.` : `On the road, you learned to play ${andList(names, lang)}.`),
  musicalInstrumentStart: null,
  tool: (names, lang) => (lang === 'pt' ? `Entre um treino e outro, aprendeu a usar ${andList(names, lang)}.` : `Between training sessions, you learned to use ${andList(names, lang)}.`),
  artisanTool: (names, lang) => (lang === 'pt' ? `Entre faíscas e engrenagens, dominou ${andList(names, lang)}.` : `Among sparks and gears, you mastered ${andList(names, lang)}.`),
  favoredEnemy: (names, lang) => (lang === 'pt' ? `Passou anos caçando ${andList(names, lang)}.` : `You spent years hunting ${andList(names, lang)}.`),
  favoredTerrain: (names, lang) => (lang === 'pt' ? `Conhecia ${andList(names, lang)} como a palma da mão.` : `You knew ${andList(names, lang)} like the back of your hand.`),
  dragonAncestor: (names, lang) => (lang === 'pt' ? `O sangue de um ${names[0].replace(/^ancestral:\s*/i, '')} despertou nas suas veias.` : `The blood of a ${names[0].replace(/^ancestor:\s*/i, '')} awoke in your veins.`),
};

const HIGH = { str: b('sua força impressiona', 'your strength is impressive'), dex: b('sua agilidade é rara', 'your agility is rare'), con: b('seu corpo aguenta o que derruba os outros', 'your body withstands what fells others'),
  int: b('sua mente é afiada', 'your mind is sharp'), wis: b('você percebe o que os outros não veem', 'you notice what others miss'), cha: b('sua presença conquista qualquer sala', 'your presence wins over any room') };
const LOW = { str: b('falta força nos braços', 'your arms lack strength'), dex: b('você tropeça mais do que gostaria', 'you stumble more than you would like'), con: b('o fôlego é curto', 'your breath runs short'),
  int: b('os livros nunca foram seu forte', 'books were never your strength'), wis: b('às vezes você age sem pensar', 'sometimes you act without thinking'), cha: b('as palavras certas raramente saem', 'the right words rarely come out') };
const OATH = {
  LG: b('ser justo e cumprir a palavra dada', 'to be just and keep your word'), NG: b('fazer o bem, sem se prender a regras', 'to do good without being bound by rules'),
  CG: b('lutar pela liberdade de todos', 'to fight for everyone\'s freedom'), LN: b('seguir a ordem acima de tudo', 'to follow order above all'),
  N: b('manter o equilíbrio entre todas as coisas', 'to keep the balance among all things'), CN: b('seguir apenas a própria vontade', 'to follow only your own will'),
  LE: b('usar a ordem a seu favor', 'to bend order to your advantage'), NE: b('cuidar de si, custe o que custar', 'to look after yourself, whatever the cost'),
  CE: b('não deixar que nada o segure', 'to let nothing hold you back'),
};

/** Frases soltas para a revelação ao selar (classe, antecedente, espécie). */
export const callLine = (classId, lang = 'pt') => (CALL[classId] ? (lang === 'pt' ? `Até que ${CALL[classId].pt}.` : `Until ${CALL[classId].en}.`) : '');
export const youthLine = (bgId, lang = 'pt') => (YOUTH[bgId] ? `${lang === 'pt' ? 'Você cresceu' : 'You grew up'} ${YOUTH[bgId][k(lang)]}.` : '');
export function birthLine(raceId, lang = 'pt') {
  if (!raceId) return '';
  const base = groupOf(raceId)?.id || String(raceId).split('-')[0];
  return (BIRTH[raceId] || BIRTH[base])?.[k(lang)] || '';
}
/** Linha da crônica de uma escolha de classe (id da opção). */
export const optionTale = (id, lang = 'pt') => TALE[String(id).replace(/2014$/, '')]?.[k(lang)] || '';

/** Frase que a crônica guarda quando um selo grande é quebrado (ver decision.js). */
export function scarLine(kind, oldName, lang) {
  if (kind === 'class') return lang === 'pt' ? `Por um tempo, quase atendeu a outro chamado: ${oldName}.` : `For a while, you almost answered another call: ${oldName}.`;
  return '';
}

/** Linhas das escolhas de classe (uma por opção marcante ou por grupo). */
export function classOptionLines(char, lang = 'pt') {
  const cls = char?.className;
  const picks = (char?.classOptions || []).filter(p => p && p.classId === cls);
  const byPool = {};
  for (const p of picks) (byPool[p.pool] ||= []).push(p);
  const out = [];
  for (const [pool, list] of Object.entries(byPool)) {
    const names = list.map(p => low(findOption(cls, pool, p.id)?.name?.[k(lang)] || '')).filter(Boolean);
    const joined = pool === 'musicalInstrument' ? [...names, ...(byPool.musicalInstrumentStart || []).map(p => low(findOption(cls, 'musicalInstrumentStart', p.id)?.name?.[k(lang)] || '')).filter(Boolean)] : names;
    if (POOL_TALE[pool]) { if (joined.length) out.push(POOL_TALE[pool](joined, lang)); continue; }
    if (pool in POOL_TALE) continue;
    for (const p of list) { const t = TALE[String(p.id).replace(/2014$/, '')]; if (t) out.push(t[k(lang)]); }
  }
  return out;
}

const abilitiesDone = (char) => !!char && abilitiesIssues(char).length === 0;

/**
 * Frases da crônica, na ordem da história (nascimento → juventude → chamado →
 * ofício → têmpera → bagagem → magia → juramento → nome).
 */
export function chronicleLines(char, lang = 'pt') {
  const L = k(lang), out = [];
  if (!char) return out;
  if (char.race) {
    const base = groupOf(char.race)?.id || String(char.race).split('-')[0];
    const key = BIRTH[char.race] ? char.race : base;
    out.push(BIRTH[key]?.[L] || (lang === 'pt' ? `Você nasceu entre o povo ${tName('race', char.race, lang)}, com uma história própria.` : `You were born among the ${tName('race', char.race, lang)}, with a history of their own.`));
  }
  if (char.background) {
    const bg = tName('background', char.background, lang), y = YOUTH[char.background]?.[L];
    out.push(lang === 'pt' ? `Cresceu como ${low(bg)}${y ? `, ${y}` : ''}.` : `You grew up as ${/^[aeiou]/i.test(bg) ? 'an' : 'a'} ${low(bg)}${y ? `, ${y}` : ''}.`);
  }
  const scars = char.creation?.scars || {};
  if (char.className) {
    if (scars.class) out.push(typeof scars.class === 'object' ? scars.class[L] || scars.class.pt : scars.class);
    const call = CALL[char.className]?.[L];
    out.push(call ? (lang === 'pt' ? `Até que ${call}.` : `Until ${call}.`) : (lang === 'pt' ? `Até que o caminho de ${tName('class', char.className, lang)} te chamou.` : `Until the path of the ${tName('class', char.className, lang)} called you.`));
    if (char.subclass) out.push(lang === 'pt' ? `Seu chamado tinha nome: ${tName('subclass', char.subclass, lang)}.` : `Your call had a name: ${tName('subclass', char.subclass, lang)}.`);
    out.push(...classOptionLines(char, lang));
  }
  if (abilitiesDone(char)) {
    const fin = quickSummary(char).final;
    const hi = ABILITIES.reduce((a, x) => (fin[x] > fin[a] ? x : a)), lo = ABILITIES.reduce((a, x) => (fin[x] < fin[a] ? x : a));
    if (hi !== lo) out.push(lang === 'pt' ? `Com o tempo ficou claro: ${HIGH[hi].pt}, mas ${LOW[lo].pt}.` : `In time it became clear: ${HIGH[hi].en}, but ${LOW[lo].en}.`);
  }
  if (char.creation?.equipApplied) {
    const items = [char.armor && tName('armor', char.armor, lang), ...(char.weapons || []).map(w => (typeof w?.name === 'object' ? w.name[L] : w?.name))]
      .filter(Boolean).map(x => low(String(x).replace(/\s*×\d+$/, ''))).slice(0, 3);
    const gp = +char.coins?.gp || 0;
    if (items.length) out.push(lang === 'pt' ? `Partiu levando ${andList(items, lang)}${gp ? `, e ${gp} peças de ouro no bolso` : ''}.` : `You set out carrying ${andList(items, lang)}${gp ? `, and ${gp} gold pieces in your pocket` : ''}.`);
    else if (gp) out.push(lang === 'pt' ? `Partiu com ${gp} peças de ouro no bolso e nada mais.` : `You set out with ${gp} gold pieces and nothing else.`);
  }
  const first = [...chosenSpells(char), ...chosenCantrips(char)][0];
  if (first) out.push(lang === 'pt' ? `A primeira magia que despertou em você foi ${tName('spellName', first, lang)}.` : `The first spell to awaken in you was ${tName('spellName', first, lang)}.`);
  if (char.alignment && OATH[char.alignment]) out.push(lang === 'pt' ? `E jurou ${OATH[char.alignment].pt}.` : `And you swore ${OATH[char.alignment].en}.`);
  const name = String(char.name || '').trim();
  if (name) out.push(lang === 'pt' ? `Assim nasceu ${name}.` : `And so ${name} was born.`);
  return out;
}

/** A crônica como um texto só (para levar à história da ficha). */
export const chronicleText = (char, lang = 'pt') => chronicleLines(char, lang).join(' ');
