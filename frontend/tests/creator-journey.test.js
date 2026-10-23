// Visual "jornada" da criação: capítulos, crônica e o peso da decisão (só leitura das regras).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCharacter } from '../src/creator/creation.js';
import { selectClass, toggleGroupPick, choiceGroups } from '../src/creator/class-helpers.js';
import { applyBackground } from '../src/creator/background-helpers.js';
import { selectSpecies } from '../src/creator/species-helpers.js';
import { readFileSync } from 'node:fs';
import { CHAPTERS, chapterIndexOf, journeyChapters } from '../src/creator/journey.js';
import { chronicleLines, chronicleText, scarLine, classOptionLines, callLine, birthLine, youthLine } from '../src/creator/chronicle.js';
import { heroStats, statDiffs, lostByPatch, battleOdds, classPath, classTradeoffs, backgroundTradeoffs, abilitiesSet, afterPatch } from '../src/creator/decision.js';

const mk = (rules = '2024', className, extra = {}) => {
  const base = newCharacter(rules);
  return className ? { ...base, ...selectClass(base, className), ...extra } : { ...base, ...extra };
};
const apply = (c, patch) => ({ ...c, ...patch });

test('toda etapa do assistente pertence a um capítulo, na ordem da história', () => {
  // steps.js importa .jsx (o node não carrega): lê a ordem pelos imports, como tests/pregens.test.js.
  const ids = [...readFileSync(new URL('../src/creator/steps.js', import.meta.url), 'utf8').matchAll(/from '\.\/steps\/(\w+)\.jsx'/g)].map(m => m[1]);
  assert.ok(ids.length >= 15);
  for (const id of ids) assert.ok(CHAPTERS.some(c => c.steps.includes(id)), `etapa ${id} sem capítulo`);
  const order = ids.map(id => chapterIndexOf(id));
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'capítulos fora de ordem');
  assert.equal(chapterIndexOf('welcome'), 0);
  assert.equal(chapterIndexOf('review'), CHAPTERS.length - 1);
});

test('etapa nova sem capítulo fica no capítulo da anterior', () => {
  const steps = [{ id: 'welcome' }, { id: 'class' }, { id: 'nova' }, { id: 'background' }];
  assert.equal(chapterIndexOf('nova', steps), chapterIndexOf('class'));
});

test('mapa: capítulo atual, concluído, com pendência e sem etapas', () => {
  const steps = ['welcome', 'class', 'skills', 'background', 'review'].map(id => ({ id, title: { pt: id, en: id } }));
  const stepIssues = steps.map(s => (s.id === 'skills' ? [{ pt: 'x', en: 'x' }] : []));
  const ch = journeyChapters({ steps, index: 3, visited: ['welcome', 'class', 'skills', 'background'], stepIssues, reachable: (i) => i <= 3 });
  const by = Object.fromEntries(ch.map(c => [c.id, c]));
  assert.equal(by.roots.now, true);
  assert.equal(by.prologue.done, true);
  assert.equal(by.call.pending, true);
  assert.equal(by.call.done, false);
  assert.equal(by.gift.skip, true);
  assert.equal(by.forge.target, null, 'capítulo não alcançável não tem destino');
  assert.equal(by.call.target, 1);
});

test('crônica: começa vazia e cresce na ordem da história (2024)', () => {
  let c = newCharacter('2024');
  assert.deepEqual(chronicleLines(c, 'pt'), []);
  c = apply(c, selectClass(c, 'fighter'));
  c = apply(c, selectSpecies(c, 'dwarf'));
  c = apply(c, applyBackground(c, 'soldier'));
  c = { ...c, alignment: 'LG', name: 'Brom' };
  const pt = chronicleLines(c, 'pt'), en = chronicleLines(c, 'en');
  assert.match(pt[0], /nasceu anão/);
  assert.match(pt[1], /soldado/);
  assert.match(pt[2], /^Até que/);
  assert.match(pt[pt.length - 2], /^E jurou/);
  assert.equal(pt[pt.length - 1], 'Assim nasceu Brom.');
  assert.equal(en.length, pt.length);
  assert.equal(en[en.length - 1], 'And so Brom was born.');
  assert.equal(chronicleText(c, 'pt'), pt.join(' '));
});

test('crônica 2014: sub-raça usa a frase do povo e antecedente 2014 tem frase própria', () => {
  let c = newCharacter('2014');
  c = apply(c, selectSpecies(c, 'dwarf-hill'));
  c = apply(c, applyBackground(c, 'folkHero'));
  const pt = chronicleLines(c, 'pt');
  assert.match(pt[0], /nasceu anão/);
  assert.match(pt[1], /aldeia/);
  assert.ok(birthLine('elf-high', 'pt').includes('elfo'));
  assert.ok(youthLine('urchin', 'en').startsWith('You grew up'));
  assert.ok(callLine('wizard', 'pt').startsWith('Até que'));
});

test('crônica: raça sem frase própria ainda ganha uma linha', () => {
  const c = { ...newCharacter('2014'), race: 'tabaxi' };
  assert.equal(chronicleLines(c, 'pt').length, 1);
});

test('crônica: escolhas de classe e cicatriz de um selo quebrado', () => {
  let c = mk('2024', 'fighter');
  const style = choiceGroups(c).find(g => g.pools[0] === 'fightingStyle');
  c = apply(c, toggleGroupPick(c, style, 'defense'));
  assert.ok(classOptionLines(c, 'pt').some(l => /armadura/.test(l)));
  c = { ...c, creation: { ...c.creation, scars: { class: { pt: scarLine('class', 'Mago', 'pt'), en: scarLine('class', 'Wizard', 'en') } } } };
  const pt = chronicleLines(c, 'pt');
  assert.ok(pt.some(l => l.includes('Mago')), 'cicatriz entra na crônica');
  assert.ok(chronicleLines(c, 'en').some(l => l.includes('Wizard')));
});

test('peso da decisão: classe muda PV/CA/magias, estimados antes dos atributos', () => {
  const c = newCharacter('2024');
  assert.equal(abilitiesSet(c), false);
  const d = statDiffs(c, (x) => selectClass(x, 'wizard'));
  const by = Object.fromEntries(d.map(x => [x.key, x]));
  assert.equal(by.hp.from, null);
  assert.ok(by.hp.to >= 6, 'PV estimado com a tabela sugerida (CON não é 8)');
  assert.ok(by.cantrips.to > 0 && by.spells.to > 0);
  const fighter = mk('2024', 'fighter');
  const toWizard = Object.fromEntries(statDiffs(fighter, (x) => selectClass(x, 'wizard')).map(x => [x.key, x]));
  assert.ok(toWizard.hp.to < toWizard.hp.from, 'mago tem menos vida que guerreiro');
  assert.deepEqual(heroStats(null), {});
});

test('peso da decisão: trocar de classe lista o que será desfeito', () => {
  let c = mk('2024', 'fighter');
  c = { ...c, skillProfs: ['athletics', 'perception'] };
  const style = choiceGroups(c).find(g => g.pools[0] === 'fightingStyle');
  c = apply(c, toggleGroupPick(c, style, 'defense'));
  const lost = lostByPatch(c, selectClass(c, 'wizard'));
  assert.ok(lost.some(x => /perícia/.test(x.pt)));
  assert.ok(lost.some(x => /escolha/.test(x.pt)));
  assert.deepEqual(lostByPatch(c, {}), []);
  assert.equal(afterPatch(c, () => ({ name: 'X' })).name, 'X');
});

test('a primeira batalha: guerreiro aguenta mais e é acertado menos que mago', () => {
  const f = battleOdds(mk('2024', 'fighter')), w = battleOdds(mk('2024', 'wizard'));
  assert.ok(f.hitsYou < w.hitsYou);
  assert.ok(f.fallsAfter > w.fallsAfter);
  for (const o of [f, w]) {
    assert.ok(o.hitsYou >= 5 && o.hitsYou <= 95 && o.youHit >= 5 && o.youHit <= 95);
    assert.equal(o.assumedAbilities, true);
    assert.equal(o.assumedKit, true);
  }
  assert.equal(battleOdds(newCharacter('2024')), null);
  assert.ok(battleOdds(mk('2014', 'cleric')));
});

test('o caminho adiante: níveis 2 a 5 com marcos (2024 e 2014)', () => {
  const p = classPath(mk('2024', 'fighter'));
  assert.deepEqual(p.map(x => x.level), [2, 3, 4, 5]);
  assert.ok(p.find(x => x.level === 5).items.some(i => /Ataque Extra/.test(i.pt)));
  assert.ok(classPath(mk('2024', 'wizard')).find(x => x.level === 5).items.some(i => /3º círculo/.test(i.pt)));
  assert.ok(classPath(mk('2014', 'fighter')).length > 0);
  assert.deepEqual(classPath(newCharacter('2024')), []);
});

test('o que fica para trás: classe e antecedente', () => {
  const c = newCharacter('2024');
  const wiz = classTradeoffs(c, 'wizard', ['str', 'dex', 'con']);
  assert.ok(wiz.some(x => /armadura/i.test(x.pt)));
  assert.ok(wiz.some(x => /Inteligência/.test(x.pt)), 'antecedente sem o atributo principal');
  assert.ok(classTradeoffs(c, 'fighter').some(x => /Magia/.test(x.pt)));
  assert.deepEqual(classTradeoffs(c, 'nope'), []);
  const f = mk('2024', 'wizard');
  const t = backgroundTradeoffs(f, { abilities: ['str', 'dex', 'con'] });
  assert.match(t[0].pt, /Inteligência/);
  assert.ok(t.some(x => /principal/.test(x.pt)));
  assert.deepEqual(backgroundTradeoffs(f, { abilities: [] }), []);
});
