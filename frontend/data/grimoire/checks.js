/* Grimório — Testes e perícias. Explicações originais; `srd` = citação literal do SRD 5.2.1 (CC-BY 4.0). */
export default [
  {
    id: 'teste-d20',
    aliases: ['d20-test', 'd20-tests'],
    cat: 'checks',
    title: { pt: 'Teste de d20', en: 'D20 Test' },
    simple: {
      pt: 'Quase tudo que pode dar errado no jogo se resolve assim: role **1d20, some seus modificadores** e compare com um número-alvo. Empatou ou passou, deu certo. Existem três tipos: **teste de atributo**, **salvaguarda** e **jogada de ataque**. O alvo se chama CD nos testes e salvaguardas, e CA nos ataques.',
      en: 'Almost anything that might fail in the game works this way: roll **1d20, add your modifiers** and compare to a target number. Meet or beat it and you succeed. There are three kinds: **ability checks**, **saving throws** and **attack rolls**. The target is called a DC for checks and saves, and AC for attacks.',
    },
    example: {
      pt: 'Brunna tenta arrombar um baú trancado: d20 = 12, + 3 (Força) + 2 (proficiência em Atletismo) = 17. A CD era 15 → o baú abre.',
      en: 'Brunna tries to force open a locked chest: d20 = 12, + 3 (Strength) + 2 (Athletics proficiency) = 17. The DC was 15 → the chest opens.',
    },
    sheet: {
      pt: 'Toque em qualquer atributo, perícia, salvaguarda ou ataque na ficha para rolar o d20 já com o bônus somado no rolador de dados.',
      en: 'Tap any ability, skill, saving throw or attack on the sheet to roll the d20 with the bonus already added in the dice roller.',
    },
    versions: {
      pt: 'O nome "Teste de d20" é de 2024, mas a mecânica é a mesma de 2014. Nas duas versões, o 20 natural acerta automaticamente e o 1 natural erra automaticamente só em jogadas de ataque — não em testes de atributo nem salvaguardas.',
      en: 'The name "D20 Test" is from 2024, but the mechanic is the same as in 2014. In both, a natural 20 automatically hits and a natural 1 automatically misses only on attack rolls — not on ability checks or saving throws.',
    },
    srd: {
      text: 'If the total of the d20 and its modifiers equals or exceeds the target number, the D20 Test succeeds. Otherwise, it fails.',
      ref: 'SRD 5.2.1 — Playing the Game (D20 Tests)',
    },
    keywords: 'teste d20 rolar dado rolagem d20 test roll die target number numero alvo cd ca sucesso falha success fail nat 20 natural 1',
    related: ['teste-de-atributo', 'salvaguarda', 'jogada-de-ataque', 'vantagem-desvantagem', 'classe-de-dificuldade', 'modificador-de-atributo'],
  },
  {
    id: 'atributos',
    aliases: ['ability-scores', 'abilities'],
    cat: 'checks',
    title: { pt: 'Os seis atributos', en: 'The six ability scores' },
    simple: {
      pt: 'Todo personagem é descrito por seis números: **Força** (músculos), **Destreza** (agilidade e reflexos), **Constituição** (saúde e fôlego), **Inteligência** (raciocínio e memória), **Sabedoria** (percepção e intuição) e **Carisma** (presença e lábia). Um valor 10 é a média de uma pessoa comum. O que você usa nos dados é o **modificador** que sai desse valor.',
      en: 'Every character is described by six numbers: **Strength** (muscle), **Dexterity** (agility and reflexes), **Constitution** (health and stamina), **Intelligence** (reasoning and memory), **Wisdom** (awareness and intuition) and **Charisma** (presence and force of personality). A score of 10 is an average person. What you actually add to dice is the **modifier** derived from that score.',
    },
    example: {
      pt: 'Kael tem Destreza 16 (+3) e Força 8 (−1). Para se equilibrar numa viga ele soma +3; para empurrar uma pedra enorme, soma −1.',
      en: 'Kael has Dexterity 16 (+3) and Strength 8 (−1). To balance on a beam he adds +3; to push a huge boulder, he adds −1.',
    },
    sheet: {
      pt: 'Aba Jogar e aba Atributos: as seis caixas mostram valor e modificador; toque em uma para rolar um teste daquele atributo.',
      en: 'Play and Stats tabs: the six boxes show score and modifier; tap one to roll a check with that ability.',
    },
    keywords: 'atributos forca destreza constituicao inteligencia sabedoria carisma for des con int sab car ability scores strength dexterity constitution intelligence wisdom charisma str dex con int wis cha',
    related: ['modificador-de-atributo', 'teste-de-atributo', 'gerar-atributos', 'aumento-de-atributo', 'salvaguarda'],
  },
  {
    id: 'modificador-de-atributo',
    aliases: ['ability-modifier', 'ability-modifiers'],
    cat: 'checks',
    title: { pt: 'Modificador de atributo', en: 'Ability modifier' },
    simple: {
      pt: 'O modificador é o número que você realmente soma nos dados. A conta é simples: **(valor − 10) ÷ 2, arredondando para baixo**. Assim, 10–11 dá +0, 12–13 dá +1, 14–15 dá +2, e 8–9 dá −1. Ele entra em testes, salvaguardas, ataques, dano, CA e muito mais.',
      en: 'The modifier is the number you actually add to your rolls. The math is simple: **(score − 10) ÷ 2, rounded down**. So 10–11 gives +0, 12–13 gives +1, 14–15 gives +2, and 8–9 gives −1. It shows up in checks, saves, attacks, damage, AC and more.',
    },
    example: {
      pt: 'Mirela tem Sabedoria 15: (15 − 10) ÷ 2 = 2,5 → arredonda para baixo = +2. Com Sabedoria 7: (7 − 10) ÷ 2 = −1,5 → −2.',
      en: 'Mirela has Wisdom 15: (15 − 10) ÷ 2 = 2.5 → round down = +2. With Wisdom 7: (7 − 10) ÷ 2 = −1.5 → −2.',
    },
    sheet: {
      pt: 'O app calcula sozinho: o modificador aparece em destaque em cada caixa de atributo.',
      en: 'The app does the math: the modifier is highlighted in each ability box.',
    },
    keywords: 'modificador mod bonus de atributo calcular arredondar para baixo ability modifier mod score round down +2 +3 tabela',
    related: ['atributos', 'teste-d20', 'bonus-de-proficiencia', 'teste-de-atributo'],
  },
  {
    id: 'bonus-de-proficiencia',
    aliases: ['proficiency-bonus', 'proficiency'],
    cat: 'checks',
    title: { pt: 'Bônus de proficiência', en: 'Proficiency Bonus' },
    simple: {
      pt: 'É o bônus de "treinamento". Quando você é **proficiente** no que está usando — uma perícia, uma salvaguarda, uma arma ou ferramenta — soma esse bônus no d20. Ele começa em **+2** e cresce com o nível do personagem (não da classe): +3 no 5º, +4 no 9º, +5 no 13º e +6 no 17º. Nunca se soma o bônus duas vezes na mesma rolagem.',
      en: 'This is your "training" bonus. When you are **proficient** in what you are using — a skill, a saving throw, a weapon or a tool — you add it to the d20. It starts at **+2** and grows with total character level: +3 at 5th, +4 at 9th, +5 at 13th and +6 at 17th. You never add it twice to the same roll.',
    },
    example: {
      pt: 'Tordek (nível 5, bônus +3) ataca com o machado, arma em que é proficiente: d20 + 3 (For) + 3 (proficiência). Se pegasse uma arma sem proficiência, somaria só o +3 da Força.',
      en: 'Tordek (level 5, bonus +3) attacks with his axe, a weapon he is proficient with: d20 + 3 (Str) + 3 (proficiency). With a weapon he is not proficient with, he would add only the +3 from Strength.',
    },
    sheet: {
      pt: 'Aba Jogar → caixa "Prof." mostra seu bônus atual; perícias e salvaguardas marcadas na aba Atributos já o incluem.',
      en: 'Play tab → the "Prof." box shows your current bonus; skills and saves marked in the Stats tab already include it.',
    },
    srd: {
      text: 'Your Proficiency Bonus can’t be added to a die roll or another number more than once.',
      ref: 'SRD 5.2.1 — Playing the Game (Proficiency)',
    },
    keywords: 'bonus de proficiencia proficiente treinado prof pb proficiency bonus proficient trained +2 +3 nivel level',
    related: ['pericias', 'especializacao', 'salvaguarda', 'jogada-de-ataque', 'nivel-e-experiencia', 'ferramentas'],
  },
  {
    id: 'vantagem-desvantagem',
    aliases: ['advantage-disadvantage', 'advantage', 'disadvantage'],
    cat: 'checks',
    title: { pt: 'Vantagem e desvantagem', en: 'Advantage and Disadvantage' },
    simple: {
      pt: 'Com **vantagem**, você rola **dois d20 e fica com o maior**; com **desvantagem**, rola dois e fica com o **menor**. Não acumula: três fontes de vantagem ainda são só dois dados. E se você tem vantagem e desvantagem ao mesmo tempo, **uma cancela a outra** — rola um d20 normal, não importa quantas fontes de cada lado.',
      en: 'With **Advantage**, you roll **two d20s and keep the higher**; with **Disadvantage**, you roll two and keep the **lower**. It doesn\'t stack: three sources of Advantage are still just two dice. And if you have both Advantage and Disadvantage, **they cancel out** — roll one normal d20, no matter how many sources are on each side.',
    },
    example: {
      pt: 'Lia ataca um orc caído (Prono) de perto: vantagem. Rola 6 e 17 → usa 17, + 5 = 22 contra CA 13 → acerta. Se ela também estivesse Envenenada (desvantagem), rolaria um d20 só.',
      en: 'Lia attacks a prone orc from up close: Advantage. She rolls 6 and 17 → uses 17, + 5 = 22 vs AC 13 → hit. If she were also Poisoned (Disadvantage), she would roll a single d20.',
    },
    sheet: {
      pt: 'O rolador de dados flutuante tem os modos vantagem e desvantagem para o d20.',
      en: 'The floating dice roller has Advantage and Disadvantage modes for the d20.',
    },
    srd: {
      text: 'If circumstances cause a roll to have both Advantage and Disadvantage, the roll has neither of them, and you roll one d20.',
      ref: 'SRD 5.2.1 — Playing the Game (Advantage/Disadvantage)',
    },
    keywords: 'vantagem desvantagem advantage disadvantage adv dis 2d20 dois dados rolar dois maior menor cancelar cancela acumula stack',
    related: ['teste-d20', 'inspiracao-heroica', 'acao-ajudar', 'prono', 'cego', 'valor-passivo'],
  },
  {
    id: 'classe-de-dificuldade',
    aliases: ['difficulty-class', 'dc'],
    cat: 'checks',
    title: { pt: 'Classe de Dificuldade (CD)', en: 'Difficulty Class (DC)' },
    simple: {
      pt: 'A **CD** é o número que você precisa alcançar num teste de atributo ou salvaguarda. Quem define é o mestre (ou a regra, magia ou monstro). Referência rápida: **5 muito fácil, 10 fácil, 15 médio, 20 difícil, 25 muito difícil, 30 quase impossível**. Se a tarefa não tem chance real de falhar, o mestre nem pede rolagem.',
      en: 'The **DC** is the number you need to reach on an ability check or saving throw. The GM sets it (or the rule, spell or monster does). Quick reference: **5 very easy, 10 easy, 15 medium, 20 hard, 25 very hard, 30 nearly impossible**. If a task has no real chance of failure, the GM won\'t even ask for a roll.',
    },
    example: {
      pt: 'Escalar um muro com boas pedras para apoiar: CD 10. Zé do Machado rola 8 + 4 (Atletismo) = 12 ≥ 10 → sobe. Num muro liso e molhado (CD 20), o mesmo 12 falharia.',
      en: 'Climbing a wall with good handholds: DC 10. Zé do Machado rolls 8 + 4 (Athletics) = 12 ≥ 10 → he climbs. On a slick, wet wall (DC 20), the same 12 would fail.',
    },
    keywords: 'cd classe de dificuldade dificuldade numero alvo dc difficulty class target number facil medio dificil easy medium hard 10 15 20',
    related: ['teste-de-atributo', 'salvaguarda', 'teste-d20', 'cd-e-ataque-de-magia', 'teste-resistido'],
  },
  {
    id: 'teste-de-atributo',
    aliases: ['ability-check', 'ability-checks'],
    cat: 'checks',
    title: { pt: 'Teste de atributo', en: 'Ability check' },
    simple: {
      pt: 'É o teste para **tentar fazer algo** que pode falhar: arrombar uma porta, mentir para um guarda, lembrar uma lenda. Você rola d20 + o modificador do atributo mais adequado, + proficiência se uma perícia ou ferramenta em que você é treinado se aplicar. O mestre escolhe o atributo e a CD. No teste de atributo, 20 natural **não** é sucesso automático.',
      en: 'This is the roll to **attempt something** that might fail: bash a door, lie to a guard, recall a legend. Roll d20 + the most fitting ability modifier, + proficiency if a skill or tool you\'re trained in applies. The GM picks the ability and the DC. On an ability check, a natural 20 is **not** an automatic success.',
    },
    example: {
      pt: 'Thalion tenta lembrar quem ergueu as ruínas: teste de Inteligência (História). d20 = 11 + 1 (Int) + 2 (proficiente) = 14 contra CD 15 → não lembra desta vez.',
      en: 'Thalion tries to recall who built the ruins: Intelligence (History) check. d20 = 11 + 1 (Int) + 2 (proficient) = 14 vs DC 15 → he can\'t remember this time.',
    },
    sheet: {
      pt: 'Toque na caixa do atributo (teste puro) ou na perícia, na aba Atributos, para rolar já somado.',
      en: 'Tap the ability box (plain check) or the skill in the Stats tab to roll with the bonus added.',
    },
    keywords: 'teste de atributo teste de habilidade check ability check teste de pericia rolar forca destreza tentar',
    related: ['pericias', 'classe-de-dificuldade', 'atributos', 'teste-resistido', 'teste-em-grupo', 'ferramentas'],
  },
  {
    id: 'pericias',
    aliases: ['skills', 'skill-proficiency'],
    cat: 'checks',
    title: { pt: 'Perícias', en: 'Skills' },
    simple: {
      pt: 'Perícias são áreas de treino dentro de um atributo, como Furtividade (Destreza) ou Persuasão (Carisma). Se você é **proficiente** na perícia, soma o bônus de proficiência no teste; se não é, ainda pode tentar, só que sem esse bônus. São 18 perícias, e o mestre decide qual se aplica — às vezes com um atributo diferente do usual (ex.: Força + Intimidação).',
      en: 'Skills are areas of training within an ability, like Stealth (Dexterity) or Persuasion (Charisma). If you are **proficient** in the skill, add your Proficiency Bonus to the check; if not, you can still try, just without that bonus. There are 18 skills, and the GM decides which applies — sometimes with an unusual ability (e.g., Strength + Intimidation).',
    },
    example: {
      pt: 'Mirela (Carisma +3, proficiente em Persuasão, bônus +2) convence o taverneiro: d20 = 9 + 3 + 2 = 14 contra CD 12 → ganha um quarto de graça.',
      en: 'Mirela (Charisma +3, proficient in Persuasion, bonus +2) talks the innkeeper around: d20 = 9 + 3 + 2 = 14 vs DC 12 → free room for the night.',
    },
    sheet: {
      pt: 'Aba Atributos: lista das 18 perícias com marcação de proficiência/especialização; toque para rolar.',
      en: 'Stats tab: list of the 18 skills with proficiency/expertise marks; tap to roll.',
    },
    srd: {
      text: 'If a creature is proficient in a skill, the creature applies its Proficiency Bonus to ability checks involving that skill.',
      ref: 'SRD 5.2.1 — Playing the Game (Skill Proficiencies)',
    },
    keywords: 'pericias pericia acrobacia arcanismo atletismo atuacao enganacao furtividade historia intimidacao intuicao investigacao lidar com animais medicina natureza percepcao persuasao prestidigitacao religiao sobrevivencia skills acrobatics arcana athletics deception history insight intimidation investigation medicine nature perception performance persuasion religion sleight of hand stealth survival animal handling',
    related: ['bonus-de-proficiencia', 'especializacao', 'teste-de-atributo', 'valor-passivo', 'ferramentas', 'antecedente'],
  },
  {
    id: 'especializacao',
    aliases: ['expertise'],
    cat: 'checks',
    title: { pt: 'Especialização', en: 'Expertise' },
    simple: {
      pt: 'Especialização é ser **muito** bom numa perícia em que você já é proficiente: o bônus de proficiência entra **dobrado** nos testes dela. Ladinos, bardos e alguns talentos e traços dão isso. Não dá para ter especialização duas vezes na mesma perícia, e o bônus nunca é dobrado mais de uma vez.',
      en: 'Expertise means being **really** good at a skill you\'re already proficient in: your Proficiency Bonus is **doubled** for checks with it. Rogues, Bards and some feats and traits grant it. You can\'t have Expertise twice in the same skill, and the bonus is never doubled more than once.',
    },
    example: {
      pt: 'Lia, ladina nível 3 (proficiência +2, Destreza +4) com especialização em Furtividade: d20 + 4 + 4 = d20 + 8. Sem especialização seria d20 + 6.',
      en: 'Lia, a level 3 Rogue (proficiency +2, Dexterity +4) with Expertise in Stealth: d20 + 4 + 4 = d20 + 8. Without Expertise it would be d20 + 6.',
    },
    sheet: {
      pt: 'Aba Atributos: a perícia com especialização aparece marcada e o bônus já vem dobrado.',
      en: 'Stats tab: the skill with Expertise is marked and the bonus is already doubled.',
    },
    srd: {
      text: 'When you make an ability check with a skill proficiency in which you have Expertise, your Proficiency Bonus is doubled for that check unless the bonus is doubled by another feature.',
      ref: 'SRD 5.2.1 — Rules Glossary (Expertise)',
    },
    keywords: 'especializacao especialista pericia dobrada dobrar proficiencia expertise double proficiency ladino bardo rogue bard',
    related: ['pericias', 'bonus-de-proficiencia', 'teste-de-atributo', 'classe-e-subclasse'],
  },
  {
    id: 'salvaguarda',
    aliases: ['saving-throw', 'save'],
    cat: 'checks',
    title: { pt: 'Salvaguarda (teste de resistência)', en: 'Saving throw' },
    simple: {
      pt: 'A salvaguarda é uma rolagem para **escapar de algo ruim** que está acontecendo com você: uma bola de fogo, um veneno, uma magia tentando controlar sua mente. Você rola d20 + modificador do atributo pedido (+ proficiência se sua classe te treinou nela) contra a CD do efeito. Cada classe dá proficiência em duas salvaguardas. Você pode escolher falhar de propósito.',
      en: 'A saving throw is a roll to **escape something bad** happening to you: a fireball, a poison, a spell trying to take over your mind. Roll d20 + the requested ability modifier (+ proficiency if your class trained you in it) against the effect\'s DC. Each class grants proficiency in two saves. You can choose to fail on purpose.',
    },
    example: {
      pt: 'Um mago inimigo lança Bola de Fogo (CD 15). Kael faz salvaguarda de Destreza: d20 = 10 + 3 = 13 < 15 → falha e recebe o dano inteiro; quem passa recebe metade.',
      en: 'An enemy wizard casts Fireball (DC 15). Kael makes a Dexterity save: d20 = 10 + 3 = 13 < 15 → he fails and takes full damage; those who succeed take half.',
    },
    sheet: {
      pt: 'Aba Atributos: salvaguardas com as proficiências da sua classe marcadas; toque para rolar.',
      en: 'Stats tab: saving throws with your class proficiencies marked; tap to roll.',
    },
    srd: {
      text: 'A saving throw—also called a save—represents an attempt to evade or resist a threat, such as a fiery explosion, a blast of poisonous gas, or a spell trying to invade your mind.',
      ref: 'SRD 5.2.1 — Playing the Game (Saving Throws)',
    },
    keywords: 'salvaguarda teste de resistencia resistencia save saving throw st salvar evitar escapar metade do dano cd da magia',
    related: ['teste-d20', 'classe-de-dificuldade', 'cd-e-ataque-de-magia', 'bonus-de-proficiencia', 'concentracao', 'testes-contra-a-morte'],
  },
  {
    id: 'teste-resistido',
    aliases: ['contest', 'contested-check'],
    cat: 'checks',
    title: { pt: 'Teste resistido (disputa)', en: 'Contest (opposed check)' },
    simple: {
      pt: 'Quando duas criaturas disputam a mesma coisa — cabo de guerra, esconder × procurar — **as duas rolam** e ganha o maior total. Em empate, fica tudo como estava. As regras de 2024 trocaram quase todas as disputas por uma **CD fixa** (ex.: o total da sua Furtividade vira a CD para te acharem), mas o mestre ainda pode usar disputas para situações livres.',
      en: 'When two creatures compete over the same thing — tug-of-war, hiding vs. searching — **both roll** and the higher total wins. On a tie, the situation stays as it was. The 2024 rules replaced most contests with a **fixed DC** (e.g., your Stealth total becomes the DC to find you), but the GM can still use contests for freeform situations.',
    },
    example: {
      pt: 'Tordek e um bandido puxam o mesmo baú: Tordek rola Atletismo 14 + 5 = 19; o bandido, 16 + 2 = 18 → Tordek fica com o baú.',
      en: 'Tordek and a bandit both pull the same chest: Tordek rolls Athletics 14 + 5 = 19; the bandit, 16 + 2 = 18 → Tordek gets the chest.',
    },
    versions: {
      pt: 'Em 2014 as disputas eram regra formal e usadas em agarrar, empurrar e esconder-se (Furtividade × Percepção). Em 2024, agarrar e empurrar usam salvaguarda contra CD fixa, e esconder-se usa CD 15; o SRD 5.2.1 não traz mais a regra de disputa.',
      en: 'In 2014 contests were a formal rule used for grappling, shoving and hiding (Stealth vs. Perception). In 2024, grapple and shove use a save against a fixed DC, and hiding uses DC 15; the SRD 5.2.1 no longer includes a contest rule.',
    },
    keywords: 'teste resistido disputa oposto contestado cabo de guerra contest opposed check contested versus vs empate tie',
    related: ['teste-de-atributo', 'classe-de-dificuldade', 'agarrar', 'empurrar', 'acao-esconder'],
  },
  {
    id: 'valor-passivo',
    aliases: ['passive-perception', 'passive-check'],
    cat: 'checks',
    title: { pt: 'Percepção passiva (valor passivo)', en: 'Passive Perception' },
    simple: {
      pt: 'É o que seu personagem **nota sem estar procurando**. Em vez de rolar, o mestre usa **10 + seu bônus de Percepção**. Vantagem soma +5 e desvantagem tira −5. Serve para perceber emboscadas, armadilhas e criaturas escondidas sem entregar ao grupo que há algo ali.',
      en: 'This is what your character **notices without actively looking**. Instead of rolling, the GM uses **10 + your Perception bonus**. Advantage adds +5 and Disadvantage subtracts 5. It\'s used to spot ambushes, traps and hidden creatures without tipping off the group that something is there.',
    },
    example: {
      pt: 'Brunna tem Percepção +4 → passiva 14. Um goblin escondido tirou 13 em Furtividade: ela o nota. Se estivesse no escuro com desvantagem, a passiva cairia para 9 e ele passaria despercebido.',
      en: 'Brunna has Perception +4 → passive 14. A hidden goblin rolled 13 on Stealth: she notices it. In darkness with Disadvantage, her passive would drop to 9 and it would go unnoticed.',
    },
    sheet: {
      pt: 'Aba Jogar → caixa "Perc. passiva".',
      en: 'Play tab → "Perc. passive" box.',
    },
    srd: {
      text: 'A creature’s Passive Perception equals 10 plus the creature’s Wisdom (Perception) check bonus. If the creature has Advantage on such checks, increase the score by 5. If the creature has Disadvantage on them, decrease the score by 5.',
      ref: 'SRD 5.2.1 — Rules Glossary (Passive Perception)',
    },
    keywords: 'percepcao passiva passivo valor passivo notar perceber emboscada passive perception passive score notice ambush pp 10 +',
    related: ['pericias', 'acao-esconder', 'acao-buscar', 'vantagem-desvantagem', 'luz-e-visao'],
  },
  {
    id: 'teste-em-grupo',
    aliases: ['group-check', 'working-together'],
    cat: 'checks',
    title: { pt: 'Teste em grupo e trabalho em equipe', en: 'Group checks and working together' },
    simple: {
      pt: 'Quando o grupo inteiro faz a mesma coisa (atravessar um pântano, passar escondido por guardas), o mestre pode pedir um **teste em grupo**: todos rolam e, se **pelo menos metade** passar, o grupo todo passa. Já quando uma pessoa faz a tarefa e outra ajuda, use a ação **Ajudar**: quem ajuda dá **vantagem** ao colega.',
      en: 'When the whole party does the same thing (crossing a swamp, sneaking past guards), the GM may call for a **group check**: everyone rolls and, if **at least half** succeed, the whole group succeeds. When one person does the task and another assists, use the **Help** action: the helper gives their ally **Advantage**.',
    },
    example: {
      pt: 'Quatro heróis passam por guardas (CD 12 de Furtividade): 15, 8, 13 e 9. Dois de quatro passaram (metade) → o grupo inteiro passa sem ser visto.',
      en: 'Four heroes sneak past guards (Stealth DC 12): 15, 8, 13 and 9. Two out of four succeeded (half) → the whole group slips by unseen.',
    },
    versions: {
      pt: 'O teste em grupo era regra do SRD 5.1 (2014) e continua como ferramenta do mestre em 2024, mas não aparece no SRD 5.2.1. Em 2024, a ação Ajudar em um teste exige que você seja proficiente na perícia ou ferramenta usada.',
      en: 'The group check was a rule in SRD 5.1 (2014) and remains a GM tool in 2024, but it is not in the SRD 5.2.1. In 2024, the Help action on a check requires you to be proficient in the skill or tool used.',
    },
    keywords: 'teste em grupo grupo todos juntos metade trabalho em equipe cooperar group check working together party half everyone team',
    related: ['acao-ajudar', 'teste-de-atributo', 'vantagem-desvantagem', 'acao-esconder'],
  },
  {
    id: 'inspiracao-heroica',
    aliases: ['heroic-inspiration', 'inspiration'],
    cat: 'checks',
    title: { pt: 'Inspiração heroica', en: 'Heroic Inspiration' },
    simple: {
      pt: 'É um prêmio que o mestre dá quando você faz algo heroico, divertido ou muito fiel ao personagem. Tendo inspiração, você pode gastá-la para **rolar de novo qualquer dado logo depois de rolá-lo**, e fica com o novo resultado. Você só pode ter **uma** por vez; se ganhar outra, pode passá-la a um aliado que não tenha. Humanos ganham uma ao terminar cada descanso longo.',
      en: 'It\'s a reward the GM gives when you do something heroic, fun or true to your character. With it, you can spend it to **reroll any die right after rolling it**, and you must keep the new result. You can only have **one** at a time; if you gain another, you can pass it to an ally who lacks it. Humans gain one whenever they finish a Long Rest.',
    },
    example: {
      pt: 'Thalion rola 4 no ataque decisivo contra o dragão. Ele gasta a inspiração, rola de novo: 16 + 6 = 22 contra CA 19 → acerta.',
      en: 'Thalion rolls a 4 on the crucial attack against the dragon. He spends his inspiration and rerolls: 16 + 6 = 22 vs AC 19 → hit.',
    },
    sheet: {
      pt: 'Barra de ações da ficha → chip "Inspiração" (a estrela acende quando você tem).',
      en: 'Sheet action bar → "Inspiration" chip (the star lights up when you have it).',
    },
    versions: {
      pt: 'Em 2014 se chamava só "Inspiração" e dava **vantagem** em uma rolagem de d20 (ataque, teste ou salvaguarda), decidida antes de rolar. Em 2024 virou "Inspiração heroica": rerrola **qualquer** dado, depois de ver o resultado.',
      en: 'In 2014 it was just "Inspiration" and granted **Advantage** on one d20 roll (attack, check or save), chosen before rolling. In 2024 it became "Heroic Inspiration": reroll **any** die, after seeing the result.',
    },
    srd: {
      text: 'If you have Heroic Inspiration, you can expend it to reroll any die immediately after rolling it, and you must use the new roll.',
      ref: 'SRD 5.2.1 — Playing the Game (Heroic Inspiration)',
    },
    keywords: 'inspiracao heroica inspiracao rerrolar rolar de novo premio heroic inspiration inspiration reroll reward humano human estrela star',
    related: ['vantagem-desvantagem', 'teste-d20', 'especie', 'descanso-longo'],
  },
];
