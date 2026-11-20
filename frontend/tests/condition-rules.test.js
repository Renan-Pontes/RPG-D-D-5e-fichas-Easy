// Estados da ficha: o que cada um faz (texto), onde pesa (marcas) e a ordem dos estados.
// Tudo informativo: estes testes também conferem as marcas contra o texto do Grimório.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARTICLES, CONDITION_ARTICLE as GRIMOIRE_MAP } from '../data/grimoire/index.js';
import { CONDITION_SHORTS, STATE_SHORTS } from '../data/grimoire/condition-shorts.js';
import {
  CONDITION_ARTICLE, CONDITION_IDS, FAMILY, PRIORITY, byPriority, conditionLine, bitesFor, activeBites,
  stanceHint, saveBite, speedBite, exhaustionLine, hpFlags, statusList, statusLabel, sourceNames, stripList, WHEN,
} from '../src/sheet/condition-rules.js';
import { hpFxKind } from '../src/sheet/hp-feedback.js';
import { artStack, condClasses } from '../src/sheet/condition-rules.js';

const byId = new Map(ARTICLES.map(a => [a.id, a]));
const art = (id) => byId.get(CONDITION_ARTICLE[id]);
const names = (list) => list.map(s => s.id);

test('estados: as 15 condições têm artigo, família, prioridade e a linha curta nas duas línguas', () => {
  assert.deepEqual(CONDITION_ARTICLE, GRIMOIRE_MAP);
  assert.equal(CONDITION_IDS.length, 15);
  assert.deepEqual([...PRIORITY].sort(), [...CONDITION_IDS].sort());
  for (const id of CONDITION_IDS) {
    assert.ok(FAMILY[id], `${id}: sem família`);
    const a = art(id);
    assert.ok(a.short && a.short.pt && a.short.en, `${id}: artigo sem short`);
    for (const lang of ['pt', 'en']) {
      for (const v of ['2024', '2014']) {
        const line = conditionLine(id, lang, v);
        assert.ok(line.length >= 12 && line.length <= 90, `${id} ${lang} ${v}: ${line.length} caracteres`);
        assert.ok(!/[.!]$/.test(line), `${id} ${lang}: a linha não termina com ponto`);
      }
    }
  }
  assert.equal(conditionLine('nope', 'pt', '2024'), '');
});

test('estados: short2014 só existe onde o artigo diz que 2014 é diferente, e é usado fora de 2024', () => {
  for (const [key, e] of Object.entries(CONDITION_SHORTS)) {
    const a = byId.get(key);
    assert.ok(a, `linha curta sem artigo: ${key}`);
    if (e.short2014) assert.ok(a.versions, `${key}: short2014 sem campo versions no artigo`);
  }
  for (const id of ['exhausted', 'grappled', 'incapacitated', 'invisible', 'stunned']) {
    assert.notEqual(conditionLine(id, 'pt', '2024'), conditionLine(id, 'pt', '2014'), id);
    assert.equal(conditionLine(id, 'pt', undefined), conditionLine(id, 'pt', '2014'), `${id}: sem versão = 2014`);
  }
  assert.equal(conditionLine('poisoned', 'en', '2014'), conditionLine('poisoned', 'en', '2024'));
  assert.equal(conditionLine('poisoned', 'pt', '2024'), 'Desvantagem em jogadas de ataque e testes de atributo');
  for (const e of Object.values(STATE_SHORTS)) {
    assert.ok(byId.has(e.article), `estado sem artigo: ${e.article}`);
    for (const k of ['short', 'short2014']) if (e[k]) for (const l of ['pt', 'en']) assert.ok(e[k][l].length <= 90);
  }
});

test('marcas: cada marca de 2024 bate com o texto do artigo do Grimório', () => {
  for (const id of CONDITION_IDS) {
    if (id === 'exhausted') continue;
    const b = bitesFor(id, '2024');
    const txt = `${art(id).simple.en} ${art(id).srd.text}`;
    if (b.attacks === 'dis') assert.match(txt, /(attacks? (rolls? )?(have|has) \*{0,2}Disadvantage)|(Disadvantage\*{0,2} on[^.]*attack)/i, `${id}: ataques com desvantagem`);
    if (b.attacks === 'adv') assert.match(txt, /attack rolls have Advantage|attacks have \*\*Advantage/i, `${id}: ataques com vantagem`);
    if (b.checks === 'dis') assert.match(txt, /Disadvantage\*{0,2} on[^.]*ability checks/i, `${id}: testes`);
    if (b.speed === 'zero') assert.match(txt, /Speed (is|becomes) \*{0,2}0|Speed 0/i, `${id}: deslocamento 0`);
    if (b.noActions) assert.match(txt, /no action|can’t take any action/i, `${id}: sem ações`);
    if (b.attackedBy === 'adv') assert.match(txt, /against you have \*{0,2}Advantage/i, `${id}: atacado com vantagem`);
    if (b.attackedBy === 'dis') assert.match(txt, /against you have \*{0,2}Disadvantage/i, `${id}: atacado com desvantagem`);
    if (b.saves?.dex === 'dis') assert.match(txt, /Disadvantage\*{0,2} on Dexterity sav/i, `${id}: DES`);
    if (b.saves?.str === 'fail') assert.match(txt, /fail\*{0,2} Strength and Dexterity sav/i, `${id}: falha FOR/DES`);
    if (b.initiative) assert.match(txt, /Initiative/i, `${id}: iniciativa`);
    for (const inc of b.includes || []) assert.match(txt, new RegExp(inc === 'prone' ? 'Prone' : 'Incapacitated'), `${id}: inclui ${inc}`);
    // quem não tem marca nenhuma no próprio d20 não fala de vantagem/desvantagem do personagem
    if (!Object.keys(b).length) assert.doesNotMatch(art(id).srd.text, /your attack rolls|You have Disadvantage/i, id);
  }
});

test('marcas: 2014 só muda o que o campo versions diz (agarrado, incapacitado, invisível, atordoado)', () => {
  assert.deepEqual(bitesFor('grappled', '2014'), { speed: 'zero' });
  assert.equal(bitesFor('grappled', '2024').attacks, 'dis');
  assert.equal(bitesFor('incapacitated', '2014').initiative, undefined);
  assert.equal(bitesFor('invisible', '2014').initiative, undefined);
  assert.equal(bitesFor('stunned', '2014').speed, 'zero');
  assert.equal(bitesFor('stunned', '2024').speed, undefined);
  assert.deepEqual(bitesFor('poisoned', '2014'), bitesFor('poisoned', '2024'));
  for (const id of ['grappled', 'incapacitated', 'invisible', 'stunned']) assert.ok(art(id).versions, `${id}: sem versions`);
});

test('activeBites: junta as fontes, sem repetir, e nunca escolhe a rolagem', () => {
  const b = activeBites({ rulesVersion: '2024', conditions: ['poisoned', 'prone', 'frightened'], currentHp: 10, maxHp: 13 }, 'pt');
  assert.deepEqual(names(b.attacks.dis).sort(), ['frightened', 'poisoned', 'prone']);
  assert.deepEqual(names(b.checks.dis).sort(), ['frightened', 'poisoned']);
  assert.equal(b.attacks.adv.length, 0);
  assert.ok(b.any);
  const h = stanceHint(b, 'attacks');
  assert.equal(h.suggest, 'dis');
  assert.match(sourceNames(h.dis), /Amedrontado \(fonte do medo à vista\) · /);
  assert.match(sourceNames(h.dis), /Envenenado/);
  assert.equal(h.conditional, false, 'Envenenado não tem ressalva: a seta fica cheia');
  assert.equal(stanceHint(b, 'checks').suggest, 'dis');
  assert.equal(stanceHint(activeBites({ conditions: [] }, 'pt'), 'attacks'), null);
  assert.equal(activeBites({ conditions: [] }, 'pt').any, false);
});

test('activeBites: vantagem e desvantagem juntas viram Normal; condições embutidas contam', () => {
  const b = activeBites({ rulesVersion: '2024', conditions: ['invisible', 'poisoned'], currentHp: 5, maxHp: 10 }, 'en');
  const h = stanceHint(b, 'attacks');
  assert.equal(h.suggest, 'normal');
  assert.deepEqual([names(h.adv), names(h.dis)], [['invisible'], ['poisoned']]);
  // iniciativa é um teste de Destreza: Envenenado (testes) + Invisível (iniciativa, 2024) = Normal
  assert.equal(stanceHint(b, 'initiative').suggest, 'normal');
  assert.equal(stanceHint(activeBites({ rulesVersion: '2014', conditions: ['invisible'] }, 'en'), 'initiative'), null);

  const p = activeBites({ rulesVersion: '2024', conditions: ['paralyzed'], currentHp: 5, maxHp: 10 }, 'pt');
  assert.deepEqual(names(p.noActions), ['paralyzed']);          // Paralisado já é Incapacitado
  assert.deepEqual(names(p.initiative.dis), ['paralyzed']);
  assert.deepEqual(saveBite(p, 'str'), { kind: 'fail', sources: p.saves.str.fail });
  assert.equal(saveBite(p, 'con'), null);
  assert.equal(speedBite(p, 'pt').text, '→ 0');
  const r = activeBites({ rulesVersion: '2024', conditions: ['restrained'], currentHp: 5, maxHp: 10 }, 'pt');
  assert.equal(saveBite(r, 'dex').kind, 'dis');
  assert.equal(saveBite(r, 'str'), null);
  assert.equal(activeBites({ rulesVersion: '2024', conditions: ['stunned'] }, 'pt').speed.zero.length, 0);
  assert.equal(activeBites({ rulesVersion: '2014', conditions: ['stunned'] }, 'pt').speed.zero.length, 1);
});

test('activeBites: 0 PV conta como Inconsciente; Exaustão por edição; Inspiração', () => {
  const d = activeBites({ rulesVersion: '2024', conditions: [], currentHp: 0, maxHp: 13 }, 'pt');
  assert.deepEqual(d.noActions.map(s => s.name), ['0 PV']);
  assert.equal(saveBite(d, 'dex').kind, 'fail');
  assert.equal(activeBites({ rulesVersion: '2024', conditions: ['unconscious'], currentHp: 0, maxHp: 13 }, 'pt').noActions.length, 1);

  const e24 = activeBites({ rulesVersion: '2024', exhaustionLevel: 2, conditions: ['exhausted'], currentHp: 5, maxHp: 10 }, 'pt');
  assert.equal(e24.d20Penalty.n, 4);
  assert.equal(speedBite(e24, 'pt').text, '−3 m');
  assert.equal(speedBite(e24, 'en').text, '−10 ft');
  assert.equal(stanceHint(e24, 'attacks'), null);                // 2024 é número, não desvantagem
  const e14 = activeBites({ rulesVersion: '2014', exhaustionLevel: 3, conditions: ['exhausted'], currentHp: 5, maxHp: 10 }, 'pt');
  assert.equal(e14.d20Penalty, null);
  assert.equal(stanceHint(e14, 'checks').suggest, 'dis');
  assert.equal(stanceHint(e14, 'attacks').dis[0].name, 'Exaustão 3');
  assert.equal(saveBite(e14, 'wis').kind, 'dis');
  assert.equal(speedBite(e14, 'pt').kind, 'half');
  assert.equal(speedBite(activeBites({ rulesVersion: '2014', exhaustionLevel: 5 }, 'pt'), 'pt').kind, 'zero');
  assert.equal(activeBites({ rulesVersion: '2014', exhaustionLevel: 1 }, 'pt').attacks.dis.length, 0);
  assert.equal(activeBites({ inspiration: true }, 'pt').inspiration, true);
});

test('desvantagem com ressalva (Amedrontado, Agarrado): a marca é condicional, com as palavras do Grimório', () => {
  const fear = activeBites({ rulesVersion: '2024', conditions: ['frightened'], currentHp: 10, maxHp: 13 }, 'pt');
  for (const kind of ['attacks', 'checks', 'initiative']) {
    const h = stanceHint(fear, kind);
    assert.equal(h.suggest, 'dis', kind);
    assert.equal(h.conditional, true, kind);
    assert.deepEqual(h.clauses, ['com a fonte do medo à vista'], kind);
  }
  const grap = stanceHint(activeBites({ rulesVersion: '2024', conditions: ['grappled'], currentHp: 10, maxHp: 13 }, 'en'), 'attacks');
  assert.ok(grap.conditional);
  assert.deepEqual(grap.clauses, ['against anyone but the grappler']);
  assert.equal(sourceNames(grap.dis), 'Grappled (against anyone but the grappler)');
  // duas ressalvas diferentes continuam condicionais; uma fonte sem ressalva torna a marca incondicional
  const both = stanceHint(activeBites({ rulesVersion: '2024', conditions: ['frightened', 'grappled'], currentHp: 10, maxHp: 13 }, 'pt'), 'attacks');
  assert.ok(both.conditional);
  assert.equal(both.clauses.length, 2);
  const mixed = stanceHint(activeBites({ rulesVersion: '2024', conditions: ['frightened', 'prone'], currentHp: 10, maxHp: 13 }, 'pt'), 'attacks');
  assert.equal(mixed.conditional, false);
  assert.deepEqual(mixed.clauses, []);
  // com vantagem do outro lado, o resultado é Normal (sem ressalva na marca)
  assert.equal(stanceHint(activeBites({ rulesVersion: '2024', conditions: ['frightened', 'invisible'], currentHp: 10, maxHp: 13 }, 'pt'), 'attacks').conditional, false);
  // as ressalvas são as palavras da linha curta do artigo
  for (const lang of ['pt', 'en']) {
    assert.ok(CONDITION_SHORTS.amedrontado.short[lang].toLowerCase().includes(WHEN.fear.clause[lang]), `medo ${lang}`);
    assert.ok(CONDITION_SHORTS.amedrontado.short[lang].toLowerCase().includes(WHEN.fear.when[lang]), `medo (curta) ${lang}`);
    assert.ok(CONDITION_SHORTS.agarrado.short[lang].includes(WHEN.grappler.clause[lang]), `agarrado ${lang}`);
    assert.equal(WHEN.grappler.when[lang], WHEN.grappler.clause[lang]);
  }
});

test('morto não ganha lembrete nem sugestão; sem ações não há ataque nem teste para sugerir', () => {
  const dead = activeBites({ rulesVersion: '2024', conditions: ['poisoned', 'restrained'], currentHp: 0, maxHp: 13, deathSaves: { fail: 3, success: 0 }, inspiration: true }, 'pt');
  assert.equal(dead.any, false);
  assert.equal(dead.attacks.dis.length + dead.checks.dis.length + dead.noActions.length + dead.speed.zero.length, 0);
  assert.equal(dead.inspiration, false);
  for (const kind of ['attacks', 'checks', 'initiative']) assert.equal(stanceHint(dead, kind), null, kind);
  assert.equal(saveBite(dead, 'dex'), null);
  const exh6 = activeBites({ rulesVersion: '2014', conditions: ['poisoned', 'exhausted'], exhaustionLevel: 6, currentHp: 9, maxHp: 13 }, 'pt');
  assert.equal(exh6.any, false);
  assert.equal(exh6.exhaustion, 6, 'o nível continua para a barra');
  // 0 PV (caído, rolando testes contra a morte) + Envenenado: sem ações; nada de "Desv. em testes"
  const down = activeBites({ rulesVersion: '2024', conditions: ['poisoned'], currentHp: 0, maxHp: 13, deathSaves: { fail: 1, success: 1 } }, 'pt');
  assert.equal(down.noActions.length, 1);
  assert.equal(stanceHint(down, 'checks'), null);
  assert.equal(stanceHint(down, 'attacks'), null);
  assert.equal(stanceHint(down, 'initiative').suggest, 'dis', 'a iniciativa continua marcada');
  assert.equal(saveBite(down, 'str').kind, 'fail');
  // Atordoado + Envenenado: a mesma coisa
  assert.equal(stanceHint(activeBites({ rulesVersion: '2024', conditions: ['stunned', 'poisoned'], currentHp: 5, maxHp: 13 }, 'pt'), 'checks'), null);
  // morto: o retrato e a borda são só os do morto
  assert.deepEqual(artStack({ currentHp: 0, maxHp: 13, deathSaves: { fail: 3 }, conditions: ['poisoned', 'restrained'] }), ['dead']);
  assert.deepEqual(artStack({ currentHp: 9, maxHp: 13, exhaustionLevel: 6, conditions: ['exhausted', 'frightened'], wildShape: { active: true } }), ['dead']);
  assert.ok(condClasses({ currentHp: 0, maxHp: 13, deathSaves: { fail: 3 }, conditions: ['poisoned'] }).includes('pf-dead'));
});

test('faixa do celular: só com um estado que tem aonde levar; Inspiração e Forma Selvagem acompanham', () => {
  assert.deepEqual(stripList({ currentHp: 13, maxHp: 13, inspiration: true }), { main: [], extra: [], target: null });
  assert.deepEqual(stripList({ currentHp: 13, maxHp: 13, wildShape: { active: true }, inspiration: true }).main, []);
  const a = stripList({ currentHp: 13, maxHp: 13, conditions: ['poisoned'], inspiration: true, wildShape: { active: true } });
  assert.deepEqual(a.main.map(s => s.key), ['c-poisoned']);
  assert.deepEqual(a.extra.map(s => s.key), ['wild', 'inspired']);
  assert.equal(a.target, 'list');
  assert.equal(stripList({ currentHp: 0, maxHp: 13, conditions: ['prone'] }).target, 'death');
  assert.equal(stripList({ currentHp: 0, maxHp: 13, deathSaves: { fail: 3 } }).target, 'death');
  assert.equal(stripList({ currentHp: 5, maxHp: 13 }).target, null, 'Sangrando sozinho não abre a faixa');
  assert.equal(stripList({ currentHp: 2, maxHp: 13 }).target, 'list', 'à beira da morte abre');
  assert.deepEqual(stripList({ currentHp: 5, maxHp: 13, conditions: ['prone'] }).extra.map(s => s.key), ['bloodied']);
  assert.deepEqual(stripList({ currentHp: 13, maxHp: 13, tempEffects: [{ id: 'a', name: 'Bênção' }] }).main.map(s => s.key), ['t-a']);
  assert.deepEqual(stripList({ currentHp: 13, maxHp: 13, exhaustionLevel: 1, conditions: ['exhausted'] }).main.map(s => s.key), ['c-exhausted']);
});

test('exhaustionLine: 2024 calcula só para mostrar; 2014 lista o efeito de cada nível; 6 é morte', () => {
  assert.equal(exhaustionLine(0, 'pt', '2024'), null);
  assert.equal(exhaustionLine(2, 'pt', '2024').text, 'Exaustão 2: −4 em todo Teste de d20 · deslocamento −3 m');
  assert.equal(exhaustionLine(3, 'pt', '2024').text, 'Exaustão 3: −6 em todo Teste de d20 · deslocamento −4,5 m');
  assert.equal(exhaustionLine(2, 'en', '2024').text, 'Exhaustion 2: −4 on every D20 Test · Speed −10 ft');
  assert.equal(exhaustionLine(2, 'pt', '2014').text, 'Exaustão 2: nv. 1 desvantagem em testes de atributo · nv. 2 deslocamento pela metade');
  assert.equal(exhaustionLine(2, 'en', '2014').text, 'Exhaustion 2: Lv 1 Disadvantage on ability checks · Lv 2 Speed halved');
  for (const v of ['2014', '2024']) {
    const d = exhaustionLine(6, 'pt', v);
    assert.ok(d.dead);
    assert.equal(d.text, 'Exaustão 6: morte');
  }
  // os seis efeitos de 2014 são os do campo versions do artigo, na ordem
  const versions = byId.get('exaustao').versions;
  for (const [i, lv] of CONDITION_SHORTS.exaustao.levels2014.entries()) {
    assert.ok(versions.pt.toLowerCase().includes(`${i + 1} ${lv.pt}`.toLowerCase()), `nível ${i + 1} pt`);
    assert.ok(versions.en.toLowerCase().includes(`${i + 1} ${lv.en}`.toLowerCase()), `nível ${i + 1} en`);
  }
});

test('hpFlags / statusList: do mais grave ao mais leve, com a Exaustão pelo nível', () => {
  assert.deepEqual(hpFlags({ currentHp: 13, maxHp: 13 }), { down: false, dead: false, stable: false, dying: false, bloodied: false, near: false, temp: 0, exh: 0 });
  assert.ok(hpFlags({ currentHp: 6, maxHp: 13 }).bloodied && !hpFlags({ currentHp: 6, maxHp: 13 }).near);
  assert.ok(hpFlags({ currentHp: 1, maxHp: 13 }).near);
  assert.ok(hpFlags({ currentHp: 0, maxHp: 13 }).dying);
  assert.ok(hpFlags({ currentHp: 0, maxHp: 13, deathSaves: { success: 3, fail: 0 } }).stable);
  assert.ok(hpFlags({ currentHp: 0, maxHp: 13, stabilized: { hours: 2 } }).stable);
  assert.ok(hpFlags({ currentHp: 0, maxHp: 13, deathSaves: { success: 0, fail: 3 } }).dead);
  assert.ok(hpFlags({ currentHp: 9, maxHp: 13, exhaustionLevel: 6 }).dead, 'Exaustão 6 = morte');

  const list = statusList({
    currentHp: 3, maxHp: 13, conditions: ['invisible', 'poisoned', 'exhausted', 'paralyzed'], exhaustionLevel: 2,
    tempEffects: [{ id: 'a', name: 'Bênção', duration: '1 min' }], inspiration: true, wildShape: { active: true, beastName: 'Lobo' },
  });
  assert.deepEqual(list.map(s => s.key), ['c-paralyzed', 'c-poisoned', 'c-invisible', 'near', 'c-exhausted', 'wild', 't-a', 'inspired']);
  assert.equal(statusLabel(list[4], 'pt'), 'Exaustão 2');
  assert.equal(statusLabel(list[4], 'en'), 'Exhaustion 2');
  assert.equal(statusLabel(list[3], 'pt'), 'À beira da morte');
  assert.equal(statusLabel(list[6], 'pt'), 'Bênção');
  assert.equal(list[2].fam, 'boon');
  assert.deepEqual(statusList({ currentHp: 0, maxHp: 13, conditions: ['prone'] }).map(s => s.key), ['dying', 'c-prone']);
  assert.deepEqual(statusList({ currentHp: 13, maxHp: 13 }), []);
  assert.deepEqual(byPriority(['prone', 'petrified', 'x', 'prone']), ['petrified', 'prone']);
});

test('retrato: uma ordem só para camadas, filtro e classes da raiz', () => {
  const c = { currentHp: 13, maxHp: 13, conditions: ['prone', 'poisoned', 'frightened'] };
  assert.deepEqual(artStack(c), ['frightened', 'poisoned', 'prone']);
  const cls = condClasses(c);
  assert.ok(cls.includes('pf-frightened') && cls.includes('c-prone') && cls.includes('has-status'));
  assert.equal(cls.filter(x => x.startsWith('pf-')).length, 1, 'um filtro só');
  assert.deepEqual(condClasses({ currentHp: 13, maxHp: 13, conditions: [] }), []);
  assert.deepEqual(artStack({ currentHp: 0, maxHp: 13, conditions: ['unconscious', 'prone'] }), ['dying', 'prone'], 'a 0 PV não há "Zz"');
  assert.deepEqual(artStack({ currentHp: 3, maxHp: 13, conditions: ['unconscious'] }), ['unconscious', 'near']);
  assert.ok(condClasses({ currentHp: 13, maxHp: 13, tempEffects: [{ id: 'a', name: 'Bênção' }] }).includes('has-effect'));
  const dead = condClasses({ currentHp: 0, maxHp: 13, deathSaves: { fail: 3 }, conditions: [] });
  assert.ok(dead.includes('is-dead') && dead.includes('is-down') && dead.includes('pf-dead') && !dead.includes('is-dying'));
  const exh = condClasses({ currentHp: 13, maxHp: 13, exhaustionLevel: 3, conditions: ['exhausted'] });
  assert.ok(exh.includes('c-exhausted') && exh.includes('exh-3') && exh.includes('pf-exhausted'));
  assert.ok(condClasses({ currentHp: 13, maxHp: 13, exhaustionLevel: 6, conditions: ['exhausted'] }).includes('is-dead'));
  assert.ok(condClasses({ currentHp: 13, maxHp: 13, wildShape: { active: true } }).includes('is-wild'));
  assert.ok(condClasses({ currentHp: 5, maxHp: 13 }).includes('is-bloodied'));
});

test('hpFxKind: o tamanho da batida muda o retorno visual', () => {
  const k = (hp0, t0, hp1, t1, max = 20) => hpFxKind({ hp: hp0, temp: t0 }, { hp: hp1, temp: t1 }, max);
  assert.equal(k(20, 0, 18, 0), 'hit');
  assert.equal(k(20, 0, 15, 0), 'bighit');      // 25% do máximo
  assert.equal(k(20, 4, 18, 0), 'bighit');      // 4 temporários + 2 de PV = 6
  assert.equal(k(6, 0, 0, 0), 'down');
  assert.equal(k(10, 5, 10, 0), 'absorb');      // os temporários seguraram tudo
  assert.equal(k(0, 0, 7, 0), 'revive');
  assert.equal(k(3, 0, 9, 0), 'heal');
  assert.equal(k(10, 0, 10, 5), '');            // ganhar temporários não é batida
});
