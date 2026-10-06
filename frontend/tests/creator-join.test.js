import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newCharacter, hasRulesChoices, rulesSwitchPatch, finalizeCharacter, loadDraft, saveDraft,
  normalizeInviteCode, parseJoinRoute, joinFromInvite, joinPatch, creationJoin,
  inviteCheckMessage, joinFailMessage, joinToast, savePendingInvite, loadPendingInvite, PENDING_INVITE_KEY,
} from '../src/creator/creation.js';

const merge = (prev, patch) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) });
const memStore = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
};
const INVITE = {
  campaignId: 7, slug: 'ecos-de-valdoria', name: 'Ecos de Valdoria', tagline: 'Onde a névoa guarda segredos',
  accent: '#aa3344', dmName: 'Mestre Forja', members: 3, levelingMode: 'xp', allowMulticlass: true, alreadyMember: false,
};

test('normalizeInviteCode: maiúsculas, só letras e números', () => {
  assert.equal(normalizeInviteCode(' ab-cd ef '), 'ABCDEF');
  assert.equal(normalizeInviteCode(null), '');
  assert.equal(normalizeInviteCode('x'.repeat(40)).length, 16);
});

test('parseJoinRoute: /join/<código>, #join=<código> e nada mais', () => {
  assert.equal(parseJoinRoute('/join/abc123'), 'ABC123');
  assert.equal(parseJoinRoute('/join/ABC123/'), 'ABC123');
  assert.equal(parseJoinRoute('/', '#join=xyz9'), 'XYZ9');
  assert.equal(parseJoinRoute('/', '#join/xyz9'), 'XYZ9');
  assert.equal(parseJoinRoute('/join/%20ab%20'), 'AB');
  assert.equal(parseJoinRoute('/', '#grimorio/x'), null);
  assert.equal(parseJoinRoute('/tv/abc'), null);
  assert.equal(parseJoinRoute('/join/'), null);
  assert.equal(parseJoinRoute('/join/a/b'), null);
  assert.equal(parseJoinRoute('/join/---'), null);
});

test('joinFromInvite: guarda o essencial da mesa', () => {
  const j = joinFromInvite('ab cd', INVITE);
  assert.deepEqual(
    { code: j.code, campaignId: j.campaignId, slug: j.slug, name: j.name, levelingMode: j.levelingMode, dmName: j.dmName },
    { code: 'ABCD', campaignId: 7, slug: 'ecos-de-valdoria', name: 'Ecos de Valdoria', levelingMode: 'xp', dmName: 'Mestre Forja' },
  );
  assert.equal(j.members, 3);
  assert.equal(joinFromInvite('X', { campaignId: 1, coverUrl: '/api/campaigns/invite/X/cover?v=2' }).coverUrl, '/api/campaigns/invite/X/cover?v=2');
  assert.equal(joinFromInvite('X', { campaignId: 1, coverUrl: 'https://evil.example/x.png' }).coverUrl, null);
  assert.equal(joinFromInvite('X', null), null);
  assert.equal(joinFromInvite('X', {}), null);
  assert.equal(joinFromInvite('X', { campaignId: 1, levelingMode: 'weird' }).levelingMode, 'milestone');
});

test('joinPatch: confirmar a mesa adota a progressão dela; tirar devolve a criação sem join', () => {
  let c = newCharacter();
  assert.equal(c.levelingMode, 'milestone');
  const j = joinFromInvite('ABCD', INVITE);
  c = merge(c, prev => joinPatch(prev, j));
  assert.equal(c.levelingMode, 'xp');
  assert.equal(creationJoin(c).campaignId, 7);
  c = merge(c, prev => joinPatch(prev, null));
  assert.equal(creationJoin(c), null);
  assert.deepEqual(c.creation, {});
});

test('sem código: nada muda (sem pendência, sem join)', () => {
  const c = newCharacter();
  assert.equal(creationJoin(c), null);
  assert.equal(hasRulesChoices(c), false);
});

test('a mesa não conta como "escolha de regra" e sobrevive à troca de regra', () => {
  const c = merge(newCharacter(), prev => joinPatch(prev, joinFromInvite('ABCD', INVITE)));
  assert.equal(hasRulesChoices(c), false);
  const switched = merge(c, rulesSwitchPatch(c, '2014'));
  assert.equal(switched.rulesVersion, '2014');
  assert.equal(creationJoin(switched).code, 'ABCD');
  assert.equal(switched.levelingMode, 'xp');
});

test('finalizeCharacter não leva a mesa para a ficha salva', () => {
  const c = merge({ ...newCharacter(), name: 'Thalion' }, prev => joinPatch(prev, joinFromInvite('ABCD', INVITE)));
  const done = finalizeCharacter(c, 'pt');
  assert.equal(done.creation, undefined);
  assert.equal(done.levelingMode, 'xp');
});

test('rascunho só com a mesa (sem nome nem escolhas) não vira "criação em andamento"', () => {
  const store = memStore();
  const c = merge(newCharacter(), prev => joinPatch(prev, joinFromInvite('ABCD', INVITE)));
  saveDraft({ char: c, stepId: 'welcome', visited: ['welcome'] }, store);
  assert.equal(loadDraft(store), null);
  saveDraft({ char: { ...c, name: 'Lia' }, stepId: 'welcome', visited: [] }, store);
  assert.equal(creationJoin(loadDraft(store).char).code, 'ABCD');
});

test('inviteCheckMessage: código inválido x sem conexão', () => {
  assert.match(inviteCheckMessage({ status: 404, data: { error: 'invite_invalid' } }).pt, /Não achamos/);
  assert.match(inviteCheckMessage({ status: 401 }).pt, /Entre na sua conta/);
  assert.match(inviteCheckMessage(new TypeError('Failed to fetch')).pt, /conexão/);
});

test('joinFailMessage: a ficha está salva; só oferece "tentar de novo" quando faz sentido', () => {
  const j = joinFromInvite('ABCD', INVITE);
  const net = joinFailMessage(new TypeError('x'), j);
  assert.equal(net.retry, true);
  assert.match(net.pt, /ficha foi salva/);
  assert.match(net.pt, /na mesa "Ecos de Valdoria"/);
  assert.equal(joinFailMessage({ status: 404, data: { error: 'invite_invalid' } }, j).retry, false);
  assert.equal(joinFailMessage({ status: 409, data: { error: 'character_already_in_campaign' } }, j).retry, false);
  assert.match(joinFailMessage({ status: 500 }, null).pt, /entrar na mesa agora/);
});

test('joinToast', () => {
  assert.equal(joinToast('Thalion', 'Ecos de Valdoria', 'pt'), 'Thalion entrou na mesa Ecos de Valdoria!');
  assert.equal(joinToast('Thalion', 'Echoes', 'en'), 'Thalion joined the table Echoes!');
  assert.equal(joinToast('', '', 'pt'), 'Seu personagem entrou na mesa!');
});

test('convite pendente sobrevive (sessionStorage) e some ao limpar', () => {
  const store = memStore();
  savePendingInvite('ABCD', store);
  assert.equal(store.getItem(PENDING_INVITE_KEY), 'ABCD');
  assert.equal(loadPendingInvite(store), 'ABCD');
  savePendingInvite(null, store);
  assert.equal(loadPendingInvite(store), null);
  assert.equal(loadPendingInvite(null), null);
});
