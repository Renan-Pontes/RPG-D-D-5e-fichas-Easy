/* Fichas prontas (data/pregens.json, geradas por scripts/build-pregens.mjs). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Utils from '../utils.js';
import { findFeat } from '../data/feats.js';
import { applyAutosToCharacter } from '../src/progression/engine.js';
import { CORE_CLASSES, classSkillPicks } from '../src/creator/class-helpers.js';
import { classStart } from '../src/creator/start-data.js';
import {
  spellPlan, chosenCantrips, chosenSpells, preparedFromBook, spellDef, offListEntries, grantedSpells,
} from '../src/creator/spell-helpers.js';
import { HEADLESS_STEPS, PREGENS, buildCharacter, buildAll, pendingIssues } from '../scripts/build-pregens.mjs';

const pregens = JSON.parse(readFileSync(new URL('../data/pregens.json', import.meta.url), 'utf8'));
const built = Object.fromEntries(PREGENS.map(s => [s.classId, buildCharacter(s)]));

// ---------- As etapas sem React espelham as do assistente ----------

const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const stepOrder = [...src('../src/creator/steps.js').matchAll(/from '\.\/steps\/(\w+)\.jsx'/g)].map(m => m[1]);

test('HEADLESS_STEPS segue a ordem e as funções de src/creator/steps', () => {
  assert.deepEqual([...HEADLESS_STEPS.map(s => s.id), 'review'], stepOrder);
  for (const s of HEADLESS_STEPS) {
    const block = src(`../src/creator/steps/${s.id}.jsx`).split('export default {')[1];
    assert.ok(block, s.id);
    assert.ok(block.includes(`id: '${s.id}'`), `${s.id}: id`);
    const iss = /issues:\s*(?:\(char\)\s*=>\s*)?(\w+)/.exec(block)?.[1];
    if (/issues:\s*\(\)\s*=>\s*\[\]/.test(block)) assert.deepEqual(s.issues({}), [], `${s.id}: sem pendências`);
    else assert.equal(s.issues.name, iss, `${s.id}: issues`);
    const app = /applies:\s*([^\n]+?),?\n/.exec(block)?.[1];
    assert.equal(!!s.applies, !!app, `${s.id}: applies`);
    const fn = app && /^(?:\(char\)\s*=>\s*)?(\w+)(?:\(char\))?$/.exec(app.trim())?.[1];
    if (fn) assert.ok(s.applies.name === fn || String(s.applies).includes(fn), `${s.id}: applies ${fn}`);
  }
});

// ---------- Conteúdo ----------

test('12 fichas, uma por classe do SRD, ids e nomes únicos', () => {
  assert.equal(pregens.length, 12);
  assert.deepEqual(pregens.map(p => p.classId).sort(), [...CORE_CLASSES].sort());
  assert.equal(new Set(pregens.map(p => p.id)).size, 12);
  assert.equal(new Set(pregens.map(p => p.character.name)).size, 12);
  for (const p of pregens) assert.equal(p.character.className, p.classId);
});

test('data/pregens.json está atualizado com o gerador', () => {
  assert.deepEqual(pregens, JSON.parse(JSON.stringify(buildAll())));
});

for (const p of pregens) {
  const c = p.character;
  const id = p.classId;

  test(`${id}: passa em todas as etapas da criação`, () => {
    assert.deepEqual(pendingIssues(built[id]), []);
  });

  test(`${id}: textos, foto e dificuldade`, () => {
    for (const k of ['pitch', 'howToPlay', 'difficulty']) {
      assert.ok(String(p[k]?.pt || '').trim(), `${k}.pt`);
      assert.ok(String(p[k]?.en || '').trim(), `${k}.en`);
    }
    const tips = p.howToPlay.pt.split('\n').filter(Boolean);
    assert.ok(tips.length >= 2 && tips.length <= 3, 'howToPlay: 2-3 dicas');
    assert.equal(p.howToPlay.en.split('\n').filter(Boolean).length, tips.length);
    const want = { low: 'Fácil', average: 'Média', high: 'Desafiadora' }[classStart(c).complexity];
    assert.equal(p.difficulty.pt, want);
    assert.equal(c.avatar, `/art/pregens/${id}.webp`);
    assert.equal(c.pregenId, id);
    for (const k of ['name', 'personality', 'backstory', 'appearance', 'alignment', 'race', 'background']) assert.ok(String(c[k] || '').trim(), k);
    assert.equal(c.creation, undefined, 'finalizeCharacter tira o rascunho');
  });

  test(`${id}: nível 1, regra 2024, PV e salvaguardas`, () => {
    assert.equal(c.level, 1);
    assert.equal(c.rulesVersion, '2024');
    assert.equal(c.maxHp, Utils.maxHpDefault(c));
    assert.equal(c.currentHp, c.maxHp);
    assert.ok(c.maxHp >= classStart(c).hitDie, 'PV ≥ dado de vida');
    assert.deepEqual([...c.saveProfs].sort(), [...classStart(c).saves].sort());
    assert.ok(Utils.computeAc(c) >= 11);
  });

  test(`${id}: perícias na quantidade certa`, () => {
    assert.equal(classSkillPicks(built[id]).length, classStart(c).skills.count);
    assert.equal(new Set(c.skillProfs).size, c.skillProfs.length);
    for (const s of Utils.backgroundSkills(c)) assert.ok(c.skillProfs.includes(s), `antecedente: ${s}`);
  });

  test(`${id}: equipamento do pacote A`, () => {
    assert.ok(c.weapons.length > 0, 'armas');
    assert.ok(c.equipment.length > 0, 'itens');
    assert.ok(c.coins.gp > 0, 'ouro');
  });

  test(`${id}: truques e magias no limite da classe, todos da lista certa`, () => {
    const plan = spellPlan(c);
    const want = classStart(c).spells || {};
    assert.equal(chosenCantrips(c).length, plan.cantrips);
    assert.equal(plan.cantrips, want.cantrips || 0);
    if (plan.book) {
      assert.equal(chosenSpells(c).length, plan.spellbook);
      assert.equal(plan.spellbook, want.spellbook);
      assert.equal(preparedFromBook(c).length, plan.leveled);
    } else {
      assert.equal(chosenSpells(c).length, plan.leveled);
    }
    assert.equal(plan.leveled, want.prepared || 0);
    for (const s of c.spells) {
      const d = spellDef(c, s.id);
      assert.ok(d, `${s.id} existe`);
      assert.ok(Utils.inSpellList(c, d), `${s.id} é da lista da classe`);
      assert.ok(d.level <= plan.maxLevel, `${s.id} círculo`);
    }
    // Magias do talento de origem: da lista que o talento fixou.
    for (const f of c.feats || []) {
      const list = f.picks?.spellList;
      if (!list) continue;
      for (const sid of [...(f.picks.cantrip || []), ...(f.picks.spell || [])]) {
        const d = spellDef(c, sid);
        assert.ok(d?.classes?.includes(list), `${sid} na lista ${list}`);
        assert.equal(d.level, (f.picks.cantrip || []).includes(sid) ? 0 : 1);
      }
      assert.ok(findFeat(f.id), f.id);
    }
    // Nada repetido entre classe, talento e espécie.
    const granted = new Set(grantedSpells(c).map(g => g.id));
    for (const s of c.spells) assert.ok(!granted.has(s.id), `${s.id} repetida`);
  });

  test(`${id}: ao salvar (magias automáticas) nada fica fora da lista`, () => {
    const saved = applyAutosToCharacter(c);
    assert.deepEqual(offListEntries(saved), []);
    for (const g of grantedSpells(c)) assert.ok(saved.spells.some(s => s.id === g.id), `${g.id} entra ao salvar`);
  });
}
