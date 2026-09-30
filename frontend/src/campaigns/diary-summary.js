// Diário da campanha — funções puras (agrupamento e "Resumo da sessão").
// Sem React aqui para poder testar com node --test.

export const DIARY_TYPES = [
  { id: 'note',    icon: '✎',  pt: 'Notas',     en: 'Notes',    match: e => e.kind === 'note' },
  { id: 'session', icon: '📖', pt: 'Sessões',   en: 'Sessions', match: e => e.subtype === 'session' },
  { id: 'levelup', icon: '⬆',  pt: 'Níveis',    en: 'Levels',   match: e => e.subtype === 'levelup' },
  { id: 'xp',      icon: '✦',  pt: 'XP',        en: 'XP',       match: e => e.subtype === 'xp' },
  { id: 'item',    icon: '🎁', pt: 'Itens',     en: 'Items',    match: e => e.subtype === 'item' },
  { id: 'combat',  icon: '⚔',  pt: 'Combates',  en: 'Combats',  match: e => e.subtype === 'combat' },
  { id: 'rest',    icon: '🛌', pt: 'Descansos', en: 'Rests',    match: e => e.subtype === 'rest' },
  { id: 'roll',    icon: '🎲', pt: 'Rolagens',  en: 'Rolls',    match: e => e.subtype === 'roll' },
];

const ICONS = { summary: '📜', custom: '•' };

export function entryIcon(entry) {
  if (ICONS[entry.subtype]) return ICONS[entry.subtype];
  const type = DIARY_TYPES.find(tp => tp.id !== 'note' && tp.match(entry));
  return type ? type.icon : (entry.kind === 'note' ? '✎' : '•');
}

export function matchesFilter(entry, filter) {
  if (!filter || filter === 'all') return true;
  const type = DIARY_TYPES.find(tp => tp.id === filter);
  return type ? type.match(entry) : true;
}

function dayKey(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Agrupa entradas (já ordenadas da mais nova para a mais antiga) por sessão;
 * entradas sem sessão agrupam por dia. Ordem dos grupos = ordem de aparição.
 */
export function groupEntries(entries) {
  const groups = [];
  const byKey = new Map();
  for (const e of entries || []) {
    const key = e.session != null ? `s${e.session}` : `d${dayKey(e.occurredAt)}`;
    let g = byKey.get(key);
    if (!g) {
      g = { key, session: e.session ?? null, day: e.session != null ? null : dayKey(e.occurredAt), entries: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    g.entries.push(e);
  }
  return groups;
}

const T = (lang, pt, en) => (lang === 'en' ? en : pt);

function listJoin(items, lang) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${T(lang, 'e', 'and')} ${items[items.length - 1]}`;
}

/**
 * Monta o texto do "Resumo da sessão" a partir dos eventos (sem IA).
 * Ignora entradas ocultas (o texto é para ler aos jogadores) e resumos anteriores.
 * opts: { lang, session, title }
 */
export function buildSessionSummary(entries, opts = {}) {
  const lang = opts.lang || 'pt';
  const list = [...(entries || [])]
    .filter(e => !e.hidden && e.subtype !== 'summary')
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));

  // Nível final de cada personagem (a última subida vale).
  const levels = new Map();
  const xp = new Map();
  const items = [];
  const defeated = [];
  let combatStarts = 0;
  let combatEnds = 0;
  let rests = 0;
  let shortRests = 0;
  const highlights = [];
  const notes = [];

  for (const e of list) {
    const d = e.data || {};
    switch (e.subtype) {
      case 'levelup':
        if (d.characterName) levels.set(d.characterName, d.level);
        break;
      case 'xp':
        for (const c of d.characters || []) xp.set(c.name, (xp.get(c.name) || 0) + (Number(d.each) || 0));
        break;
      case 'item':
        for (const it of d.items || []) items.push(`${it.itemName}${it.qty > 1 ? ` ×${it.qty}` : ''} (${it.characterName})`);
        break;
      case 'combat':
        if (d.phase === 'start') combatStarts += 1;
        if (d.phase === 'end') {
          combatEnds += 1;
          for (const n of d.defeated || []) if (!defeated.includes(n)) defeated.push(n);
        }
        break;
      case 'rest':
        if (d.rest === 'short') shortRests += 1;
        else rests += 1;
        break;
      case 'roll':
        for (const r of d.rolls || []) {
          highlights.push(`${r.crit === 'crit' ? T(lang, '20 natural', 'natural 20') : T(lang, '1 natural', 'natural 1')} — ${r.who}${r.label ? ` (${r.label})` : ''}`);
        }
        break;
      default:
        if (e.kind === 'note' && (e.title || e.body)) notes.push(e.title || e.body.split('\n')[0]);
    }
  }

  const combats = Math.max(combatStarts, combatEnds);
  const heading = opts.session != null
    ? `${T(lang, 'Sessão', 'Session')} ${opts.session}${opts.title ? ` — ${opts.title}` : ''}`
    : (opts.title || '');
  const lines = [T(lang, 'No último episódio…', 'Previously on…') + (heading ? ` (${heading})` : '')];
  const bullet = s => lines.push(`• ${s}`);

  if (levels.size) {
    bullet(T(lang, 'Subiram de nível: ', 'Leveled up: ')
      + listJoin([...levels].map(([n, l]) => `${n} (${T(lang, 'nível', 'level')} ${l})`), lang));
  }
  if (xp.size) {
    const amounts = new Set(xp.values());
    bullet(amounts.size === 1
      ? `${T(lang, 'XP', 'XP')}: +${[...amounts][0]} ${T(lang, 'para', 'for')} ${listJoin([...xp.keys()], lang)}`
      : `${T(lang, 'XP', 'XP')}: ` + [...xp].map(([n, v]) => `${n} +${v}`).join(', '));
  }
  if (items.length) bullet(T(lang, 'Itens obtidos: ', 'Items gained: ') + items.join('; '));
  if (combats) {
    bullet(`${T(lang, 'Combates', 'Combats')}: ${combats}`
      + (defeated.length ? ` — ${T(lang, 'derrotados', 'defeated')}: ${listJoin(defeated, lang)}` : ''));
  }
  if (rests) bullet(T(lang, `Descansos longos: ${rests}`, `Long rests: ${rests}`));
  if (shortRests) bullet(T(lang, `Descansos curtos: ${shortRests}`, `Short rests: ${shortRests}`));
  if (highlights.length) bullet(T(lang, 'Momentos marcantes: ', 'Highlights: ') + highlights.slice(0, 6).join('; '));
  if (notes.length) {
    lines.push('');
    lines.push(T(lang, 'Anotações:', 'Notes:'));
    for (const n of notes) lines.push(`• ${n}`);
  }
  if (lines.length === 1) lines.push(T(lang, '(Nada registrado nesta sessão ainda.)', '(Nothing logged this session yet.)'));
  return lines.join('\n');
}
