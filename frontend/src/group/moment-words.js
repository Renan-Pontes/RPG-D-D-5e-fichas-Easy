// As palavras dos momentos em frase de mestre (onda 3, F1.1) e a conta única deles (F1.3).
// Sem dependências (o Plano, a folha da Cena, a Agora e o Raio-X importam daqui sem baixar
// as contas do Raio-X); testado em tests/moment-words.test.js.
//
// A linha principal nunca traz porcentagem nem gênero presumido: "★ Dagna brilha: um teste
// de Medicina — ninguém no grupo faz melhor" · "↗ Um desafio para Dagna: uma salvaguarda de
// Destreza, o ponto fraco de Dagna" · "✎ Uma cena da história de Dagna: “…”". Os números
// ficam no `detail` da sugestão (a linha pequena "detalhes"). O texto gravado do momento é
// só o que vem depois dos dois-pontos; o começo ("Dagna brilha") sai do tipo e do nome.

const tt = (lang, pt, en) => (lang === 'en' ? en : pt);
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';

export const MOMENT_ICON = { shine: '★', push: '↗', hook: '✎' };
export const momentIcon = (kind) => MOMENT_ICON[kind] || '★';

/** O começo da frase: "Dagna brilha" · "Um desafio para Dagna" · "Uma cena da história de Dagna". */
export function momentHead(kind, name, lang = 'pt') {
  const who = firstName(name);
  if (!who) return { shine: tt(lang, 'Brilha', 'Shines'), push: tt(lang, 'Desafia', 'Challenges'), hook: tt(lang, 'Gancho', 'Hook') }[kind] || tt(lang, 'Brilha', 'Shines');
  if (kind === 'push') return tt(lang, `Um desafio para ${who}`, `A challenge for ${who}`);
  if (kind === 'hook') return tt(lang, `Uma cena da história de ${who}`, `A scene from ${who}'s story`);
  return tt(lang, `${who} brilha`, `${who} shines`);
}

/** A linha inteira: "★ Dagna brilha: um teste de Medicina — ninguém no grupo faz melhor". */
export function momentLine(moment, name, lang = 'pt', { icon = true } = {}) {
  const head = momentHead(moment?.kind, name, lang);
  return `${icon ? `${momentIcon(moment?.kind)} ` : ''}${head}: ${moment?.text || ''}`;
}

// ---------------------------------------------------------------- a conta única (F1.3)

/** Nº da sessão do estado: os dígitos de state.session (a regra do servidor); sem número, a maior de diarySessions. */
function sessionOf(state) {
  const raw = state?.session;
  if (Number.isInteger(raw)) return raw >= 0 ? raw : 0;
  const m = /\d+/.exec(String(raw ?? ''));
  if (m) return +m[0];
  const keys = Object.keys(state?.diarySessions || {}).filter(k => /^\d+$/.test(k)).map(Number);
  return keys.length ? Math.max(...keys) : 0;
}

/**
 * A sessão para a qual os momentos contam: a ao vivo (o plano de hoje) ou, parada, a
 * próxima (o plano que está sendo preparado). O Plano, o "O que fazer agora", o Raio-X e o
 * "Pronto para jogar" usam esta mesma sessão.
 */
export function momentSession(state) {
  const cur = sessionOf(state);
  return state?.live && cur ? cur : cur + 1;
}

/**
 * Em que cena do plano o momento está: a gravada nele (`plan`), se ela ainda está no plano
 * (`sceneIds`, Set ou lista: as cenas de verdade do plano de agora); a que foi apagada ou
 * ficou no plano arquivado = null ("sem cena ainda", com "→ Cena"). Sem `sceneIds` (servidor
 * de antes, no Raio-X), vale a gravada.
 */
export function momentScene(moment, sceneIds = null) {
  const id = moment?.plan || null;
  if (!id || !sceneIds) return id;
  return (sceneIds instanceof Set ? sceneIds.has(id) : [...sceneIds].includes(id)) ? id : null;
}

/**
 * Os momentos de um personagem que contam para o plano da sessão `session`: os que ainda
 * não aconteceram (com ou sem cena) e os que aconteceram nesta sessão. Cada um diz em que
 * cena do plano está (`sceneId`, momentScene), ou null = "sem cena ainda". O Plano passa as
 * cenas dele; o Raio-X, as que vêm no GET dele (`planScenes`): a mesma conta nos dois.
 * → [{moment, sceneId}]
 */
export function planMoments(list, { session = null, sceneIds = null } = {}) {
  const ids = sceneIds ? new Set(sceneIds) : null;
  return (list || [])
    .filter(m => m && (m.done == null || (session != null && m.done === session)))
    .map(m => ({ moment: m, sceneId: momentScene(m, ids) }));
}

/** {total, noScene}: quantos contam e quantos estão "sem cena ainda". */
export function planMomentCount(list, opts = {}) {
  const rows = planMoments(list, opts);
  return { total: rows.length, noScene: rows.filter(r => !r.sceneId).length };
}

// ---------------------------------------------------------------- ideias variadas (F1.2)

/**
 * O assunto de uma ideia (a perícia ou a salvaguarda que ela usa): "skill:perception" vale
 * para ★ e ↗ da mesma perícia; o resto é a própria chave.
 */
export const ideaTopic = (auto) => String(auto || '').replace(/^push:/, '');

/**
 * As primeiras ideias de personagens diferentes não repetem o mesmo assunto: na ordem de
 * `order`, cada um ganha em 1º a sua primeira ideia que não é desafio (um ponto forte dele)
 * e cujo assunto ainda não foi usado — nem pelos anteriores nem pelos momentos já aceitos
 * (`taken`, as chaves deles). Sem uma assim, a 1ª de assunto livre; sem nenhuma, fica como
 * está. O resto da lista mantém a ordem. → {id: [ideias]}
 */
export function varyFirsts(order, lists, taken = []) {
  const used = new Set((taken || []).filter(Boolean).map(ideaTopic));
  const out = { ...lists };
  for (const id of order) {
    const list = lists[id] || [];
    if (!list.length) continue;
    const free = (s) => !used.has(ideaTopic(s.auto));
    let i = list.findIndex(s => s.kind !== 'push' && free(s));
    if (i < 0) i = list.findIndex(free);
    if (i < 0) i = 0;
    out[id] = [list[i], ...list.filter((_, j) => j !== i)];
    used.add(ideaTopic(list[i].auto));
  }
  return out;
}
