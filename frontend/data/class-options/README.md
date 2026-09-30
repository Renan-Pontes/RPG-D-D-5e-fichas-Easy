# Dados de classe: opções selecionáveis, traços e subclasses (regras 2024)

Cada classe tem um arquivo `<classId>.js`. Ele é a fonte para as fichas 2024
(`rulesVersion: '2024'`): `src/progression/rules.js` incorpora estes dados em
`PROGRESSION_RULES_2024`, e `src/progression/options.js` cuida das escolhas.
Depois de editar, rode `node scripts/sync-rules.mjs` (gera a cópia do backend)
e `npm test` em `frontend/`.

```js
const b = (pt, en) => ({ pt, en });

export default {
  classId: 'warlock',

  // 1) Listas de opções (pools). A chave é o id do pool, única na classe.
  pools: {
    invocation: {
      name: b('Invocações Místicas', 'Eldritch Invocations'),
      swapOnLevelUp: 1,        // ao ganhar nível na classe, pode trocar até N opções
      swapLevels: [3, 7, 10],  // opcional: a troca ao subir só vale ao chegar nestes níveis da classe
      freeSwap: false,         // true = pode trocar a qualquer momento (ex.: maestria após descanso longo)
      startingClassOnly: false,// true = não dá vagas a quem entra na classe por multiclasse (ex.: instrumentos)
      options: [{
        id: 'agonizingBlast',                  // camelCase, único no pool
        name: b('Rajada Agonizante', 'Agonizing Blast'),
        source: 'SRD',                         // SRD, PHB24, PHB, XGE, TCE, SCAG, FTD, BGG…
        rules: '2014',                         // opcional: só vale nessa versão ('2014' | '2024')
        desc: b('...', '...'),                 // resumo ORIGINAL curto (texto do SRD pode ser usado)
        prereq: {                              // tudo opcional; as condições valem juntas
          level: 2,                            // nível mínimo NA CLASSE
          options: ['pactOfTheBlade'],         // exige todas estas opções (mesma classe, qualquer pool)
          anyOption: ['a', 'b'],               // exige pelo menos uma destas
          subclass: ['fiend'],                 // exige uma destas subclasses
          text: b('...', '...'),               // parte não verificável, só exibida
        },
        repeatable: true,                      // pode ser escolhida mais de uma vez (com `detail` diferente;
                                               // sem `detail`, repete à vontade — ex.: Replicar Item Mágico)
        detail: b('Qual truque?', 'Which cantrip?'), // pede um texto curto ao escolher
        grants: {                              // o que a opção concede (tudo opcional)
          spells: ['mageArmor'],               // magias sempre preparadas (ids do catálogo 2024)
          cantrips: ['guidance'],              // truques automáticos
          skills: ['perception'],              // proficiência em perícia
          expertise: [],                       // expertise em perícia
          languages: ['Draconic'],             // idiomas
          tools: [], weapons: [], armor: [],   // proficiências (texto livre/ids; exibidas na ficha)
          saves: ['wis'],                      // proficiência em salvaguarda
        },
        choices: { blessedWarriorCantrip: 2 }, // escolher esta opção abre N vagas em outro pool
      }],
    },

    // Pools dinâmicos: as opções vêm de um catálogo, não de uma lista fixa.
    blessedWarriorCantrip: {
      name: b('Truques de Clérigo', 'Cleric Cantrips'),
      kind: 'spell',                           // 'spell' | 'skill' | 'language'
      filter: { classes: ['cleric'], level: 0 },          // spell: classes, level | minLevel/maxLevel, maxSlot, school[], ritual, castingTime, inBook
      grantAs: 'cantrip',                      // 'spell' | 'cantrip' | 'spellbook' (grimório do mago, sem preparar) | 'skill' | 'expertise' | 'language' | 'tool' | 'weapon'
      countsAsKnown: false,                    // true = as magias escolhidas já estão na tabela de conhecidas
                                               // (Segredos Mágicos 2014): descontam do limite de conhecidas
    },                                         // vagas vêm da opção blessedWarrior (abaixo)
    expertise: {
      name: b('Especialização', 'Expertise'),
      kind: 'skill', grantAs: 'expertise',
      filter: { proficient: true },            // skill: from: [...ids], proficient: true
    },
  },

  // 2) Quantas opções NOVAS se ganha em cada nível da classe (delta, não total).
  choices: { 1: { invocation: 1 }, 2: { invocation: 2 } },
  // Fichas 2014 (regras antigas) usam `legacyChoices`, no mesmo formato.
  legacyChoices: { 2: { invocation: 2 } },
  // Escolhas que só existem com uma subclasse: { <subclassId>: { <nível>: { pool: n } } }.
  // Valem para fichas 2024; fichas 2014 usam `legacySubclassChoices` (mesmo formato).
  subclassChoices: { battlemaster: { 3: { maneuver: 3 } } },
  legacySubclassChoices: { battlemaster: { 3: { maneuver: 3 } } },

  // 3) Texto revisado (PT/EN) dos traços da classe base por nível. Substitui o
  //    texto extraído do PDF em srd2024-rules.json naquele nível — inclua TODOS
  //    os traços do nível. Não mexe em contadores (espaços, truques etc.).
  features: {
    1: [{ id: 'eldritchInvocations', name: b('Invocações Místicas', 'Eldritch Invocations'), desc: b('...', '...') }],
  },

  // 3b) Magias e proficiências fixas da classe base por nível (2024).
  classLevels: { 9: { autoSpells: ['contactOtherPlane'] }, 1: { grants: { armor: ['light'] } } },

  // 4) Subclasses 2024 (novas ou reeditadas no PHB 2024), e subclasses de
  //    suplemento com os traços ajustados (níveis 1/2 → 3). Substituem a
  //    conversão automática da versão 2014 para esta subclasse.
  subclasses: {
    archfey: {
      name: b('Patrono Arquifada', 'Archfey Patron'),
      source: 'PHB24',
      desc: b('...', '...'),
      levels: {
        3: {
          features: [{ id: 'stepsOfTheFey', name: b('...', '...'), desc: b('...', '...') }],
          autoSpells: ['calmEmotions', 'faerieFire', 'mistyStep', 'phantasmalForce', 'sleep'],
          autoCantrips: [],
          // Proficiências fixas que a subclasse dá neste nível (sem escolha). Não use
          // pools de uma opção só para isso.
          grants: { armor: ['heavy'], weapons: ['martial'], skills: [], languages: [], tools: [], saves: [] },
        },
      },
    },
  },
};
```

Pools usados por mais de uma classe (estilos de luta, maestria em armas) ficam
em `shared.js`; a classe usa com `pools: { fightingStyle: SHARED.fightingStyle }`.

### Filtros de pools de magia (`kind: 'spell'`)

Aplicados só no seletor (`options-catalog.js`, `spellOptions`); o motor e o
backend conferem apenas o formato da escolha.

- `classes: [ids]`: lista de magias; `level`, `minLevel`, `maxLevel`: círculo.
- `maxSlot: true`: círculo ≤ maior espaço que a ficha conjura.
- `school: [ids]`, `ritual: true`, `castingTime: 'Action'` (começo do texto).
- `include: [ids]`: magias sempre listadas, mesmo fora dos outros filtros. Serve
  para magias fixas de subclasse que podem ser trocadas: o formato não troca
  `autoSpells`, então a subclasse abre vagas num pool com as magias padrão em
  `include` e `swapOnLevelUp` (Mente Aberrante/Alma Mecânica 2014, `sorcerer.js`).

Pools `kind: 'skill'` aceitam `tools: [ids de items.js]`: ferramentas que também
podem ser escolhidas (ex.: `thievesTools` na Especialização do ladino 2014). O id
entra na concessão do pool (`grantAs`) como qualquer perícia.

### Estilos de luta 2014

Em fichas 2014, uma opção com `classes2014` só vale para as classes listadas
(conferido no motor e no backend). O guerreiro sobrescreve a Técnica Superior
em `fighter.js` para abrir 1 vaga no pool `maneuver` e criar o dado (recurso).

### Recursos opcionais do Tasha (fichas 2014)

Um pool estático `tceOptional` com uma opção "regra-base" e a opção do TCE, que
abre vagas em outros pools por `choices` (Explorador Hábil do patrulheiro,
Conhecimento Primal do bárbaro). O `resource` de uma opção aceita `minLevel`.
- `inBook: true`: só magias que já estão no grimório do mago
  (`src/progression/spellbook.js`; entradas `inBook: true` em `character.spells`,
  e fichas antigas sem a marca contam todas as magias de nível 1+ do mago).
  Usado na Maestria em Magia e nas Magias Assinatura. O Sábio das escolas não
  usa: as magias dele entram no livro, não saem dele.

### Filtros de pools estáticos

Um pool com `options` pode ter `filter` (vale para qualquer classe) ou, se for
compartilhado, `filterByClass: { <classId>: filtro }`. O filtro só esconde
opções no seletor (`options-catalog.js`, `matchesOptionFilter`); escolhas já
feitas continuam visíveis. Cada chave compara com o campo de mesmo nome da opção:
valor simples = igualdade (booleano ausente conta como `false`), array = o campo
(ou algum item dele, se for array) está na lista, `anyOf: [filtro, …]` = basta um.

```js
weaponMastery: {
  ...,
  filterByClass: {
    barbarian: { melee: true },
    rogue: { anyOf: [{ category: ['simple'] }, { props: ['finesse', 'light'] }] },
  },
}
```

Os `effect` dos estilos de luta e a maestria das armas são aplicados na ficha
por `src/progression/fighting-styles.js` (CA, ataque, dano, notas e sentidos).

A ficha guarda as escolhas em `character.classOptions`:

```js
[{ classId: 'warlock', pool: 'invocation', id: 'agonizingBlast', level: 2, detail: 'eldritchBlast' }]
```

`level` é o nível TOTAL do personagem em que a escolha entrou (usado para desfazer
uma subida de nível). Em pools dinâmicos, `id` é o id da magia/perícia/idioma.

Regras de conteúdo: só texto do SRD 5.2.1 (CC-BY) ou resumos originais.
Nunca copie descrições de livros pagos (inclusive do Aurora Builder).

## Recursos com usos (`resources`)

Contadores que se gastam e voltam no descanso (Fúria, Canalizar Divindade,
pontos de feitiçaria, dados de superioridade, Arcano Místico…). NÃO inclua
espaços de magia nem Forma Selvagem: esses já têm controle próprio na ficha.

```js
resources: [{
  id: 'rage',                                // camelCase, único na classe
  name: b('Fúria', 'Rage'),
  desc: b('Usos de Fúria; +dano de fúria no texto do traço.', '...'), // opcional, curto
  uses: { byLevel: { 1: 2, 3: 3, 6: 4, 12: 5, 17: 6 } },   // por nível NA CLASSE; ou:
  //    { fixed: 1 }                         // valor fixo
  //    { ability: 'cha', min: 1 }           // modificador de atributo (mínimo)
  //    { profBonus: true }                  // bônus de proficiência
  //    { perClassLevel: 5 }                 // 5 × nível na classe (ex.: Imposição de Mãos, é um "pool")
  //    { classLevel: true }                 // igual ao nível na classe (ex.: pontos de feitiçaria/foco)
  recharge: 'long',                          // 'long' | 'short' (volta em descanso curto OU longo)
  shortRestRegain: 1,                        // opcional: no descanso curto recupera só N (no longo, tudo)
  minLevel: 1,                               // nível mínimo NA CLASSE (se omitido: menor chave de byLevel, ou 1)
  subclass: ['battlemaster'],                // opcional: só com estas subclasses
  rules: '2024',                             // opcional: só nesta versão das regras
  die: { byLevel: { 3: 'd8', 10: 'd10', 18: 'd12' } },    // opcional, informativo (dado do recurso)
}],
```

Uma opção de pool também pode ter um recurso próprio (ex.: invocação "1× por
descanso longo"): `resource: { uses: { fixed: 1 }, recharge: 'long' }` na opção;
ele só existe enquanto a opção estiver escolhida (id gerado: `<pool>.<opção>`).

A ficha guarda o gasto em `character.resourcesUsed = { [classId.id]: n }`.
Sem modo trapaça, o jogador só GASTA; o recurso volta pelo descanso (ou pelo
mestre). Com modo trapaça, pode ajustar à vontade.
