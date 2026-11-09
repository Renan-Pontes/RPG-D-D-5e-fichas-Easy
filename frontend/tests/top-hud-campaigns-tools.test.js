import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

test('Top HUD Roll Banner: posicionado no topo da tela com suporte expandido para tipos de ataque', () => {
  const diceRollerSrc = read('../components/DiceRoller.jsx');
  const css = read('../src/dice/dice-styles.css');

  // getAttackSubtype suporta melee, ranged, spell, unarmed, weapon e generic
  assert.match(diceRollerSrc, /const getAttackSubtype =/);
  assert.match(diceRollerSrc, /desarmad\|unarmed/i);
  assert.match(diceRollerSrc, /magia\|spell/i);
  assert.match(diceRollerSrc, /corpo a corpo\|melee/i);
  assert.match(diceRollerSrc, /dist\[aâ\]ncia\|ranged/i);
  assert.match(diceRollerSrc, /arma\|weapon/i);

  // renderTopHudBanner exporta os banners no topo
  assert.match(diceRollerSrc, /renderTopHudBanner\(overlay, lang\)/);
  assert.match(diceRollerSrc, /dice-top-hud-banner/);

  // CSS posiciona no topo absoluto com fixed e z-index 10005
  assert.match(css, /\.dice-top-hud-banner \{[^}]*position:\s*fixed !important;[^}]*top:\s*max\(24px,\s*env\(safe-area-inset-top,\s*24px\)\)\s*!important;/);
  assert.match(css, /z-index:\s*10005\s*!important;/);

  // Estilos dedicados para cada subtipo de ataque
  assert.match(css, /\.dice-top-hud-banner\.is-attack-melee/);
  assert.match(css, /\.dice-top-hud-banner\.is-attack-ranged/);
  assert.match(css, /\.dice-top-hud-banner\.is-attack-spell/);
  assert.match(css, /\.dice-top-hud-banner\.is-attack-unarmed/);
  assert.match(css, /\.dice-top-hud-banner\.is-attack-weapon/);
  assert.match(css, /\.dice-top-hud-banner\.is-attack-generic/);
});

test('N:N Multi-Campanhas e N Personagens por Usuário: suporte a múltiplos personagens na mesma mesa e toggle NPC pelo mestre', () => {
  const campViews = read('../../backend/api/views_campaigns.py');
  const charViews = read('../../backend/api/views_characters.py');
  const modelsSrc = read('../../backend/api/models.py');
  const playersPanelSrc = read('../src/group/PlayersPanel.jsx');

  // models.py: não possui unique_together de (campaign, user)
  assert.ok(!modelsSrc.includes("unique_together = [('campaign', 'user')]"));
  assert.match(modelsSrc, /char_type = models\.CharField/);
  assert.match(modelsSrc, /is_npc = models\.BooleanField/);

  // Em campaign_join: verifica duplicata do mesmo personagem, permitindo múltiplos personagens do mesmo usuário
  assert.match(campViews, /Membership\.objects\.filter\(campaign=campaign,\s*character=char\)\.first\(\)/);
  assert.ok(!campViews.includes('_other_seats(char)'), 'Não deve ejetar de outras campanhas');

  // Em membership_update: verifica duplicata apenas do mesmo personagem
  assert.match(campViews, /Membership\.objects\.filter\(campaign=campaign,\s*character=char\)\.exclude\(pk=m\.id\)\.first\(\)/);

  // coverUrl, coverImage, isNpc repassados no payload de character_campaigns
  assert.match(charViews, /'coverImage':\s*m\.campaign\.cover_image\s*or\s*''/);
  assert.match(charViews, /'coverUrl':/);
  assert.match(charViews, /'isNpc':/);

  // PlayersPanel permite ao DM definir personagem como Jogador Ativo ou NPC
  assert.match(playersPanelSrc, /toggle-npc/);
  assert.match(playersPanelSrc, /grp-card-npc-badge/);
});

test('Aba Perícias e Características: paridade de ações, remoção de redundâncias e exposição de perícias treinadas', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  const css = read('../src/sheet/ficha.css');

  // Importa computeActionGroupData e ACTION_SKILL_GROUPS
  assert.match(sheetSrc, /import \{[^}]*ACTION_SKILL_GROUPS,[^}]*computeActionGroupData/);
  assert.match(sheetSrc, /TOOL_ABILITY_MAP/);

  // SheetSkills calcula grupos com computeActionGroupData
  assert.match(sheetSrc, /computeActionGroupData\(grp,\s*char\.abilities/);

  // Botões de rolagem direta na linha do cabeçalho da ação
  assert.match(sheetSrc, /statblock-action-header-roll-btn/);

  // Exposição parcial de perícias apenas treinadas/proficientes
  assert.match(sheetSrc, /trainedSkills\s*=\s*\(grp\.skills \|\| \[\]\)\.filter/);

  // Botão Expandir todas as ações e Passive Perception removidos do cabeçalho de Skills
  assert.ok(!sheetSrc.includes('fh-skills-collapse-all'));
  assert.ok(!sheetSrc.includes('Passive Perception'));

  // 5º Grupo de Ação: Usar Ferramenta (Use Tool) com ícone 🛠️
  assert.match(sheetSrc, /🛠️/);
  assert.match(sheetSrc, /Usar Ferramenta/);
  assert.match(sheetSrc, /Use Tool/);
  assert.match(sheetSrc, /toolItems\.map/);

  // Idiomas e Proficiências de Ferramentas (SheetTools) no escopo correto da aba Características
  assert.match(sheetSrc, /export const SheetFeatures =/);
  assert.match(sheetSrc, /<SheetTools char=\{char\}/);

  // CSS com espaçamento reduzido entre grupos de ações
  assert.match(css, /\.ficha \.fh-skill-categories-grid \{[^}]*gap:\s*4px;/);
});

test('Hero Header e Escopo de Progressão: medalha de campanhas 48px, inspiração unificada, idiomas no subtítulo, ações no canto inferior direito e progressão apenas em Play', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  const css = read('../src/sheet/ficha.css');

  // Cluster superior esquerdo: Medalha do Retrato -> Nível -> Campanhas -> Inspiração
  assert.match(sheetSrc, /fh-hero-top-left-cluster/);
  assert.match(sheetSrc, /fh-hero-portrait-medal/);
  assert.match(sheetSrc, /CampaignSealButton/);
  assert.match(sheetSrc, /hero-camp fh-seal/);
  assert.match(sheetSrc, /InspirationSealButton/);
  assert.match(sheetSrc, /hero-insp fh-seal/);

  // Subtítulo do Herói expõe idiomas falados
  assert.match(sheetSrc, /langsText/);
  assert.match(sheetSrc, /Fala /);
  assert.match(sheetSrc, /Speaks /);

  // Ações Exportar, Editar e Trapaça ancoradas no rodapé junto com as tags em linha única
  assert.match(sheetSrc, /fh-hero-corner-actions/);
  assert.match(sheetSrc, /fh-corner-chip/);
  assert.match(css, /\.ficha \.fh-hero-tags-actions-bar/);
  assert.match(css, /\.ficha \.fh-hero-corner-actions/);

  // Quadrilátero de Selos Circulares de 48px
  assert.match(css, /\.ficha \.fh-hero-top-left-cluster \.fh-seal \{[^}]*width:\s*48px;\s*height:\s*48px;/);
  assert.match(css, /\.ficha \.fh-seal\.hero-camp/);
  assert.match(css, /\.hero-camp-pip/);
  assert.match(css, /\.ficha \.fh-seal\.hero-insp/);
  assert.match(css, /\.hero-insp-pip/);

  // Progressão da Ficha (children) restrita estritamente à aba 'play'
  assert.match(sheetSrc, /\{tab === 'play' && \([\s\S]*?\{children && <div className="fh-after no-print">\{children\}<\/div>\}/);
});
