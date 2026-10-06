// Exemplos dos contratos JSON (C2) para mocks e testes de todos os pacotes.
// Espelham o que o backend devolve hoje (API.md, seção "Mundo da campanha").
// Não importe isto em código de produção — só em testes, stories e protótipos.

const ISO = '2026-10-01T21:30:00+00:00';
const LATER = '2026-10-03T22:10:00+00:00';

/** WorldEntryLight como o MESTRE recebe (GET /campaigns/:id/world). */
export const WORLD_LIGHT_DM = [
  { id: 1, kind: 'place', name: 'Vale de Brumafria', summary: 'Vila de pescadores à beira do rio, onde a névoa nunca se levanta de verdade.',
    tags: ['vila', 'início'], visibility: 'revealed', imageVer: 'a1b2c3d4', imageUrl: '/api/world/1/image?v=a1b2c3d4', isMap: true,
    revealedAt: ISO, updatedAt: ISO, parentId: null, whenLabel: 'Ano 140 da Coroa', whenOrder: 10,
    links: [], mentions: [2, 3], secretsCount: 0, secretsRevealed: 0, sort: 1, version: 3, pinTargets: [2, 3, 6] },
  { id: 2, kind: 'npc', name: 'Borin Pé-de-Malte', summary: 'Taverneiro anão do Malte Dourado — sabe de tudo, cobra por quase tudo.',
    tags: ['taverna', 'aliado'], visibility: 'revealed', imageVer: '', imageUrl: null, isMap: false,
    revealedAt: ISO, updatedAt: ISO, parentId: 1, whenLabel: '', whenOrder: null,
    links: [{ to: 3, rel: 'ally', note: 'amigos de infância' }], mentions: [3], secretsCount: 1, secretsRevealed: 0, sort: 2, version: 1, pinTargets: [] },
  { id: 3, kind: 'npc', name: 'Irmã Velna', summary: 'Sacerdotisa do templo da névoa; cuida dos doentes e evita falar do sino.',
    tags: ['templo', 'aliada'], visibility: 'partial', imageVer: 'ff00aa11', imageUrl: '/api/world/3/image?v=ff00aa11', isMap: false,
    revealedAt: LATER, updatedAt: LATER, parentId: 1, whenLabel: '', whenOrder: null,
    links: [], mentions: [], secretsCount: 2, secretsRevealed: 1, sort: 3, version: 4, pinTargets: [] },
  { id: 4, kind: 'npc', name: 'Morvane, o Tecelão de Névoa', summary: 'Um nome que os velhos da vila só sussurram.',
    tags: ['vilão'], visibility: 'hidden', imageVer: '', imageUrl: null, isMap: false,
    revealedAt: null, updatedAt: ISO, parentId: null, whenLabel: 'Ano 312 — a grande névoa', whenOrder: 20,
    links: [{ to: 3, rel: 'family', note: '' }, { to: 5, rel: 'member', note: 'líder' }], mentions: [], secretsCount: 1, secretsRevealed: 0, sort: 4, version: 1, pinTargets: [] },
  { id: 5, kind: 'faction', name: 'Círculo do Sino Mudo', summary: 'Seita que acredita que a névoa guarda os mortos da vila.',
    tags: ['seita'], visibility: 'hidden', imageVer: '', imageUrl: null, isMap: false,
    revealedAt: null, updatedAt: ISO, parentId: 1, whenLabel: '', whenOrder: null,
    links: [], mentions: [], secretsCount: 0, secretsRevealed: 0, sort: 5, version: 1, pinTargets: [] },
  { id: 6, kind: 'lore', name: 'A névoa que canta', summary: 'Dizem que, nas noites frias, dá para ouvir um sino debaixo do rio.',
    tags: ['rumor'], visibility: 'partial', imageVer: '', imageUrl: null, isMap: false,
    revealedAt: ISO, updatedAt: ISO, parentId: null, whenLabel: '', whenOrder: null,
    links: [], mentions: [], secretsCount: 0, secretsRevealed: 0, sort: 6, version: 1, pinTargets: [] },
  { id: 7, kind: 'handout', name: 'Bilhete encharcado', summary: '"Não toque o sino." — encontrado na ponte.',
    tags: [], visibility: 'revealed', imageVer: '', imageUrl: null, isMap: false,
    revealedAt: LATER, updatedAt: LATER, parentId: null, whenLabel: '', whenOrder: null,
    links: [], mentions: [], secretsCount: 0, secretsRevealed: 0, sort: 7, version: 1, pinTargets: [] },
];

/** WorldEntryLight como o JOGADOR recebe (sem ocultos, sem version/pinTargets). */
export const WORLD_LIGHT_PLAYER = WORLD_LIGHT_DM
  .filter(e => e.visibility !== 'hidden')
  .map(({ version, secretsRevealed, pinTargets, ...e }) => ({ // eslint-disable-line no-unused-vars
    ...e,
    links: e.visibility === 'revealed' ? e.links.filter(l => l.to !== 4 && l.to !== 5) : [],
    mentions: e.visibility === 'revealed' ? e.mentions : [],
    parentId: e.visibility === 'revealed' ? e.parentId : null,
    whenLabel: e.visibility === 'revealed' ? e.whenLabel : '',
    whenOrder: e.visibility === 'revealed' ? e.whenOrder : null,
    secretsCount: e.id === 3 ? 0 : (e.visibility === 'revealed' ? e.secretsCount : 0),
  }));

export const WORLD_LIST_DM = { entries: WORLD_LIGHT_DM, count: WORLD_LIGHT_DM.length, max: 500 };
export const WORLD_LIST_PLAYER = { entries: WORLD_LIGHT_PLAYER, seenAt: ISO };

/** WorldEntryFull do mestre (GET /world/3). */
export const WORLD_FULL_DM = {
  ...WORLD_LIGHT_DM[2],
  body: 'Jovem, séria e cansada. Mantém o templo aberto dia e noite. Amiga antiga de @[Borin Pé-de-Malte](2).',
  dmNotes: 'Ela ouve o sino tocar nas noites de névoa — e tem medo de estar enlouquecendo.',
  secrets: [
    { id: 's1', text: 'Velna ouve o sino do templo tocar sozinho nas noites de névoa.', revealed: true, session: 2, revealedAt: LATER },
    { id: 's2', text: 'Morvane é irmão mais velho de Velna.', revealed: false },
  ],
  data: { role: 'Sacerdotisa', appearance: 'Manto cinza-azulado, cabelo raspado.', mannerism: 'Fala baixo.', wants: 'Silenciar o sino.' },
  createdAt: ISO,
};

/** O mesmo cartão filtrado para o jogador (está `partial`: sem corpo nem segredos). */
export const WORLD_FULL_PLAYER_PARTIAL = {
  id: 3, kind: 'npc', name: 'Irmã Velna', summary: WORLD_FULL_DM.summary, tags: ['templo', 'aliada'],
  visibility: 'partial', imageVer: 'ff00aa11', imageUrl: '/api/world/3/image?v=ff00aa11', isMap: false,
  revealedAt: LATER, updatedAt: LATER, parentId: null, whenLabel: '', whenOrder: null, links: [], mentions: [],
  secretsCount: 0, sort: 3, body: '', secrets: [], data: {},
};

/** Cartão `revealed` para o jogador: só segredos revelados, só `{id, text, session}`. */
export const WORLD_FULL_PLAYER_REVEALED = {
  ...WORLD_FULL_PLAYER_PARTIAL, visibility: 'revealed', parentId: 1, mentions: [2],
  body: WORLD_FULL_DM.body, secretsCount: 1,
  secrets: [{ id: 's1', text: WORLD_FULL_DM.secrets[0].text, session: 2 }],
  data: { role: 'Sacerdotisa', appearance: 'Manto cinza-azulado, cabelo raspado.', mannerism: 'Fala baixo.', wants: 'Silenciar o sino.' },
};

/** Lugar com mapa (mestre): pins com visible; o jogador só recebe os visíveis de alvos não ocultos. */
export const WORLD_MAP_DM = {
  ...WORLD_LIGHT_DM[0],
  body: 'Brumafria é uma vila pequena e teimosa. Todo viajante acaba na taverna de @[Borin Pé-de-Malte](2).',
  dmNotes: 'A névoa fica mais densa perto da cripta.', secrets: [],
  data: { placeType: 'village', map: { pins: [
    { id: 'p1', entryId: 2, x: 0.42, y: 0.55, visible: true, label: 'Malte Dourado' },
    { id: 'p2', entryId: 3, x: 0.63, y: 0.31, visible: true },
    { id: 'p3', entryId: 4, x: 0.85, y: 0.12, visible: false, label: 'Torre velha' },
    { id: 'p4', entryId: null, x: 0.2, y: 0.8, visible: false, label: 'Cripta' },
  ] } },
  createdAt: ISO,
};

/** ScreenCard — entrada do POST /campaigns/:id/screen-card. */
export const SCREEN_CARD_INPUTS = [
  { type: 'entry', entryId: 3, secretIds: ['s1'] },
  { type: 'recap', title: 'Anteriormente em Brumafria…', text: 'O grupo chegou à vila e ouviu o sino.' },
  { type: 'scene', adventureId: 1, nodeId: 'n2' },
  null,
];

/** ScreenCard resolvido — como o telão (GET /screen/:token → card) vê. */
export const SCREEN_CARD_RESOLVED = {
  type: 'entry', title: 'Irmã Velna', kindLabel: 'NPC',
  text: 'Sacerdotisa do templo da névoa; cuida dos doentes e evita falar do sino.',
  imageUrl: '/api/screen/TOKEN/image/3', at: LATER,
};

/** SessionPlan (GET/PUT /campaigns/:id/session-plan → {plan}). */
export const SESSION_PLAN = {
  strongStart: 'O sino toca no meio da noite e a névoa entra pelas janelas da taverna.',
  scenes: [
    { id: 'c1', text: 'Conversa com Borin', nodeRef: { adventureId: 1, nodeId: 'n1' }, done: false },
    { id: 'c2', text: 'O templo vazio', nodeRef: null, done: false },
  ],
  secrets: [
    { id: 'p1', text: 'Velna ouve o sino', ref: { entryId: 3, secretId: 's1' }, discovered: true },
    { id: 'p2', text: 'A chave está atrás do barril', ref: { entryId: 2, secretId: 's1' }, discovered: false },
  ],
  npcIds: [2, 3], placeIds: [1], monsters: '4 zumbis afogados', rewards: '50 po, Sino de prata',
};

/** AttackPreview (POST /combat/campaign/:id/attack-preview) — rola SEM aplicar. */
export const ATTACK_PREVIEW = {
  attackRoll: 12, total: 16, targetAC: 12, hit: true, crit: false,
  damage: [{ dice: '1d6+3', rolled: 6, type: 'piercing' }], damageTotal: 6,
};
