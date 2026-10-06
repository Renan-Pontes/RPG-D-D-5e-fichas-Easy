// Grupo (jogadores, pedidos de nível/XP e convite) — funções puras.
// Sem React aqui para poder testar com node --test.
import Utils from '../../utils.js';
import { tName } from '../../data/i18n.js';

export const t = (lang, pt, en) => (lang === 'en' ? en : pt);

// XP total para passar do nível N ao N+1 (índice = nível atual). SRD 5.2.1.
export const XP_NEXT = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

const safe = (fn, fallback = null) => { try { const v = fn(); return Number.isFinite(v) ? v : fallback; } catch { return fallback; } };

/** Classes de um personagem: do resumo do servidor ({classes}) ou da ficha completa. */
export function classesOf(c) {
  if (!c) return [];
  if (Array.isArray(c.classes) && c.classes.length) return c.classes;
  if (!c.className) return [];
  try { return Utils.classEntries(c); } catch { return [{ id: c.className, level: c.level || 1 }]; }
}

/** "Elfo da Floresta · Druida 3 / Guerreiro 1" — nomes traduzidos, nunca o id cru. */
export function charLine(c, lang) {
  if (!c) return '';
  const cls = classesOf(c).map(e => `${tName('class', e.id, lang)} ${e.level}`).join(' / ');
  return [c.race && tName('race', c.race, lang), cls].filter(Boolean).join(' · ');
}

/**
 * Números do card do jogador. Com a ficha completa (mestre ou dono) usa o
 * mesmo cálculo da Mesa: Utils.computeAc e Utils.initiative. Com só o resumo
 * público (outro jogador), CA e iniciativa ficam null (o servidor não manda).
 */
export function memberStats(member) {
  const c = member?.character;
  if (!c) return null;
  const full = c.data && typeof c.data === 'object' ? c.data : null;
  const info = full || c.summary || {};
  const classes = classesOf(info);
  const wild = full?.wildShape;
  return {
    full: !!full,
    name: c.name,
    avatar: info.avatar || '',
    race: info.race || '',
    classId: classes[0]?.id || info.className || '',
    hp: info.currentHp ?? null,
    maxHp: info.maxHp ?? null,
    tempHp: info.tempHp || 0,
    ac: full ? safe(() => Utils.computeAc(full), full.armorClass ?? null) : null,
    init: full ? safe(() => Utils.initiative(full)) : null,
    level: info.level || classes.reduce((s, e) => s + (e.level || 0), 0) || 1,
    xp: info.xp ?? null,
    conditions: Array.isArray(info.conditions) ? info.conditions : [],
    cheatMode: !!info.cheatMode,
    isDruid: classes.some(e => e.id === 'druid'),
    wildShape: wild?.active ? { beast: wild.beastName || '', hp: wild.beastCurrentHp ?? null, maxHp: wild.beastMaxHp ?? null } : null,
    inspiration: !!full?.inspiration,
  };
}

/** Faixa de vida para cor da barra. */
export function hpTone(hp, maxHp) {
  if (hp == null || !maxHp) return 'unknown';
  if (hp <= 0) return 'down';
  const pct = hp / maxHp;
  return pct <= 0.25 ? 'crit' : pct <= 0.6 ? 'warn' : 'ok';
}

export const fmtMod = (n) => (n == null ? '—' : (n >= 0 ? `+${n}` : `${n}`));

/** Progresso de XP: {xp, next, pct} (next null no nível 20). */
export function xpProgress(level, xp) {
  const lvl = Math.max(1, Math.min(20, level || 1));
  const next = lvl >= 20 ? null : XP_NEXT[lvl];
  const prev = lvl <= 1 ? 0 : XP_NEXT[lvl - 1];
  const cur = Number(xp) || 0;
  const pct = next == null ? 100 : Math.max(0, Math.min(100, ((cur - prev) / Math.max(1, next - prev)) * 100));
  return { xp: cur, next, pct };
}

/**
 * Separa os pedidos numa só fonte de verdade.
 *  - pending: todos com status 'pending' (subida de nível incluída) — é esse o
 *    número do badge e de "Pedidos (n)", o mesmo de campaign.pendingApprovals.
 *  - unlocked: liberados esperando o jogador confirmar na ficha.
 *  - history: liberados, aplicados e recusados, do mais recente ao mais antigo.
 */
export function splitApprovals(approvals) {
  const list = Array.isArray(approvals) ? approvals : [];
  const when = a => String(a.reviewed_at || a.reviewedAt || a.created_at || a.createdAt || '');
  const byNewest = (a, b) => when(b).localeCompare(when(a)) || (b.id || 0) - (a.id || 0);
  return {
    pending: list.filter(a => a.status === 'pending'),
    unlocked: list.filter(a => a.status === 'approved'),
    history: list.filter(a => ['approved', 'consumed', 'rejected'].includes(a.status)).sort(byNewest),
  };
}

export const pendingCount = (approvals) => splitApprovals(approvals).pending.length;

/** Pedido de nível aberto (pendente ou liberado) de um personagem. */
export function levelupFor(approvals, charId, status) {
  return (approvals || []).find(a => a.type === 'levelup' && a.status === status && a.character?.id === charId) || null;
}

export function labelType(type, lang) {
  const map = {
    levelup: t(lang, 'Subir de nível', 'Level up'),
    feature: t(lang, 'Nova característica', 'New feature'),
    item: t(lang, 'Novo item', 'New item'),
    spell: t(lang, 'Nova magia', 'New spell'),
    other: t(lang, 'Outro', 'Other'),
  };
  return map[type] || t(lang, 'Pedido', 'Request');
}

/** Conteúdo de um pedido em texto (nunca JSON cru). */
export function payloadText(a, lang) {
  const p = a?.payload || {};
  if (a?.type === 'levelup') return p.toLevel ? `${t(lang, 'para o nível', 'to level')} ${p.toLevel}` : '';
  if (a?.type === 'spell') return tName('spellName', p.id || p.spellId || '', lang);
  const v = p.name || p.title || p.desc || '';
  return typeof v === 'string' ? v : '';
}

const ABIL = { str: ['FOR', 'STR'], dex: ['DES', 'DEX'], con: ['CON', 'CON'], int: ['INT', 'INT'], wis: ['SAB', 'WIS'], cha: ['CAR', 'CHA'] };

/** Resumo do que o jogador escolheu ao subir de nível (histórico do mestre). */
export function levelupSummary(p, lang) {
  if (!p) return '';
  const parts = [];
  if (p.classId) parts.push(tName('class', p.classId, lang));
  if (p.hpGain) parts.push(`+${p.hpGain} ${t(lang, 'PV', 'HP')}`);
  if (p.choice?.type === 'asi') {
    parts.push(Object.entries(p.choice.asi || {}).filter(([, v]) => v)
      .map(([k, v]) => `${(ABIL[k] ? ABIL[k][lang === 'en' ? 1 : 0] : k.toUpperCase())} +${v}`).join(', '));
  }
  if (p.choice?.type === 'feat') parts.push(`${t(lang, 'Talento', 'Feat')}: ${p.choice.feat}`);
  if (p.skillAdded) parts.push(tName('skill', p.skillAdded, lang));
  if (p.spellsAdded?.length) parts.push(p.spellsAdded.map(x => tName('spellName', typeof x === 'string' ? x : x?.id, lang)).join(', '));
  return parts.filter(Boolean).join(' · ');
}

/** Rótulo do status de um pedido no histórico. */
export function statusLabel(status, lang) {
  return {
    approved: t(lang, 'liberado', 'unlocked'),
    consumed: t(lang, 'aplicado', 'applied'),
    rejected: t(lang, 'recusado', 'rejected'),
    pending: t(lang, 'pendente', 'pending'),
  }[status] || status;
}

/**
 * Histórico unificado: decisões de pedidos (liberações, aplicações, recusas)
 * e entregas de XP (eventos 'xp' do diário), do mais recente ao mais antigo.
 * Cada item: {key, at, kind: 'approval'|'xp', ...}.
 */
export function buildHistory(approvals, xpEvents, limit = 30) {
  const items = [];
  for (const a of splitApprovals(approvals).history) {
    items.push({ key: `a${a.id}`, at: String(a.reviewed_at || a.created_at || ''), kind: 'approval', approval: a });
  }
  for (const e of xpEvents || []) {
    if (e?.subtype !== 'xp') continue;
    const d = e.data || {};
    items.push({
      key: `x${e.id}`, at: String(e.occurredAt || ''), kind: 'xp',
      each: Number(d.each) || 0, names: (d.characters || []).map(c => c?.name).filter(Boolean),
    });
  }
  items.sort((a, b) => b.at.localeCompare(a.at));
  return items.slice(0, limit);
}

/**
 * Link de convite. Com rota /join/<código> no app: `${origin}/join/${code}`.
 * Sem a rota, copia um texto com o código (que o jogador digita em
 * Campanhas › Entrar com código) e o endereço do site.
 */
export function inviteText({ origin, code, campaignName, hasJoinRoute, lang }) {
  if (!code) return '';
  const base = String(origin || '').replace(/\/+$/, '');
  if (hasJoinRoute) return `${base}/join/${encodeURIComponent(code)}`;
  return t(lang,
    `Entre na campanha ${campaignName ? `"${campaignName}" ` : ''}na Forja de Heróis: abra ${base}, vá em Campanhas › Entrar com código e digite ${code}`,
    `Join ${campaignName ? `"${campaignName}" ` : 'my campaign '}on Forja de Heróis: open ${base}, go to Campaigns › Join with code and type ${code}`);
}
