import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { playerTables, seatState } from '../src/sheet/campaign-link.js';

const read = (relPath) => readFileSync(new URL(relPath, import.meta.url), 'utf8');

test('Multi-personagem: DMs e Jogadores podem ter múltiplas fichas ativas na mesma mesa sem sobrescrever', () => {
  const backendCampaigns = read('../../backend/api/views_campaigns.py');
  const backendCharacters = read('../../backend/api/views_characters.py');
  const backendSerializers = read('../../backend/api/serializers.py');
  const linkModal = read('../src/sheet/CampaignLinkModal.jsx');
  const playersPanel = read('../src/group/PlayersPanel.jsx');

  // Backend views não bloqueiam mais o mestre com dm_cannot_be_player ao vincular ou criar com código
  assert.ok(!backendCampaigns.includes("if campaign.dm_id == request.user.id:\n            return Response(DM_CANNOT_PLAY"));
  assert.ok(!backendCampaigns.includes("if m.user_id == campaign.dm_id:\n            return Response(DM_CANNOT_PLAY"));
  assert.ok(!backendCharacters.includes("if campaign.dm_id == request.user.id:  # o mestre não joga com ficha"));

  // Serializer disponibiliza myMemberships tanto para jogadores quanto para o mestre
  assert.match(backendSerializers, /m_list = self\._mine_list\(instance\)/);
  assert.match(backendSerializers, /data\['myMemberships'\] =/);

  // CampaignLinkModal chama joinCampaign quando o usuário já possui outra ficha na mesa, criando vaga nova
  assert.match(linkModal, /const emptySeat = memberships\.find\(m => m\.characterId == null && m\.role !== 'dm'\);/);
  assert.match(linkModal, /res = await api\.joinCampaign\(\{[^}]*campaignId: table\.id,[^}]*characterId: char\.id[^}]*\}\);/);

  // PlayersPanel inclui personagens com ficha mesmo pertencentes ao mestre
  assert.match(playersPanel, /const dm = members\.find\(m => m\.role === 'dm' && !m\.character\);/);
  assert.match(playersPanel, /const players = members\.filter\(m => m\.character != null \|\| m\.role !== 'dm'\);/);

  // PlayersPanel oferece botão de adicionar personagem direto da mesa
  assert.match(playersPanel, /grp-add-char-btn/);
  assert.match(playersPanel, /Adicionar Personagem/);
  assert.match(playersPanel, /Add Character/);
  assert.match(playersPanel, /function AddCharacterSheet/);
});

test('playerTables e seatState suportam mesas do mestre e múltiplos personagens', () => {
  const tables = [
    { id: 1, name: 'Stormwreck Isles', role: 'dm', status: 'active', myMemberships: [{ id: 10, characterId: 101, characterName: 'Angel Schwitz' }] },
    { id: 2, name: 'Avernus', role: 'player', status: 'active', myMemberships: [{ id: 20, characterId: 201, characterName: 'Topov' }] },
    { id: 3, name: 'Encerrada', role: 'player', status: 'closed' },
  ];

  // playerTables inclui as mesas ativas (tanto onde joga quanto onde mestra)
  const available = playerTables(tables);
  assert.equal(available.length, 2);
  assert.deepEqual(available.map(t => t.id), [2, 1]); // Ordem alfabética: Avernus, Stormwreck

  // seatState detecta quando o usuário já tem outra ficha e permite adicionar outra
  const stateAngel = seatState(tables[0], 101);
  assert.equal(stateAngel.kind, 'this');

  const stateTopovInStormwreck = seatState(tables[0], 102);
  assert.equal(stateTopovInStormwreck.kind, 'other');
  assert.equal(stateTopovInStormwreck.name, 'Angel Schwitz');
});

test('Inspiração no topo: selo circular 48px, sem rótulo de texto, alinhado e pip no quadrilátero de selos', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  const css = read('../src/sheet/ficha.css');

  // Inspiração componente InspirationSealButton existe
  assert.match(sheetSrc, /const InspirationSealButton =/);
  assert.match(sheetSrc, /hero-insp fh-seal/);
  // Sem rótulo de texto como "INSPIRATION" dentro ou abaixo
  assert.ok(!sheetSrc.includes('<span className="fh-insp-label">'));

  // Barra da campanha em cima do nome; linha do nome: Retrato -> Nível -> Inspiração -> Nome
  // (tudo o que muda de campanha para campanha fica junto do nome).
  const barIdx = sheetSrc.indexOf('<HeroCampaignBar');
  const rowIdx = sheetSrc.indexOf('fh-hero-name-row', barIdx);
  const nameIdx = sheetSrc.indexOf('className={char.name ?', rowIdx);
  const row = sheetSrc.slice(rowIdx, nameIdx);
  assert.ok(barIdx > 0 && rowIdx > barIdx);
  assert.ok(row.indexOf('fh-hero-portrait-medal') > 0);
  assert.ok(row.indexOf('LevelUpButton') > row.indexOf('fh-hero-portrait-medal'));
  assert.ok(row.indexOf('InspirationSealButton') > row.indexOf('LevelUpButton'));

  // CSS: escala 48px e pip no quadrilátero tangente
  assert.match(css, /\.ficha \.fh-seal\.hero-insp/);
  assert.match(css, /\.ficha \.fh-seal\.hero-insp \.hero-insp-pip \{[^}]*position:\s*absolute;[^}]*top:\s*-2px;[^}]*right:\s*-2px;/);
  assert.match(css, /\.ficha \.fh-seal\.hero-insp\.is-inspired/);
});

test('Ações no canto superior direito do painel (Cheat -> Edit -> Export) e descansos sob idiomas', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  const css = read('../src/sheet/ficha.css');

  // fh-hero-tools no topo direito na ordem Cheat -> Edit -> Export, Edit e Export somente ícone
  const toolsStart = sheetSrc.indexOf('<div className="fh-hero-tools');
  const toolsEnd = sheetSrc.indexOf('</div>', toolsStart);
  const toolsHtml = sheetSrc.slice(toolsStart, toolsEnd);
  const cheatIdx = toolsHtml.indexOf('setCheatOpen(true)');
  const editIdx = toolsHtml.indexOf('onClick={onEdit}');
  const exportIdx = toolsHtml.indexOf('setExportOpen(true)');
  assert.ok(cheatIdx > 0 && editIdx > cheatIdx && exportIdx > editIdx, 'Ordem deve ser Cheat -> Edit -> Export');

  // Sem tags de alinhamento, nome do jogador ou marcos no painel do herói
  assert.ok(!sheetSrc.includes('hero-alignment-tag'), 'Não deve exibir tag de alinhamento no painel do herói');
  assert.ok(!sheetSrc.includes('<div className="hero-tags">'), 'Não deve existir container hero-tags no painel do herói');

  // Descanso curto e longo na linha imediatamente abaixo dos idiomas
  const langsIdx = sheetSrc.indexOf('fh-hero-row is-langs');
  const restIdx = sheetSrc.indexOf('<RestButtons char={char} lang={lang} update={update} />');
  assert.ok(langsIdx > 0 && restIdx > langsIdx, 'RestButtons deve vir na linha abaixo dos idiomas');

  // CSS garante posicionamento no canto superior direito
  assert.match(css, /\.ficha \.fh-hero-tools/);
});

test('Perícias padrão parcialmente recolhidas: expõem apenas perícias treinadas divergentes do baseline', () => {
  const sheetSrc = read('../components/Sheet.jsx');

  // Todas as 5 categorias de ações começam collapsed = true
  assert.match(sheetSrc, /const \[collapsed, setCollapsed\] = useState\(\{\s*search:\s*true,\s*hide:\s*true,\s*influence:\s*true,\s*study:\s*true,\s*tools:\s*true,\s*\}\);/);

  // trainedSkills filtra proficientes que não tenham os mesmos números do consolidado
  assert.match(sheetSrc, /const isDisclosedOnConsolidatedPanel = \(sk\.passive === grp\.baselinePassive && sk\.bonusStr === grp\.baselineBonusStr\);/);
  assert.match(sheetSrc, /return !isDisclosedOnConsolidatedPanel;/);
});
