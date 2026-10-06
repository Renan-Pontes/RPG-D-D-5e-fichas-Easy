// 🎲 Improvisar — geradores de NPC, taverna e nomes com tabelas próprias
// em pt-BR e en (texto original da Forja, sem material de terceiros).
//
// Tudo é puro: recebe `lang` e um `rng` (() => [0,1)). Use makeRng(seed)
// para resultados reproduzíveis (testes) ou deixe o padrão (Math.random).
//
// Nada aqui grava nada: toEntryPayload() só monta o corpo do POST, sempre
// com visibility 'hidden' — o mestre decide se e quando revelar.

export function makeRng(seed = Date.now()) {
  let a = (Number(seed) >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length) % arr.length];
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const L = (lang) => (lang === 'en' ? 'en' : 'pt');

// ===================================================================== tabelas
export const TABLES = {
  pt: {
    // [nome, gênero] — o gênero do nome manda na ocupação, aparência e textos.
    first: [
      ['Aldo', 'm'], ['Benedita', 'f'], ['Caetano', 'm'], ['Dalva', 'f'], ['Elói', 'm'], ['Fabíola', 'f'], ['Gervásio', 'm'],
      ['Helena', 'f'], ['Inácio', 'm'], ['Jacira', 'f'], ['Lázaro', 'm'], ['Marisol', 'f'], ['Nestor', 'm'], ['Odete', 'f'],
      ['Policarpo', 'm'], ['Quitéria', 'f'], ['Rufino', 'm'], ['Severina', 'f'], ['Tibério', 'm'], ['Ursulina', 'f'],
      ['Valdemar', 'm'], ['Zuleica', 'f'], ['Amaro', 'm'], ['Brites', 'f'], ['Cosme', 'm'], ['Dorotéia', 'f'], ['Estêvão', 'm'],
      ['Firmina', 'f'], ['Gaspar', 'm'], ['Iolanda', 'f'], ['Leopoldo', 'm'], ['Jurema', 'f'], ['Nicanor', 'm'], ['Mafalda', 'f'],
      ['Pancrácio', 'm'], ['Otília', 'f'], ['Teodoro', 'm'], ['Rosalva', 'f'], ['Bartô', 'm'], ['Salomé', 'f'], ['Damião', 'm'],
      ['Violeta', 'f'], ['Joaquim', 'm'], ['Celeste', 'f'], ['Matias', 'm'], ['Isaura', 'f'], ['Belmiro', 'm'], ['Luzia', 'f'],
    ],
    last: [
      'Pé-de-Malte', 'Mão-de-Ferro', 'Barba-Rala', 'Olho-de-Corvo', 'da Ponte Velha', 'das Brumas', 'Fiapo-de-Prata',
      'Cinzaforte', 'Vinhaterra', 'Pedregal', 'Ventoleste', 'Sal-Grosso', 'Mel-de-Pedra', 'Ferradura', 'Lamparina',
      'do Moinho', 'Ribeirão', 'Dente-de-Lobo', 'Quebra-Nozes', 'Tranca-Rua', 'Cardo-Roxo', 'Folha-Seca', 'Brasa-Viva',
      'Corta-Vento', 'Cabeça-de-Prego', 'Remendo', 'Sete-Luas', 'Fundo-de-Poço', 'Cálice', 'Torrebranca',
      'Marfim', 'Espinheiro', 'Cobre-Velho', 'Pinhão', 'Gota-de-Orvalho', 'Arame', 'Trovoada', 'da Encruzilhada',
    ],
    // Entradas com gênero são pares [masculino, feminino]; texto solto serve para os dois.
    roles: [
      ['Taverneiro', 'Taverneira'], ['Ferreiro', 'Ferreira'], 'Guarda da muralha', ['Sacerdote de aldeia', 'Sacerdotisa de aldeia'],
      ['Mercador de especiarias', 'Mercadora de especiarias'], 'Contrabandista', ['Pescador', 'Pescadora'], ['Curandeiro', 'Curandeira'],
      'Escriba do conselho', ['Caçador de recompensas', 'Caçadora de recompensas'], 'Menestrel', ['Coveiro', 'Coveira'],
      ['Barqueiro', 'Barqueira'], ['Alquimista falido', 'Alquimista falida'], ['Nobre arruinado', 'Nobre arruinada'],
      ['Mendigo da praça', 'Mendiga da praça'], ['Capitão da guarda', 'Capitã da guarda'], ['Cartógrafo', 'Cartógrafa'],
      ['Domador de feras', 'Domadora de feras'], ['Vendedor de relíquias', 'Vendedora de relíquias'], ['Ladrão de bolsas', 'Ladra de bolsas'],
      ['Mineiro', 'Mineira'], ['Estalajadeiro', 'Estalajadeira'], 'Vigia do farol', ['Ervanário', 'Ervanária'], 'Agiota',
      ['Prefeito da vila', 'Prefeita da vila'], ['Aprendiz de mago', 'Aprendiz de maga'], ['Pastor de cabras', 'Pastora de cabras'],
      ['Batedor de estrada', 'Batedora de estrada'],
    ],
    build: [
      ['Alto e magro como um varapau', 'Alta e magra como um varapau'], ['Baixinho e atarracado', 'Baixinha e atarracada'],
      ['Corpulento, de ombros largos', 'Corpulenta, de ombros largos'], ['Franzino, quase sumindo dentro da roupa', 'Franzina, quase sumindo dentro da roupa'],
      ['Velho, mas de costas retas', 'Velha, mas de costas retas'], ['Jovem e inquieto', 'Jovem e inquieta'],
      ['Barrigudo e de bochechas vermelhas', 'Barriguda e de bochechas vermelhas'], ['Musculoso, de braços queimados de sol', 'Musculosa, de braços queimados de sol'],
      ['Curvado pelos anos', 'Curvada pelos anos'], 'Elegante, de postura impecável',
      ['Desengonçado, todo cotovelos e joelhos', 'Desengonçada, toda cotovelos e joelhos'], ['Robusto como um barril', 'Robusta como um barril'],
    ],
    feature: [
      'com uma cicatriz que atravessa a sobrancelha', 'de olhos de cores diferentes', 'com um dente de ouro que brilha ao sorrir',
      'de cabelo branco precoce', 'com tatuagens de ondas nos antebraços', 'de nariz quebrado mais de uma vez',
      'com sardas por todo o rosto', 'de unhas sempre sujas de tinta', 'com uma orelha mordida', 'de voz rouca e grave',
      'com um tapa-olho de couro bordado', 'de sobrancelhas grossas e unidas', 'com mãos enormes e calejadas',
      'de pele marcada por queimaduras antigas', 'com uma trança que vai até a cintura', 'de olhar distante e cansado',
      'com cheiro forte de alho', 'que manca da perna esquerda', 'de dedos cheios de anéis baratos', ['com um bigode enrolado nas pontas', 'com um coque preso por dois grampos de osso'],
      'de dentes muito brancos e perfeitos', 'com um corte recente no lábio', 'de cabeça raspada e brilhante', 'com o rosto pintado de cinza',
    ],
    clothing: [
      'veste um avental manchado de gordura', 'usa um manto remendado com retalhos coloridos', 'anda sempre de chapéu de aba larga',
      'veste roupas finas, mas puídas nas mangas', 'usa uma cota de malha enferrujada', 'carrega um colar de dentes de animais',
      'usa botas grandes demais', 'veste o uniforme da guarda, mal abotoado', ['anda descalço, mesmo no frio', 'anda descalça, mesmo no frio'],
      'usa luvas de couro que nunca tira', 'tem um cachecol de lã tricotado pela avó', 'veste preto da cabeça aos pés',
      'usa um broche de prata em forma de coruja', 'carrega uma bolsa cheia de pergaminhos', 'veste um gibão de veludo cor de vinho',
      'usa óculos de lentes grossas e rachadas', 'anda com um galo de briga debaixo do braço', 'traz um cachimbo apagado no canto da boca',
    ],
    mannerism: [
      'Bate duas vezes na mesa antes de contar um segredo.', ['Fala de si mesmo na terceira pessoa.', 'Fala de si mesma na terceira pessoa.'], ['Cantarola baixinho quando está nervoso.', 'Cantarola baixinho quando está nervosa.'],
      'Nunca olha nos olhos de ninguém.', 'Termina toda frase com "não é mesmo?".', 'Coça a barba (ou o queixo) quando mente.',
      'Ri alto das próprias piadas, antes de terminar.', 'Cheira tudo antes de comer ou beber.', 'Conta moedas o tempo todo, mesmo conversando.',
      'Usa palavras difíceis — e quase sempre erradas.', 'Fala sussurrando, como se alguém estivesse ouvindo.', 'Interrompe para corrigir detalhes sem importância.',
      'Benze-se sempre que alguém fala de magia.', 'Dá apelidos para todo mundo no primeiro minuto.', 'Gesticula tanto que derruba coisas.',
      'Responde perguntas com outras perguntas.', 'Repete a última palavra que o outro disse.', 'Está sempre comendo alguma coisa.',
      'Fala devagar, escolhendo cada palavra.', ['Conta histórias de um "primo" que claramente é ele mesmo.', 'Conta histórias de uma "prima" que claramente é ela mesma.'], 'Assobia para chamar atenção.',
      'Não consegue ficar parado: anda de um lado para o outro.', 'Promete coisas que não pode cumprir.', 'Chama todos de "meu jovem", até os mais velhos.',
      'Desconfia de quem é canhoto.', 'Ri nervoso sempre que ouve um nome específico.', 'Fala com o próprio animal como se fosse gente.',
      'Sempre sabe o preço de tudo.', 'Cita provérbios que ninguém conhece.', 'Se assusta com qualquer barulho.',
    ],
    wants: [
      'Pagar uma dívida antiga antes que cobrem com sangue.', 'Descobrir quem matou o irmão.', 'Juntar ouro para fugir da cidade.',
      'Provar que não é covarde.', 'Reconquistar o amor de alguém que partiu.', ['Ser aceito na guilda que o rejeitou.', 'Ser aceita na guilda que a rejeitou.'],
      'Recuperar um anel roubado da família.', 'Proteger a filha de um casamento arranjado.', ['Ficar famoso — de qualquer jeito.', 'Ficar famosa — de qualquer jeito.'],
      'Vingar-se do antigo patrão.', 'Encontrar a cura para uma doença que esconde.', 'Abrir a própria taverna.',
      'Expulsar os forasteiros da vila.', 'Ver o mar pelo menos uma vez.', ['Que a guarda pare de vigiá-lo.', 'Que a guarda pare de vigiá-la.'],
      'Achar um herdeiro digno para o seu ofício.', 'Esquecer algo terrível que viu na floresta.', 'Ganhar a aposta com o rival de sempre.',
      ['Que alguém acredite na história que ele conta.', 'Que alguém acredite na história que ela conta.'], 'Livrar-se de um objeto amaldiçoado sem que ninguém saiba.',
      'Voltar para a terra natal com honra.', ['Ser nomeado conselheiro da vila.', 'Ser nomeada conselheira da vila.'], 'Encontrar o mapa que o avô escondeu.',
      'Que os heróis levem uma carta até a capital.', 'Manter o segredo da família enterrado.', 'Comer bem e dormir sem medo.',
    ],
    secret: [
      ['É filho bastardo do barão local.', 'É filha bastarda do barão local.'], ['Deve dinheiro a um culto e está sendo vigiado.', 'Deve dinheiro a um culto e está sendo vigiada.'], 'Roubou a identidade de um morto.',
      'Viu o assassino, mas foi pago para esquecer.', 'Trabalha como espião para uma facção rival.', 'Tem um dragãozinho escondido no porão.',
      'Envenenou o antigo dono do negócio.', ['É um licantropo que ainda não sabe controlar a fera.', 'É uma licantropa que ainda não sabe controlar a fera.'], 'Esconde um fugitivo em casa.',
      ['Já foi aventureiro e abandonou os companheiros num túmulo.', 'Já foi aventureira e abandonou os companheiros num túmulo.'], 'Sabe onde está a entrada esquecida das catacumbas.',
      ['Está apaixonado pelo vilão da história.', 'Está apaixonada pelo vilão da história.'], 'Falsifica selos do conselho para viver.', 'Ouve vozes vindas do poço da praça.',
      'Prometeu o primogênito a uma fada, e o prazo está acabando.', 'É um disfarce: na verdade, é outra pessoa com magia.',
      'Guarda a chave de uma porta que ninguém deveria abrir.', 'Quebrou um juramento sagrado e teme o castigo.',
      'Vende informações sobre os heróis para quem pagar mais.', 'Tem um mapa tatuado nas costas e não sabe o que ele mostra.',
      'Está morrendo e não contou a ninguém.', 'Matou um homem em legítima defesa e enterrou o corpo no quintal.',
      ['É o verdadeiro herdeiro de um trono caído.', 'É a verdadeira herdeira de um trono caído.'], ['Já foi possuído — e às vezes sente a presença voltando.', 'Já foi possuída — e às vezes sente a presença voltando.'],
    ],
    tavernNoun: [
      ['Javali', 'm'], ['Caneca', 'f'], ['Dragão', 'm'], ['Raposa', 'f'], ['Barril', 'm'], ['Coruja', 'f'], ['Grifo', 'm'],
      ['Sereia', 'f'], ['Machado', 'm'], ['Lanterna', 'f'], ['Corvo', 'm'], ['Ferradura', 'f'], ['Pônei', 'm'], ['Âncora', 'f'],
      ['Caldeirão', 'm'], ['Bigorna', 'f'], ['Galo', 'm'], ['Cabra', 'f'], ['Sino', 'm'], ['Estrela', 'f'],
    ],
    tavernAdj: [
      ['Dourado', 'Dourada'], ['Bêbado', 'Bêbada'], ['Rachado', 'Rachada'], ['Sorridente', 'Sorridente'], ['Afogado', 'Afogada'],
      ['Manco', 'Manca'], ['Adormecido', 'Adormecida'], ['de Prata', 'de Prata'], ['Faminto', 'Faminta'], ['Risonho', 'Risonha'],
      ['Torto', 'Torta'], ['Azul', 'Azul'], ['Velho', 'Velha'], ['Cantante', 'Cantante'], ['Gordo', 'Gorda'], ['Errante', 'Errante'],
    ],
    tavernAlt: ['O Descanso do Viajante', 'A Última Parada', 'O Fim da Estrada', 'A Casa da Viúva', 'O Porão do Anão',
      'A Taverna Sem Nome', 'O Abrigo das Sete Velas', 'A Mesa Redonda do Porto', 'O Poço dos Desejos', 'O Caneco do Rei'],
    atmosphere: [
      'Barulhenta e enfumaçada, com uma lareira que nunca apaga.', 'Silenciosa demais: todos param de falar quando alguém entra.',
      'Aconchegante, com cheiro de pão quente e hidromel.', 'Decadente, com goteiras e mesas bambas.',
      'Cheia de marinheiros cantando músicas de bordel.', 'Elegante, com cortinas de veludo e preços que assustam.',
      'Escura, iluminada só por velas dentro de crânios.', 'Animada, com um bardo desafinado em cima de uma mesa.',
      'Tensa: há duas gangues sentadas em cantos opostos.', 'Rústica, com um javali assando no espeto o dia inteiro.',
      'Mística: um vidente lê a sorte por uma moeda.', 'Lotada de mineiros cobertos de poeira depois do turno.',
      'Abandonada pela metade: o andar de cima pegou fogo e ninguém consertou.', 'Flutua sobre o rio, presa a uma barcaça velha.',
    ],
    specialty: [
      'Ensopado de cogumelos da caverna (não pergunte de qual caverna).', 'Hidromel de urze, doce e traiçoeiro.',
      'Torta de carne com uma pimenta que faz chorar.', 'Cerveja preta tão grossa que dá para mastigar.',
      'Peixe defumado na hora, com pão de centeio.', 'Vinho de amora "safra dos trolls".', 'Sopa de cebola servida dentro do pão.',
      'Linguiça de javali com mostarda de mel.', 'Licor de fogo-fátuo, que brilha no escuro.', 'Mingau de aveia com toucinho — o melhor da estrada.',
      'Queijo de cabra curado em cinzas.', 'Chá de ervas da curandeira, que cura ressaca (e às vezes mais que isso).',
    ],
    clientele: [
      'Mercenários à procura de contrato.', 'Fazendeiros reclamando da colheita.', 'Estudantes de magia fugindo das aulas.',
      'Peregrinos a caminho do templo.', 'Contrabandistas fingindo ser pescadores.', 'Guardas de folga — e de olho em tudo.',
      'Caravaneiros de terras distantes.', 'Jogadores de dados apostando alto.', 'Velhos aventureiros contando vantagem.',
      'Nobres disfarçados de gente comum.', 'Artistas de circo de passagem.', 'Lenhadores enormes e de poucas palavras.',
    ],
    rumor: [
      'Um navio fantasma foi visto no porto na lua nova.', 'O poço da praça está sussurrando nomes à noite.',
      'O barão está devendo a gente perigosa.', 'Lobos foram vistos andando em pé na estrada do norte.',
      'Encontraram moedas de um reino que não existe mais no rio.', 'Uma criança desapareceu e voltou falando outra língua.',
      'Alguém está comprando todo o sal da cidade.', 'O velho moinho range sozinho, mesmo sem vento.',
      'Um cavaleiro de armadura negra pergunta pelos heróis.', 'O templo fechou as portas e ninguém sabe por quê.',
      'Há um mapa do tesouro escondido em uma das mesas desta taverna.', 'O taverneiro anterior não morreu: está no porão.',
    ],
    price: ['Barata (2 pc a caneca)', 'Justa (4 pc a caneca)', 'Salgada (1 pp a caneca)', 'Caríssima (1 po a caneca)'],
    placeA: ['Vau', 'Pedra', 'Bruma', 'Vale', 'Monte', 'Lago', 'Porto', 'Ponte', 'Campo', 'Serra', 'Mata', 'Toca', 'Forte', 'Poço', 'Rocha', 'Vila'],
    placeB: ['fria', 'negra', 'do Corvo', 'Velha', 'dos Ossos', 'Funda', 'das Cinzas', 'Alta', 'do Sino', 'Esquecida', 'das Bruxas', 'Seca', 'do Lobo', 'Dourada', 'Torta', 'Quieta'],
    factionA: ['Círculo', 'Irmandade', 'Ordem', 'Liga', 'Companhia', 'Conclave', 'Guilda', 'Pacto', 'Mão', 'Coroa'],
    factionB: ['do Sino Mudo', 'da Lua Partida', 'das Sete Chaves', 'do Corvo Branco', 'da Rosa Negra', 'do Dente de Ouro',
      'dos Olhos Fechados', 'da Última Vela', 'do Rio Vermelho', 'da Raiz Antiga', 'dos Mil Passos', 'da Serpente de Bronze'],
  },
  en: {
    first: [
      ['Aldric', 'm'], ['Bettany', 'f'], ['Corwin', 'm'], ['Delia', 'f'], ['Edric', 'm'], ['Fenna', 'f'], ['Gideon', 'm'],
      ['Hester', 'f'], ['Ivo', 'm'], ['Jessamy', 'f'], ['Lorcan', 'm'], ['Maribel', 'f'], ['Nestor', 'm'], ['Odile', 'f'],
      ['Percival', 'm'], ['Quilla', 'f'], ['Rufus', 'm'], ['Seraphine', 'f'], ['Tobias', 'm'], ['Ursula', 'f'],
      ['Wendel', 'm'], ['Ysolde', 'f'], ['Ambrose', 'm'], ['Brielle', 'f'], ['Cuthbert', 'm'], ['Dorothea', 'f'], ['Elias', 'm'],
      ['Fiora', 'f'], ['Garrick', 'm'], ['Isolde', 'f'], ['Jasper', 'm'], ['Mirabel', 'f'], ['Leopold', 'm'], ['Ottilie', 'f'],
      ['Nicodemus', 'm'], ['Rosalind', 'f'], ['Pell', 'm'], ['Saffron', 'f'], ['Thaddeus', 'm'], ['Violet', 'f'], ['Barnaby', 'm'],
      ['Celeste', 'f'], ['Dorian', 'm'], ['Imogen', 'f'], ['Jory', 'm'], ['Lucia', 'f'], ['Matthias', 'm'], ['Rowena', 'f'],
    ],
    last: [
      'Maltfoot', 'Ironhand', 'Thinbeard', 'Crowseye', 'of the Old Bridge', 'Mistborn', 'Silverthread', 'Ashstrong',
      'Vinewell', 'Stonefield', 'Eastwind', 'Coarsesalt', 'Stonehoney', 'Horseshoe', 'Lampwick', 'Millward', 'Brookes',
      'Wolftooth', 'Nutcracker', 'Bolt', 'Purplethistle', 'Dryleaf', 'Emberly', 'Windcutter', 'Nailhead', 'Patch',
      'Sevenmoons', 'Deepwell', 'Chalice', 'Whitetower', 'Ivory', 'Thornbush', 'Oldcopper', 'Pinecone', 'Dewdrop',
      'Wire', 'Thunderclap', 'of the Crossroads',
    ],
    roles: [
      'Innkeeper', 'Blacksmith', 'Wall guard', ['Village priest', 'Village priestess'], 'Spice merchant', 'Smuggler', 'Fisher', 'Healer',
      'Council scribe', 'Bounty hunter', 'Minstrel', 'Gravedigger', ['Ferryman', 'Ferrywoman'], 'Broke alchemist', 'Ruined noble',
      'Town beggar', 'Captain of the guard', 'Cartographer', 'Beast tamer', 'Relic peddler', 'Pickpocket', 'Miner',
      ['Landlord', 'Landlady'], 'Lighthouse keeper', 'Herbalist', 'Moneylender', 'Village reeve', "Wizard's apprentice", 'Goatherd', 'Road scout',
    ],
    build: [
      'Tall and thin as a rake', 'Short and stocky', 'Burly and broad-shouldered', 'Scrawny, almost lost inside their clothes',
      'Old, but straight-backed', 'Young and restless', 'Pot-bellied and red-cheeked', 'Muscular, with sunburnt arms',
      'Stooped by the years', 'Elegant, with flawless posture', 'Gangly, all elbows and knees', 'Sturdy as a barrel',
    ],
    feature: [
      'with a scar across one eyebrow', 'with mismatched eyes', 'with a gold tooth that flashes when they smile',
      'with hair gone white too early', 'with wave tattoos on both forearms', 'with a nose broken more than once',
      'freckled from brow to chin', 'with ink-stained fingernails', 'with a bitten ear', 'with a deep, hoarse voice',
      'wearing an embroidered leather eyepatch', 'with thick brows that meet in the middle', 'with huge, calloused hands',
      'with old burn scars', 'with a braid down to the waist', 'with a distant, tired stare', 'reeking of garlic',
      'limping on the left leg', 'with fingers full of cheap rings', 'with a mustache curled at the tips',
      'with impossibly white, perfect teeth', 'with a fresh cut on the lip', 'with a shaved, shiny head', 'with ash-grey face paint',
    ],
    clothing: [
      'wears a grease-stained apron', 'wears a cloak patched with bright scraps', 'never takes off a wide-brimmed hat',
      'wears fine clothes frayed at the cuffs', 'wears rusty chain mail', 'wears a necklace of animal teeth', 'wears boots two sizes too big',
      'wears a guard uniform, badly buttoned', 'goes barefoot, even in the cold', 'wears leather gloves they never remove',
      "wears a wool scarf knitted by grandma", 'dresses in black from head to toe', 'wears a silver owl brooch',
      'carries a satchel stuffed with scrolls', 'wears a wine-red velvet doublet', 'wears thick, cracked spectacles',
      'carries a fighting rooster under one arm', 'keeps an unlit pipe in the corner of the mouth',
    ],
    mannerism: [
      'Knocks twice on the table before telling a secret.', 'Talks about themself in the third person.', 'Hums under their breath when nervous.',
      'Never looks anyone in the eye.', 'Ends every sentence with "isn\'t it?".', 'Scratches their chin when lying.',
      'Laughs at their own jokes before finishing them.', 'Sniffs everything before eating or drinking.', 'Counts coins constantly, even mid-conversation.',
      'Uses big words — almost always wrong.', 'Whispers, as if someone were listening.', 'Interrupts to correct pointless details.',
      'Makes a warding sign whenever magic is mentioned.', 'Gives everyone a nickname within a minute.', 'Gestures so much they knock things over.',
      'Answers questions with more questions.', 'Repeats the last word the other person said.', 'Is always eating something.',
      'Speaks slowly, choosing every word.', 'Tells stories about a "cousin" who is clearly themself.', 'Whistles to get attention.',
      "Can't stand still: paces back and forth.", "Promises things they can't deliver.", 'Calls everyone "youngster", even their elders.',
      "Doesn't trust left-handed people.", 'Laughs nervously at one particular name.', 'Talks to their pet as if it were a person.',
      'Always knows the price of everything.', 'Quotes proverbs nobody has ever heard.', 'Jumps at every noise.',
    ],
    wants: [
      'To pay an old debt before it is collected in blood.', 'To find out who killed their brother.', 'To save enough gold to flee the city.',
      'To prove they are no coward.', 'To win back someone who left.', 'To join the guild that rejected them.',
      'To recover a ring stolen from the family.', 'To save their daughter from an arranged marriage.', 'To be famous — no matter how.',
      'To get revenge on a former employer.', 'To find a cure for a sickness they hide.', 'To open their own tavern.',
      'To drive the outsiders out of the village.', 'To see the sea at least once.', 'To make the watch stop following them.',
      'To find a worthy heir for their craft.', 'To forget something terrible they saw in the forest.', 'To win the bet against their eternal rival.',
      'For someone to finally believe their story.', 'To get rid of a cursed object without anyone knowing.',
      'To return home with honor.', 'To be named to the village council.', 'To find the map their grandfather hid.',
      'For the heroes to carry a letter to the capital.', 'To keep the family secret buried.', 'To eat well and sleep without fear.',
    ],
    secret: [
      "Is the local baron's illegitimate child.", 'Owes money to a cult and is being watched.', 'Stole the identity of a dead person.',
      'Saw the murderer, but was paid to forget.', 'Spies for a rival faction.', 'Keeps a tiny dragon hidden in the cellar.',
      "Poisoned the business's previous owner.", "Is a werewolf who can't yet control the beast.", 'Hides a fugitive at home.',
      'Was once an adventurer and abandoned their companions in a tomb.', 'Knows where the forgotten catacomb entrance is.',
      "Is in love with the story's villain.", 'Forges council seals for a living.', 'Hears voices coming from the town well.',
      'Promised their firstborn to a fey, and time is running out.', 'Is a disguise: really someone else, hidden by magic.',
      'Holds the key to a door nobody should open.', 'Broke a sacred oath and fears the punishment.',
      'Sells information about the heroes to the highest bidder.', "Has a map tattooed on their back and doesn't know what it shows.",
      'Is dying and has told no one.', 'Killed a man in self-defense and buried him in the backyard.',
      'Is the true heir of a fallen throne.', 'Was once possessed — and sometimes feels the presence returning.',
    ],
    tavernNoun: [['Boar'], ['Tankard'], ['Dragon'], ['Fox'], ['Barrel'], ['Owl'], ['Griffon'], ['Mermaid'], ['Axe'], ['Lantern'],
      ['Raven'], ['Horseshoe'], ['Pony'], ['Anchor'], ['Cauldron'], ['Anvil'], ['Rooster'], ['Goat'], ['Bell'], ['Star']],
    tavernAdj: [['Golden'], ['Drunken'], ['Cracked'], ['Grinning'], ['Drowned'], ['Limping'], ['Sleeping'], ['Silver'], ['Hungry'],
      ['Laughing'], ['Crooked'], ['Blue'], ['Old'], ['Singing'], ['Fat'], ['Wandering']],
    tavernAlt: ["The Traveler's Rest", 'The Last Stop', "The Road's End", "The Widow's House", "The Dwarf's Cellar",
      'The Nameless Tavern', 'The Seven Candles', 'The Harbor Round Table', 'The Wishing Well', "The King's Mug"],
    atmosphere: [
      'Loud and smoky, with a hearth that never goes out.', 'Too quiet: everyone stops talking when someone walks in.',
      'Cozy, smelling of warm bread and mead.', 'Run-down, with leaking roof and wobbly tables.',
      'Packed with sailors singing bawdy songs.', 'Elegant, with velvet curtains and frightening prices.',
      'Dark, lit only by candles inside skulls.', 'Lively, with an off-key bard standing on a table.',
      'Tense: two gangs sit in opposite corners.', 'Rustic, with a boar turning on the spit all day.',
      'Mystical: a seer reads fortunes for a coin.', 'Full of dust-covered miners after their shift.',
      'Half-abandoned: the upper floor burned and nobody fixed it.', 'Floats on the river, tied to an old barge.',
    ],
    specialty: [
      "Cave-mushroom stew (don't ask which cave).", 'Heather mead, sweet and treacherous.', 'Meat pie with a pepper that makes you cry.',
      'Stout so thick you can chew it.', 'Fresh smoked fish with rye bread.', 'Blackberry wine, "troll vintage".',
      'Onion soup served inside the loaf.', 'Boar sausage with honey mustard.', 'Will-o\'-wisp liqueur that glows in the dark.',
      'Oat porridge with bacon — the best on the road.', 'Ash-cured goat cheese.', "The healer's herbal tea, which cures hangovers (and sometimes more).",
    ],
    clientele: [
      'Sellswords looking for contracts.', 'Farmers complaining about the harvest.', 'Magic students skipping class.',
      'Pilgrims on their way to the temple.', 'Smugglers pretending to be fishers.', 'Off-duty guards — watching everything.',
      'Caravaneers from distant lands.', 'Dice players betting high.', 'Old adventurers bragging.',
      'Nobles disguised as commoners.', 'Traveling circus folk.', 'Huge, quiet woodcutters.',
    ],
    rumor: [
      'A ghost ship was seen in the harbor on the new moon.', 'The town well whispers names at night.',
      'The baron owes money to dangerous people.', 'Wolves were seen walking upright on the north road.',
      'Coins from a kingdom that no longer exists turned up in the river.', 'A child vanished and came back speaking another language.',
      'Someone is buying all the salt in town.', 'The old mill creaks on its own, even without wind.',
      'A knight in black armor is asking about the heroes.', 'The temple shut its doors and nobody knows why.',
      'A treasure map is hidden under one of the tables in this very tavern.', "The previous innkeeper didn't die: he's in the cellar.",
    ],
    price: ['Cheap (2 cp a mug)', 'Fair (4 cp a mug)', 'Steep (1 sp a mug)', 'Outrageous (1 gp a mug)'],
    placeA: ['Mist', 'Stone', 'Raven', 'Ash', 'Frost', 'Deep', 'Black', 'Bell', 'Wolf', 'Thorn', 'Gold', 'Hollow', 'Bone', 'Still', 'Grey', 'Elder'],
    placeB: ['ford', 'vale', 'mere', 'hollow', 'watch', 'haven', 'reach', 'moor', 'crag', 'brook', 'fell', 'gate', 'wick', 'stead', 'barrow', 'march'],
    factionA: ['Circle', 'Brotherhood', 'Order', 'League', 'Company', 'Conclave', 'Guild', 'Pact', 'Hand', 'Crown'],
    factionB: ['of the Silent Bell', 'of the Broken Moon', 'of the Seven Keys', 'of the White Raven', 'of the Black Rose', 'of the Golden Tooth',
      'of Closed Eyes', 'of the Last Candle', 'of the Red River', 'of the Old Root', 'of a Thousand Steps', 'of the Bronze Serpent'],
  },
};

// ===================================================================== gênero
// Entrada de tabela: texto (serve para todos) ou [masculino, feminino].
export const GENDERS = ['m', 'f'];
/** Texto da entrada na forma do gênero pedido. */
export const inflect = (entry, gender) => (Array.isArray(entry) ? entry[gender === 'f' ? 1 : 0] : entry);
/** Todas as formas possíveis de uma tabela (para validar). */
export const allForms = (arr) => arr.flatMap(e => (Array.isArray(e) ? e : [e]));
const pickIndex = (arr, rng) => Math.floor(rng() * arr.length) % arr.length;
const firstNamesOf = (T, gender) => T.first.filter(([, g]) => g === gender);

// ===================================================================== peças
export function personName(lang, rng = Math.random, gender) {
  const T = TABLES[L(lang)];
  const pool = gender ? firstNamesOf(T, gender) : T.first;
  return `${pick(pool, rng)[0]} ${pick(T.last, rng)}`;
}

/** Gênero de um nome gerado ("Jacira Pé-de-Malte" → 'f'); null se não reconhece. */
export function genderOfName(name, lang = 'pt') {
  const first = String(name || '').trim().split(/\s+/)[0];
  const hit = TABLES[L(lang)].first.find(([n]) => n === first);
  return hit ? hit[1] : null;
}

export function placeName(lang, rng = Math.random) {
  const T = TABLES[L(lang)];
  const a = pick(T.placeA, rng); const b = pick(T.placeB, rng);
  if (L(lang) === 'en') return a + b;
  // pt: "Pedrafria" quando o sufixo é uma palavra só em minúscula; senão "Vale do Corvo".
  return /^[a-zà-ú]/.test(b) ? a + b : `${a} ${b}`;
}

export function factionName(lang, rng = Math.random) {
  const T = TABLES[L(lang)];
  const a = pick(T.factionA, rng); const b = pick(T.factionB, rng);
  if (L(lang) === 'pt') {
    const art = ['Irmandade', 'Ordem', 'Liga', 'Companhia', 'Guilda', 'Mão', 'Coroa'].includes(a) ? 'A' : 'O';
    return `${art} ${a} ${b}`;
  }
  return `The ${a} ${b}`;
}

export function tavernName(lang, rng = Math.random) {
  const T = TABLES[L(lang)];
  if (rng() < 0.2) return pick(T.tavernAlt, rng);
  const [noun, g] = pick(T.tavernNoun, rng);
  const adj = pick(T.tavernAdj, rng);
  if (L(lang) === 'en') return `The ${adj[0]} ${noun}`;
  return g === 'f' ? `A ${noun} ${adj[1]}` : `O ${noun} ${adj[0]}`;
}

export function appearance(lang, rng = Math.random, gender = 'm') {
  const T = TABLES[L(lang)];
  return renderPick('appearance', [pickIndex(T.build, rng), pickIndex(T.feature, rng), pickIndex(T.clothing, rng)], lang, gender);
}

// Campos de NPC que flexionam: guardamos o índice sorteado (picks) para poder
// trocar o gênero depois sem perder o que foi rolado.
const NPC_TABLE = { role: 'roles', mannerism: 'mannerism', wants: 'wants', secret: 'secret' };

function renderPick(field, idx, lang, gender) {
  const T = TABLES[L(lang)];
  if (field === 'appearance') {
    const [b, f, c] = idx;
    return `${inflect(T.build[b], gender)}, ${inflect(T.feature[f], gender)}; ${inflect(T.clothing[c], gender)}.`;
  }
  return inflect(T[NPC_TABLE[field]][idx], gender);
}

function rollNpcField(field, lang, rng, gender) {
  const T = TABLES[L(lang)];
  const idx = field === 'appearance'
    ? [pickIndex(T.build, rng), pickIndex(T.feature, rng), pickIndex(T.clothing, rng)]
    : pickIndex(T[NPC_TABLE[field]], rng);
  return { value: renderPick(field, idx, lang, gender), idx };
}

// ===================================================================== geradores
export const GEN_TYPES = ['npc', 'tavern', 'names'];

export const FIELDS = {
  npc: ['name', 'role', 'appearance', 'mannerism', 'wants', 'secret'],
  tavern: ['name', 'keeper', 'atmosphere', 'specialty', 'clientele', 'rumor', 'price'],
  names: ['person', 'person2', 'place', 'tavern', 'faction'],
};

const FIELD_LABELS = {
  name: ['Nome', 'Name'], role: ['Ocupação', 'Occupation'], appearance: ['Aparência', 'Appearance'],
  mannerism: ['Maneirismo', 'Mannerism'], wants: ['Desejo', 'Wants'], secret: ['Segredo', 'Secret'],
  keeper: ['Quem cuida', 'Keeper'], atmosphere: ['Ambiente', 'Atmosphere'], specialty: ['Especialidade da casa', 'House specialty'],
  clientele: ['Clientela', 'Regulars'], rumor: ['Rumor que corre', 'Rumor going around'], price: ['Preços', 'Prices'],
  person: ['Pessoa', 'Person'], person2: ['Outra pessoa', 'Another person'], place: ['Lugar', 'Place'],
  tavern: ['Taverna', 'Tavern'], faction: ['Facção', 'Faction'],
};
export const fieldLabel = (field, lang) => { const r = FIELD_LABELS[field]; return r ? (L(lang) === 'en' ? r[1] : r[0]) : field; };

function rollField(type, field, lang, rng) {
  const T = TABLES[L(lang)];
  switch (`${type}.${field}`) {
    case 'names.person': case 'names.person2': return personName(lang, rng);
    case 'tavern.name': case 'names.tavern': return tavernName(lang, rng);
    case 'tavern.keeper': {
      const g = pick(GENDERS, rng);
      return `${personName(lang, rng, g)} — ${inflect(pick(T.mannerism, rng), g).replace(/\.$/, '').toLowerCase()}`;
    }
    case 'tavern.atmosphere': return pick(T.atmosphere, rng);
    case 'tavern.specialty': return pick(T.specialty, rng);
    case 'tavern.clientele': return pick(T.clientele, rng);
    case 'tavern.rumor': return pick(T.rumor, rng);
    case 'tavern.price': return pick(T.price, rng);
    case 'names.place': return placeName(lang, rng);
    case 'names.faction': return factionName(lang, rng);
    default: return '';
  }
}

/**
 * Gera um resultado completo: {type, lang, ...campos}. O NPC também leva
 * `gender` ('m'|'f', vem do nome sorteado) e `picks` (índices nas tabelas),
 * para que ocupação, aparência e textos concordem com o nome.
 */
export function generate(type, lang = 'pt', rng = Math.random, gender) {
  const fields = FIELDS[type];
  if (!fields) throw new Error(`unknown_generator:${type}`);
  const out = { type, lang: L(lang) };
  if (type === 'npc') {
    const g = GENDERS.includes(gender) ? gender : pick(GENDERS, rng);
    out.gender = g;
    out.picks = {};
    out.name = personName(lang, rng, g);
    for (const f of fields.filter(f => f !== 'name')) {
      const r = rollNpcField(f, lang, rng, g);
      out[f] = r.value; out.picks[f] = r.idx;
    }
    return out;
  }
  for (const f of fields) out[f] = rollField(type, f, lang, rng);
  if (type === 'names' && out.person2 === out.person) out.person2 = rollField(type, 'person2', lang, rng);
  return out;
}

export const generateNpc = (lang, rng) => generate('npc', lang, rng);
export const generateTavern = (lang, rng) => generate('tavern', lang, rng);
export const generateNames = (lang, rng) => generate('names', lang, rng);

/** Rerrola um campo só (tenta não repetir o valor atual). */
export function rerollField(gen, field, rng = Math.random) {
  if (!gen || !FIELDS[gen.type]?.includes(field)) return gen;
  if (gen.type === 'npc') {
    const g = gen.gender || 'm';
    let r = { value: gen[field], idx: gen.picks?.[field] };
    for (let i = 0; i < 6 && r.value === gen[field]; i++) {
      r = field === 'name' ? { value: personName(gen.lang, rng, g) } : rollNpcField(field, gen.lang, rng, g);
    }
    const out = { ...gen, [field]: r.value };
    if (field !== 'name') out.picks = { ...(gen.picks || {}), [field]: r.idx };
    return out;
  }
  let v = gen[field];
  for (let i = 0; i < 6 && v === gen[field]; i++) v = rollField(gen.type, field, gen.lang, rng);
  return { ...gen, [field]: v };
}

/**
 * Troca o gênero do NPC: novo primeiro nome (mesmo sobrenome) e ocupação,
 * aparência e textos flexionados. Campos que o mestre editou à mão ficam
 * como estão.
 */
export function setNpcGender(gen, gender, rng = Math.random) {
  if (!gen || gen.type !== 'npc' || !GENDERS.includes(gender) || gen.gender === gender) return gen;
  const T = TABLES[gen.lang === 'en' ? 'en' : 'pt'];
  const old = gen.gender || 'm';
  const out = { ...gen, gender };
  // Nome sorteado: troca só o primeiro nome. Nome escrito pelo mestre: não mexe.
  if (!gen.name || genderOfName(gen.name, gen.lang) === old) {
    const rest = String(gen.name || '').split(' ').slice(1).join(' ');
    out.name = `${pick(firstNamesOf(T, gender), rng)[0]} ${rest || pick(T.last, rng)}`;
  }
  for (const f of FIELDS.npc.filter(f => f !== 'name')) {
    const idx = gen.picks?.[f];
    if (idx === undefined) continue;
    if (gen[f] === renderPick(f, idx, gen.lang, old)) out[f] = renderPick(f, idx, gen.lang, gender);
  }
  return out;
}

/**
 * Corpo do POST /campaigns/:id/world para "Gostei, salvar no mundo".
 * Sempre OCULTO. `names` precisa dizer qual campo vira cartão (field).
 */
export function toEntryPayload(gen, field) {
  const pt = gen.lang !== 'en';
  const tag = pt ? 'improvisado' : 'improvised';
  if (gen.type === 'npc') {
    return {
      kind: 'npc', name: gen.name, visibility: 'hidden',
      summary: `${gen.role}. ${gen.mannerism}`.slice(0, 280),
      data: { role: gen.role, appearance: gen.appearance, mannerism: gen.mannerism, wants: gen.wants },
      secrets: gen.secret ? [{ text: gen.secret }] : [],
      tags: [tag],
    };
  }
  if (gen.type === 'tavern') {
    const body = [
      gen.atmosphere,
      `${pt ? 'Especialidade da casa' : 'House specialty'}: ${gen.specialty}`,
      `${pt ? 'Clientela' : 'Regulars'}: ${gen.clientele}`,
      `${pt ? 'Preços' : 'Prices'}: ${gen.price}`,
    ].join('\n\n');
    return {
      kind: 'place', name: gen.name, visibility: 'hidden',
      summary: gen.atmosphere.slice(0, 280), body,
      dmNotes: `${pt ? 'Quem cuida' : 'Keeper'}: ${gen.keeper}`,
      data: { placeType: 'building' },
      secrets: gen.rumor ? [{ text: gen.rumor }] : [],
      tags: [pt ? 'taverna' : 'tavern', tag],
    };
  }
  if (gen.type === 'names') {
    const f = field || 'person';
    const kind = { person: 'npc', person2: 'npc', place: 'place', tavern: 'place', faction: 'faction' }[f] || 'npc';
    const out = { kind, name: gen[f], visibility: 'hidden', tags: [tag] };
    if (f === 'tavern') out.data = { placeType: 'building' };
    return out;
  }
  throw new Error('unknown_generator');
}

/** Texto para copiar e colar (anotações, chat). */
export function toPlainText(gen) {
  return FIELDS[gen.type].map(f => `${fieldLabel(f, gen.lang)}: ${gen[f]}`).join('\n');
}
