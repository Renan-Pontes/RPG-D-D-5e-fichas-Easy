// "Rolagens na Tela" de Jogar › Tela (onda 3, E2.6), sem React — testada em
// tests/roll-rules.test.js.
//
// A configuração é uma LISTA do que vai à Tela, uma linha por origem, cada uma com uma
// frase que diz exatamente o que acontece com a escolha de agora (a avaliação pegou
// "Só críticos" marcado e um d20 = 2 do mestre na TV: a regra dos jogadores não vale
// para o 🎲 do mestre, e agora a linha dele diz isso).
//   🎲 Rolagens do mestre     — quando o 🎲 está em 📺 (o padrão dele: 🔒 Só eu · 📺 Na tela)
//   📜 Rolagens das fichas    — Todas · Só 20 e 1 · Nenhuma   (stage.prefs.sheets: true · 'crits' · false)
//   🎲 Rolador da Mesa        — Todas · Só 20 e 1 · Nenhuma   (stage.prefs.players: all · crits · off)
//   ⚔ Monstros                — 📺 Na tela · 🔒 Só eu         (stage.prefs.monsters)
//   🎯 Testes pedidos         — sem escolha: o resultado de cada um quando o teste tem 📺
// O servidor de antes não conhece o "Só 20 e 1" das fichas (400 invalid_sheets):
// `ruleSaveError` diz que falta atualizar o servidor.

export const L = (lang, pt, en) => (lang === 'en' ? en : pt);

/** A regra das fichas como escolha: true → 'all' · 'crits' · false → 'off'. */
export function sheetsChoice(v) {
  if (v === 'crits') return 'crits';
  return v === false ? 'off' : 'all';
}
/** …e de volta para o servidor. */
export function sheetsValue(choice) {
  if (choice === 'crits') return 'crits';
  return choice !== 'off';
}

const THREE = (lang) => [
  { value: 'all', label: L(lang, 'Todas', 'All') },
  { value: 'crits', label: L(lang, 'Só 20 e 1', '20s and 1s only') },
  { value: 'off', label: L(lang, 'Nenhuma', 'None') },
];

/**
 * As linhas da lista, na ordem da tela.
 * → [{key, icon, title, options: [{value, label}] | null, value, why}]
 * (`key` = a chave em stage.prefs; a das fichas usa a escolha 'all'|'crits'|'off').
 */
export function rollRuleRows(raw = {}, lang = 'pt') {
  const prefs = raw || {};
  const players = ['all', 'crits', 'off'].includes(prefs.players) ? prefs.players : 'crits';
  const dm = prefs.dm === 'shown' ? 'shown' : 'secret';
  const monsters = prefs.monsters === 'secret' ? 'secret' : 'shown';
  const sheets = sheetsChoice(prefs.sheets);
  return [
    {
      key: 'dm', icon: '🎲', title: L(lang, 'Rolagens do mestre', 'GM rolls'),
      options: [{ value: 'secret', label: L(lang, '🔒 Só eu', '🔒 Only me') }, { value: 'shown', label: L(lang, '📺 Na tela', '📺 On screen') }],
      value: dm,
      why: dm === 'shown'
        ? L(lang, 'Vão à Tela quando o seu 🎲 está em “📺 Na tela”, com qualquer número (o “Só 20 e 1” das outras linhas não vale para você). O 🎲 começa em 📺 Na tela; dá para trocar a cada rolagem.',
          'They go on screen when your 🎲 is on “📺 On screen”, whatever the number (the “20s and 1s only” of the other rows doesn’t apply to you). Your 🎲 starts on 📺 On screen; you can switch on each roll.')
        : L(lang, 'Vão à Tela quando o seu 🎲 está em “📺 Na tela”, com qualquer número (o “Só 20 e 1” das outras linhas não vale para você). O 🎲 começa em 🔒 Só eu: só você vê, até trocar.',
          'They go on screen when your 🎲 is on “📺 On screen”, whatever the number (the “20s and 1s only” of the other rows doesn’t apply to you). Your 🎲 starts on 🔒 Only me: only you see it until you switch.'),
    },
    {
      key: 'sheets', icon: '📜', title: L(lang, 'Rolagens das fichas', 'Sheet rolls'),
      options: THREE(lang), value: sheets,
      why: {
        all: L(lang, 'Na sessão ao vivo, o que cada jogador rola na própria ficha (perícia, ataque, dano…) aparece grande na TV, com o nome, e fica nas Últimas rolagens. Quem marca “🔒 Só eu” na ficha fica de fora.',
          'During the live session, what each player rolls on their own sheet (skill, attack, damage…) shows big on the TV, with the name, and stays in the Latest rolls. Whoever picks “🔒 Only me” on the sheet stays out.'),
        crits: L(lang, 'Na sessão ao vivo, só os 20 e 1 naturais no d20 das fichas aparecem na TV; o resto fica no aparelho de cada jogador.',
          'During the live session, only natural 20s and 1s on the d20 of the sheets go on screen; the rest stays on each player’s device.'),
        off: L(lang, 'Nada das fichas vai à Tela: cada jogador vê só no próprio aparelho.', 'Nothing from the sheets goes on screen: each player sees it only on their own device.'),
      }[sheets],
    },
    {
      key: 'players', icon: '🎲', title: L(lang, 'Rolador da Mesa dos jogadores', "Players' table roller"),
      options: THREE(lang), value: players,
      why: {
        all: L(lang, 'Toda rolagem do 🎲 da Mesa do jogador (a aba Mesa do app dele) aparece na TV, com o nome.', "Every roll from the player's table 🎲 (the Table tab of their app) goes on screen, with the name."),
        crits: L(lang, 'Do 🎲 da Mesa do jogador, só os 20 e 1 naturais no d20 aparecem na TV.', "From the player's table 🎲, only natural 20s and 1s on the d20 go on screen."),
        off: L(lang, 'Nada do 🎲 da Mesa do jogador vai à Tela.', "Nothing from the player's table 🎲 goes on screen."),
      }[players],
    },
    {
      key: 'monsters', icon: '⚔', title: L(lang, 'Monstros: ataques e salvaguardas', 'Monsters: attacks and saves'),
      options: [{ value: 'shown', label: L(lang, '📺 Na tela', '📺 On screen') }, { value: 'secret', label: L(lang, '🔒 Só eu', '🔒 Only me') }],
      value: monsters,
      why: monsters === 'shown'
        ? L(lang, 'Cada ataque ou salvaguarda que você aplica no combate aparece na TV, sem o bônus do monstro.', 'Each attack or save you apply in combat goes on screen, without the monster’s bonus.')
        : L(lang, 'Ataques e salvaguardas ficam com você; o cartão do ataque deixa mandar um por um (📺).', 'Attacks and saves stay with you; the attack card lets you send one by one (📺).'),
    },
    {
      key: 'checks', icon: '🎯', title: L(lang, 'Testes pedidos', 'Requested checks'), options: null, value: null,
      why: players === 'off'
        ? L(lang, 'Quando você toca 📺 num teste, a TV mostra o resultado de cada um numa faixa (com 🔒 CD secreta, sem ✓/✗). Com o rolador da Mesa em “Nenhuma”, o 20 e o 1 dos testes não aparecem grandes.',
          'When you tap 📺 on a check, the TV shows each result in a strip (with a 🔒 secret DC, without ✓/✗). With the table roller on “None”, natural 20s and 1s from checks don’t show big.')
        : L(lang, 'Quando você toca 📺 num teste, a TV mostra o resultado de cada um numa faixa (com 🔒 CD secreta, sem ✓/✗). Um 20 ou 1 natural num teste da mesa também aparece grande.',
          'When you tap 📺 on a check, the TV shows each result in a strip (with a 🔒 secret DC, without ✓/✗). A natural 20 or 1 on a table check also shows big.'),
    },
  ];
}

/** O que a linha grava em stage.prefs (`choice` é o valor do segmentado). */
export function rulePatch(key, choice) {
  return key === 'sheets' ? { sheets: sheetsValue(choice) } : { [key]: choice };
}

/** O aviso de erro ao gravar: o servidor de antes não conhece o "Só 20 e 1" das fichas. */
export function ruleSaveError(err, key, choice, lang = 'pt') {
  const code = err?.data?.error;
  if (key === 'sheets' && choice === 'crits' && (code === 'invalid_sheets' || err?.status === 400)) {
    return L(lang, 'Este servidor ainda não conhece “Só 20 e 1” para as fichas: falta atualizar o servidor (Todas e Nenhuma funcionam).',
      'This server doesn’t know “20s and 1s only” for sheets yet: the server needs updating (All and None work).');
  }
  return L(lang, 'Não salvou · confira a conexão', 'Not saved · check the connection');
}
