// 2014-compatible options. Short original descriptions, not book text.
// Supplemental options identify their source and require table adjudication.
const bilingual = (pt, en) => ({ pt, en });

export const ARTIFICER = {
  id: 'artificer', name: bilingual('Artífice', 'Artificer'), hitDie: 8,
  saves: ['con', 'int'], armor: ['Light', 'Medium', 'Shields'], weapons: ['Simple'],
  skillsFrom: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleightOfHand'],
  skillCount: 2, spellcaster: true, spellAbility: 'int', source: 'TCE',
  features: [
    { name: bilingual('Conjuração com ferramentas', 'Tool-based Spellcasting'), desc: bilingual('Inteligência; prepare INT + metade do nível (mínimo 1). Usa ferramentas como foco.', 'Intelligence; prepare INT + half level (minimum 1). Tools act as a focus.') },
    { name: bilingual('Engenho Mágico', 'Magical Tinkering'), desc: bilingual('Imbua objetos pequenos com efeitos utilitários; limite igual ao modificador de INT (mínimo 1).', 'Imbue tiny objects with utility effects; limit equals INT modifier (minimum 1).') },
  ],
};

// [id, Portuguese name, English name, size, speed, source, Portuguese summary, English summary]
const races = [
  ['aarakocra', 'Aarakocra', 'Aarakocra', 'Medium', 30, 'MPMM', 'Voo sem armadura média/pesada; garras e magia do vento.', 'Flight without medium/heavy armor; talons and wind magic.'],
  ['astral-elf', 'Elfo Astral', 'Astral Elf', 'Medium', 30, 'AAG', 'Transe astral, visão no escuro e teleporte breve.', 'Astral trance, darkvision, and brief teleportation.'],
  ['autognome', 'Autognomo', 'Autognome', 'Small', 30, 'AAG', 'Constructo; carapaça blindada, reparos mágicos e dados de auxílio.', 'Construct; armored casing, magical repairs, and assistance dice.'],
  ['duergar', 'Duergar', 'Duergar', 'Medium', 30, 'MPMM', 'Visão no escuro superior, resistência a veneno e magia psiônica.', 'Superior darkvision, poison resilience, and psionic magic.'],
  ['eladrin', 'Eladrin', 'Eladrin', 'Medium', 30, 'MPMM', 'Transe e passo feérico com efeito ligado à estação escolhida.', 'Trance and a fey step whose effect depends on the chosen season.'],
  ['sea-elf', 'Elfo do Mar', 'Sea Elf', 'Medium', 30, 'MPMM', 'Respiração aquática, natação e comunicação com animais aquáticos.', 'Water breathing, swimming, and communication with aquatic animals.'],
  ['shadar-kai', 'Shadar-kai', 'Shadar-kai', 'Medium', 30, 'MPMM', 'Transe, resistência necrótica e teleporte protetor.', 'Trance, necrotic resistance, and protective teleportation.'],
  ['deep-gnome', 'Gnomo das Profundezas', 'Deep Gnome', 'Small', 30, 'MPMM', 'Visão no escuro superior, furtividade e proteção mágica.', 'Superior darkvision, stealth, and magical protection.'],
  ['giff', 'Giff', 'Giff', 'Medium', 30, 'AAG', 'Natação, constituição poderosa e afinidade com armas de fogo.', 'Swimming, powerful build, and firearm affinity.'],
  ['githyanki', 'Githyanki', 'Githyanki', 'Medium', 30, 'MPMM', 'Conhecimento astral, resistência psíquica e magia psiônica.', 'Astral knowledge, psychic resistance, and psionic magic.'],
  ['githzerai', 'Githzerai', 'Githzerai', 'Medium', 30, 'MPMM', 'Disciplina mental, resistência psíquica e defesa psiônica.', 'Mental discipline, psychic resistance, and psionic defense.'],
  ['hadozee', 'Hadozee', 'Hadozee', 'Medium', 30, 'AAG', 'Escalada, pés hábeis, planar e resistência a impactos.', 'Climbing, dexterous feet, gliding, and impact resilience.'],
  ['kalashtar', 'Kalashtar', 'Kalashtar', 'Medium', 30, 'ERLW', 'Telepatia, resistência psíquica e defesa contra efeitos mentais.', 'Telepathy, psychic resistance, and mental defenses.'],
  ['kender', 'Kender', 'Kender', 'Small', 30, 'DSDQ', 'Resistência ao medo, curiosidade e provocação de inimigos.', 'Fear resilience, curiosity, and enemy taunts.'],
  ['locathah', 'Locathah', 'Locathah', 'Medium', 30, 'LR', 'Natação, armadura natural e dependência de imersão em água.', 'Swimming, natural armor, and a need for water immersion.'],
  ['loxodon', 'Loxodonte', 'Loxodon', 'Medium', 30, 'GGR', 'Tromba preênsil, olfato aguçado e armadura natural.', 'Prehensile trunk, keen smell, and natural armor.'],
  ['owlin', 'Corujino', 'Owlin', 'Medium', 30, 'SCC', 'Voo sem armadura média/pesada, furtividade e visão no escuro.', 'Flight without medium/heavy armor, stealth, and darkvision.'],
  ['plasmoid', 'Plasmoide', 'Plasmoid', 'Medium', 30, 'AAG', 'Corpo amorfo, pseudópodes e resistência a ácido e veneno.', 'Amorphous body, pseudopods, and acid and poison resistance.'],
  ['shifter', 'Transmorfo', 'Shifter', 'Medium', 30, 'MPMM', 'Transformação temporária com aspecto bestial escolhido.', 'Temporary transformation with a chosen bestial aspect.'],
  ['simic-hybrid', 'Híbrido Simic', 'Simic Hybrid', 'Medium', 30, 'GGR', 'Escolha adaptações animais nos níveis 1 e 5.', 'Choose animal adaptations at levels 1 and 5.'],
  ['thri-kreen', 'Thri-kreen', 'Thri-kreen', 'Medium', 30, 'AAG', 'Carapaça, braços secundários e comunicação telepática.', 'Carapace, secondary arms, and telepathic communication.'],
  ['vedalken', 'Vedalkeano', 'Vedalken', 'Medium', 30, 'GGR', 'Precisão especializada, defesa mental e respiração aquática limitada.', 'Specialized precision, mental defenses, and limited water breathing.'],
  ['verdan', 'Verdan', 'Verdan', 'Small', 30, 'AI', 'Telepatia limitada, recuperação e mudança de tamanho no nível 5.', 'Limited telepathy, recovery, and a size change at level 5.'],
  ['grung', 'Grung', 'Grung', 'Small', 25, 'OGA', 'Escalada, pele venenosa, saltos e dependência de água.', 'Climbing, poisonous skin, jumping, and water dependency.'],
  ['dhampir', 'Dhampir', 'Dhampir', 'Medium', 35, 'VRGR', 'Linhagem: mordida vampírica, escalada e natureza imortal.', 'Lineage: vampiric bite, climbing, and deathless nature.'],
  ['hexblood', 'Sangue Maldito', 'Hexblood', 'Medium', 30, 'VRGR', 'Linhagem feérica: lembrança sobrenatural e magia de bruxa.', 'Fey lineage: eerie tokens and hag magic.'],
  ['reborn', 'Renascido', 'Reborn', 'Medium', 30, 'VRGR', 'Linhagem: resistência da não vida e memórias de uma vida anterior.', 'Lineage: deathless resilience and memories of a past life.'],
  ['human-variant', 'Humano Variante', 'Variant Human', 'Medium', 30, 'PHB', 'Dois atributos +1; uma perícia e um talento à escolha.', 'Two abilities +1; one skill and one feat of your choice.'],
  ['custom-lineage', 'Linhagem Personalizada', 'Custom Lineage', 'Medium', 30, 'TCE', 'Um atributo +2; um talento; escolha visão no escuro ou perícia.', 'One ability +2; one feat; choose darkvision or a skill.'],
];

export const EXTRA_RACES = races.map(([id, pt, en, size, speed, source, descPt, descEn]) => ({
  id, name: bilingual(pt, en), size, speed, source, asi: {}, flexibleAsi: true,
  manualTraits: true, languages: ['Common', '+1 of choice'],
  traits: [{ name: bilingual('Traços da origem', 'Origin traits'), desc: bilingual(descPt, descEn) }],
}));

export const SOURCES = {
  PHB: "Player's Handbook (2014)", DMG: "Dungeon Master's Guide (2014)",
  XGE: "Xanathar's Guide to Everything", TCE: "Tasha's Cauldron of Everything",
  SCAG: "Sword Coast Adventurer's Guide", MPMM: 'Monsters of the Multiverse',
  ERLW: 'Eberron: Rising from the Last War', GGR: "Guildmasters' Guide to Ravnica",
  AAG: "Astral Adventurer's Guide", SCC: 'Strixhaven: A Curriculum of Chaos',
  VRGR: "Van Richten's Guide to Ravenloft", FTD: "Fizban's Treasury of Dragons",
  EGW: "Explorer's Guide to Wildemount", DSDQ: 'Dragonlance: Shadow of the Dragon Queen',
  BGG: "Bigby Presents: Glory of the Giants", AI: 'Acquisitions Incorporated',
  LR: 'Locathah Rising', OGA: 'One Grung Above',
};

// Supplemental subclasses can be selected and saved. Their special actions
// are resolved at the table; the UI explicitly distinguishes this coverage.
const subclasses = {
  artificer: [
    ['cartographer', 'Cartógrafo', 'Cartographer', 'EFA', 'Mapas mágicos, exploração e portais.', 'Magic maps, exploration, and portals.'],
    ['alchemist', 'Alquimista', 'Alchemist', 'TCE', 'Elixires, cura e alquimia.', 'Elixirs, healing, and alchemy.'],
    ['armorer', 'Armeiro', 'Armorer', 'TCE', 'Armadura arcana de proteção ou infiltração.', 'Arcane armor for protection or infiltration.'],
    ['artillerist', 'Artilheiro', 'Artillerist', 'TCE', 'Canhão sobrenatural e magia de artilharia.', 'Eldritch cannon and artillery magic.'],
    ['battlesmith', 'Ferreiro de Batalha', 'Battle Smith', 'TCE', 'Armas mágicas e defensor de aço.', 'Magic weapons and a steel defender.'],
  ],
  barbarian: [
    ['battlerager', 'Furioso de Batalha', 'Battlerager', 'SCAG', 'Combate com armadura de espinhos.', 'Combat with spiked armor.'],
    ['ancestralguardian', 'Guardião Ancestral', 'Ancestral Guardian', 'XGE', 'Espíritos ancestrais protegem aliados.', 'Ancestral spirits protect allies.'],
    ['stormherald', 'Arauto da Tempestade', 'Storm Herald', 'XGE', 'Aura elemental durante a fúria.', 'Elemental aura while raging.'],
    ['zealot', 'Zelote', 'Zealot', 'XGE', 'Fúria divina e persistência além da morte.', 'Divine fury and persistence beyond death.'],
    ['beast', 'Besta', 'Beast', 'TCE', 'Armas naturais durante a fúria.', 'Natural weapons while raging.'],
    ['wildmagic', 'Magia Selvagem', 'Wild Magic', 'TCE', 'Fúria com manifestações mágicas imprevisíveis.', 'Rage with unpredictable magical manifestations.'],
    ['giant', 'Gigante', 'Giant', 'BGG', 'Fúria aumenta o tamanho e fortalece arremessos.', 'Rage increases size and strengthens thrown attacks.'],
  ],
  bard: [
    ['swords', 'Colégio das Espadas', 'College of Swords', 'XGE', 'Floreios de lâmina e combate artístico.', 'Blade flourishes and artistic combat.'],
    ['whispers', 'Colégio dos Sussurros', 'College of Whispers', 'XGE', 'Segredos, identidades e lâminas psíquicas.', 'Secrets, identities, and psychic blades.'],
    ['creation', 'Colégio da Criação', 'College of Creation', 'TCE', 'Canções criam e animam objetos.', 'Songs create and animate objects.'],
    ['eloquence', 'Colégio da Eloquência', 'College of Eloquence', 'TCE', 'Persuasão e inspiração confiável.', 'Persuasion and reliable inspiration.'],
    ['spirits', 'Colégio dos Espíritos', 'College of Spirits', 'VRGR', 'Relatos de espíritos canalizam efeitos mágicos.', 'Spirit tales channel magical effects.'],
  ],
  cleric: [
    ['nature', 'Domínio da Natureza', 'Nature Domain', 'PHB', 'Magia natural e proteção elemental.', 'Nature magic and elemental protection.'],
    ['death', 'Domínio da Morte', 'Death Domain', 'DMG', 'Energia necrótica; depende da aprovação do mestre.', 'Necrotic power; subject to DM approval.'],
    ['arcana', 'Domínio Arcano', 'Arcana Domain', 'SCAG', 'Conjuração divina encontra magia arcana.', 'Divine spellcasting meets arcane magic.'],
    ['forge', 'Domínio da Forja', 'Forge Domain', 'XGE', 'Artesanato sagrado, armadura e fogo.', 'Sacred crafting, armor, and fire.'],
    ['grave', 'Domínio da Sepultura', 'Grave Domain', 'XGE', 'Proteja o limiar entre vida e morte.', 'Protect the boundary between life and death.'],
    ['order', 'Domínio da Ordem', 'Order Domain', 'TCE', 'Comando e coordenação de aliados.', 'Command and ally coordination.'],
    ['peace', 'Domínio da Paz', 'Peace Domain', 'TCE', 'Vínculos protetores entre companheiros.', 'Protective bonds between companions.'],
    ['twilight', 'Domínio do Crepúsculo', 'Twilight Domain', 'TCE', 'Proteção, visão e santuário na penumbra.', 'Protection, sight, and sanctuary in dim light.'],
  ],
  druid: [
    ['shepherd', 'Círculo do Pastor', 'Circle of the Shepherd', 'XGE', 'Totens espirituais e criaturas invocadas.', 'Spirit totems and summoned creatures.'],
  ],
  fighter: [
    ['banneret', 'Cavaleiro do Dragão Púrpura', 'Purple Dragon Knight', 'SCAG', 'Liderança marcial fortalece companheiros.', 'Martial leadership bolsters companions.'],
    ['arcanearcher', 'Arqueiro Arcano', 'Arcane Archer', 'XGE', 'Flechas com efeitos mágicos especiais.', 'Arrows with special magical effects.'],
    ['cavalier', 'Cavaleiro', 'Cavalier', 'XGE', 'Defenda aliados e controle inimigos próximos.', 'Defend allies and control nearby enemies.'],
    ['samurai', 'Samurai', 'Samurai', 'XGE', 'Espírito de combate e disciplina social.', 'Fighting spirit and social discipline.'],
    ['echoknight', 'Cavaleiro do Eco', 'Echo Knight', 'EGW', 'Manifeste um eco para atacar e se reposicionar.', 'Manifest an echo to attack and reposition.'],
    ['psiwarrior', 'Guerreiro Psiônico', 'Psi Warrior', 'TCE', 'Dados psiônicos alimentam ataque, defesa e movimento.', 'Psionic dice fuel attacks, defense, and movement.'],
    ['runeknight', 'Cavaleiro das Runas', 'Rune Knight', 'TCE', 'Runas gigantes e crescimento mágico.', 'Giant runes and magical growth.'],
  ],
  monk: [
    ['longdeath', 'Caminho da Morte Longa', 'Way of the Long Death', 'SCAG', 'Disciplina que transforma a morte em resistência.', 'Discipline that turns death into resilience.'],
    ['sunsoul', 'Caminho da Alma Solar', 'Way of the Sun Soul', 'XGE', 'Ki manifesta energia radiante.', 'Ki manifests radiant energy.'],
    ['drunkenmaster', 'Caminho do Mestre Bêbado', 'Way of the Drunken Master', 'XGE', 'Movimento imprevisível e redirecionamento de ataques.', 'Unpredictable movement and redirected attacks.'],
    ['kensei', 'Caminho do Kensei', 'Way of the Kensei', 'XGE', 'Maestria de armas e precisão marcial.', 'Weapon mastery and martial precision.'],
    ['astralself', 'Caminho do Eu Astral', 'Way of the Astral Self', 'TCE', 'Manifeste uma forma astral com ki.', 'Manifest an astral form with ki.'],
    ['mercy', 'Caminho da Misericórdia', 'Way of Mercy', 'TCE', 'Toques de cura e dano usando ki.', 'Healing and harmful touches using ki.'],
    ['ascendantdragon', 'Caminho do Dragão Ascendente', 'Way of the Ascendant Dragon', 'FTD', 'Sopro, golpes elementais e voo temporário.', 'Breath, elemental strikes, and temporary flight.'],
  ],
  paladin: [
    ['oathbreaker', 'Quebrador de Juramento', 'Oathbreaker', 'DMG', 'Poder sombrio; depende da aprovação do mestre.', 'Dark power; subject to DM approval.'],
    ['crown', 'Juramento da Coroa', 'Oath of the Crown', 'SCAG', 'Lealdade e proteção da linha de frente.', 'Loyalty and frontline protection.'],
    ['conquest', 'Juramento da Conquista', 'Oath of Conquest', 'XGE', 'Medo e domínio do campo de batalha.', 'Fear and battlefield control.'],
    ['redemption', 'Juramento da Redenção', 'Oath of Redemption', 'XGE', 'Diplomacia, proteção e contenção.', 'Diplomacy, protection, and restraint.'],
    ['glory', 'Juramento da Glória', 'Oath of Glory', 'TCE', 'Proezas atléticas e inspiração heroica.', 'Athletic feats and heroic inspiration.'],
    ['watchers', 'Juramento dos Vigilantes', 'Oath of the Watchers', 'TCE', 'Defesa contra ameaças extraplanares.', 'Defense against extraplanar threats.'],
  ],
  ranger: [
    ['gloomstalker', 'Andarilho das Sombras', 'Gloom Stalker', 'XGE', 'Emboscadas, escuridão e primeiro turno ofensivo.', 'Ambushes, darkness, and an offensive opening turn.'],
    ['horizonwalker', 'Andarilho do Horizonte', 'Horizon Walker', 'XGE', 'Energia planar e mobilidade sobrenatural.', 'Planar energy and supernatural mobility.'],
    ['monsterslayer', 'Matador de Monstros', 'Monster Slayer', 'XGE', 'Analise e enfrente ameaças sobrenaturais.', 'Analyze and confront supernatural threats.'],
    ['feywanderer', 'Andarilho Feérico', 'Fey Wanderer', 'TCE', 'Charme feérico e golpes psíquicos.', 'Fey charm and psychic strikes.'],
    ['swarmkeeper', 'Guardião do Enxame', 'Swarmkeeper', 'TCE', 'Um enxame auxilia dano e deslocamento.', 'A swarm assists damage and movement.'],
    ['drakewarden', 'Guardião do Draco', 'Drakewarden', 'FTD', 'Companheiro dracônico que cresce com o patrulheiro.', 'A draconic companion that grows with the ranger.'],
  ],
  rogue: [
    ['mastermind', 'Mentor', 'Mastermind', 'XGE', 'Intriga, disfarces e ajuda tática.', 'Intrigue, disguises, and tactical help.'],
    ['swashbuckler', 'Espadachim', 'Swashbuckler', 'XGE', 'Duelos ágeis e presença carismática.', 'Agile dueling and charismatic presence.'],
    ['inquisitive', 'Inquisitivo', 'Inquisitive', 'XGE', 'Investigação e leitura das intenções inimigas.', 'Investigation and reading enemy intentions.'],
    ['scout', 'Batedor', 'Scout', 'XGE', 'Exploração e mobilidade em escaramuças.', 'Exploration and skirmish mobility.'],
    ['phantom', 'Fantasma', 'Phantom', 'TCE', 'Memórias dos mortos e ecos necróticos.', 'Memories of the dead and necrotic echoes.'],
    ['soulknife', 'Lâmina da Alma', 'Soulknife', 'TCE', 'Lâminas psíquicas e talentos psiônicos.', 'Psychic blades and psionic talents.'],
  ],
  sorcerer: [
    ['shadow', 'Magia das Sombras', 'Shadow Magic', 'XGE', 'Escuridão, sobrevivência e caçador sombrio.', 'Darkness, survival, and a shadowy hound.'],
    ['storm', 'Feitiçaria da Tempestade', 'Storm Sorcery', 'XGE', 'Vento, trovão e relâmpagos.', 'Wind, thunder, and lightning.'],
    ['aberrantmind', 'Mente Aberrante', 'Aberrant Mind', 'TCE', 'Telepatia e conjuração psiônica.', 'Telepathy and psionic spellcasting.'],
    ['clockworksoul', 'Alma Mecânica', 'Clockwork Soul', 'TCE', 'Magia que restaura o equilíbrio e a ordem.', 'Magic that restores balance and order.'],
    ['lunar', 'Feitiçaria Lunar', 'Lunar Sorcery', 'DSDQ', 'Fases lunares alteram a afinidade mágica.', 'Lunar phases alter magical affinity.'],
  ],
  warlock: [
    ['undying', 'O Imortal', 'The Undying', 'SCAG', 'Pacto ligado à persistência além da morte.', 'A pact tied to persistence beyond death.'],
    ['celestial', 'O Celestial', 'The Celestial', 'XGE', 'Luz, cura e poder celestial.', 'Light, healing, and celestial power.'],
    ['hexblade', 'Lâmina Maldita', 'The Hexblade', 'XGE', 'Armas de pacto e maldições.', 'Pact weapons and curses.'],
    ['fathomless', 'O Insondável', 'The Fathomless', 'TCE', 'Tentáculos espectrais e afinidade aquática.', 'Spectral tentacles and aquatic affinity.'],
    ['genie', 'O Gênio', 'The Genie', 'TCE', 'Recipiente mágico e poder elemental do patrono.', 'A magical vessel and the patron’s elemental power.'],
    ['undead', 'O Morto-Vivo', 'The Undead', 'VRGR', 'Forma aterradora e energia necrótica.', 'A dreadful form and necrotic energy.'],
  ],
  wizard: [
    ['conjuration', 'Escola de Conjuração', 'School of Conjuration', 'PHB', 'Crie objetos, invoque criaturas e teleporte-se.', 'Create objects, summon creatures, and teleport.'],
    ['enchantment', 'Escola de Encantamento', 'School of Enchantment', 'PHB', 'Influencie mentes e redirecione ameaças.', 'Influence minds and redirect threats.'],
    ['bladesinging', 'Canção da Lâmina', 'Bladesinging', 'TCE', 'Magia arcana e esgrima com defesa ágil.', 'Arcane magic and swordplay with agile defense.'],
    ['warmagic', 'Magia de Guerra', 'War Magic', 'XGE', 'Deflexão arcana e prontidão tática.', 'Arcane deflection and tactical readiness.'],
    ['scribes', 'Ordem dos Escribas', 'Order of Scribes', 'TCE', 'Grimório desperto e versatilidade de escrita mágica.', 'An awakened spellbook and versatile magical writing.'],
    ['chronurgy', 'Cronurgia', 'Chronurgy Magic', 'EGW', 'Manipule instantes e resultados com magia temporal.', 'Manipulate moments and outcomes with time magic.'],
    ['graviturgy', 'Gravitur gia'.replace(' ', ''), 'Graviturgy Magic', 'EGW', 'Manipule peso, gravidade e movimento.', 'Manipulate weight, gravity, and movement.'],
  ],
};

export const EXTRA_SUBCLASSES = Object.fromEntries(Object.entries(subclasses).map(([classId, rows]) => [classId,
  rows.map(([id, pt, en, source, descPt, descEn]) => ({ id, name: bilingual(pt, en), source,
    desc: bilingual(descPt, descEn), features: [], manualFeatures: true })),
]));
