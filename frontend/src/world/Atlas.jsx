// Atlas: a grade de cartões do Mundo, filtrável por tipo, visibilidade e tag,
// com "+ Novo" (só tipo e nome) e arrastar para ordenar.
// V14: "⋯ Mover" em cada cartão abre uma folha com ↑ Mover para cima / ↓ Mover para baixo
// (a alternativa ao arrastar, que o toque não tem): um passo entre os cartões à vista, com
// a checagem de versão do reordenar de sempre (WorldArea.reorder), um toque de cada vez.
import { useEffect, useMemo, useRef, useState } from 'react';
import EntryCard from './EntryCard.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import './world-finish.css';
import {
  KINDS, KIND_META, VIS_META, VISIBILITIES, allTags, countByKind, filterEntries, kindLabel, moveStepPatches, reorderPatches, sortEntries, t, visLabel,
} from './world-model.js';

const EXAMPLES = {
  place: ['Taverna do Javali Dourado', 'The Golden Boar Tavern'],
  npc: ['Irmã Velna', 'Sister Velna'],
  faction: ['Círculo do Sino Mudo', 'Circle of the Silent Bell'],
  item: ['Sino de prata rachado', 'Cracked silver bell'],
  lore: ['A névoa que canta', 'The singing mist'],
  handout: ['Bilhete encharcado', 'Soaked note'],
};

export function QuickCreate({ lang, defaultKind = 'npc', onCreate, onCancel, busy }) {
  const [kind, setKind] = useState(defaultKind);
  const [name, setName] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    onCreate(kind, name.trim());
  };
  return (
    <form className="wl-quick" onSubmit={submit}>
      <div className="wl-quick-kinds" role="radiogroup" aria-label={t(lang, 'Tipo', 'Type')}>
        {KINDS.map(k => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={`wl-kindpick${kind === k ? ' is-on' : ''}`}
            style={{ '--wl-kind': KIND_META[k].color }} onClick={() => setKind(k)}>
            <span aria-hidden="true">{KIND_META[k].icon}</span>{kindLabel(k, lang)}
          </button>
        ))}
      </div>
      <div className="wl-quick-row">
        <input autoFocus value={name} maxLength={120} onChange={e => setName(e.target.value)}
          aria-label={t(lang, 'Nome', 'Name')}
          placeholder={t(lang, `Nome — ex.: ${EXAMPLES[kind][0]}`, `Name — e.g. ${EXAMPLES[kind][1]}`)}
          onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onCancel?.(); } }} />
        <button type="submit" className="btn btn-primary" disabled={!name.trim() || busy}>{busy ? '…' : t(lang, 'Criar', 'Create')}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>{t(lang, 'Cancelar', 'Cancel')}</button>}
      </div>
      <p className="wl-hint">{t(lang, 'Só o nome já basta — o resto você completa quando quiser. Nasce oculto dos jogadores.', 'The name is enough — fill in the rest whenever. It starts hidden from players.')}</p>
    </form>
  );
}

export default function Atlas({
  entries, lang = 'pt', selectedId, onOpen, onReveal, showCampaign = null, onRevealed, onCreate, onImprovise, onReorder, onSample, sampleBusy = false,
  count, max = 500, initialKind = 'all', createNonce = 0, top = null,
}) {
  const [kind, setKind] = useState(initialKind);
  const [vis, setVis] = useState('all');
  const [tag, setTag] = useState('');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [moving, setMoving] = useState(null);      // o cartão da folha "⋯ Mover" (id)
  const [moveBusy, setMoveBusy] = useState(false);
  const gridRef = useRef(null);
  // Pedido externo para abrir o "+ Novo" (ex.: Primeiros passos).
  useEffect(() => { if (createNonce && onCreate) setCreating(true); }, [createNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => sortEntries(entries), [entries]);
  const counts = useMemo(() => countByKind(entries), [entries]);
  const tags = useMemo(() => allTags(entries), [entries]);
  const shown = useMemo(() => filterEntries(sorted, { kind, vis, tag, q }), [sorted, kind, vis, tag, q]);
  const filtered = kind !== 'all' || vis !== 'all' || !!tag || !!q.trim();

  const create = async (k, name) => {
    setBusy(true);
    try { await onCreate?.({ kind: k, name }); setCreating(false); } finally { setBusy(false); }
  };

  const drop = (targetId) => {
    if (dragId == null || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const from = sorted.findIndex(e => e.id === dragId);
    const to = sorted.findIndex(e => e.id === targetId);
    setDragId(null); setOverId(null);
    const patches = reorderPatches(sorted, from, to, 'sort');
    if (patches.length) onReorder?.(patches);
  };

  // ↑ ↓ da folha "⋯ Mover": espera a resposta antes do próximo toque (a versão de cada
  // cartão vem dela; dois toques seguidos não mandam a versão velha)
  const step = async (dir) => {
    const patches = moveStepPatches(sorted, shown, moving, dir);
    if (!patches.length || moveBusy) return;
    setMoveBusy(true);
    try { await onReorder?.(patches); } finally { setMoveBusy(false); }
  };
  const movingEntry = moving != null ? entries.find(e => e.id === moving) : null;
  const movePos = movingEntry ? shown.findIndex(e => e.id === moving) : -1;

  const empty = entries.length === 0;

  return (
    <div className="wl-atlas">
      {top /* Mundo vivo (céu, páginas em branco, ecos, rumores) — montado pelo WorldArea */}
      <div className="wl-atlas-bar">
        <div className="wl-search">
          <span aria-hidden="true">🔍</span>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t(lang, 'Buscar no mundo…', 'Search the world…')} aria-label={t(lang, 'Buscar no mundo', 'Search the world')} />
        </div>
        {onCreate && <button type="button" className="btn btn-primary" onClick={() => setCreating(c => !c)} aria-expanded={creating}>＋ {t(lang, 'Novo', 'New')}</button>}
        {onImprovise && <button type="button" className="btn btn-ghost" onClick={onImprovise}>🎲 {t(lang, 'Improvisar', 'Improvise')}</button>}
      </div>

      {creating && onCreate && <QuickCreate lang={lang} defaultKind={kind !== 'all' ? kind : 'npc'} onCreate={create} onCancel={() => setCreating(false)} busy={busy} />}

      {!empty && (
        <>
          <div className="wl-filters" role="toolbar" aria-label={t(lang, 'Filtrar por tipo', 'Filter by type')}>
            <button type="button" className={`wl-chip${kind === 'all' ? ' is-on' : ''}`} onClick={() => setKind('all')}>
              ✦ {t(lang, 'Tudo', 'All')} <span className="wl-count">{entries.length}</span>
            </button>
            {KINDS.map(k => (
              <button key={k} type="button" className={`wl-chip${kind === k ? ' is-on' : ''}${!counts[k] ? ' is-empty' : ''}`}
                style={{ '--wl-kind': KIND_META[k].color }} onClick={() => setKind(kind === k ? 'all' : k)}>
                <span aria-hidden="true">{KIND_META[k].icon}</span> {kindLabel(k, lang, true)} <span className="wl-count">{counts[k]}</span>
              </button>
            ))}
          </div>
          <div className="wl-filters wl-filters-sub">
            <span className="wl-muted wl-small wl-nowrap">{t(lang, "Quem vê:", "Who sees:")}</span>
            {['all', ...VISIBILITIES].map(v => (
              <button key={v} type="button" className={`wl-chip wl-chip-sm${vis === v ? ' is-on' : ''}`} onClick={() => setVis(v)}>
                {v === 'all' ? t(lang, 'Todos', 'Any') : <><span aria-hidden="true">{VIS_META[v].icon}</span> {visLabel(v, lang)}</>}
              </button>
            ))}
            {tags.length > 0 && <span className="wl-muted wl-small wl-sep">·</span>}
            {tags.slice(0, 14).map(tg => (
              <button key={tg} type="button" className={`wl-chip wl-chip-sm${tag === tg ? ' is-on' : ''}`} onClick={() => setTag(tag === tg ? '' : tg)}>#{tg}</button>
            ))}
          </div>
        </>
      )}

      {empty && !onCreate ? (
        <div className="wl-empty wl-empty-small">
          <p>{t(lang, 'O Mundo desta campanha ficou vazio.', "This campaign's World is empty.")}</p>
        </div>
      ) : empty ? (
        <div className="wl-empty wl-empty-world">
          <img src="/art/backgrounds/wayfarer.webp" alt="" className="wl-empty-art" />
          <div className="wl-empty-body">
            <h3>{t(lang, 'Seu mundo ainda está em silêncio.', 'Your world is still silent.')}</h3>
            <p>{t(lang, 'Crie um lugar — só o nome já basta. Depois um NPC que mora lá, um segredo que ele guarda… e o mundo começa a respirar.',
              'Create a place — just the name is enough. Then an NPC who lives there, a secret they keep… and the world starts breathing.')}</p>
            <p className="wl-muted wl-small">{t(lang, 'Exemplo: "Vale de Brumafria — vila de pescadores onde a névoa nunca se levanta."', 'Example: "Mistfrost Vale — a fishing village where the mist never lifts."')}</p>
            <div className="wl-row wl-wrap">
              {!creating && onCreate && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>＋ {t(lang, 'Criar o primeiro cartão', 'Create the first card')}</button>}
              {onSample && <button type="button" className="btn btn-ghost" disabled={sampleBusy} onClick={onSample}>{sampleBusy ? t(lang, 'Criando…', 'Creating…') : t(lang, '✨ Começar com um exemplo', '✨ Start with an example')}</button>}
              {onImprovise && <button type="button" className="btn btn-ghost" onClick={onImprovise}>🎲 {t(lang, 'Improvisar um NPC', 'Improvise an NPC')}</button>}
            </div>
          </div>
        </div>
      ) : shown.length === 0 ? (
        <div className="wl-empty wl-empty-small">
          <p>{t(lang, 'Nada com esse filtro.', 'Nothing matches this filter.')}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setKind('all'); setVis('all'); setTag(''); setQ(''); }}>{t(lang, 'Limpar filtros', 'Clear filters')}</button>
        </div>
      ) : (
        <div className="wl-grid" ref={gridRef}>
          {shown.map(e => (
            <div key={e.id}
              className={`wl-grid-cell${dragId === e.id ? ' is-drag' : ''}${overId === e.id && dragId != null && dragId !== e.id ? ' is-over' : ''}`}
              draggable={!!onReorder}
              onDragStart={ev => { setDragId(e.id); ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', String(e.id)); } catch { /* ok */ } }}
              onDragOver={ev => { if (dragId == null) return; ev.preventDefault(); if (overId !== e.id) setOverId(e.id); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDrop={ev => { ev.preventDefault(); drop(e.id); }}>
              <EntryCard entry={e} mode="dm" lang={lang} selected={selectedId === e.id} onOpen={() => onOpen?.(e.id)} onReveal={onReveal} showCampaign={showCampaign} onRevealed={onRevealed}
                extra={onReorder && shown.length > 1 ? (
                  <button type="button" className="wl-act wl-move-btn" aria-haspopup="dialog" aria-label={t(lang, `Mover: ${e.name}`, `Move: ${e.name}`)}
                    onClick={(ev) => { ev.stopPropagation(); setMoving(e.id); }} onKeyDown={(ev) => ev.stopPropagation()}>
                    <span aria-hidden="true">⋯</span> {t(lang, 'Mover', 'Move')}
                  </button>
                ) : null} />
            </div>
          ))}
        </div>
      )}

      {!empty && (
        <p className="wl-hint wl-atlas-foot">
          {filtered ? t(lang, `${shown.length} de ${entries.length} cartões`, `${shown.length} of ${entries.length} cards`) : t(lang, `${entries.length} cartões`, `${entries.length} cards`)}
          {count != null && count >= max * 0.9 ? ` · ${t(lang, `limite: ${max}`, `limit: ${max}`)}` : ''}
          {onReorder && <>{' · '}{t(lang, 'arraste os cartões ou use ⋯ Mover para mudar a ordem', 'drag cards or use ⋯ Move to change the order')}</>}
        </p>
      )}

      {movingEntry && movePos >= 0 && (
        <MesaSheet title={movingEntry.name} icon="⋯" eyebrow={t(lang, 'Ordem dos cartões', 'Card order')}
          size="auto" width="sm" lang={lang} onClose={() => setMoving(null)} className="wl-move-sheet"
          footer={<button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={() => setMoving(null)}>{t(lang, 'Pronto', 'Done')}</button>}>
          <p className="mesa-sheet-text" aria-live="polite">
            {filtered
              ? t(lang, `${movePos + 1}º de ${shown.length} com este filtro`, `${movePos + 1} of ${shown.length} with this filter`)
              : t(lang, `${movePos + 1}º de ${shown.length}`, `${movePos + 1} of ${shown.length}`)}
          </p>
          <div className="wl-move-btns">
            <button type="button" className="mesa-btn mesa-btn-lg" disabled={moveBusy || movePos === 0} onClick={() => step(-1)}>
              <span aria-hidden="true">↑</span> {moveBusy ? '…' : t(lang, 'Mover para cima', 'Move up')}
            </button>
            <button type="button" className="mesa-btn mesa-btn-lg" disabled={moveBusy || movePos === shown.length - 1} onClick={() => step(1)}>
              <span aria-hidden="true">↓</span> {moveBusy ? '…' : t(lang, 'Mover para baixo', 'Move down')}
            </button>
            {/* o motivo do botão desligado, numa linha de altura fixa embaixo dos dois: nada mexe debaixo do dedo */}
            <p className="wl-move-why">
              {movePos === 0 ? t(lang, '↑ desligado: já é o primeiro.', '↑ off: it is already first.')
                : movePos === shown.length - 1 ? t(lang, '↓ desligado: já é o último.', '↓ off: it is already last.') : ''}
            </p>
          </div>
        </MesaSheet>
      )}
    </div>
  );
}
