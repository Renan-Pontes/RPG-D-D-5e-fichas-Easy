/* Grimório — Magia. Texto original; `srd` = citação literal do SRD 5.2.1 (CC-BY 4.0). */
export default [
  {
    id: 'conjurar-magia',
    aliases: ['casting-a-spell', 'spellcasting'],
    cat: 'magic',
    title: { pt: 'Conjurar uma magia', en: 'Casting a spell' },
    simple: {
      pt: 'Para lançar uma magia você precisa tê-la **preparada** (ou vinda de um item, como um pergaminho). Leia a magia na ordem: **tempo de conjuração** (ação, ação bônus, reação ou minutos), **alcance**, **componentes** e **duração**. Magias de nível 1 ou mais gastam um **espaço de magia**; truques são de graça. Depois o efeito diz se o alvo faz uma salvaguarda contra a sua CD ou se você faz uma jogada de ataque.',
      en: 'To cast a spell you need to have it **prepared** (or get it from an item, like a scroll). Read the spell in order: **casting time** (action, Bonus Action, Reaction or minutes), **range**, **components** and **duration**. Level 1+ spells spend a **spell slot**; cantrips are free. Then the effect tells you whether the target makes a saving throw against your DC or you make an attack roll.',
    },
    example: {
      pt: 'Mirela, maga de nível 3, usa a ação Magia para lançar Mísseis Mágicos (nível 1): gasta 1 dos seus 4 espaços de nível 1, diz as palavras (V), gesticula (S) e três dardos acertam automaticamente, 1d4 + 1 cada = 3 + 4 + 2 = 9 de dano.',
      en: 'Mirela, a level 3 wizard, takes the Magic action to cast Magic Missile (level 1): she spends 1 of her 4 level 1 slots, speaks the words (V), gestures (S), and three darts hit automatically for 1d4 + 1 each = 3 + 4 + 2 = 9 damage.',
    },
    sheet: {
      pt: 'Aba Magias: lista de magias preparadas, CD de Magia, Bônus de Ataque e espaços por nível para marcar o que você gastou.',
      en: 'Spells tab: prepared spell list, Spell Save DC, Spell Attack bonus and slots per level to mark what you spent.',
    },
    keywords: 'conjurar lançar magia feitiço conjuração cast spell casting spellcasting como usar magia',
    related: ['acao-magia', 'espacos-de-magia', 'tempo-de-conjuracao', 'componentes', 'magias-preparadas', 'cd-e-ataque-de-magia'],
  },
  {
    id: 'espacos-de-magia',
    aliases: ['spell-slots'],
    cat: 'magic',
    title: { pt: 'Espaços de magia', en: 'Spell slots' },
    simple: {
      pt: 'Espaços de magia são a "gasolina" do conjurador. Cada magia de nível 1+ ocupa um espaço **do nível dela ou maior**; uma magia de nível 2 não cabe num espaço de nível 1. Você recupera todos os espaços gastos ao terminar um **Descanso Longo** (bruxos recuperam os seus num Descanso Curto). Truques e rituais não gastam espaço.',
      en: 'Spell slots are a caster\'s fuel. Each level 1+ spell fills a slot **of its level or higher**; a level 2 spell doesn\'t fit in a level 1 slot. You regain all expended slots when you finish a **Long Rest** (warlocks get theirs back on a Short Rest). Cantrips and rituals don\'t use slots.',
    },
    example: {
      pt: 'Lia, clériga de nível 3, tem 4 espaços de nível 1 e 2 de nível 2. Ela lança Curar Ferimentos num de nível 1 (sobram 3) e depois Arma Espiritual num de nível 2 (sobra 1). Sem espaço de nível 2, ela ainda pode lançar outra magia de nível 1.',
      en: 'Lia, a level 3 cleric, has 4 level 1 slots and 2 level 2 slots. She casts Cure Wounds with a level 1 slot (3 left), then Spiritual Weapon with a level 2 slot (1 left). With no level 2 slots, she could still cast another level 1 spell.',
    },
    sheet: {
      pt: 'Aba Jogar e aba Magias → Espaços: toque nas bolinhas de cada nível para marcar os gastos. O Descanso Longo limpa as marcas.',
      en: 'Play tab and Spells tab → Slots: tap the pips of each level to mark them used. A Long Rest clears them.',
    },
    srd: {
      text: 'When you cast a spell, you expend a slot of that spell’s level or higher, effectively “filling” a slot with the spell.',
      ref: 'SRD 5.2.1 — Spells (Spell Slots)',
    },
    keywords: 'espaço espacos slot slots magia nível circulo círculo recuperar gastar spell slot level mana',
    related: ['conjurar-em-nivel-superior', 'conjurar-magia', 'truques', 'rituais', 'descanso-longo', 'descanso-curto'],
  },
  {
    id: 'conjurar-em-nivel-superior',
    aliases: ['upcasting', 'higher-level-spell-slot'],
    cat: 'magic',
    title: { pt: 'Conjurar em nível superior', en: 'Casting with a higher-level slot' },
    simple: {
      pt: 'Você pode colocar uma magia num espaço **maior** que o nível dela. Ela passa a contar como magia daquele nível e, se a descrição tiver o trecho "Usando um espaço de nível superior", fica mais forte (mais dano, mais alvos, mais duração). Se a magia não tem esse trecho, subir o espaço só serve para contar como nível maior (por exemplo, contra Contramágica).',
      en: 'You can put a spell into a slot **higher** than its level. It counts as a spell of that level and, if the description has a "Using a Higher-Level Spell Slot" entry, it gets stronger (more damage, more targets, longer duration). If the spell lacks that entry, upcasting only makes it count as a higher level (for example, against Counterspell).',
    },
    example: {
      pt: 'Kael lança Mísseis Mágicos num espaço de nível 3 em vez de nível 1: ganha 2 dardos a mais, 5 no total, cada um 1d4 + 1. Rola 2, 4, 1, 3, 3 → 13 + 5 = 18 de dano.',
      en: 'Kael casts Magic Missile with a level 3 slot instead of level 1: he gets 2 extra darts, 5 total, each 1d4 + 1. He rolls 2, 4, 1, 3, 3 → 13 + 5 = 18 damage.',
    },
    srd: {
      text: 'When a spellcaster casts a spell using a slot that is of a higher level than the spell, the spell takes on the higher level for that casting.',
      ref: 'SRD 5.2.1 — Spells (Using a Higher-Level Spell Slot)',
    },
    keywords: 'nível superior nivel acima upcast upcasting subir espaço maior higher level slot aumentar magia',
    related: ['espacos-de-magia', 'truques', 'rituais', 'conjurar-magia'],
  },
  {
    id: 'truques',
    aliases: ['cantrips'],
    cat: 'magic',
    title: { pt: 'Truques', en: 'Cantrips' },
    simple: {
      pt: 'Truques são magias de **nível 0**: você lança quantas vezes quiser, **sem gastar espaço**. Os de dano ficam mais fortes conforme o **nível do personagem** (não o da classe): normalmente ganham mais um dado nos níveis 5, 11 e 17. Eles não podem ser "subidos" com espaços maiores.',
      en: 'Cantrips are **level 0** spells: cast them as often as you like, **without spending slots**. Damage cantrips grow with your **character level** (not class level): usually one more die at levels 5, 11 and 17. They can\'t be upcast with higher slots.',
    },
    example: {
      pt: 'Brunna, feiticeira de nível 5, lança Raio de Fogo: rola ataque d20 + 7 = 19 contra CA 14 → acerta. Como tem nível 5, o dano é 2d10 em vez de 1d10: 6 + 8 = 14 de fogo.',
      en: 'Brunna, a level 5 sorcerer, casts Fire Bolt: attack d20 + 7 = 19 vs AC 14 → hit. Being level 5, the damage is 2d10 instead of 1d10: 6 + 8 = 14 fire.',
    },
    sheet: {
      pt: 'Aba Magias: os truques aparecem separados das magias com nível e não têm espaço para marcar.',
      en: 'Spells tab: cantrips are listed apart from leveled spells and have no slot to mark.',
    },
    keywords: 'truque truques cantrip cantrips nível 0 nivel zero à vontade sem espaço at will escala dano 5 11 17',
    related: ['espacos-de-magia', 'conjurar-magia', 'cd-e-ataque-de-magia', 'nivel-e-experiencia'],
  },
  {
    id: 'magias-preparadas',
    aliases: ['prepared-spells', 'known-spells'],
    cat: 'magic',
    title: { pt: 'Magias preparadas', en: 'Prepared spells' },
    simple: {
      pt: 'Você só consegue lançar magias de nível 1+ que estão na sua **lista de preparadas**. A tabela da classe diz quantas você pode ter. Quando você pode trocar muda por classe: clérigo, druida e mago trocam **quantas quiserem** após um Descanso Longo; paladino e patrulheiro trocam **uma** após o Descanso Longo; bardo, feiticeiro e bruxo trocam **uma** ao subir de nível. Magias "sempre preparadas" (de subclasse, por exemplo) não contam no limite.',
      en: 'You can only cast level 1+ spells that are on your **prepared list**. Your class table says how many you get. When you can swap depends on the class: clerics, druids and wizards change **any number** after a Long Rest; paladins and rangers change **one** after a Long Rest; bards, sorcerers and warlocks change **one** when they gain a level. "Always prepared" spells (from a subclass, for example) don\'t count against the limit.',
    },
    example: {
      pt: 'Tordek, clérigo de nível 3 com Sabedoria +3, prepara 6 magias. Sabendo que vai enfrentar mortos-vivos amanhã, após o Descanso Longo ele troca Bênção por Proteção contra o Bem e o Mal.',
      en: 'Tordek, a level 3 cleric with Wisdom +3, prepares 6 spells. Knowing he faces undead tomorrow, after his Long Rest he swaps Bless for Protection from Evil and Good.',
    },
    sheet: {
      pt: 'Aba Magias: marque quais magias estão preparadas; o contador mostra quantas você ainda pode preparar.',
      en: 'Spells tab: mark which spells are prepared; the counter shows how many you can still prepare.',
    },
    versions: {
      pt: 'Em 2014 bardo, feiticeiro, bruxo e patrulheiro tinham "magias conhecidas" (lista fixa trocada só ao subir de nível) e o número de preparadas de clérigo/druida/mago/paladino era atributo + nível. Em 2024 todas as classes preparam magias e o número vem da tabela da classe.',
      en: 'In 2014 bards, sorcerers, warlocks and rangers had "spells known" (a fixed list changed only on level up), and clerics/druids/wizards/paladins prepared ability modifier + level. In 2024 every class prepares spells and the number comes from the class table.',
    },
    keywords: 'preparar preparadas preparada conhecidas magias conhecidas trocar lista prepared spells known spells swap change spellbook',
    related: ['conjurar-magia', 'rituais', 'descanso-longo', 'nivel-e-experiencia', 'classe-e-subclasse'],
  },
  {
    id: 'rituais',
    aliases: ['rituals', 'ritual-casting'],
    cat: 'magic',
    title: { pt: 'Rituais', en: 'Rituals' },
    simple: {
      pt: 'Magias com a marca **Ritual** podem ser lançadas de um jeito lento: leva **10 minutos a mais** que o normal, mas **não gasta espaço de magia**. Você precisa ter a magia preparada. Como não usa espaço, a versão ritual é sempre do nível base da magia. Ótimo fora de combate: Detectar Magia, Identificar, Alarme.',
      en: 'Spells with the **Ritual** tag can be cast the slow way: it takes **10 minutes longer** than normal but **spends no spell slot**. You must have the spell prepared. Since no slot is used, the ritual version is always the spell\'s base level. Great outside combat: Detect Magic, Identify, Alarm.',
    },
    example: {
      pt: 'O grupo acha um anel estranho. Mirela tem Identificar preparada: em vez de gastar um espaço de nível 1, lança como ritual — 1 minuto + 10 minutos = 11 minutos depois ela sabe que é um Anel de Proteção, e segue com todos os espaços.',
      en: 'The party finds an odd ring. Mirela has Identify prepared: instead of spending a level 1 slot, she casts it as a ritual — 1 minute + 10 minutes = 11 minutes later she knows it\'s a Ring of Protection, with all her slots intact.',
    },
    sheet: {
      pt: 'Aba Magias: magias que podem ser ritual têm a marca "R".',
      en: 'Spells tab: spells that can be rituals show the "R" tag.',
    },
    versions: {
      pt: 'Em 2014 clérigos e druidas também precisavam da magia preparada, mas o mago podia fazer o ritual direto do grimório sem prepará-la, e o bardo só se a conhecesse. Em 2024 a regra geral exige a magia preparada; o mago mantém o ritual direto do livro por uma característica própria.',
      en: 'In 2014 clerics and druids also needed the spell prepared, but wizards could ritual-cast straight from the spellbook without preparing it. In 2024 the general rule requires the spell prepared; wizards keep casting rituals from the book through a class feature.',
    },
    srd: {
      text: 'The Ritual version of a spell takes 10 minutes longer to cast than normal. It also doesn’t expend a spell slot, which means the ritual version of a spell can’t be cast at a higher level.',
      ref: 'SRD 5.2.1 — Rules Glossary (Ritual)',
    },
    keywords: 'ritual rituais conjurar como ritual sem espaço 10 minutos ritual casting tag detect magic identify detectar magia identificar',
    related: ['espacos-de-magia', 'tempo-de-conjuracao', 'magias-preparadas', 'concentracao'],
  },
  {
    id: 'concentracao',
    aliases: ['concentration'],
    cat: 'magic',
    title: { pt: 'Concentração', en: 'Concentration' },
    simple: {
      pt: 'Algumas magias só duram enquanto você mantém a **concentração**, e você só pode se concentrar em **uma coisa por vez**: começar outra magia de concentração encerra a primeira. Ao **sofrer dano**, faça uma **salvaguarda de Constituição** com CD 10 ou metade do dano (o que for maior, até CD 30); se falhar, a magia acaba. Ficar Incapacitado ou morrer também quebra a concentração. Você pode largar a concentração quando quiser.',
      en: 'Some spells only last while you keep **Concentration**, and you can concentrate on **one thing at a time**: starting another Concentration spell ends the first. When you **take damage**, make a **Constitution saving throw** with DC 10 or half the damage (whichever is higher, up to DC 30); on a failure, the spell ends. Being Incapacitated or dying also breaks it. You can drop Concentration at any time.',
    },
    example: {
      pt: 'Lia mantém Bênção no grupo quando um orc a acerta com 22 de dano. CD = metade de 22 = 11 (maior que 10). Ela rola d20 + 2 (Con) = 9 → falha, e a Bênção some. Se fossem 8 de dano, a CD seria 10.',
      en: 'Lia is keeping Bless on the party when an orc hits her for 22 damage. DC = half of 22 = 11 (higher than 10). She rolls d20 + 2 (Con) = 9 → fail, and Bless ends. With 8 damage, the DC would be 10.',
    },
    sheet: {
      pt: 'Aba Magias: magias de concentração têm a marca "C". Anote a magia ativa em Condições e efeitos (aba Jogar) para não esquecer.',
      en: 'Spells tab: Concentration spells show the "C" tag. Add the active spell under Conditions & effects (Play tab) so you don\'t forget it.',
    },
    versions: {
      pt: 'A regra é praticamente a mesma em 2014; 2024 deixa explícito o limite máximo de CD 30 e que ficar Incapacitado encerra a concentração.',
      en: 'The rule is essentially the same in 2014; 2024 spells out the DC cap of 30 and that being Incapacitated ends Concentration.',
    },
    srd: {
      text: 'If you take damage, you must succeed on a Constitution saving throw to maintain Concentration. The DC equals 10 or half the damage taken (round down), whichever number is higher, up to a maximum DC of 30.',
      ref: 'SRD 5.2.1 — Rules Glossary (Concentration)',
    },
    keywords: 'concentração concentracao concentrar manter magia quebrar perder salvaguarda constituição con save cd 10 metade dano concentration check',
    related: ['salvaguarda', 'incapacitado', 'jogada-de-dano', 'tempo-de-conjuracao', 'combinar-efeitos'],
  },
  {
    id: 'componentes',
    aliases: ['spell-components', 'components'],
    cat: 'magic',
    title: { pt: 'Componentes (V, S, M)', en: 'Components (V, S, M)' },
    simple: {
      pt: 'Cada magia pede componentes. **V (verbal)**: falar em voz normal — amordaçado ou em silêncio mágico, não dá. **S (somático)**: gestos com pelo menos uma mão livre. **M (material)**: um objeto específico; se ele não tem custo e não é consumido, uma **bolsa de componentes** ou um **foco de conjuração** substitui. A mesma mão pode fazer o S e segurar o M. Sem algum componente, a magia não sai.',
      en: 'Each spell lists components. **V (verbal)**: speak in a normal voice — gagged or in magical silence, you can\'t. **S (somatic)**: gestures with at least one free hand. **M (material)**: a specific item; if it has no cost and isn\'t consumed, a **component pouch** or **spellcasting focus** can stand in. The same hand can do S and handle M. Missing a component, the spell fails to happen.',
    },
    example: {
      pt: 'Kael, guerreiro arcano, segura espada e escudo. No turno dele, para lançar Mãos Flamejantes (V, S) precisa de uma mão livre: embainha a espada (interação grátis com objeto), gesticula e lança. Já Revivificar (M: diamante de 300 PO, consumido) exige o diamante de verdade; foco não serve.',
      en: 'Kael, an eldritch knight, holds sword and shield. On his turn, to cast Burning Hands (V, S) he needs a free hand: he sheathes the sword (free object interaction), gestures and casts. Revivify (M: 300 GP diamond, consumed) needs the real diamond; a focus won\'t do.',
    },
    srd: {
      text: 'If the spellcaster can’t provide one or more of a spell’s components, the spellcaster can’t cast the spell.',
      ref: 'SRD 5.2.1 — Spells (Components)',
    },
    keywords: 'componentes componente verbal somático somatico material V S M foco arcano bolsa de componentes mão livre components focus pouch gagged silêncio',
    related: ['conjurar-magia', 'interagir-com-objeto', 'conjurar-de-armadura', 'acao-esconder'],
  },
  {
    id: 'tempo-de-conjuracao',
    aliases: ['casting-time', 'one-spell-slot-per-turn'],
    cat: 'magic',
    title: { pt: 'Tempo de conjuração', en: 'Casting time' },
    simple: {
      pt: 'A maioria das magias usa a **ação Magia**; outras usam **ação bônus**, **reação** (com um gatilho, como "quando for atingido") ou minutos/horas. Regra importante: **só um espaço de magia por turno** — se lançou uma magia com espaço como ação bônus, a ação do mesmo turno só pode ser um truque (ou outra coisa). Magias de 1 minuto ou mais exigem a ação Magia a cada turno e concentração até terminar.',
      en: 'Most spells use the **Magic action**; others use a **Bonus Action**, a **Reaction** (with a trigger like "when you are hit") or minutes/hours. Key rule: **only one spell slot per turn** — if you cast a slotted spell as a Bonus Action, your action that turn can only be a cantrip (or something else). Spells of 1 minute or more require the Magic action each turn and Concentration until done.',
    },
    example: {
      pt: 'Lia lança Palavra Curativa (ação bônus, espaço de nível 1) no amigo caído. Com a ação, ela não pode lançar Raio Guia (espaço de nível 1), mas pode usar o truque Chama Sagrada: o alvo faz salvaguarda de Destreza contra CD 13.',
      en: 'Lia casts Healing Word (Bonus Action, level 1 slot) on her fallen friend. With her action she can\'t cast Guiding Bolt (level 1 slot), but she can use the cantrip Sacred Flame: the target makes a Dex save against DC 13.',
    },
    versions: {
      pt: 'Em 2014 a regra era outra: se você lançasse qualquer magia como ação bônus, a única outra magia do turno podia ser um truque de 1 ação. Em 2024 o limite é de um espaço de magia por turno (dois truques no mesmo turno são permitidos).',
      en: 'In 2014 the rule was different: if you cast any spell as a Bonus Action, the only other spell that turn could be a cantrip with a casting time of 1 action. In 2024 the limit is one spell slot per turn (two cantrips in a turn are allowed).',
    },
    srd: {
      text: 'On a turn, you can expend only one spell slot to cast a spell. This rule means you can’t, for example, cast a spell with a spell slot using the Magic action and another one using a Bonus Action on the same turn.',
      ref: 'SRD 5.2.1 — Spells (Casting Time)',
    },
    keywords: 'tempo de conjuração conjuracao ação bônus bonus reação reaction uma magia por turno um espaço por turno casting time bonus action spell two spells',
    related: ['acao-magia', 'acao-bonus', 'reacao', 'rituais', 'concentracao'],
  },
  {
    id: 'alcance-e-alvos',
    aliases: ['spell-range-targets', 'range-and-targets'],
    cat: 'magic',
    title: { pt: 'Alcance e alvos', en: 'Range and targets' },
    simple: {
      pt: 'O **alcance** diz até onde a magia pode começar: uma distância, **toque** (alguém ao alcance da sua mão) ou **pessoal** (em você ou saindo de você). Para mirar algo, você precisa de um **caminho livre**: alvo atrás de **cobertura total** não pode ser escolhido. Se a magia diz "uma criatura à sua escolha", você pode escolher a si mesmo. Gastou o espaço num alvo inválido? O espaço se perde mesmo assim.',
      en: '**Range** tells where the spell can start: a distance, **Touch** (someone within your reach) or **Self** (on you or coming from you). To target something you need a **clear path**: a target behind **Total Cover** can\'t be chosen. If the spell says "a creature of your choice", you can pick yourself. Spent a slot on an invalid target? The slot is still gone.',
    },
    example: {
      pt: 'Brunna quer lançar Raio de Fogo (alcance 36 m) num arqueiro a 30 m, mas ele está atrás de uma parede sem janelas (cobertura total). Ela anda até ver o arqueiro — agora com meia cobertura (+2 na CA) — e ataca.',
      en: 'Brunna wants to cast Fire Bolt (range 120 ft) at an archer 100 ft away, but he\'s behind a solid wall (Total Cover). She moves until she can see him — now with Half Cover (+2 AC) — and attacks.',
    },
    keywords: 'alcance alvo alvos toque pessoal distância linha de visão caminho livre range target touch self line of sight clear path',
    related: ['cobertura', 'areas-de-efeito', 'cd-e-ataque-de-magia', 'ataque-a-distancia'],
  },
  {
    id: 'areas-de-efeito',
    aliases: ['areas-of-effect', 'aoe'],
    cat: 'magic',
    title: { pt: 'Áreas de efeito', en: 'Areas of effect' },
    simple: {
      pt: 'Algumas magias atingem uma **área** em vez de alvos escolhidos: **cone**, **cubo**, **cilindro**, **linha**, **esfera** ou **emanação** (que sai de você e se move com você). Todos que estiverem na área são afetados — inclusive aliados, se você não tomar cuidado. A área parte de um **ponto de origem**; lugares separados desse ponto por **cobertura total** ficam de fora.',
      en: 'Some spells hit an **area** instead of chosen targets: **Cone**, **Cube**, **Cylinder**, **Line**, **Sphere** or **Emanation** (which comes out of you and moves with you). Everyone in the area is affected — allies too, if you\'re careless. The area spreads from a **point of origin**; spots cut off from it by **Total Cover** are left out.',
    },
    example: {
      pt: 'Mirela lança Bola de Fogo (esfera de 6 m de raio) no meio de 4 goblins. Cada um faz salvaguarda de Destreza contra CD 14: três falham e levam 8d6 = 28 de fogo; um passa (d20 + 2 = 16) e leva metade, 14. Tordek, a 4,5 m do centro, também estava na área...',
      en: 'Mirela casts Fireball (20-foot-radius Sphere) in the middle of 4 goblins. Each makes a Dex save vs DC 14: three fail and take 8d6 = 28 fire; one succeeds (d20 + 2 = 16) and takes half, 14. Tordek, 15 ft from the center, was in the area too...',
    },
    versions: {
      pt: 'A "emanação" é um nome de 2024; em 2014 essas magias costumavam dizer "raio de X a partir de você". No resto, a lógica é a mesma.',
      en: '"Emanation" is a 2024 term; in 2014 such spells usually read "radius of X centered on you". The general logic is otherwise the same.',
    },
    srd: {
      text: 'If all straight lines extending from the point of origin to a location in the area of effect are blocked, that location isn’t included in the area of effect. To block a line, an obstruction must provide Total Cover.',
      ref: 'SRD 5.2.1 — Rules Glossary (Area of Effect)',
    },
    keywords: 'área de efeito area aoe cone cubo cilindro linha esfera emanação raio explosão bola de fogo area of effect sphere cube cylinder line emanation radius fireball',
    related: ['alcance-e-alvos', 'salvaguarda', 'cobertura', 'cd-e-ataque-de-magia'],
  },
  {
    id: 'cd-e-ataque-de-magia',
    aliases: ['spell-save-dc', 'spell-attack'],
    cat: 'magic',
    title: { pt: 'CD de magia e ataque mágico', en: 'Spell save DC and spell attack' },
    simple: {
      pt: 'Magias funcionam de dois jeitos. Ou o alvo faz uma **salvaguarda** contra a sua **CD de magia = 8 + modificador do atributo de conjuração + bônus de proficiência**, ou você faz uma **jogada de ataque mágico = d20 + modificador do atributo + bônus de proficiência** contra a CA. O atributo depende da classe: Inteligência (mago, artífice), Sabedoria (clérigo, druida, patrulheiro) ou Carisma (bardo, bruxo, feiticeiro, paladino).',
      en: 'Spells work one of two ways. Either the target makes a **saving throw** against your **spell save DC = 8 + spellcasting ability modifier + Proficiency Bonus**, or you make a **spell attack = d20 + ability modifier + Proficiency Bonus** against AC. The ability depends on class: Intelligence (wizard, artificer), Wisdom (cleric, druid, ranger) or Charisma (bard, warlock, sorcerer, paladin).',
    },
    example: {
      pt: 'Zé do Machado virou bruxo: Carisma +3 e proficiência +2. CD = 8 + 3 + 2 = 13; ataque mágico = +5. Ele lança Rajada Mística: d20 + 5 = 16 contra CA 13 → acerta. Depois lança Enfeitiçar Pessoa: o guarda rola Sabedoria d20 + 1 = 11 < 13 → fica encantado.',
      en: 'Zé do Machado became a warlock: Charisma +3 and proficiency +2. DC = 8 + 3 + 2 = 13; spell attack = +5. He casts Eldritch Blast: d20 + 5 = 16 vs AC 13 → hit. Then he casts Charm Person: the guard rolls Wisdom d20 + 1 = 11 < 13 → charmed.',
    },
    sheet: {
      pt: 'Aba Magias, no topo: Atributo, CD de Magia e Bônus de Ataque já calculados.',
      en: 'Spells tab, at the top: Ability, Spell Save DC and Spell Attack bonus, already calculated.',
    },
    srd: {
      text: 'Spell save DC = 8 + your spellcasting ability modifier + your Proficiency Bonus',
      ref: 'SRD 5.2.1 — Spells (Saving Throws)',
    },
    keywords: 'cd de magia cd da magia dificuldade ataque mágico ataque de magia atributo de conjuração spell save dc spell attack bonus spellcasting ability modifier',
    related: ['salvaguarda', 'jogada-de-ataque', 'classe-de-dificuldade', 'bonus-de-proficiencia', 'modificador-de-atributo'],
  },
  {
    id: 'conjurar-de-armadura',
    aliases: ['casting-in-armor'],
    cat: 'magic',
    title: { pt: 'Conjurar usando armadura', en: 'Casting in armor' },
    simple: {
      pt: 'Você só consegue conjurar vestindo uma armadura se tiver **treinamento (proficiência)** com ela. Sem treinamento, a armadura atrapalha demais e você simplesmente **não pode lançar magias**. Escudo também conta como armadura para isso. Um mago que coloca uma cota de malha sem saber usá-la perde a magia até tirá-la.',
      en: 'You can only cast spells while wearing armor you have **training (proficiency)** with. Without training, it hampers you too much and you **can\'t cast spells** at all. A shield counts as armor for this too. A wizard who puts on chain mail without training loses spellcasting until it comes off.',
    },
    example: {
      pt: 'Mirela (sem proficiência em armaduras) veste um peitoral achado no covil: CA sobe de 12 para 16, mas no turno seguinte ela tenta lançar Mísseis Mágicos e não consegue. Ela precisa de 1 minuto para tirar a armadura média antes de voltar a conjurar.',
      en: 'Mirela (no armor proficiency) dons a breastplate found in the lair: her AC rises from 12 to 16, but next turn she tries to cast Magic Missile and can\'t. She needs 1 minute to doff the medium armor before casting again.',
    },
    srd: {
      text: 'You must have training with any armor you are wearing to cast spells while wearing it. You are otherwise too hampered by the armor for spellcasting.',
      ref: 'SRD 5.2.1 — Spells (Casting in Armor)',
    },
    keywords: 'armadura conjurar magia com armadura proficiência treinamento escudo mago de armadura casting in armor armor training proficiency',
    related: ['armaduras-e-escudos', 'componentes', 'talentos', 'multiclasse'],
  },
  {
    id: 'combinar-efeitos',
    aliases: ['combining-spell-effects', 'stacking'],
    cat: 'magic',
    title: { pt: 'Combinar efeitos mágicos', en: 'Combining magical effects' },
    simple: {
      pt: 'Magias **diferentes** somam seus efeitos normalmente. Mas a **mesma magia** lançada duas vezes no mesmo alvo **não acumula**: vale só o efeito mais forte (ou o mais recente, se forem iguais) enquanto as durações se sobrepõem. Duas Bênçãos não dão 2d4; Bênção + Escudo da Fé funcionam juntas.',
      en: '**Different** spells add their effects together. But the **same spell** cast twice on one target **doesn\'t stack**: only the strongest effect (or the most recent, if equal) applies while the durations overlap. Two Bless spells don\'t give 2d4; Bless + Shield of Faith work together.',
    },
    example: {
      pt: 'Lia e Tordek lançam Bênção em Kael. Ele ataca com d20 + 5 + 1d4 (só uma vez) = 12 + 5 + 3 = 20. Se Tordek tivesse lançado Escudo da Fé em vez disso, Kael teria Bênção no ataque e +2 na CA ao mesmo tempo.',
      en: 'Lia and Tordek both cast Bless on Kael. He attacks with d20 + 5 + 1d4 (only once) = 12 + 5 + 3 = 20. Had Tordek cast Shield of Faith instead, Kael would have Bless on attacks and +2 AC at the same time.',
    },
    srd: {
      text: 'The effects of different spells add together while their durations overlap. In contrast, the effects of the same spell cast multiple times don’t combine.',
      ref: 'SRD 5.2.1 — Spells (Combining Spell Effects)',
    },
    keywords: 'combinar acumular somar empilhar mesma magia duas vezes stack stacking combine spell effects overlap bless bênção',
    related: ['concentracao', 'conjurar-magia', 'vantagem-desvantagem', 'condicoes'],
  },
];
