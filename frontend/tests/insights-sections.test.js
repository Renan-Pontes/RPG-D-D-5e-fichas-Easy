/* Raio-X › página curta (F2.6, src/group/insights-sections.js): o topo aberto, as seções de
 * analista recolhidas com o resumo de uma linha, o índice que abre e leva até elas. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BESTIARY } from '../data/bestiary.js';
import * as M from '../src/group/party-metrics.js';
import * as S from '../src/group/spotlights.js';
import * as V from '../src/group/versus.js';
import * as X from '../src/group/insights-sections.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/party-jogo-e-combate.json', import.meta.url), 'utf8'));
const party = M.partyMembers(fixture.members);
const facts = M.partyFacts(party, 'pt');
const axes = M.partyAxes(facts);
const calc = {
  axes, skills: M.partySkills(facts, 15), damage: M.partyDamage(facts), schools: M.partySchools(facts),
  gaps: S.partyGaps(facts, axes, {}),
};
const gapLines = S.readableGaps(calc.gaps, 'pt');
const sums = (extra = {}) => X.sectionSummaries({ calc, facts, shownAxes: M.AXES, gapCount: gapLines.length, topGap: gapLines[0].text, lang: 'pt', ...extra });

test('as seções: o topo (Resumo, Ideias, Momentos, Equilíbrio) e as 8 de analista, recolhidas', () => {
  assert.deepEqual(X.SECTIONS.filter(s => s.top).map(s => s.id), ['quads', 'ideas', 'moments', 'balance']);
  assert.deepEqual(X.FOLDS, ['roles', 'skills', 'damage', 'gaps', 'schools', 'chars', 'table', 'versus']);
  // começam fechadas no PC e no celular; o que o mestre abriu fica
  for (const id of X.FOLDS) assert.equal(X.foldOpen(undefined, id), false);
  assert.equal(X.foldOpen({ table: true }, 'table'), true);
  // o índice abre a recolhida (e não mexe no que já estava aberto)
  assert.deepEqual(X.withOpen({ table: true }, 'gaps'), { table: true, gaps: true });
  const open = { gaps: true };
  assert.equal(X.withOpen(open, 'gaps'), open);
  assert.equal(X.withOpen(open, 'moments'), open, 'seção do topo não se abre: já está à vista');
  assert.equal(X.sectionDomId('moments'), 'ins-moments');
  assert.equal(X.sectionDomId('gaps'), 'ins-gaps');
  assert.equal(X.sectionDomId('versus'), 'ins-sec-versus');
  assert.equal(X.sectionLabel('versus', 'en'), 'Against whom?');
});

test('o resumo de uma linha de cada recolhida diz o que tem dentro', () => {
  const s = sums();
  assert.deepEqual(Object.keys(s).sort(), [...X.FOLDS].sort());
  assert.match(s.roles, /^Forte em .+ \d.* e .+ · mais fraco em .+ \d/);
  assert.match(s.skills, /^Melhor: .+ \d+ \(.+\) · mais fraca: .+ \d+$/);
  assert.equal(s.damage, `8 de 13 tipos · falta ácido, elétrico, necrótico, veneno e psíquico`);
  assert.equal(s.gaps, `${gapLines.length} lacunas · a mais séria: ${gapLines[0].text}`);
  assert.match(s.schools, /^\d conjuradores · mais magias de \S+ \(\d+\)/);
  assert.doesNotMatch(s.schools, /0 escolas/);
  assert.equal(s.chars.split(' · ').length, facts.length);
  assert.match(s.table, /^CA \d+–\d+ · PV \d+–\d+/);
  assert.match(s.versus, /^Escolha um monstro/);
  for (const [k, v] of Object.entries(s)) assert.ok(v.length <= 160, `${k}: ${v.length}`);
  // com um monstro escolhido: a dificuldade e o que importa
  const v = V.versus(BESTIARY.find(m => m.id === 'shadow'), facts, 'pt');
  assert.equal(sums({ versus: v }).versus, '1 Sombra: Baixa · 3: Moderada · 4: Alta · vulnerável a radiante: Dagna (Flecha Guiada) causa o dobro');
  // eixos escondidos e grupo sem lacuna
  assert.equal(sums({ shownAxes: [] }).roles, 'Todos os eixos escondidos (Ajustar)');
  assert.equal(sums({ gapCount: 0 }).gaps, 'Nenhuma lacuna');
  // inglês
  const en = X.sectionSummaries({ calc, facts, shownAxes: M.AXES, gapCount: 1, topGap: 'x', lang: 'en' });
  assert.match(en.roles, /^Strong at /);
  assert.equal(en.gaps, '1 gap · most serious: x');
});
