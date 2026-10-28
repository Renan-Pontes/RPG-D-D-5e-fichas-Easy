// Atlas: os cartões do Mundo, filtráveis por tipo, visibilidade e tag, com
// "+ Novo" (só tipo e nome) e a ordem manual.
//
// Celular (≤ 767 px, plano F9): barra presa logo abaixo do segmentado (🔍 busca,
// ＋ Novo, 🎲), dois trilhos de chips de 44 px ("Quem vê:" fixo, fora do trilho) e
// os cartões em linhas de ≤ 96 px (EntryRow) com 👁 e 📺 à direita. "+ Novo" abre
// numa folha. Ordenar: "↕ Ordenar" troca as ações por ↑ ↓ (sem arrastar).
// PC/tablet: a grade de cartões grandes de sempre, com arrastar para reordenar
// (e o mesmo "↕ Ordenar", com ◀ ▶, para quem não arrasta).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import EntryCard, { EntryRow, MoveButtons } from './EntryCard.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import '../shell/mesa.css';
import useScrollEdges from '../shell/useScrollEdges.js';
import useMedia from '../play/useMedia.js';
import {
  KINDS, KIND_META, VIS_META, VISIBILITIES, allTags, countByKind, filterEntries, isTouchUi, kindLabel, moveStepPatches,
  reorderPatches, sortEntries, t, visLabel,
} from './world-model.js';

const EXAMPLES = {
  place: ['Taverna do Javali Dourado', 'The Golden Boar Tavern'],
  npc: ['Irmã Velna', 'Sister Velna'],
  faction: ['Círculo do Sino Mudo', 'Circle of the Silent Bell'],
  item: ['Sino de prata rachado', 'Cracked silver bell'],
  lore: ['A névoa que canta', 'The singing mist'],
  handout: ['Bilhete encharcado', 'Soaked note'],
};

export function QuickCreate({ lang, defaultKind = 'npc', onCreate, onCancel, busy, inSheet = false }) {
  const [kind, setKind] = useState(defaultKind);
  const [name, setName] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    onCreate(kind, name.trim());
  };
  return (
    <form className={`wl-quick${inSheet ? ' is-sheet' : ''}`} onSubmit={submit}>
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

/** Trilho de chips que rola de lado, com degradê na ponta que tem mais (useScrollEdges). */
function ChipRail({ children, label, active, count, className = '' }) {
  const ref = useRef(null);
  useScrollEdges(ref, { active, count, selector: '.is-on' });
  return (
    <div ref={ref} className={`wl-filters mesa-scroll ${className}`.trim()} role="toolbar" aria-label={label}>{children}</div>
  );
}

export default function Atlas({
  entries, lang = 'pt', selectedId, onOpen, onReveal, showCampaign = null, onRevealed, onCreate, onImprovise, onReorder, onSample, sampleBusy = false,
  count, max = 500, initialKind = 'all', createNonce = 0, top = null,
}) {
  const phone = useMedia('(max-width: 767px)');
  const [kind, setKind] = useState(initialKind);
  const [vis, setVis] = useState('all');
  const [tag, setTag] = useState('');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [saving, setSaving] = useState(0); // reordenar(es) ainda na fila do servidor
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const gridRef = useRef(null);
  // Modo Ordenar: a linha movida fica debaixo do dedo (a página rola junto com ela).
  const moved = useRef(null); // {id, top, dir}
  // Pedido externo para abrir o "+ Novo" (ex.: Primeiros passos).
  useEffect(() => { if (createNonce && onCreate) setCreating(true); }, [createNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => sortEntries(entries), [entries]);
  const counts = useMemo(() => countByKind(entries), [entries]);
  const tags = useMemo(() => allTags(entries), [entries]);
  const shown = useMemo(() => filterEntries(sorted, { kind, vis, tag, q }), [sorted, kind, vis, tag, q]);
  const filtered = kind !== 'all' || vis !== 'all' || !!tag || !!q.trim();
  const canOrder = !!onReorder && shown.length > 1;
  useEffect(() => { if (!canOrder && ordering) setOrdering(false); }, [canOrder, ordering]);

  useLayoutEffect(() => {
    const m = moved.current;
    if (!m) return;
    moved.current = null;
    const el = gridRef.current?.querySelector(`[data-entry="${m.id}"]`);
    if (!el) return;
    if (m.top != null) {
      const dy = el.getBoundingClientRect().top - m.top;
      if (Math.abs(dy) > 1) window.scrollBy(0, dy);
    }
    // o foco segue no mesmo botão (ou no outro, quando este acabou de apagar)
    const btn = el.querySelector(`.wl-move-btn[data-move="${m.dir}"]:not(:disabled)`) || el.querySelector('.wl-move-btn:not(:disabled)');
    try { btn?.focus({ preventScroll: true }); } catch { /* ok */ }
  }, [sorted]);

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
    if (patches.length) send(patches);
  };

  // O ↑ ↓ não se apaga enquanto envia: cada toque é um passo que a tela já mostra (o
  // WorldArea grava em fila, sem a resposta de um desfazer o outro); a linha de
  // status diz "Salvando a ordem…" até a fila esvaziar.
  const send = (patches) => {
    const p = onReorder?.(patches);
    if (!p?.finally) return;
    setSaving(n => n + 1);
    p.finally(() => setSaving(n => Math.max(0, n - 1)));
  };

  const step = (id, dir, ev) => {
    const patches = moveStepPatches(sorted, shown, id, dir);
    if (!patches.length) return;
    const row = ev?.currentTarget?.closest?.('[data-entry]');
    moved.current = { id, dir: dir < 0 ? 'up' : 'down', top: phone && row ? row.getBoundingClientRect().top : null };
    send(patches);
  };
  const moveFor = (e, i) => (ordering ? {
    canUp: i > 0, canDown: i < shown.length - 1, grid: !phone,
    onUp: (ev) => step(e.id, -1, ev), onDown: (ev) => step(e.id, +1, ev),
  } : null);

  const empty = entries.length === 0;
  const clearFilters = () => { setKind('all'); setVis('all'); setTag(''); setQ(''); };
  const quick = creating && onCreate ? (
    phone ? (
      <MesaSheet title={t(lang, 'Novo cartão', 'New card')} icon="＋" size="auto" width="sm" lang={lang}
        onClose={() => setCreating(false)} className="wl-quick-sheet" initialFocus=".wl-quick-row input">
        <QuickCreate lang={lang} defaultKind={kind !== 'all' ? kind : 'npc'} onCreate={create} onCancel={() => setCreating(false)} busy={busy} inSheet />
      </MesaSheet>
    ) : <QuickCreate lang={lang} defaultKind={kind !== 'all' ? kind : 'npc'} onCreate={create} onCancel={() => setCreating(false)} busy={busy} />
  ) : null;
  // "arraste" só onde o arrastar funciona (mouse); no toque, o ↕ Ordenar
  const dragHint = !!onReorder && !phone && !isTouchUi();
  const orderHint = phone
    ? t(lang, 'Ordenar: toque em ↑ ↓ para mudar a ordem.', 'Reorder: tap ↑ ↓ to change the order.')
    : t(lang, 'Ordenar: use ◀ ▶ para mudar a ordem (ou arraste).', 'Reorder: use ◀ ▶ to change the order (or drag).');

  return (
    <div className={`wl-atlas${phone ? ' is-phone' : ''}${ordering ? ' is-ordering' : ''}`}>
      {/* barra presa: no Mundo vazio quem fala é o cartão do vazio (sem botões em dobro) */}
      {!empty && (
        <div className="wl-atlas-bar">
          <div className="wl-search">
            <span aria-hidden="true">🔍</span>
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t(lang, 'Buscar no mundo…', 'Search the world…')} aria-label={t(lang, 'Buscar no mundo', 'Search the world')} />
          </div>
          {onCreate && (
            <button type="button" className="mesa-btn is-primary wl-bar-new" onClick={() => setCreating(c => !c)} aria-expanded={creating}>
              ＋ {t(lang, 'Novo', 'New')}
            </button>
          )}
          {onImprovise && (
            <button type="button" className="mesa-btn wl-bar-impro" onClick={onImprovise} aria-label={t(lang, 'Improvisar', 'Improvise')}>
              🎲<span className="wl-bar-impro-txt"> {t(lang, 'Improvisar', 'Improvise')}</span>
            </button>
          )}
        </div>
      )}

      {!empty && quick}

      {top /* Mundo vivo (céu, páginas em branco, ecos, rumores) — montado pelo WorldArea */}

      {!empty && (
        <div className="wl-filter-rows">
          <ChipRail label={t(lang, 'Filtrar por tipo', 'Filter by type')} active={kind} count={KINDS.length}>
            <button type="button" className={`wl-chip${kind === 'all' ? ' is-on' : ''}`} aria-pressed={kind === 'all'} onClick={() => setKind('all')}>
              ✦ {t(lang, 'Tudo', 'All')} <span className="wl-count">{entries.length}</span>
            </button>
            {KINDS.map(k => (
              <button key={k} type="button" className={`wl-chip${kind === k ? ' is-on' : ''}${!counts[k] ? ' is-empty' : ''}`} aria-pressed={kind === k}
                style={{ '--wl-kind': KIND_META[k].color }} onClick={() => setKind(kind === k ? 'all' : k)}>
                <span aria-hidden="true">{KIND_META[k].icon}</span> {kindLabel(k, lang, true)} <span className="wl-count">{counts[k]}</span>
              </button>
            ))}
          </ChipRail>
          <div className="wl-filter-row">
            {/* o rótulo fica fora do trilho: nunca encolhe (antes ficava com 0 px) */}
            <span className="wl-filter-label" id="wl-who-label">{t(lang, 'Quem vê:', 'Who sees:')}</span>
            <ChipRail label={t(lang, 'Filtrar por quem vê e por tag', 'Filter by who sees and by tag')} active={`${vis}|${tag}`} count={tags.length + 4}>
              {['all', ...VISIBILITIES].map(v => (
                <button key={v} type="button" className={`wl-chip wl-chip-sm${vis === v ? ' is-on' : ''}`} aria-pressed={vis === v} onClick={() => setVis(v)}
                  aria-describedby="wl-who-label">
                  {v === 'all' ? t(lang, 'Todos', 'Any') : <><span aria-hidden="true">{VIS_META[v].icon}</span> {visLabel(v, lang)}</>}
                </button>
              ))}
              {tags.length > 0 && <span className="wl-muted wl-small wl-sep" aria-hidden="true">·</span>}
              {tags.slice(0, 14).map(tg => (
                <button key={tg} type="button" className={`wl-chip wl-chip-sm${tag === tg ? ' is-on' : ''}`} aria-pressed={tag === tg} onClick={() => setTag(tag === tg ? '' : tg)}>#{tg}</button>
              ))}
            </ChipRail>
          </div>
        </div>
      )}

      {!empty && shown.length > 0 && (
        <div className={`wl-list-head${ordering ? ' is-ordering' : ''}`}>
          {ordering ? (
            // a instrução fica (invisível) por baixo do "Salvando…": a cabeça não muda de
            // altura e a lista não pula quando a fila esvazia
            <p className="wl-list-count wl-order-status">
              <span className="wl-order-sizer" aria-hidden="true">{orderHint}</span>
              <span role="status">{saving > 0 ? `⟳ ${t(lang, 'Salvando a ordem…', 'Saving the order…')}` : orderHint}</span>
            </p>
          ) : (
            <p className="wl-list-count">
              {filtered ? t(lang, `${shown.length} de ${entries.length} cartões`, `${shown.length} of ${entries.length} cards`) : t(lang, `${entries.length} cartões`, `${entries.length} cards`)}
            </p>
          )}
          {canOrder && (
            <button type="button" className={`wl-order-btn${ordering ? ' is-on' : ''}`} aria-pressed={ordering} onClick={() => setOrdering(o => !o)}>
              {ordering ? `✓ ${t(lang, 'Pronto', 'Done')}` : `↕ ${t(lang, 'Ordenar', 'Reorder')}`}
            </button>
          )}
        </div>
      )}

      {empty && !onCreate ? (
        <div className="wl-empty wl-empty-small">
          <p>{t(lang, 'O Mundo desta campanha ficou vazio.', "This campaign's World is empty.")}</p>
        </div>
      ) : empty ? (
        <>
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
          {quick}
        </>
      ) : shown.length === 0 ? (
        <div className="wl-empty wl-empty-small">
          <p>{t(lang, 'Nada com esse filtro.', 'Nothing matches this filter.')}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>{t(lang, 'Limpar filtros', 'Clear filters')}</button>
        </div>
      ) : phone ? (
        <div className="wl-list" ref={gridRef}>
          {shown.map((e, i) => (
            <EntryRow key={e.id} entry={e} lang={lang} selected={selectedId === e.id} onOpen={() => onOpen?.(e.id)}
              onReveal={onReveal} showCampaign={showCampaign} onRevealed={onRevealed} move={moveFor(e, i)} />
          ))}
        </div>
      ) : (
        <div className="wl-grid" ref={gridRef}>
          {shown.map((e, i) => (
            <div key={e.id} data-entry={e.id}
              className={`wl-grid-cell${dragId === e.id ? ' is-drag' : ''}${overId === e.id && dragId != null && dragId !== e.id ? ' is-over' : ''}`}
              draggable={!!onReorder}
              onDragStart={ev => { setDragId(e.id); ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', String(e.id)); } catch { /* ok */ } }}
              onDragOver={ev => { if (dragId == null) return; ev.preventDefault(); if (overId !== e.id) setOverId(e.id); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDrop={ev => { ev.preventDefault(); drop(e.id); }}>
              {ordering && <div className="wl-move-bar"><MoveButtons move={moveFor(e, i)} lang={lang} name={e.name} /></div>}
              <EntryCard entry={e} mode="dm" lang={lang} selected={selectedId === e.id} onOpen={() => onOpen?.(e.id)} onReveal={onReveal} showCampaign={showCampaign} onRevealed={onRevealed} />
            </div>
          ))}
        </div>
      )}

      {!empty && (count != null && count >= max * 0.9 || dragHint) && (
        <p className="wl-hint wl-atlas-foot">
          {count != null && count >= max * 0.9 ? t(lang, `${count} de ${max} cartões (limite)`, `${count} of ${max} cards (limit)`) : ''}
          {count != null && count >= max * 0.9 && dragHint ? ' · ' : ''}
          {dragHint ? t(lang, 'arraste os cartões para reordenar', 'drag cards to reorder') : ''}
        </p>
      )}
    </div>
  );
}
