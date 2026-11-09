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

test('N:N Multi-Campanhas: backend permite o mesmo personagem em N campanhas distintas, proibindo apenas duplicata na mesma campanha', () => {
  const campViews = read('../../backend/api/views_campaigns.py');
  const charViews = read('../../backend/api/views_characters.py');

  // Em campaign_join: verifica duplicata apenas na campanha alvo
  assert.match(campViews, /Membership\.objects\.filter\(campaign=campaign,\s*character=char\)\.exclude\(user=request\.user\)\.first\(\)/);
  assert.ok(!campViews.includes('_other_seats(char)'), 'Não deve ejetar de outras campanhas');

  // Em membership_update: verifica duplicata apenas dentro da mesma campanha
  assert.match(campViews, /Membership\.objects\.filter\(campaign=campaign,\s*character=char\)\.exclude\(pk=m\.id\)\.first\(\)/);

  // coverImage é repassado no payload de character_campaigns
  assert.match(charViews, /'coverImage':\s*m\.campaign\.cover_image\s*or\s*''/);
});

test('Aba Perícias: paridade visual e funcional com bloco de monstros em 4 ações + 5ª ação Usar Ferramenta', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  const css = read('../src/sheet/ficha.css');

  // Importa computeActionGroupData e ACTION_SKILL_GROUPS
  assert.match(sheetSrc, /import \{[^}]*ACTION_SKILL_GROUPS,[^}]*computeActionGroupData/);
  assert.match(sheetSrc, /TOOL_ABILITY_MAP/);

  // SheetSkills calcula grupos com computeActionGroupData
  assert.match(sheetSrc, /computeActionGroupData\(grp,\s*char\.abilities/);

  // Botões de rolagem direta na linha do cabeçalho da ação
  assert.match(sheetSrc, /statblock-action-header-roll-btn/);

  // Exceções e detalhes dobráveis com grid de 2 colunas
  const mbCss = read('../src/combat/monster-statblock.css');
  assert.match(mbCss, /\.statblock-action-grid \{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr 1fr;/);

  // 5º Grupo de Ação: Usar Ferramenta (Use Tool) com ícone 🛠️
  assert.match(sheetSrc, /🛠️/);
  assert.match(sheetSrc, /Ação: Usar Ferramenta|Action: Use Tool/);
  assert.match(sheetSrc, /toolItems\.map/);
});

test('Hero Header: agrupamento superior esquerdo de medalha, nível e badge minimalista com contagem de campanhas', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  const css = read('../src/sheet/ficha.css');

  // Cluster superior esquerdo
  assert.match(sheetSrc, /fh-hero-top-left-cluster/);
  assert.match(sheetSrc, /fh-hero-portrait-medal/);
  assert.match(sheetSrc, /fh-hero-camp-badge/);

  // Badge exibe contagem de campanhas
  assert.match(sheetSrc, /campaignsList\.length/);

  // Acordeões inferiores de Subclasse e Progressão no rodapé do herói
  assert.match(sheetSrc, /fh-hero-bottom-accordions/);
  assert.match(sheetSrc, /fh-hero-accordion/);
  assert.match(sheetSrc, /SubclassBanner/);
  assert.match(sheetSrc, /SpeciesBanner/);

  // CSS posiciona o cluster e estiliza o painel retrátil de campanhas
  assert.match(css, /\.fh-hero-top-left-cluster/);
  assert.match(css, /\.fh-hero-camp-badge/);
  assert.match(css, /\.fh-hero-campaigns-panel/);
  assert.match(css, /\.fh-hero-campaign-card/);
});
