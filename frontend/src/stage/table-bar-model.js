// A barra da mesa e a janela da Tela (V4, especificação §5.8), sem React.
//
// A miniatura do YouTube pedida pelo dono: no celular, uma faixa de 64 px fixa
// acima da barra de baixo, com a miniatura da Tela (desenhada pelo app), 2 linhas
// de texto de verdade e, à direita, o 🎲 e — em combate — o Próximo turno ao
// alcance do polegar em QUALQUER área. No PC, uma janela flutuante de 320×180.
//
// Tudo o que decide o que a barra diz e quando ela aparece mora aqui (testado em
// tests/table-bar-model.test.js): visibilidade, as 2 linhas (a 1ª que valer, na
// ordem da §5.8), o botão da direita, o resumo do combate a partir do combate
// completo (o mesmo que o pulso do servidor devolve), a fita de iniciativa do PC
// e as preferências guardadas no aparelho (`forja:tv-bar:<id>`).
import { L, frontLabel, stageNow, testLabel } from './stage-now.js';

export const BAR_PREFS = ['always', 'live', 'never'];
export const OFFLINE_AFTER_MS = 8000;   // sem resposta há 8 s → "⟳ Sem conexão há N s"
export const ROLL_SHOW_MS = 8000;       // rolagem nova fica 8 s na 2ª linha
export const SENT_SHOW_MS = 4000;       // "Na tela ✓" logo depois de um 📺
export const REARM_MS = 400;            // botão que mudou de sentido ignora toques por 400 ms

// ---------------------------------------------------------------------------
// Preferências no aparelho: {pref:'always'|'live'|'never', hideSession, winSession}
//   hideSession: "Esconder a barra até a próxima sessão" (celular, fora de combate)
//   winSession:  ✕ da janela do PC ("esconde até a próxima sessão")
// ---------------------------------------------------------------------------
const prefKey = (id) => `forja:tv-bar:${id}`;

export function readBarPrefs(campaignId, storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const v = JSON.parse(s?.getItem(prefKey(campaignId)) || 'null');
    if (!v || typeof v !== 'object') return { pref: 'live', hideSession: null, winSession: null };
    return {
      pref: BAR_PREFS.includes(v.pref) ? v.pref : 'live',
      hideSession: v.hideSession != null ? String(v.hideSession) : null,
      winSession: v.winSession != null ? String(v.winSession) : null,
    };
  } catch { return { pref: 'live', hideSession: null, winSession: null }; }
}

export function writeBarPrefs(campaignId, prefs, storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    s?.setItem(prefKey(campaignId), JSON.stringify(prefs));
  } catch { /* modo privado: vale só nesta visita */ }
}

/** "Esconder até a próxima sessão" vale enquanto a sessão for a mesma. */
const hiddenNow = (mark, session) => mark != null && String(mark) === String(session ?? '');

/**
 * A barra da mesa (celular) aparece?
 *  - em combate, dentro de Jogar: sempre (é onde está o Próximo turno);
 *  - Jogar › Tela fora de combate: não (a prévia grande já está ali);
 *  - "Nunca" ou escondida até a próxima sessão: não (fora de combate em Jogar);
 *  - "Sempre": sim; "Só ao vivo" (padrão): sessão ao vivo, combate ativo ou TV conectada.
 * A folha aberta e o teclado escondem por CSS/medida (TableBar), não aqui.
 */
export function barVisible({ prefs, session, live = false, combatActive = false, tvLive = 0, area, sub }) {
  const p = prefs || { pref: 'live' };
  const inPlay = area === 'play';
  if (combatActive && inPlay) return true;
  if (inPlay && sub === 'screen') return false;
  if (p.pref === 'never' || hiddenNow(p.hideSession, session)) return false;
  if (p.pref === 'always') return true;
  return !!(live || combatActive || tvLive > 0);
}

/**
 * A janela da Tela no PC: 'hidden' | 'docked' (encaixada no topo da coluna da
 * direita em Jogar › Agora e Combate, com as 2 colunas: `dockable`, ≥ 1024 px) |
 * 'float' (canto de baixo). Fora da sessão só aparece com TV conectada ou
 * "Sempre"; ✕ esconde até a próxima sessão.
 */
export function windowMode({ prefs, session, live = false, combatActive = false, tvLive = 0, area, sub, forced = false, dockable = true }) {
  const p = prefs || { pref: 'live' };
  if (area === 'play' && sub === 'screen') return 'hidden';
  const dock = dockable && area === 'play' && (sub === 'scene' || sub === 'combat');
  if (!forced) {
    if (p.pref === 'never' && !(combatActive && area === 'play')) return 'hidden';
    if (hiddenNow(p.winSession, session)) return 'hidden';
    if (p.pref !== 'always' && !(live || combatActive || tvLive > 0)) return 'hidden';
  }
  return dock ? 'docked' : 'float';
}

/** Páginas com controles no canto de baixo à direita põem a janela à esquerda sozinhas. */
export function windowCorner({ corner = 'right', area, sub } = {}) {
  if (area === 'world' && sub === 'map') return 'left';
  return corner === 'left' ? 'left' : 'right';
}

// ---------------------------------------------------------------------------
// Combate: o resumo (o mesmo do pulso) a partir do combate completo
// ---------------------------------------------------------------------------
const down = (c) => !!c?.defeated || (typeof c?.current_hp === 'number' && c.current_hp <= 0);

/**
 * Do GET do combate (ou da resposta do Próximo turno) para o resumo da barra:
 * {active, ver, round, turnIndex, turnId, turnName, turnHp, nextName, acted,
 *  count, allMonstersDown, order:[{id,name,kind,acted,defeated}], dangers}.
 */
export function combatSummary(combat) {
  if (!combat) return null;
  const list = Array.isArray(combat.combatants) ? combat.combatants : [];
  const active = !!combat.active;
  if (!list.length && !active) return null;
  const idx = Number.isInteger(combat.turnIndex) ? combat.turnIndex : 0;
  const cur = active && idx >= 0 && idx < list.length ? list[idx] : null;
  let next = null;
  if (active && list.length) {
    for (let i = 1; i <= list.length; i++) {
      const c = list[(idx + i) % list.length];
      if (c && c !== cur && !c.defeated) { next = c; break; }
    }
  }
  const monsters = list.filter(c => c.type === 'monster');
  const order = list.map((c, i) => ({ id: c.id, name: c.name || '', kind: c.type || '', acted: active && i < idx, defeated: down(c) }));
  const maxHp = cur?.stats?.max_hp;
  return {
    active,
    ver: combat.updatedAt || null,
    round: active ? combat.round ?? null : null,
    turnIndex: active ? idx : null,
    turnId: cur?.id ?? null,
    turnName: cur?.name || '',
    turnHp: cur && cur.current_hp != null ? `${cur.current_hp}/${maxHp ?? '?'}` : null,
    nextName: next?.name || '',
    acted: order.filter(o => o.acted).length,
    count: list.length,
    // montado e ainda não começou (o combate encerrado guarda a rodada em que parou)
    setup: !active && list.length > 0 && (combat.round ?? 1) === 1 && idx === 0,
    allMonstersDown: active && monsters.length > 0 && monsters.every(down),
    order,
    dangers: active ? list.filter(c => c.type === 'pc' && !c.defeated && typeof c.current_hp === 'number' && c.current_hp <= 0).length : 0,
  };
}

/**
 * A vez em pedaços, para a linha 1 da barra cortar só o NOME (o dado mais
 * importante) e nunca o número dele: "Goblin Afog… #2".
 *   {lead: '⚔ R2', pre: 'Vez de ', name: 'Goblin', num: ' #2', post: ''}  (en: post "'s turn")
 * `short`: sem "Vez de" / "'s turn" (quando o nome não cabe inteiro).
 */
export function turnParts(combat, lang = 'pt', { short = false } = {}) {
  if (!combat?.active) return null;
  const who = combat.turnName || '—';
  const m = /^(.*\S)(\s+#?\d+)$/.exec(who);
  return {
    lead: `⚔ R${combat.round ?? '?'}`,
    pre: short ? '' : L(lang, 'Vez de ', ''),
    name: m ? m[1] : who,
    num: m ? m[2] : '',
    post: short ? '' : L(lang, '', "'s turn"),
  };
}

/**
 * "⚔ R2 · Vez de Goblin #2 · 3/10". `hp: false` deixa o PV para a linha 2 (barra
 * do celular); `short: true` tira o "Vez de" (o nome inteiro primeiro).
 */
export function turnLine(combat, lang = 'pt', { hp = true, short = false } = {}) {
  const p = turnParts(combat, lang, { short });
  if (!p) return '';
  const tail = hp && combat.turnHp ? ` · ${combat.turnHp}` : '';
  return `${p.lead} · ${p.pre}${p.name}${p.num}${p.post}${tail}`;
}

/** "depois: Dagna · 3 de 7 agiram" (`hp: true`: "3/10 · depois: …", a linha 2 da barra). */
export function afterLine(combat, lang = 'pt', { hp = false } = {}) {
  if (!combat?.active) return '';
  const next = combat.nextName ? L(lang, `depois: ${combat.nextName}`, `next: ${combat.nextName}`) : '';
  const acted = L(lang, `${combat.acted} de ${combat.count} agiram`, `${combat.acted} of ${combat.count} acted`);
  return [hp ? combat.turnHp : '', next, acted].filter(Boolean).join(' · ');
}

/** O 409 do Próximo turno: "A vez já tinha passado: agora é de Dagna." */
export function staleText(combat, lang = 'pt') {
  const who = combat?.turnName || '—';
  return L(lang, `A vez já tinha passado: agora é de ${who}.`, `The turn had already passed: it's ${who}'s now.`);
}

/** Fita de iniciativa do PC: ✓ agiu · ● agora · ○ falta · † caiu (texto, só leitura). */
export function ribbon(combat) {
  if (!combat?.active) return [];
  return (combat.order || []).map(o => ({
    id: o.id, name: o.name,
    mark: o.defeated ? '†' : o.id === combat.turnId ? '●' : o.acted ? '✓' : '○',
    state: o.defeated ? 'down' : o.id === combat.turnId ? 'now' : o.acted ? 'acted' : 'todo',
  }));
}

/**
 * O botão da direita da barra: 'next' (Próximo →) · 'end' (Encerrar o combate) ·
 * 'start' (▶ Iniciar, só com o combate montado que ainda não começou) · null.
 */
export function barAction(combat) {
  if (!combat) return null;
  if (combat.active) return combat.allMonstersDown ? 'end' : 'next';
  return combat.setup ? 'start' : null;
}

/** Segundos sem resposta do servidor (0 enquanto não passou dos 8 s). */
export function offlineSeconds(lastOkAt, now = Date.now()) {
  if (!lastOkAt) return 0;
  const ms = now - lastOkAt;
  return ms >= OFFLINE_AFTER_MS ? Math.floor(ms / 1000) : 0;
}

/** "⟳ Sem conexão há 12 s" (vermelho na barra, na faixa sob o segmentado e nas abas do PC). */
export function offlineLine(seconds, lang = 'pt') {
  return L(lang, `⟳ Sem conexão há ${seconds} s`, `⟳ Offline for ${seconds} s`);
}

/**
 * A TV como o mestre a vê: 'on' · 'off' · 'unknown'. Sem conexão o pulso não
 * chega, e o último "TV conectada" pode não valer mais: o ponto fica cinza.
 */
export function tvState(tvLive, offline = false) {
  if (offline) return 'unknown';
  return tvLive > 0 ? 'on' : 'off';
}

export function tvLine(tvLive, lang = 'pt', offline = false) {
  if (offline) return L(lang, '○ TV: sem conexão', '○ TV: offline');
  return tvLive > 0 ? L(lang, `● TV conectada (${tvLive})`, `● TV connected (${tvLive})`) : L(lang, '○ Nenhuma TV detectada', '○ No TV detected');
}

/** O começo curto da legenda da janela do PC: "● TV" · "○ Nenhuma TV" · "○ TV: sem conexão". */
export function tvShort(tvLive, lang = 'pt', offline = false) {
  if (offline) return tvLine(0, lang, true);
  return tvLive > 0 ? '● TV' : L(lang, '○ Nenhuma TV', '○ No TV');
}

/** Sem conexão, o que o app diz que está na Tela é o último que ele viu. */
export function seenSuffix(offline, lang = 'pt') {
  return offline ? L(lang, ' (última vez visto)', ' (last seen)') : '';
}

/** "🎲 Dagna 18 · Percepção" (★ no 20, ✗ no 1) */
export function rollLine(roll, lang = 'pt') {
  if (!roll) return '';
  const mark = roll.crit ? ' ★' : roll.fail ? ' ✗' : '';
  return `🎲 ${roll.who || L(lang, 'Rolagem', 'Roll')} ${roll.total ?? '?'}${mark}${roll.label ? ` · ${roll.label}` : ''}`;
}

/**
 * As 2 linhas da barra (§5.8). Recebe o palco CRU do mestre (para o nome da
 * frente) e o resumo do combate.
 *   l1: em combate "⚔ R2 · Vez de X" (todos caídos: "Todos os monstros
 *       caíram"; montado e parado: "⚔ Combate montado · N"); fora: "📺 Na tela:
 *       <frente>" / "📺 Na tela: capa" / "◐ Tela escurecida"; ao vivo, sem TV e
 *       sem combate: "📺 A Tela não está ligada" (convite).
 *   l2: a 1ª que valer — sem conexão → rolagem nova → enviando/na tela ✓ → em
 *       combate "📺 Por cima: X" ou "3/10 · depois: …" → teste na Tela (+ TV) → TV.
 * Sem conexão, o "Na tela" da linha 1 ganha "(última vez visto)".
 * → {l1, l2, tone: 'error'|'roll'|'sent'|null, invite, turn (turnParts, em combate), action}
 */
export function barLines({
  stage, combat = null, test = null, tvLive = 0, tvSeen = false, live = false, offlineFor = 0, roll = null, sending = null, lang = 'pt',
} = {}) {
  const now = stageNow({ stage, combat: combat ? { active: combat.active, round: combat.round } : null });
  const fighting = !!combat?.active;
  const offline = offlineFor > 0;
  // Convite só enquanto nenhuma TV apareceu nesta visita; a que sumiu vira "○ Nenhuma TV detectada".
  const invite = !fighting && live && !(tvLive > 0) && !tvSeen;
  // Em combate, a linha 1 é a vez (o nome primeiro); o PV vai para a linha 2.
  const turn = fighting && !combat.allMonstersDown ? turnParts(combat, lang) : null;
  const seen = seenSuffix(offline, lang);
  let l1;
  if (fighting) l1 = turn ? turnLine(combat, lang, { hp: false }) : L(lang, '⚔ Todos os monstros caíram', '⚔ All monsters are down');
  else if (invite) l1 = L(lang, '📺 A Tela não está ligada', "📺 The screen isn't on");
  else if (now.mode === 'dark') l1 = `◐ ${L(lang, 'Tela escurecida', 'Screen blacked out')}${seen}`;
  else if (now.mode === 'front') l1 = `📺 ${L(lang, 'Na tela', 'On screen')}: ${frontLabel(now.front, lang, { dm: true })}${seen}`;
  else if (now.mode === 'map') l1 = `📺 ${L(lang, 'Na tela: mapa do combate', 'On screen: combat map')}${seen}`;
  else if (combat?.setup) l1 = L(lang, `⚔ Combate montado · ${combat.count}`, `⚔ Combat set up · ${combat.count}`);
  else l1 = `📺 ${L(lang, 'Na tela: capa', 'On screen: cover')}${seen}`;

  let l2 = '';
  let tone = null;
  if (offline) {
    l2 = offlineLine(offlineFor, lang); tone = 'error';
  } else if (roll) {
    l2 = rollLine(roll, lang); tone = 'roll';
  } else if (sending) {
    l2 = sending.state === 'sending' ? L(lang, 'Enviando…', 'Sending…')
      : `${L(lang, 'Na tela ✓', 'On screen ✓')}${sending.name ? ` · ${sending.name}` : ''}`;
    tone = 'sent';
  } else if (fighting && now.mode === 'front' && now.over) {
    l2 = `📺 ${L(lang, 'Por cima', 'Over it')}: ${frontLabel(now.front, lang, { dm: true })}`;
  } else if (fighting) {
    l2 = afterLine(combat, lang, { hp: !!turn });
  } else if (invite) {
    l2 = test ? `${testLabel(test)} · ${L(lang, 'Toque para ligar na TV', 'Tap to open it on the TV')}` : L(lang, 'Toque para ligar na TV', 'Tap to open it on the TV');
  } else if (test) {
    l2 = `${testLabel(test)} · ${tvLine(tvLive, lang)}`;
  } else {
    l2 = tvLine(tvLive, lang);
  }
  return { l1, l2, tone, invite, turn, action: barAction(combat) };
}

/**
 * Rolagem pública nova para a 2ª linha (8 s). `seen` = {id, at}: o que a loja
 * guardou quando o pulso trouxe aquela rolagem (at = 0 para a que já existia ao
 * abrir: nada é reprisado).
 */
export function freshRoll(roll, seen, now = Date.now()) {
  if (!roll || roll.id == null || !seen || seen.id !== roll.id || !seen.at) return null;
  return now - seen.at < ROLL_SHOW_MS ? roll : null;
}
