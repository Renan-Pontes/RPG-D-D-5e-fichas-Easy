import { errorMessage, isOldServer } from '../api/errors.js';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import { DIARY_TYPES, entryBody, entryIcon, entryTitle, groupEntries, matchesFilter, pickRecapGroup } from './diary-summary.js';
import MoreMenu from '../group/MoreMenu.jsx';
import useTouchHold from '../group/useTouchHold.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import useScrollEdges from '../shell/useScrollEdges.js';
import './diary-styles.css';
import '../group/group-styles.css';
import { sendToStage, showOnStage, stageBack } from '../stage/stage-api.js';
import { frontPlace, stageNow } from '../stage/stage-now.js';
import useStage from '../stage/useStage.js';
import { sessionLength } from '../play/now-model.js';
import { restoreSessionPlan, saveSessionPlan } from '../world/world-api.js';

// O editor único do Resumo da sessão (V12) só baixa quando o mestre abre um resumo.
const RecapEditor = lazy(() => import('../play/RecapEditor.jsx'));

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
 * em…], os 10 filtros num trilho de 44 px e as sessões (com a duração, "2h10",
 * quando a sessão foi encerrada). A nota nova e o editor do Resumo da sessão
 * (play/RecapEditor.jsx, o mesmo do Encerrar e de Jogar) abrem em folha
 * (MesaSheet), com a ação principal presa no rodapé.
 * O plano arquivado de cada sessão (V12: entrada oculta 'plan', que a lista manda
 * sem o plano) não entra na linha do tempo: o ⋯ da sessão ganha "📋 Ver o plano
 * desta sessão", que lê o plano sob demanda e tem Restaurar (com ↶ Desfazer).
 * Lê a crônica a cada 8 s (como sempre). O erro de uma folha aparece nela
 * (o aviso do topo ficaria atrás do fundo da folha). Campanha encerrada: sem
 * "Nova nota", com o motivo por escrito.
 * showStartSession: false quando a casca já tem o "Começar sessão" no cabeçalho
 * (um só lugar para começar a sessão).
 * autoRecap: um link antigo ({recap: true}) — abre o resumo assim que a crônica chega
 * (uma vez; `recapSession` diz de qual sessão) e avisa onAutoRecap() para a casca limpar o pedido.
 */
export default function DiaryTab({ campaign, lang = 'pt', isDM, onCampaignChange, showStartSession = true, autoRecap = false, recapSession = null, onAutoRecap, onPlanRestored }) {
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

  // o plano arquivado de cada sessão (oculto, só do mestre): fora da linha do tempo
  const archives = useMemo(() => {
    const out = {};
    for (const e of entries) if (e.subtype === 'plan' && e.session != null && !out[e.session]) out[e.session] = e;
    return out;
  }, [entries]);
  const visible = useMemo(
    () => entries.filter(e => !pending[e.id] && e.subtype !== 'plan' && matchesFilter(e, filter)),
    [entries, pending, filter],
  );
  const groups = useMemo(() => {
    const out = groupEntries(visible);
    if (!isDM || filter !== 'all') return out;
    // sessão que só tem o plano arquivado (ex.: "Começar do zero" de um plano não jogado)
    for (const k of Object.keys(archives)) {
      const n = Number(k);
      if (out.some(g => g.session === n)) continue;
      const at = out.findIndex(g => g.session == null || g.session < n);
      out.splice(at < 0 ? out.length : at, 0, { key: `s${n}`, session: n, day: null, entries: [] });
    }
    return out;
  }, [visible, archives, isDM, filter]);
  const sessionInfo = useMemo(() => Object.fromEntries(sessions.map(s => [s.number, s])), [sessions]);
  const currentTitle = current != null ? sessionInfo[current]?.title : '';

  // O Resumo da sessão (o editor único): o salvo da sessão, senão o rascunho rico. Sem
  // sessão dita, a última com algo além da abertura (pickRecapGroup).
  const [recap, setRecap] = useState(null); // {key, session, entries}
  const openRecap = useCallback((key, session = null) => {
    const all = groupEntries(entries.filter(e => !pending[e.id]));
    const g = (session != null && all.find(x => x.session === session)) || all.find(x => x.key === key) || all.find(x => x.key === pickRecapGroup(all));
    const n = session ?? g?.session ?? null;
    // as entradas do grupo já estão aqui (o editor não lê de novo); as de uma sessão que
    // ainda não chegou (Carregar mais) ele lê sozinho
    setRecap({ key: g?.key || null, session: n, entries: g && g.session === n ? g.entries : null });
  }, [entries, pending]);
  const autoRecapDone = useRef(false);
  useEffect(() => {
    if (!autoRecap || !isDM || autoRecapDone.current || !loaded || recap || !entries.length) return;
    autoRecapDone.current = true;
    openRecap(null, recapSession);
    onAutoRecap?.();
  }, [autoRecap, isDM, loaded, recap, entries.length, openRecap, onAutoRecap, recapSession]);
  const [planOf, setPlanOf] = useState(null); // a sessão do "Ver o plano desta sessão"

  // O recap na Tela pela regra de sempre (stage-now): na TV, esperando o combate ou atrás
  // da Tela escurecida — nunca pelo screenCard de compatibilidade (princípio 7).
  const stage = useStage(campaign);
  const recapPlace = frontPlace(stageNow({ stage, combat: campaign.combatNow }), 'recap');
  const stageRecap = campaign.state?.stageRecap;
  const onScreen = recapPlace ? { place: recapPlace, title: stageRecap?.title || '', text: stageRecap?.text || '' } : null;
  const flash = (text) => setToast({ id: `m${Date.now()}`, text });
  useEffect(() => {
    if (!toast || toast.undo) return undefined;
    const id = setTimeout(() => setToast(tt => (tt === toast ? null : tt)), toast.undoFn ? 6000 : 3500);
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
            {/* encerrada: o resumo continua (ler e copiar); a Tela e o salvar dizem o motivo na folha */}
            {isDM && (
              <button type="button" className="mesa-btn diary-recap-open" onClick={() => openRecap(null)} disabled={!loaded || !entries.length}
                aria-label={t(lang, 'Anteriormente em…: o resumo da sessão', 'Previously on…: the session recap')}>
                ✨ {t(lang, 'Anteriormente em…', 'Previously on…')}
              </button>
            )}
          </div>
        )}
        {isDM && onScreen && (
          <div className="diary-on-tv" role="status">
            <span>📺 {onScreen.place === 'front' ? t(lang, 'O resumo está na Tela agora.', 'The recap is on screen now.')
              : onScreen.place === 'waiting' ? t(lang, 'O resumo espera o fim do combate.', 'The recap waits for combat to end.')
                : t(lang, 'O resumo está atrás da Tela escurecida.', 'The recap is behind the blacked-out screen.')}</span>
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
          onPatch={patchEntry} onDelete={askDelete} onRecap={() => openRecap(g.key, g.session)}
          archived={g.session != null ? archives[g.session] || null : null} onPlan={() => setPlanOf(g.session)}
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
        <Suspense fallback={null}>
          <RecapEditor campaign={campaign} lang={lang} session={recap.session} entries={recap.entries}
            onClose={() => setRecap(null)} onSaved={() => { setRecap(null); load().catch(() => {}); }} />
        </Suspense>
      )}
      {isDM && planOf != null && (
        <PlanArchiveSheet campaign={campaign} lang={lang} session={planOf} onClose={() => setPlanOf(null)}
          onRestored={(msg, undo) => { setPlanOf(null); setToast({ id: `p${Date.now()}`, text: msg, undoFn: undo }); onPlanRestored?.(); }} />
      )}

      {toast && (
        <div className="diary-toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && <button type="button" className="mesa-btn" onClick={() => undoDelete(toast.id)}>{t(lang, 'Desfazer', 'Undo')}</button>}
          {toast.undoFn && <button type="button" className="mesa-btn" onClick={() => { const fn = toast.undoFn; setToast(null); fn(); }}>↶ {t(lang, 'Desfazer', 'Undo')}</button>}
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

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/** "4 cenas (1 jogada) · 2 pistas · com Restaurar" — as contagens do plano arquivado (a lista não traz o plano). */
function planCountsText(c, lang) {
  return t(lang,
    `${plural(c.scenes, 'cena', 'cenas')} (${plural(c.played, 'jogada', 'jogadas')}) · ${plural(c.clues, 'pista', 'pistas')} · com Restaurar`,
    `${plural(c.scenes, 'scene', 'scenes')} (${c.played} played) · ${plural(c.clues, 'clue', 'clues')} · with Restore`);
}

function SessionGroup({ group, info, campaign, lang, isDM, onReload, onError, onPatch, onDelete, onRecap, onShowEntry, archived = null, onPlan }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(info?.title || '');

  useEffect(() => { if (!editingTitle) setTitle(info?.title || ''); }, [info?.title, editingTitle]);

  const saveTitle = async (e) => {
    e.preventDefault();
    try { await api.renameDiarySession(campaign.id, group.session, title); setEditingTitle(false); onReload(); }
    catch (err) { onError(errMsg(err)); }
  };
  const label = group.session != null ? `${t(lang, 'Sessão', 'Session')} ${group.session}` : fmtDay(group.day, lang);
  // a duração da sessão encerrada ("2h10"; sem o endedAt — servidor antigo —, nada)
  const length = group.session != null ? sessionLength(info?.startedAt, info?.endedAt) : null;
  const sub = [group.session != null && info?.title ? info.title : '', length ? `⌛ ${length}` : ''].filter(Boolean).join(' · ');

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
          sub={sub ? <span className="diary-group-sub">{sub}</span> : null}
          act={isDM ? (
            <MoreMenu lang={lang} label={t(lang, `Ações da sessão: ${label}`, `Session actions: ${label}`)} sheetTitle={label} items={[
              { id: 'recap', label: `📜 ${t(lang, 'Resumo desta sessão', 'This session’s recap')}`, onSelect: onRecap,
                hint: t(lang, 'O resumo salvo dela ou um rascunho com o que houve nela.', 'Its saved recap, or a draft from what happened in it.') },
              { id: 'plan', label: `📋 ${t(lang, 'Ver o plano desta sessão', 'See this session’s plan')}`, onSelect: onPlan, hidden: !archived,
                hint: archived?.data?.counts ? planCountsText(archived.data.counts, lang) : undefined },
              { id: 'rename', label: `✎ ${t(lang, 'Renomear sessão', 'Rename session')}`, onSelect: () => setEditingTitle(true), hidden: group.session == null },
            ]} />
          ) : null}>
          {label}
        </MesaTitle>
      )}

      {!group.entries.length && <p className="diary-none">{t(lang, 'Só o plano desta sessão está guardado (⋯).', 'Only this session’s plan is kept (⋯).')}</p>}
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
 * Crônica › ⋯ da sessão › "Ver o plano desta sessão" (V12): o plano arquivado ao encerrar
 * (lido só agora, ?subtype=plan), para ler, e **Restaurar**: as cenas, as pistas, as
 * pessoas e os lugares voltam ao Plano (o que já está nele fica). O aviso tem ↶ Desfazer
 * (grava de novo o plano de antes). Servidor sem o arquivo: diz que falta atualizar.
 */
function PlanArchiveSheet({ campaign, lang, session, onClose, onRestored }) {
  const [data, setData] = useState(null);   // {plan, sceneId} | false (não há)
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    api.listDiary(campaign.id, { subtype: 'plan', session, limit: 1 })
      .then(r => { if (alive) setData(r.entries?.[0]?.data?.plan ? r.entries[0].data : false); })
      .catch(e => { if (alive) { setData(false); setErr(errMsg(e)); } });
    return () => { alive = false; };
  }, [campaign.id, session]);
  const plan = data?.plan || null;
  const closed = campaign.status === 'closed';
  const realScenes = (plan?.scenes || []).filter(s => String(s.text || '').trim() || s.nodeRef);
  const clues = (plan?.secrets || []).filter(s => String(s.text || '').trim() || s.ref);
  const people = (plan?.npcIds || []).length + (plan?.placeIds || []).length;

  const restore = async () => {
    setBusy(true); setErr('');
    try {
      const r = await restoreSessionPlan(campaign.id, session);
      const previous = r?.previous || null;
      onRestored(t(lang, `Plano da Sessão ${session} de volta ao Plano.`, `Session ${session} plan back in the Plan.`),
        previous ? async () => { try { await saveSessionPlan(campaign.id, previous); onRestored(t(lang, 'Plano de antes de volta.', 'The previous plan is back.')); } catch (e) { setErr(errMsg(e)); } } : null);
    } catch (e) {
      setErr(isOldServer(e) ? t(lang, 'O servidor ainda não sabe restaurar o plano: falta atualizar.', 'The server cannot restore the plan yet: it needs an update.') : errMsg(e));
    }
    setBusy(false);
  };

  return (
    <MesaSheet lang={lang} size="tall" width="md" icon="📋" title={t(lang, `Plano da Sessão ${session}`, `Session ${session} plan`)}
      eyebrow={t(lang, 'Guardado ao encerrar · só você vê', 'Kept when the session ended · only you see this')}
      onClose={onClose} className="diary-plan-sheet"
      footer={(
        <div className="mesa-actions is-stack">
          <SheetError text={err} onDismiss={() => setErr('')} />
          {closed && <p className="diary-readonly">{t(lang, 'Campanha encerrada: o plano fica só para ler.', 'Campaign closed: the plan is read-only.')}</p>}
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" disabled={busy || !plan || closed} onClick={restore}>
            {busy ? '…' : `↺ ${t(lang, 'Restaurar no Plano', 'Restore to the Plan')}`}
          </button>
        </div>
      )}>
      {data === null && <p className="diary-none">{t(lang, 'Carregando…', 'Loading…')}</p>}
      {data === false && !err && <p className="diary-none">{t(lang, 'O plano desta sessão não foi guardado.', 'This session’s plan was not kept.')}</p>}
      {plan && (
        <div className="diary-plan">
          <p className="mesa-sheet-text">{t(lang, 'Restaurar põe de volta no Plano as cenas, as pistas, as pessoas e os lugares desta sessão; o que já está no Plano fica junto.',
            'Restore puts this session’s scenes, clues, people and places back in the Plan; what is already in the Plan stays.')}</p>
          {String(plan.strongStart || '').trim() && (
            <section><h4 className="diary-plan-h">{t(lang, 'Como começou', 'How it started')}</h4><p className="diary-body">{plan.strongStart}</p></section>
          )}
          <section>
            <h4 className="diary-plan-h">{t(lang, 'Cenas', 'Scenes')} · {realScenes.length}</h4>
            {realScenes.length ? (
              <ul className="diary-plan-list">
                {realScenes.map(s => {
                  const played = s.done || s.id === data.sceneId;
                  return <li key={s.id}>{played ? '✓' : '○'} {String(s.text || '').split('\n')[0] || t(lang, '(sala de aventura)', '(adventure room)')}
                    {!played && <span className="diary-plan-tag"> · {t(lang, 'não jogada', 'not played')}</span>}</li>;
                })}
              </ul>
            ) : <p className="diary-none">{t(lang, 'Nenhuma.', 'None.')}</p>}
          </section>
          <section>
            <h4 className="diary-plan-h">{t(lang, 'Pistas', 'Clues')} · {t(lang, `${clues.filter(c => c.discovered).length} de ${clues.length} achadas`, `${clues.filter(c => c.discovered).length} of ${clues.length} found`)}</h4>
            {clues.length ? (
              <ul className="diary-plan-list">{clues.map(c => <li key={c.id}>{c.discovered ? '✓' : '○'} {c.text || t(lang, '(ligada a um cartão)', '(linked to a card)')}</li>)}</ul>
            ) : <p className="diary-none">{t(lang, 'Nenhuma.', 'None.')}</p>}
          </section>
          {people > 0 && <p className="diary-body">{t(lang, `À mão na sessão toda: ${people} pessoas e lugares do Mundo.`, `Handy all session: ${people} people and places from the World.`)}</p>}
          {String(plan.rewards || '').trim() && <section><h4 className="diary-plan-h">{t(lang, 'Recompensas', 'Rewards')}</h4><p className="diary-body">{plan.rewards}</p></section>}
          {String(plan.monsters || '').trim() && <section><h4 className="diary-plan-h">{t(lang, 'Anotações de monstros', 'Monster notes')}</h4><p className="diary-body">{plan.monsters}</p></section>}
        </div>
      )}
    </MesaSheet>
  );
}
