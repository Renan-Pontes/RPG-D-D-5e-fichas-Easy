// Linha do tempo do Mundo: cartões com "Quando" (whenLabel), em ordem
// ajustável arrastando (PC) ou com ↑ ↓ (os dois, 50 × 48 com o nome escrito). Ao
// lado (embaixo no celular), as sessões da Crônica: "📖 Na mesa".
// readOnly (campanha encerrada): sem ＋, sem ↑ ↓ e sem arrastar.
import { useEffect, useMemo, useRef, useState } from 'react';
import { request } from '../api/client.js';
import { isConflict, updateEntry, worldErrorText } from './world-api.js';
import { EntryImage, VisibilitySeal } from './EntryCard.jsx';
import { EntryPicker } from './LinksField.jsx';
import { KIND_META, isTouchUi, kindLabel, reorderPatches, t, timelineEntries } from './world-model.js';

export default function Timeline({ campaign, entries = [], lang = 'pt', readOnly = false, onOpenEntry, onEntrySaved, onReload, onCreate }) {
  const items = useMemo(() => timelineEntries(entries), [entries]);
  const [drag, setDrag] = useState(null); // índice arrastado
  const [over, setOver] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState(null);
  const [adding, setAdding] = useState(false);
  const [touch] = useState(isTouchUi);
  const canMove = !readOnly && items.length > 1;

  useEffect(() => {
    let alive = true;
    request(`/api/campaigns/${encodeURIComponent(campaign.id)}/diary?limit=1`)
      .then(r => alive && setSessions(r.sessions || []))
      .catch(() => alive && setSessions([]));
    return () => { alive = false; };
  }, [campaign.id]);

  const movedAt = useRef(0);
  const move = async (from, to) => {
    setDrag(null); setOver(null);
    movedAt.current = Date.now();
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
  // ↑ ↓ ignoram toques por 400 ms depois de cada movimento (além do tempo da
  // resposta, em que ficam desligados): o cartão troca de linha debaixo do dedo e
  // o 2º toque de um toque duplo moveria o vizinho que acabou de subir,
  // desfazendo o 1º (Princípio 8, como o Mostrar do marcador)
  const tapMove = (from, to) => {
    if (Date.now() - movedAt.current < 400) return;
    move(from, to);
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
          {onCreate && !readOnly && (
            <div className="wl-timeline-add-btns">
              <button type="button" className={`mesa-btn${adding ? ' is-on' : ''}`} aria-expanded={adding} onClick={() => setAdding(a => !a)}>＋ {t(lang, 'Cartão existente', 'Existing card')}</button>
              <button type="button" className="mesa-btn is-primary" onClick={() => onCreate({ kind: 'lore', whenLabel: t(lang, 'Quando?', 'When?') })}>＋ {t(lang, 'Evento', 'Event')}</button>
            </div>
          )}
        </div>
        {adding && !readOnly && (
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
                  draggable={canMove && !touch}
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
                      <span className="wl-tl-meta">
                        <VisibilitySeal visibility={e.visibility} lang={lang} short />
                        <span className="wl-tl-kind">{meta.icon} {kindLabel(e.kind, lang)}{e.summary ? ` · ${e.summary}` : ''}</span>
                      </span>
                    </span>
                  </button>
                  {canMove && (
                    <span className="wl-tl-move">
                      <button type="button" className="wl-move-btn" disabled={i === 0 || busy} onClick={() => tapMove(i, i - 1)}
                        aria-label={`${t(lang, 'Mover para antes', 'Move earlier')}: ${e.name}${i === 0 ? ` — ${t(lang, 'já é o primeiro', 'already first')}` : ''}`}>
                        <span aria-hidden="true">↑</span><span aria-hidden="true" className="wl-move-txt">{t(lang, 'Antes', 'Earlier')}</span>
                      </button>
                      <button type="button" className="wl-move-btn" disabled={i === items.length - 1 || busy} onClick={() => tapMove(i, i + 1)}
                        aria-label={`${t(lang, 'Mover para depois', 'Move later')}: ${e.name}${i === items.length - 1 ? ` — ${t(lang, 'já é o último', 'already last')}` : ''}`}>
                        <span aria-hidden="true">↓</span><span aria-hidden="true" className="wl-move-txt">{t(lang, 'Depois', 'Later')}</span>
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <p className="wl-hint">{canMove
          ? (touch
            ? t(lang, 'Use ↑ ↓ para mudar a ordem. ', 'Use ↑ ↓ to change the order. ')
            : t(lang, 'Arraste ou use ↑ ↓ para mudar a ordem. ', 'Drag or use ↑ ↓ to change the order. '))
          : ''}{t(lang, 'Os jogadores só veem eventos de cartões revelados.', 'Players only see events from revealed cards.')}</p>
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
