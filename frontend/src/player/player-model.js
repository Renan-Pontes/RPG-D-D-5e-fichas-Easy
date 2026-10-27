// Lógica pura da visão do jogador e do telão (WP5). Sem React; testável em node.
//
// - quando mostrar o toast "O mestre revelou…" (cartão do telão ou entrada nova);
// - selo "Novo!" (revealedAt > seenAt);
// - filtro do Atlas do jogador e rótulos que só o jogador/telão usam;
// (tipos, menções, linha do tempo e "aparece em" vêm de src/world/world-model.js)
// - linha do personagem traduzida para o telão;
// - a faixa do combate da Mesa e a vez do jogador na ficha (V13).
// Nada aqui puxa o SRD nem a progressão (a Tela importa este arquivo): a linha
// do personagem usa a tabela leve de nomes (src/screen/tv-names.json, gerada por
// scripts/tv-names.mjs a partir do tName).
import TV_NAMES from '../screen/tv-names.json' with { type: 'json' };
import { isNewFor } from '../world/world-model.js';

export const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

export const HANDOUT_STYLES = ['scroll', 'letter', 'wanted', 'note'];
export const handoutStyle = (s) => (HANDOUT_STYLES.includes(s) ? s : 'scroll');

// ------------------------------------------------------------------ datas
const ts = (iso) => {
  if (!iso) return NaN;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : NaN;
};

/** Entrada nova para o jogador: revelada depois da última visita à aba Mundo. */
export const isNewEntry = (entry, seenAt) => isNewFor(entry, seenAt);

export function newEntryIds(entries, seenAt) {
  return new Set((entries || []).filter(e => isNewEntry(e, seenAt)).map(e => e.id));
}

// ------------------------------------------------------------------ toast
/** Identidade de um cartão do telão (muda a cada "Mostrar"). */
export function cardKey(card) {
  if (!card || !card.type) return '';
  return `${card.type}:${card.entryId ?? ''}:${card.at ?? ''}`;
}

/**
 * Decide se o celular do jogador mostra o toast para o cartão atual.
 * Só cartões de entrada do Mundo, que mudaram desde o último visto e que são
 * recentes (o mestre acabou de mostrar) — abrir o app horas depois não toasta.
 */
export function shouldToastCard(card, lastKey, now = Date.now(), maxAgeMs = 90_000) {
  if (!card || card.type !== 'entry' || !card.title) return false;
  const key = cardKey(card);
  if (!key || key === lastKey) return false;
  const at = ts(card.at);
  if (!Number.isFinite(at)) return false;
  return now - at <= maxAgeMs;
}

/**
 * Entradas reveladas desde a última checagem (para o toast sem telão).
 * `sinceIso` = instante da última checagem; devolve as mais novas primeiro.
 */
export function revealedSince(entries, sinceIso) {
  const s = ts(sinceIso);
  return (entries || [])
    .filter(e => {
      const r = ts(e.revealedAt);
      return Number.isFinite(r) && (!Number.isFinite(s) || r > s);
    })
    .sort((a, b) => ts(b.revealedAt) - ts(a.revealedAt));
}

/** Texto do toast: "O mestre revelou: Irmã Velna" / "… e mais 2". */
export function toastTitle(names, lang = 'pt') {
  const list = (names || []).filter(Boolean);
  if (!list.length) return L(lang, 'O mestre revelou algo novo', 'The DM revealed something new');
  const extra = list.length - 1;
  const head = L(lang, `O mestre revelou: ${list[0]}`, `The DM revealed: ${list[0]}`);
  if (extra <= 0) return head;
  return head + L(lang, ` e mais ${extra}`, ` and ${extra} more`);
}

// ------------------------------------------------------------------ texto
/** Parágrafos (linha em branco separa). */
export function paragraphs(text) {
  return String(text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
}

// ------------------------------------------------------------------ mundo
/** Filtro + ordem do Atlas do jogador. Novos primeiro, depois a ordem do mestre. */
export function atlasEntries(entries, { kind = 'all', newIds = new Set(), excludeHandouts = true } = {}) {
  return (entries || [])
    .filter(e => (kind === 'all' ? !(excludeHandouts && e.kind === 'handout') : e.kind === kind))
    .slice()
    .sort((a, b) => {
      const an = newIds.has(a.id) ? 0 : 1;
      const bn = newIds.has(b.id) ? 0 : 1;
      if (an !== bn) return an - bn;
      return (a.sort ?? 0) - (b.sort ?? 0) || String(a.name).localeCompare(String(b.name));
    });
}

export function kindCounts(entries) {
  const out = {};
  for (const e of entries || []) out[e.kind] = (out[e.kind] || 0) + 1;
  return out;
}

export const secretSessionLabel = (s, lang = 'pt') => (s?.session
  ? L(lang, `Descoberto na sessão ${s.session}`, `Discovered in session ${s.session}`)
  : L(lang, 'Descoberto', 'Discovered'));

// ------------------------------------------------------------------ telão
/** Nome de espécie ou classe pela tabela leve (o mesmo do tName; o id se não houver). */
export function tvName(kind, id, lang = 'pt') {
  const row = TV_NAMES[kind]?.[id];
  return row ? row[lang === 'pt' ? 0 : 1] : id;
}

/** "Elfo da Floresta · Druida 2 / Guerreiro 1" (dados públicos do telão). */
export function charLine(c, lang = 'pt') {
  if (!c) return '';
  const classes = Array.isArray(c.classes) && c.classes.length
    ? c.classes
    : (c.className ? [{ id: c.className, level: c.level || 1 }] : []);
  const cls = classes.map(e => `${tvName('class', e.id, lang)} ${e.level}`).join(' / ');
  return [c.race && tvName('race', c.race, lang), cls].filter(Boolean).join(' · ');
}

// "Caído" é a condição (prone, CONDITIONS.prone): quem chegou a 0 PV é "Derrotado"
// (o mesmo texto para o monstro e para o PJ na ordem da TV).
const HEALTH = {
  unhurt: ['Ileso', 'Unhurt'], hurt: ['Ferido', 'Hurt'],
  bloodied: ['Sangrando', 'Bloodied'], down: ['Derrotado', 'Down'],
};
export const healthLabel = (band, lang = 'pt') => (HEALTH[band] || HEALTH.unhurt)[lang === 'pt' ? 0 : 1];

/** Modo do telão: combate > cartão > recap > repouso (capa). */
export function screenMode({ combat, card } = {}) {
  if (combat?.active) return 'combat';
  if (card?.type === 'recap') return 'recap';
  if (card?.type === 'entry' || card?.type === 'scene') return 'card';
  return 'rest';
}

/** URL absoluta a partir do caminho '/api/…' que o backend devolve. */
export function absUrl(base, url) {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${base || ''}${url}`;
}

// ------------------------------------------------------------------ combate do jogador (V13)
/**
 * A faixa do combate da Mesa, a partir do pulso do jogador (`pulse.combat`, especificação
 * §8.3): `{mine, title, sub}` ou null fora do combate andando. Quem age vem primeiro (o
 * nome de monstro é longo e a 320 px não cabe junto da rodada numa linha só):
 *   "Vez de Goblin #2" / "Rodada 2 · depois: você"; na vez dele, "SUA VEZ" / "Rodada 2 · depois: Elarion".
 */
export function combatStrip(combat, lang = 'pt') {
  if (!combat?.active) return null;
  const mine = !!combat.isMine;
  const who = combat.turnName || '';
  const title = mine ? L(lang, 'SUA VEZ', 'YOUR TURN')
    : who ? L(lang, `Vez de ${who}`, `${who}'s turn`) : L(lang, 'Combate', 'Combat');
  const round = combat.round != null ? L(lang, `Rodada ${combat.round}`, `Round ${combat.round}`) : '';
  // na vez dele, "depois: você" só se for o único de pé (não diz nada)
  const nextName = combat.nextIsMine ? (mine ? '' : L(lang, 'você', 'you')) : (combat.nextName || '');
  const next = nextName ? L(lang, `depois: ${nextName}`, `next: ${nextName}`) : '';
  return { mine, title, sub: [round, next].filter(Boolean).join(' · ') };
}

/**
 * A vez acabou de chegar ao jogador (a Mesa vibra 1 vez). `prev` = o combate do pulso
 * anterior; `undefined` = ainda não viu nenhum (abrir a Mesa na vez dele não vibra).
 */
export function turnJustStarted(prev, next) {
  if (prev === undefined || !next?.active || !next.isMine) return false;
  return !(prev?.active && prev.isMine);
}

/** O combatente do personagem no combate completo e se a vez é dele (painel da ficha). */
export function myCombatTurn(combat, charId) {
  if (!combat?.active || charId == null) return { me: null, isMyTurn: false };
  const list = combat.combatants || [];
  const i = list.findIndex(c => c?.type === 'pc' && c.character_id != null && String(c.character_id) === String(charId));
  return { me: i >= 0 ? list[i] : null, isMyTurn: i >= 0 && i === combat.turnIndex };
}
