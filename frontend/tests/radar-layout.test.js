/* Radares do Raio-X (src/group/radar-layout.js): os rótulos dos eixos cabem sem se sobrepor nos
 * tamanhos que a tela usa, e a escala dos bônus não espreme tudo no centro (F2.2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as L from '../src/group/radar-layout.js';
import * as M from '../src/group/party-metrics.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/party-jogo-e-combate.json', import.meta.url), 'utf8'));
const facts = M.partyFacts(M.partyMembers(fixture.members), 'pt');
const byAbility = M.SKILLS.slice().sort((a, b) => M.ABILS.indexOf(M.SKILL_ABILITY[a]) - M.ABILS.indexOf(M.SKILL_ABILITY[b]));

function fits(axes, size, labelSize) {
  const pad = L.autoPad(axes, labelSize);
  const layout = L.radarLabelLayout({ axes, size, pad, labelSize });
  return { ...L.labelsFit(layout, size), layout, R: size / 2 - pad };
}

test('perícias (18 eixos): nome em cada eixo, 12 px, sem sobrepor e dentro do quadro — individual, Sobrepor e do grupo', () => {
  for (const lang of ['pt', 'en']) {
    for (const order of [M.SKILLS, byAbility]) {
      const axes = order.map(k => ({ key: k, label: L.shortSkill(k, lang) }));
      for (const size of [L.SKILL_RADAR.each, L.SKILL_RADAR.overlay, L.SKILL_RADAR.group]) {
        const f = fits(axes, size, L.SKILL_RADAR.labelSize);
        assert.deepEqual(f.overlaps, [], `${lang} ${size}: ${JSON.stringify(f.overlaps)}`);
        assert.ok(f.inside, `${lang} ${size}: algum rótulo sai do quadro`);
        assert.ok(f.R >= 60, `${lang} ${size}: sobra raio para o polígono (${f.R})`);
        assert.equal(f.layout.length, 18);
        assert.ok(f.layout.every(l => l.lines.join('').length > 0), 'todo eixo tem nome');
      }
    }
  }
  assert.ok(L.SKILL_RADAR.labelSize >= 12, '≥ 12 px no PC');
  // o radar pequeno de antes (190) não comportava os nomes: a conta acusa
  const small = fits(byAbility.map(k => ({ key: k, label: L.shortSkill(k, 'pt') })), 190, 12);
  assert.ok(small.overlaps.length > 0 || !small.inside || small.R < 40);
});

test('abreviações das perícias: até 8 letras, todas diferentes, nas duas línguas', () => {
  for (const lang of ['pt', 'en']) {
    const labels = M.SKILLS.map(k => L.shortSkill(k, lang));
    assert.equal(new Set(labels).size, 18, labels.join(' '));
    for (const s of labels) assert.ok(s.length <= 8, s);
  }
  assert.equal(L.shortSkill('insight', 'pt'), 'Intuição');
  assert.equal(L.shortSkill('sleightOfHand', 'en'), 'Sleight');
});

test('os outros radares (papel do grupo, atributos, escolas) também cabem', () => {
  for (const lang of ['pt', 'en']) {
    const roles = fits(M.AXES.map(k => ({ key: k, label: M.axisLabel(k, lang) })), 380, 13);
    assert.deepEqual(roles.overlaps, [], lang);
    assert.ok(roles.inside);
    for (const size of [140, 190, 300]) {
      const abil = fits(M.ABILS.map(a => ({ key: a, label: M.abilShort(a, lang) })), size, 13);
      assert.deepEqual(abil.overlaps, []);
      assert.ok(abil.inside, `atributos ${size}`);
    }
  }
  const schools = fits(['Abj', 'Conj', 'Adiv', 'Enc', 'Evoc', 'Ilus', 'Necr', 'Trans'].map(s => ({ key: s, label: s })), 170, 12);
  assert.deepEqual(schools.overlaps, []);
  assert.ok(schools.inside);
});

test('rótulo longo quebra em 2 linhas no espaço do meio', () => {
  assert.deepEqual(L.labelLines('Corpo a corpo'), ['Corpo a', 'corpo']);
  assert.deepEqual(L.labelLines('Exploração'), ['Exploração']);
  assert.deepEqual(L.labelLines('Perc.'), ['Perc.']);
});

test('escala dos bônus: do menor ao maior do grupo, com o 0, em vez de −5…+15', () => {
  const skills = facts.flatMap(f => M.SKILLS.map(k => f.skills[k]));
  const s = L.bonusScale(skills);
  assert.ok(s.min <= Math.min(...skills) && s.max >= Math.max(...skills));
  assert.ok(s.min >= -4 && s.max <= 10, `${s.min}…${s.max}`);
  assert.ok(s.rings.includes(0) && s.mark === 0);
  // a mediana das perícias fica longe do centro (antes, num −5…+15, ficava a ~30% do raio)
  const sorted = skills.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  assert.ok((median - s.min) / (s.max - s.min) >= 0.25, `mediana ${median} em ${s.min}…${s.max}`);
  assert.ok((median + 5) / 20 < (median - s.min) / (s.max - s.min), 'mais longe do centro que na escala de antes');
  assert.deepEqual(L.bonusScale([]), { min: -2, max: 4, rings: [-2, 0, 2, 4], mark: 0 });
  assert.deepEqual(L.bonusScale([-1, 7]), { min: -2, max: 8, rings: [-2, 0, 4, 8], mark: 0 });
  assert.deepEqual(L.bonusScale([-3, 12]).min, -4);
});
