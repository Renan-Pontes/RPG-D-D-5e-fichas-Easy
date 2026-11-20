/* Grimório — Condições em UMA linha (até 90 caracteres), para a ficha.
 * Cada linha é o resumo do `simple`/`srd` do artigo de mesma chave em ./conditions.js
 * (que anexa estes textos como `short` / `short2014`). `short2014` só existe onde o campo
 * `versions` do artigo diz que 2014 é diferente. Arquivo pequeno de propósito: a ficha
 * importa só ele (src/sheet/condition-rules.js), sem carregar o Grimório inteiro. */
export const CONDITION_SHORTS = {
  cego: {
    short: {
      pt: 'Ataques com desvantagem; contra você, vantagem; falha em testes que dependem da visão',
      en: 'Your attacks have Disadvantage; attacks against you, Advantage; sight checks fail',
    },
  },
  encantado: {
    short: {
      pt: 'Não pode atacar quem te encantou; ele tem vantagem em testes sociais com você',
      en: 'You can\'t attack the charmer; they have Advantage on social checks against you',
    },
  },
  surdo: {
    short: {
      pt: 'Não ouve nada: falha em testes que dependem da audição',
      en: 'You can\'t hear: checks that need hearing fail automatically',
    },
  },
  exaustao: {
    short: {
      pt: '−2 por nível em todo Teste de d20; deslocamento −1,5 m por nível; nível 6: morte',
      en: '−2 per level on every D20 Test; Speed −5 ft per level; level 6: death',
    },
    short2014: {
      pt: 'Cada nível tem um efeito próprio (veja a barra de Exaustão); nível 6: morte',
      en: 'Each level has its own effect (see the Exhaustion bar); level 6: death',
    },
    // 2014: o efeito de cada nível, na ordem do campo `versions` do artigo
    levels2014: [
      { pt: 'desvantagem em testes de atributo', en: 'Disadvantage on ability checks' },
      { pt: 'deslocamento pela metade', en: 'Speed halved' },
      { pt: 'desvantagem em ataques e salvaguardas', en: 'Disadvantage on attacks and saves' },
      { pt: 'PV máximo pela metade', en: 'HP maximum halved' },
      { pt: 'deslocamento 0', en: 'Speed 0' },
      { pt: 'morte', en: 'death' },
    ],
  },
  amedrontado: {
    short: {
      pt: 'Com a fonte do medo à vista: desvantagem em ataques e testes; não pode se aproximar dela',
      en: 'With the source of fear in sight: Disadvantage on attacks and checks; can\'t move closer',
    },
  },
  agarrado: {
    short: {
      pt: 'Deslocamento 0; desvantagem em ataques contra quem não te agarrou',
      en: 'Speed 0; Disadvantage on attacks against anyone but the grappler',
    },
    short2014: {
      pt: 'Deslocamento 0 enquanto alguém te segura',
      en: 'Speed 0 while someone is holding you',
    },
  },
  incapacitado: {
    short: {
      pt: 'Sem ação, ação bônus nem reação; perde a concentração; não fala; desv. na iniciativa',
      en: 'No action, Bonus Action or Reaction; Concentration ends; no speech; Disadv. on Initiative',
    },
    short2014: {
      pt: 'Sem ações nem reações',
      en: 'No actions or reactions',
    },
  },
  invisivel: {
    short: {
      pt: 'Seus ataques com vantagem; ataques contra você com desvantagem; vantagem na iniciativa',
      en: 'Your attacks have Advantage; attacks against you, Disadvantage; Advantage on Initiative',
    },
    short2014: {
      pt: 'Seus ataques com vantagem; ataques contra você com desvantagem',
      en: 'Your attacks have Advantage; attacks against you have Disadvantage',
    },
  },
  paralisado: {
    short: {
      pt: 'Sem ações, desl. 0; falha salvaguardas de FOR e DES; atacado com vantagem; crítico a 1,5 m',
      en: 'No actions, Speed 0; fails STR and DEX saves; attacked with Advantage; crits within 5 ft',
    },
  },
  petrificado: {
    short: {
      pt: 'Sem ações, desl. 0; falha salv. de FOR e DES; atacado com vantagem; resiste a todo dano',
      en: 'No actions, Speed 0; fails STR and DEX saves; attacked with Advantage; resists all damage',
    },
  },
  envenenado: {
    short: {
      pt: 'Desvantagem em jogadas de ataque e testes de atributo',
      en: 'Disadvantage on attack rolls and ability checks',
    },
  },
  prono: {
    short: {
      pt: 'Ataques com desvantagem; atacado com vantagem a até 1,5 m, com desvantagem de longe',
      en: 'Your attacks have Disadvantage; attacked with Advantage within 5 ft, Disadvantage beyond',
    },
  },
  restringido: {
    short: {
      pt: 'Desl. 0; ataques com desvantagem; atacado com vantagem; desv. em salvaguardas de DES',
      en: 'Speed 0; your attacks have Disadvantage; attacked with Advantage; Disadv. on DEX saves',
    },
  },
  atordoado: {
    short: {
      pt: 'Sem ações nem reações; falha salvaguardas de FOR e DES; atacado com vantagem',
      en: 'No actions or reactions; fails STR and DEX saves; attacked with Advantage',
    },
    short2014: {
      pt: 'Sem ações, não se move; falha salvaguardas de FOR e DES; atacado com vantagem',
      en: 'No actions, can\'t move; fails STR and DEX saves; attacked with Advantage',
    },
  },
  inconsciente: {
    short: {
      pt: 'Sem ações, caído, desl. 0; falha salvaguardas de FOR e DES; atacado com vantagem',
      en: 'No actions, Prone, Speed 0; fails STR and DEX saves; attacked with Advantage',
    },
  },
};

/* Estados que não são condições, também em uma linha. Cada um resume o artigo `article`
 * do Grimório (health.js: "pontos-de-vida"; checks.js: "inspiracao-heroica"). */
export const STATE_SHORTS = {
  bloodied: {
    article: 'pontos-de-vida',
    short: {
      pt: 'Metade dos PV ou menos. Sozinho não faz nada, mas algumas habilidades reagem a isso',
      en: 'Half your HP or fewer. It does nothing on its own, but some abilities trigger on it',
    },
  },
  near: {
    article: 'pontos-de-vida',
    short: {
      pt: 'Quase sem PV, e ainda Sangrando. Perder PV não te enfraquece: você luta igual até cair',
      en: 'Almost out of HP, and still Bloodied. Losing HP does not weaken you: you fight the same',
    },
  },
  inspired: {
    article: 'inspiracao-heroica',
    short: {
      pt: 'gaste para rolar de novo qualquer dado logo depois de rolá-lo',
      en: 'spend it to reroll any die right after rolling it',
    },
    short2014: {
      pt: 'gaste para ter vantagem em uma rolagem de d20, decidida antes de rolar',
      en: 'spend it for Advantage on one d20 roll, chosen before rolling',
    },
  },
};

export default CONDITION_SHORTS;
