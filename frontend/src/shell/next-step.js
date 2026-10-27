// O cartão "O que fazer agora" (especificação §1.2 e §3.1): no máximo UM por tela, com 1
// frase, 1 motivo e 1 botão. Lógica pura (sem React), testada por tabela em
// tests/next-step.test.js. A primeira regra que vale ganha; "Pular" fica lembrado no
// aparelho (`forja:next-skip:<campanha>:<regra>`) até os dados da regra mudarem: cada
// regra devolve a sua assinatura (`sig`) e o pulo só vale enquanto ela for a mesma.
//
// Preparar › Plano (N1–N9):
//   N1 ninguém na mesa · N2 plano vazio e nenhuma aventura (as 3 portas, nunca é pulado)
//   N3 sem começo · N4 menos de 2 cenas · N5 combate numa cena e alguém sem ficha
//   N6 nenhuma pista · N7 alguém sem momento neste plano (com o Raio-X; sem ele, pulada)
//   N8 a Tela nunca foi aberta · N9 tudo pronto (▶ Começar a Sessão N; ao vivo, nada;
//   plano de uma sessão já jogada: "comece o plano da Sessão N", o ↻ do ⋯)
import { clueCount, planHeading, planIsBlank, realScene } from '../prep/next-session.js';

const tt = (lang, pt, en) => (lang === 'en' ? en : pt);
const filled = (s) => typeof s === 'string' && s.trim().length > 0;
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || String(n || '');

export const PLAN_RULES = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9'];

/** "Ana", "Ana e Bruno", "Ana, Bruno e Carla". */
export function joinNames(names, lang = 'pt') {
  const list = (names || []).filter(Boolean);
  if (list.length < 2) return list[0] || '';
  return `${list.slice(0, -1).join(', ')} ${tt(lang, 'e', 'and')} ${list[list.length - 1]}`;
}

/** Nome de quem está na mesa: o personagem, senão o jogador. */
const memberName = (m) => m?.character?.name || m?.user?.displayName || m?.displayName || '?';

/** A mensagem pronta do N5 ("Copiar lembrete"). */
export function reminderText({ names, campaign, session, link = '', lang = 'pt' }) {
  const who = joinNames(names, lang);
  return tt(lang,
    `Oi, ${who}! Antes da Sessão ${session} de “${campaign}”, crie o seu personagem na Forja de Heróis e escolha-o na mesa.${link ? ` ${link}` : ''}`,
    `Hi ${who}! Before session ${session} of “${campaign}”, create your character in Heroes' Forge and pick it at the table.${link ? ` ${link}` : ''}`);
}

const HELP = {
  N1: ['Cada jogador entra pelo link de convite e escolhe a ficha dele. Mande o link no grupo da mesa.', 'Each player joins through the invite link and picks their sheet. Send the link to your group chat.'],
  N2: ['Uma aventura pronta já traz cenas, pessoas e combates. O passo a passo monta o plano com você. O exemplo cria uma vila para mexer.', 'A ready adventure brings scenes, people and fights. Step by step builds the plan with you. The example creates a village to play with.'],
  N3: ['Comece no meio da ação: algo acontece logo no primeiro minuto. Ex.: o sino toca sozinho à meia-noite.', 'Start in the middle of the action: something happens in the first minute. E.g. the bell rings by itself at midnight.'],
  N4: ['Uma cena é um momento que pode acontecer: onde o grupo está e o que pode rolar. Não é roteiro: o grupo decide a ordem.', "A scene is a moment that might happen: where the party is and what could go on. It's not a script: the party picks the order."],
  N5: ['Sem ficha, o personagem não entra na iniciativa nem nas contas do Raio-X. O lembrete vai pronto para colar no grupo.', "Without a sheet the character can't join initiative or the X-ray. The reminder is ready to paste in your group chat."],
  N6: ['Pistas são coisas que o grupo pode descobrir, sem dizer onde. O ideal são umas 10, mas 3 já servem.', 'Clues are things the party can discover, without deciding where. About 10 is ideal, but 3 will do.'],
  N7: ['Um momento é uma cena para alguém brilhar, ser desafiado ou viver a história dele. A ideia vem da ficha e do estilo do jogador.', "A moment is a scene for someone to shine, be challenged or live their story. The idea comes from the sheet and the player's style."],
  N8: ['A Tela é a TV, o monitor ou o tablet que todos veem. Abra o link nela antes do dia para ver se está tudo certo.', 'The screen is the TV, monitor or tablet everyone sees. Open the link on it before game day to check it works.'],
  N9: ['Na mesa, o plano vira botões: as cenas, as pistas e o que vai à Tela. Dá para ensaiar antes em Jogar › Agora.', 'At the table the plan turns into buttons: scenes, clues and what goes on screen. You can rehearse first in Play › Now.'],
  stale: ['O plano novo começa vazio, mas leva as pistas que o grupo ainda não achou, as pessoas e os lugares. Para jogar com este plano mesmo, use o ▶ Começar no fim da página.', "The new plan starts empty but carries over the clues the party hasn't found, people and places. To play with this plan anyway, use ▶ Start at the bottom of the page."],
};
export const stepHelp = (id, lang) => (HELP[id] ? tt(lang, HELP[id][0], HELP[id][1]) : '');

/**
 * A sessão que o mestre está preparando: a do plano ou, se o plano é de uma sessão que já
 * foi jogada (`heading.stale`), a próxima — a mesma do "▶ Começar a Sessão N" do fim do Plano.
 */
export const prepSession = (heading) => (heading.stale ? heading.next : heading.n);

/**
 * As regras do Plano, na ordem. Cada uma devolve null (não vale) ou o cartão.
 * Entrada:
 *   campaign   {status, state, members, onboarding, name}
 *   plan       o plano normalizado (next-session.normalizePlan)
 *   pulse      {tvLive} do pulso do mestre (ou null)
 *   insights   null (sem o Raio-X: N7 é pulada) ou {chars: [{id, name, moments, ideas: [{kind, text, auto}], style: ['🤐 fala pouco']}]}
 *   adventures nº de aventuras da campanha (N2)
 *   fights     ids das cenas com combate (N5; next-session.sceneFights)
 *   idea       qual ideia da N7 ("Outra ideia" soma 1)
 */
function planRules({ campaign, plan, pulse, insights, adventures = 0, fights = [], idea = 0, lang = 'pt' }) {
  const party = (campaign?.members || []).filter(m => m.role !== 'dm');
  const heading = planHeading(plan, campaign?.state, lang);
  const n = prepSession(heading);
  const scenes = plan.scenes.filter(realScene);
  const ob = campaign?.onboarding || {};
  return [
    () => (party.length ? null : {
      id: 'N1', sig: 'players:0', canSkip: true,
      text: tt(lang, 'Chame seus jogadores: mande o link.', 'Call your players: send them the link.'),
      why: tt(lang, 'Ninguém entrou na mesa ainda.', 'Nobody has joined the table yet.'),
      action: { id: 'invite', label: tt(lang, '🔗 Copiar link de convite', '🔗 Copy invite link') },
      secondary: { id: 'share', label: tt(lang, 'Compartilhar…', 'Share…') },
    }),
    () => (!planIsBlank(plan) || adventures > 0 ? null : {
      id: 'N2', sig: 'empty', canSkip: false, doors: true,
      text: tt(lang, `Escolha como preparar a Sessão ${n}.`, `Choose how to prepare session ${n}.`),
      why: tt(lang, 'Dá para mudar tudo depois.', 'You can change everything later.'),
      action: { id: 'doors', label: '' },
    }),
    () => (filled(plan.strongStart) ? null : {
      id: 'N3', sig: 'start:empty', canSkip: true,
      text: tt(lang, 'Escreva como a sessão começa: algo acontece logo no 1º minuto.', 'Write how the session starts: something happens in the first minute.'),
      why: tt(lang, 'Um começo forte põe o grupo na ação sem esperar.', 'A strong start puts the party into the action right away.'),
      action: { id: 'start', label: tt(lang, 'Escrever o começo', 'Write the opening') },
    }),
    () => (scenes.length >= 2 ? null : {
      id: 'N4', sig: `scenes:${scenes.length}`, canSkip: true,
      text: tt(lang, 'Planeje mais uma cena. Duas ou três bastam.', 'Plan one more scene. Two or three are enough.'),
      why: scenes.length
        ? tt(lang, 'O plano tem 1 cena.', 'The plan has 1 scene.')
        : tt(lang, 'O plano ainda não tem cenas.', 'The plan has no scenes yet.'),
      action: { id: 'scene', label: tt(lang, '＋ Cena', '＋ Scene') },
    }),
    () => {
      const missing = party.filter(m => !m.character);
      const i = plan.scenes.findIndex(s => realScene(s) && !s.done && fights.includes(s.id));
      if (i < 0 || !missing.length) return null;
      const names = missing.map(memberName);
      const pos = scenes.indexOf(plan.scenes[i]) + 1;
      return {
        id: 'N5', sig: `${plan.scenes[i].id}:${missing.map(m => m.id).join(',')}`, canSkip: true,
        text: names.length === 1
          ? tt(lang, `O combate da cena ${pos} precisa dos personagens: ${names[0]} ainda não tem ficha.`, `The fight in scene ${pos} needs the characters: ${names[0]} has no sheet yet.`)
          : tt(lang, `O combate da cena ${pos} precisa dos personagens: ${joinNames(names, lang)} ainda não têm ficha.`, `The fight in scene ${pos} needs the characters: ${joinNames(names, lang)} have no sheet yet.`),
        why: tt(lang, 'Sem ficha, o personagem não entra na iniciativa.', "Without a sheet, the character can't join initiative."),
        action: { id: 'remind', label: tt(lang, 'Copiar lembrete', 'Copy reminder') },
        payload: { names, session: n },
      };
    },
    () => (clueCount(plan).total ? null : {
      id: 'N6', sig: 'clues:0', canSkip: true,
      text: tt(lang, 'Anote 3 coisas que o grupo pode descobrir.', 'Write down 3 things the party can discover.'),
      why: tt(lang, 'Sem dizer onde: o grupo acha onde fizer sentido.', "Don't decide where: the party finds them wherever it makes sense."),
      action: { id: 'clue', label: tt(lang, '＋ Pista', '＋ Clue') },
    }),
    () => {
      const lacking = (insights?.chars || []).filter(c => !c.moments);
      if (!lacking.length) return null;
      const c = lacking[0];
      const ideas = c.ideas || [];
      const pick = ideas.length ? ideas[((idea % ideas.length) + ideas.length) % ideas.length] : null;
      const who = firstName(c.name);
      const icon = { shine: '★', push: '↗', hook: '✎' }[pick?.kind] || '★';
      return {
        id: 'N7', sig: `moments:${lacking.map(x => x.id).sort().join(',')}`, canSkip: true,
        text: pick
          ? tt(lang, `${who} ainda não tem um momento. Ideia: ${icon} ${pick.text}`, `${who} has no moment yet. Idea: ${icon} ${pick.text}`)
          : tt(lang, `${who} ainda não tem um momento neste plano.`, `${who} has no moment in this plan yet.`),
        why: c.style?.length
          ? `(${who}: ${c.style.join(' · ')})`
          : tt(lang, 'Uma cena para ele brilhar, ser desafiado ou viver a história dele.', 'A scene for them to shine, be challenged or live their story.'),
        action: pick
          ? { id: 'useIdea', label: tt(lang, '★ Usar a ideia', '★ Use the idea') }
          : { id: 'moments', label: tt(lang, 'Ver os momentos', 'See the moments') },
        secondary: ideas.length > 1 ? { id: 'otherIdea', label: tt(lang, 'Outra ideia', 'Another idea') } : null,
        payload: { charId: c.id, name: c.name, idea: pick },
      };
    },
    () => (ob.tv || pulse?.tvLive ? null : {
      id: 'N8', sig: 'tv:0', canSkip: true,
      text: tt(lang, 'Teste a Tela antes do dia: abra o link na TV.', 'Test the screen before game day: open the link on the TV.'),
      why: tt(lang, 'É o que todos veem: a capa, as imagens e o combate.', "It's what everyone sees: the cover, images and combat."),
      action: { id: 'tvLink', label: tt(lang, 'Copiar link da Tela', 'Copy screen link') },
    }),
    () => (campaign?.state?.live ? null : heading.stale ? {
      // o plano é de uma sessão que já foi: o próximo passo é o plano da próxima (↻ do ⋯)
      id: 'N9', sig: `stale:${heading.n}`, canSkip: true, helpId: 'stale',
      text: tt(lang, `A Sessão ${heading.n} já foi jogada: comece o plano da Sessão ${n}.`, `Session ${heading.n} has been played: start the session ${n} plan.`),
      why: tt(lang, 'As pistas não achadas, as pessoas e os lugares passam para ele.', 'Unfound clues, people and places carry over.'),
      action: { id: 'newPlan', label: tt(lang, `↻ Começar o plano da Sessão ${n}`, `↻ Start the session ${n} plan`) },
    } : {
      id: 'N9', sig: `ready:${n}`, canSkip: true,
      text: tt(lang, `Tudo pronto para a Sessão ${n}.`, `All set for session ${n}.`),
      why: tt(lang, 'Na mesa, o plano vira botões: cenas, pistas e a Tela.', 'At the table the plan turns into buttons: scenes, clues and the screen.'),
      action: { id: 'startSession', label: tt(lang, `▶ Começar a Sessão ${n}`, `▶ Start session ${n}`) },
    }),
  ];
}

/**
 * O cartão desta tela, ou null. `where` = 'plan' (Preparar › Plano; a Agora ganha as
 * regras J na V7). `skips` = {regra: sig} lembrados no aparelho (readSkips).
 * Campanha encerrada: nada a fazer.
 */
export function nextStep(ctx = {}) {
  const { campaign, plan, skips = {}, where = 'plan' } = ctx;
  if (!plan || campaign?.status === 'closed' || where !== 'plan') return null;
  for (const rule of planRules(ctx)) {
    const step = rule();
    if (!step) continue;
    if (skips[step.id] && skips[step.id] === step.sig) continue;
    const { helpId, ...card } = step;
    return { ...card, help: stepHelp(helpId || step.id, ctx.lang) };
  }
  return null;
}

// ---------------------------------------------------------------- "Pular" no aparelho

const skipKey = (campaignId, rule) => `forja:next-skip:${campaignId}:${rule}`;
const store = (s) => s || (typeof localStorage !== 'undefined' ? localStorage : null);

/** {regra: sig} das regras puladas nesta campanha, neste aparelho. */
export function readSkips(campaignId, storage) {
  const out = {};
  try {
    const s = store(storage);
    for (const rule of PLAN_RULES) {
      const v = s?.getItem(skipKey(campaignId, rule));
      if (v) out[rule] = v;
    }
  } catch { /* modo privado: nada lembrado */ }
  return out;
}

/** Lembra o pulo (ou a escolha de uma porta) desta regra com a assinatura de agora. */
export function writeSkip(campaignId, rule, sig, storage) {
  try { store(storage)?.setItem(skipKey(campaignId, rule), String(sig)); } catch { /* ok */ }
  return { ...readSkips(campaignId, storage), [rule]: String(sig) };
}
