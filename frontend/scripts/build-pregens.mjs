#!/usr/bin/env node
/*
 * Gera data/pregens.json: 12 fichas prontas de nível 1 (regras 2024 / SRD 5.2.1),
 * uma por classe, para quem nunca jogou ("Comece rápido").
 *
 * Uso (de frontend/):  node scripts/build-pregens.mjs
 *
 * As fichas são montadas com a MESMA lógica pura do assistente de criação
 * (src/creator/*-helpers.js), simulando um iniciante que sempre aceita a
 * sugestão de cada etapa: escolhas recomendadas da classe, perícias
 * recomendadas (sem repetir as do antecedente), +2/+1 do antecedente no
 * atributo principal, Conjunto Padrão "sugestão para minha classe", pacote A
 * de equipamento da classe e do antecedente, truques/magias recomendados.
 *
 * As etapas (src/creator/steps/*.jsx) são JSX e não carregam no Node. Por isso
 * HEADLESS_STEPS abaixo repete o `id`/`applies`/`issues` de cada etapa usando
 * as mesmas funções puras que elas importam (contrato do README). O teste
 * tests/pregens.test.js confere que cada ficha passa em todas elas.
 *
 * Escolhas sem "recomendado" no assistente (sub-escolhas do talento de origem,
 * linhagem/ancestral da espécie, idiomas além do sugerido, ferramenta à escolha
 * do antecedente) ficam fixadas em PREGENS, uma por personagem.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import Utils from '../utils.js';
import { findFeat } from '../data/feats.js';
import { withSpeciesFeat } from '../src/progression/species.js';
import { newCharacter, finalizeCharacter, collectIssues, detailsIssues } from '../src/creator/creation.js';
import { classStart } from '../src/creator/start-data.js';
import {
  classIssues, selectClass, choiceGroups, groupOptions, toggleGroupPick, recommendedIds, classChoiceIssues,
  hasClassChoices, recommendedSkills, toggleClassSkill, skillsIssues, expertiseGroups, expertiseOptions,
} from '../src/creator/class-helpers.js';
import {
  applyBackground, backgroundIssues, backgroundTool, toggleBackgroundTool, ownedToolsOutsideBackground,
  originEntry, originFeatApplies, originFeatIssues, originFeatSpecs,
} from '../src/creator/background-helpers.js';
import {
  selectSpecies, speciesIssues, hasSpeciesChoices, speciesChoicesIssues, syncSpeciesTools, recommendedSpellAbility,
  recommendedSpeciesFeat, chosenLanguages, languagesApply, languagesIssues,
} from '../src/creator/species-helpers.js';
import { languageSuggestions } from '../components/language-hints.js';
import {
  abilitiesIssues, suggestionPatch, abilityBonusIssues, bonusPatch, recommendedBonus,
} from '../src/creator/ability-helpers.js';
import { applyStartingEquipment, equipmentIssues } from '../src/creator/equipment-helpers.js';
import {
  hasClassCantrips, cantripIssues, hasClassSpells, spellIssues, fillRecommended,
} from '../src/creator/spell-helpers.js';
import { speciesChoiceSpecs } from '../src/progression/species.js';

const b = (pt, en) => ({ pt, en });

// ---------------------------------------------------------------------------
// Etapas sem React (mesmo id/applies/issues de src/creator/steps/*.jsx)
// ---------------------------------------------------------------------------
export const HEADLESS_STEPS = [
  { id: 'welcome', title: b('Começo', 'Start'), issues: () => [] },
  { id: 'class', title: b('Classe', 'Class'), issues: classIssues },
  { id: 'classChoices', title: b('Escolhas da classe', 'Class choices'), applies: (c) => !!c.className && hasClassChoices(c), issues: classChoiceIssues },
  { id: 'skills', title: b('Perícias', 'Skills'), applies: (c) => !!c.className, issues: skillsIssues },
  { id: 'background', title: b('Antecedente', 'Background'), issues: backgroundIssues },
  { id: 'originFeat', title: b('Talento de origem', 'Origin feat'), applies: originFeatApplies, issues: originFeatIssues },
  { id: 'species', title: b('Espécie', 'Species'), issues: speciesIssues },
  { id: 'speciesChoices', title: b('Escolhas da espécie', 'Species choices'), applies: hasSpeciesChoices, issues: speciesChoicesIssues },
  { id: 'languages', title: b('Idiomas', 'Languages'), applies: languagesApply, issues: languagesIssues },
  { id: 'abilities', title: b('Atributos', 'Abilities'), issues: abilitiesIssues },
  { id: 'abilityBonus', title: b('Bônus de atributo', 'Ability bonus'), issues: abilityBonusIssues },
  { id: 'equipment', title: b('Equipamento', 'Equipment'), issues: equipmentIssues },
  { id: 'cantrips', title: b('Truques', 'Cantrips'), applies: hasClassCantrips, issues: cantripIssues },
  { id: 'spells', title: b('Magias', 'Spells'), applies: hasClassSpells, issues: spellIssues },
  { id: 'alignment', title: b('Tendência', 'Alignment'), issues: () => [] },
  { id: 'details', title: b('Detalhes', 'Details'), issues: detailsIssues },
];

const DIFFICULTY = {
  low: b('Fácil', 'Easy'),
  average: b('Média', 'Average'),
  high: b('Desafiadora', 'Challenging'),
};

// ---------------------------------------------------------------------------
// As 12 fichas: origem + escolhas sem recomendação + textos
// ---------------------------------------------------------------------------
export const PREGENS = [
  {
    classId: 'fighter', species: 'human', background: 'soldier', alignment: 'LG',
    speciesChoices: { size: 'Medium', skill: 'insight' },
    name: 'Bruna Ferrocampo',
    pitch: b('Fica na linha de frente e protege o grupo — o mais fácil de jogar.', 'Holds the front line and protects the group — the easiest to play.'),
    howToPlay: b(
      'No seu turno, ande até o inimigo mais perigoso e ataque com a Espada Grande.\nSe o inimigo estiver longe, arremesse uma Azagaia.\nFerida? Use Retomar o Fôlego (ação bônus) para recuperar Pontos de Vida.',
      'On your turn, walk up to the most dangerous enemy and attack with your Greatsword.\nIf the enemy is far away, throw a Javelin.\nHurt? Use Second Wind (bonus action) to regain Hit Points.'),
    personality: 'Fala pouco, cumpre o que promete e sempre divide a última ração.',
    backstory: 'Bruna cresceu numa vila de fronteira e entrou para a milícia aos dezesseis anos. Depois de anos guardando muralhas, viu sua companhia ser dispensada sem pagamento. Agora vende a espada a quem precisa de proteção, mas só a causas que considera justas. Guarda o escudo velho do pai como lembrança.',
    appearance: 'Alta, ombros largos, cabelo castanho preso numa trança curta e uma cicatriz no queixo.',
  },
  {
    classId: 'barbarian', species: 'goliath', background: 'farmer', alignment: 'CG',
    speciesChoices: { ancestry: 'stone' },
    name: 'Tarok Pedra-Alta',
    pitch: b('Entra em Fúria, aguenta pancada e bate muito forte — simples e divertido.', 'Rages, shrugs off hits and hits very hard — simple and fun.'),
    howToPlay: b(
      'No começo da luta, entre em Fúria (ação bônus): você causa mais dano e sofre menos.\nDepois, ataque com o Machado Grande todo turno.\nSe precisar atacar de longe, arremesse uma Machadinha.',
      'At the start of a fight, enter a Rage (bonus action): you deal more damage and take less.\nThen attack with your Greataxe every turn.\nIf you need to attack from afar, throw a Handaxe.'),
    personality: 'Gentil com animais e crianças, assustador com quem ameaça os dois.',
    backstory: 'Tarok cuidava de cabras e do pomar da família no alto das montanhas. Quando bandidos queimaram o celeiro, ele descobriu uma raiva que não sabia que tinha. Desceu ao vale para garantir que ninguém mais perca a colheita para a violência. Ainda carrega sementes no bolso para plantar onde passar.',
    appearance: 'Enorme, pele cinzenta com manchas escuras como pedra, mãos calejadas e um sorriso tímido.',
  },
  {
    classId: 'rogue', species: 'halfling', background: 'criminal', alignment: 'CG',
    speciesChoices: {},
    name: 'Pipo Mão-Leve',
    pitch: b('Ágil e esperto: se esconde, acha armadilhas e acerta o ponto fraco do inimigo.', 'Nimble and clever: hides, finds traps and hits the enemy where it hurts.'),
    howToPlay: b(
      'Ataque com o Arco Curto ou a Espada Curta quando um aliado estiver perto do inimigo: isso libera o Ataque Furtivo (dano extra).\nDepois de atacar, use a Ação Ardilosa (ação bônus) para se esconder ou se afastar.\nFora do combate, ofereça-se para abrir fechaduras e procurar armadilhas.',
      'Attack with your Shortbow or Shortsword when an ally is next to the enemy: that unlocks Sneak Attack (extra damage).\nAfter attacking, use Cunning Action (bonus action) to hide or step away.\nOutside combat, offer to pick locks and look for traps.'),
    personality: 'Brincalhão, curioso e incapaz de resistir a uma porta trancada.',
    backstory: 'Pipo cresceu nas docas de uma cidade grande, abrindo fechaduras para uma quadrilha em troca de comida. Um dia a quadrilha o deixou para trás numa fuga, e ele jurou nunca mais depender de quem não confia. Hoje usa seus talentos para o bem, quase sempre. Coleciona chaves de portas que já abriu.',
    appearance: 'Baixinho, cabelo cacheado ruivo, roupas escuras cheias de bolsos e pés descalços.',
  },
  {
    classId: 'cleric', species: 'dwarf', background: 'acolyte', alignment: 'LG',
    speciesChoices: {},
    originPicks: { cantrip: ['light', 'spareTheDying'], spell: ['healingWord'] },
    name: 'Dagna Brasaforte',
    pitch: b('Cura os amigos, protege com a fé e ainda luta de escudo e maça.', 'Heals friends, shields them with faith and still fights with shield and mace.'),
    howToPlay: b(
      'Se um aliado cair, lance Palavra Curativa (ação bônus, de longe) para levantá-lo.\nNo resto do turno, use Chama Sagrada contra inimigos distantes ou ataque com a Maça de perto.\nAntes de uma luta difícil, lance Bênção no grupo.',
      'If an ally drops, cast Healing Word (bonus action, at range) to get them back up.\nFor the rest of your turn, use Sacred Flame on distant foes or swing your Mace up close.\nBefore a hard fight, cast Bless on the group.'),
    personality: 'Teimosa, calorosa e sempre com um provérbio do templo na ponta da língua.',
    backstory: 'Dagna serviu por anos na forja-templo do seu clã, onde aprendeu que fé também se martela. Quando uma praga atingiu a cidade vizinha, foi a única sacerdotisa que aceitou descer da montanha para ajudar. Lá percebeu que o mundo precisa de mais cura do que o templo podia dar. Partiu levando só o escudo e o símbolo sagrado.',
    appearance: 'Baixa e robusta, barba ruiva trançada com contas de bronze e olhos cor de brasa.',
  },
  {
    classId: 'wizard', species: 'elf', background: 'sage', alignment: 'NG',
    speciesChoices: { lineage: 'high', skill: 'perception' },
    originPicks: { cantrip: ['fireBolt', 'minorIllusion'], spell: ['shield'] },
    name: 'Elarion Folhaclara',
    pitch: b('O maior repertório de magias do jogo: resolve problemas com o livro certo.', 'The biggest spell list in the game: solves problems with the right book.'),
    howToPlay: b(
      'Fique atrás dos aliados e ataque com Raio de Gelo ou Raio de Fogo, que acertam de longe.\nContra um grupo de inimigos, lance Mísseis Mágicos (nunca erra) ou Sono.\nSe for acertado, a magia Escudo (reação) pode transformar o golpe em erro.',
      'Stay behind your allies and attack with Ray of Frost or Fire Bolt from range.\nAgainst a group of enemies, cast Magic Missile (never misses) or Sleep.\nIf you get hit, the Shield spell (reaction) can turn the hit into a miss.'),
    personality: 'Educado, distraído e incapaz de passar por uma biblioteca sem entrar.',
    backstory: 'Elarion passou mais de um século copiando tomos antigos numa torre élfica. Ao encontrar um mapa rasurado que apontava para uma biblioteca perdida, percebeu que tinha lido sobre o mundo, mas nunca o visto. Saiu para encontrar a biblioteca e aprender o que os livros não contam. Anota tudo num caderno que já está quase cheio.',
    appearance: 'Esguio, cabelo prateado longo, óculos redondos e uma túnica azul manchada de tinta.',
  },
  {
    classId: 'ranger', species: 'elf', background: 'guide', alignment: 'NG',
    speciesChoices: { lineage: 'wood', skill: 'perception' },
    originPicks: { cantrip: ['guidance', 'produceFlame'], spell: ['goodberry'] },
    name: 'Naira Ventoverde',
    pitch: b('Atiradora da floresta: acerta de longe, rastreia qualquer coisa e conhece a natureza.', 'Forest sharpshooter: hits from afar, tracks anything and knows the wild.'),
    howToPlay: b(
      'No primeiro turno da luta, lance Marca do Caçador (ação bônus) no inimigo mais forte.\nDepois, atire com o Arco Longo todo turno: a marca soma dano extra.\nFora do combate, use Sobrevivência para rastrear e guiar o grupo.',
      "On the first turn of a fight, cast Hunter's Mark (bonus action) on the toughest enemy.\nThen shoot your Longbow every turn: the mark adds extra damage.\nOutside combat, use Survival to track and guide the group."),
    personality: 'Calma, observadora e desconfiada de quem nunca dormiu ao relento.',
    backstory: 'Naira guiava caravanas pela floresta antiga onde nasceu, conhecendo cada trilha e cada perigo. Quando criaturas estranhas começaram a sair da mata e atacar viajantes, ela decidiu caçar a origem do problema. Deixou sua aldeia com o arco da mãe e uma promessa de voltar. Fala com as árvores quando acha que ninguém está ouvindo.',
    appearance: 'Pele morena, orelhas pontudas, cabelo verde-escuro curto e capa cor de musgo.',
  },
  {
    classId: 'paladin', species: 'dragonborn', background: 'noble', alignment: 'LG',
    speciesChoices: { ancestry: 'gold' },
    originPicks: { skillOrTool: ['perception', 'medicine', 'intimidation'] },
    name: 'Kaelor Escama-de-Ouro',
    pitch: b('Cavaleiro sagrado de armadura pesada: protege, cura com as mãos e golpeia com luz.', 'Holy knight in heavy armor: protects, heals with a touch and strikes with light.'),
    howToPlay: b(
      'Fique na frente do grupo e ataque com a Espada Longa (escudo no outro braço).\nUse Cura pelas Mãos (ação bônus) para curar quem estiver ferido, inclusive você.\nNum golpe importante, lance Golpe Abrasador para queimar o inimigo.',
      'Stand in front of the group and attack with your Longsword (shield on the other arm).\nUse Lay On Hands (bonus action) to heal whoever is hurt, including yourself.\nOn an important hit, cast Searing Smite to burn the enemy.'),
    personality: 'Cortês, orgulhoso da família e incapaz de ignorar um pedido de socorro.',
    backstory: 'Kaelor é o filho mais novo de uma casa nobre que descende de um antigo dragão dourado. Cresceu ouvindo histórias de ancestrais heroicos, mas viu a família trocar a honra por ouro. Fez um juramento diante do altar da cidade de devolver ao nome da casa o seu brilho. Leva o brasão no escudo para não esquecer a promessa.',
    appearance: 'Escamas douradas, olhos âmbar, armadura polida e uma capa vermelha com o brasão da família.',
  },
  {
    classId: 'bard', species: 'human', background: 'entertainer', alignment: 'CG',
    speciesChoices: { size: 'Medium', skill: 'stealth' },
    bgTool: 'drum',
    originPicks: { instrument: ['horn', 'viol', 'panFlute'] },
    speciesFeatPicks: { skillOrTool: ['deception', 'history', 'arcana'] },
    name: 'Tainá Voz-de-Mel',
    pitch: b('Inspira os amigos, encanta os inimigos e resolve tudo na conversa.', 'Inspires friends, charms foes and talks her way through anything.'),
    howToPlay: b(
      'Dê Inspiração Bárdica (ação bônus) a um aliado antes de um teste ou ataque difícil.\nAtaque com Zombaria Cruel: o alvo sofre dano psíquico e erra mais o próximo ataque.\nSe alguém cair, lance Palavra Curativa (ação bônus) para levantá-lo.',
      'Give Bardic Inspiration (bonus action) to an ally before a hard check or attack.\nAttack with Vicious Mockery: the target takes psychic damage and is likelier to miss.\nIf someone drops, cast Healing Word (bonus action) to get them back up.'),
    personality: 'Faz amizade com qualquer um em cinco minutos e transforma tudo em música.',
    backstory: 'Tainá viajou desde pequena com uma trupe de artistas, tocando alaúde em praças e tavernas. Numa noite, uma canção antiga que ela tocou fez as velas da taverna dançarem sozinhas. Desde então quer descobrir a origem da magia escondida nas músicas. Coleciona canções de cada lugar por onde passa.',
    appearance: 'Cabelo preto volumoso com fitas coloridas, sorriso largo e roupas cheias de remendos alegres.',
  },
  {
    classId: 'druid', species: 'gnome', background: 'hermit', alignment: 'N',
    speciesChoices: { lineage: 'forest' },
    name: 'Nilo Musgovelho',
    pitch: b('Magia da natureza: cura, controla o campo de batalha e conversa com bichos.', 'Nature magic: heals, controls the battlefield and talks to animals.'),
    howToPlay: b(
      'Ataque de longe com Produzir Chama ou de perto com o Bordão.\nContra inimigos agrupados, lance Onda Trovejante ou Fogo das Fadas (seus aliados acertam mais).\nGuarde um espaço de magia para Curar Ferimentos se alguém se machucar feio.',
      'Attack from afar with Produce Flame or up close with your Quarterstaff.\nAgainst grouped enemies, cast Thunderwave or Faerie Fire (your allies hit more often).\nKeep a spell slot for Cure Wounds in case someone gets badly hurt.'),
    personality: 'Fala devagar, ri de piadas que só ele entende e trata cogumelos como amigos.',
    backstory: 'Nilo viveu sozinho por anos numa cabana dentro de um carvalho oco, estudando ervas e ouvindo os animais. Os esquilos da floresta trouxeram a notícia de que a mata está adoecendo, árvore por árvore. Ele saiu do isolamento para descobrir a causa antes que seja tarde. Ainda acha as cidades barulhentas demais.',
    appearance: 'Pequeno, barba branca cheia de folhinhas, chapéu de feltro verde e um bordão torto.',
  },
  {
    classId: 'monk', species: 'orc', background: 'sailor', alignment: 'LN',
    speciesChoices: {},
    name: 'Ruga Maré-Calma',
    pitch: b('Luta de mãos vazias, é rápida e ataca várias vezes por turno.', 'Fights barehanded, moves fast and attacks several times per turn.'),
    howToPlay: b(
      'Ataque com a Lança ou um golpe desarmado e, com a ação bônus, dê mais um golpe desarmado (Artes Marciais).\nVocê é rápida: use o movimento para chegar em quem está atacando os aliados mais frágeis.\nSem armadura, sua defesa vem da Destreza e da Sabedoria — não vista armadura.',
      "Attack with your Spear or an unarmed strike, then use your bonus action for another unarmed strike (Martial Arts).\nYou're fast: use your movement to reach whoever is attacking your most fragile allies.\nYour defense comes from Dexterity and Wisdom — don't wear armor."),
    personality: 'Serena até no meio da tempestade, mas não tolera injustiça com os mais fracos.',
    backstory: 'Ruga trabalhou anos no convés de um navio mercante, onde aprendeu a se equilibrar em qualquer onda. Um velho cozinheiro de bordo lhe ensinou a meditar e a lutar sem armas nas horas vagas. Quando o navio foi tomado por piratas, ela salvou a tripulação usando só as mãos. Desembarcou para encontrar o mosteiro de onde o cozinheiro dizia ter vindo.',
    appearance: 'Pele verde-acinzentada, presas pequenas, cabeça raspada e tatuagens de ondas nos braços.',
  },
  {
    classId: 'sorcerer', species: 'dragonborn', background: 'charlatan', alignment: 'CG',
    speciesChoices: { ancestry: 'blue' },
    originPicks: { skillOrTool: ['perception', 'arcana', 'intimidation'] },
    name: 'Zaira Faísca-Azul',
    pitch: b('Magia que nasce no sangue: dano forte de longe e poderes que se moldam.', 'Magic born in the blood: strong ranged damage and powers you can bend.'),
    howToPlay: b(
      'Fique a distância e ataque com Explosão Feiticeira todo turno.\nContra vários inimigos perto de você, lance Mãos Flamejantes.\nSe estiver cercada, use seu Sopro de dragão (elétrico) numa linha de inimigos.',
      'Keep your distance and attack with Sorcerous Burst every turn.\nAgainst several enemies close to you, cast Burning Hands.\nIf you get surrounded, use your dragon Breath Weapon (lightning) on a line of enemies.'),
    personality: 'Charmosa, impulsiva e sempre com uma história exagerada para contar.',
    backstory: 'Zaira ganhava a vida vendendo "poções milagrosas" de feira em feira, todas falsas. Um dia, irritada com um cliente, soltou faíscas azuis pelos dedos e percebeu que a magia dela era de verdade. Agora quer entender esse poder antes que ele exploda na hora errada. Ainda guarda algumas poções falsas, só por garantia.',
    appearance: 'Escamas azul-cobalto, olhos que faíscam quando se irrita e um chapéu de abas largas cheio de penas.',
  },
  {
    classId: 'warlock', species: 'tiefling', background: 'acolyte', alignment: 'CN',
    speciesChoices: { size: 'Medium', lineage: 'infernal' },
    originPicks: { cantrip: ['guidance', 'sacredFlame'], spell: ['healingWord'] },
    name: 'Dante Brasanegra',
    pitch: b('Fez um pacto com um ser poderoso: poucas magias, mas muito fortes.', 'Made a pact with a powerful being: few spells, but very strong ones.'),
    howToPlay: b(
      'Seu ataque principal é a Rajada Mística: use-a todo turno contra o inimigo mais perigoso.\nNo começo da luta, lance Maldição (ação bônus) no alvo para somar dano a cada acerto.\nSeus espaços de magia voltam num Descanso Curto: peça uma pausa ao grupo quando eles acabarem.',
      'Your main attack is Eldritch Blast: use it every turn on the most dangerous enemy.\nAt the start of a fight, cast Hex (bonus action) on the target to add damage on every hit.\nYour spell slots come back on a Short Rest: ask the group for a break when they run out.'),
    personality: 'Irônico, leal aos amigos e com medo de que o patrono cobre a dívida cedo demais.',
    backstory: 'Dante foi criado num templo que o aceitou apesar dos chifres e da cauda. Em busca de respostas sobre sua origem, leu um livro proibido e ouviu uma voz que lhe ofereceu poder. Aceitou o pacto para proteger o templo de um ataque, e agora deve favores a alguém que nunca viu. Tenta usar esse poder para fazer o bem, antes que a conta chegue.',
    appearance: 'Pele vermelho-escura, chifres curvos, olhos dourados e um manto de acólito gasto nas bordas.',
  },
];

// ---------------------------------------------------------------------------
// Montagem (o que o assistente faz quando o jogador aceita as sugestões)
// ---------------------------------------------------------------------------
const merge = (c, patch) => ({ ...c, ...(patch || {}) });
const INSTRUMENT_ORDER = ['lute', 'flute', 'lyre', 'drum', 'horn', 'viol', 'panFlute', 'dulcimer', 'shawm', 'bagpipes'];

/** Escolhas da classe: marca as recomendadas de cada grupo da etapa (como "Na dúvida, fique com as marcadas"). */
function fillClassChoices(c, step = null) {
  for (let guard = 0; guard < 30; guard++) {
    const g = choiceGroups(c).find(x => x.step === step && x.picks.length < x.total);
    if (!g) break;
    const rec = step === 'skills'
      ? recommendedIds(c, g).filter(id => expertiseOptions(c, g).some(o => o.id === id))
      : recommendedIds(c, g);
    const opts = step === 'skills' ? expertiseOptions(c, g) : groupOptions(c, g).filter(o => o.eligible);
    const id = [...rec, ...opts.map(o => o.id)].find(x => !g.picks.some(p => p.id === x) && opts.some(o => o.id === x));
    if (!id) throw new Error(`${c.className}: sem opção para ${g.key}`);
    const patch = toggleGroupPick(c, g, id);
    if (!patch.classOptions) throw new Error(`${c.className}: não marcou ${id} em ${g.key}`);
    c = merge(c, patch);
  }
  return c;
}

/** Monta a ficha de um item de PREGENS (sem finalizar). */
export function buildCharacter(spec) {
  let c = newCharacter('2024');
  c = { ...c, id: `pregen-${spec.classId}`, createdAt: 0, updatedAt: 0 };

  // Classe + Escolhas da classe (estilo de luta, maestrias, ordem divina, instrumentos…)
  c = merge(c, selectClass(c, spec.classId));
  c = fillClassChoices(c, null);

  // Antecedente
  c = merge(c, applyBackground(c, spec.background));
  const tool = backgroundTool(c);
  if (tool.choose) {
    const owned = new Set(ownedToolsOutsideBackground(c));
    const order = tool.category === 'instrument' ? INSTRUMENT_ORDER : tool.from;
    const pick = spec.bgTool || order.find(id => tool.from.includes(id) && !owned.has(id));
    c = merge(c, toggleBackgroundTool(c, pick));
  }

  // Talento de origem: sub-escolhas (o atributo de conjuração já vem recomendado)
  if (originFeatSpecs(c).length) {
    const e = originEntry(c);
    const picks = { ...(e.picks || {}), ...(spec.originPicks || {}) };
    c = { ...c, feats: c.feats.map(f => (f === e ? { ...f, picks } : f)) };
  }

  // Espécie + escolhas da espécie
  c = merge(c, selectSpecies(c, spec.species));
  if (speciesChoiceSpecs(c).length) {
    const sc = { ...(c.speciesChoices || {}), ...(spec.speciesChoices || {}) };
    let next = { ...c, speciesChoices: sc };
    if (speciesChoiceSpecs(next).some(s => s.key === 'spellAbility')) next.speciesChoices = { ...sc, spellAbility: recommendedSpellAbility(next) };
    c = merge(next, syncSpeciesTools(c, next));
    const rec = recommendedSpeciesFeat(c);
    if (rec) {
      const f = findFeat(rec.id);
      const entry = { id: f.id, name: f.name.pt, level: 1, note: '', ...(spec.speciesFeatPicks ? { picks: spec.speciesFeatPicks } : {}) };
      c = { ...c, feats: withSpeciesFeat(c.feats, entry) };
    }
  }

  // Perícias da classe: as recomendadas, sem as que já vêm do antecedente, da
  // espécie ou do talento (o assistente marca essas como "Recomendado" quando o
  // jogador volta à etapa depois de escolher a origem).
  for (const id of recommendedSkills(c)) c = merge(c, toggleClassSkill(c, id));
  // Especialização (Ladino): as recomendadas
  c = fillClassChoices(c, 'skills');

  // Idiomas: o do povo da espécie, depois os "úteis" sugeridos
  {
    const need = Utils.languageChoiceCount(c);
    const fixed = Utils.fixedLanguages(c);
    const chosen = [...chosenLanguages(c)];
    const sug = languageSuggestions(c).ids;
    const pool = [...sug, 'Dwarvish', 'Elvish', 'Giant', 'Goblin', 'Halfling', 'Gnomish', 'Orc', 'Draconic', 'Sign Language'];
    for (const id of pool) {
      if (chosen.length >= need) break;
      if (!chosen.includes(id) && !fixed.includes(id) && !Utils.isRareLanguage(c, id)) chosen.push(id);
    }
    c = merge(c, { languages: chosen });
  }

  // Atributos: Conjunto Padrão + "Sugestão para minha classe"; +2/+1 recomendado do antecedente
  c = merge(c, { creation: { ...c.creation, abilityMethod: 'standard' } });
  c = merge(c, suggestionPatch(c));
  c = merge(c, bonusPatch(c, recommendedBonus(c)));

  // Equipamento: pacote A da classe e do antecedente
  c = { ...c, creation: { ...c.creation, classPack: 'A', backgroundPack: 'A' } };
  c = applyStartingEquipment(c, 'pt');

  // Truques e magias: "Escolher por mim"
  if (hasClassCantrips(c)) c = { ...c, spells: fillRecommended(c, 'cantrip') };
  if (hasClassSpells(c)) c = { ...c, spells: fillRecommended(c, 'spell') };

  // Tendência e detalhes
  c = {
    ...c,
    alignment: spec.alignment,
    name: spec.name,
    personality: spec.personality,
    backstory: spec.backstory,
    appearance: spec.appearance,
    avatar: `/art/classes/${spec.classId}.webp`,
    pregenId: spec.classId,
  };
  return c;
}

/** Pendências de todas as etapas (o que travaria o "Criar personagem"). */
export const pendingIssues = (char) => collectIssues(HEADLESS_STEPS, char);

/** Monta, valida e finaliza uma ficha. Lança erro se alguma etapa tiver pendência. */
export function buildPregen(spec) {
  const char = buildCharacter(spec);
  const pending = pendingIssues(char);
  if (pending.length) {
    const msg = pending.map(g => `${g.id}: ${g.issues.map(i => i.pt).join(' | ')}`).join('\n  ');
    throw new Error(`Ficha pronta ${spec.classId} com pendências:\n  ${msg}`);
  }
  const complexity = classStart(char)?.complexity;
  return {
    id: spec.classId,
    classId: spec.classId,
    pitch: spec.pitch,
    howToPlay: spec.howToPlay,
    difficulty: DIFFICULTY[complexity] || DIFFICULTY.average,
    character: finalizeCharacter(char, 'pt'),
  };
}

export const buildAll = () => PREGENS.map(buildPregen);

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const here = dirname(fileURLToPath(import.meta.url));
export const OUT_FILE = resolve(here, '../data/pregens.json');

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const list = buildAll();
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, `${JSON.stringify(list, null, 2)}\n`);
  for (const p of list) {
    const c = p.character;
    console.log(`${p.classId.padEnd(10)} ${c.name.padEnd(24)} ${c.race}/${c.background}  PV ${c.maxHp}  CA ${Utils.computeAc(c)}`);
  }
  console.log(`→ ${OUT_FILE} (${list.length} fichas)`);
}
