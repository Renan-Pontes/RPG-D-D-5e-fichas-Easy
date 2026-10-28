// O Guia do mestre (§2.5) e o aviso "O que mudou" (§2.6) — lógica pura (sem React),
// testada em tests/guide-model.test.js. GmGuide.jsx e WhatsNew.jsx só desenham.
//
// Guia: 5 cartões de 1 tela (1 Preparar · 2 Começar a sessão · 3 Mostrar na Tela ·
// 4 Combate · 5 Encerrar), cada um com 1 frase, 1 desenho e a tabela "Quero… → vou a…"
// daquele assunto (conteúdo de ajuda, não para decorar) e "Me leve lá", que leva à tela
// certa (guideTarget). Abre em Mais › Guia do mestre, no "?" do cartão "O que fazer agora"
// (já no cartão do assunto daquela regra: guideForRule) e pela busca ("guia", "ajuda").
//
// "O que mudou": um cartão dispensável em Jogar e em Preparar, uma vez por aparelho (o
// mesmo "Entendi" vale para as duas áreas); a busca acha pelos nomes antigos (NAV_PLACES).
//
// Celular × PC (`desk`, o mesmo corte da casca: a barra da mesa só existe até 767 px). No
// PC não há barra da mesa nem Mais: o Próximo turno fica na faixa do turno, no topo de
// Jogar (tecla N), e o ✕ Tirar / 🧹 Limpar na janela da Tela (§2.2, §5.8). O texto que
// muda entre os dois vem como {phone: [pt, en], desk: [pt, en]} (byDevice).

const tt = (lang, pt, en) => (lang === 'en' ? en : pt);
const row = (want, go) => ({ want, go });
const byDevice = (phone, desk) => ({ phone, desk });
/** [pt, en] ou {phone, desk} → o texto no idioma e no aparelho. */
const say = (v, lang, desk) => {
  const pair = Array.isArray(v) ? v : (desk ? v.desk : v.phone);
  return tt(lang, pair[0], pair[1]);
};

/**
 * Os 5 cartões. `art` é o desenho (GmGuide.jsx), `go` a tela do "Me leve lá"
 * ({area, sub} ou {sheet: 'end'} — a folha Encerrar, só com a sessão ao vivo).
 */
export const GUIDE_CARDS = [
  {
    id: 'prepare', icon: '📋', art: 'scroll', go: { area: 'prepare', sub: 'next' },
    title: ['Preparar', 'Prepare'],
    text: [
      'Antes do dia, monte o Plano da sessão: um começo forte e 2 ou 3 cenas bastam. Não é roteiro: o grupo decide a ordem.',
      "Before game day, build the session Plan: a strong start and 2 or 3 scenes are enough. It's not a script: the party picks the order.",
    ],
    rows: [
      row(['preparar a próxima sessão', 'prepare the next session'], ['Preparar › Plano', 'Prepare › Plan']),
      row(['pôr imagem, pessoas, combate ou teste numa cena', 'add an image, people, combat or a check to a scene'], ['Plano › ＋ Cena (ou toque na cena)', 'Plan › ＋ Scene (or tap the scene)']),
      row(['ver forças e fraquezas do grupo', "see the party's strengths and weaknesses"], ['Grupo › Raio-X', 'Party › X-ray']),
      row(['montar uma masmorra com salas', 'build a dungeon with rooms'], ['Preparar › Aventuras', 'Prepare › Adventures']),
      row(['criar um NPC ou um lugar', 'create an NPC or a place'], ['Mundo › Cartões › ＋ Novo', 'World › Cards › ＋ New']),
    ],
  },
  {
    id: 'start', icon: '▶', art: 'play', go: { area: 'play', sub: 'scene' },
    title: ['Começar a sessão', 'Start the session'],
    text: [
      'Na hora do jogo, ▶ Começar pergunta onde a sessão começa e abre Jogar › Agora, com a cena e tudo o que ela traz.',
      'When it is time to play, ▶ Start asks where the session begins and opens Play › Now, with the scene and everything in it.',
    ],
    rows: [
      row(['começar a sessão', 'start the session'], byDevice(
        ['▶ Começar (no topo ou em Mais)', '▶ Start (at the top or in More)'],
        ['▶ Começar (no topo)', '▶ Start (at the top)'])),
      row(['ir para a próxima cena', 'move to the next scene'], ['Agora › ✓ Cena feita', 'Now › ✓ Scene done']),
      row(['pedir um teste', 'ask for a check'], ['Agora › 🎯 Pedir teste', 'Now › 🎯 Ask for a check']),
      row(['testar a TV antes do dia', 'test the TV before game day'], ['Agora antes de começar (ensaio)', 'Now before you start (rehearsal)']),
    ],
  },
  {
    id: 'screen', icon: '📺', art: 'screen', go: { area: 'play', sub: 'screen' },
    title: ['Mostrar na Tela', 'Show on screen'],
    text: [
      'A Tela mostra a última coisa que você mandou. ✕ tira e volta para o fundo: o combate, se houver; senão, a capa.',
      'The screen shows the last thing you sent. ✕ removes it and goes back to the background: combat if there is one, otherwise the cover.',
    ],
    rows: [
      row(['pôr algo na TV', 'put something on the TV'], ['📺 em qualquer cena ou cartão', '📺 on any scene or card']),
      row(['tirar ou limpar a Tela', 'remove or clear the screen'], byDevice(
        ['barra da mesa › ✕ Tirar ou 🧹 Limpar', 'table bar › ✕ Remove or 🧹 Clear'],
        ['janela da Tela › ✕ Tirar ou 🧹 Limpar', 'screen window › ✕ Remove or 🧹 Clear'])),
      row(['pegar o link da TV', 'get the TV link'], byDevice(['Mais › Tela', 'More › Screen'], ['📺 Tela, no topo', '📺 Screen, at the top'])),
      row(['rolar um dado para todos verem', 'roll a die for everyone to see'], ['🎲 › 📺 Na tela', '🎲 › 📺 On screen']),
    ],
  },
  {
    id: 'combat', icon: '⚔', art: 'swords', go: { area: 'play', sub: 'combat' },
    title: ['Combate', 'Combat'],
    text: byDevice([
      '⚔ Começar o combate monta tudo de uma vez. O Próximo turno fica na barra da mesa, embaixo, em qualquer área.',
      '⚔ Start combat sets everything up at once. Next turn lives in the table bar, at the bottom, in any area.',
    ], [
      '⚔ Começar o combate monta tudo de uma vez. O Próximo turno fica na faixa do turno, no topo de Jogar (tecla N).',
      '⚔ Start combat sets everything up at once. Next turn lives in the turn strip, at the top of Play (key N).',
    ]),
    rows: [
      row(['começar o combate da cena', "start the scene's combat"], ['Agora › ⚔ Começar o combate', 'Now › ⚔ Start combat']),
      row(['dar dano ou curar', 'deal damage or heal'], ['Combate › toque nos PV', 'Combat › tap the HP']),
      row(['passar a vez', 'pass the turn'], byDevice(
        ['Próximo turno → (barra da mesa)', 'Next turn → (table bar)'],
        ['Próximo turno → (faixa do turno, no topo de Jogar · tecla N)', 'Next turn → (turn strip, top of Play · key N)'])),
      row(['corrigir um engano', 'fix a mistake'], ['↶ Desfazer (6 s)', '↶ Undo (6 s)']),
    ],
  },
  {
    id: 'end', icon: '■', art: 'book', go: { sheet: 'end' }, goIdle: { area: 'group', sub: 'chronicle' },
    title: ['Encerrar', 'End'],
    text: [
      '■ Encerrar arruma a mesa e abre o Resumo da sessão. O que não foi jogado passa para o plano da próxima.',
      '■ End tidies the table and opens the session recap. Whatever was not played carries over to the next plan.',
    ],
    rows: [
      row(['encerrar e escrever o resumo', 'end and write the recap'], byDevice(
        ['■ Encerrar (no topo ou em Mais)', '■ End (at the top or in More)'],
        ['■ Encerrar (no topo)', '■ End (at the top)'])),
      row(['ver o que aconteceu', 'see what happened'], ['Grupo › Crônica', 'Party › Chronicle']),
      row(['preparar a próxima sessão', 'prepare the next session'], ['Preparar › Plano', 'Prepare › Plan']),
    ],
  },
];

export const GUIDE_COUNT = GUIDE_CARDS.length;

/** Índice válido (0…4); qualquer outra coisa vira o 1º cartão. */
export function guideIndex(i) {
  const n = Number(i);
  return Number.isInteger(n) && n >= 0 && n < GUIDE_COUNT ? n : 0;
}

/**
 * O cartão `i` no idioma e no aparelho (`desk`: PC, ≥ 768 px):
 * {id, icon, art, title, text, rows: [{want, go}], n, total}.
 */
export function guideCard(i, lang = 'pt', { desk = false } = {}) {
  const k = guideIndex(i);
  const c = GUIDE_CARDS[k];
  const pick = (v) => say(v, lang, desk);
  return {
    id: c.id, icon: c.icon, art: c.art, n: k + 1, total: GUIDE_COUNT,
    title: pick(c.title), text: pick(c.text),
    rows: c.rows.map(r => ({ want: pick(r.want), go: pick(r.go) })),
  };
}

/**
 * Para onde o "Me leve lá" leva: {area, sub} ou {sheet: 'end'}. O 5º (Encerrar) abre a folha
 * Encerrar só com a sessão ao vivo; parada (ou campanha encerrada), a Crônica (o resumo).
 */
export function guideTarget(i, { live = false, closed = false } = {}) {
  const c = GUIDE_CARDS[guideIndex(i)];
  if (c.go.sheet && (!live || closed)) return { ...c.goIdle };
  return { ...c.go };
}

/** O cartão do Guia que explica a regra do "O que fazer agora" (N1…N9, J1…J6). */
export function guideForRule(ruleId) {
  const id = String(ruleId || '');
  if (id === 'N8') return 2;            // a Tela nunca foi aberta
  if (id === 'J2' || id === 'J5') return 4;   // sessão encerrada · as cenas acabaram
  if (/^J\d$/.test(id)) return 1;
  return 0;
}

// ---------------------------------------------------------------- "O que mudou"

export const WHATS_NEW_KEY = 'forja:whats-new';
export const WHATS_NEW_VERSION = 'v2';

/**
 * As linhas do cartão (§2.6): o nome antigo e o novo, com o que mudou de lugar. No PC
 * (`desk`) o turno e o Próximo ficam na faixa do turno, no topo de Jogar (não há barra).
 */
export function whatsNewLines(lang = 'pt', { desk = false } = {}) {
  return [
    { was: tt(lang, 'Telão', 'TV screen'), now: tt(lang, 'Tela', 'Screen'), note: '' },
    { was: tt(lang, 'Cena', 'Scene'), now: tt(lang, 'Agora', 'Now'), note: tt(lang, 'em Jogar', 'in Play') },
    { was: tt(lang, 'Próxima sessão', 'Next session'), now: tt(lang, 'Plano', 'Plan'), note: tt(lang, 'em Preparar', 'in Prepare') },
    { was: tt(lang, 'Encontro', 'Encounter'), now: tt(lang, 'Combate', 'Combat'), note: '' },
    desk
      ? { was: '', now: tt(lang, 'faixa do turno', 'turn strip'), note: tt(lang, 'o turno e o Próximo ficam no topo de Jogar', 'the turn and Next live at the top of Play') }
      : { was: '', now: tt(lang, 'barra da mesa', 'table bar'), note: tt(lang, 'o turno e o Próximo ficam embaixo', 'the turn and Next live at the bottom') },
  ];
}

/** O cartão aparece? (até o "Entendi"; sem armazenamento, não incomoda: some). */
export function whatsNewVisible(storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return false;
    return s.getItem(WHATS_NEW_KEY) !== WHATS_NEW_VERSION;
  } catch { return false; }
}

/** "Entendi": não volta mais neste aparelho (nem em Jogar nem em Preparar). */
export function dismissWhatsNew(storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    s?.setItem(WHATS_NEW_KEY, WHATS_NEW_VERSION);
  } catch { /* modo privado: some só nesta visita */ }
}
