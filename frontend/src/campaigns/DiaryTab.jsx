import { errorMessage } from '../api/errors.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import { DIARY_TYPES, buildRecap, entryBody, entryIcon, entryTitle, groupEntries, matchesFilter, pickRecapGroup } from './diary-summary.js';
import MoreMenu from '../group/MoreMenu.jsx';
import { copyText } from '../group/InviteCard.jsx';
import useTouchHold from '../group/useTouchHold.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import useScrollEdges from '../shell/useScrollEdges.js';
import './diary-styles.css';
import '../group/group-styles.css';
import { sendToStage, showOnStage, stageBack } from '../stage/stage-api.js';
import { frontPlace, stageNow } from '../stage/stage-now.js';
import useStage from '../stage/useStage.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const UNDO_MS = 5000;
const errMsg = e => errorMessage(e);
const FILTERS = [{ id: 'all', icon: '', pt: 'Tudo', en: 'All' }, ...DIARY_TYPES];

function fmtTime(iso, lang) {
  try {
    return new Date(iso).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function fmtDay(day, lang) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Crônica da campanha: Grupo › Crônica (mestre) e a área Crônica (jogador).
 * Começa pela história: cabeçalho curto com [✎ Nova nota] e [✨ Anteriormente
 * em…], os 10 filtros num trilho de 44 px e as sessões. A nota nova e o editor
 * do recap abrem em folha (MesaSheet), com a ação principal presa no rodapé.
 * Lê a crônica a cada 8 s (como sempre). O erro de uma folha aparece nela
 * (o aviso do topo ficaria atrás do fundo da folha). Campanha encerrada: sem
 * "Nova nota", com o motivo por escrito.
 * showStartSession: false quando a casca já tem o "Começar sessão" no cabeçalho
 * (um só lugar para começar a sessão).
 * autoRecap: veio de "Encerrar e escrever o recap" — abre o rascunho do recap assim que a
 * crônica chega (uma vez) e avisa onAutoRecap() para a casca limpar o pedido.
 */
export default function DiaryTab({ campaign, lang = 'pt', isDM, onCampaignChange, showStartSession = true, autoRecap = false, onAutoRecap }) {
  const [entries, setEntries] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [current, setCurrent] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [pending, setPending] = useState({}); // id -> true (exclusão aguardando "desfazer")
  const [toast, setToast] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const timers = useRef({});
  const countRef = useRef(0);
  const railRef = useRef(null);
  useScrollEdges(railRef, { active: filter, count: FILTERS.length });

  // o que chega pelo polling logo depois de um toque espera 600 ms (nada mexe debaixo do dedo)
  const hold = useTouchHold();
  const load = useCallback(async (fromPoll = false) => {
    const limit = Math.min(200, Math.max(100, countRef.current));
    const r = await api.listDiary(campaign.id, { limit });
    const apply = () => {
      setEntries(r.entries || []);
      countRef.current = (r.entries || []).length;
      setHasMore(!!r.hasMore);
      setSessions(r.sessions || []);
      setCurrent(r.currentSession ?? null);
      setLoaded(true);
    };
    if (fromPoll) hold(apply, 'diary'); else apply();
  }, [campaign.id, hold]);

  usePolling(() => load(true).catch(e => setError(errMsg(e))), 8000, [campaign.id]);

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
  // "Encerrar e escrever o recap": abre o editor quando a crônica chega (uma vez)
  const autoRecapDone = useRef(false);
  useEffect(() => {
    if (!autoRecap || !isDM || autoRecapDone.current || !loaded || recap || !entries.length) return;
    autoRecapDone.current = true;
    openRecap(null);
    onAutoRecap?.();
  }, [autoRecap, isDM, loaded, recap, entries.length, openRecap, onAutoRecap]);

  // O recap na Tela pela regra de sempre (stage-now): na TV, esperando o combate ou atrás
  // da Tela escurecida — nunca pelo screenCard de compatibilidade (princípio 7).
  const stage = useStage(campaign);
  const recapPlace = frontPlace(stageNow({ stage, combat: campaign.combatNow }), 'recap');
  const stageRecap = campaign.state?.stageRecap;
  const onScreen = recapPlace ? { place: recapPlace, title: stageRecap?.title || '', text: stageRecap?.text || '' } : null;
  const flash = (text) => setToast({ id: `m${Date.now()}`, text });
  useEffect(() => {
    if (!toast || toast.undo) return undefined;
    const id = setTimeout(() => setToast(tt => (tt === toast ? null : tt)), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  // O 📺 do resumo vai ao palco da Tela, com o aviso de sempre ("Na tela ✓ · ↶ Desfazer"
  // ou "Não enviado · <motivo>", que aparece por cima da folha do recap).
  const showOnScreen = async (title, text) => {
    const r = await sendToStage(campaign.id, () => showOnStage(campaign.id, {
      kind: 'recap', title: String(title || '').slice(0, 200), text: String(text || '').slice(0, 5000),
    }), { lang, name: t(lang, 'Anteriormente em…', 'Previously on…'), onDone: () => onCampaignChange?.() });
    return !!r;
  };
  const clearScreen = () => sendToStage(campaign.id, () => stageBack(campaign.id),
    { lang, done: t(lang, 'Tirado da Tela ✓', 'Removed from the screen ✓'), onDone: () => onCampaignChange?.() });
  const closed = campaign.status === 'closed';

  return (
    <div className={`diary ${isDM ? 'is-dm' : 'is-player'} ${closed ? 'is-closed' : ''}`}>
      {error && <p className="diary-error" role="alert" onClick={() => setError('')}>{error}</p>}

      <section className="diary-head mesa-panel" aria-labelledby="diary-head-h">
        <MesaTitle id="diary-head-h"
          sub={<span>{current != null
            ? `${t(lang, 'Sessão atual', 'Current session')}: ${current}${currentTitle ? ` — ${currentTitle}` : ''}`
            : t(lang, 'Sem sessão numerada — agrupado por dia', 'No numbered session — grouped by day')}</span>}>
          📜 {t(lang, 'Crônica', 'Chronicle')}
        </MesaTitle>
        {isDM && showStartSession && <StartSession campaign={campaign} lang={lang} current={current} onDone={load} onError={setError} />}
        {closed && (
          <p className="diary-readonly">{t(lang, 'Campanha encerrada: a crônica fica só para ler.', 'Campaign closed: the chronicle is read-only.')}</p>
        )}
        {(!closed || isDM) && (
          <div className="diary-head-actions">
            {!closed && (
              <button type="button" className="mesa-btn diary-new-note" onClick={() => setNoteOpen(true)}>
                ✎ {t(lang, 'Nova nota', 'New note')}
              </button>
            )}
            {/* encerrada: o recap continua (ler e copiar); a Tela e o salvar dizem o motivo na folha */}
            {isDM && (
              <button type="button" className="mesa-btn diary-recap-open" onClick={() => openRecap(null)} disabled={!loaded || !entries.length}
                aria-label={t(lang, 'Anteriormente em…: montar recap', 'Previously on…: draft recap')}>
                ✨ {t(lang, 'Anteriormente em…', 'Previously on…')}
              </button>
            )}
          </div>
        )}
        {isDM && onScreen && (
          <div className="diary-on-tv" role="status">
            <span>📺 {onScreen.place === 'front' ? t(lang, 'O recap está na Tela agora.', 'The recap is on screen now.')
              : onScreen.place === 'waiting' ? t(lang, 'O recap espera o fim do combate.', 'The recap waits for combat to end.')
                : t(lang, 'O recap está atrás da Tela escurecida.', 'The recap is behind the blacked-out screen.')}</span>
            <button type="button" className="mesa-btn" onClick={() => clearScreen()}>{t(lang, 'Tirar da Tela', 'Remove from screen')}</button>
          </div>
        )}
      </section>

      <div className="diary-filters mesa-scroll" ref={railRef} role="toolbar" aria-label={t(lang, 'Filtrar por tipo', 'Filter by type')}>
        {FILTERS.map(tp => (
          <button key={tp.id} type="button" className={`mesa-chip ${filter === tp.id ? 'active' : ''}`} aria-pressed={filter === tp.id}
            onClick={() => setFilter(tp.id)}>
            {tp.icon && <span className="chip-icon" aria-hidden="true">{tp.icon}</span>}{t(lang, tp.pt, tp.en)}
          </button>
        ))}
      </div>

      {!loaded && <p className="diary-none">{t(lang, 'Carregando…', 'Loading…')}</p>}
      {loaded && groups.length === 0 && (
        <p className="diary-none diary-empty">
          {filter === 'all'
            ? t(lang, 'A crônica ainda está em branco. Combates, revelações, subidas de nível, XP, itens entregues e rolagens marcantes aparecem aqui sozinhos — e você pode escrever notas em "Nova nota".',
                'The chronicle is still blank. Combats, reveals, level-ups, XP, items given and notable rolls show up here on their own — and you can write notes with "New note".')
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
        <button type="button" className="mesa-btn diary-more" onClick={loadMore}>{t(lang, 'Carregar mais antigas', 'Load older')}</button>
      )}

      {noteOpen && (
        <NoteSheet campaign={campaign} lang={lang} isDM={isDM} onClose={() => setNoteOpen(false)}
          onDone={() => { setNoteOpen(false); flash(t(lang, 'Nota adicionada à crônica.', 'Note added to the chronicle.')); load().catch(() => {}); }} />
      )}
      {isDM && recap && (
        <RecapSheet campaign={campaign} lang={lang} recap={recap} onScreen={onScreen}
          onShow={showOnScreen} onClearScreen={clearScreen} onClose={() => setRecap(null)}
          onSaved={() => { setRecap(null); flash(t(lang, 'Recap salvo na crônica.', 'Recap saved to the chronicle.')); load(); }}
          onCopied={() => flash(t(lang, 'Texto copiado.', 'Text copied.'))} />
      )}

      {toast && (
        <div className="diary-toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && <button type="button" className="mesa-btn" onClick={() => undoDelete(toast.id)}>{t(lang, 'Desfazer', 'Undo')}</button>}
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
      <button type="button" className="mesa-btn is-primary diary-start" onClick={() => setOpen(true)}>
        📖 {t(lang, `Começar sessão ${next}`, `Start session ${next}`)}
      </button>
    );
  }
  return (
    <form className="diary-form diary-start-form" onSubmit={submit}>
      <div className="diary-form-row">
        <label className="mesa-field diary-num">
          <span className="mesa-field-label">{t(lang, 'Nº', 'No.')}</span>
          <input aria-label={String(next)} className="input" type="number" min="0" inputMode="numeric" value={number} placeholder={String(next)}
            onChange={e => setNumber(e.target.value)} />
        </label>
        <label className="mesa-field grow">
          <span className="mesa-field-label">{t(lang, 'Título (opcional)', 'Title (optional)')}</span>
          <input aria-label={t(lang, 'ex: A cripta', 'e.g.: The crypt')} className="input" value={title} maxLength={200} placeholder={t(lang, 'ex: A cripta', 'e.g.: The crypt')}
            onChange={e => setTitle(e.target.value)} />
        </label>
      </div>
      <div className="diary-actions">
        <button type="button" className="mesa-btn" onClick={() => setOpen(false)}>{t(lang, 'Cancelar', 'Cancel')}</button>
        <button type="submit" className="mesa-btn is-primary">{t(lang, 'Começar', 'Start')}</button>
      </div>
    </form>
  );
}

/**
 * Erro de uma folha, preso no rodapé dela (o aviso do topo da Crônica fica
 * atrás do fundo escuro da folha). Toque some com ele.
 */
function SheetError({ text, onDismiss }) {
  if (!text) return null;
  return <p className="diary-error diary-sheet-err" role="alert" onClick={onDismiss}>{text}</p>;
}

/** Nota nova, em folha: título opcional, texto, ☐ Oculta dos jogadores (só o mestre) e Adicionar. */
function NoteSheet({ campaign, lang, isDM, onClose, onDone }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const empty = !body.trim() && !title.trim();
  // mexeu no texto: o erro antigo sai (o próximo toque em Adicionar diz de novo, se for o caso)
  const edit = (set) => (e) => { set(e.target.type === 'checkbox' ? e.target.checked : e.target.value); setErr(''); };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (empty) return;
    setBusy(true);
    try {
      await api.createDiaryNote(campaign.id, { title, body, ...(isDM && hidden ? { hidden: true } : {}) });
      setBusy(false);
      onDone();
    } catch (er) { setErr(errMsg(er)); setBusy(false); }
  };

  return (
    <MesaSheet lang={lang} size="auto" width="md" icon="✎" title={t(lang, 'Nova nota', 'New note')} onClose={onClose}
      dirty={!empty && !busy} className="diary-note-sheet"
      dirtyText={t(lang, 'A nota que você escreveu ainda não foi para a crônica.', 'The note you wrote has not gone to the chronicle yet.')}
      footer={(
        <div className="mesa-actions">
          <SheetError text={err} onDismiss={() => setErr('')} />
          <button type="submit" form="diary-note-form" className="mesa-btn mesa-btn-lg is-primary diary-note-add" disabled={busy || empty}>
            ✎ {t(lang, 'Adicionar nota', 'Add note')}
          </button>
        </div>
      )}>
      <form id="diary-note-form" className="diary-form" onSubmit={submit}>
        <label className="mesa-field">
          <span className="mesa-field-label">{t(lang, 'Título (opcional)', 'Title (optional)')}</span>
          <input className="input" value={title} maxLength={200} onChange={edit(setTitle)}
            placeholder={t(lang, 'Título da nota (opcional)', 'Note title (optional)')} />
        </label>
        <label className="mesa-field">
          <span className="mesa-field-label">{t(lang, 'Texto da nota', 'Note text')}</span>
          <textarea className="input" rows={5} value={body} onChange={edit(setBody)}
            placeholder={t(lang, 'O que aconteceu? Pistas, nomes, promessas…', 'What happened? Clues, names, promises…')} />
        </label>
        {isDM && (
          <label className="diary-check">
            <input type="checkbox" checked={hidden} onChange={edit(setHidden)} />
            <span>{t(lang, 'Oculta dos jogadores', 'Hidden from players')}</span>
          </label>
        )}
      </form>
    </MesaSheet>
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
  const label = group.session != null ? `${t(lang, 'Sessão', 'Session')} ${group.session}` : fmtDay(group.day, lang);

  return (
    <section className="diary-group mesa-panel" aria-label={group.session != null ? `${t(lang, 'Sessão', 'Session')} ${group.session}` : group.day}>
      {editingTitle ? (
        <form className="diary-title-form" onSubmit={saveTitle}>
          <label className="mesa-field grow">
            <span className="mesa-field-label">{t(lang, 'Sessão', 'Session')} {group.session} — {t(lang, 'título', 'title')}</span>
            <input className="input" autoFocus value={title} maxLength={200} onChange={e => setTitle(e.target.value)}
              aria-label={t(lang, 'Título da sessão', 'Session title')} />
          </label>
          <div className="diary-actions">
            <button type="button" className="mesa-btn" onClick={() => setEditingTitle(false)}>{t(lang, 'Cancelar', 'Cancel')}</button>
            <button type="submit" className="mesa-btn is-primary">{t(lang, 'Salvar', 'Save')}</button>
          </div>
        </form>
      ) : (
        <MesaTitle as="h4" className="diary-group-head"
          sub={group.session != null && info?.title ? <span className="diary-group-sub">{info.title}</span> : null}
          act={isDM ? (
            <MoreMenu lang={lang} label={t(lang, `Ações da sessão: ${label}`, `Session actions: ${label}`)} sheetTitle={label} items={[
              { id: 'recap', label: `📜 ${t(lang, 'Recap desta sessão', 'Recap this session')}`, onSelect: onRecap,
                hint: t(lang, 'Rascunho do "Anteriormente em…" com o que houve nela.', 'A "Previously on…" draft from what happened in it.') },
              { id: 'rename', label: `✎ ${t(lang, 'Renomear sessão', 'Rename session')}`, onSelect: () => setEditingTitle(true), hidden: group.session == null },
            ]} />
          ) : null}>
          {label}
        </MesaTitle>
      )}

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
    { id: 'tv', label: `📺 ${t(lang, 'Mostrar na Tela', 'Show on screen')}`, onSelect: () => onShow?.(entry),
      hidden: !isDM || entry.hidden || !(shownBody || shownTitle) },
    { id: 'del', label: `🗑 ${t(lang, 'Excluir', 'Delete')}`, onSelect: () => onDelete(entry), danger: true,
      hint: t(lang, 'Some na hora; dá para desfazer por 5 segundos.', 'Gone right away; you can undo for 5 seconds.') },
  ] : [];
  return (
    <li className={cls}>
      <span className="diary-icon" aria-hidden="true">{entryIcon(entry)}</span>
      <div className="diary-card">
        {editing ? (
          <form className="diary-form" onSubmit={save}>
            <label className="mesa-field">
              <span className="mesa-field-label">{t(lang, 'Título', 'Title')}</span>
              <input className="input" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} />
            </label>
            <label className="mesa-field">
              <span className="mesa-field-label">{t(lang, 'Texto', 'Text')}</span>
              <textarea className="input" rows={Math.max(3, Math.min(14, body.split('\n').length + 1))} value={body}
                onChange={e => setBody(e.target.value)} />
            </label>
            <div className="diary-actions">
              <button type="button" className="mesa-btn" onClick={() => setEditing(false)}>{t(lang, 'Cancelar', 'Cancel')}</button>
              <button type="submit" className="mesa-btn is-primary">{t(lang, 'Salvar', 'Save')}</button>
            </div>
          </form>
        ) : (
          <>
            <div className="diary-card-head">
              {shownTitle && <strong className="diary-card-title">{shownTitle}</strong>}
              {entry.hidden && <span className="diary-tag">{t(lang, 'oculta', 'hidden')}</span>}
              <MoreMenu items={menu} lang={lang} label={t(lang, 'Ações da entrada', 'Entry actions')} sheetTitle={shownTitle || t(lang, 'Entrada da crônica', 'Chronicle entry')} className="diary-more-menu" />
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
 * Editor do "Anteriormente em…", em folha alta: rascunho montado dos eventos
 * (sem IA), que o mestre edita antes de mostrar na Tela ou salvar na crônica.
 * Nada vai à TV sem o toque dele. Rodapé preso: 📺 Mostrar na Tela (ou Tirar
 * da Tela, com "● Na Tela agora") · Salvar na crônica · Copiar · Fechar.
 */
function RecapSheet({ campaign, lang, recap, onScreen, onShow, onClearScreen, onClose, onSaved, onCopied }) {
  const [title, setTitle] = useState(recap.title);
  const [text, setText] = useState(recap.text);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setTitle(recap.title); setText(recap.text); setTouched(false); setErr(''); }, [recap]);
  // "Na Tela agora" só com este texto na TV de verdade (frente do palco e state.stageRecap)
  const live = onScreen?.place === 'front' && onScreen.title === title.trim() && onScreen.text === text;
  const tooLong = text.length > 5000;
  const empty = !text.trim() && !title.trim();

  const save = async () => {
    setBusy(true);
    try {
      await api.createDiaryNote(campaign.id, { subtype: 'summary', title: title.trim().slice(0, 200), body: text, session: recap.session });
      setTouched(false);
      onSaved();
    } catch (er) { setErr(errMsg(er)); }
    setBusy(false);
  };
  const show = async () => { setBusy(true); if (await onShow(title.trim(), text)) setTouched(false); setBusy(false); };
  const copy = async () => {
    if (await copyText(`${title}\n\n${text}`)) { setErr(''); onCopied(); }
    else setErr(t(lang, 'Não deu para copiar: selecione o texto e copie à mão.', 'Could not copy: select the text and copy it by hand.'));
  };

  return (
    <MesaSheet lang={lang} size="tall" width="md" icon="✨" title={t(lang, 'Anteriormente em…', 'Previously on…')}
      eyebrow={recap.session != null ? `${t(lang, 'a partir da sessão', 'from session')} ${recap.session}` : undefined}
      onClose={onClose} dirty={touched && !live} className="diary-recap-sheet" bodyClassName="diary-recap"
      dirtyText={t(lang, 'O texto que você mexeu não foi para a Tela nem para a crônica.', 'The text you edited did not go to the screen or the chronicle.')}
      footer={({ close }) => (
        <div className="diary-recap-foot">
          <SheetError text={err} onDismiss={() => setErr('')} />
          {live && <p className="diary-recap-live" role="status">● {t(lang, 'Na Tela agora', 'On screen now')}</p>}
          {live
            ? <button type="button" className="mesa-btn mesa-btn-lg diary-recap-main" disabled={busy} onClick={() => onClearScreen()}>{t(lang, 'Tirar da Tela', 'Remove from screen')}</button>
            : <button type="button" className="mesa-btn mesa-btn-lg is-primary diary-recap-main" disabled={busy || tooLong || empty} onClick={show}>📺 {t(lang, 'Mostrar na Tela', 'Show on screen')}</button>}
          <div className="diary-recap-more">
            <button type="button" className="mesa-btn" disabled={busy || empty} onClick={save}>{t(lang, 'Salvar na crônica', 'Save to chronicle')}</button>
            <button type="button" className="mesa-btn" onClick={copy}>{t(lang, 'Copiar', 'Copy')}</button>
            {/* o mesmo fechar do ✕ e do Esc: com texto mexido, pergunta antes */}
            <button type="button" className="mesa-btn" onClick={close}>{t(lang, 'Fechar', 'Close')}</button>
          </div>
        </div>
      )}>
      <p className="mesa-sheet-text diary-recap-hint">
        {t(lang, 'Rascunho montado com o que ficou na crônica (o que está oculto fica de fora). Edite à vontade: só vai para a Tela quando você mandar.',
          'Draft built from the chronicle (hidden entries are left out). Edit freely: it only goes to the screen when you say so.')}
      </p>
      <label className="mesa-field">
        <span className="mesa-field-label">{t(lang, 'Título do recap', 'Recap title')}</span>
        <input className="input diary-recap-title" value={title} maxLength={200} onChange={e => { setTitle(e.target.value); setTouched(true); setErr(''); }} />
      </label>
      <label className="mesa-field diary-recap-textfield">
        <span className="mesa-field-label">{t(lang, 'Texto do recap', 'Recap text')}</span>
        <textarea className="input diary-recap-text" rows={Math.min(14, Math.max(6, text.split('\n').length + 2))} value={text}
          onChange={e => { setText(e.target.value); setTouched(true); setErr(''); }} />
      </label>
      {tooLong && <p className="diary-error">{t(lang, 'Texto longo demais para a Tela (máx. 5000 caracteres).', 'Too long for the screen (max 5000 characters).')}</p>}
    </MesaSheet>
  );
}
