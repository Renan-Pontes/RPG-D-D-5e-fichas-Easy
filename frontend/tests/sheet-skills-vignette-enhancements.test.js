import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeAnticipationProfile, computeFalloffProfile } from '../src/dice/dice-rollup.js';

const read = (relPath) => readFileSync(new URL(relPath, import.meta.url), 'utf8');

test('Item 1: Texto de ficha pessoal e modo campanha encapsulados dentro do painel do herói', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  // campaignBanner é passado ao SheetHero
  assert.match(sheetSrc, /campaignBanner=\{/);
  // Dentro de SheetHero, campaignBanner é renderizado dentro do corpo do painel do herói
  // (a barra única da campanha, com a lista de cópias, fica no corpo do painel do herói)
  assert.match(sheetSrc, /<div className="fh-hero-body">[\s\S]*?<HeroCampaignBar/);
  // Não há mais CampaignModeBanner solto entre as abas e os banners
  assert.ok(!sheetSrc.includes('<CampaignModeBanner char={char} lang={lang} onChange={onUpdate} rev={campRev}'));
});

test('Item 2: Banner de Teste de Atributo (Ability Check) com iconografia 🎯 espelhando o Teste de Resistência', () => {
  const rollerSrc = read('../components/DiceRoller.jsx');
  assert.match(rollerSrc, /dice-check-target-banner/);
  assert.match(rollerSrc, /🎯/);
  assert.match(rollerSrc, /Teste de Atributo/);
  assert.match(rollerSrc, /Ability Check/);
  assert.match(rollerSrc, /isCheck/);

  const css = read('../src/dice/dice-styles.css');
  assert.match(css, /\.dice-check-target-banner/);
  assert.match(css, /\.dice-check-target-icon/);
  assert.match(css, /\.dice-check-target-title/);
});

test('Item 3: Subclasse e Progressão consolidadas estritamente na aba Jogar (Play) e características na aba Features', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  const tabsSrc = read('../components/SheetTabs.jsx');

  // SubclassBanner e SpeciesBanner consolidados estritamente dentro da aba play
  assert.match(sheetSrc, /\{tab === 'play' && \([\s\S]*?<SubclassBanner char=\{char\} lang=\{lang\} update=\{update\} \/>/);
  assert.match(sheetSrc, /\{tab === 'play' && \([\s\S]*?<SpeciesBanner char=\{char\} lang=\{lang\} update=\{update\} \/>/);
  // Progressão só na aba Jogar: entra como painel da própria aba (abaixo de Recursos)
  assert.match(sheetSrc, /\{tab === 'play' && \([\s\S]*?after=\{children \|\| null\}/);
  assert.match(sheetSrc, /after && \{ h: PLAY_H\.progression, el: <div key="progression" className="fh-after no-print">\{after\}<\/div> \}/);

  // SpeciesTraits NÃO está mais no final de SheetStory
  const storyEnd = tabsSrc.slice(tabsSrc.indexOf('const SheetStory ='), tabsSrc.indexOf('// ===== Notes / Journal ====='));
  assert.ok(!storyEnd.includes('<SpeciesTraits char={char}'), 'SheetStory não deve ter SpeciesTraits');

  // SpeciesTraits está presente na aba Características (SheetFeatures)
  // (embutido no nível 1 da linha do tempo da aba Características)
  const featuresBody = sheetSrc.slice(sheetSrc.indexOf('const FeatureTimeline ='));
  assert.match(featuresBody, /<SpeciesTraits char=\{char\} lang=\{lang\} update=\{update\} race=\{race\} hideTraits embedded \/>/);
});

test('Item 4: Juiciness do roll-up: brilho progressivo, faíscas cintilantes e dispersão pela onda de choque da explosão', () => {
  // Anticipation profile calcula chargeGlow e sparksEmit
  const pStart = computeAnticipationProfile(0.1);
  const pLate = computeAnticipationProfile(0.95);
  assert.equal(pStart.chargeGlow, 0);
  assert.ok(pLate.chargeGlow > 0.8, 'Brilho deve crescer intensamente no clímax');
  assert.ok(pLate.sparksEmit > 0.7, 'Faíscas devem emitir intensamente perto do clímax');

  // Falloff profile calcula dispersão das faíscas pela explosão do ripple
  const fStart = computeFalloffProfile(0.02);
  const fEnd = computeFalloffProfile(0.40);
  assert.ok(fStart.sparksOpacity > 0.8, 'Faíscas ainda visíveis no instante da explosão');
  assert.equal(fEnd.sparksOpacity, 0, 'Faíscas devem se extinguir rapidamente após a onda de choque');
  assert.equal(fEnd.sparksBlown, 1, 'Faíscas são totalmente dispersadas');

  // Emitter e faíscas no DieShape e CSS
  const dieShapeSrc = read('../src/dice/DieShape.jsx');
  assert.match(dieShapeSrc, /die-sparks-emitter/);
  assert.match(dieShapeSrc, /die-spark/);

  const css = read('../src/dice/dice-styles.css');
  assert.match(css, /\.die-sparks-emitter/);
  assert.match(css, /\.die-spark/);
  assert.match(css, /@keyframes spark-twinkle/);
});

test('Item 5: 18 Perícias reorganizadas em 4 linhas canônicas (Search, Hide, Influence, Study)', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  assert.match(sheetSrc, /export const SKILL_GROUPS\s*=\s*\[/);
  assert.match(sheetSrc, /id:\s*'search'/);
  assert.match(sheetSrc, /id:\s*'hide'/);
  assert.match(sheetSrc, /id:\s*'influence'/);
  assert.match(sheetSrc, /id:\s*'study'/);

  // Verifica que todas as 18 perícias do SRD estão listadas nos grupos
  for (const skill of [
    'insight', 'perception', 'survival',
    'stealth', 'sleightOfHand', 'acrobatics', 'athletics',
    'performance', 'deception', 'persuasion', 'intimidation', 'animalHandling',
    'arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'
  ]) {
    assert.match(sheetSrc, new RegExp(`['"]${skill}['"]`), `Perícia ${skill} deve estar nos grupos`);
  }
});

test('Item 6: Perícias divulgam pontuação Passiva e Bônus Ativo lado a lado', () => {
  const checksSrc = read('../src/sheet/FhChecks.jsx');
  assert.match(checksSrc, /passive/);
  assert.match(checksSrc, /fh-skill-scores/);
  assert.match(checksSrc, /fh-skill-pass/);
  assert.match(checksSrc, /fh-skill-mod/);

  const fichaCss = read('../src/sheet/ficha.css');
  assert.match(fichaCss, /\.fh-skill-scores/);
  assert.match(fichaCss, /\.fh-skill-pass/);
  assert.match(fichaCss, /\.fh-skill-mod/);
});

test('Item 7: Remoção do fundo xadrez (checkered vignette) do roll-up mantendo o banner de escudo e feedback crítico', () => {
  const rollerSrc = read('../components/DiceRoller.jsx');
  assert.ok(!rollerSrc.includes('dice-save-checkered-vignette'), 'DiceRoller não deve renderizar dice-save-checkered-vignette');
  assert.match(rollerSrc, /dice-save-shield-banner/);

  const css = read('../src/dice/dice-styles.css');
  assert.ok(!css.includes('.dice-save-checkered-vignette'), 'dice-styles.css não deve conter .dice-save-checkered-vignette');
  assert.match(css, /.dice-save-shield-banner/);
});

test('Item 8: Sequência canônica de 9 abas (tools consolidada em skills) no SHEET_TABS', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  assert.match(sheetSrc, /export const SHEET_TABS\s*=\s*\[/);

  const tabsBlock = sheetSrc.slice(sheetSrc.indexOf('export const SHEET_TABS'), sheetSrc.indexOf('];', sheetSrc.indexOf('export const SHEET_TABS')));
  const tabIds = [...tabsBlock.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);

  const expectedTabs = ['play', 'stats', 'skills', 'features', 'spells', 'inv', 'story', 'notes', 'npcs'];
  assert.deepEqual(tabIds, expectedTabs, 'A ordem de SHEET_TABS deve corresponder exatamente à sequência esperada');
});

test('Item 9: Grade de perícias dobrável/recolhível por ação e aba Ferramentas consolidada em Características', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  assert.match(sheetSrc, /const \[collapsed, setCollapsed\] = useState/);
  assert.match(sheetSrc, /toggleGroup/);
  assert.match(sheetSrc, /fh-skill-group-chevron/);
  assert.match(sheetSrc, /aria-expanded=/);

  // Botão Expandir todas as ações e Passive Perception removidos por redundância
  assert.ok(!sheetSrc.includes('fh-skills-collapse-all'));

  // SheetTools transferido do escopo de Perícias para Características (SheetFeatures)
  const featuresBody = sheetSrc.slice(sheetSrc.indexOf('const FeatureTimeline ='));
  assert.match(featuresBody, /<SheetTools char=\{char\} lang=\{lang\} update=\{update\} placed=\{placed\} embedded \/>/);
});

test('Item 10: Enquadramento e reposicionamento configurável do banner e avatar do personagem', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  assert.match(sheetSrc, /char\.avatarPosition\?\.x/);
  assert.match(sheetSrc, /char\.avatarPosition\?\.y/);
  assert.match(sheetSrc, /onAvatarPosition=/);

  const sharedSrc = read('../components/Shared.jsx');
  assert.match(sharedSrc, /onPositionChange/);
  // Enquadramento WYSIWYG: moldura na proporção do banner, arrastada por mouse/dedo (e setas)
  assert.match(sharedSrc, /const FrameDrag =/);
  assert.match(sharedSrc, /onPointerDown=\{down\}/);
  assert.match(sharedSrc, /className="is-banner"/);
  assert.match(sharedSrc, /round className="is-token"/);
  assert.match(sharedSrc, /setPreset/);
});

test('Item 11: Aba Características (SheetFeatures) importa DiceText e renderiza traços sem quebrar a página', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  assert.match(sheetSrc, /import \{ DiceText \} from '\.\.\/src\/dice\/dice-text\.jsx';/);
  assert.match(sheetSrc, /export const SheetFeatures =/);
  // v1.0.73: classe, espécie, talentos e antecedente numa linha do tempo por nível
  assert.match(sheetSrc, /<FeatureTimeline char=\{char\}/);

  const tabsSrc = read('../components/SheetTabs.jsx');
  assert.match(tabsSrc, /const traits = hideTraits \? \[\] : \(race\?\.traits \|\| \[\]\);/);
});

test('Item 12: Grupos de perícias listados de cima para baixo como ações de combate, sem colunas lado a lado', () => {
  const css = read('../src/sheet/ficha.css');
  assert.match(css, /\.ficha \.fh-skill-categories-grid \{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/);
  assert.ok(!css.includes('.fh-skill-categories-grid {\n    grid-template-columns: repeat(2'), 'Não deve ter colunas lado a lado em fh-skill-categories-grid');

  const sheetSrc = read('../components/Sheet.jsx');
  assert.match(sheetSrc, /Ação: Busca \(Search\)/);
  assert.match(sheetSrc, /Ação: Furtividade & Evasão \(Hide\)/);
  assert.match(sheetSrc, /Ação: Influência \(Influence\)/);
  assert.match(sheetSrc, /Ação: Estudo \(Study\)/);
});

test('Item 13: Sigla do atributo à esquerda da pontuação passiva com formato Arcana (Int) 10 / +1', () => {
  const checksSrc = read('../src/sheet/FhChecks.jsx');
  assert.match(checksSrc, /fh-skill-abil-inline/);
  assert.match(checksSrc, /fh-score-divider/);

  const css = read('../src/sheet/ficha.css');
  assert.match(css, /\.fh-skill-abil-inline/);
  assert.match(css, /\.fh-score-divider/);
});

test('Item 14: Metade calculada discreta no rodapé da tela sem poluir a face do dado no roll-up', () => {
  const dieShapeSrc = read('../src/dice/DieShape.jsx');
  assert.ok(!dieShapeSrc.includes('die-number-half'), 'DieShape não deve poluir a face do dado com die-number-half');

  const stageSrc = read('../src/dice/DiceStage.jsx');
  assert.match(stageSrc, /dice-stack-half-bottom/);
  assert.match(stageSrc, /dice-half-discrete/);
  assert.match(stageSrc, /createPortal/, 'Deve usar createPortal para descolar da stage e não sobrepor as formas dos dados');
  assert.ok(!stageSrc.includes('dice-stack-half-banner'), 'Não deve ter banner proeminente no meio da tela');
  assert.ok(!stageSrc.includes('½'), 'Não deve gastar espaço com rótulo "1/2" ou "½"');
  assert.match(stageSrc, /<span className="dice-half-discrete">\{halfTotal\}<\/span>/, 'Deve renderizar exclusivamente o valor já calculado e arredondado para baixo');

  const css = read('../src/dice/dice-styles.css');
  assert.match(css, /\.dice-stack-half-bottom/);
  assert.match(css, /\.dice-half-discrete/);
  assert.match(css, /z-index:\s*10001/);
});
