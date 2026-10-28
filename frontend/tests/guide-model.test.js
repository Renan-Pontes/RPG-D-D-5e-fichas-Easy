// V14: o Guia do mestre (§2.5) e o aviso "O que mudou" (§2.6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIDE_CARDS, GUIDE_COUNT, guideCard, guideIndex, guideTarget, guideForRule,
  whatsNewLines, whatsNewVisible, dismissWhatsNew, WHATS_NEW_KEY,
} from '../src/shell/guide-model.js';
import { DM_AREAS } from '../src/shell/shell-logic.js';
import { NOW_RULES, PLAN_RULES } from '../src/shell/next-step.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};

test('guia: 5 cartões na ordem da §2.5, cada um com frase, desenho e "Quero… → vou a…"', () => {
  assert.equal(GUIDE_COUNT, 5);
  assert.deepEqual(GUIDE_CARDS.map(c => c.id), ['prepare', 'start', 'screen', 'combat', 'end']);
  for (const lang of ['pt', 'en']) {
    for (let i = 0; i < GUIDE_COUNT; i++) {
      const c = guideCard(i, lang);
      assert.equal(c.n, i + 1);
      assert.equal(c.total, 5);
      assert.ok(c.title && c.text && c.art, `${c.id} ${lang}`);
      assert.ok(c.text.length <= 140, `${c.id}: 1 frase curta (${lang})`);
      assert.ok(c.rows.length >= 3 && c.rows.length <= 5, `${c.id}: 3 a 5 linhas`);
      for (const r of c.rows) assert.ok(r.want && r.go, `${c.id}: linha sem texto (${lang})`);
    }
  }
  assert.equal(guideCard(0, 'pt').title, 'Preparar');
  assert.equal(guideCard(2, 'en').title, 'Show on screen');
  assert.match(guideCard(2, 'pt').text, /^A Tela mostra a última coisa que você mandou/);
  // índices fora da faixa voltam ao 1º
  assert.equal(guideIndex(7), 0);
  assert.equal(guideIndex(-1), 0);
  assert.equal(guideIndex('2'), 2);
  assert.equal(guideCard(99, 'pt').id, 'prepare');
});

test('guia: "Me leve lá" leva à tela certa de cada cartão', () => {
  assert.deepEqual(guideTarget(0), { area: 'prepare', sub: 'next' });
  assert.deepEqual(guideTarget(1), { area: 'play', sub: 'scene' });
  assert.deepEqual(guideTarget(2), { area: 'play', sub: 'screen' });
  assert.deepEqual(guideTarget(3), { area: 'play', sub: 'combat' });
  // Encerrar: ao vivo, a folha Encerrar; parada ou encerrada, a Crônica (o resumo)
  assert.deepEqual(guideTarget(4, { live: true }), { sheet: 'end' });
  assert.deepEqual(guideTarget(4, { live: false }), { area: 'group', sub: 'chronicle' });
  assert.deepEqual(guideTarget(4, { live: true, closed: true }), { area: 'group', sub: 'chronicle' });
  // toda tela existe na casca do mestre
  const subs = new Set(DM_AREAS.flatMap(a => a.subs.map(x => `${a.id}/${x}`)));
  for (let i = 0; i < GUIDE_COUNT; i++) {
    for (const live of [false, true]) {
      const g = guideTarget(i, { live });
      if (g.sheet) continue;
      assert.ok(subs.has(`${g.area}/${g.sub}`), `${i} ${live}`);
    }
  }
  // o objeto devolvido é uma cópia (quem chama pode mexer)
  guideTarget(0).area = 'x';
  assert.equal(guideTarget(0).area, 'prepare');
});

test('guia: o "?" do cartão "O que fazer agora" abre no assunto da regra', () => {
  for (const r of PLAN_RULES) assert.equal(guideForRule(r), r === 'N8' ? 2 : 0, r);
  assert.equal(guideForRule('J1'), 1);
  assert.equal(guideForRule('J2'), 4);
  assert.equal(guideForRule('J3'), 1);
  assert.equal(guideForRule('J4'), 1);
  assert.equal(guideForRule('J5'), 4);
  assert.equal(guideForRule('J6'), 1);
  for (const r of NOW_RULES) assert.ok(guideForRule(r) >= 0 && guideForRule(r) < 5);
  assert.equal(guideForRule(null), 0);
});

test('"O que mudou": as trocas da §2.6 e uma vez por aparelho', () => {
  const pt = whatsNewLines('pt');
  assert.deepEqual(pt.slice(0, 4).map(l => [l.was, l.now]), [['Telão', 'Tela'], ['Cena', 'Agora'], ['Próxima sessão', 'Plano'], ['Encontro', 'Combate']]);
  assert.equal(pt[4].now, 'barra da mesa');
  assert.match(pt[4].note, /turno e o Próximo/);
  assert.deepEqual(whatsNewLines('en').map(l => l.now), ['Screen', 'Now', 'Plan', 'Combat', 'table bar']);

  const st = memStorage();
  assert.equal(whatsNewVisible(st), true);
  assert.equal(whatsNewVisible(st), true);          // olhar não dispensa
  dismissWhatsNew(st);
  assert.equal(whatsNewVisible(st), false);         // dispensado não volta
  assert.equal(st.m.get(WHATS_NEW_KEY), 'v2');
  // sem armazenamento (ou bloqueado): não aparece, para não voltar a cada visita
  assert.equal(whatsNewVisible({ getItem() { throw new Error('bloqueado'); } }), false);
  dismissWhatsNew({ setItem() { throw new Error('bloqueado'); } });   // não estoura
});
