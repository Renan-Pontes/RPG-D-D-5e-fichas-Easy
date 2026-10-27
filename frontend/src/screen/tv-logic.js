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
 * → { rows:[{id, name, kind, state:'acted'|'now'|'todo', mark, down, hp|null, band|null, conditions}], more }
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
    return {
      id: c.id,
      name: c.name || '?',
      kind: pc ? 'pc' : 'monster',
      state,
      mark: !order ? '' : state === 'now' ? '▶' : state === 'acted' ? '✓' : '',
      down: !!c.defeated || c.health === 'down' || (pc && c.current_hp != null && c.current_hp <= 0),
      hp: showHp ? { cur: c.current_hp, max: c.stats?.max_hp ?? null, temp: c.temp_hp || 0 } : null,
      band: showHp ? null : (c.health || 'unhurt'),
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
