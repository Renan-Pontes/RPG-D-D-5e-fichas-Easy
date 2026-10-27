// V4 · Barra da mesa e janela da Tela (src/stage/table-bar-model.js): quando
// aparecem, o que as 2 linhas dizem (na ordem da §5.8), o botão da direita, o
// resumo do combate (o mesmo do pulso do servidor), a fita do PC e as
// preferências guardadas no aparelho.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  afterLine, barAction, barLines, barVisible, combatSummary, freshRoll, offlineLine, offlineSeconds, readBarPrefs, ribbon,
  seenSuffix, staleText, turnLine, turnParts, tvLine, tvShort, tvState, windowCorner, windowMode, writeBarPrefs,
  OFFLINE_AFTER_MS, ROLL_SHOW_MS,
} from '../src/stage/table-bar-model.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

const COMBAT = {
  active: true, round: 2, turnIndex: 2, updatedAt: '2026-10-27T10:00:00Z',
  combatants: [
    { id: 'p', name: 'Pipo', type: 'pc', current_hp: 9, stats: { max_hp: 9 } },
    { id: 'g1', name: 'Goblin #1', type: 'monster', current_hp: 0, stats: { max_hp: 10 }, defeated: true },
    { id: 'g2', name: 'Goblin #2', type: 'monster', current_hp: 3, stats: { max_hp: 10 } },
    { id: 'd', name: 'Dagna', type: 'pc', current_hp: 0, stats: { max_hp: 10 } },
  ],
};

test('combatSummary: a vez, quem vem, quem agiu e os perigos (igual ao pulso)', () => {
  const s = combatSummary(COMBAT);
  assert.equal(s.turnName, 'Goblin #2');
  assert.equal(s.turnHp, '3/10');
  assert.equal(s.turnId, 'g2');
  assert.equal(s.nextName, 'Dagna');
  assert.deepEqual([s.acted, s.count], [2, 4]);
  assert.equal(s.allMonstersDown, false);
  assert.deepEqual(s.order.map(o => o.acted), [true, true, false, false]);
  assert.deepEqual(s.order.map(o => o.defeated), [false, true, false, true]);
  assert.equal(s.dangers, 1);
  assert.equal(s.ver, '2026-10-27T10:00:00Z');
});

test('combatSummary: sem combate, parado, vazio e todos os monstros caídos', () => {
  assert.equal(combatSummary(null), null);
  assert.equal(combatSummary({ active: false, combatants: [] }), null);
  const parked = combatSummary({ active: false, round: 1, turnIndex: 0, combatants: COMBAT.combatants });
  assert.equal(parked.active, false);
  assert.equal(parked.count, 4);
  assert.equal(parked.round, null);
  assert.equal(parked.setup, true);
  assert.equal(barAction(parked), 'start');
  // encerrado na rodada 3: nada de ▶ Iniciar na barra
  const ended = combatSummary({ active: false, round: 3, turnIndex: 2, combatants: COMBAT.combatants });
  assert.equal(ended.setup, false);
  assert.equal(barAction(ended), null);
  const down = combatSummary({ ...COMBAT, combatants: COMBAT.combatants.map(c => (c.type === 'monster' ? { ...c, current_hp: 0 } : c)) });
  assert.equal(down.allMonstersDown, true);
  assert.equal(barAction(down), 'end');
  assert.equal(barAction(combatSummary(COMBAT)), 'next');
  assert.equal(barAction(null), null);
});

test('textos do turno em pt e en', () => {
  const s = combatSummary(COMBAT);
  assert.equal(turnLine(s, 'pt'), '⚔ R2 · Vez de Goblin #2 · 3/10');
  assert.equal(turnLine(s, 'en'), "⚔ R2 · Goblin #2's turn · 3/10");
  assert.equal(afterLine(s, 'pt'), 'depois: Dagna · 2 de 4 agiram');
  assert.equal(afterLine(s, 'en'), 'next: Dagna · 2 of 4 acted');
  assert.equal(staleText(s, 'pt'), 'A vez já tinha passado: agora é de Goblin #2.');
  assert.equal(staleText(s, 'en'), "The turn had already passed: it's Goblin #2's now.");
  assert.equal(tvLine(1, 'pt'), '● TV conectada (1)');
  assert.equal(tvLine(0, 'pt'), '○ Nenhuma TV detectada');
  assert.equal(tvLine(0, 'en'), '○ No TV detected');
});

test('linha da vez: o nome primeiro, o número dele nunca cortado, o PV na linha 2', () => {
  const s = combatSummary({ ...COMBAT, combatants: COMBAT.combatants.map(c => (c.id === 'g2' ? { ...c, name: 'Goblin Afogado #2' } : c)) });
  // a forma curta (sem "Vez de"), para quando o nome não cabe inteiro (320–412 px)
  assert.equal(turnLine(s, 'pt', { hp: false, short: true }), '⚔ R2 · Goblin Afogado #2');
  assert.equal(turnLine(s, 'en', { hp: false, short: true }), '⚔ R2 · Goblin Afogado #2');
  assert.equal(turnLine(s, 'pt', { hp: false }), '⚔ R2 · Vez de Goblin Afogado #2');
  // em pedaços: só o nome encolhe (com "…"); a rodada e o "#2" ficam inteiros
  assert.deepEqual(turnParts(s, 'pt'), { lead: '⚔ R2', pre: 'Vez de ', name: 'Goblin Afogado', num: ' #2', post: '' });
  assert.deepEqual(turnParts(s, 'en', { short: true }), { lead: '⚔ R2', pre: '', name: 'Goblin Afogado', num: ' #2', post: '' });
  assert.equal(turnParts({ ...s, turnName: 'Dagna' }, 'pt').num, '');
  assert.equal(turnParts({ ...s, turnName: 'Lobo 3' }, 'pt').num, ' 3');
  assert.equal(turnParts({ ...s, turnName: '#2' }, 'pt').name, '#2');
  assert.equal(turnParts({ ...s, active: false }, 'pt'), null);
  // o PV que saiu da linha 1 abre a linha 2
  assert.equal(afterLine(s, 'pt', { hp: true }), '3/10 · depois: Dagna · 2 de 4 agiram');
  const bar = barLines({ live: true, tvLive: 1, stage: { bg: 'auto' }, combat: s });
  assert.equal(bar.l1, '⚔ R2 · Vez de Goblin Afogado #2');
  assert.equal(bar.l2, '3/10 · depois: Dagna · 2 de 4 agiram');
  assert.equal(bar.turn.name, 'Goblin Afogado');
  assert.equal(barLines({ live: true, stage: { bg: 'auto' }, combat: combatSummary({ ...COMBAT, combatants: COMBAT.combatants.map(c => (c.type === 'monster' ? { ...c, defeated: true } : c)) }) }).turn, null);
});

test('sem conexão: TV desconhecida (ponto cinza) e o que está na Tela "(última vez visto)"', () => {
  assert.equal(offlineLine(12, 'pt'), '⟳ Sem conexão há 12 s');
  assert.equal(offlineLine(12, 'en'), '⟳ Offline for 12 s');
  assert.equal(tvState(1, false), 'on');
  assert.equal(tvState(0, false), 'off');
  assert.equal(tvState(1, true), 'unknown');           // o último "TV conectada" pode não valer mais
  assert.equal(tvLine(1, 'pt', true), '○ TV: sem conexão');
  assert.equal(tvLine(1, 'en', true), '○ TV: offline');
  assert.equal(tvShort(1, 'pt'), '● TV');
  assert.equal(tvShort(0, 'pt'), '○ Nenhuma TV');
  assert.equal(tvShort(2, 'pt', true), '○ TV: sem conexão');
  assert.equal(seenSuffix(true, 'pt'), ' (última vez visto)');
  assert.equal(seenSuffix(true, 'en'), ' (last seen)');
  assert.equal(seenSuffix(false, 'pt'), '');
  const off = barLines({ live: true, tvLive: 1, stage: STAGE_IMG, offlineFor: 12 });
  assert.equal(off.l1, '📺 Na tela: Ponte velha (só a imagem) (última vez visto)');
  assert.equal(off.l2, '⟳ Sem conexão há 12 s');
  assert.equal(barLines({ live: true, tvLive: 1, stage: { bg: 'auto' }, offlineFor: 9, lang: 'en' }).l1, '📺 On screen: cover (last seen)');
  assert.equal(barLines({ live: true, tvLive: 1, stage: { bg: 'dark' }, offlineFor: 9 }).l1, '◐ Tela escurecida (última vez visto)');
  // em combate a linha 1 continua a vez (a 2ª diz que está sem conexão)
  assert.equal(barLines({ live: true, tvLive: 1, stage: { bg: 'auto' }, combat: combatSummary(COMBAT), offlineFor: 9 }).l1, '⚔ R2 · Vez de Goblin #2');
});

test('fita do PC: ✓ agiu · ● agora · ○ falta · † caiu', () => {
  assert.deepEqual(ribbon(combatSummary(COMBAT)).map(m => m.mark), ['✓', '†', '●', '†']);
  assert.deepEqual(ribbon(combatSummary({ ...COMBAT, turnIndex: 0 })).map(m => m.mark), ['●', '†', '○', '†']);
  assert.deepEqual(ribbon(null), []);
});

test('barVisible: só ao vivo (padrão), sempre, nunca, escondida e Jogar', () => {
  const base = { prefs: { pref: 'live' }, session: '3', area: 'world', sub: 'atlas' };
  assert.equal(barVisible(base), false);
  assert.equal(barVisible({ ...base, live: true }), true);
  assert.equal(barVisible({ ...base, combatActive: true }), true);
  assert.equal(barVisible({ ...base, tvLive: 1 }), true);
  assert.equal(barVisible({ ...base, prefs: { pref: 'always' } }), true);
  assert.equal(barVisible({ ...base, prefs: { pref: 'never' }, live: true }), false);
  // "Esconder até a próxima sessão": vale na sessão 3, volta na 4
  const hidden = { ...base, prefs: { pref: 'live', hideSession: '3' }, live: true };
  assert.equal(barVisible(hidden), false);
  assert.equal(barVisible({ ...hidden, session: '4' }), true);
  // em combate, dentro de Jogar, sempre (é onde está o Próximo)
  assert.equal(barVisible({ ...base, prefs: { pref: 'never' }, combatActive: true, area: 'play', sub: 'screen' }), true);
  assert.equal(barVisible({ ...hidden, combatActive: true, area: 'play', sub: 'scene' }), true);
  // Jogar › Tela fora de combate: a prévia grande já está ali
  assert.equal(barVisible({ ...base, live: true, area: 'play', sub: 'screen' }), false);
  assert.equal(barVisible({ ...base, live: true, area: 'play', sub: 'scene' }), true);
});

test('windowMode: flutua, encaixa em Agora/Combate, some em Tela e com o ✕', () => {
  const base = { prefs: { pref: 'live' }, session: '3', live: true, area: 'world', sub: 'atlas' };
  assert.equal(windowMode(base), 'float');
  assert.equal(windowMode({ ...base, area: 'play', sub: 'scene' }), 'docked');
  assert.equal(windowMode({ ...base, area: 'play', sub: 'combat' }), 'docked');
  assert.equal(windowMode({ ...base, area: 'play', sub: 'checks' }), 'float');
  // tablet (768–1023): Agora e Combate numa coluna só → a janela flutua
  assert.equal(windowMode({ ...base, area: 'play', sub: 'combat', dockable: false }), 'float');
  assert.equal(windowMode({ ...base, area: 'play', sub: 'screen' }), 'hidden');
  assert.equal(windowMode({ ...base, live: false }), 'hidden');
  assert.equal(windowMode({ ...base, live: false, tvLive: 1 }), 'float');
  assert.equal(windowMode({ ...base, live: false, prefs: { pref: 'always' } }), 'float');
  assert.equal(windowMode({ ...base, prefs: { pref: 'live', winSession: '3' } }), 'hidden');
  assert.equal(windowMode({ ...base, prefs: { pref: 'live', winSession: '3' }, session: '4' }), 'float');
  // o 📺 Tela da capa força a janela
  assert.equal(windowMode({ ...base, live: false, forced: true }), 'float');
  assert.equal(windowCorner({ corner: 'right', area: 'world', sub: 'map' }), 'left');
  assert.equal(windowCorner({ corner: 'left', area: 'world', sub: 'atlas' }), 'left');
  assert.equal(windowCorner({ area: 'play', sub: 'checks' }), 'right');
  // o mapa da aventura aberta: os botões de Conduzir ficam no canto de baixo à direita
  assert.equal(windowCorner({ corner: 'right', area: 'prepare', sub: 'adventures', page: 'adventure' }), 'left');
  assert.equal(windowCorner({ corner: 'right', area: 'prepare', sub: 'adventures' }), 'right');   // a lista de aventuras
  assert.equal(windowCorner({ corner: 'right', area: 'world', sub: 'atlas', page: 'adventure' }), 'right');
});

test('preferências no aparelho: lê o padrão, grava e aguenta lixo', () => {
  const s = memory();
  assert.deepEqual(readBarPrefs(1, s), { pref: 'live', hideSession: null, winSession: null });
  writeBarPrefs(1, { pref: 'always', hideSession: '3', winSession: null }, s);
  assert.deepEqual(readBarPrefs(1, s), { pref: 'always', hideSession: '3', winSession: null });
  s.setItem('forja:tv-bar:2', '{nada');
  assert.equal(readBarPrefs(2, s).pref, 'live');
  s.setItem('forja:tv-bar:3', JSON.stringify({ pref: 'talvez' }));
  assert.equal(readBarPrefs(3, s).pref, 'live');
});

const STAGE_IMG = { bg: 'auto', focus: true, front: { kind: 'image', label: 'Ponte velha', hidden: true, ref: { entryId: 4 }, ver: 'a1' } };

test('linha 1: o que está na Tela, o turno, o convite', () => {
  const live = { live: true, tvLive: 1 };
  assert.equal(barLines({ ...live, stage: STAGE_IMG }).l1, '📺 Na tela: Ponte velha (só a imagem)');
  assert.equal(barLines({ ...live, stage: { bg: 'auto' } }).l1, '📺 Na tela: capa');
  assert.equal(barLines({ ...live, stage: { bg: 'dark' } }).l1, '◐ Tela escurecida');
  assert.equal(barLines({ ...live, stage: { bg: 'auto' }, lang: 'en' }).l1, '📺 On screen: cover');
  const c = combatSummary(COMBAT);
  assert.equal(barLines({ ...live, stage: STAGE_IMG, combat: c }).l1, '⚔ R2 · Vez de Goblin #2');
  // ao vivo, sem TV e sem combate: convite
  const invite = barLines({ live: true, tvLive: 0, stage: { bg: 'auto' } });
  assert.equal(invite.l1, '📺 A Tela não está ligada');
  assert.equal(invite.l2, 'Toque para ligar na TV');
  assert.equal(invite.invite, true);
  assert.equal(barLines({ live: true, tvLive: 0, stage: { bg: 'auto' }, lang: 'en' }).l2, 'Tap to open it on the TV');
  // a TV apareceu nesta visita e sumiu: "○ Nenhuma TV detectada" (não o convite)
  const dropped = barLines({ live: true, tvLive: 0, tvSeen: true, stage: { bg: 'auto' } });
  assert.equal(dropped.l1, '📺 Na tela: capa');
  assert.equal(dropped.l2, '○ Nenhuma TV detectada');
  assert.equal(dropped.invite, false);
  // sem sessão ao vivo: nada de convite
  assert.equal(barLines({ live: false, tvLive: 0, stage: { bg: 'auto' } }).l1, '📺 Na tela: capa');
  // combate montado e parado
  const parked = combatSummary({ ...COMBAT, active: false, round: 1, turnIndex: 0 });
  assert.equal(barLines({ live: true, tvLive: 1, stage: { bg: 'auto' }, combat: parked }).l1, '⚔ Combate montado · 4');
  assert.equal(barLines({ live: true, tvLive: 1, stage: { bg: 'auto' }, combat: combatSummary({ ...COMBAT, active: false }) }).l1, '📺 Na tela: capa');
});

test('linha 2: a 1ª que valer — sem conexão › rolagem › enviando › combate › teste › TV', () => {
  const c = combatSummary(COMBAT);
  const base = { live: true, tvLive: 1, stage: { bg: 'auto' } };
  const roll = { id: 9, who: 'Dagna', total: 18, label: 'Percepção', crit: false };
  const test1 = { id: 3, label: 'Percepção', done: 3, total: 4 };
  const all = { ...base, combat: c, offlineFor: 12, roll, sending: { state: 'sent', name: 'Ponte' }, test: test1 };
  let r = barLines(all);
  assert.equal(r.l2, '⟳ Sem conexão há 12 s');
  assert.equal(r.tone, 'error');
  r = barLines({ ...all, offlineFor: 0 });
  assert.equal(r.l2, '🎲 Dagna 18 · Percepção');
  r = barLines({ ...all, offlineFor: 0, roll: null });
  assert.equal(r.l2, 'Na tela ✓ · Ponte');
  assert.equal(barLines({ ...all, offlineFor: 0, roll: null, sending: { state: 'sending' } }).l2, 'Enviando…');
  r = barLines({ ...all, offlineFor: 0, roll: null, sending: null });
  assert.equal(r.l2, '3/10 · depois: Dagna · 2 de 4 agiram');
  // frente por cima do combate: o que cobre a TV
  r = barLines({ ...all, stage: STAGE_IMG, offlineFor: 0, roll: null, sending: null });
  assert.equal(r.l2, '📺 Por cima: Ponte velha (só a imagem)');
  // sem combate: o teste e a TV juntos; sem teste, só a TV
  assert.equal(barLines({ ...base, test: test1 }).l2, '🎯 Percepção 3/4 · ● TV conectada (1)');
  assert.equal(barLines(base).l2, '● TV conectada (1)');
  assert.equal(barLines({ ...base, offlineFor: 9, lang: 'en' }).l2, '⟳ Offline for 9 s');
  assert.equal(barLines({ ...base, roll: { ...roll, crit: true } }).l2, '🎲 Dagna 18 ★ · Percepção');
});

test('sem conexão: só depois de 8 s sem resposta', () => {
  const now = 100_000;
  assert.equal(offlineSeconds(0, now), 0);
  assert.equal(offlineSeconds(now - 3000, now), 0);
  assert.equal(offlineSeconds(now - OFFLINE_AFTER_MS, now), 8);
  assert.equal(offlineSeconds(now - 12_400, now), 12);
});

test('rolagem nova: 8 s na barra; a que já existia ao abrir não reprisa', () => {
  const roll = { id: 5, who: 'Ana', total: 12 };
  const now = 50_000;
  assert.equal(freshRoll(roll, { id: 5, at: 0 }, now), null);
  assert.equal(freshRoll(roll, { id: 5, at: now - 1000 }, now), roll);
  assert.equal(freshRoll(roll, { id: 5, at: now - ROLL_SHOW_MS }, now), null);
  assert.equal(freshRoll(roll, { id: 4, at: now }, now), null);
  assert.equal(freshRoll(null, { id: 5, at: now }, now), null);
});
