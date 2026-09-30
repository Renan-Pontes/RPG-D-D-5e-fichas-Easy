import { NODE_KIND, listOrder, pathsFrom, edgeText, hasTreasure, treasureSummary } from './prep-graph.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

/**
 * Visão em lista da mesma estrutura do mapa (acessível e boa no celular):
 * nós na ordem de exploração, com as saídas de cada um. Tocar abre o painel.
 */
export default function NodeList({ data, play, mode, selectedId, available, lang, onSelect, onCreate, renderPanel }) {
  const order = listOrder(data);
  const visited = new Set(play?.visited || []);
  if (!order.length) {
    return (
      <div className="prep-list-empty">
        <p>{t(lang, 'Nenhuma sala/cena ainda.', 'No rooms/scenes yet.')}</p>
        {mode === 'prep' && <button type="button" className="btn btn-primary btn-sm" onClick={onCreate}>+ {t(lang, 'Sala', 'Room')}</button>}
      </div>
    );
  }
  return (
    <div className="prep-list">
      <ol className="prep-list-items">
        {order.map(n => {
          const kind = NODE_KIND[n.kind] || NODE_KIND.other;
          const isCur = play?.current === n.id;
          const exits = pathsFrom(data, mode === 'play' ? play : { unlocked: (data.edges || []).map(e => e.id) }, n.id);
          const monsters = (n.encounter || []).reduce((s, e) => s + (e.count || 1), 0);
          const cls = [
            'prep-list-item', selectedId === n.id && 'is-selected', isCur && 'is-current',
            visited.has(n.id) && !isCur && 'is-visited', available?.has(n.id) && 'is-available',
          ].filter(Boolean).join(' ');
          return (
            <li key={n.id} className={cls}>
              <button type="button" className="prep-list-main" onClick={() => onSelect(n.id)} aria-expanded={selectedId === n.id}>
                <span className="prep-list-icon" aria-hidden="true">{kind.icon}</span>
                <span className="grow">
                  <strong>{n.name || '?'}</strong>
                  <span className="muted small"> · {t(lang, kind.pt, kind.en)}</span>
                  {isCur && <span className="prep-state-pill current">▶ {t(lang, 'aqui', 'here')}</span>}
                  {!isCur && visited.has(n.id) && <span className="prep-state-pill visited">✓</span>}
                  {mode === 'play' && available?.has(n.id) && <span className="prep-state-pill available">{t(lang, 'disponível', 'available')}</span>}
                  <span className="prep-list-meta">
                    {monsters > 0 && <span>⚔ {monsters}</span>}
                    {(n.hazards || []).length > 0 && <span>⚠ {n.hazards.length}</span>}
                    {(n.checks || []).length > 0 && <span>🎲 {n.checks.length}</span>}
                    {hasTreasure(n) && <span title={treasureSummary(n.treasure, lang)}>💰</span>}
                    {(n.tags || []).map(tg => <span key={tg} className="adv-tag">{tg}</span>)}
                  </span>
                </span>
              </button>
              {exits.length > 0 && (
                <ul className="prep-list-exits" aria-label={t(lang, `Saídas de ${n.name}`, `Exits from ${n.name}`)}>
                  {exits.map(p => (
                    <li key={p.edge.id} className={`s-${p.status}`}>
                      {p.target
                        ? <button type="button" className="linklike" onClick={() => onSelect(p.targetId)}>→ {p.target.name}</button>
                        : <span>↗ {p.edge.toAdventureName || t(lang, 'outra aventura', 'another adventure')}</span>}
                      <span className="muted small"> {edgeText(p.edge, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {selectedId === n.id && renderPanel && <div className="prep-list-panel">{renderPanel(n)}</div>}
            </li>
          );
        })}
      </ol>
      {mode === 'prep' && <button type="button" className="btn btn-ghost btn-sm" onClick={onCreate}>+ {t(lang, 'Sala', 'Room')}</button>}
    </div>
  );
}
