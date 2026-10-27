// A regra única da Tela (V3, especificação §5.1), sem React:
//   "A Tela mostra a última coisa que você mandou. ✕ tira e volta para o fundo:
//    o combate, se houver; senão, a capa."
//
// Camadas: FUNDO (combate se houver; senão a capa; o mestre pode pôr o mapa do
// combate como fundo ou ◐ Escurecer) · FRENTE (a última coisa mandada; com
// combate ela cobre a TV e deixa a tarja do turno, ou espera o fim do combate
// quando focus === false) · TESTE (sobreposição).
//
// Serve ao palco CRU do mestre (`campaign.stage` no GET do mestre, com `label` e `ref`) e à
// projeção PÚBLICA (`/api/screen` → stage; GET da campanha do jogador → stage,
// com `title`, `caption`, `imageUrl`). Usada pela TV, por Jogar › Tela, pelo 📺
// do cabeçalho, pela Mesa do jogador e (V4) pela barra da mesa.
// Testada em tests/stage-now.test.js.

export const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export const RULE = [
  'A Tela mostra a última coisa que você mandou. ✕ tira e volta para o fundo: o combate, se houver; senão, a capa.',
  'The screen shows the last thing you sent. ✕ removes it and goes back to the background: combat if there is one, otherwise the cover.',
];
export const ruleText = (lang) => L(lang, RULE[0], RULE[1]);

const BGS = ['auto', 'map', 'dark'];
const KINDS = ['card', 'image', 'scene', 'text', 'recap'];

/** Palco com os padrões (aceita o cru, a projeção pública ou nada). */
export function normalizeStage(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const front = s.front && typeof s.front === 'object' && KINDS.includes(s.front.kind) ? s.front : null;
  return {
    bg: BGS.includes(s.bg) ? s.bg : 'auto',
    front,
    focus: s.focus !== false,
    prev: s.prev && typeof s.prev === 'object' ? s.prev : null,
    test: s.overlays?.test || null,
    at: s.at || null,
  };
}

/**
 * O que a Tela mostra agora.
 * @param {{stage?: object, combat?: {active?: boolean, round?: number}|null}} p
 * @returns {{ mode: 'dark'|'front'|'combat'|'map'|'rest',
 *             front: object|null,   // a frente na tela (mode 'front')
 *             over: boolean,        // a frente está por cima do combate (tarja do turno)
 *             waiting: object|null, // frente guardada para depois do combate
 *             held: object|null,    // frente guardada atrás da Tela escurecida
 *             bg: 'combat'|'map'|'cover'|'dark', round: number|null }}
 */
export function stageNow({ stage, combat } = {}) {
  const st = normalizeStage(stage);
  const fighting = !!combat?.active;
  const round = fighting ? (combat.round ?? null) : null;
  const bg = st.bg === 'dark' ? 'dark' : fighting ? 'combat' : st.bg === 'map' ? 'map' : 'cover';
  const base = { front: null, over: false, waiting: null, held: null, bg, round };
  if (st.bg === 'dark') return { ...base, mode: 'dark', held: st.front };
  if (st.front && (!fighting || st.focus)) return { ...base, mode: 'front', front: st.front, over: fighting };
  if (fighting) return { ...base, mode: 'combat', waiting: st.front };
  if (st.bg === 'map') return { ...base, mode: 'map' };
  return { ...base, mode: 'rest' };
}

const KIND_ICON = { card: '🗺', image: '🖼', scene: '🎭', text: '📝', recap: '📜' };
export const frontIcon = (front) => (front ? KIND_ICON[front.kind] || '📺' : '');

/**
 * Nome da frente. Mestre (palco cru): o `label` (o nome do cartão oculto também,
 * com "(só a imagem)"). Público: nunca o nome de um "só a imagem" — a legenda ou
 * "Imagem".
 */
export function frontLabel(front, lang = 'pt', { dm = false } = {}) {
  if (!front) return '';
  const k = front.kind;
  if (k === 'recap') return front.title || L(lang, 'Anteriormente em…', 'Previously on…');
  if (k === 'text') return firstLine(front.text) || L(lang, 'Texto', 'Text');
  if (k === 'image') {
    if (dm) {
      const name = front.label || L(lang, 'Imagem', 'Image');
      const ref = front.ref || {};
      if (ref.mapOf) return `${name} ${L(lang, '(mapa)', '(map)')}`;
      return front.hidden ? `${name} ${L(lang, '(só a imagem)', '(image only)')}` : name;
    }
    return front.caption || (front.map ? L(lang, 'Mapa', 'Map') : L(lang, 'Imagem', 'Image'));
  }
  return (dm ? front.label || front.title : front.title || front.label) || '';
}

function firstLine(text) {
  const s = String(text || '').trim().split('\n')[0].trim();
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

/** Texto do fundo: "⚔ Combate · rodada 2" / "🗺 Mapa do combate" / "🏠 Capa" / "◐ Escurecida". */
export function bgLabel(now, lang = 'pt') {
  if (now.bg === 'dark') return `◐ ${L(lang, 'Tela escurecida', 'Screen blacked out')}`;
  if (now.bg === 'combat') return `⚔ ${L(lang, 'Combate', 'Combat')}${now.round ? ` · ${L(lang, 'rodada', 'round')} ${now.round}` : ''}`;
  if (now.bg === 'map') return `🗺 ${L(lang, 'Mapa do combate', 'Combat map')}`;
  return `🏠 ${L(lang, 'Capa', 'Cover')}`;
}

/** Teste mostrado: "🎯 Percepção 3/4" (aceita o cartão do mestre ou o da Tela). */
export function testLabel(test) {
  if (!test) return '';
  const total = test.targets?.length ?? test.results?.length ?? 0;
  const done = test.targets
    ? test.targets.filter(t => t.response).length
    : (test.results || []).filter(r => r.total != null).length;
  return `🎯 ${test.label || ''}${total ? ` ${done}/${total}` : ''}`.trim();
}

/**
 * As linhas de "Na tela agora" (Jogar › Tela, 📺 do cabeçalho): uma por camada.
 * Cada linha: {layer:'front'|'bg'|'test', title, text, sub?, remove?, empty?}
 *   remove: 'back' (✕ tira a frente; por cima do combate, "⚔ Voltar para o
 *   combate") · 'bg' (✕ tira o mapa) · 'light' (◑ acende) · 'test'
 * `all`: sempre as 3 linhas (as vazias dizem "nada"), para nada mudar de lugar
 * quando a Tela muda sozinha (princípio 8: nada mexe debaixo do dedo).
 */
export function stageLines({ stage, combat, test, lang = 'pt', dm = true, all = false } = {}) {
  const now = stageNow({ stage, combat });
  const st = normalizeStage(stage);
  const lines = [];
  if (st.front) {
    let sub = null;
    if (now.mode === 'front' && now.over) sub = L(lang, 'por cima do ⚔ combate', 'over the ⚔ combat');
    else if (now.waiting) sub = L(lang, 'espera o fim do combate', 'waits for combat to end');
    else if (now.held) sub = L(lang, 'atrás da Tela escurecida', 'behind the blacked-out screen');
    lines.push({ layer: 'front', title: L(lang, 'Frente', 'Front'), text: `${frontIcon(st.front)} ${frontLabel(st.front, lang, { dm })}`,
      sub, remove: 'back', over: now.mode === 'front' && now.over });
  } else if (all) {
    lines.push({ layer: 'front', title: L(lang, 'Frente', 'Front'), text: L(lang, 'nada (aparece o fundo)', 'nothing (the background shows)'), empty: true, remove: null });
  }
  lines.push({
    layer: 'bg', title: L(lang, 'Fundo', 'Background'), text: bgLabel(now, lang),
    remove: now.bg === 'dark' ? 'light' : (st.bg === 'map' ? 'bg' : null),
  });
  const shown = test || st.test;
  if (shown) lines.push({ layer: 'test', title: L(lang, 'Teste', 'Check'), text: testLabel(shown), remove: 'test', checkId: shown.id });
  else if (all) lines.push({ layer: 'test', title: L(lang, 'Teste', 'Check'), text: L(lang, 'nenhum', 'none'), empty: true, remove: null });
  return lines;
}

/** "↶ Voltar para: Vale de Brumafria" — o nome do que o ↶ Desfazer traz de volta. */
export function undoLabel(stage, lang = 'pt') {
  const st = normalizeStage(stage);
  if (!st.prev) return '';
  const p = st.prev;
  if (p.bg === 'dark') return L(lang, '↶ Voltar para: Tela escurecida', '↶ Back to: blacked out');
  if (p.front) return `${L(lang, '↶ Voltar para', '↶ Back to')}: ${frontLabel(p.front, lang, { dm: true })}`;
  return `${L(lang, '↶ Voltar para', '↶ Back to')}: ${p.bg === 'map' ? L(lang, 'mapa do combate', 'combat map') : L(lang, 'o fundo', 'the background')}`;
}

/** Uma linha curta do que está na Tela (📺 do cabeçalho, avisos). */
export function screenLine({ stage, combat, lang = 'pt', dm = true } = {}) {
  const now = stageNow({ stage, combat });
  if (now.mode === 'dark') return `◐ ${L(lang, 'Tela escurecida', 'Screen blacked out')}`;
  if (now.mode === 'front') {
    const name = frontLabel(now.front, lang, { dm });
    return now.over ? `${name} · ${L(lang, 'por cima do combate', 'over combat')}` : name;
  }
  if (now.mode === 'combat') return bgLabel(now, lang);
  if (now.mode === 'map') return bgLabel(now, lang);
  return L(lang, 'capa', 'cover');
}

/**
 * "Na tela agora" da Mesa do jogador (a mesma regra da TV, D7). Recebe a
 * projeção pública. → null (repouso: nada a mostrar) ou
 * {kind, eyebrow, title, text, imageUrl, caption, entryId?, entryKind?, partial?}
 */
export function playerScreen({ stage, combat, lang = 'pt' } = {}) {
  const now = stageNow({ stage, combat });
  if (now.mode === 'dark') return { kind: 'dark', title: L(lang, 'A Tela está escurecida', 'The screen is blacked out') };
  if (now.mode === 'combat') return { kind: 'combat', title: `⚔ ${L(lang, 'Combate', 'Combat')}${now.round ? ` · ${L(lang, 'rodada', 'round')} ${now.round}` : ''}` };
  if (now.mode === 'map') return { kind: 'map', title: `🗺 ${L(lang, 'Mapa do combate', 'Combat map')}` };
  if (now.mode !== 'front') return null;
  const f = now.front;
  const over = now.over ? `⚔ ${L(lang, 'Combate', 'Combat')}${now.round ? ` · ${L(lang, 'rodada', 'round')} ${now.round}` : ''}` : null;
  if (f.kind === 'image') {
    // "Só a imagem": nunca o nome, nem "Ver no Mundo".
    return { kind: 'image', over, imageUrl: f.imageUrl || null, caption: f.caption || '', title: '' };
  }
  if (f.kind === 'card') {
    return { kind: 'card', over, title: f.title || '', text: f.text || '', imageUrl: f.imageUrl || null,
      eyebrow: (lang === 'en' ? f.kindLabelEn || f.kindLabel : f.kindLabel) || '', entryId: f.entryId ?? null,
      entryKind: f.entryKind || null, partial: !!f.partial };
  }
  if (f.kind === 'scene') return { kind: 'scene', over, eyebrow: L(lang, 'Cena', 'Scene'), title: f.title || '', text: f.text || '', imageUrl: f.imageUrl || null };
  if (f.kind === 'recap') return { kind: 'recap', over, eyebrow: L(lang, 'Anteriormente…', 'Previously…'), title: f.title || '', text: f.text || '' };
  return { kind: 'text', over, title: '', text: f.text || '' };
}

/**
 * URL (relativa à API) da imagem da frente para o MESTRE (palco cru):
 * cartão → a imagem do Mundo; "só a imagem", sala e cena → a imagem da frente.
 */
export function dmFrontImage(campaignId, front) {
  if (!front) return null;
  if (front.kind === 'card') return front.ver ? `/api/world/${front.entryId}/image?v=${front.ver}` : null;
  if ((front.kind === 'image' || (front.kind === 'scene' && front.image)) && front.ver) {
    return `/api/campaigns/${campaignId}/stage-image?v=${front.ver}`;
  }
  return null;
}

/** O mais novo entre o palco do GET da campanha e o que voltou do último POST. */
export function newestStage(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const ta = Date.parse(a.at || '') || 0;
  const tb = Date.parse(b.at || '') || 0;
  return tb > ta ? b : a;
}

/**
 * Como o 📺 se comporta para um cartão do Mundo (§4.8):
 *   'show'    revelado ou conhecido de nome → vai na hora
 *   'image'   oculto com imagem → pergunta "Só a imagem" / "Revelar e mostrar"
 *   'name'    oculto sem imagem → pergunta "Só o nome" / "Revelar e mostrar"
 *   'private' documento só para alguns jogadores → botão apagado com o motivo
 */
export function cardShowMode(entry) {
  if (!entry) return 'show';
  if (entry.kind === 'handout' && Array.isArray(entry.data?.recipients)) return 'private';
  if ((entry.visibility || 'hidden') !== 'hidden') return 'show';
  return entry.imageVer || entry.imageUrl ? 'image' : 'name';
}

function recipientNames(entry, members, lang) {
  const ids = Array.isArray(entry?.data?.recipients) ? entry.data.recipients : [];
  const names = ids.map(id => {
    const m = (members || []).find(x => x.id === id);
    return m ? (m.user?.displayName || m.character?.name || m.displayName || '') : '';
  }).filter(Boolean);
  return names.length ? names.join(', ') : L(lang, 'alguns jogadores', 'some players');
}

/** "Documento só para Ana: não vai à Tela." (nomes pelas vagas da campanha). */
export function privateReason(entry, members, lang = 'pt') {
  const who = recipientNames(entry, members, lang);
  return L(lang, `Documento só para ${who}: não vai à Tela.`, `Handout only for ${who}: it can't go on screen.`);
}

/** A versão curta, para as linhas estreitas: "Só para Ana · não vai à Tela". */
export function privateShort(entry, members, lang = 'pt') {
  const who = recipientNames(entry, members, lang);
  return L(lang, `Só para ${who} · não vai à Tela`, `Only for ${who} · not on screen`);
}
