import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import { startingSpells } from '../src/creator/start-data.js';
import {
  spellPlan, hasClassCantrips, hasClassSpells, cantripIssues, spellIssues, availableCantrips, availableSpells,
  chosenCantrips, chosenSpells, preparedFromBook, grantedSpells, invalidChoices, withoutInvalid,
  toggleCantrip, toggleSpell, togglePrepared, fillRecommended, beginnerCantrips, recommendedSpells, offListEntries, grantSource,
  duplicateGrants, duplicateGrantIssues, isCoreSpell, expandedSpellIds,
} from '../src/creator/spell-helpers.js';
import SRD from '../data/srd.js';
import { SPELLS_2024 } from '../data/rules2024.js';
import { EXTRA_SPELLS_2024, translateSpellMeta, rangePt, castingTimePt, durationPt, componentsPt, polishPtText } from '../data/spells-extra.js';
import { tName } from '../data/i18n.js';

const mk = (rulesVersion, className, extra = {}) => ({
  ...Utils.makeNew(), rulesVersion, className, subclass: '', level: 1, race: 'human', background: 'sage', feats: [], spells: [], skillProfs: [],
  abilities: { str: 10, dex: 14, con: 12, int: 16, wis: 16, cha: 16 }, raceBonus: {}, ...extra,
});
const apply = (c, spells) => { assert.ok(spells, 'escolha aceita'); return { ...c, spells }; };

test('isPreparedCaster considera a regra (2024: todas as classes conjuradoras preparam)', () => {
  for (const c of ['bard', 'sorcerer', 'warlock', 'ranger', 'cleric', 'druid', 'paladin', 'wizard', 'artificer']) {
    assert.equal(Utils.isPreparedCaster(mk('2024', c)), true, c);
  }
  for (const c of ['bard', 'sorcerer', 'warlock', 'ranger']) assert.equal(Utils.isPreparedCaster(mk('2014', c)), false, c);
  for (const c of ['cleric', 'druid', 'paladin', 'wizard', 'artificer']) assert.equal(Utils.isPreparedCaster(mk('2014', c)), true, c);
  assert.equal(Utils.isPreparedCaster(mk('2024', 'fighter')), false);
  // Limite numérico em 2024 (antes era Infinity para Bardo/Feiticeiro/Bruxo/Patrulheiro).
  assert.deepEqual(['bard', 'sorcerer', 'warlock', 'ranger'].map(c => Utils.preparedSpellsLimit(mk('2024', c))), [4, 2, 2, 2]);
});

test('2024 nível 1: quantidades de truques, magias e grimório (SRD 5.2.1)', () => {
  const want = {
    bard: [2, 4], cleric: [3, 4], druid: [2, 4], paladin: [0, 2], ranger: [0, 2],
    sorcerer: [4, 2], warlock: [2, 2], wizard: [3, 4], artificer: [2, 2],
  };
  for (const [c, [cant, lv]] of Object.entries(want)) {
    const p = spellPlan(mk('2024', c));
    assert.equal(p.cantrips, cant, `${c} truques`);
    assert.equal(p.leveled, lv, `${c} magias`);
    assert.equal(p.mode, 'prepared', c);
    const s = startingSpells(mk('2024', c));
    assert.equal(s.cantrips, cant, `${c} start-data truques`);
    assert.equal(s.prepared, lv, `${c} start-data magias`);
  }
  assert.equal(spellPlan(mk('2024', 'wizard')).spellbook, 6);
  assert.equal(spellPlan(mk('2024', 'bard')).spellbook, 0);
  for (const c of ['fighter', 'rogue', 'barbarian', 'monk']) {
    assert.equal(hasClassCantrips(mk('2024', c)), false, c);
    assert.equal(hasClassSpells(mk('2024', c)), false, c);
  }
  assert.equal(hasClassCantrips(mk('2024', 'paladin')), false);
  assert.equal(hasClassSpells(mk('2024', 'paladin')), true);
});

test('2014 nível 1: conhecidas, fórmula de preparo e Paladino/Patrulheiro sem magia', () => {
  assert.deepEqual([spellPlan(mk('2014', 'bard')).leveled, spellPlan(mk('2014', 'bard')).mode], [4, 'known']);
  assert.equal(spellPlan(mk('2014', 'sorcerer')).leveled, 2);
  assert.equal(spellPlan(mk('2014', 'warlock')).leveled, 2);
  // SAB 16 (+3) + nível 1 = 4; SAB 8 (−1) + 1 = 0 → mínimo 1.
  assert.equal(spellPlan(mk('2014', 'cleric')).leveled, 4);
  assert.equal(spellPlan(mk('2014', 'druid', { abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 8, cha: 10 } })).leveled, 1);
  const wiz = spellPlan(mk('2014', 'wizard'));
  assert.deepEqual([wiz.cantrips, wiz.spellbook, wiz.leveled], [3, 6, 4]);
  for (const c of ['paladin', 'ranger']) {
    assert.equal(hasClassCantrips(mk('2014', c)), false, c);
    assert.equal(hasClassSpells(mk('2014', c)), false, c);
  }
  // Mesmo número que o start-data (fórmula resolvida).
  for (const c of ['cleric', 'druid', 'wizard', 'bard']) assert.equal(spellPlan(mk('2014', c)).leveled, startingSpells(mk('2014', c)).prepared, c);
});

for (const rules of ['2024', '2014']) {
  test(`${rules}: truques — exatamente N, só da lista da classe`, () => {
    let c = mk(rules, 'cleric');
    assert.match(cantripIssues(c)[0].pt, /Escolha mais 3 truques/);
    // Truque de outra lista nunca entra.
    assert.equal(toggleCantrip(c, 'fireBolt'), null);
    for (const id of ['sacredFlame', 'guidance', 'light']) c = apply(c, toggleCantrip(c, id));
    assert.deepEqual(cantripIssues(c), []);
    assert.equal(toggleCantrip(c, 'thaumaturgy'), null, 'limite');
    c = apply(c, toggleCantrip(c, 'light'));
    assert.equal(chosenCantrips(c).length, 2);
    assert.match(cantripIssues(c)[0].en, /Pick 1 more cantrip/);
  });

  test(`${rules}: magias inválidas (outra classe) aparecem nas pendências e podem ser tiradas`, () => {
    // Druida que "herdou" Mísseis Mágicos e Raio de Fogo de outra classe.
    const c = mk(rules, 'druid', { spells: [{ id: 'magicMissile', prepared: true }, { id: 'fireBolt', prepared: true }, { id: 'druidcraft', prepared: true }] });
    assert.deepEqual(invalidChoices(c, 'spell').map(x => [x.id, x.reason]), [['magicMissile', 'list']]);
    assert.deepEqual(invalidChoices(c, 'cantrip').map(x => [x.id, x.reason]), [['fireBolt', 'list']]);
    assert.ok(spellIssues(c).some(i => /Mísseis Mágicos|magicMissile/.test(i.pt) && /lista/.test(i.pt)));
    assert.ok(cantripIssues(c).some(i => /lista/.test(i.pt)));
    // O inválido não conta: ainda falta 1 truque.
    assert.ok(cantripIssues(c).some(i => /Escolha mais 1 truque/.test(i.pt)));
    const noSpells = { ...c, spells: withoutInvalid(c, 'spell') };
    const clean = { ...c, spells: withoutInvalid(noSpells, 'cantrip') };
    assert.deepEqual(clean.spells.map(s => s.id), ['druidcraft']);
    assert.equal(toggleSpell(mk(rules, 'druid'), 'magicMissile'), null);
  });

  test(`${rules}: automáticas não contam e magia acima do círculo é inválida`, () => {
    const c = mk(rules, 'sorcerer', { spells: [{ id: 'light', auto: true, species: true, prepared: true }, { id: 'fireball', prepared: true }] });
    assert.equal(chosenCantrips(c).length, 0);
    assert.deepEqual(invalidChoices(c, 'spell').map(x => x.reason), ['level']);
    assert.ok(availableSpells(c).every(s => s.level === 1));
  });
}

test('2024: Bardo prepara exatamente 4; recomendadas do SRD', () => {
  let c = mk('2024', 'bard');
  assert.match(spellIssues(c)[0].pt, /Escolha mais 4 magias preparadas/);
  assert.deepEqual(recommendedSpells(c), ['healingWord', 'dissonantWhispers', 'charmPerson', 'colorSpray']);
  c = { ...c, spells: fillRecommended(c, 'spell') };
  assert.deepEqual(chosenSpells(c).sort(), ['charmPerson', 'colorSpray', 'dissonantWhispers', 'healingWord']);
  assert.deepEqual(spellIssues(c), []);
  assert.equal(toggleSpell(c, 'sleep'), null, 'a 5ª é bloqueada');
  // Truque de magia (Mísseis Mágicos) não é de Bardo.
  assert.equal(toggleSpell(mk('2024', 'bard'), 'magicMissile'), null);
});

test('2024: Paladino escolhe 2 (sem truques); Patrulheiro não gasta escolha em Marca do Caçador', () => {
  const pal = mk('2024', 'paladin');
  assert.match(spellIssues(pal)[0].pt, /2 magias preparadas/);
  assert.deepEqual(recommendedSpells(pal), ['searingSmite', 'heroism']);
  const ranger = mk('2024', 'ranger');
  assert.ok(grantedSpells(ranger).some(g => g.id === 'huntersMark' && g.source === 'class'));
  assert.ok(!availableSpells(ranger).some(s => s.id === 'huntersMark'));
  assert.equal(toggleSpell(ranger, 'huntersMark'), null);
  // Artífice 2024: Consertar já vem de graça.
  const art = mk('2024', 'artificer');
  assert.ok(!availableCantrips(art).some(s => s.id === 'mending'));
});

test('2014: Bruxo conhece exatamente 2; Clérigo prepara SAB+1 já na criação', () => {
  let w = mk('2014', 'warlock');
  w = { ...w, spells: fillRecommended(w, 'spell') };
  assert.deepEqual(chosenSpells(w).sort(), ['charmPerson', 'hex']);
  assert.deepEqual(spellIssues(w), []);
  let cl = mk('2014', 'cleric');
  cl = { ...cl, spells: fillRecommended(cl, 'spell') };
  assert.equal(chosenSpells(cl).length, 4);
  assert.deepEqual(spellIssues(cl), []);
  // Diminuir SAB reduz o limite: agora sobram magias.
  const low = { ...cl, abilities: { ...cl.abilities, wis: 10 } };
  assert.match(spellIssues(low)[0].pt, /demais: tire 3/);
});

for (const rules of ['2024', '2014']) {
  test(`${rules}: Mago — 6 no grimório e prepara dentre elas`, () => {
    let c = mk(rules, 'wizard');
    const iss = spellIssues(c).map(i => i.pt).join(' | ');
    assert.match(iss, /6 magias no grimório/);
    c = { ...c, spells: fillRecommended(c, 'spell') };
    assert.equal(chosenSpells(c).length, 6);
    assert.equal(preparedFromBook(c).length, 4);
    assert.ok(c.spells.every(s => s.inBook === true));
    assert.deepEqual(spellIssues(c), []);
    assert.equal(toggleSpell(c, 'shield'), null, 'grimório cheio');
    // Desprepara uma: falta preparar 1.
    const id = preparedFromBook(c)[0];
    c = apply(c, togglePrepared(c, id));
    assert.match(spellIssues(c)[0].pt, /Escolha mais 1 magia preparada/);
    // Tirar do grimório tira das preparadas também.
    const prepId = preparedFromBook(c)[0];
    c = apply(c, toggleSpell(c, prepId));
    assert.equal(chosenSpells(c).length, 5);
    assert.ok(!preparedFromBook(c).includes(prepId));
  });
}

test('truques de talento/espécie: aparecem como "já vem de", não são escolhíveis e duplicata é apontada', () => {
  // Mago 2024 Sábio com Iniciado em Magia (Mago): Raio de Fogo e Mão Mágica + Mísseis Mágicos.
  const feats = [{ id: 'magicInitiate', origin: 'background', picks: { spellList: 'wizard', spellAbility: 'int', cantrip: ['fireBolt', 'mageHand'], spell: ['magicMissile'] } }];
  const c = mk('2024', 'wizard', { feats });
  const g = grantedSpells(c);
  assert.deepEqual(g.filter(x => x.source === 'feat').map(x => x.id), ['fireBolt', 'mageHand', 'magicMissile']);
  assert.equal(g.find(x => x.id === 'fireBolt').from.pt, 'Iniciado em Magia');
  assert.equal(g.find(x => x.id === 'fireBolt').ability, 'int');
  assert.ok(!availableCantrips(c).some(s => s.id === 'fireBolt'));
  assert.ok(!availableSpells(c).some(s => s.id === 'magicMissile'));
  assert.equal(toggleCantrip(c, 'fireBolt'), null);
  // Já escolhido antes de pegar o talento → pendência explica de onde vem.
  const dup = { ...c, spells: [{ id: 'fireBolt', prepared: true }] };
  const issue = cantripIssues(dup).find(i => /já ganha/.test(i.pt));
  assert.match(issue.pt, /Iniciado em Magia/);
  // Recomendados nunca escolhem um truque que já vem de graça.
  const filled = { ...c, spells: fillRecommended(c, 'cantrip') };
  assert.equal(chosenCantrips(filled).length, 3);
  assert.ok(!chosenCantrips(filled).includes('fireBolt') && !chosenCantrips(filled).includes('mageHand'));
  assert.deepEqual(cantripIssues(filled), []);
});

test('ficha: origem das magias de talento e entradas fora da lista', () => {
  const feats = [{ id: 'magicInitiate', origin: 'background', picks: { spellList: 'cleric', spellAbility: 'wis', cantrip: ['guidance', 'sacredFlame'], spell: ['bless'] } }];
  const c = mk('2024', 'fighter', { feats, spells: [{ id: 'guidance', auto: true, feat: true, prepared: true }] });
  const src = grantSource(c, c.spells[0]);
  assert.equal(src.from.en, 'Magic Initiate');
  assert.equal(src.ability, 'wis');
  const d = mk('2024', 'druid', { spells: [{ id: 'magicMissile', prepared: true }, { id: 'cureWounds', prepared: true }] });
  assert.deepEqual(offListEntries(d).map(s => s.id), ['magicMissile']);
});

test('sugestões para iniciantes ficam na lista da classe nas duas regras', () => {
  for (const rules of ['2024', '2014']) {
    for (const cls of ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard', 'artificer']) {
      const c = mk(rules, cls);
      const ids = beginnerCantrips(c);
      assert.ok(ids.length >= 1, `${rules} ${cls}`);
      ids.forEach(id => assert.ok(availableCantrips(c).some(s => s.id === id) || grantedSpells(c).some(g => g.id === id), `${rules} ${cls} ${id}`));
    }
  }
  assert.ok(beginnerCantrips(mk('2014', 'sorcerer')).includes('fireBolt'));
  assert.ok(!beginnerCantrips(mk('2014', 'sorcerer')).includes('sorcerousBurst'));
});

// ---------------------------------------------------------------------------
// Bugs do teste de navegador (grupo magias)
// ---------------------------------------------------------------------------
const mi = (list, cantrip, spell = [], origin = 'background') => [{ id: 'magicInitiate', origin, picks: { spellList: list, spellAbility: 'int', cantrip, spell } }];

test('duplicata entre classe, talento e espécie trava com aviso que diz onde trocar', () => {
  // A: Mago + Iniciado em Magia (Prestidigitação) + Gnomo das Rochas (já dá Prestidigitação).
  const a = mk('2024', 'wizard', { feats: mi('wizard', ['fireBolt', 'prestidigitation'], ['magicMissile']), race: 'gnome', speciesChoices: { lineage: 'rock', spellAbility: 'int' } });
  assert.deepEqual(duplicateGrants(a).map(d => d.id), ['prestidigitation']);
  assert.match(cantripIssues(a)[0].pt, /Prestidigitação vem duas vezes.*Iniciado em Magia.*Talento de origem/);
  // B: Clérigo Taumaturgo com Luz + Iniciado em Magia (Clérigo) com Luz.
  const b2 = mk('2024', 'cleric', {
    classOptions: [{ classId: 'cleric', pool: 'divineOrder', id: 'thaumaturge', level: 1 }, { classId: 'cleric', pool: 'thaumaturgeCantrip', id: 'light', level: 1 }],
    feats: mi('cleric', ['light', 'guidance'], ['bless']),
  });
  const issue = cantripIssues(b2).find(i => /Luz vem duas vezes/.test(i.pt));
  assert.ok(issue, 'aviso da Luz');
  assert.match(issue.pt, /Truque do Taumaturgo/);
  // D: Druida (Falar com Animais sempre preparada) + Iniciado em Magia com a mesma magia.
  const d = mk('2024', 'druid', { feats: mi('druid', ['guidance', 'druidcraft'], ['speakWithAnimals']) });
  assert.match(spellIssues(d)[0].pt, /Falar com Animais vem duas vezes/);
  assert.deepEqual(duplicateGrantIssues(d, 'cantrip'), []);
  // Sem repetição: nada.
  assert.deepEqual(duplicateGrants(mk('2024', 'wizard', { feats: mi('wizard', ['fireBolt', 'mageHand'], ['magicMissile']) })), []);
});

test('Bruxo 2014: Lista Expandida do patrono só amplia a lista (não vem de graça)', () => {
  const w = mk('2014', 'warlock', { subclass: 'fiend' });
  assert.deepEqual(grantedSpells(w), []);
  assert.ok(expandedSpellIds(w).has('burningHands') && expandedSpellIds(w).has('commandSpell'));
  assert.ok(availableSpells(w).some(s => s.id === 'burningHands'));
  let c = apply(w, toggleSpell(w, 'burningHands'));
  c = apply(c, toggleSpell(c, 'commandSpell'));
  assert.deepEqual(spellIssues(c), []);
  assert.equal(toggleSpell(c, 'hex'), null, 'só 2 conhecidas');
  // Sem patrono a magia não é da lista do bruxo.
  assert.equal(toggleSpell(mk('2014', 'warlock'), 'burningHands'), null);
  assert.ok(availableSpells(mk('2014', 'warlock', { subclass: 'greatoldone' })).some(s => s.id === 'dissonantWhispers'));
  // 2024 continua com as magias do patrono sempre preparadas (nível 3).
  assert.ok(grantedSpells(mk('2024', 'warlock', { subclass: 'fiend', level: 3 })).some(g => g.id === 'burningHands'));
});

test('nomes PT distintos: Maldição (Hex) × Perdição (Bane); Arte Druídica', () => {
  assert.equal(tName('spellName', 'hex', 'pt'), 'Maldição');
  assert.equal(tName('spellName', 'bane', 'pt'), 'Perdição');
  assert.equal(tName('spellName', 'druidcraft', 'pt'), 'Arte Druídica');
  for (const cat of [SPELLS_2024, SRD.SPELLS]) {
    const seen = new Map();
    for (const s of cat) {
      const n = tName('spellName', s.id, 'pt').toLowerCase();
      assert.ok(!seen.has(n) || seen.get(n) === s.id, `${s.id} e ${seen.get(n)} com o mesmo nome "${n}"`);
      seen.set(n, s.id);
    }
  }
});

test('magias de outros livros ficam separadas (livro básico × suplementos)', () => {
  const find = (cat, id) => cat.find(s => s.id === id);
  assert.equal(isCoreSpell(find(SPELLS_2024, 'magicMissile'), mk('2024', 'wizard')), true);
  assert.equal(isCoreSpell(find(SPELLS_2024, 'jimsMagicMissile'), mk('2024', 'wizard')), false);
  assert.equal(isCoreSpell(find(SPELLS_2024, 'absorbElements'), mk('2024', 'wizard')), false);
  assert.equal(isCoreSpell(find(SPELLS_2024, 'tollTheDead'), mk('2024', 'cleric')), true, 'PHB 2024');
  assert.equal(isCoreSpell(find(SRD.SPELLS, 'tollTheDead'), mk('2014', 'cleric')), false, 'em 2014 é do XGE');
  assert.equal(isCoreSpell(find(SRD.SPELLS, 'sacredFlame'), mk('2014', 'cleric')), true);
  // Recomendadas sempre do livro básico.
  for (const cls of ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard']) {
    const c = mk('2024', cls);
    recommendedSpells(c).forEach(id => assert.ok(isCoreSpell(find(SPELLS_2024, id), c), `${cls} ${id}`));
  }
});

test('tempo, alcance, componentes e duração em português (metros) nas magias sem texto do SRD', () => {
  assert.equal(rangePt('60 feet'), '18 metros');
  assert.equal(rangePt('120 ft'), '36 metros');
  assert.equal(rangePt('Self (15-foot cone)'), 'Pessoal (cone de 4,5 metros)');
  assert.equal(rangePt('Self (5-foot radius)'), 'Pessoal (raio de 1,5 metro)');
  assert.equal(rangePt('Touch'), 'Toque');
  assert.equal(rangePt('1 mile'), '1,5 quilômetro');
  assert.equal(castingTimePt('1 action'), 'Ação');
  assert.equal(castingTimePt('Action or Ritual'), 'Ação ou Ritual');
  assert.equal(castingTimePt('1 hour or Ritual'), '1 hora ou Ritual');
  assert.match(castingTimePt('Reaction, which you take when you take acid, cold, fire, lightning, or thunder damage'), /^Reação, que você realiza quando você sofre dano de ácido/);
  assert.equal(durationPt('Concentration, up to 1 minute'), 'Concentração, até 1 minuto');
  assert.equal(durationPt('1 min, conc'), 'Concentração, até 1 minuto');
  assert.equal(durationPt('Conc. 1 hour'), 'Concentração, até 1 hora');
  assert.equal(durationPt('Instant'), 'Instantânea');
  assert.equal(componentsPt('V, S, M (a gem worth at least 50 gp)'), 'V, S, M (vale 50+ PO)');
  assert.equal(componentsPt('S, M (a pinch of sand)'), 'S, M');
  const english = /(?<![\wÀ-ÿ])(feet|ft|foot|action|which|you|self|touch|minutes?|hours?|rounds?|instant(aneous)?|until|concentration|conc|up to|worth|bonus|reaction|days?|mile)(?![\wÀ-ÿ])/i;
  const all = [...EXTRA_SPELLS_2024, ...SRD.SPELLS];
  for (const s of all) {
    const m = Utils.spellMeta(s, 'pt');
    for (const k of ['castingTime', 'range', 'components', 'duration']) assert.ok(!english.test(m[k] || ''), `${s.id}.${k}: "${m[k]}"`);
  }
  // Os mesmos dados alimentam a ficha (Utils.spellMeta).
  assert.equal(Utils.spellMeta(SRD.SPELLS.find(s => s.id === 'fireBolt'), 'pt').range, '36 metros');
  assert.equal(Utils.spellMeta(SRD.SPELLS.find(s => s.id === 'fireBolt'), 'en').range, '120 ft');
  assert.deepEqual(translateSpellMeta({ castingTime: 'Bonus Action', range: 'Self', components: 'V', duration: '1 round' }),
    { castingTime: 'Ação Bônus', range: 'Pessoal', components: 'V', duration: '1 rodada' });
});

test('2014: resumo de uma linha com a regra 2014 (Orbe Cromático sem o salto de 2024) e textos sem "SAL DEST"/pés', () => {
  const orb14 = SRD.SPELLS.find(s => s.id === 'chromaticOrb');
  const orb24 = SPELLS_2024.find(s => s.id === 'chromaticOrb');
  assert.match(orb14.desc.pt, /3d8/);
  assert.ok(orb14.desc.pt.length < 200, 'uma linha');
  assert.ok(!/salt|leap/i.test(orb14.desc.pt + orb14.desc.en), 'sem o salto de 2024');
  assert.ok(orb24.desc.pt.length > orb14.desc.pt.length, '2024 continua com o texto do SRD 5.2.1');
  for (const id of ['floatingDisk', 'illusoryScript', 'unseenServant', 'iceKnife', 'hellishRebuke']) {
    assert.ok(SRD.SPELLS.find(s => s.id === id).desc.pt.length < 200, id);
  }
  for (const s of SRD.SPELLS) assert.ok(!/\bSAL\b|\bpés\b|\bHP\b/.test(s.desc?.pt || ''), `${s.id}: ${s.desc?.pt}`);
  assert.equal(polishPtText('SAL DEST ou 1d6 em 20 pés; 0 HP.'), 'salvaguarda de Destreza ou 1d6 em 6 metros; 0 PV.');
});
