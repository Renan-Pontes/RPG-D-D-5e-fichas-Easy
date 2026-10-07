// "Mundo vivo" do jogador — lógica pura (sem React; testável em node).
//
// - Ecos: reações de personagem (😱 ❤️ 🤔 ⚔️) e a estrela "quero voltar aqui",
//   com atualização otimista da lista leve (myReactions / myFavorite /
//   reactionCounts) e reversão se o servidor recusar.
// - Registro de leitura: no máximo 1 aviso por minuto por cartão.
// - Névoa do desconhecido: silhuetas decorativas (sem contar nada) e os
//   "buracos" de luz no mapa em volta dos marcadores revelados.
// Tudo é desligável pelo mestre (dm_settings.immersion, padrão ligado).

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

/** Reações de personagem. `kind` é o que vai para o servidor. */
export const REACTIONS = [
  { kind: 'shiver', icon: '😱', pt: 'Arrepio', en: 'A chill', ptFelt: 'sentiu um arrepio', enFelt: 'felt a chill' },
  { kind: 'love', icon: '❤️', pt: 'Afeto', en: 'Fondness', ptFelt: 'sentiu afeto', enFelt: 'felt fondness' },
  { kind: 'doubt', icon: '🤔', pt: 'Desconfiança', en: 'Suspicion', ptFelt: 'desconfiou', enFelt: 'grew suspicious' },
  { kind: 'fight', icon: '⚔️', pt: 'Quero enfrentar', en: 'I want to face it', ptFelt: 'quer enfrentar', enFelt: 'wants to face it' },
];
export const REACTION_KINDS = REACTIONS.map(r => r.kind);
/** A estrela é guardada como mais um "kind" de reação no servidor. */
export const FAVORITE_KIND = 'star';

export const reactionMeta = (kind) => REACTIONS.find(r => r.kind === kind) || null;

/**
 * Mundo vivo ligado? O servidor manda `immersion` (de dm_settings.immersion)
 * na campanha e na lista do Mundo; padrão true.
 */
export function immersionOn(campaign) {
  const c = campaign || {};
  const pools = [c, c.dmSettings, c.dm_settings];
  for (const p of pools) {
    if (p && typeof p === 'object' && typeof p.immersion === 'boolean') return p.immersion;
  }
  return true;
}

/** Só dá para reagir ao que a mesa já viu (revelado ou "conhecido de nome"). */
export function canReact(entry) {
  return !!entry && (entry.visibility === 'revealed' || entry.visibility === 'partial');
}

const myList = (entry) => (Array.isArray(entry?.myReactions) ? entry.myReactions.filter(k => REACTION_KINDS.includes(k)) : []);
export const hasReacted = (entry, kind) => myList(entry).includes(kind);
export const isFavorite = (entry) => !!entry?.myFavorite;

/**
 * Aplica (otimista) a troca de uma reação no cartão leve. Devolve um NOVO
 * objeto; `on` diz se a reação ficou marcada. Contagens nunca ficam < 0.
 */
export function toggleReaction(entry, kind) {
  if (!entry || !REACTION_KINDS.includes(kind)) return { entry, on: false };
  const mine = myList(entry);
  const on = !mine.includes(kind);
  const counts = { ...(entry.reactionCounts || {}) };
  const cur = Math.max(0, Number(counts[kind]) || 0);
  counts[kind] = on ? cur + 1 : Math.max(0, cur - 1);
  if (!counts[kind]) delete counts[kind];
  return {
    entry: { ...entry, myReactions: on ? [...mine, kind] : mine.filter(k => k !== kind), reactionCounts: counts },
    on,
  };
}

export function toggleFavorite(entry) {
  if (!entry) return { entry, on: false };
  const on = !entry.myFavorite;
  return { entry: { ...entry, myFavorite: on }, on };
}

/** Troca um cartão na lista pelo id (para atualização otimista). */
export function replaceEntry(list, next) {
  return (list || []).map(e => (e.id === next.id ? next : e));
}

/**
 * Junta a lista vinda do servidor com as mudanças otimistas ainda pendentes
 * (`pending`: Map id → {myReactions?, myFavorite?, reactionCounts?}), para o
 * poll de 10 s não "piscar" a reação recém-tocada.
 */
export function mergePending(list, pending) {
  if (!pending || !pending.size) return list || [];
  return (list || []).map(e => (pending.has(e.id) ? { ...e, ...pending.get(e.id) } : e));
}

/** Filtro "Quero voltar": só os cartões com estrela. */
export function favoriteEntries(entries) {
  return (entries || []).filter(isFavorite);
}

/**
 * Contagens agregadas para mostrar no cartão (sem nomes): [{kind, icon, n, label}]
 * na ordem fixa das reações, só as que têm alguém.
 */
export function echoChips(entry, lang = 'pt') {
  const counts = entry?.reactionCounts || {};
  return REACTIONS
    .map(r => ({ kind: r.kind, icon: r.icon, n: Math.max(0, Number(counts[r.kind]) || 0), label: L(lang, r.pt, r.en) }))
    .filter(r => r.n > 0);
}

/** Frase do cronista para as reações da mesa (sem números, sem nomes). */
export function echoLine(entry, lang = 'pt') {
  const chips = echoChips(entry, lang);
  if (!chips.length) return '';
  const total = chips.reduce((s, c) => s + c.n, 0);
  return total === 1
    ? L(lang, 'Alguém à mesa já sentiu algo por isto.', 'Someone at the table already felt something about this.')
    : L(lang, 'A mesa já sussurrou sobre isto.', 'The table has whispered about this.');
}

// ------------------------------------------------------------------ leitura
export const VIEW_THROTTLE_MS = 60_000;

/**
 * Decide se manda o registro de leitura agora. `last`: Map id → ms do último
 * envio. Marca o envio no próprio Map quando devolve true.
 */
export function shouldSendView(entry, last, now = Date.now(), throttleMs = VIEW_THROTTLE_MS) {
  if (!canReact(entry) || !last) return false;
  const prev = last.get(entry.id);
  if (Number.isFinite(prev) && now - prev < throttleMs) return false;
  last.set(entry.id, now);
  return true;
}

// ------------------------------------------------------------------ névoa
/** Hash determinístico pequeno (FNV-1a) para escolhas estáveis por campanha. */
export function seedOf(value) {
  let h = 0x811c9dc5;
  const s = String(value ?? '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

const FOG_LINES = [
  ['Há lugares que vocês ainda não conhecem…', 'There are places you do not know yet…'],
  ['Além do que já foi visto, a névoa ainda guarda nomes e rostos…', 'Beyond what you have seen, the mist still keeps names and faces…'],
  ['Nem todo caminho deste mundo foi trilhado. Ainda.', 'Not every road in this world has been walked. Yet.'],
  ['Os mapas dos cronistas ainda têm margens em branco…', 'The chroniclers\' maps still have blank margins…'],
];

/** Frase da névoa (fixa por campanha, para não mudar a cada visita). */
export function fogLine(campaignId, lang = 'pt') {
  const row = FOG_LINES[seedOf(`fog:${campaignId}`) % FOG_LINES.length];
  return L(lang, row[0], row[1]);
}

/**
 * Sussurro opcional sobre "quanto falta", só se o mestre permitir (o servidor
 * manda `hint`: 'none' | 'few' | 'some' | 'many'). Nunca um número.
 */
export function fogHint(hint, lang = 'pt') {
  if (hint === 'none') return L(lang, 'Ao que parece, vocês já ouviram falar de tudo o que o mestre preparou… por enquanto.', 'It seems you have heard of everything the DM has prepared… for now.');
  if (hint === 'few') return L(lang, 'Dizem que restam poucos segredos por aqui.', 'They say few secrets remain around here.');
  if (hint === 'some') return L(lang, 'Ainda há muito a descobrir.', 'There is still much to discover.');
  if (hint === 'many') return L(lang, 'O mundo mal começou a se mostrar.', 'The world has barely begun to show itself.');
  return '';
}

const SILHOUETTE_KINDS = ['place', 'npc', 'faction', 'item', 'lore'];
/**
 * Silhuetas decorativas para o Atlas: sempre 3, tipos escolhidos pela semente
 * da campanha — não dizem quantos cartões ocultos existem nem de que tipo.
 */
export function fogSilhouettes(campaignId, n = 3) {
  const s = seedOf(`sil:${campaignId}`);
  const out = [];
  for (let i = 0; i < n; i++) out.push({ key: i, kind: SILHOUETTE_KINDS[(s + i * 2) % SILHOUETTE_KINDS.length], tilt: ((s >> (i * 3)) % 7) - 3 });
  return out;
}

/**
 * Clareiras de luz no mapa: um círculo por marcador que leva a algo que o
 * jogador conhece. Coordenadas 0–100 (o SVG usa viewBox 0 0 100 100).
 */
export function fogClearings(pins, known) {
  const out = [];
  for (const p of pins || []) {
    if (!p || p.entryId == null) continue;
    if (known && typeof known.has === 'function' && !known.has(p.entryId)) continue;
    const x = Math.max(0, Math.min(1, Number(p.x ?? 0.5))) * 100;
    const y = Math.max(0, Math.min(1, Number(p.y ?? 0.5))) * 100;
    out.push({ id: p.id ?? `${x}:${y}`, x, y, r: 14 });
  }
  return out;
}
