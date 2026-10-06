// Lógica pura do painel "Nesta cena" e da lista única de Testes.
// Sem React; testada em tests/play-model.test.js.

/**
 * Aventura "em jogo" agora: status 'playing' com sala atual marcada; se houver
 * várias, a atualizada por último. Sem status 'playing', qualquer uma com sala
 * atual (aventuras antigas não tinham status).
 */
export function activeScene(adventures) {
  const list = (adventures || []).filter(a => a && a.currentNodeId);
  if (!list.length) return null;
  const byRecent = (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  const playing = list.filter(a => a.status === 'playing').sort(byRecent);
  if (playing.length) return playing[0];
  return list.filter(a => a.status !== 'done').sort(byRecent)[0] || null;
}

/**
 * Cartões do painel: `scene` = refs da sala ativa (na ordem da sala);
 * `planned` = NPCs e lugares do plano da sessão que ainda não estão na sala.
 */
export function sceneEntries({ entries, node, plan }) {
  const byId = new Map((entries || []).map(e => [Number(e.id), e]));
  const seen = new Set();
  const take = (ids) => {
    const out = [];
    for (const raw of ids || []) {
      const id = Number(raw);
      if (seen.has(id)) continue;
      const e = byId.get(id);
      if (!e) continue;
      seen.add(id);
      out.push(e);
    }
    return out;
  };
  const scene = take(node?.refs);
  const planned = take([...(plan?.npcIds || []), ...(plan?.placeIds || [])]);
  return { scene, planned };
}

// ---------------------------------------------------------------------------
// Testes: lista única (pedidos de teste do mestre + pedidos de rolagem dos jogadores)
// ---------------------------------------------------------------------------

/**
 * Junta CheckRequest (teste pedido à mesa) e RollRequest (rolagem pedida por
 * jogador) numa lista só, em três grupos:
 *   open      — teste aberto esperando alguém responder · rolagem esperando o mestre
 *   answered  — teste aberto com todos respondidos (falta o mestre encerrar)
 *   history   — testes encerrados e rolagens resolvidas/canceladas
 * Cada item: {key, source: 'check'|'roll', at, item}.
 */
export function unifyTests({ checks = [], pendingRolls = [], recentRolls = [] } = {}) {
  const open = [];
  const answered = [];
  const history = [];
  for (const c of checks || []) {
    if (!c) continue;
    const targets = c.targets || [];
    const allAnswered = targets.length > 0 && targets.every(t => t.response);
    const row = { key: `c${c.id}`, source: 'check', at: c.createdAt || c.created_at || '', item: c };
    if (c.status === 'open') (allAnswered ? answered : open).push(row);
    else history.push({ ...row, at: c.closedAt || c.updatedAt || row.at });
  }
  const pendingIds = new Set();
  for (const r of pendingRolls || []) {
    if (!r) continue;
    pendingIds.add(r.id);
    open.push({ key: `r${r.id}`, source: 'roll', pending: true, at: r.createdAt || r.created_at || '', item: r });
  }
  for (const r of recentRolls || []) {
    if (!r || pendingIds.has(r.id) || r.status === 'pending') continue;
    history.push({ key: `r${r.id}`, source: 'roll', at: r.resolvedAt || r.createdAt || r.created_at || '', item: r });
  }
  const newest = (a, b) => String(b.at).localeCompare(String(a.at));
  open.sort(newest);
  answered.sort(newest);
  history.sort(newest);
  return { open, answered, history };
}

/**
 * Contagem do selo de "Testes": só o que está ABERTO (esperando alguém rolar
 * ou o mestre resolver) — o mesmo número da aba "Abertos". Respondidos têm o
 * próprio contador dentro do painel e não seguram o selo.
 */
export function testsBadge(groups) {
  return groups?.open?.length || 0;
}
