import { errorMessage } from '../api/errors.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import { DIARY_TYPES, buildRecap, entryBody, entryIcon, entryTitle, groupEntries, matchesFilter, pickRecapGroup } from './diary-summary.js';
import MoreMenu from '../group/MoreMenu.jsx';
import { groupApi } from '../group/group-api.js';
import { copyText } from '../group/InviteCard.jsx';
import './diary-styles.css';
import '../group/group-styles.css';

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

// showStartSession: false quando a casca já tem o "Começar sessão" no cabeçalho
// (um só lugar para começar a sessão).
export default function DiaryTab({ campaign, lang = 'pt', isDM, onCampaignChange, showStartSession = true }) {
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

  // Sem confirm() nativo: a entrada some na hora e o toast oferece "Desfazer".
  const askDelete = (entry) => {
    setPending(p => ({ ...p, [entry.id]: true }));
    setToast({ id: entry.id, text: t(lang, 'Entrada excluída.', 'Entry deleted.'), undo: true });
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
  const sessionInfo = useMemo(() => Object.fromEntries(sessions.map(s => [s.number, s])), [sessions]);
  const currentTitle = current != null ? sessionInfo[current]?.title : '';

  // "Anteriormente em…": rascunho editável a partir da última sessão com eventos.
  const [recap, setRecap] = useState(null); // {key, session, title, text}
  const openRecap = useCallback((key) => {
    const all = groupEntries(entries.filter(e => !pending[e.id]));
    const g = all.find(x => x.key === key) || all.find(x => x.key === pickRecapGroup(all));
    const info = g?.session != null ? sessionInfo[g.session] : null;
    const draft = buildRecap(g?.entries || [], { lang, session: g?.session ?? null, title: info?.title, campaignName: campaign.name });
    setRecap({ key: g?.key || null, session: g?.session ?? null, ...draft });
  }, [entries, pending, sessionInfo, lang, campaign.name]);
  const onScreen = campaign.state?.screenCard;
  const flash = (text) => setToast({ id: `m${Date.now()}`, text });
  useEffect(() => {
    if (!toast || toast.undo) return undefined;
    const id = setTimeout(() => setToast(tt => (tt === toast ? null : tt)), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const showOnScreen = async (title, text) => {
    try {
      await groupApi.showOnScreen(campaign.id, { type: 'recap', title: String(title || '').slice(0, 200), text: String(text || '').slice(0, 5000) });
      flash(t(lang, '📺 No telão agora.', '📺 On the TV now.'));
      onCampaignChange?.();
      return true;
    } catch (e) { setError(errMsg(e)); return false; }
  };
  const clearScreen = async () => {
    try { await groupApi.showOnScreen(campaign.id, null); flash(t(lang, 'Telão de volta à capa.', 'TV back to the cover.')); onCampaignChange?.(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <div className="diary col gap-3">
      {error && <p className="diary-error" role="alert" onClick={() => setError('')}>{error}</p>}

      <div className="info-box diary-head">
        <div className="info-box-head">
          <h3>📜 {t(lang, 'Crônica da campanha', 'Campaign chronicle')}</h3>
          <span className="muted small">
            {current != null
              ? `${t(lang, 'Sessão atual', 'Current session')}: ${current}${currentTitle ? ` — ${currentTitle}` : ''}`
              : t(lang, 'Sem sessão numerada — agrupado por dia', 'No numbered session — grouped by day')}
          </span>
        </div>
        {isDM && showStartSession && <StartSession campaign={campaign} lang={lang} current={current} onDone={load} onError={setError} />}
        <NoteComposer campaign={campaign} lang={lang} isDM={isDM} onDone={load} onError={setError} />
      </div>

      {isDM && loaded && (
        recap ? (
          <RecapEditor campaign={campaign} lang={lang} recap={recap} onScreen={onScreen}
            onShow={showOnScreen} onClearScreen={clearScreen} onClose={() => setRecap(null)}
            onSaved={() => { setRecap(null); flash(t(lang, 'Recap salvo na crônica.', 'Recap saved to the chronicle.')); load(); }}
            onCopied={() => flash(t(lang, 'Texto copiado.', 'Text copied.'))}
            onError={setError} />
        ) : (
          <div className="diary-recap-cta">
            <div>
              <strong className="diary-recap-cta-title">✨ {t(lang, 'Anteriormente em…', 'Previously on…')}</strong>
              <span className="muted small">
                {onScreen?.type === 'recap'
                  ? t(lang, 'O recap está no telão agora.', 'The recap is on the TV now.')
                  : t(lang, 'Monte o resumo da última sessão para abrir a próxima. Você edita antes de mostrar.', 'Draft a recap of last session to open the next one. You edit it before showing.')}
              </span>
            </div>
            <div className="diary-actions">
              {onScreen?.type === 'recap' && <button type="button" className="btn btn-ghost btn-sm" onClick={clearScreen}>{t(lang, 'Tirar do telão', 'Remove from TV')}</button>}
              <button type="button" className="btn btn-primary btn-sm" onClick={() => openRecap(null)} disabled={!entries.length}>
                {t(lang, 'Montar recap', 'Draft recap')}
              </button>
            </div>
          </div>
        )
      )}

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
            ? t(lang, 'A crônica ainda está em branco. Combates, revelações, subidas de nível, XP, itens entregues e rolagens marcantes aparecem aqui sozinhos — e você pode escrever notas acima.',
                'The chronicle is still blank. Combats, reveals, level-ups, XP, items given and notable rolls show up here on their own — and you can write notes above.')
            : t(lang, 'Nada deste tipo por enquanto.', 'Nothing of this type yet.')}
        </p>
      )}

      {groups.map(g => (
        <SessionGroup key={g.key} group={g} info={g.session != null ? sessionInfo[g.session] : null}
          campaign={campaign} lang={lang} isDM={isDM} onReload={load} onError={setError}
          onPatch={patchEntry} onDelete={askDelete} onRecap={() => openRecap(g.key)}
          onShowEntry={(e) => showOnScreen(entryTitle(e, lang) || t(lang, 'Anteriormente…', 'Previously…'), entryBody(e, lang))} />
      ))}

      {hasMore && (
        <button className="btn btn-ghost btn-sm diary-more" onClick={loadMore}>{t(lang, 'Carregar mais antigas', 'Load older')}</button>
      )}

      {toast && (
        <div className="diary-toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && <button className="btn btn-ghost btn-sm" onClick={() => undoDelete(toast.id)}>{t(lang, 'Desfazer', 'Undo')}</button>}
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

function SessionGroup({ group, info, campaign, lang, isDM, onReload, onError, onPatch, onDelete, onRecap, onShowEntry }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(info?.title || '');

  useEffect(() => { if (!editingTitle) setTitle(info?.title || ''); }, [info?.title, editingTitle]);

  const saveTitle = async (e) => {
    e.preventDefault();
    try { await api.renameDiarySession(campaign.id, group.session, title); setEditingTitle(false); onReload(); }
    catch (err) { onError(errMsg(err)); }
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
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingTitle(false)} aria-label={t(lang, 'Cancelar', 'Cancel')}>✕</button>
          </form>
        ) : (
          <h4 className="diary-group-title">
            {group.session != null
              ? <>{t(lang, 'Sessão', 'Session')} {group.session}{info?.title ? <span className="diary-group-sub"> — {info.title}</span> : null}</>
              : fmtDay(group.day, lang)}
          </h4>
        )}
        {isDM && !editingTitle && (
          <MoreMenu label={t(lang, 'Ações da sessão', 'Session actions')} items={[
            { id: 'recap', label: `📜 ${t(lang, 'Recap desta sessão', 'Recap this session')}`, onSelect: onRecap },
            { id: 'rename', label: `✎ ${t(lang, 'Renomear sessão', 'Rename session')}`, onSelect: () => setEditingTitle(true), hidden: group.session == null },
          ]} />
        )}
      </header>

      <ol className="diary-timeline">
        {group.entries.map(e => (
          <DiaryItem key={e.id} entry={e} lang={lang} isDM={isDM} onPatch={onPatch} onDelete={onDelete} onShow={onShowEntry} />
        ))}
      </ol>
    </section>
  );
}

function DiaryItem({ entry, lang, isDM, onPatch, onDelete, onShow }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);

  const startEdit = () => { setTitle(entry.title); setBody(entry.body); setEditing(true); };
  const save = async (e) => {
    e.preventDefault();
    if (await onPatch(entry.id, { title, body })) setEditing(false);
  };

  const shownTitle = entryTitle(entry, lang);
  const shownBody = entryBody(entry, lang);
  const cls = ['diary-item', `is-${entry.kind}`, `sub-${entry.subtype}`, entry.hidden ? 'is-hidden' : ''].filter(Boolean).join(' ');
  const menu = entry.canEdit ? [
    { id: 'edit', label: `✎ ${t(lang, 'Editar', 'Edit')}`, onSelect: startEdit },
    { id: 'hide', label: entry.hidden ? `👁 ${t(lang, 'Mostrar aos jogadores', 'Show to players')}` : `🙈 ${t(lang, 'Ocultar dos jogadores', 'Hide from players')}`,
      onSelect: () => onPatch(entry.id, { hidden: !entry.hidden }), hidden: !isDM },
    { id: 'tv', label: `📺 ${t(lang, 'Mostrar no telão', 'Show on TV')}`, onSelect: () => onShow?.(entry),
      hidden: !isDM || entry.hidden || !(shownBody || shownTitle) },
    { id: 'del', label: `🗑 ${t(lang, 'Excluir', 'Delete')}`, onSelect: () => onDelete(entry), danger: true },
  ] : [];
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
              {shownTitle && <strong className="diary-card-title">{shownTitle}</strong>}
              {entry.hidden && <span className="diary-tag">{t(lang, 'oculta', 'hidden')}</span>}
              <MoreMenu items={menu} label={t(lang, 'Ações da entrada', 'Entry actions')} className="diary-more-menu" />
            </div>
            {shownBody && <p className="diary-body">{shownBody}</p>}
            <div className="diary-meta">
              <span>{fmtTime(entry.occurredAt, lang)}</span>
              {entry.kind === 'note' && entry.createdBy && <span>· {entry.createdBy.name}</span>}
              {entry.editedAt && <span>· {t(lang, 'editada', 'edited')}</span>}
            </div>
          </>
        )}
      </div>
    </li>
  );
}

/**
 * Editor do "Anteriormente em…": rascunho montado dos eventos (sem IA), que o
 * mestre edita antes de mostrar no telão ou salvar na crônica. Nada vai à TV
 * sem o clique dele.
 */
function RecapEditor({ campaign, lang, recap, onScreen, onShow, onClearScreen, onClose, onSaved, onCopied, onError }) {
  const [title, setTitle] = useState(recap.title);
  const [text, setText] = useState(recap.text);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setTitle(recap.title); setText(recap.text); }, [recap]);
  const live = onScreen?.type === 'recap' && onScreen.title === title.trim() && onScreen.text === text;
  const tooLong = text.length > 5000;

  const save = async () => {
    setBusy(true);
    try {
      await api.createDiaryNote(campaign.id, { subtype: 'summary', title: title.trim().slice(0, 200), body: text, session: recap.session });
      onSaved();
    } catch (err) { onError(errMsg(err)); }
    setBusy(false);
  };
  const show = async () => { setBusy(true); await onShow(title.trim(), text); setBusy(false); };

  return (
    <section className="diary-recap" aria-labelledby="diary-recap-h">
      <div className="diary-recap-head">
        <span className="eyebrow" id="diary-recap-h">✨ {t(lang, 'Anteriormente em…', 'Previously on…')}</span>
        {recap.session != null && <span className="muted small">{t(lang, 'a partir da sessão', 'from session')} {recap.session}</span>}
      </div>
      <p className="muted small diary-recap-hint">
        {t(lang, 'Rascunho montado com o que ficou na crônica (o que está oculto fica de fora). Edite à vontade: só vai para o telão quando você mandar.',
          'Draft built from the chronicle (hidden entries are left out). Edit freely: it only goes to the TV when you say so.')}
      </p>
      <input className="input diary-recap-title" value={title} maxLength={200} onChange={e => setTitle(e.target.value)}
        aria-label={t(lang, 'Título do recap', 'Recap title')} />
      <textarea className="input diary-recap-text" rows={Math.min(14, Math.max(5, text.split('\n').length + 2))} value={text}
        onChange={e => setText(e.target.value)} aria-label={t(lang, 'Texto do recap', 'Recap text')} />
      {tooLong && <p className="diary-error small">{t(lang, 'Texto longo demais para o telão (máx. 5000 caracteres).', 'Too long for the TV (max 5000 characters).')}</p>}
      <div className="diary-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t(lang, 'Fechar', 'Close')}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { if (await copyText(`${title}\n\n${text}`)) onCopied(); }}>{t(lang, 'Copiar', 'Copy')}</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy || (!text.trim() && !title.trim())} onClick={save}>{t(lang, 'Salvar na crônica', 'Save to chronicle')}</button>
        {live
          ? <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onClearScreen}>{t(lang, 'Tirar do telão', 'Remove from TV')}</button>
          : <button type="button" className="btn btn-primary btn-sm" disabled={busy || tooLong || (!text.trim() && !title.trim())} onClick={show}>📺 {t(lang, 'Mostrar no telão', 'Show on TV')}</button>}
      </div>
      {live && <p className="diary-recap-live small" role="status">● {t(lang, 'No telão agora', 'On the TV now')}</p>}
    </section>
  );
}
