// Planos da Forja: lógica pura (sem React, sem rede) — testada em tests/plans.test.js.
//
// O que custa dinheiro de verdade é limitado no TOTAL da conta:
//   imagens (MB, um "saco" só para todas as campanhas), campanhas como mestre,
//   personagens próprios; e vagas de mesa (por campanha) que o mestre empresta.
// Estourar limite nunca apaga nada: só bloqueia criar coisa nova daquele tipo.
//
// O backend (P1) é a fonte da verdade; aqui só normalizamos as respostas
// (tolerando camelCase/snake_case) e montamos textos e sugestões.

export const L = (lang, pt, en) => (lang === 'en' ? en : pt);

/** Catálogo decidido pelo dono — usado só se /api/plans não responder. */
export const DEFAULT_PLANS = [
  { slug: 'free', namePt: 'Grátis', nameEn: 'Free', priceCents: 0, characters: 3, campaigns: 1, slots: 0, imagesMb: 25, order: 0 },
  { slug: 'player', namePt: 'Jogador', nameEn: 'Player', priceCents: 490, characters: 30, campaigns: 1, slots: 0, imagesMb: 50, order: 1 },
  { slug: 'dm', namePt: 'Mestre', nameEn: 'Game Master', priceCents: 1490, characters: 5, campaigns: 3, slots: 6, imagesMb: 400, order: 2 },
  { slug: 'legend', namePt: 'Mestre Lendário', nameEn: 'Legendary GM', priceCents: 2990, characters: 10, campaigns: 8, slots: 8, imagesMb: 1500, order: 3 },
];

export const DEFAULT_ADDONS = [
  { slug: 'campaign', namePt: '+1 campanha', nameEn: '+1 campaign', priceCents: 290, kind: 'campaigns', amount: 1, order: 0 },
  { slug: 'images', namePt: '+250 MB de imagens', nameEn: '+250 MB of images', priceCents: 390, kind: 'images', amount: 250, order: 1 },
  { slug: 'characters', namePt: '+20 personagens', nameEn: '+20 characters', priceCents: 190, kind: 'characters', amount: 20, order: 2 },
  { slug: 'slots', namePt: '+2 vagas de mesa por campanha', nameEn: '+2 table seats per campaign', priceCents: 190, kind: 'slots', amount: 2, order: 3 },
];

/** Teto técnico de cartões do Mundo por campanha (não é limite comercial). */
export const CARDS_MAX = 2000;
/** Dias que uma campanha encerrada fica em somente leitura antes de sumir. */
export const CLOSED_DAYS = 30;

export const LIMIT_KINDS = ['images', 'campaigns', 'characters', 'slots', 'cards'];

const MB = 1024 * 1024;

function pick(o, ...keys) {
  if (!o || typeof o !== 'object') return undefined;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}
const num = (v, d = 0) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : d;
};

/** Plano vindo da API (qualquer grafia) → forma única. */
export function normalizePlan(p) {
  if (!p || typeof p !== 'object') return null;
  const slug = String(pick(p, 'slug', 'id') ?? '');
  const def = DEFAULT_PLANS.find(d => d.slug === slug) || {};
  const lim = pick(p, 'limits') || {};
  const imagesMb = pick(p, 'imagesMb', 'images_mb', 'maxImagesMb', 'max_images_mb', 'storageMb', 'storage_mb')
    ?? pick(lim, 'imagesMb', 'images_mb', 'images')
    ?? (pick(p, 'imagesBytes', 'images_bytes', 'maxImagesBytes') != null ? num(pick(p, 'imagesBytes', 'images_bytes', 'maxImagesBytes')) / MB : undefined);
  const name = pick(p, 'name');
  return {
    slug,
    namePt: pick(p, 'namePt', 'name_pt') ?? (typeof name === 'string' ? name : name?.pt) ?? def.namePt ?? slug,
    nameEn: pick(p, 'nameEn', 'name_en') ?? (typeof name === 'object' ? name?.en : undefined) ?? def.nameEn ?? slug,
    priceCents: num(pick(p, 'priceCents', 'price_cents', 'monthlyPriceCents', 'monthly_price_cents', 'price'), def.priceCents ?? 0),
    characters: num(pick(p, 'characters', 'maxCharacters', 'max_characters') ?? pick(lim, 'characters'), def.characters ?? 0),
    campaigns: num(pick(p, 'campaigns', 'maxCampaigns', 'max_campaigns') ?? pick(lim, 'campaigns'), def.campaigns ?? 0),
    slots: num(pick(p, 'slots', 'slotsPerCampaign', 'slots_per_campaign', 'tableSlots', 'table_slots') ?? pick(lim, 'slots'), def.slots ?? 0),
    imagesMb: num(imagesMb, def.imagesMb ?? 0),
    order: num(pick(p, 'order', 'sortOrder', 'sort_order'), def.order ?? 99),
    active: pick(p, 'active', 'isActive', 'is_active') !== false,
  };
}

const ADDON_KIND_BY_WORD = [
  [/camp/i, 'campaigns'], [/(image|imag|mb|storage|espa)/i, 'images'],
  [/(char|person)/i, 'characters'], [/(slot|vaga|seat|mesa)/i, 'slots'],
];

// Tipos do backend (AddOn.kind = campo do Plan) → recurso.
const KIND_ALIASES = { storage_mb: 'images', storageMb: 'images', storage: 'images', table_slots: 'slots', tableSlots: 'slots', max_campaigns: 'campaigns', max_characters: 'characters' };

export function addonKind(a) {
  const k = pick(a, 'kind', 'limit', 'resource');
  if (LIMIT_KINDS.includes(k)) return k;
  if (KIND_ALIASES[k]) return KIND_ALIASES[k];
  const slug = String(pick(a, 'slug', 'id') ?? '');
  for (const [re, kind] of ADDON_KIND_BY_WORD) if (re.test(slug)) return kind;
  return null;
}

export function normalizeAddon(a) {
  if (!a || typeof a !== 'object') return null;
  const slug = String(pick(a, 'slug', 'id') ?? '');
  const kind = addonKind(a);
  const def = DEFAULT_ADDONS.find(d => d.slug === slug || d.kind === kind) || {};
  const name = pick(a, 'name');
  return {
    slug,
    kind,
    namePt: pick(a, 'namePt', 'name_pt') ?? (typeof name === 'string' ? name : name?.pt) ?? def.namePt ?? slug,
    nameEn: pick(a, 'nameEn', 'name_en') ?? (typeof name === 'object' ? name?.en : undefined) ?? def.nameEn ?? slug,
    priceCents: num(pick(a, 'priceCents', 'price_cents', 'monthlyPriceCents', 'price'), def.priceCents ?? 0),
    amount: num(pick(a, 'amount', 'quantity', 'value', 'grants', 'imagesMb', 'campaigns', 'characters', 'slots'), def.amount ?? 1),
    order: num(pick(a, 'order', 'sortOrder', 'sort_order'), def.order ?? 99),
    active: pick(a, 'active', 'isActive', 'is_active') !== false,
  };
}

/** {plans, addons} de GET /api/plans (ou o catálogo padrão). */
export function normalizeCatalog(res) {
  const rawPlans = Array.isArray(res) ? res : (pick(res, 'plans') || []);
  const rawAddons = pick(res, 'addons', 'addOns', 'add_ons', 'extras') || [];
  const plans = rawPlans.map(normalizePlan).filter(p => p && p.active).sort((a, b) => a.order - b.order);
  const addons = rawAddons.map(normalizeAddon).filter(a => a && a.active).sort((a, b) => a.order - b.order);
  return {
    plans: plans.length ? plans : DEFAULT_PLANS.map(normalizePlan),
    addons: addons.length ? addons : DEFAULT_ADDONS.map(normalizeAddon),
    contactEmail: pick(res, 'contactEmail', 'contact_email') || pick(pick(res, 'contact'), 'email') || '',
    paymentsEnabled: pick(res, 'paymentsEnabled') === true,
  };
}

/** Bytes de imagem (aceita bytes ou MB, conforme o campo que vier). */
function imagesBytesFrom(o, mbKeys, byteKeys) {
  const b = pick(o, ...byteKeys);
  if (b != null) return num(b);
  const mb = pick(o, ...mbKeys);
  return mb != null ? num(mb) * MB : null;
}

/**
 * GET /api/me/plan → forma única:
 * { plan, addons:{slug:qtd}, validUntil, source,
 *   limits:{characters, campaigns, slots, imagesBytes},
 *   usage:{characters, sponsoredCharacters, campaigns, imagesBytes, tables:[{id,name,used,max}]} }
 */
export function normalizeMyPlan(res, catalog = null) {
  const root = pick(res, 'account', 'userPlan', 'user_plan') || res || {};
  const rawPlan = pick(root, 'plan');
  let plan = typeof rawPlan === 'string'
    ? normalizePlan((catalog?.plans || DEFAULT_PLANS).find(p => p.slug === rawPlan) || { slug: rawPlan })
    : normalizePlan(rawPlan) || normalizePlan(DEFAULT_PLANS[0]);
  const addons = {};
  const ra = pick(root, 'addons', 'addOns', 'add_ons', 'extras') || {};
  if (Array.isArray(ra)) for (const a of ra) { const s = pick(a, 'slug', 'id'); if (s) addons[s] = num(pick(a, 'quantity', 'qty', 'count'), 0); }
  else for (const [k, v] of Object.entries(ra)) addons[k] = num(v, 0);

  const lim = pick(root, 'limits', 'effectiveLimits', 'effective_limits') || {};
  const use = pick(root, 'usage', 'used') || {};
  const extra = addonTotals(addons, catalog?.addons);
  const limits = {
    characters: num(pick(lim, 'characters', 'maxCharacters'), plan.characters + extra.characters),
    campaigns: num(pick(lim, 'campaigns', 'maxCampaigns'), plan.campaigns + extra.campaigns),
    slots: num(pick(lim, 'slots', 'slotsPerCampaign', 'slots_per_campaign'), plan.slots + extra.slots),
    imagesBytes: imagesBytesFrom(lim, ['imagesMb', 'images_mb', 'images', 'storageMb', 'storage_mb'], ['imagesBytes', 'images_bytes', 'storageBytes', 'storage_bytes']) ?? (plan.imagesMb + extra.images) * MB,
  };
  // Vagas por campanha: usage.byCampaign[{id, name, status, slots:{used,max}}] (backend) ou lista simples.
  const tablesRaw = pick(use, 'byCampaign', 'by_campaign', 'tables', 'campaignSlots', 'campaign_slots') || pick(root, 'tables') || [];
  const tables = Array.isArray(tablesRaw) ? tablesRaw.map(t => {
    const sl = pick(t, 'slots');
    const src = sl && typeof sl === 'object' ? sl : t;
    return {
      id: pick(t, 'id', 'campaignId', 'campaign_id'),
      name: pick(t, 'name', 'campaignName', 'campaign_name') || '',
      used: num(pick(src, 'used', 'count'), 0),
      max: num(pick(src, 'max', 'limit', 'total'), limits.slots),
      status: pick(t, 'status') || 'active',
    };
  }) : [];
  return {
    plan,
    addons,
    validUntil: pick(root, 'validUntil', 'valid_until') || null,
    source: pick(root, 'source', 'origin') || 'free',
    limits,
    usage: {
      characters: num(pick(use, 'characters', 'ownCharacters', 'own_characters'), 0),
      sponsoredCharacters: num(pick(use, 'sponsoredCharacters', 'sponsored_characters', 'sponsored'), 0),
      campaigns: num(pick(use, 'campaigns'), 0),
      imagesBytes: imagesBytesFrom(use, ['imagesMb', 'images_mb', 'images', 'storageMb'], ['imagesBytes', 'images_bytes', 'storageBytes', 'storage_bytes']) ?? 0,
    },
    contactEmail: pick(pick(root, 'contact'), 'email') || '',
    tables,
  };
}

/** Soma o que os extras dão: {characters, campaigns, slots, images(MB)}. */
export function addonTotals(addons = {}, catalog = null) {
  const list = (catalog && catalog.length ? catalog : DEFAULT_ADDONS).map(a => (a.kind ? a : normalizeAddon(a)));
  const out = { characters: 0, campaigns: 0, slots: 0, images: 0 };
  for (const [slug, qty] of Object.entries(addons || {})) {
    const a = list.find(x => x.slug === slug) || normalizeAddon({ slug });
    if (a?.kind && out[a.kind] != null) out[a.kind] += num(qty, 0) * num(a.amount, 0);
  }
  return out;
}

// ---------------------------------------------------------------- formatos

/** 1490 → "R$ 14,90" (pt) / "R$14.90" (en). 0 → "Grátis"/"Free". */
export function formatPrice(cents, lang = 'pt', { free = true } = {}) {
  const c = num(cents, 0);
  if (c === 0 && free) return L(lang, 'Grátis', 'Free');
  const v = (c / 100).toFixed(2);
  return lang === 'en' ? `R$${v}` : `R$\u00a0${v.replace('.', ',')}`; // espaço fixo: não quebra o preço
}

/** Inteiro com separador de milhar (1.500 / 1,500). */
export function formatInt(n, lang = 'pt') {
  return Math.round(num(n, 0)).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR');
}

/** Bytes → "12,4 MB" / "1,5 GB" (pt) — MB com 1 casa abaixo de 100. */
export function formatBytes(bytes, lang = 'pt') {
  const b = Math.max(0, num(bytes, 0));
  const mb = b / MB;
  const fmt = (v, d) => v.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
  if (mb >= 10240) return `${fmt(mb / 1024, 1)} GB`;
  return `${fmt(mb, mb < 100 ? 1 : 0)} MB`;
}

/** MB de plano → texto ("25 MB", "1,5 GB"). */
export function formatMb(mb, lang = 'pt') { return formatBytes(num(mb, 0) * MB, lang); }

export function planName(plan, lang = 'pt') {
  if (!plan) return '';
  return lang === 'en' ? (plan.nameEn || plan.namePt || plan.slug) : (plan.namePt || plan.nameEn || plan.slug);
}

/** dd/mm (ou dd/mm/aaaa se `year`), na hora local. */
export function formatDay(iso, lang = 'pt', { year = false } = {}) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const y = year ? `/${d.getFullYear()}` : '';
  return lang === 'en' ? `${mm}/${dd}${y}` : `${dd}/${mm}${y}`;
}

// ---------------------------------------------------------------- uso

/** Fração 0..1 (máx 0 → cheio se houver uso). */
export function ratio(used, max) {
  const u = num(used, 0), m = num(max, 0);
  if (m <= 0) return u > 0 ? 1 : 0;
  return Math.min(1, u / m);
}

/** 'ok' | 'near' (≥ 80%) | 'full' (no limite) | 'over' (acima — ex.: rebaixado). */
export function meterLevel(used, max) {
  const u = num(used, 0), m = num(max, 0);
  if (u > m) return 'over';
  if (m > 0 && u >= m) return 'full';
  if (m > 0 && u / m >= 0.8) return 'near';
  return 'ok';
}

/** Barras de uso da tela "Meu plano". */
export function usageBars(my, lang = 'pt') {
  if (!my) return [];
  const { limits, usage } = my;
  const bars = [
    {
      key: 'images', icon: '🖼',
      label: L(lang, 'Espaço de imagens', 'Image space'),
      used: usage.imagesBytes, max: limits.imagesBytes,
      text: `${formatBytes(usage.imagesBytes, lang)} ${L(lang, 'de', 'of')} ${formatBytes(limits.imagesBytes, lang)}`,
      hint: L(lang, 'Um espaço só para todas as suas campanhas: mundo, capas, retratos e mapas. A arte que já vem no site não conta.',
        'One space for all your campaigns: world, covers, portraits and maps. Art that ships with the site does not count.'),
    },
    {
      key: 'campaigns', icon: '🏰',
      label: L(lang, 'Campanhas como mestre', 'Campaigns as GM'),
      used: usage.campaigns, max: limits.campaigns,
      text: `${formatInt(usage.campaigns, lang)} ${L(lang, 'de', 'of')} ${formatInt(limits.campaigns, lang)}`,
      hint: L(lang, 'Contam as ativas e as encerradas que ainda estão nos 30 dias para baixar as fichas.',
        'Active ones count, plus closed ones still inside the 30-day download window.'),
    },
    {
      key: 'characters', icon: '🛡',
      label: L(lang, 'Personagens', 'Characters'),
      used: usage.characters, max: limits.characters,
      text: `${formatInt(usage.characters, lang)} ${L(lang, 'de', 'of')} ${formatInt(limits.characters, lang)}`,
      hint: usage.sponsoredCharacters > 0
        ? L(lang, `Mais ${usage.sponsoredCharacters} em vagas emprestadas por mestres (não contam aqui).`,
          `Plus ${usage.sponsoredCharacters} in seats lent by GMs (not counted here).`)
        : L(lang, 'Fichas prontas também contam; personagens em vagas de mesa de um mestre não.',
          "Ready-made sheets count too; characters in a GM's table seats don't."),
    },
  ];
  for (const b of bars) b.level = meterLevel(b.used, b.max);
  return bars;
}

// ---------------------------------------------------------------- limite batido

/** Lê {error:'plan_limit', limit, used, max, plan} de um ApiError (ou null). */
export function planLimitFrom(e) {
  const d = e?.data && typeof e.data === 'object' ? e.data : (e && typeof e === 'object' && e.error ? e : null);
  if (!d) return null;
  const code = d.error === 'plan_limit' || d.detail === 'plan_limit' || d.code === 'plan_limit';
  if (!code) return null;
  let limit = LIMIT_KINDS.includes(d.limit) ? d.limit : 'characters';
  // Personagem com código de mesa e a mesa sem vaga: o backend manda limit
  // 'characters' + slots {used,max} da campanha → aviso "mesa sem vagas".
  const sl = d.slots && typeof d.slots === 'object' ? d.slots : null;
  if (limit === 'characters' && sl) limit = 'slots';
  const plan = typeof d.plan === 'string' ? d.plan : (d.plan?.slug || '');
  const fromSlots = limit === 'slots' && sl;
  return {
    limit,
    used: fromSlots ? num(sl.used, 0) : d.used != null ? num(d.used, 0) : null,
    max: fromSlots ? num(sl.max, 0) : d.max != null ? num(d.max, 0) : null,
    plan,
    dmName: d.dmName || d.dm_name || '',
    campaignName: d.campaignName || d.campaign_name || '',
    ...(d.needed != null ? { needed: num(d.needed, 0) } : {}),
  };
}

export function isCampaignClosedError(e) {
  const d = e?.data || {};
  return d.error === 'campaign_closed' || d.detail === 'campaign_closed';
}

/** Valor do limite `kind` num plano (imagens em MB). */
export function planValue(plan, kind) {
  if (!plan) return 0;
  if (kind === 'images') return plan.imagesMb;
  return num(plan[kind], 0);
}

/** Próximo plano (pela ordem) que dá MAIS do recurso que o atual. */
export function nextPlanFor(plans = [], currentSlug, kind) {
  const list = [...plans].sort((a, b) => a.order - b.order);
  const cur = list.find(p => p.slug === currentSlug) || list[0];
  if (!cur || kind === 'cards') return null;
  const base = planValue(cur, kind);
  return list.find(p => p.order > cur.order && planValue(p, kind) > base) || null;
}

/** Plano mais barato (pela ordem) acima do atual que dá mais do recurso e passa em `fits`. */
export function cheapestPlanFor(plans = [], currentSlug, kind, fits = () => true) {
  const list = [...plans].sort((a, b) => a.order - b.order);
  const cur = list.find(p => p.slug === currentSlug) || list[0];
  if (!cur || kind === 'cards') return null;
  const base = planValue(cur, kind);
  return list.find(p => p.order > cur.order && planValue(p, kind) > base && fits(p)) || null;
}

/** Extra que aumenta o recurso (ou null). */
export function addonFor(addons = [], kind) {
  return addons.find(a => a.kind === kind) || null;
}

function amountText(kind, value, lang) {
  if (kind === 'images') return formatMb(value, lang);
  const n = formatInt(value, lang);
  if (kind === 'campaigns') return L(lang, `${n} ${value === 1 ? 'campanha' : 'campanhas'}`, `${n} ${value === 1 ? 'campaign' : 'campaigns'}`);
  if (kind === 'characters') return L(lang, `${n} ${value === 1 ? 'personagem' : 'personagens'}`, `${n} ${value === 1 ? 'character' : 'characters'}`);
  if (kind === 'slots') return L(lang, `${n} ${value === 1 ? 'vaga' : 'vagas'} de jogador por campanha`, `${n} player ${value === 1 ? 'seat' : 'seats'} per campaign`);
  return n;
}
export { amountText };

/**
 * Texto do aviso de limite: {title, body, usedText, suggestions:[{type,slug,text,price}]}.
 * `info` vem de planLimitFrom; `catalog` de normalizeCatalog.
 */
export function limitMessage(info, catalog, lang = 'pt') {
  if (!info) return null;
  const { limit, used, max } = info;
  const plans = catalog?.plans || DEFAULT_PLANS.map(normalizePlan);
  const addons = catalog?.addons || DEFAULT_ADDONS.map(normalizeAddon);
  const cur = plans.find(p => p.slug === info.plan);
  const curName = cur ? planName(cur, lang) : '';
  const fmt = (v) => (limit === 'images' ? formatBytes(v, lang) : formatInt(v, lang));
  const usedText = used != null && max != null ? `${fmt(used)} ${L(lang, 'de', 'of')} ${fmt(max)}` : '';
  const dm = info.dmName;

  const T = {
    images: [L(lang, 'Seu espaço de imagens encheu', 'Your image space is full'),
      L(lang, 'As imagens que você já subiu continuam lá. Para subir mais, apague alguma que não usa ou aumente o espaço.',
        'The images you already uploaded stay there. To upload more, delete one you no longer use or get more space.')],
    campaigns: [L(lang, 'Você chegou ao limite de campanhas', 'You reached your campaign limit'),
      L(lang, 'Suas campanhas continuam intactas. Para abrir outra, encerre uma que acabou ou aumente o limite.',
        'Your campaigns stay intact. To start another, close one that has ended or raise the limit.')],
    characters: [L(lang, 'Você chegou ao limite de personagens', 'You reached your character limit'),
      L(lang, 'Para criar outra, apague uma que não usa ou aumente o limite. Entrando numa mesa com código, o mestre pode ter uma vaga para você.',
        'To create another, delete one you no longer use or raise the limit. Joining a table with a code, the GM may have a seat for you.')],
    slots: [dm ? L(lang, `A mesa de ${dm} está sem vagas`, `${dm}'s table has no free seats`) : L(lang, 'A mesa está sem vagas', 'The table has no free seats'),
      L(lang, 'Você já está no limite de personagens do seu plano e o mestre não tem vaga sobrando nesta mesa. Libere um personagem seu, aumente seu limite ou peça ao mestre uma vaga a mais.',
        "You're at your plan's character limit and the GM has no spare seat at this table. Free up one of your characters, raise your limit or ask the GM for an extra seat.")],
    cards: [L(lang, 'O mundo desta campanha está cheio', "This campaign's world is full"),
      L(lang, `Cada campanha comporta até ${formatInt(CARDS_MAX, lang)} cartões no Mundo. Junte ou apague cartões que não usa para criar outros.`,
        `Each campaign holds up to ${formatInt(CARDS_MAX, lang)} World cards. Merge or delete unused cards to make room.`)],
  }[limit];

  const suggestions = [];
  const kindForPlan = limit === 'slots' ? 'characters' : limit;
  const curSlug = info.plan || plans[0]?.slug;
  // Com o uso atual em mãos, sugere o que de fato resolve: o menor plano cujo
  // limite passa do uso e quantos pacotes do extra seriam precisos.
  const hasUsage = limit !== 'slots' && limit !== 'cards' && used != null && max != null;
  const unit = limit === 'images' ? MB : 1;
  const curPlan = plans.find(p => p.slug === curSlug);
  const extraNow = hasUsage && curPlan ? Math.max(0, max - planValue(curPlan, kindForPlan) * unit) : 0;
  const required = hasUsage ? used + (limit === 'images' ? Math.max(num(info.needed, 0), 1) : 1) : null;
  const next = hasUsage
    ? cheapestPlanFor(plans, curSlug, kindForPlan, (p) => planValue(p, kindForPlan) * unit + extraNow >= required)
    : nextPlanFor(plans, curSlug, kindForPlan);
  if (next) {
    suggestions.push({
      type: 'plan', slug: next.slug, price: next.priceCents, name: planName(next, lang),
      text: L(lang,
        `No plano ${planName(next, lang)} você teria ${amountText(kindForPlan, planValue(next, kindForPlan), lang)} — ${formatPrice(next.priceCents, lang)}/mês.`,
        `On the ${planName(next, lang)} plan you'd have ${amountText(kindForPlan, planValue(next, kindForPlan), lang)} — ${formatPrice(next.priceCents, lang)}/month.`),
    });
  }
  const add = addonFor(addons, kindForPlan);
  if (add && limit !== 'cards') {
    const step = num(add.amount, 0) * unit;
    const qty = hasUsage && step > 0 ? Math.max(1, Math.ceil((required - max) / step)) : 1;
    const pre = next ? L(lang, 'Ou só', 'Or just') : L(lang, 'Com', 'With');
    suggestions.push({
      type: 'addon', slug: add.slug, price: add.priceCents, name: L(lang, add.namePt, add.nameEn), quantity: qty,
      text: qty > 1
        ? L(lang,
          `${pre} extras: ${qty} pacotes de ${add.namePt} por ${formatPrice(add.priceCents * qty, lang)}/mês.`,
          `${pre} add-ons: ${qty} packs of ${add.nameEn} for ${formatPrice(add.priceCents * qty, lang)}/month.`)
        : L(lang,
          `${pre} um extra: ${add.namePt} por ${formatPrice(add.priceCents, lang)}/mês.`,
          `${pre} an add-on: ${add.nameEn} for ${formatPrice(add.priceCents, lang)}/month.`),
    });
  }
  if (limit === 'slots') {
    const slotAdd = addonFor(addons, 'slots');
    if (slotAdd) {
      suggestions.push({
        type: 'hint', slug: slotAdd.slug, price: slotAdd.priceCents,
        text: L(lang, `O mestre pode liberar mais vagas com o extra "${slotAdd.namePt}" (${formatPrice(slotAdd.priceCents, lang)}/mês).`,
          `The GM can open more seats with the "${slotAdd.nameEn}" add-on (${formatPrice(slotAdd.priceCents, lang)}/month).`),
      });
    }
  }
  return { title: T[0], body: T[1], usedText, planName: curName, suggestions };
}

/** Frase curta (para toasts/linhas de erro) do limite batido. */
export function limitShortText(info, lang = 'pt') {
  if (!info) return '';
  return {
    images: L(lang, 'Seu espaço de imagens encheu — veja "Meu plano".', 'Your image space is full — see "My plan".'),
    campaigns: L(lang, 'Você chegou ao limite de campanhas do seu plano — veja "Meu plano".', "You reached your plan's campaign limit — see \"My plan\"."),
    characters: L(lang, 'Você chegou ao limite de personagens do seu plano — veja "Meu plano".', "You reached your plan's character limit — see \"My plan\"."),
    slots: L(lang, 'A mesa está sem vagas e você está no limite de personagens.', 'The table has no free seats and you are at your character limit.'),
    cards: L(lang, `O mundo desta campanha chegou a ${formatInt(CARDS_MAX, lang)} cartões.`, `This campaign's world reached ${formatInt(CARDS_MAX, lang)} cards.`),
  }[info.limit] || '';
}

// ---------------------------------------------------------------- campanha encerrada

export function isClosed(campaign) {
  return campaign?.status === 'closed';
}

/** {closedAt, purgeAt, daysLeft} — purgeAt vem da API ou é closedAt + 30 dias. */
export function closedInfo(campaign, now = Date.now()) {
  if (!isClosed(campaign)) return null;
  const closedAt = campaign.closedAt || campaign.closed_at || null;
  let purgeAt = campaign.purgeAt || campaign.purge_at || null;
  if (!purgeAt && closedAt) {
    const d = new Date(closedAt);
    if (!Number.isNaN(d.getTime())) purgeAt = new Date(d.getTime() + CLOSED_DAYS * 86400000).toISOString();
  }
  const left = purgeAt ? Math.ceil((new Date(purgeAt).getTime() - now) / 86400000) : null;
  return { closedAt, purgeAt, daysLeft: left == null ? null : Math.max(0, left) };
}

/** "Esta campanha foi encerrada em dd/mm. Baixem suas fichas até dd/mm." */
export function closedText(campaign, lang = 'pt', now = Date.now()) {
  const info = closedInfo(campaign, now);
  if (!info) return '';
  const c = formatDay(info.closedAt, lang);
  const p = formatDay(info.purgeAt, lang);
  const pt = `Esta campanha foi encerrada${c ? ` em ${c}` : ''}.${p ? ` Baixem suas fichas até ${p}.` : ' Baixem suas fichas.'}`;
  const en = `This campaign was closed${c ? ` on ${c}` : ''}.${p ? ` Download your sheets by ${p}.` : ' Download your sheets.'}`;
  return L(lang, pt, en);
}

// ---------------------------------------------------------------- vagas de mesa

/** Membro ocupando vaga do mestre? */
export function isSponsored(m) {
  return !!(m && (m.sponsored || m.isSponsored || m.is_sponsored));
}

/** {used, max} de vagas de uma campanha (campo da API ou contagem dos membros). */
export function tableSlots(campaign, my = null) {
  const s = campaign?.slots || campaign?.tableSlots;
  if (s && typeof s === 'object' && s.max != null) return { used: num(s.used, 0), max: num(s.max, 0) };
  const used = (campaign?.members || []).filter(isSponsored).length;
  const max = my ? my.limits.slots : (campaign?.slotsMax ?? null);
  return { used, max: max == null ? null : num(max, 0) };
}

/** Resposta de entrar na mesa usa vaga do mestre? → nome do mestre ou ''. */
export function sponsoredFrom(res, fallbackDm = '') {
  if (!res || typeof res !== 'object') return null;
  const m = res.membership || res.member || res;
  if (!isSponsored(m) && !isSponsored(res)) return null;
  return res.dmName || res.dm_name || res.campaign?.dmName || m.dmName || fallbackDm || '';
}

export function sponsoredText(dmName, lang = 'pt') {
  return dmName
    ? L(lang, `Este personagem usa uma vaga da mesa de ${dmName}.`, `This character uses a seat at ${dmName}'s table.`)
    : L(lang, 'Este personagem usa uma vaga da mesa do mestre.', "This character uses a seat at the GM's table.");
}

/** Vai precisar de vaga da mesa? (jogador já no limite de personagens próprios) */
export function needsTableSeat(my) {
  if (!my) return false;
  return my.usage.characters >= my.limits.characters;
}

/** Aviso no começo do assistente quando o plano já está no limite de personagens ('' se não). */
export function creatorLimitNotice(my, lang = 'pt') {
  if (!needsTableSeat(my)) return '';
  const lim = `${formatInt(my.usage.characters, lang)}/${formatInt(my.limits.characters, lang)}`;
  return L(lang,
    `Você já chegou ao limite de personagens do seu plano (${lim}). Ainda dá para criar este entrando numa mesa com código: o mestre pode ter uma vaga para você. Nada do que você já tem será apagado.`,
    `You've reached your plan's character limit (${lim}). You can still create this one by joining a table with a code: the GM may have a seat for you. Nothing you already have will be deleted.`);
}

/** Link mailto do "fale com a gente" (pagamento em breve). */
export function contactHref(email, { kind = 'plan', name = '', lang = 'pt' } = {}) {
  const subject = kind === 'addon'
    ? L(lang, `Forja de Heróis — quero o extra ${name}`, `Forja de Heróis — I want the ${name} add-on`)
    : L(lang, `Forja de Heróis — quero o plano ${name}`, `Forja de Heróis — I want the ${name} plan`);
  return `mailto:${email || ''}?subject=${encodeURIComponent(subject)}`;
}

/** Vagas livres anunciadas na prévia do convite (ou null se a API não disser). */
export function inviteSeatsFree(invite) {
  const v = pick(invite, 'slotsFree', 'slots_free', 'freeSlots', 'seatsFree');
  if (v != null) return num(v, 0);
  const s = pick(invite, 'slots');
  if (s && typeof s === 'object' && s.max != null) return Math.max(0, num(s.max, 0) - num(s.used, 0));
  return null;
}

/** Aviso antes de entrar: "vai usar uma vaga da mesa de X" (ou '' se não precisa). */
export function seatNoticeText(my, dmName, lang = 'pt', seatsFree = null) {
  if (!needsTableSeat(my)) return '';
  const who = dmName ? L(lang, `da mesa de ${dmName}`, `at ${dmName}'s table`) : L(lang, 'da mesa do mestre', "at the GM's table");
  const lim = `${formatInt(my.usage.characters, lang)}/${formatInt(my.limits.characters, lang)}`;
  if (seatsFree === 0) {
    return L(lang,
      `Você já está no limite de personagens do seu plano (${lim}) e a mesa está sem vagas livres agora.`,
      `You're at your plan's character limit (${lim}) and the table has no free seats right now.`);
  }
  return L(lang,
    `Você já está no limite de personagens do seu plano (${lim}): este personagem vai usar uma vaga ${who}${seatsFree ? ` (${seatsFree} livre${seatsFree === 1 ? '' : 's'})` : ''} e não conta no seu limite enquanto a campanha existir.`,
    `You're at your plan's character limit (${lim}): this character will use a seat ${who}${seatsFree ? ` (${seatsFree} free)` : ''} and won't count toward your limit while the campaign exists.`);
}
