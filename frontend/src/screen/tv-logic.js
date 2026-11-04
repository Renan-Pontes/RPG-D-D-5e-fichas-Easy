// Lógica pura da Tela (sem React) — testada em tests/tv-logic.test.js.

const fold = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[\s.…:;,!?"'“”«»—–-]+/g, ' ').trim();

/**
 * Subtítulo do "Anteriormente em…". A Tela já mostra "ANTERIORMENTE EM" +
 * o nome da campanha; um título de rascunho que só repete isso
 * ("Anteriormente em Brumas…", "Previously on X", o próprio nome) some.
 */
export function recapSubtitle(title, campaignName) {
  const raw = String(title || '').trim();
  if (!raw) return '';
  const f = fold(raw);
  const name = fold(campaignName);
  if (name && f === name) return '';
  const rest = f.replace(/^(anteriormente em|anteriormente|previously on|previously)\b/, '').trim();
  if (rest !== f && (!rest || (name && rest === name))) return '';
  return raw;
}

/** Erro do /api/screen/<token> que significa "esse link não existe mais". */
export function isDeadScreenLink(err) {
  const s = err && (err.status ?? err.response?.status);
  return s === 404 || s === 410;
}

/**
 * Modo de desenho da TV a partir de stageNow() (src/stage/stage-now.js):
 * 'dark' | 'combat' | 'map' | 'rest' | a frente ('card' | 'recap' | 'scene' | 'image' | 'text').
 */
export function tvMode(now) {
  if (!now) return 'rest';
  if (now.mode !== 'front') return now.mode;
  const k = now.front?.kind;
  return ['card', 'recap', 'scene', 'image', 'text'].includes(k) ? k : 'rest';
}

// ------------------------------------------------------------------ onda 3 (E2.2/E2.3): imagens grandes

export const WIDE_RATIO = 1.3;        // a partir daqui a imagem é "larga" (mapas, paisagens)
export const WIDE_TEXT_MAX = 420;     // texto que ainda cabe na faixa por cima da imagem larga

/**
 * Como a Tela desenha o cartão do Mundo (E2.2): a imagem grande e INTEIRA (contain),
 * nunca cortada.
 *   'art'  sem imagem própria: a arte padrão do tipo ao lado do texto (como antes, com o grupo);
 *   'full' imagem e nenhum texto: só a imagem na tela toda, com o nome por cima, embaixo;
 *   'wide' imagem larga (≥ 1,3:1, os mapas) e texto curto: a imagem na largura toda, o nome
 *          e o texto numa faixa por cima, embaixo;
 *   'side' o resto (imagem em pé, ou texto longo): a imagem à esquerda na altura toda e o texto
 *          ao lado. Enquanto a imagem carrega (`ratio` null), 'side'.
 */
export function cardLayout({ image = false, ratio = null, text = '' } = {}) {
  if (!image) return 'art';
  const len = String(text || '').trim().length;
  if (!len) return 'full';
  if (ratio != null && ratio >= WIDE_RATIO && len <= WIDE_TEXT_MAX) return 'wide';
  return 'side';
}

/**
 * A cena na Tela (E2.3): 'panel' sem imagem (título grande e o texto de ler num painel do
 * app, nada de capa borrada com uma linha) · 'wide' imagem larga em cima, inteira, e o texto
 * embaixo · 'side' imagem em pé à esquerda (40%) e o texto ao lado.
 */
export function sceneLayout({ image = false, ratio = null } = {}) {
  if (!image) return 'panel';
  return ratio != null && ratio >= WIDE_RATIO ? 'wide' : 'side';
}

// ------------------------------------------------------------------ onda 3 (E2.1): onde ficam as Últimas rolagens

export const HIST_MAX = 5;      // as 5 mais novas
export const HIST_MAP_MAX = 3;  // por cima do mapa, compacta

/**
 * Onde a Tela põe as Últimas rolagens sem cobrir o texto da frente, a ordem do combate nem
 * os tokens do mapa (antes ficavam sempre no canto de baixo à esquerda, por cima de tudo):
 *   'side'   combate: no pé da coluna da iniciativa, com as linhas que cabem embaixo da
 *            ordem (`room`, medido na TV; null antes da 1ª medida = tenta as 5);
 *   'map'    combate em que a ordem enche a coluna (`room` 0): no canto do mapa com menos
 *            tokens (`corner`, quietCorner), compacta (3 linhas) e translúcida;
 *   'corner' repouso sem texto de ler e cartão sem imagem própria: o canto de baixo à
 *            esquerda, até 5 linhas (a capa e o texto do cartão ficam no meio e à direita; o
 *            rodapé do grupo abre espaço);
 *   'line'   com texto ou imagem na largura toda (o texto de ler do repouso, cartão com
 *            imagem, cena, texto, só a imagem, recap, o mapa sem combate): uma linha só
 *            embaixo, as mais novas lado a lado, e o resto SOBE para dar lugar a ela
 *            (`reserve: 'bottom'`), como a faixa do teste; no recap ela fica na tarja preta
 *            de baixo, que já é vazia.
 * → { spot, max, reserve: '' | 'bottom', corner? }
 */
export function histPlacement({ mode, image = false, read = false, room = null, combat = null } = {}) {
  if (mode === 'combat') {
    if (room == null) return { spot: 'side', max: HIST_MAX, reserve: '' };
    return room >= 1
      ? { spot: 'side', max: Math.min(HIST_MAX, room), reserve: '' }
      : { spot: 'map', max: HIST_MAP_MAX, reserve: '', corner: quietCorner(combat) };
  }
  if ((mode === 'rest' && !read) || (mode === 'card' && !image)) return { spot: 'corner', max: HIST_MAX, reserve: '' };
  return { spot: 'line', max: HIST_MAX, reserve: mode === 'recap' ? '' : 'bottom' };
}

const MAP_W = 1200;   // o tamanho padrão do mapa do combate (CombatGrid), sem width_px/height_px
const MAP_H = 800;
const CORNERS = ['bl', 'br', 'tl', 'tr'];

/**
 * O canto do mapa do combate com menos tokens: 'bl' | 'br' | 'tl' | 'tr'. Conta quem está
 * (posição em px do mapa) na região do canto que a caixa compacta cobre, ~45% da largura ×
 * 40% da altura; no empate fica o primeiro de bl, br, tl, tr (embaixo à esquerda, como antes).
 */
export function quietCorner(combat, { w = 0.45, h = 0.4 } = {}) {
  const map = combat?.map || {};
  const W = map.width_px || MAP_W;
  const H = map.height_px || MAP_H;
  const count = { bl: 0, br: 0, tl: 0, tr: 0 };
  for (const c of combat?.combatants || []) {
    if (!c) continue;
    const x = (c.position?.x ?? 50) / W;
    const y = (c.position?.y ?? 50) / H;
    const col = x <= w ? 'l' : x >= 1 - w ? 'r' : '';
    const row = y >= 1 - h ? 'b' : y <= h ? 't' : '';
    if (col && row) count[row + col] += 1;
  }
  return CORNERS.reduce((best, k) => (count[k] < count[best] ? k : best), CORNERS[0]);
}

/**
 * Quantas linhas das Últimas rolagens cabem em `free` px (o que sobra embaixo da ordem de
 * iniciativa), com `head` px de título e moldura e `pitch` px por linha (com o espaço entre
 * elas). Medido na própria TV: vale para qualquer tamanho e fonte.
 */
export function histLinesFit(free, head, pitch, max = HIST_MAX) {
  if (!(free > 0) || !(pitch > 0)) return 0;
  return Math.max(0, Math.min(max, Math.floor((free - Math.max(0, head || 0)) / pitch)));
}

// ------------------------------------------------------------------ V9: a TV em 16:9

/** Idioma da Tela: o da campanha (o do mestre, `lang` no /api/screen); sem ele, o do aparelho. */
export function tvLang(campaignLang, deviceLang) {
  if (campaignLang === 'pt' || campaignLang === 'en') return campaignLang;
  return deviceLang === 'en' ? 'en' : 'pt';
}

/**
 * Tamanho do texto pelo comprimento (a TV não rola: texto longo encolhe).
 * `steps` = [médio, longo, muito longo] em caracteres → '' | 'is-medium' | 'is-long' | 'is-xlong'.
 */
export function lengthClass(text, [medium, long, xlong = Infinity] = []) {
  const n = String(text || '').length;
  if (n > xlong) return 'is-xlong';
  if (n > long) return 'is-long';
  if (n > medium) return 'is-medium';
  return '';
}

/** Quem age agora (nome) e a rodada; null fora de combate. */
export function turnNow(combat) {
  if (!combat?.active) return null;
  const list = combat.combatants || [];
  const cur = list[combat.turnIndex ?? 0] || null;
  return { round: combat.round ?? 1, id: cur?.id ?? null, name: cur?.name || '' };
}

/**
 * Coluna da direita do combate (T1): a ordem de iniciativa — ✓ já agiu nesta
 * rodada, ▶ a vez, o resto em branco. PJ com PV (`party`: o mestre deixa o PV do
 * grupo na Tela; senão, a faixa de saúde como os monstros), monstro só com a
 * faixa. Até `max` linhas: a janela anda com a vez (a da vez sempre à vista, com
 * 2 de antes) e o que fica de fora vira "+N".
 * `order: false` (o mestre tirou a "Ordem de iniciativa" da Tela): PJs primeiro,
 * depois os monstros, sem ✓/▶ (só quem age continua destacado).
 * PJ a 0 PV que não morreu é `fallen` ("Morrendo"; "Estável" com `stable`, depois de 3
 * sucessos), sem riscar; riscado (`down`) só quem morreu: monstro/NPC derrotado e PJ com 3
 * falhas (onda 3, E1.5a). Nunca "Caído": é a condição (prone), que aparece na mesma lista.
 * → { rows:[{id, name, kind, state:'acted'|'now'|'todo', mark, down, fallen, stable, hp|null, band|null, conditions}], more }
 */
export function initiativeRows(combat, { max = 10, party = true, order = true } = {}) {
  const all = (combat?.combatants || []).filter(Boolean);
  const active = !!combat?.active;
  const idx = active ? (combat.turnIndex ?? 0) : -1;
  const nowId = idx >= 0 ? all[idx]?.id : undefined;
  const list = order ? all : [...all.filter(c => c.type === 'pc'), ...all.filter(c => c.type !== 'pc')];
  const at = order ? idx : list.findIndex(c => nowId !== undefined && c.id === nowId);
  const rows = list.map((c, i) => {
    const pc = c.type === 'pc';
    const state = i === at ? 'now' : (order && active && i < idx ? 'acted' : 'todo');
    const showHp = pc && party && c.current_hp != null;
    const fallen = pc && !c.defeated && ((c.current_hp != null && c.current_hp <= 0) || (c.current_hp == null && c.health === 'down'));
    const stable = fallen && Array.isArray(c.conditions) && c.conditions.includes('stable');
    return {
      id: c.id,
      name: c.name || '?',
      kind: pc ? 'pc' : 'monster',
      state,
      mark: !order ? '' : state === 'now' ? '▶' : state === 'acted' ? '✓' : '',
      down: pc ? !!c.defeated : (!!c.defeated || c.health === 'down'),
      fallen,
      stable,
      hp: showHp ? { cur: c.current_hp, max: c.stats?.max_hp ?? null, temp: c.temp_hp || 0 } : null,
      band: showHp ? null : (fallen ? (stable ? 'stable' : 'fallen') : c.health || 'unhurt'),
      conditions: Array.isArray(c.conditions) ? c.conditions : [],
    };
  });
  if (rows.length <= max) return { rows, more: 0 };
  // Na ordem, a janela anda com a vez (2 de antes à vista); sem a ordem, os PJs ficam
  // no topo enquanto quem age couber nas `max` linhas.
  const want = at < 0 ? 0 : order ? at - 2 : at - (max - 1);
  const start = Math.max(0, Math.min(want, rows.length - max));
  return { rows: rows.slice(start, start + max), more: rows.length - max };
}

/** Grupo no repouso: até `max` cartões numa linha (os outros viram "+N"). */
export function partyRow(members, max = 6) {
  const list = (members || []).filter(m => m && m.character && m.role !== 'dm');
  return { shown: list.slice(0, max), more: Math.max(0, list.length - max) };
}

// ------------------------------------------------------------------ V9: nada cortado

/**
 * Nome com o número do monstro ("Esqueleto Guardião da Cripta #2") → { base, num }.
 * Na TV o número fica sempre à vista e as reticências, se precisar, vão só no nome
 * (os três esqueletos não viram três linhas iguais). Sem " #N" → num ''.
 */
export function splitNumbered(name) {
  const s = String(name ?? '').trim();
  const m = /^(.*\S)\s*(#\d+)$/.exec(s);
  return m ? { base: m[1], num: m[2] } : { base: s, num: '' };
}

/** Condições à vista: as `max` primeiras e quantas ficaram de fora ("+N"); nenhuma some sem aviso. */
export function conditionsShown(list, max = 2) {
  const all = (Array.isArray(list) ? list : []).filter(Boolean);
  if (all.length <= max) return { shown: all, more: 0, rest: [] };
  const keep = Math.max(0, max);
  return { shown: all.slice(0, keep), more: all.length - keep, rest: all.slice(keep) };
}

/**
 * Encaixe medido do texto da TV: a maior escala da letra (de 1 até `min`, em passos de
 * `step`) com que `fits(escala)` é verdade, ou null se nem a menor cabe. `fits` mede o
 * DOM (src/screen/tv-fit.js); aqui é pura. Busca binária (a letra menor sempre cabe
 * melhor): ~4 medidas em vez de uma por passo.
 */
export function bestScale(fits, { min = 0.5, step = 0.05 } = {}) {
  const n = Math.max(0, Math.round((1 - min) / step));
  const at = (i) => +(1 - i * step).toFixed(4);
  if (fits(at(0))) return 1;
  if (n === 0 || !fits(at(n))) return null;
  let lo = 0;   // não cabe
  let hi = n;   // cabe
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (fits(at(mid))) hi = mid; else lo = mid;
  }
  return at(hi);
}
