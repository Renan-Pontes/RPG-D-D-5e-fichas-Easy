import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TABLES, FIELDS, GEN_TYPES, makeRng, generate, generateNpc, generateTavern, generateNames, rerollField,
  toEntryPayload, toPlainText, tavernName, placeName, factionName, personName, fieldLabel,
  allForms, inflect, genderOfName, setNpcGender,
} from '../src/world/generators.js';

test('tabelas pt e en têm as mesmas chaves e são ricas', () => {
  assert.deepEqual(Object.keys(TABLES.pt).sort(), Object.keys(TABLES.en).sort());
  for (const lang of ['pt', 'en']) {
    const T = TABLES[lang];
    for (const k of ['first', 'last', 'mannerism', 'wants', 'secret', 'feature']) assert.ok(T[k].length >= 20, `${lang}.${k} curto`);
    for (const k of ['roles', 'atmosphere', 'specialty', 'clientele', 'rumor', 'build', 'clothing']) assert.ok(T[k].length >= 10, `${lang}.${k} curto`);
    for (const [k, arr] of Object.entries(T)) {
      assert.equal(new Set(arr.map(x => JSON.stringify(x))).size, arr.length, `${lang}.${k} tem repetidos`);
    }
  }
});

test('mesma semente → mesmo resultado; sementes diferentes variam', () => {
  const a = generateNpc('pt', makeRng(42));
  const b = generateNpc('pt', makeRng(42));
  assert.deepEqual(a, b);
  const names = new Set(Array.from({ length: 30 }, (_, i) => generateNpc('pt', makeRng(i + 1)).name));
  assert.ok(names.size > 20);
});

test('NPC tem todos os campos preenchidos, em pt e en', () => {
  for (const lang of ['pt', 'en']) {
    const n = generate('npc', lang, makeRng(7));
    assert.equal(n.type, 'npc');
    assert.equal(n.lang, lang);
    for (const f of FIELDS.npc) assert.ok(typeof n[f] === 'string' && n[f].length > 2, `${lang} ${f}`);
    assert.match(n.appearance, /\.$/);
  }
});

test('textos em pt não usam as tabelas em inglês', () => {
  const rng = makeRng(99);
  for (let i = 0; i < 40; i++) {
    const n = generateNpc('pt', rng);
    assert.ok(allForms(TABLES.pt.mannerism).includes(n.mannerism));
    assert.ok(allForms(TABLES.pt.wants).includes(n.wants));
    assert.ok(allForms(TABLES.pt.secret).includes(n.secret));
    assert.ok(allForms(TABLES.pt.roles).includes(n.role));
  }
});

test('nome de taverna em pt concorda em gênero', () => {
  const rng = makeRng(3);
  for (let i = 0; i < 200; i++) {
    const name = tavernName('pt', rng);
    if (TABLES.pt.tavernAlt.includes(name)) continue;
    const m = /^(O|A) (\S+) (.+)$/.exec(name);
    assert.ok(m, name);
    const noun = TABLES.pt.tavernNoun.find(([w]) => w === m[2]);
    assert.ok(noun, name);
    const adj = TABLES.pt.tavernAdj.find(pair => pair.includes(m[3]));
    assert.ok(adj, name);
    if (noun[1] === 'f') { assert.equal(m[1], 'A'); assert.equal(m[3], adj[1]); } else { assert.equal(m[1], 'O'); assert.equal(m[3], adj[0]); }
  }
  assert.match(tavernName('en', makeRng(5)), /^The /);
});

test('nomes de lugar, facção e pessoa', () => {
  const rng = makeRng(11);
  for (let i = 0; i < 50; i++) {
    assert.ok(placeName('pt', rng).length >= 4);
    assert.match(factionName('pt', rng), /^(O|A) /);
    assert.match(factionName('en', rng), /^The /);
    assert.match(personName('en', rng), /\S+ \S+/);
  }
});

test('taverna e nomes têm todos os campos', () => {
  const tv = generateTavern('en', makeRng(8));
  for (const f of FIELDS.tavern) assert.ok(tv[f], f);
  const nm = generateNames('pt', makeRng(8));
  for (const f of FIELDS.names) assert.ok(nm[f], f);
  assert.notEqual(nm.person, nm.person2);
  assert.throws(() => generate('dragon', 'pt'));
  assert.deepEqual(GEN_TYPES, Object.keys(FIELDS));
});

test('rerrolar um campo só muda aquele campo', () => {
  const rng = makeRng(123);
  const n = generateNpc('pt', rng);
  const r = rerollField(n, 'mannerism', rng);
  assert.notEqual(r.mannerism, n.mannerism);
  for (const f of FIELDS.npc.filter(f => f !== 'mannerism')) assert.equal(r[f], n[f]);
  assert.equal(rerollField(n, 'naoexiste', rng), n);
});

test('salvar no mundo cria o cartão OCULTO', () => {
  const n = generateNpc('pt', makeRng(1));
  const p = toEntryPayload(n);
  assert.equal(p.kind, 'npc');
  assert.equal(p.visibility, 'hidden');
  assert.equal(p.name, n.name);
  assert.deepEqual(p.data, { role: n.role, appearance: n.appearance, mannerism: n.mannerism, wants: n.wants });
  assert.deepEqual(p.secrets, [{ text: n.secret }]);
  assert.ok(p.summary.length <= 280);

  const tv = toEntryPayload(generateTavern('en', makeRng(2)));
  assert.equal(tv.kind, 'place');
  assert.equal(tv.visibility, 'hidden');
  assert.equal(tv.data.placeType, 'building');
  assert.ok(tv.dmNotes.startsWith('Keeper:'));
  assert.ok(tv.tags.includes('tavern'));

  const nm = generateNames('pt', makeRng(2));
  assert.equal(toEntryPayload(nm, 'faction').kind, 'faction');
  assert.equal(toEntryPayload(nm, 'place').kind, 'place');
  assert.equal(toEntryPayload(nm, 'person').visibility, 'hidden');
});

test('texto para copiar usa rótulos da língua', () => {
  const txt = toPlainText(generateNpc('pt', makeRng(4)));
  assert.match(txt, /^Nome: /);
  assert.match(txt, /Maneirismo: /);
  assert.equal(fieldLabel('wants', 'en'), 'Wants');
});

// ---------------------------------------------------------------- gênero (#32)
const formOf = (arr, text, g) => arr.find(e => inflect(e, g) === text) !== undefined;

test('NPC em pt: nome, ocupação, aparência e textos concordam em gênero', () => {
  const rng = makeRng(2026);
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const n = generateNpc('pt', rng);
    seen.add(n.gender);
    assert.equal(genderOfName(n.name, 'pt'), n.gender, n.name);
    const T = TABLES.pt;
    assert.ok(formOf(T.roles, n.role, n.gender), `${n.name}: ${n.role}`);
    assert.ok(formOf(T.mannerism, n.mannerism, n.gender), `${n.name}: ${n.mannerism}`);
    assert.ok(formOf(T.wants, n.wants, n.gender), `${n.name}: ${n.wants}`);
    assert.ok(formOf(T.secret, n.secret, n.gender), `${n.name}: ${n.secret}`);
    const build = n.appearance.split(',')[0];
    assert.ok(T.build.some(e => inflect(e, n.gender).startsWith(build)), `${n.name}: ${n.appearance}`);
    // nada da outra forma escapa
    const other = n.gender === 'm' ? 'f' : 'm';
    for (const [k, f] of [['roles', 'role'], ['mannerism', 'mannerism'], ['wants', 'wants'], ['secret', 'secret']]) {
      const e = T[k].find(x => Array.isArray(x) && inflect(x, other) === n[f]);
      assert.equal(e, undefined, `${n.name}: ${n[f]}`);
    }
  }
  assert.deepEqual([...seen].sort(), ['f', 'm']);
});

test('casos do teste de navegador não acontecem mais', () => {
  const rng = makeRng(77);
  for (let i = 0; i < 400; i++) {
    const n = generateNpc('pt', rng);
    if (n.gender === 'm') assert.doesNotMatch(`${n.role} ${n.appearance}`, /Ladra|Cartógrafa|Robusta|Franzina|inquieta|Curandeira/);
    else assert.doesNotMatch(`${n.role} ${n.appearance}`, /Ladrão|Cartógrafo|Robusto|Corpulento|Franzino|inquieto/);
  }
});

test('rerrolar o nome mantém o gênero; rerrolar ocupação flexiona', () => {
  const rng = makeRng(5);
  const n = generate('npc', 'pt', rng, 'f');
  for (let i = 0; i < 20; i++) {
    const r = rerollField(n, 'name', rng);
    assert.equal(genderOfName(r.name, 'pt'), 'f');
    const o = rerollField(n, 'role', rng);
    assert.ok(formOf(TABLES.pt.roles, o.role, 'f'));
    assert.equal(o.picks.role !== undefined, true);
  }
});

test('trocar gênero flexiona o que foi rolado e preserva o que o mestre editou', () => {
  const n = generate('npc', 'pt', makeRng(9), 'm');
  const edited = { ...n, wants: 'Achar o gato perdido.' };
  const f = setNpcGender(edited, 'f', makeRng(1));
  assert.equal(f.gender, 'f');
  assert.equal(genderOfName(f.name, 'pt'), 'f');
  assert.equal(f.name.split(' ').slice(1).join(' '), n.name.split(' ').slice(1).join(' '), 'mantém o sobrenome');
  assert.equal(f.wants, 'Achar o gato perdido.');
  assert.equal(f.role, inflect(TABLES.pt.roles[n.picks.role], 'f'));
  assert.equal(f.secret, inflect(TABLES.pt.secret[n.picks.secret], 'f'));
  // ida e volta volta ao mesmo texto
  const back = setNpcGender(f, 'm', makeRng(1));
  assert.equal(back.role, n.role);
  assert.equal(back.appearance, n.appearance);
  assert.equal(setNpcGender(n, 'm'), n);
  // nome escrito à mão não muda
  const custom = setNpcGender({ ...n, name: 'Zé do Brejo' }, 'f', makeRng(3));
  assert.equal(custom.name, 'Zé do Brejo');
});
