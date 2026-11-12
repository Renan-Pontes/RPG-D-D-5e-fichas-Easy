// Magias 1:1 com o SRD: 5.2.1 (fichas 2024) e 5.1 (fichas 2014). Auditoria: docs/spell-audit.md
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import SRD from '../data/srd.js';
const j = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const S24 = j('../data/srd2024-spells.json');
const META51 = j('../data/srd51-spells-meta.json');
const TEXT51 = j('../data/srd51-spells-text.json');

test('SRD 5.2.1: 339 magias, texto limpo (sem tabulação nem espaço duplo do PDF) e tabelas em linhas', () => {
  assert.equal(S24.length, 339);
  for (const s of S24) assert.ok(!/\t| {2}/.test(s.desc.en), s.id);
  const conf = S24.find(s => s.id === 'confusion').desc.en;
  assert.match(conf, /\n1 \| The target doesn’t take an action/);
  assert.match(S24.find(s => s.id === 'teleport').desc.en, /\nVery familiar \| 01–05 \| 06–13 \| 14–24 \| 25–00/);
  assert.match(S24.find(s => s.id === 'findSteed').desc.en, /\n\nOtherworldly Steed\n\nLarge Celestial/);
  assert.match(S24.find(s => s.id === 'fireball').desc.en, /successful one\.\n\nFlammable objects/);
});

test('SRD 5.1: as 319 magias, e o catálogo 2014 usa a ficha técnica oficial de cada uma', () => {
  assert.equal(Object.keys(META51).length, 319);
  assert.equal(Object.keys(TEXT51).length, 319);
  assert.match(TEXT51.fireball, /^A bright streak flashes from your pointing finger/);
  const alias = { spareDying: 'spareTheDying', identifySpell: 'identify', expediteRetreat: 'expeditiousRetreat', commandSpell: 'command' };
  let n = 0;
  for (const sp of SRD.SPELLS) {
    const m = META51[alias[sp.id] || sp.id];
    if (!m) continue;
    n++;
    for (const k of ['level', 'school', 'castingTime', 'range', 'components', 'duration', 'ritual', 'concentration']) assert.deepEqual(sp[k], m[k], `${sp.id}.${k}`);
    assert.equal(sp.srd51, true);
  }
  assert.ok(n >= 300, `${n} magias 2014 conferidas`);
  const fb = SRD.SPELLS.find(s => s.id === 'fireball');
  assert.equal(fb.range, '150 feet');
  assert.equal(fb.components, 'V, S, M (a tiny ball of bat guano and sulfur)');
});

test('SRD 5.2.1: campos da ficha sem texto vazado da extração (Component:, parágrafo na duração)', () => {
  for (const s of S24) {
    assert.ok(s.components, `${s.id}: componentes`);
    assert.ok(!/Component/.test(s.range), `${s.id}: alcance`);
    assert.ok(s.duration.length < 60, `${s.id}: duração`);
  }
});

test('fora do SRD: magias 2014 usam a ficha técnica do livro de 2014 (acervo offline), sem texto do livro', () => {
  const M14 = j('../data/spells-2014-meta.json');
  assert.ok(Object.keys(M14).length >= 200);
  for (const [id, m] of Object.entries(M14)) {
    assert.deepEqual(Object.keys(m).sort(), ['book', 'castingTime', 'components', 'concentration', 'duration', 'level', 'ritual', 'range', 'school'].sort(), id);
    const sp = SRD.SPELLS.find(s => s.id === id);
    if (!sp || sp.srd51) continue;
    for (const k of ['level', 'school', 'castingTime', 'range', 'components', 'duration']) assert.deepEqual(sp[k], m[k], `${id}.${k}`);
  }
  const ts = SRD.SPELLS.find(s => s.id === 'thunderousSmite');
  assert.equal(ts.castingTime, '1 bonus action');
  assert.equal(SRD.SPELLS.find(s => s.id === 'mindSpike').range, '60 feet');   // XGE, não o 120 do SRD 5.2.1
});

test('magia sem texto livre: link de busca da D&D Beyond pelo nome em inglês', () => {
  const src = readFileSync(new URL('../src/sheet/spell-text.js', import.meta.url), 'utf8');
  const body = src.match(/export const ddbSpellUrl = (\(nameEn\) => `[^`]+`);/)[1];
  const ddbSpellUrl = eval(body);
  assert.equal(ddbSpellUrl("Tasha's Hideous Laughter"), "https://www.dndbeyond.com/spells?filter-search=Tasha's%20Hideous%20Laughter");
  const tabs = readFileSync(new URL('../components/SheetTabs.jsx', import.meta.url), 'utf8');
  assert.match(tabs, /ddbSpellUrl\(tName\('spellName', sp\.id, 'en'\)\)/);
});
