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
