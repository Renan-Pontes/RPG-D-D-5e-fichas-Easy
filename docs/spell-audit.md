# Auditoria das magias (SRD 5.2.1 e SRD 5.1)

Conferência: 14/11/2026. Testes: `frontend/tests/spell-text-srd.test.js`, `frontend/tests/spells-extra.test.js`, `frontend/tests/party-metrics.test.js`.

## SRD 5.2.1 — fichas 2024 (`data/srd2024-spells.json`, 339 magias)

- Fonte: `public/rules/SRD-5.2.1.pdf` (texto extraído com `pdftotext`).
- Cada frase do texto e cada tempo de conjuração, alcance, componentes e duração foi
  procurado no PDF (comparação só por letras e números): **339 de 339 batem**.
- Na volta (frases do PDF que faltariam no app) não sobrou omissão real: o que apareceu foi
  intercalação de colunas da extração.
- Corrigido o formato herdado da extração: tabulação no lugar de parágrafo (608), espaços
  duplos (3.280), palavras partidas no fim da linha (`condi-tion`, `Dark-ness`, `demi-plane`),
  cabeçalhos de tabela fora do lugar e a linha "1" sem número na tabela de Confusão.
- Tabelas refeitas em linhas `coluna | coluna`: Confusão, Reencarnação, Controlar o Clima,
  Vidência e Teletransporte. Fichas de criatura (Animar Objetos, Encontrar Montaria, Inseto
  Gigante, Invocar Dragão) com um campo por linha, e o nome "Otherworldly Steed" separado.

## SRD 5.1 — fichas 2014 (`data/srd51-spells-meta.json` + `srd51-spells-text.json`, 319 magias)

- Fonte: SRD 5.1 (CC-BY 4.0) em Markdown, do acervo local do GM Craft
  (`oldmanumby-dnd.srd.5.1`).
- Antes: as fichas 2014 mostravam resumos curtos e, ao abrir a magia, o texto **de 2024**.
  Agora as 309 magias do catálogo 2014 que estão no SRD 5.1 usam a ficha técnica oficial
  (círculo, escola, tempo, alcance, componentes, duração, ritual, concentração) e o texto
  integral do SRD 5.1. 210 dessas tinham pelo menos um campo diferente do oficial.
- Em português, tanto o catálogo 2024 (`frontend/data/srd2024-spells-pt.json`, `frontend/data/spells-extra.js`: **536 magias**) quanto o catálogo 2014 (`frontend/data/srd.js`, `frontend/data/srd51-spells-text.json`, `frontend/data/spells-extra.js`: **520 magias**) agora contam com textos integrais 1:1 em inglês e tradução métrica em português (`metros`, `PV`, `salvaguarda`), com `frontend/data/spell-tags.json` regenerado via `scripts/build-spell-tags.mjs`.

## Fora do SRD (Catálogo Completo via Acervo Offline GM Craft)

- As **211 magias** do catálogo 2014 e as magias extras do catálogo 2024 fora do SRD 5.1/5.2.1 foram integralmente populadas 1:1 (EN + PT-BR métrico) e auditadas quanto à fidelidade de metadados e ausência de vazamento de marcação (`{@`, `**`, HTML). Veja `public/rules/README.md` para notas sobre o SRD público.

## Inventário das fontes fora do SRD

Conferido e populado 1:1 a partir do acervo offline do GM Craft (sem abreviações ou resumos incompletos nos dados do app). Metadados base 2014 em `frontend/data/spells-2014-meta.json` (211 magias).

- **Player’s Handbook** (63): Arcane Gate, Arcanist’s Magic Aura, Armor of Agathys, Arms of Hadar, Aura of Life, Aura of Purity, Aura of Vitality, Banishing Smite, Beast Sense, Blade Ward, Blinding Smite, Branding Smite, Chromatic Orb, Circle of Power, Cloud of Daggers, Compelled Duel, Conjure Barrage, Conjure Volley, Cordon of Arrows, Crown of Madness, Crusader's Mantle, Destructive Wave, Dissonant Whispers, Elemental Weapon, Ensnaring Strike, Feign Death, Friends, Grasping Vine, Hail of Thorns, Hunger of Hadar, Lightning Arrow, Phantasmal Force, Power Word Heal, Searing Smite, Staggering Smite, Swift Quiver, Telepathy, Thorn Whip, Thunderous Smite, Tsunami, Witch Bolt, Wrathful Smite, armorOfAgathys, bladeWard, cloudOfDaggers, createDestroyWater, feignDeath, friends, graspingVine, healSpell, hex, huntersMark, locateAnimalsPlants, protectionFromEvilGood, rayOfSickness, sendingSpell, slowSpell, symbolSpell, thornWhip, thunderousSmite, wishSpell, witchBolt, wrathfulSmite
- **Xanathar’s Guide to Everything** (51): Catnap, Cause Fear, Ceremony, Charm Monster, Create Homunculus, Crown of Stars, Danse Macabre, Dawn, Dragon’s Breath, Druid Grove, Enemies Abound, Enervation, Far Step, Find Greater Steed, Guardian of Nature, Healing Spirit, Holy Weapon, Illusory Dragon, Infernal Calling, Infestation, Invulnerability, Life Transference, Maddening Darkness, Mass Polymorph, Mental Prison, Mighty Fortress, Mind Spike, Negative Energy Flood, Power Word Pain, Primal Savagery, Psychic Scream, Scatter, Shadow Blade, Shadow of Moil, Sickening Radiance, Skill Empowerment, Snare, Soul Cage, Steel Wind Strike, Summon Greater Demon, Summon Lesser Demons, Synaptic Static, Temple of the Gods, Tenser's Transformation, Thunder Step, Tiny Servant, Toll the Dead, Wall of Light, Word of Radiance, Wrath of Nature, Zephyr Strike
- **Princes of the Apocalypse** (43): Abi-Dalzim's Horrid Wilting, Absorb Elements, Aganazzar's Scorcher, Beast Bond, Bones of the Earth, Catapult, Control Flames, Control Winds, Create Bonfire, Dust Devil, Earth Tremor, Earthbind, Elemental Bane, Erupting Earth, Flame Arrows, Frostbite, Gust, Ice Knife, Immolation, Investiture of Flame, Investiture of Ice, Investiture of Stone, Investiture of Wind, Maelstrom, Magic Stone, Maximilian's Earthen Grasp, Melf's Minute Meteors, Mold Earth, Primordial Ward, Pyrotechnics, Shape Water, Skywrite, Snilloc's Snowball Swarm, Storm Sphere, Thunderclap, Tidal Wave, Transmute Rock, Vitriolic Sphere, Wall of Sand, Wall of Water, Warding Wind, Watery Sphere, Whirlwind
- **Tasha’s Cauldron of Everything** (17): Blade Of Disaster, Dream Of The Blue Veil, Intellect Fortress, Mind Sliver, Spirit Shroud, Summon Aberration, Summon Beast, Summon Celestial, Summon Construct, Summon Elemental, Summon Fey, Summon Fiend, Summon Shadowspawn, Summon Undead, Tasha's Caustic Brew, Tasha's Mind Whip, Tasha's Otherworldly Guise
- **Explorer’s Guide to Wildemount** (15): Dark Star, Fortune's Favor, Gift of Alacrity, Gravity Fissure, Gravity Sinkhole, Immovable Object, Magnify Gravity, Pulse Wave, Ravenous Void, Reality Break, Sapping Sting, Temporal Shunt, Tether Essence, Time Ravage, Wristpocket
- **Acquisitions Incorporated** (7): Distort Value, Fast Friends, Gift of Gab, Incite Greed, Jim's Glowing Coin, Jim's Magic Missile, Motivational Speech
- **Fizban's Treasury of Dragons** (7): Ashardalon's Stride, Draconic Transformation, Fizban's Platinum Shield, Nathair's Mischief, Raulothim's Psychic Lance, Rime's Binding Ice, Summon Draconic Spirit
- **PHB 2024 (sem fonte no acervo)** (6): Arcane Vigor, Fount of Moonlight, Jallarzi's Storm of Radiance, Power Word Fortify, Tasha's Bubbling Cauldron, Yolande's Regal Presence
- **Strixhaven: A Curriculum Of Chaos** (5): Borrowed Knowledge, Kinetic Jaunt, Silvery Barbs, Vortex Warp, Wither and Bloom
- **Sword Coast Adventurer’s Guide** (4): Booming Blade, Green-Flame Blade, Lightning Lure, Sword Burst
- **The Book of Many Things** (3): Antagonize, Spirit of Death, Spray of Cards
- **LLK** (3): Flock of Familiars, Galder's Speedy Courier, Galder's Tower
- **Guildmasters’ Guide to Ravnica** (2): Chaos Bolt, Encode Thoughts
- **Icewind Dale: Rime of the Frostmaiden** (2): Create Magen, Frost Fingers
- **Astral Adventurer's Guide** (2): Air Bubble, Create Spelljamming Helm
- **Sigil and the Outlands** (2): Gate Seal, Warp Sense

Correções de ficha técnica (fichas 2014 que usavam dados de 2024 ou errados): 34 magias, ex.: Thunderous Smite (ação bônus, só V, 1 minuto), Mind Spike (60 pés no XGE), Staggering Smite e Hail of Thorns (concentração), Banishing Smite (abjuração).
No catálogo 2024: Bones of the Earth com V, S (XGE). No SRD 5.2.1, 23 magias tinham alcance, componentes ou duração quebrados pela extração do PDF (ex.: "Touch Component: V, S", primeiro parágrafo dentro da duração) — corrigidos.
