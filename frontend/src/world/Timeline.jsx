// Linha do tempo do Mundo: cartões com "Quando" (whenLabel), em ordem
// ajustável arrastando (ou com ↑↓ no celular). Ao lado, as sessões da Crônica.
import { useEffect, useMemo, useState } from 'react';
import { request } from '../api/client.js';
import { isConflict, updateEntry, worldErrorText } from './world-api.js';
import { EntryImage, VisibilitySeal } from './EntryCard.jsx';
import { EntryPicker } from './LinksField.jsx';
import { KIND_META, kindLabel, reorderPatches, t, timelineEntries } from './world-model.js';

export default function Timeline({ campaign, entries = [], lang = 'pt', onOpenEntry, onEntrySaved, onReload, onCreate }) {
  const items = useMemo(() => timelineEntries(entries), [entries]);
  const [drag, setDrag] = useState(null); // índice arrastado
  const [over, setOver] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let alive = true;
    request(`/api/campaigns/${encodeURIComponent(campaign.id)}/diary?limit=1`)
      .then(r => alive && setSessions(r.sessions || []))
      .catch(() => alive && setSessions([]));
    return () => { alive = false; };
  }, [campaign.id]);

  const move = async (from, to) => {
    setDrag(null); setOver(null);
    const patches = reorderPatches(items, from, to, 'whenOrder');
    if (!patches.length) return;
    // Otimista: aplica já na lista, grava em seguida.
    for (const p of patches) onEntrySaved?.({ ...entries.find(e => e.id === p.id), whenOrder: p.whenOrder });
    setBusy(true); setError('');
    try {
      for (const p of patches) {
        const cur = entries.find(e => e.id === p.id);
        const next = await updateEntry(p.id, { whenOrder: p.whenOrder, version: cur?.version });
        onEntrySaved?.(next);
      }
    } catch (e) {
      setError(isConflict(e) ? t(lang, 'Um cartão mudou em outra aba; recarreguei a linha do tempo.', 'A card changed in another tab; the timeline was reloaded.') : worldErrorText(e, lang));
      onReload?.();
    } finally { setBusy(false); }
  };

  const addExisting = async (id) => {
    const e = entries.find(x => x.id === id);
    if (!e) return;
    setAdding(false);
    const last = items[items.length - 1]?.whenOrder;
    try {
      const next = await updateEntry(id, { whenLabel: t(lang, 'Quando?', 'When?'), whenOrder: (typeof last === 'number' ? last : items.length * 10) + 10, version: e.version });
      onEntrySaved?.(next);
      onOpenEntry?.(id);
    } catch (err) { setError(worldErrorText(err, lang)); }
  };

  const sessionList = (sessions || []).slice().sort((a, b) => a.number - b.number);

  return (
    <div className="wl-timeline-wrap">
      <div className="wl-timeline-col">
        <div className="wl-timeline-head">
          <h3 className="wl-h3">⌛ {t(lang, 'História do mundo', 'World history')}</h3>
          <div className="wl-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(a => !a)}>＋ {t(lang, 'Cartão existente', 'Existing card')}</button>
            {onCreate && <button type="button" className="btn btn-primary btn-sm" onClick={() => onCreate({ kind: 'lore', whenLabel: t(lang, 'Quando?', 'When?') })}>＋ {t(lang, 'Evento', 'Event')}</button>}
          </div>
        </div>
        {adding && (
          <div className="wl-timeline-add">
            <EntryPicker entries={entries.filter(e => !(e.whenLabel || '').trim())} value={null} onChange={addExisting} lang={lang} allowNone={false} autoFocus
              placeholder={t(lang, 'Escolha um cartão', 'Pick a card')} />
          </div>
        )}
        {error && <p className="wl-error" role="alert">{error}</p>}
        {!items.length ? (
          <div className="wl-empty wl-empty-small">
            <p>{t(lang, 'A linha do tempo está vazia. Dê um "Quando" a qualquer cartão (ex.: "Ano 312 — a grande névoa") e ele aparece aqui.',
              'The timeline is empty. Give any card a "When" (e.g. "Year 312 — the great mist") and it shows up here.')}</p>
          </div>
        ) : (
          <ol className="wl-timeline" aria-busy={busy}>
            {items.map((e, i) => {
              const meta = KIND_META[e.kind] || KIND_META.lore;
              return (
                <li key={e.id}
                  className={`wl-tl-item${drag === i ? ' is-drag' : ''}${over === i && drag !== null && drag !== i ? ' is-over' : ''}`}
                  style={{ '--wl-kind': meta.color }}
                  draggable
                  onDragStart={ev => { setDrag(i); ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', String(e.id)); } catch { /* ok */ } }}
                  onDragOver={ev => { ev.preventDefault(); if (over !== i) setOver(i); }}
                  onDragEnd={() => { setDrag(null); setOver(null); }}
                  onDrop={ev => { ev.preventDefault(); if (drag !== null) move(drag, i); }}>
                  <span className="wl-tl-dot" aria-hidden="true" />
                  <div className="wl-tl-when">{e.whenLabel}</div>
                  <button type="button" className="wl-tl-card" onClick={() => onOpenEntry?.(e.id)}>
                    <span className="wl-tl-thumb"><EntryImage entry={e} className="wl-thumb-img" /></span>
                    <span className="wl-tl-text">
                      <span className="wl-tl-name">{e.name}</span>
                      <span className="wl-tl-kind">{meta.icon} {kindLabel(e.kind, lang)}{e.summary ? ` · ${e.summary}` : ''}</span>
                    </span>
                    <VisibilitySeal visibility={e.visibility} lang={lang} small />
                  </button>
                  <span className="wl-tl-move">
                    <button type="button" disabled={i === 0 || busy} onClick={() => move(i, i - 1)} aria-label={t(lang, 'Mover para antes', 'Move earlier')}>↑</button>
                    <button type="button" disabled={i === items.length - 1 || busy} onClick={() => move(i, i + 1)} aria-label={t(lang, 'Mover para depois', 'Move later')}>↓</button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="wl-hint">{t(lang, 'Arraste para reordenar. Os jogadores só veem eventos de cartões revelados.', 'Drag to reorder. Players only see events from revealed cards.')}</p>
      </div>

      <aside className="wl-timeline-side">
        <h3 className="wl-h3">📖 {t(lang, 'Na mesa', 'At the table')}</h3>
        {sessions === null ? <p className="wl-muted">…</p> : !sessionList.length ? (
          <p className="wl-muted wl-small">{t(lang, 'As sessões da Crônica aparecem aqui, em paralelo à história do mundo.', 'Chronicle sessions show up here, alongside world history.')}</p>
        ) : (
          <ol className="wl-sessions">
            {sessionList.map(s => (
              <li key={s.number}>
                <span className="wl-session-n">{t(lang, 'Sessão', 'Session')} {s.number}</span>
                {s.title && <span className="wl-session-title">{s.title}</span>}
                {s.startedAt && <span className="wl-muted wl-small">{new Date(s.startedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR')}</span>}
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}
