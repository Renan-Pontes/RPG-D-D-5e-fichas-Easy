import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeAnticipationProfile, computeFalloffProfile } from '../src/dice/dice-rollup.js';

const read = (relPath) => readFileSync(new URL(relPath, import.meta.url), 'utf8');

test('Item 1: Texto de ficha pessoal e modo campanha encapsulados dentro do painel do herói', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  // campaignBanner é passado ao SheetHero
  assert.match(sheetSrc, /campaignBanner=\{/);
  // Dentro de SheetHero, campaignBanner é renderizado abaixo das ações
  assert.match(sheetSrc, /\{campaignBanner\}\s*<\/div>\s*\{\/\* Estrela e foto/);
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

test('Item 3: Progressão restrita exclusivamente à aba Jogar (play) e Traços de Espécie na aba Características (features)', () => {
  const sheetSrc = read('../components/Sheet.jsx');
  const tabsSrc = read('../components/SheetTabs.jsx');

  // SubclassBanner e SpeciesBanner encapsulados estritamente dentro de tab === 'play'
  assert.match(sheetSrc, /\{tab === 'play' && \(\s*<>\s*<SubclassBanner char=\{char\} lang=\{lang\} update=\{update\} \/>\s*<SpeciesBanner/);

  // SpeciesTraits NÃO está mais no final de SheetStory
  const storyEnd = tabsSrc.slice(tabsSrc.indexOf('const SheetStory ='), tabsSrc.indexOf('// ===== Notes / Journal ====='));
  assert.ok(!storyEnd.includes('<SpeciesTraits char={char}'), 'SheetStory não deve ter SpeciesTraits');

  // SpeciesTraits está presente na aba Características (SheetFeatures)
  const featuresBody = sheetSrc.slice(sheetSrc.indexOf('export const SheetFeatures ='));
  assert.match(featuresBody, /<SpeciesTraits char=\{char\} lang=\{lang\} update=\{update\} race=\{race\} \/>/);
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
