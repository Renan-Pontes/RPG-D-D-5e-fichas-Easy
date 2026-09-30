import { errorMessage } from '../api/errors.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import MapCanvas from './MapCanvas.jsx';
import NodeList from './NodeList.jsx';
import NodeEditor, { EdgeEditor } from './NodeEditor.jsx';
import PlayPanel from './PlayPanel.jsx';
import {
  emptyPlay, makeNode, makeEdge, addNode, updateNode, removeNode, addEdge, updateEdge, removeEdge, reverseEdge,
  availableTargets, highlightedEdges, validateAdventure, partyLevels, freeSpot, startNode, exportAdventure,
  parseAdventureImport, edgeText, GATED_KINDS, LIMITS,
} from './prep-graph.js';
import '../combat/monster-tools.css';
import './prep-styles.css';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

const STATUS = [
  { id: 'draft', pt: 'Rascunho', en: 'Draft' },
  { id: 'playing', pt: 'Em jogo', en: 'Playing' },
  { id: 'done', pt: 'Concluída', en: 'Done' },
];
const statusLabel = (s, lang) => { const x = STATUS.find(i => i.id === s) || STATUS[0]; return t(lang, x.pt, x.en); };

const ERRORS = {
  image_too_large: { pt: 'Imagem grande demais.', en: 'Image too large.' },
  adventure_too_large: { pt: 'A aventura passou do limite de tamanho (muitas imagens?).', en: 'The adventure is over the size limit (too many images?).' },
  too_many_nodes: { pt: `Máximo de ${LIMITS.nodes} salas/cenas.`, en: `At most ${LIMITS.nodes} rooms/scenes.` },
  too_many_adventures: { pt: 'Limite de aventuras da campanha atingido.', en: 'Campaign adventure limit reached.' },
  invalid_json: { pt: 'O arquivo não é um JSON válido.', en: 'The file is not valid JSON.' },
  not_adventure: { pt: 'O arquivo não parece uma aventura exportada da Forja.', en: 'The file does not look like an exported adventure.' },
  invalid_structure: { pt: 'A aventura do arquivo tem conexões quebradas.', en: 'The adventure in the file has broken connections.' },
};
const errText = (e, lang) => {
  const code = e?.data?.error || e?.message || String(e);
  return ERRORS[code]?.[lang] || errorMessage(e, lang);
};

const prefersList = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 700px)').matches;
const readPref = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const writePref = (key, v) => { try { localStorage.setItem(key, v); } catch { /* sem storage */ } };

function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(name || 'aventura').replace(/[^\w\-]+/g, '-').toLowerCase()}.forja-aventura.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Aba "Preparação" do mestre: aventuras como mapa de salas/cenas conectadas.
 * Preparar (editar mapa e nós) · Em jogo (marcar onde o grupo está, caminhos,
 * encontro, tesouro, telão). Jogadores nunca veem esta aba nem os dados.
 */
export default function PrepTab({ campaign, lang, onOpenTab }) {
  const [adventures, setAdventures] = useState(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [newName, setNewName] = useState('');
  const importRef = useRef(null);

  const loadList = useCallback(async () => {
    try {
      const r = await api.listAdventures(campaign.id);
      setAdventures(r.adventures || []);
    } catch (e) { setError(errText(e, lang)); setAdventures([]); }
  }, [campaign.id, lang]);

  useEffect(() => { loadList(); }, [loadList]);

  const create = async (e) => {
    e?.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      const r = await api.createAdventure(campaign.id, { name });
      setNewName('');
      setAdventures(list => [r.adventure, ...(list || [])]);
      setOpenId(r.adventure.id);
    } catch (err) { setError(errText(err, lang)); }
  };

  const onImport = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setError('');
    try {
      const parsed = parseAdventureImport(await f.text());
      const r = await api.createAdventure(campaign.id, parsed);
      setAdventures(list => [r.adventure, ...(list || [])]);
      setOpenId(r.adventure.id);
    } catch (err) { setError(errText(err, lang)); }
  };

  if (openId) {
    return (
      <AdventureWorkspace key={openId} campaign={campaign} lang={lang} advId={openId} adventures={adventures || []}
        onBack={() => { setOpenId(null); loadList(); }}
        onOpen={(id) => setOpenId(id)}
        onDeleted={() => { setOpenId(null); loadList(); }}
        onListChange={(a) => setAdventures(list => (list || []).map(x => (x.id === a.id ? { ...x, ...a } : x)))}
        onOpenTab={onOpenTab} />
    );
  }

  return (
    <div className="prep-tab">
      <div className="prep-intro">
        <div>
          <h2>{t(lang, 'Preparação', 'Prep')}</h2>
          <p className="muted">{t(lang,
            'Monte cada aventura como um mapa de salas e cenas ligadas por caminhos. Na sessão, marque por onde o grupo passa. Só você vê isto.',
            'Build each adventure as a map of rooms and scenes linked by paths. During the session, mark where the party goes. Only you see this.')}</p>
        </div>
      </div>
      <form className="prep-create" onSubmit={create}>
        <input className="input" value={newName} maxLength={120} onChange={e => setNewName(e.target.value)}
          placeholder={t(lang, 'Nome da nova aventura (ex.: A Cripta do Rei Sem Nome)', 'New adventure name (e.g. The Nameless King’s Crypt)')}
          aria-label={t(lang, 'Nome da nova aventura', 'New adventure name')} />
        <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>+ {t(lang, 'Criar', 'Create')}</button>
        <button type="button" className="btn btn-ghost" onClick={() => importRef.current?.click()}>⇪ {t(lang, 'Importar JSON', 'Import JSON')}</button>
        <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
      </form>
      {error && <p className="prep-error" role="alert">{error}</p>}
      {adventures === null && <p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p>}
      {adventures?.length === 0 && (
        <div className="prep-empty">
          <p>{t(lang, 'Nenhuma aventura ainda — dê um nome acima e crie a primeira, ou importe um arquivo de aventura.', 'No adventures yet — name one above to create the first, or import an adventure file.')}</p>
        </div>
      )}
      <div className="prep-adv-grid">
        {(adventures || []).map(a => (
          <button type="button" key={a.id} className={`prep-adv-card st-${a.status}`} onClick={() => setOpenId(a.id)}>
            <span className={`prep-status st-${a.status}`}>{statusLabel(a.status, lang)}</span>
            <strong>{a.name}</strong>
            {a.summary && <span className="prep-adv-summary">{a.summary}</span>}
            <span className="muted small">
              {t(lang, `${a.nodeCount} sala(s)/cena(s) · ${a.edgeCount} caminho(s)`, `${a.nodeCount} room(s)/scene(s) · ${a.edgeCount} path(s)`)}
              {' · '}{new Date(a.updatedAt).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US')}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AdventureWorkspace({ campaign, lang, advId, adventures, onBack, onOpen, onDeleted, onListChange, onOpenTab }) {
  const [adv, setAdv] = useState(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('saved'); // saved | dirty | saving | error
  const [view, setView] = useState(() => (prefersList() ? 'list' : readPref('forja.prep.view', 'map')));
  const [mode, setMode] = useState('prep');
  const [selected, setSelected] = useState(null);
  const [campaignItems, setCampaignItems] = useState([]);
  const [logDiary, setLogDiary] = useState(true);
  const [showIssues, setShowIssues] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [flash, setFlash] = useState('');
  const advRef = useRef(null);
  const pending = useRef({});
  const timer = useRef(null);
  const dirtySince = useRef(0);
  const chain = useRef(Promise.resolve());

  useEffect(() => {
    let alive = true;
    api.getAdventure(campaign.id, advId).then(r => {
      if (!alive) return;
      advRef.current = { ...r.adventure, play: r.adventure.play || emptyPlay() };
      setAdv(advRef.current);
      if (r.adventure.status === 'playing') setMode('play');
    }).catch(e => setError(errText(e, lang)));
    api.campaignItems(campaign.id).then(r => alive && setCampaignItems(r.items || [])).catch(() => {});
    return () => { alive = false; };
  }, [campaign.id, advId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- autosave
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    chain.current = chain.current.then(async () => {
      const body = pending.current;
      pending.current = {};
      if (!Object.keys(body).length) return;
      setSaveState('saving');
      try {
        const r = await api.updateAdventure(campaign.id, advId, body);
        if (!Object.keys(pending.current).length) setSaveState('saved');
        // o servidor limpa referências do estado de jogo a nós apagados
        advRef.current = { ...advRef.current, play: r.adventure.play, status: r.adventure.status, updatedAt: r.adventure.updatedAt };
        setAdv(advRef.current);
        onListChange({ id: advId, name: r.adventure.name, summary: r.adventure.summary, status: r.adventure.status,
          nodeCount: r.adventure.nodeCount, edgeCount: r.adventure.edgeCount, updatedAt: r.adventure.updatedAt });
      } catch (e) {
        pending.current = { ...body, ...pending.current };
        setSaveState('error');
        setError(errText(e, lang));
      }
    });
    return chain.current;
  }, [campaign.id, advId, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce de 700 ms, mas nunca segura alterações por mais de 3 s seguidos.
  const queue = (patch) => {
    if (!Object.keys(pending.current).length) dirtySince.current = Date.now();
    pending.current = { ...pending.current, ...patch };
    setSaveState('dirty');
    clearTimeout(timer.current);
    if (Date.now() - dirtySince.current > 3000) flush();
    else timer.current = setTimeout(flush, 700);
  };

  // Salva o que faltar ao sair da aventura / da aba / esconder a página.
  useEffect(() => () => { flush(); }, [flush]);
  useEffect(() => {
    const onUnload = (e) => { if (Object.keys(pending.current).length) { flush(); e.preventDefault(); e.returnValue = ''; } };
    const onHide = () => { if (document.visibilityState === 'hidden' && Object.keys(pending.current).length) flush(); };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.removeEventListener('beforeunload', onUnload); document.removeEventListener('visibilitychange', onHide); };
  }, [flush]);

  const setFields = (patch) => {
    advRef.current = { ...advRef.current, ...patch };
    setAdv(advRef.current);
    queue(patch);
  };

  const changeData = (fn) => {
    const next = fn(advRef.current.data);
    if (next === advRef.current.data) return;
    advRef.current = { ...advRef.current, data: next };
    setAdv(advRef.current);
    queue({ data: next });
  };

  const say = (text) => { setFlash(text); setTimeout(() => setFlash(f => (f === text ? '' : f)), 3500); };

  // ---------------------------------------------------------------- estado de jogo
  const onPlay = async (action, extra = {}) => {
    try {
      await flush();
      const r = await api.adventurePlay(campaign.id, advId, { action, ...extra, log: logDiary });
      advRef.current = { ...advRef.current, play: r.adventure.play, status: r.adventure.status };
      setAdv(advRef.current);
      if (action === 'enter') setSelected({ type: 'node', id: extra.nodeId });
    } catch (e) { setError(errText(e, lang)); }
  };

  const levels = useMemo(() => partyLevels(campaign), [campaign]);
  const data = adv?.data || { nodes: [], edges: [] };
  const play = adv?.play || emptyPlay();
  const issues = useMemo(() => validateAdventure(data), [data]);
  const available = useMemo(() => (mode === 'play' ? availableTargets(data, play) : null), [mode, data, play]);
  const hot = useMemo(() => (mode === 'play' ? highlightedEdges(data, play) : null), [mode, data, play]);

  if (error && !adv) return <div className="prep-tab"><button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>← {t(lang, 'Aventuras', 'Adventures')}</button><p className="prep-error">{error}</p></div>;
  if (!adv) return <div className="prep-tab"><p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p></div>;

  // ---------------------------------------------------------------- edição
  const createNode = (x, y) => {
    if (data.nodes.length >= LIMITS.nodes) { say(ERRORS.too_many_nodes[lang]); return; }
    const pos = x == null ? freeSpot(data, 0, 0) : freeSpot(data, x, y);
    const node = makeNode({ ...pos, name: t(lang, `Sala ${data.nodes.length + 1}`, `Room ${data.nodes.length + 1}`) });
    changeData(d => addNode(d, node));
    setSelected({ type: 'node', id: node.id });
  };

  const connect = (from, to, kind = 'door') => {
    const { data: next, edge } = addEdge(advRef.current.data, makeEdge(from, to, kind));
    if (!edge) { say(t(lang, 'Essas salas já estão conectadas.', 'Those rooms are already connected.')); return; }
    changeData(() => next);
    setSelected({ type: 'edge', id: edge.id });
  };

  const addEdgeObj = (edge) => {
    const { data: next, edge: added } = addEdge(advRef.current.data, edge);
    if (!added) { say(t(lang, 'Essas salas já estão conectadas.', 'Those rooms are already connected.')); return; }
    changeData(() => next);
  };

  const deleteNode = (node) => {
    const busy = node.readAloud || node.notes || node.encounter?.length || node.treasure?.items?.length;
    if (busy && !confirm(t(lang, `Apagar "${node.name}" e suas conexões?`, `Delete "${node.name}" and its connections?`))) return;
    changeData(d => removeNode(d, node.id));
    setSelected(null);
  };

  const deleteAdventure = async () => {
    if (!confirm(t(lang, `Apagar a aventura "${adv.name}"? Isto não pode ser desfeito. (Dica: exporte antes.)`, `Delete the adventure "${adv.name}"? This cannot be undone. (Tip: export first.)`))) return;
    clearTimeout(timer.current);
    pending.current = {};
    try { await api.deleteAdventure(campaign.id, advId); onDeleted(); } catch (e) { setError(errText(e, lang)); }
  };

  const resetPlay = () => {
    if (!confirm(t(lang, 'Zerar o progresso (atual, visitados e portas liberadas)?', 'Reset progress (current, visited and unlocked doors)?'))) return;
    onPlay('reset');
  };

  const switchView = (v) => { setView(v); writePref('forja.prep.view', v); };
  const openOther = async (id) => {
    await flush();
    if (adventures.some(a => a.id === id)) onOpen(id);
    else say(t(lang, 'Aventura não encontrada nesta campanha.', 'Adventure not found in this campaign.'));
  };

  const selNode = selected?.type === 'node' ? data.nodes.find(n => n.id === selected.id) : null;
  const selEdge = selected?.type === 'edge' ? data.edges.find(e => e.id === selected.id) : null;
  const current = data.nodes.find(n => n.id === play.current) || null;

  const panelFor = (node) => (mode === 'prep'
    ? (
      <NodeEditor key={node.id} node={node} data={data} adventures={adventures} currentAdventureId={advId}
        campaign={campaign} campaignItems={campaignItems} levels={levels} lang={lang}
        onChange={(patch) => changeData(d => updateNode(d, node.id, patch))}
        onDelete={() => deleteNode(node)}
        onDataChange={addEdgeObj}
        onSelectEdge={(id) => setSelected({ type: 'edge', id })} />
    ) : (
      <PlayPanel key={node.id} adventure={adv} node={node} campaign={campaign} levels={levels} lang={lang}
        logDiary={logDiary} onLogDiary={setLogDiary} onPlay={onPlay} onOpenAdventure={openOther} onOpenTab={onOpenTab}
        onSelectNode={(id) => setSelected({ type: 'node', id })} />
    ));

  let side;
  if (selNode) side = panelFor(selNode);
  else if (selEdge && mode === 'prep') {
    side = (
      <EdgeEditor key={selEdge.id} edge={selEdge} data={data} adventures={adventures} currentAdventureId={advId} lang={lang}
        onChange={(patch) => changeData(d => updateEdge(d, selEdge.id, patch))}
        onDelete={() => { changeData(d => removeEdge(d, selEdge.id)); setSelected(null); }}
        onReverse={() => changeData(d => reverseEdge(d, selEdge.id))}
        onSelectNode={(id) => setSelected({ type: 'node', id })} />
    );
  } else if (selEdge) {
    const unlocked = play.unlocked.includes(selEdge.id);
    side = (
      <div className="prep-editor">
        <p>{edgeText(selEdge, lang)}</p>
        {GATED_KINDS.has(selEdge.kind) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPlay(unlocked ? 'lock' : 'unlock', { edgeId: selEdge.id })}>
            {unlocked ? t(lang, '↺ Trancar/ocultar de novo', '↺ Lock/hide again') : t(lang, '🔓 Liberar passagem', '🔓 Open passage')}
          </button>
        )}
      </div>
    );
  } else if (mode === 'play' && current) side = panelFor(current);
  else if (mode === 'play') {
    const start = startNode(data);
    side = (
      <div className="prep-editor">
        <h4>{t(lang, 'Onde o grupo começa?', 'Where does the party start?')}</h4>
        <p className="muted small">{t(lang, 'Toque numa sala do mapa ou comece pela entrada sugerida.', 'Tap a room on the map or start at the suggested entrance.')}</p>
        {start && <button type="button" className="btn btn-primary btn-sm" onClick={() => onPlay('enter', { nodeId: start.id })}>▶ {t(lang, `Começar em ${start.name}`, `Start at ${start.name}`)}</button>}
      </div>
    );
  } else {
    side = (
      <div className="prep-editor prep-help">
        <h4>{t(lang, 'Como montar', 'How to build')}</h4>
        <ul>
          <li>{t(lang, '“+ Sala” ou duplo clique no mapa cria uma sala/cena.', '“+ Room” or double-click on the map creates a room/scene.')}</li>
          <li>{t(lang, 'Puxe o ● da borda de uma sala até outra para ligar as duas.', 'Pull the ● on a room’s edge to another room to link them.')}</li>
          <li>{t(lang, 'Clique numa conexão para escolher o tipo (porta, trancada, secreta…), rótulo e condição.', 'Click a connection to set its type (door, locked, secret…), label and condition.')}</li>
          <li>{t(lang, 'Marque a sala de entrada com a tag “início”.', 'Tag the entrance room with “start”.')}</li>
          <li>{t(lang, 'Na sessão, troque para “Em jogo”.', 'During the session, switch to “Playing”.')}</li>
        </ul>
      </div>
    );
  }

  const errorsCount = issues.filter(i => i.level !== 'info').length;
  const saveText = { saved: t(lang, 'Salvo', 'Saved'), dirty: t(lang, 'Alterado…', 'Edited…'), saving: t(lang, 'Salvando…', 'Saving…'), error: t(lang, 'Erro ao salvar', 'Save failed') }[saveState];

  return (
    <div className={`prep-tab prep-mode-${mode}`}>
      <div className="prep-head">
        <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await flush(); onBack(); }}>← {t(lang, 'Aventuras', 'Adventures')}</button>
        <input className="input prep-title-input" value={adv.name} maxLength={120} aria-label={t(lang, 'Nome da aventura', 'Adventure name')}
          onChange={e => setFields({ name: e.target.value })} onBlur={e => { if (!e.target.value.trim()) setFields({ name: t(lang, 'Sem nome', 'Untitled') }); }} />
        <select className="input prep-status-select" value={adv.status} aria-label={t(lang, 'Situação', 'Status')} onChange={e => setFields({ status: e.target.value })}>
          {STATUS.map(s => <option key={s.id} value={s.id}>{t(lang, s.pt, s.en)}</option>)}
        </select>
        <span className={`prep-save s-${saveState}`} role="status">{saveText}</span>
      </div>

      <div className="prep-toolbar">
        <div className="prep-seg" role="group" aria-label={t(lang, 'Modo', 'Mode')}>
          <button type="button" aria-pressed={mode === 'prep'} className={mode === 'prep' ? 'on' : ''} onClick={() => setMode('prep')}>✎ {t(lang, 'Preparar', 'Prepare')}</button>
          <button type="button" aria-pressed={mode === 'play'} className={mode === 'play' ? 'on' : ''} onClick={() => setMode('play')}>▶ {t(lang, 'Em jogo', 'Playing')}</button>
        </div>
        <div className="prep-seg" role="group" aria-label={t(lang, 'Visão', 'View')}>
          <button type="button" aria-pressed={view === 'map'} className={view === 'map' ? 'on' : ''} onClick={() => switchView('map')}>🗺 {t(lang, 'Mapa', 'Map')}</button>
          <button type="button" aria-pressed={view === 'list'} className={view === 'list' ? 'on' : ''} onClick={() => switchView('list')}>☰ {t(lang, 'Lista', 'List')}</button>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowSummary(s => !s)} aria-expanded={showSummary}>{t(lang, 'Resumo', 'Summary')}</button>
        {issues.length > 0 && (
          <button type="button" className={`btn btn-ghost btn-sm prep-issues-btn ${errorsCount ? 'has-warn' : ''}`} onClick={() => setShowIssues(s => !s)} aria-expanded={showIssues}>
            ⚠ {issues.length} {t(lang, issues.length > 1 ? 'avisos' : 'aviso', issues.length > 1 ? 'notes' : 'note')}
          </button>
        )}
        <span className="prep-spacer" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => download(adv.name, exportAdventure(adv))}>⇩ {t(lang, 'Exportar', 'Export')}</button>
        <button type="button" className="btn btn-ghost btn-sm danger" onClick={deleteAdventure}>{t(lang, 'Apagar', 'Delete')}</button>
      </div>

      {showSummary && (
        <textarea className="input prep-summary" rows={3} maxLength={4000} value={adv.summary || ''}
          placeholder={t(lang, 'Resumo: gancho, objetivo, o que está em jogo…', 'Summary: hook, goal, stakes…')}
          aria-label={t(lang, 'Resumo da aventura', 'Adventure summary')}
          onChange={e => setFields({ summary: e.target.value })} />
      )}
      {showIssues && (
        <ul className="prep-issues">
          {issues.map((i, k) => (
            <li key={k} className={`lv-${i.level}`}>
              {(i.nodeId || i.edgeId)
                ? <button type="button" className="linklike" onClick={() => setSelected(i.nodeId ? { type: 'node', id: i.nodeId } : { type: 'edge', id: i.edgeId })}>{i[lang] || i.en}</button>
                : (i[lang] || i.en)}
            </li>
          ))}
        </ul>
      )}
      {mode === 'play' && (
        <div className="prep-playbar">
          <span>{current
            ? <>▶ {t(lang, 'Grupo em', 'Party at')} <button type="button" className="linklike" onClick={() => setSelected({ type: 'node', id: current.id })}><strong>{current.name}</strong></button></>
            : t(lang, 'O grupo ainda não entrou em nenhuma sala.', 'The party has not entered any room yet.')}</span>
          <span className="muted small">{t(lang, `${play.visited.length}/${data.nodes.length} visitadas`, `${play.visited.length}/${data.nodes.length} visited`)}</span>
          <span className="prep-spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetPlay}>{t(lang, 'Zerar progresso', 'Reset progress')}</button>
        </div>
      )}
      {error && <p className="prep-error" role="alert">{error} <button type="button" className="linklike" onClick={() => setError('')}>{t(lang, 'ok', 'ok')}</button></p>}
      {flash && <p className="prep-msg" role="status">{flash}</p>}

      {view === 'map' ? (
        <div className="prep-work">
          <MapCanvas data={data} play={play} mode={mode} selected={selected} lang={lang}
            onSelect={setSelected}
            onMoveNode={(id, x, y) => changeData(d => updateNode(d, id, { x, y }))}
            onConnect={(a, b) => connect(a, b)}
            onCreateNode={createNode}
            available={available} highlighted={hot} />
          <aside className="prep-side" aria-label={t(lang, 'Detalhes', 'Details')}>{side}</aside>
        </div>
      ) : (
        <div className="prep-work is-list">
          <NodeList data={data} play={play} mode={mode} selectedId={selNode?.id || (mode === 'play' && !selected ? current?.id : null)}
            available={available} lang={lang}
            onSelect={(id) => setSelected(s => (s?.type === 'node' && s.id === id ? null : { type: 'node', id }))}
            onCreate={() => createNode()}
            renderPanel={panelFor} />
          {selEdge && <aside className="prep-side">{side}</aside>}
        </div>
      )}
    </div>
  );
}
