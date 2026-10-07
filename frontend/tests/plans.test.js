import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PLANS, DEFAULT_ADDONS, CARDS_MAX, normalizePlan, normalizeAddon, normalizeCatalog, normalizeMyPlan,
  addonTotals, formatPrice, formatBytes, formatMb, formatDay, meterLevel, ratio, usageBars, planLimitFrom,
  isCampaignClosedError, nextPlanFor, limitMessage, limitShortText, closedInfo, closedText, isClosed,
  tableSlots, sponsoredFrom, sponsoredText, needsTableSeat, seatNoticeText, inviteSeatsFree, contactHref, addonKind,
} from '../src/plans/plans-logic.js';
import { errorMessage } from '../src/api/errors.js';

const MB = 1024 * 1024;
const catalog = normalizeCatalog(null);

test('catálogo padrão: os 4 planos e extras decididos pelo dono', () => {
  const by = Object.fromEntries(catalog.plans.map(p => [p.slug, p]));
  assert.deepEqual(catalog.plans.map(p => p.slug), ['free', 'player', 'dm', 'legend']);
  assert.deepEqual([by.free.characters, by.free.campaigns, by.free.slots, by.free.imagesMb, by.free.priceCents], [3, 1, 0, 25, 0]);
  assert.deepEqual([by.player.characters, by.player.campaigns, by.player.slots, by.player.imagesMb, by.player.priceCents], [30, 1, 0, 50, 490]);
  assert.deepEqual([by.dm.characters, by.dm.campaigns, by.dm.slots, by.dm.imagesMb, by.dm.priceCents], [5, 3, 6, 400, 1490]);
  assert.deepEqual([by.legend.characters, by.legend.campaigns, by.legend.slots, by.legend.imagesMb, by.legend.priceCents], [10, 8, 8, 1500, 2990]);
  assert.deepEqual(catalog.addons.map(a => [a.kind, a.amount, a.priceCents]),
    [['campaigns', 1, 290], ['images', 250, 390], ['characters', 20, 190], ['slots', 2, 190]]);
  assert.equal(CARDS_MAX, 2000);
});

test('normalizePlan aceita snake_case e nome aninhado', () => {
  const p = normalizePlan({ slug: 'dm', name_pt: 'Mestre', name_en: 'GM', price_cents: 1490, max_characters: 5, max_campaigns: 3, slots_per_campaign: 6, images_mb: 400, order: 2 });
  assert.equal(p.namePt, 'Mestre'); assert.equal(p.nameEn, 'GM');
  assert.equal(p.characters, 5); assert.equal(p.slots, 6); assert.equal(p.imagesMb, 400);
  const q = normalizePlan({ slug: 'x', name: { pt: 'Xis', en: 'Ex' }, limits: { characters: 7 }, imagesBytes: 10 * MB });
  assert.equal(q.namePt, 'Xis'); assert.equal(q.characters, 7); assert.equal(q.imagesMb, 10);
  assert.equal(normalizePlan(null), null);
});

test('catálogo da API: ordena, esconde inativos e cai no padrão se vier vazio', () => {
  const c = normalizeCatalog({ plans: [{ slug: 'b', order: 2 }, { slug: 'a', order: 1 }, { slug: 'z', order: 0, active: false }], addons: [] });
  assert.deepEqual(c.plans.map(p => p.slug), ['a', 'b']);
  assert.equal(c.addons.length, DEFAULT_ADDONS.length);
  assert.equal(normalizeCatalog({ plans: [] }).plans.length, DEFAULT_PLANS.length);
});

test('tipo do extra pelo slug quando a API não manda kind', () => {
  assert.equal(addonKind({ slug: 'extra_campaign' }), 'campaigns');
  assert.equal(addonKind({ slug: 'storage_250mb' }), 'images');
  assert.equal(addonKind({ slug: 'characters_20' }), 'characters');
  assert.equal(addonKind({ slug: 'table_slots' }), 'slots');
  assert.equal(normalizeAddon({ slug: 'images', price_cents: 390 }).amount, 250);
});

test('extras somam aos limites do plano', () => {
  assert.deepEqual(addonTotals({ campaign: 2, images: 1, characters: 1, slots: 3 }), { campaigns: 2, images: 250, characters: 20, slots: 6 });
  const my = normalizeMyPlan({ plan: 'free', addons: { images: 2 }, usage: { characters: 3, campaigns: 1, imagesBytes: 5 * MB } }, catalog);
  assert.equal(my.limits.imagesBytes, (25 + 500) * MB);
  assert.equal(my.limits.characters, 3);
  assert.equal(my.plan.slug, 'free');
});

test('normalizeMyPlan respeita limites efetivos e vagas por campanha vindos do servidor', () => {
  const my = normalizeMyPlan({
    plan: { slug: 'dm', namePt: 'Mestre', characters: 5, campaigns: 3, slots: 6, imagesMb: 400 },
    addons: [{ slug: 'slots', qty: 1 }],
    validUntil: '2026-12-31', source: 'admin',
    limits: { characters: 5, campaigns: 3, slots: 8, imagesMb: 400 },
    usage: { characters: 2, sponsoredCharacters: 1, campaigns: 2, imagesMb: 12.5, tables: [{ campaignId: 9, name: 'Brumafria', used: 3, max: 8 }] },
  }, catalog);
  assert.equal(my.limits.slots, 8);
  assert.equal(my.limits.imagesBytes, 400 * MB);
  assert.equal(my.usage.imagesBytes, 12.5 * MB);
  assert.equal(my.usage.sponsoredCharacters, 1);
  assert.deepEqual(my.addons, { slots: 1 });
  assert.deepEqual(my.tables, [{ id: 9, name: 'Brumafria', used: 3, max: 8, status: 'active' }]);
  assert.equal(my.source, 'admin');
});

test('formatos de preço, tamanho e data (pt/en)', () => {
  assert.equal(formatPrice(1490, 'pt'), 'R$\u00a014,90');
  assert.equal(formatPrice(1490, 'en'), 'R$14.90');
  assert.equal(formatPrice(0, 'pt'), 'Grátis');
  assert.equal(formatPrice(0, 'pt', { free: false }), 'R$\u00a00,00');
  assert.equal(formatBytes(12.4 * MB, 'pt'), '12,4 MB');
  assert.equal(formatMb(1500, 'pt'), '1.500 MB');
  assert.equal(formatMb(20480, 'en'), '20 GB');
  assert.equal(formatMb(400, 'en'), '400 MB');
  assert.equal(formatDay('2026-10-07T12:00:00', 'pt'), '07/10');
  assert.equal(formatDay('2026-10-07T12:00:00', 'pt', { year: true }), '07/10/2026');
  assert.equal(formatDay('', 'pt'), '');
});

test('medidor: ok, perto, cheio e acima (rebaixado mantém tudo)', () => {
  assert.equal(meterLevel(1, 10), 'ok');
  assert.equal(meterLevel(8, 10), 'near');
  assert.equal(meterLevel(10, 10), 'full');
  assert.equal(meterLevel(12, 10), 'over');
  assert.equal(ratio(12, 10), 1);
  assert.equal(ratio(0, 0), 0);
  const my = normalizeMyPlan({ plan: 'free', usage: { characters: 5, campaigns: 0, imagesBytes: 0 } }, catalog);
  const bars = usageBars(my, 'pt');
  assert.deepEqual(bars.map(b => b.key), ['images', 'campaigns', 'characters']);
  assert.equal(bars.find(b => b.key === 'characters').level, 'over');
});

test('erro plan_limit vira info estruturada; outros erros não', () => {
  const e = { status: 403, data: { error: 'plan_limit', limit: 'images', used: 26 * MB, max: 25 * MB, plan: 'free' } };
  assert.deepEqual(planLimitFrom(e), { limit: 'images', used: 26 * MB, max: 25 * MB, plan: 'free', dmName: '', campaignName: '' });
  assert.equal(planLimitFrom({ data: { error: 'forbidden' } }), null);
  assert.equal(planLimitFrom(null), null);
  assert.equal(isCampaignClosedError({ data: { error: 'campaign_closed' } }), true);
});

test('errorMessage tem texto amigável para plan_limit e campaign_closed', () => {
  assert.match(errorMessage({ data: { error: 'plan_limit', limit: 'characters' } }, 'pt'), /limite de personagens/);
  assert.match(errorMessage({ data: { error: 'plan_limit', limit: 'images' } }, 'en'), /image space/);
  assert.match(errorMessage({ data: { error: 'plan_limit', limit: 'cards' } }, 'pt'), /2\.000/);
  assert.match(errorMessage({ data: { error: 'campaign_closed' } }, 'pt'), /encerrada/);
});

test('sugestão: próximo plano que dá mais do recurso + o extra', () => {
  assert.equal(nextPlanFor(catalog.plans, 'free', 'characters').slug, 'player');
  assert.equal(nextPlanFor(catalog.plans, 'free', 'campaigns').slug, 'dm');
  assert.equal(nextPlanFor(catalog.plans, 'player', 'images').slug, 'dm');
  assert.equal(nextPlanFor(catalog.plans, 'legend', 'images'), null);
  assert.equal(nextPlanFor(catalog.plans, 'free', 'cards'), null);
  const m = limitMessage({ limit: 'campaigns', used: 1, max: 1, plan: 'free' }, catalog, 'pt');
  assert.match(m.title, /limite de campanhas/);
  assert.equal(m.usedText, '1 de 1');
  assert.equal(m.planName, 'Grátis');
  assert.match(m.suggestions[0].text, /Mestre.*3 campanhas.*R\$\s14,90/);
  assert.match(m.suggestions[1].text, /\+1 campanha.*R\$\s2,90/);
});

test('sugestão considera o uso atual (rebaixado acima do limite)', () => {
  const a = limitMessage({ limit: 'characters', used: 25, max: 3, plan: 'free' }, catalog, 'pt');
  assert.equal(a.suggestions[0].slug, 'player');
  assert.match(a.suggestions[1].text, /2 pacotes de \+20 personagens/);
  const b = limitMessage({ limit: 'characters', used: 35, max: 3, plan: 'free' }, catalog, 'pt');
  assert.equal(b.suggestions.length, 1);
  assert.equal(b.suggestions[0].type, 'addon');
  assert.match(b.suggestions[0].text, /^Com extras: 2 pacotes de \+20 personagens por R\$\s3,80/);
  const c = limitMessage({ limit: 'campaigns', used: 4, max: 3, plan: 'dm' }, catalog, 'pt');
  assert.equal(c.suggestions[0].slug, 'legend');
  assert.match(c.suggestions[1].text, /2 pacotes de \+1 campanha/);
  assert.doesNotMatch(a.body, /apagad/);
});

test('aviso no assistente só quando o limite de personagens já foi atingido', async () => {
  const { creatorLimitNotice } = await import('../src/plans/plans-logic.js');
  const my = (used, max) => ({ usage: { characters: used }, limits: { characters: max } });
  assert.equal(creatorLimitNotice(null, 'pt'), '');
  assert.equal(creatorLimitNotice(my(2, 3), 'pt'), '');
  assert.match(creatorLimitNotice(my(3, 3), 'pt'), /limite de personagens do seu plano \(3\/3\).*mesa com código/);
  assert.match(creatorLimitNotice(my(5, 3), 'en'), /character limit \(5\/3\)/);
});

test('aviso de limite: imagens em MB, cartões sem venda, vagas citam o mestre', () => {
  const img = limitMessage({ limit: 'images', used: 25 * MB, max: 25 * MB, plan: 'free' }, catalog, 'pt');
  assert.equal(img.usedText, '25 MB de 25 MB');
  const cards = limitMessage({ limit: 'cards', used: 2000, max: 2000, plan: 'dm' }, catalog, 'pt');
  assert.equal(cards.suggestions.length, 0);
  const slots = limitMessage({ limit: 'slots', plan: 'free', dmName: 'Ana' }, catalog, 'pt');
  assert.match(slots.title, /mesa de Ana/);
  assert.ok(slots.suggestions.some(s => s.type === 'hint' && /vagas/.test(s.text)));
  assert.match(limitShortText({ limit: 'characters' }, 'en'), /character limit/);
});

test('campanha encerrada: datas, prazo de 30 dias e texto do aviso', () => {
  const now = new Date('2026-10-10T12:00:00').getTime();
  const c = { status: 'closed', closedAt: '2026-10-07T12:00:00' };
  assert.equal(isClosed(c), true);
  const info = closedInfo(c, now);
  assert.equal(formatDay(info.purgeAt, 'pt'), '06/11');
  assert.equal(info.daysLeft, 27);
  assert.equal(closedText(c, 'pt', now), 'Esta campanha foi encerrada em 07/10. Baixem suas fichas até 06/11.');
  assert.match(closedText(c, 'en', now), /closed on 10\/07.*by 11\/06/);
  assert.equal(closedInfo({ status: 'active' }), null);
  assert.equal(closedInfo({ status: 'closed', closedAt: '2026-10-07T12:00:00', purgeAt: '2026-10-20T12:00:00' }, now).daysLeft, 10);
});

test('vagas da mesa: conta membros patrocinados ou usa o campo da API', () => {
  const my = normalizeMyPlan({ plan: 'dm', usage: {} }, catalog);
  const camp = { members: [{ sponsored: true }, { sponsored: false }, { is_sponsored: true }] };
  assert.deepEqual(tableSlots(camp, my), { used: 2, max: 6 });
  assert.deepEqual(tableSlots({ slots: { used: 1, max: 8 } }, my), { used: 1, max: 8 });
  assert.deepEqual(tableSlots(camp, null), { used: 2, max: null });
});

test('entrar na mesa usando vaga: texto com o nome do mestre', () => {
  assert.equal(sponsoredFrom({ membership: { sponsored: true }, dmName: 'Ana' }), 'Ana');
  assert.equal(sponsoredFrom({ sponsored: true }, 'Bia'), 'Bia');
  assert.equal(sponsoredFrom({ membership: { sponsored: false } }), null);
  assert.equal(sponsoredText('Ana', 'pt'), 'Este personagem usa uma vaga da mesa de Ana.');
  assert.match(sponsoredText('', 'en'), /GM's table/);
});

test('aviso antes de entrar: só quando o jogador está no limite', () => {
  const full = normalizeMyPlan({ plan: 'free', usage: { characters: 3 } }, catalog);
  const room = normalizeMyPlan({ plan: 'free', usage: { characters: 1 } }, catalog);
  assert.equal(needsTableSeat(full), true);
  assert.equal(needsTableSeat(room), false);
  assert.equal(seatNoticeText(room, 'Ana', 'pt'), '');
  assert.match(seatNoticeText(full, 'Ana', 'pt', 2), /vaga da mesa de Ana \(2 livres\)/);
  assert.match(seatNoticeText(full, 'Ana', 'pt', 0), /sem vagas livres/);
  assert.equal(inviteSeatsFree({ slotsFree: 3 }), 3);
  assert.equal(inviteSeatsFree({ slots: { used: 5, max: 6 } }), 1);
  assert.equal(inviteSeatsFree({}), null);
});

test('mailto do "fale com a gente"', () => {
  const href = contactHref('contato@exemplo.com', { kind: 'plan', name: 'Mestre', lang: 'pt' });
  assert.ok(href.startsWith('mailto:contato@exemplo.com?subject='));
  assert.match(decodeURIComponent(href), /plano Mestre/);
});

test('formato real do backend (P1): catálogo, conta e erro de vaga', () => {
  const cat = normalizeCatalog({
    plans: [{ slug: 'free', name: { pt: 'Grátis', en: 'Free' }, priceCents: 0, characters: 3, campaigns: 1, slotsPerCampaign: 0, storageMb: 25, order: 0 },
      { slug: 'dm', name: { pt: 'Mestre', en: 'Game Master' }, priceCents: 1490, characters: 5, campaigns: 3, slotsPerCampaign: 6, storageMb: 400, order: 2 }],
    addons: [{ slug: 'extra-storage', name: { pt: '+250 MB', en: '+250 MB' }, kind: 'storage_mb', amount: 250, priceCents: 390 },
      { slug: 'extra-slots', name: { pt: '+2 vagas', en: '+2 seats' }, kind: 'table_slots', amount: 2, priceCents: 190 }],
    contact: { email: 'oi@forja.test', mailto: '' }, paymentsEnabled: false,
  });
  assert.equal(cat.plans[1].slots, 6);
  assert.equal(cat.plans[1].imagesMb, 400);
  assert.deepEqual(cat.addons.map(a => a.kind), ['images', 'slots']);
  assert.equal(cat.contactEmail, 'oi@forja.test');
  const my = normalizeMyPlan({
    plan: cat.plans[1] && { slug: 'dm', name: { pt: 'Mestre', en: 'GM' }, priceCents: 1490, characters: 5, campaigns: 3, slotsPerCampaign: 6, storageMb: 400 },
    addons: [{ slug: 'extra-slots', kind: 'table_slots', amount: 2, quantity: 1 }],
    validUntil: null, source: 'admin',
    limits: { characters: 5, campaigns: 3, slotsPerCampaign: 8, storageMb: 400, storageBytes: 400 * MB, cardsPerCampaign: 2000 },
    usage: { characters: 1, sponsoredCharacters: 0, campaigns: 1, storageBytes: 3 * MB,
      byCampaign: [{ id: 4, name: 'Brumafria', status: 'closed', slots: { used: 2, max: 8 } }] },
    contact: { email: 'oi@forja.test' },
  }, cat);
  assert.equal(my.limits.slots, 8);
  assert.equal(my.limits.imagesBytes, 400 * MB);
  assert.equal(my.usage.imagesBytes, 3 * MB);
  assert.deepEqual(my.addons, { 'extra-slots': 1 });
  assert.deepEqual(my.tables, [{ id: 4, name: 'Brumafria', used: 2, max: 8, status: 'closed' }]);
  assert.equal(my.contactEmail, 'oi@forja.test');
  // criar com código de mesa sem vaga: limit 'characters' + slots da campanha → aviso de vagas
  const info = planLimitFrom({ status: 402, data: { error: 'plan_limit', limit: 'characters', used: 3, max: 3, plan: 'free', slots: { used: 6, max: 6 } } });
  assert.equal(info.limit, 'slots');
  assert.deepEqual([info.used, info.max], [6, 6]);
  assert.equal(sponsoredFrom({ membership: { id: 1, sponsored: true }, campaignId: 2, slug: 'x', sponsored: true, dmName: 'Ana' }), 'Ana');
  assert.equal(inviteSeatsFree({ slots: { used: 6, max: 6 } }), 0);
});
