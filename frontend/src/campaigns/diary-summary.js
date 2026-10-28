// Diário da campanha — funções puras (agrupamento e "Resumo da sessão").
// Sem React aqui para poder testar com node --test.

export const DIARY_TYPES = [
  { id: 'note',    icon: '✎',  pt: 'Notas',     en: 'Notes',    match: e => e.kind === 'note' },
  { id: 'session', icon: '📖', pt: 'Sessões',   en: 'Sessions', match: e => e.subtype === 'session' },
  { id: 'levelup', icon: '⬆',  pt: 'Níveis',    en: 'Levels',   match: e => e.subtype === 'levelup' || e.subtype === 'levelgrant' },
  { id: 'xp',      icon: '✦',  pt: 'XP',        en: 'XP',       match: e => e.subtype === 'xp' },
  { id: 'item',    icon: '🎁', pt: 'Itens',     en: 'Items',    match: e => e.subtype === 'item' },
  { id: 'combat',  icon: '⚔',  pt: 'Combates',  en: 'Combats',  match: e => e.subtype === 'combat' },
  { id: 'rest',    icon: '🛌', pt: 'Descansos', en: 'Rests',    match: e => e.subtype === 'rest' },
  { id: 'roll',    icon: '🎲', pt: 'Rolagens',  en: 'Rolls',    match: e => e.subtype === 'roll' },
  { id: 'reveal',  icon: '👁',  pt: 'Revelações', en: 'Reveals', match: e => e.subtype === 'reveal' },
];

const ICONS = { summary: '📜', custom: '•', levelgrant: '✨', plan: '📋' };

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

// ------------------------------------------------------------------ combate narrado
const times = (n, lang) => (lang === 'en'
  ? ({ 1: 'once', 2: 'twice' }[n] || `${n} times`)
  : ({ 1: 'uma vez', 2: 'duas vezes' }[n] || `${n} vezes`));

/**
 * Narra o fim de um combate a partir de data (campos do backend: pcs,
 * monsters [{name,count,defeated}], downs {nome: n}, winner, rounds).
 * "Thalion e Mira venceram 3 inimigos (Goblin ×3) em 4 rodadas; Mira caiu uma vez."
 * Devolve '' se o evento não tiver o resumo estruturado (eventos antigos).
 */
export function combatNarration(data, lang = 'pt') {
  const d = data || {};
  if (d.phase !== 'end' || !Array.isArray(d.pcs) || !Array.isArray(d.monsters)) return '';
  const rounds = Number(d.rounds) || 0;
  const rtxt = lang === 'en' ? `${rounds} round${rounds === 1 ? '' : 's'}` : `${rounds} rodada${rounds === 1 ? '' : 's'}`;
  const pcs = listJoin(d.pcs.filter(Boolean), lang) || T(lang, 'O grupo', 'The party');
  const many = d.pcs.length > 1;
  const total = d.monsters.reduce((s, g) => s + (Number(g?.count) || 0), 0);
  const foes = d.monsters.map(g => (g.count > 1 ? `${g.name} ×${g.count}` : g.name)).join(', ');
  let main;
  if (d.winner === 'party' && total) {
    main = lang === 'en'
      ? `${pcs} defeated ${total} ${total === 1 ? 'foe' : 'foes'} (${foes}) in ${rtxt}`
      : `${pcs} ${many ? 'venceram' : 'venceu'} ${total} inimigo${total === 1 ? '' : 's'} (${foes}) em ${rtxt}`;
  } else if (d.winner === 'monsters') {
    main = lang === 'en'
      ? `${pcs} fell before ${foes || 'their foes'} in ${rtxt}`
      : `${pcs} ${many ? 'caíram' : 'caiu'} diante de ${foes || 'inimigos'} em ${rtxt}`;
  } else {
    main = lang === 'en'
      ? `Combat ended after ${rtxt}${foes ? ` against ${foes}` : ''}`
      : `Combate encerrado em ${rtxt}${foes ? ` contra ${foes}` : ''}`;
  }
  const falls = Object.entries(d.downs || {}).filter(([, n]) => n > 0)
    .map(([name, n]) => (lang === 'en' ? `${name} went down ${times(n, lang)}` : `${name} caiu ${times(n, lang)}`));
  return main + (falls.length ? `; ${falls.join('; ')}` : '') + '.';
}

// ------------------------------------------------------------------ título/texto no idioma
/**
 * Título da entrada no idioma da tela. Os eventos automáticos chegam com o
 * título em português do servidor; em inglês, montamos a partir de `data`.
 */
export function entryTitle(entry, lang = 'pt') {
  const e = entry || {};
  const d = e.data || {};
  if (e.kind === 'note' || lang !== 'en') {
    if (e.subtype === 'combat' && d.phase === 'end' && lang !== 'en') return e.title || 'Combate encerrado';
    return e.title || '';
  }
  switch (e.subtype) {
    case 'session':
      if (d.phase === 'end') return d.session != null ? `Session ${d.session} ended${d.length ? ` · ${d.length}` : ''}` : e.title;
      return d.session != null ? `Session ${d.session} started${d.title ? ` — ${d.title}` : ''}` : e.title;
    case 'plan': return d.session != null ? `Session ${d.session} plan` : e.title;
    case 'combat': return d.phase === 'start' ? 'Combat started' : d.phase === 'end' ? 'Combat ended' : e.title;
    case 'levelup': return d.characterName ? `${d.characterName} reached level ${d.level}` : e.title;
    case 'levelgrant': {
      const g = d.grants || [];
      if (g.length === 1) return `Level up unlocked for ${g[0].characterName}${g[0].toLevel ? ` (level ${g[0].toLevel})` : ''}`;
      return g.length ? `Level up unlocked for ${listJoin(g.map(x => x.characterName), 'en')}` : e.title;
    }
    case 'xp': return d.each != null ? `+${d.each} XP for ${(d.characters || []).length} character(s)` : e.title;
    case 'item': {
      const it = d.items || [];
      if (it.length === 1) return `${it[0].characterName} received ${it[0].itemName}`;
      return it.length ? `${it.length} items given` : e.title;
    }
    case 'rest': return d.rest === 'short' ? 'Party short rest' : 'Party long rest';
    case 'reveal': {
      const n = d.entryName || '';
      if (d.secretIds?.length && d.visibility === 'revealed') return `Discovered: ${n}`;
      if (d.pinIds?.length && !d.secretIds?.length) return `On the map: ${n}`;
      return d.visibility === 'partial' ? `Rumor: ${n}` : `Revealed: ${n}`;
    }
    default: return e.title || '';
  }
}

/** Texto da entrada: combate encerrado vira narração; o resto, o corpo salvo. */
export function entryBody(entry, lang = 'pt') {
  const e = entry || {};
  if (e.subtype === 'combat' && !e.editedAt) {
    const n = combatNarration(e.data, lang);
    if (n) return n;
  }
  if (lang === 'en' && e.kind !== 'note' && !e.editedAt) {
    const d = e.data || {};
    if (e.subtype === 'item' && (d.items || []).length) {
      return d.items.map(i => `${i.itemName}${i.qty > 1 ? ` ×${i.qty}` : ''} → ${i.characterName}`).join('\n');
    }
    if (e.subtype === 'xp' && (d.characters || []).length) return d.characters.map(c => c.name).join(', ');
  }
  return e.body || '';
}

// ------------------------------------------------------------------ "Anteriormente em…"
/**
 * Qual sessão recapitular: a última sessão numerada que já tem algo além da
 * abertura. Se a sessão atual acabou de começar (só a entrada de abertura),
 * usa a anterior. Sem sessões numeradas, o último dia com eventos.
 * Devolve a chave do grupo (ex.: 's12' ou 'd2026-09-30') ou null.
 */
export function pickRecapGroup(groups) {
  const meaningful = g => (g.entries || []).some(e => e.subtype !== 'session' && e.subtype !== 'summary' && !e.hidden);
  const found = (groups || []).find(meaningful);
  return found ? found.key : null;
}

// ------------------------------------------------------------------ o rascunho rico (V12)
const sceneName = (s) => String(s?.text || '').split('\n')[0].trim();
const realScene = (s) => !!s && (!!sceneName(s) || !!s.nodeRef);

/**
 * As cenas jogadas de um plano: as feitas (✓) e a que estava "agora" (`sceneId`), na ordem
 * do plano — as que o resumo cita. (A de "agora" sem ✓ foi interrompida: ela também passa
 * para a Sessão N+1 com "Levar o que sobrou".) `doneBefore` = as que já estavam feitas quando
 * a sessão começou (diarySessions[n].doneBefore): não foram jogadas nela.
 */
export function playedScenes(plan, sceneId = null, doneBefore = null) {
  const before = new Set(Array.isArray(doneBefore) ? doneBefore : []);
  return (plan?.scenes || []).filter(s => realScene(s) && ((s.done && !before.has(s.id)) || (sceneId && s.id === sceneId)));
}

/** Os testes pedidos durante a sessão (entre o startedAt e o endedAt dela). */
export function sessionChecks(checks, startedAt, endedAt = null) {
  const t0 = Date.parse(startedAt || '') || 0;
  const t1 = Date.parse(endedAt || '') || Infinity;
  return (checks || []).filter(c => {
    const at = Date.parse(c?.createdAt || '') || 0;
    return c && at >= t0 && at <= t1;
  });
}

/**
 * "Percepção CD 15: 3 de 4 passaram" (a CD secreta fica de fora: o texto vai à Tela; sem CD,
 * só quantos responderam). Ninguém respondeu → ''.
 */
export function checkResultLine(check, lang = 'pt') {
  const targets = check?.targets || [];
  const answered = targets.filter(t => t.response).length;
  if (!answered) return '';
  const passed = targets.filter(t => t.outcome === 'pass').length;
  const label = String(check.label || '').trim() || T(lang, 'Teste', 'Check');
  const dc = Number.isInteger(check.dc) && !check.dcHidden ? ` ${T(lang, 'CD', 'DC')} ${check.dc}` : '';
  if (!Number.isInteger(check.dc)) return `${label}: ${T(lang, `${answered} ${answered === 1 ? 'respondeu' : 'responderam'}`, `${answered} answered`)}`;
  return `${label}${dc}: ${T(lang, `${passed} de ${targets.length} ${passed === 1 ? 'passou' : 'passaram'}`, `${passed} of ${targets.length} passed`)}`;
}

/** O que foi mostrado na Tela (diarySessions[n].shown, sem cenas, resumos e textos soltos). */
export function shownNames(shown) {
  const out = [];
  for (const x of shown || []) {
    if (!x || !['card', 'image'].includes(x.k)) continue;
    // o servidor guarda até 60 caracteres: o nome cortado ganha "…"
    const raw = String(x.t || '');
    const name = raw.length >= 60 ? `${raw.slice(0, 59).trimEnd()}…` : raw.trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

const MOMENT_ICON = { shine: '★', push: '↗', hook: '✎' };

/**
 * "Momentos da noite" (só o mestre vê; nunca entra no texto, que vai à Tela): por
 * personagem, quantos testes ele respondeu na sessão e os momentos dele (✓ = aconteceu
 * nesta sessão). Sem momento hoje → `warn` ("levar para a Sessão N+1?").
 * party = [{id, name}] · spotlights = {id: [momento]} · checks = os da sessão
 */
export function nightMoments({ party = [], spotlights = {}, checks = [], session = null } = {}) {
  return party.map(p => {
    const tests = (checks || []).filter(c => (c.targets || []).some(t => t.characterId === p.id && t.response)).length;
    const list = (spotlights?.[String(p.id)] || []).filter(m => m.done == null || m.done === session);
    const moments = list.map(m => ({ icon: MOMENT_ICON[m.kind] || '★', text: String(m.text || '').trim(), done: m.done != null && m.done === session }));
    return { id: p.id, name: p.name, tests, moments, warn: !moments.some(m => m.done) };
  });
}

/** "Pipo · 4 testes · ★ fechadura ✓" / "Kaelor · 0 testes · ⚠ sem momento hoje". */
export function nightMomentLine(row, lang = 'pt') {
  const first = String(row.name || '').trim().split(/\s+/)[0] || row.name;
  const tests = T(lang, `${row.tests} ${row.tests === 1 ? 'teste' : 'testes'}`, `${row.tests} ${row.tests === 1 ? 'check' : 'checks'}`);
  const moments = row.moments.filter(m => m.done || row.warn).slice(0, 2).map(m => `${m.icon} ${m.text}${m.done ? ' ✓' : ''}`);
  const parts = [first, tests, ...moments];
  if (row.warn) parts.push(T(lang, '⚠ sem momento hoje', '⚠ no moment tonight'));
  return parts.join(' · ');
}

/**
 * Rascunho do "Anteriormente em…" (o Resumo da sessão) em prosa (sem IA), para ler à
 * mesa e mostrar na Tela. Ignora entradas ocultas e resumos anteriores. Com o plano da
 * sessão, os testes e o que foi à Tela (V12), cita as cenas jogadas, os testes com o
 * resultado e o que foi mostrado; os combates (rodadas, derrotados, quedas), as revelações
 * e os críticos vêm da Crônica.
 * opts: { lang, session, title, campaignName, plan, sceneId, doneBefore, checks, shown }  →  { title, text }
 */
export function buildRecap(entries, opts = {}) {
  const lang = opts.lang || 'pt';
  const list = [...(entries || [])]
    .filter(e => !e.hidden && e.subtype !== 'summary' && e.subtype !== 'session' && e.subtype !== 'plan')
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));

  const sentences = [];
  const levels = new Map();
  const items = new Map(); // personagem → Map(item → qtd)
  const discovered = [];
  const crits = [];
  const notes = [];
  let longRests = 0;
  for (const e of list) {
    const d = e.data || {};
    switch (e.subtype) {
      case 'combat': {
        const n = combatNarration(d, lang);
        if (n) {
          sentences.push(n);
          // combate que acabou antes de todos caírem: quem o grupo derrubou (só monstros)
          const down = d.winner === 'party' ? [] : (d.monsters || []).filter(g => g?.defeated > 0);
          if (down.length) {
            const who = listJoin(down.map(g => (g.defeated >= g.count ? (g.count > 1 ? `${g.name} ×${g.count}` : g.name)
              : T(lang, `${g.defeated} de ${g.count} ${g.name}`, `${g.defeated} of ${g.count} ${g.name}`))), lang);
            sentences.push(T(lang, `Derrotados: ${who}.`, `Defeated: ${who}.`));
          }
        } else if (d.phase === 'end' && d.defeated?.length) {
          sentences.push(T(lang, `O grupo derrotou ${listJoin(d.defeated, lang)}.`, `The party defeated ${listJoin(d.defeated, lang)}.`));
        }
        break;
      }
      case 'levelup':
        if (d.characterName) levels.set(d.characterName, d.level);
        break;
      case 'item':
        for (const it of d.items || []) {
          const who = it.characterName || '?';
          if (!items.has(who)) items.set(who, new Map());
          const bag = items.get(who);
          bag.set(it.itemName, (bag.get(it.itemName) || 0) + (Number(it.qty) || 1));
        }
        break;
      case 'reveal':
        if (d.entryName && !discovered.includes(d.entryName)) discovered.push(d.entryName);
        break;
      case 'rest':
        if (d.rest !== 'short') longRests += 1;
        break;
      case 'roll':
        for (const r of d.rolls || []) if (r.crit === 'crit') crits.push(r.who + (r.label ? ` (${r.label})` : ''));
        break;
      default:
        if (e.kind === 'note') {
          const first = (e.body || '').split('\n').find(Boolean) || '';
          const line = [e.title, first].filter(Boolean).join(': ');
          if (line) notes.push(line);
        }
    }
  }
  if (discovered.length) sentences.push(T(lang, `Descobriram ${listJoin(discovered, lang)}.`, `They learned of ${listJoin(discovered, lang)}.`));
  if (items.size) {
    const parts = [...items].map(([who, bag]) => {
      const what = listJoin([...bag].map(([name, q]) => (q > 1 ? `${name} ×${q}` : name)), lang);
      return T(lang, `${who} ficou com ${what}`, `${who} got ${what}`);
    });
    sentences.push(`${parts.join('; ')}.`);
  }
  if (crits.length) sentences.push(T(lang, `Os dados sorriram para ${listJoin([...new Set(crits)].slice(0, 4), lang)}.`, `Fortune smiled on ${listJoin([...new Set(crits)].slice(0, 4), lang)}.`));
  if (longRests) sentences.push(T(lang, 'Por fim, o grupo parou para descansar.', 'At last, the party stopped to rest.'));
  if (levels.size) {
    sentences.push(T(lang, 'Cresceram em poder: ', 'They grew in power: ')
      + listJoin([...levels].map(([n, l]) => `${n} (${T(lang, 'nível', 'level')} ${l})`), lang) + '.');
  }
  const paragraphs = [];
  const played = playedScenes(opts.plan, opts.sceneId, opts.doneBefore).map(sceneName).filter(Boolean);
  if (played.length) paragraphs.push(played.slice(0, 12).map(n => `✓ ${n}`).join('\n'));
  if (sentences.length) paragraphs.push(sentences.join(' '));
  const tests = (opts.checks || []).map(c => checkResultLine(c, lang)).filter(Boolean);
  const onScreen = shownNames(opts.shown);
  const facts = [];
  if (tests.length) facts.push(`${T(lang, 'Testes', 'Checks')}: ${tests.slice(0, 6).join('; ')}.`);
  if (onScreen.length) {
    const names = listJoin(onScreen.slice(0, 8), lang);
    facts.push(`${T(lang, 'Na Tela', 'On screen')}: ${names}${names.endsWith('…') ? '' : '.'}`);
  }
  if (facts.length) paragraphs.push(facts.join('\n'));
  if (notes.length) paragraphs.push(notes.slice(0, 6).map(n => `• ${n}`).join('\n'));
  if (!paragraphs.length) {
    paragraphs.push(T(lang, 'Escreva aqui o que aconteceu na última sessão…', 'Write here what happened last session…'));
  }
  const name = (opts.campaignName || '').trim();
  const title = name ? T(lang, `Anteriormente em ${name}…`, `Previously on ${name}…`) : T(lang, 'Anteriormente…', 'Previously…');
  const sub = opts.session != null ? `${T(lang, 'Sessão', 'Session')} ${opts.session}${opts.title ? ` — ${opts.title}` : ''}` : (opts.title || '');
  const text = (sub ? `${sub}\n\n` : '') + paragraphs.join('\n\n');
  return { title: title.slice(0, 200), text: text.slice(0, 5000) };
}
