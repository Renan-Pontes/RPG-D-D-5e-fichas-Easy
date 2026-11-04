// O nome de mesa das ideias de cena do Raio-X ("＋ Levar para o plano" / "Usar numa cena").
// É o nome que a cena ganha no plano e que os jogadores e a TV leem quando ela começa, então é
// só história: nada de nome de personagem, perícia, salvaguarda, tipo de dano, número ou
// lacuna (o jogador nunca vê o Raio-X, §6.8/§8). A ideia inteira, com quem ela visa, vai no
// "O que acontece", que só o mestre vê. Depende só da chave da ideia ("skill:deception",
// "save:dex", "spof:control"…), não das fichas: a folha da cena (Preparar) importa daqui, sem
// baixar as contas do Raio-X, para avisar que o nome ainda é o da ideia.
// Testado em tests/party-gaps.test.js.

const STORY = {
  talk: ['Uma conversa difícil', 'A tricky conversation'],
  deal: ['Uma negociação', 'A negotiation'],
  riddle: ['Um enigma', 'A riddle'],
  obstacle: ['Um obstáculo no caminho', 'An obstacle in the way'],
  trail: ['Um rastro', 'A trail to follow'],
  unseen: ['Sem ser visto', 'Unseen'],
  hurt: ['Alguém ferido', 'Someone hurt'],
  animal: ['Um animal arisco', 'A skittish animal'],
  crowd: ['Uma plateia', 'An audience'],
  standoff: ['Um impasse', 'A standoff'],
  fight: ['Uma luta difícil', 'A hard fight'],
  long: ['Uma luta longa', 'A long fight'],
  blows: ['Golpe atrás de golpe', 'Blow after blow'],
  arcane: ['Um mistério antigo', 'An ancient mystery'],
  road: ['Uma longa jornada', 'A long road'],
  reach: ['Um inimigo fora de alcance', 'An enemy out of reach'],
  front: ['Uma linha de frente', 'A front line'],
  swarm: ['Inimigos demais', 'Too many enemies'],
  odd: ['Um problema esquisito', 'An odd problem'],
  path: ['Um caminho difícil', 'A hard path'],
  unknown: ['Um lugar desconhecido', 'An unknown place'],
  current: ['Uma correnteza', 'A strong current'],
  ground: ['Um chão traiçoeiro', 'Treacherous ground'],
  air: ['Um ar pesado', 'Foul air'],
  mind: ['Uma mente sob ataque', 'A mind under attack'],
  voice: ['Uma voz que engana', 'A beguiling voice'],
  presence: ['Uma presença estranha', 'A strange presence'],
  danger: ['Um perigo à espreita', 'A lurking danger'],
  tough: ['Um inimigo resistente', 'A tough enemy'],
  dark: ['Uma cena no escuro', 'A scene in the dark'],
  lock: ['Uma fechadura ou armadilha', 'A lock or a trap'],
};
// perícia → a cena em que ela faria falta
const SKILL_STORY = {
  deception: 'talk', persuasion: 'talk', intimidation: 'talk', insight: 'talk',
  arcana: 'riddle', history: 'riddle', religion: 'riddle', nature: 'riddle', investigation: 'riddle',
  athletics: 'obstacle', acrobatics: 'obstacle', perception: 'trail', survival: 'trail',
  stealth: 'unseen', sleightOfHand: 'unseen', medicine: 'hurt', animalHandling: 'animal', performance: 'crowd',
};
// eixo do papel (ponto único ou o grupo inteiro fraco nele)
const AXIS_STORY = {
  dmg: 'long', mit: 'blows', magic: 'arcane', heal: 'road', ranged: 'reach', melee: 'front',
  control: 'swarm', utility: 'odd', mobility: 'path', social: 'deal', explore: 'unknown',
};
const SAVE_STORY = { str: 'current', dex: 'ground', con: 'air', int: 'mind', wis: 'voice', cha: 'presence' };

function storyOf(key) {
  const [kind, k] = String(key || '').split(':');
  if (kind === 'skill') return SKILL_STORY[k] || 'standoff';
  if (kind === 'spof') return AXIS_STORY[k] || 'fight';
  if (kind === 'axis') return AXIS_STORY[k] || 'standoff';
  if (kind === 'save') return SAVE_STORY[k] || 'danger';
  if (kind === 'damage') return 'tough';
  if (kind === 'sense') return 'dark';
  if (kind === 'tool') return 'lock';
  return 'standoff';
}

/** O nome de mesa da ideia: "Uma conversa difícil", "Um chão traiçoeiro", "Inimigos demais"… */
export function ideaTitle(key, lang = 'pt') {
  return STORY[storyOf(key)][lang === 'en' ? 1 : 0];
}

/** O nome da cena ainda é o que veio da ideia (em pt ou en)? A folha da cena avisa que a mesa o lê. */
export function isIdeaTitle(key, name) {
  if (!key) return false;
  const n = String(name || '').trim();
  return !!n && STORY[storyOf(key)].includes(n);
}
