import { errorMessage } from '../api/errors.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import { DIARY_TYPES, buildSessionSummary, entryIcon, groupEntries, matchesFilter } from './diary-summary.js';
import './diary-styles.css';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const UNDO_MS = 5000;
const errMsg = e => errorMessage(e);

function fmtTime(iso, lang) {
  try {
    return new Date(iso).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function fmtDay(day, lang) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DiaryTab({ campaign, lang = 'pt', isDM }) {
  const [entries, setEntries] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [current, setCurrent] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [pending, setPending] = useState({}); // id -> true (exclusão aguardando "desfazer")
  const [toast, setToast] = useState(null);
  const timers = useRef({});
  const countRef = useRef(0);

  const load = useCallback(async () => {
    const limit = Math.min(200, Math.max(100, countRef.current));
    const r = await api.listDiary(campaign.id, { limit });
    setEntries(r.entries || []);
    countRef.current = (r.entries || []).length;
    setHasMore(!!r.hasMore);
    setSessions(r.sessions || []);
    setCurrent(r.currentSession ?? null);
    setLoaded(true);
  }, [campaign.id]);

  usePolling(() => load().catch(e => setError(errMsg(e))), 8000, [campaign.id]);

  const loadMore = async () => {
    try {
      const r = await api.listDiary(campaign.id, { offset: entries.length, limit: 100 });
      setEntries(prev => {
        const seen = new Set(prev.map(e => e.id));
        const next = [...prev, ...(r.entries || []).filter(e => !seen.has(e.id))];
        countRef.current = next.length;
        return next;
      });
      setHasMore(!!r.hasMore);
    } catch (e) { setError(errMsg(e)); }
  };

  // Exclusão com "desfazer": some na hora, apaga no servidor depois de UNDO_MS.
  const commitDelete = useCallback(async (id) => {
    delete timers.current[id];
    try { await api.deleteDiaryEntry(campaign.id, id); } catch (e) { setError(errMsg(e)); }
    setEntries(prev => prev.filter(e => e.id !== id));
    setPending(p => { const n = { ...p }; delete n[id]; return n; });
    setToast(tt => (tt?.id === id ? null : tt));
  }, [campaign.id]);

  const askDelete = (entry) => {
    if (!confirm(t(lang, 'Excluir esta entrada do diário?', 'Delete this diary entry?'))) return;
    setPending(p => ({ ...p, [entry.id]: true }));
    setToast({ id: entry.id, text: t(lang, 'Entrada excluída.', 'Entry deleted.') });
    timers.current[entry.id] = setTimeout(() => commitDelete(entry.id), UNDO_MS);
  };

  const undoDelete = (id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setPending(p => { const n = { ...p }; delete n[id]; return n; });
    setToast(null);
  };

  // Saiu da aba com exclusão pendente: confirma na hora.
  useEffect(() => () => {
    for (const id of Object.keys(timers.current)) {
      clearTimeout(timers.current[id]);
      api.deleteDiaryEntry(campaign.id, id).catch(() => {});
    }
  }, [campaign.id]);

  const patchEntry = async (id, body) => {
    try {
      const r = await api.updateDiaryEntry(campaign.id, id, body);
      setEntries(prev => prev.map(e => (e.id === id ? r.entry : e)));
      return true;
    } catch (e) { setError(errMsg(e)); return false; }
  };

  const visible = useMemo(
    () => entries.filter(e => !pending[e.id] && matchesFilter(e, filter)),
    [entries, pending, filter],
  );
  const groups = useMemo(() => groupEntries(visible), [visible]);
  // Resumo usa todas as entradas do grupo, não só as do filtro atual.
  const fullGroups = useMemo(
    () => Object.fromEntries(groupEntries(entries.filter(e => !pending[e.id])).map(g => [g.key, g.entries])),
    [entries, pending],
  );
  const sessionInfo = useMemo(() => Object.fromEntries(sessions.map(s => [s.number, s])), [sessions]);
  const currentTitle = current != null ? sessionInfo[current]?.title : '';

  return (
    <div className="diary col gap-3">
      {error && <p className="diary-error" role="alert" onClick={() => setError('')}>{error}</p>}

      <div className="info-box diary-head">
        <div className="info-box-head">
          <h3>{t(lang, 'Diário da campanha', 'Campaign diary')}</h3>
          <span className="muted small">
            {current != null
              ? `${t(lang, 'Sessão atual', 'Current session')}: ${current}${currentTitle ? ` — ${currentTitle}` : ''}`
              : t(lang, 'Sem sessão numerada — agrupado por dia', 'No numbered session — grouped by day')}
          </span>
        </div>
        {isDM && <StartSession campaign={campaign} lang={lang} current={current} onDone={load} onError={setError} />}
        <NoteComposer campaign={campaign} lang={lang} isDM={isDM} onDone={load} onError={setError} />
      </div>

      <div className="diary-filters" role="toolbar" aria-label={t(lang, 'Filtrar por tipo', 'Filter by type')}>
        {[{ id: 'all', icon: '', pt: 'Tudo', en: 'All' }, ...DIARY_TYPES].map(tp => (
          <button key={tp.id} className={`chip ${filter === tp.id ? 'active' : ''}`} aria-pressed={filter === tp.id}
            onClick={() => setFilter(tp.id)}>
            {tp.icon && <span className="chip-icon" aria-hidden="true">{tp.icon}</span>}{t(lang, tp.pt, tp.en)}
          </button>
        ))}
      </div>

      {!loaded && <p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p>}
      {loaded && groups.length === 0 && (
        <p className="muted diary-empty">
          {filter === 'all'
            ? t(lang, 'O diário está vazio. Subidas de nível, XP, itens entregues, descansos e rolagens marcantes aparecem aqui automaticamente.',
                'The diary is empty. Level-ups, XP, items given, rests and notable rolls show up here automatically.')
            : t(lang, 'Nada deste tipo por enquanto.', 'Nothing of this type yet.')}
        </p>
      )}

      {groups.map(g => (
        <SessionGroup key={g.key} group={g} info={g.session != null ? sessionInfo[g.session] : null}
          allEntries={fullGroups[g.key] || g.entries}
          campaign={campaign} lang={lang} isDM={isDM} onReload={load} onError={setError}
          onPatch={patchEntry} onDelete={askDelete} />
      ))}

      {hasMore && (
        <button className="btn btn-ghost btn-sm diary-more" onClick={loadMore}>{t(lang, 'Carregar mais antigas', 'Load older')}</button>
      )}

      {toast && (
        <div className="diary-toast" role="status">
          <span>{toast.text}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => undoDelete(toast.id)}>{t(lang, 'Desfazer', 'Undo')}</button>
        </div>
      )}
    </div>
  );
}

function StartSession({ campaign, lang, current, onDone, onError }) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState('');
  const [title, setTitle] = useState('');
  const next = (current ?? 0) + 1;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.startDiarySession(campaign.id, { number: number === '' ? next : parseInt(number, 10), title });
      setOpen(false); setNumber(''); setTitle('');
      onDone();
    } catch (err) { onError(errMsg(err)); }
  };

  if (!open) {
    return (
      <button className="btn btn-primary btn-sm diary-start" onClick={() => setOpen(true)}>
        📖 {t(lang, `Começar sessão ${next}`, `Start session ${next}`)}
      </button>
    );
  }
  return (
    <form className="diary-form" onSubmit={submit}>
      <div className="diary-form-row">
        <label className="col gap-1 diary-num">
          <span className="eyebrow">{t(lang, 'Nº', 'No.')}</span>
          <input aria-label={String(next)} className="input" type="number" min="0" inputMode="numeric" value={number} placeholder={String(next)}
            onChange={e => setNumber(e.target.value)} />
        </label>
        <label className="col gap-1 grow">
          <span className="eyebrow">{t(lang, 'Título (opcional)', 'Title (optional)')}</span>
          <input aria-label={t(lang, 'ex: A cripta', 'e.g.: The crypt')} className="input" value={title} maxLength={200} placeholder={t(lang, 'ex: A cripta', 'e.g.: The crypt')}
            onChange={e => setTitle(e.target.value)} />
        </label>
      </div>
      <div className="diary-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>{t(lang, 'Cancelar', 'Cancel')}</button>
        <button type="submit" className="btn btn-primary btn-sm">{t(lang, 'Começar', 'Start')}</button>
      </div>
    </form>
  );
}

function NoteComposer({ campaign, lang, isDM, onDone, onError }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim() && !title.trim()) return;
    setBusy(true);
    try {
      await api.createDiaryNote(campaign.id, { title, body, ...(isDM && hidden ? { hidden: true } : {}) });
      setTitle(''); setBody(''); setHidden(false);
      onDone();
    } catch (err) { onError(errMsg(err)); }
    setBusy(false);
  };

  return (
    <form className="diary-form" onSubmit={submit}>
      <input className="input" value={title} maxLength={200} onChange={e => setTitle(e.target.value)}
        placeholder={t(lang, 'Título da nota (opcional)', 'Note title (optional)')} aria-label={t(lang, 'Título', 'Title')} />
      <textarea className="input" rows={3} value={body} onChange={e => setBody(e.target.value)}
        placeholder={t(lang, 'O que aconteceu? Pistas, nomes, promessas…', 'What happened? Clues, names, promises…')}
        aria-label={t(lang, 'Texto da nota', 'Note text')} />
      <div className="diary-actions">
        {isDM && (
          <label className="diary-check">
            <input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} />
            {t(lang, 'Oculta dos jogadores', 'Hidden from players')}
          </label>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || (!body.trim() && !title.trim())}>
          ✎ {t(lang, 'Adicionar nota', 'Add note')}
        </button>
      </div>
    </form>
  );
}

function SessionGroup({ group, info, allEntries, campaign, lang, isDM, onReload, onError, onPatch, onDelete }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(info?.title || '');
  const [summary, setSummary] = useState(null);

  useEffect(() => { if (!editingTitle) setTitle(info?.title || ''); }, [info?.title, editingTitle]);

  const saveTitle = async (e) => {
    e.preventDefault();
    try { await api.renameDiarySession(campaign.id, group.session, title); setEditingTitle(false); onReload(); }
    catch (err) { onError(errMsg(err)); }
  };

  const openSummary = () => setSummary(buildSessionSummary(allEntries, { lang, session: group.session, title: info?.title }));

  const saveSummary = async () => {
    const label = group.session != null ? `${t(lang, 'Sessão', 'Session')} ${group.session}` : fmtDay(group.day, lang);
    try {
      await api.createDiaryNote(campaign.id, {
        subtype: 'summary', title: `${t(lang, 'Resumo', 'Recap')} — ${label}`, body: summary,
        session: group.session,
      });
      setSummary(null);
      onReload();
    } catch (err) { onError(errMsg(err)); }
  };

  return (
    <section className="diary-group" aria-label={group.session != null ? `${t(lang, 'Sessão', 'Session')} ${group.session}` : group.day}>
      <header className="diary-group-head">
        {editingTitle ? (
          <form className="diary-title-form" onSubmit={saveTitle}>
            <span className="diary-group-num">{t(lang, 'Sessão', 'Session')} {group.session} —</span>
            <input className="input" autoFocus value={title} maxLength={200} onChange={e => setTitle(e.target.value)}
              aria-label={t(lang, 'Título da sessão', 'Session title')} />
            <button type="submit" className="btn btn-primary btn-sm">{t(lang, 'Salvar', 'Save')}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingTitle(false)}>✕</button>
          </form>
        ) : (
          <h4 className="diary-group-title">
            {group.session != null
              ? <>{t(lang, 'Sessão', 'Session')} {group.session}{info?.title ? <span className="diary-group-sub"> — {info.title}</span> : null}</>
              : fmtDay(group.day, lang)}
          </h4>
        )}
        {isDM && !editingTitle && (
          <div className="diary-group-tools">
            {group.session != null && (
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingTitle(true)}
                aria-label={t(lang, 'Renomear sessão', 'Rename session')}>✎</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={openSummary}>📜 {t(lang, 'Resumo da sessão', 'Session recap')}</button>
          </div>
        )}
      </header>

      {summary != null && (
        <div className="diary-summary">
          <p className="muted small">{t(lang, 'Montado a partir dos eventos (ocultos ficam de fora). Edite à vontade antes de salvar.',
            'Built from the events (hidden ones are left out). Edit freely before saving.')}</p>
          <textarea className="input" rows={Math.min(16, summary.split('\n').length + 2)} value={summary}
            onChange={e => setSummary(e.target.value)} aria-label={t(lang, 'Texto do resumo', 'Recap text')} />
          <div className="diary-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setSummary(null)}>{t(lang, 'Cancelar', 'Cancel')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(summary)}>{t(lang, 'Copiar', 'Copy')}</button>
            <button className="btn btn-primary btn-sm" onClick={saveSummary}>{t(lang, 'Salvar como nota', 'Save as note')}</button>
          </div>
        </div>
      )}

      <ol className="diary-timeline">
        {group.entries.map(e => (
          <DiaryItem key={e.id} entry={e} lang={lang} isDM={isDM} onPatch={onPatch} onDelete={onDelete} />
        ))}
      </ol>
    </section>
  );
}

function DiaryItem({ entry, lang, isDM, onPatch, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);

  const startEdit = () => { setTitle(entry.title); setBody(entry.body); setEditing(true); };
  const save = async (e) => {
    e.preventDefault();
    if (await onPatch(entry.id, { title, body })) setEditing(false);
  };

  const cls = ['diary-item', `is-${entry.kind}`, `sub-${entry.subtype}`, entry.hidden ? 'is-hidden' : ''].filter(Boolean).join(' ');
  return (
    <li className={cls}>
      <span className="diary-icon" aria-hidden="true">{entryIcon(entry)}</span>
      <div className="diary-card">
        {editing ? (
          <form className="diary-form" onSubmit={save}>
            <input className="input" value={title} maxLength={200} onChange={e => setTitle(e.target.value)}
              aria-label={t(lang, 'Título', 'Title')} />
            <textarea className="input" rows={Math.max(3, Math.min(14, body.split('\n').length + 1))} value={body}
              onChange={e => setBody(e.target.value)} aria-label={t(lang, 'Texto', 'Text')} />
            <div className="diary-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>{t(lang, 'Cancelar', 'Cancel')}</button>
              <button type="submit" className="btn btn-primary btn-sm">{t(lang, 'Salvar', 'Save')}</button>
            </div>
          </form>
        ) : (
          <>
            <div className="diary-card-head">
              {entry.title && <strong className="diary-card-title">{entry.title}</strong>}
              {entry.hidden && <span className="diary-tag">{t(lang, 'oculta', 'hidden')}</span>}
            </div>
            {entry.body && <p className="diary-body">{entry.body}</p>}
            <div className="diary-meta">
              <span>{fmtTime(entry.occurredAt, lang)}</span>
              {entry.kind === 'note' && entry.createdBy && <span>· {entry.createdBy.name}</span>}
              {entry.editedAt && <span>· {t(lang, 'editada', 'edited')}</span>}
              {entry.canEdit && (
                <span className="diary-item-tools">
                  <button className="btn btn-ghost btn-sm" onClick={startEdit}>{t(lang, 'Editar', 'Edit')}</button>
                  {isDM && (
                    <button className="btn btn-ghost btn-sm" onClick={() => onPatch(entry.id, { hidden: !entry.hidden })}>
                      {entry.hidden ? t(lang, 'Mostrar', 'Show') : t(lang, 'Ocultar', 'Hide')}
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm diary-del" onClick={() => onDelete(entry)}>{t(lang, 'Excluir', 'Delete')}</button>
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}
