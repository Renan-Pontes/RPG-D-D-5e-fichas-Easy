import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { HERO_ART } from '../art.js';
import { tName } from '../../data/i18n.js';
import { prepApi } from './prep-api.js';
import {
  normalizePlan, addScene, addSecret, updateItem, removeItem, moveItem, toggleId, padSecrets,
  toggleDiscovered, revealBodyFor, planDiff, planProgress, carryOver, textForRef, SECRET_GOAL, PLAN_LIMITS,
} from './next-session.js';
import { WORLD_KINDS } from './prep-world.js';
// Ícones e nomes dos tipos vêm do Mundo, para casar com o Atlas (🧑 NPCs, ⚜️ Facções, 📜 Histórias).
import { kindIcon, kindLabel } from '../world/world-model.js';
import WorldRefs from './WorldRefs.jsx';
import usePrepConfirm from './usePrepConfirm.jsx';
import './next-session.css';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

const STEPS = [
  { id: 'party',       icon: '🛡', pt: 'O grupo',                 en: 'The party' },
  { id: 'strongStart', icon: '⚡', pt: 'Começo forte',            en: 'Strong start' },
  { id: 'scenes',      icon: '🎬', pt: 'Cenas possíveis',         en: 'Potential scenes' },
  { id: 'secrets',     icon: '🗝', pt: 'Segredos e pistas',       en: 'Secrets & clues' },
  { id: 'places',      icon: '🏰', pt: 'Lugares fantásticos',     en: 'Fantastic locations' },
  { id: 'npcs',        icon: '🧑', pt: 'NPCs importantes',        en: 'Important NPCs' },
  { id: 'monsters',    icon: '🐉', pt: 'Monstros',                en: 'Monsters' },
  { id: 'rewards',     icon: '💎', pt: 'Recompensas',             en: 'Rewards' },
];

/**
 * Preparar › Próxima sessão — o checklist do "Mestre Preguiçoso", salvo sozinho
 * em /session-plan (merge por chave). Nada é revelado sem o mestre pedir.
 */
export default function NextSession({ campaign, lang, goTo }) {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const [world, setWorld] = useState(null);
  const [worldError, setWorldError] = useState(false);
  const [adventures, setAdventures] = useState([]);
  const [asks, setAsks] = useState({}); // secretItemId -> ask
  const [logDiary, setLogDiary] = useState(true);
  const [flash, setFlash] = useState('');
  const [confirm, confirmEl] = usePrepConfirm(lang);

  const planRef = useRef(null);
  const savedRef = useRef(null);
  const timer = useRef(null);
  const dirtySince = useRef(0);
  const dirty = useRef(false);
  const chain = useRef(Promise.resolve());
  const details = useRef(new Map()); // entryId -> entry completo (segredos)

  // ---------------------------------------------------------------- carga
  useEffect(() => {
    let alive = true;
    prepApi.getSessionPlan(campaign.id).then(r => {
      if (!alive) return;
      const p = normalizePlan(r.plan);
      savedRef.current = p;
      planRef.current = padSecrets(p);
      setPlan(planRef.current);
    }).catch(e => { if (alive) { setError(errorMessage(e, lang)); setPlan(null); } });
    prepApi.listWorld(campaign.id).then(r => alive && setWorld(r.entries || [])).catch(() => { if (alive) { setWorld([]); setWorldError(true); } });
    api.listAdventures(campaign.id).then(r => alive && setAdventures(r.adventures || [])).catch(() => {});
    return () => { alive = false; };
  }, [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- autosave
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    chain.current = chain.current.then(async () => {
      if (!planRef.current || !savedRef.current) return;
      const snapshot = planRef.current;
      dirty.current = false;
      const patch = planDiff(savedRef.current, snapshot);
      if (!Object.keys(patch).length) { setSaveState('saved'); return; }
      setSaveState('saving');
      try {
        await prepApi.saveSessionPlan(campaign.id, patch);
        savedRef.current = { ...savedRef.current, ...patch };
        setSaveState(Object.keys(planDiff(savedRef.current, planRef.current)).length ? 'dirty' : 'saved');
      } catch (e) {
        setSaveState('error');
        setError(errorMessage(e, lang));
      }
    });
    return chain.current;
  }, [campaign.id, lang]);

  const change = (fn) => {
    const next = fn(planRef.current);
    if (next === planRef.current) return;
    if (!dirty.current) { dirty.current = true; dirtySince.current = Date.now(); }
    planRef.current = next;
    setPlan(next);
    setSaveState('dirty');
    clearTimeout(timer.current);
    if (Date.now() - dirtySince.current > 3000) flush();
    else timer.current = setTimeout(flush, 700);
  };

  useEffect(() => () => { flush(); }, [flush]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush); };
  }, [flush]);

  const say = (text) => { setFlash(text); setTimeout(() => setFlash(f => (f === text ? '' : f)), 4000); };

  // ---------------------------------------------------------------- Mundo
  const loadEntry = useCallback(async (entryId) => {
    if (details.current.has(entryId)) return details.current.get(entryId);
    const r = await prepApi.getEntry(entryId);
    details.current.set(entryId, r.entry);
    return r.entry;
  }, []);

  const createEntry = async (kind, name) => {
    const r = await prepApi.createEntry(campaign.id, { kind, name, visibility: 'hidden' });
    const e = r.entry;
    const light = { id: e.id, kind: e.kind, name: e.name, summary: e.summary || '', tags: e.tags || [], visibility: e.visibility, imageVer: e.imageVer || '', imageUrl: e.imageUrl || null, secretsCount: 0 };
    setWorld(w => [...(w || []), light]);
    return light;
  };

  const nodesCache = useRef(new Map()); // adventureId -> Promise<nodes>
  const loadNodes = useCallback((advId) => {
    if (!nodesCache.current.has(advId)) {
      const p = api.getAdventure(campaign.id, advId).then(r => r.adventure?.data?.nodes || []);
      p.catch(() => nodesCache.current.delete(advId));
      nodesCache.current.set(advId, p);
    }
    return nodesCache.current.get(advId);
  }, [campaign.id]);

  const openEntry = goTo ? (e) => goTo('world', 'atlas', { entryId: e.id }) : null;

  // ---------------------------------------------------------------- pistas
  const onDiscover = async (id) => {
    const { plan: next, ask } = toggleDiscovered(planRef.current, id);
    change(() => next);
    if (!ask) { setAsks(a => { const c = { ...a }; delete c[id]; return c; }); return; }
    // Se o segredo já está revelado no cartão, não há o que perguntar.
    try {
      const entry = await loadEntry(ask.entryId);
      const already = ask.secretId
        ? entry.secrets?.find(s => s.id === ask.secretId)?.revealed
        : entry.visibility === 'revealed';
      if (already) return;
      setAsks(a => ({ ...a, [id]: { ...ask, entryName: entry.name, secretText: entry.secrets?.find(s => s.id === ask.secretId)?.text || '' } }));
    } catch {
      setAsks(a => ({ ...a, [id]: ask }));
    }
  };

  const doReveal = async (id) => {
    const ask = asks[id];
    if (!ask) return;
    try {
      const r = await prepApi.reveal(ask.entryId, revealBodyFor(ask, { logDiary, lang }));
      if (r?.entry) {
        details.current.set(ask.entryId, r.entry);
        setWorld(w => (w || []).map(e => (e.id === ask.entryId ? { ...e, visibility: r.entry.visibility } : e)));
      }
      setAsks(a => { const c = { ...a }; delete c[id]; return c; });
      say(t(lang, `Revelado aos jogadores em “${ask.entryName || '…'}”.`, `Revealed to the players on “${ask.entryName || '…'}”.`));
    } catch (e) { setError(errorMessage(e, lang)); }
  };
  const dismissAsk = (id) => setAsks(a => { const c = { ...a }; delete c[id]; return c; });

  const newSession = async () => {
    const ok = await confirm({
      title: t(lang, 'Preparar a próxima sessão?', 'Prepare the next session?'),
      text: t(lang,
        'O plano é esvaziado. As pistas que o grupo ainda não descobriu, os lugares e os NPCs continuam para a próxima.',
        'The plan is cleared. Clues the party has not found yet, places and NPCs carry over to the next one.'),
      ok: t(lang, 'Começar a próxima', 'Start the next one'),
    });
    if (!ok) return;
    setAsks({});
    change(p => padSecrets(carryOver(p)));
  };

  const progress = useMemo(() => (plan ? planProgress(plan) : null), [plan]);
  const party = (campaign.members || []).filter(m => m.role !== 'dm');

  if (!plan) {
    return (
      <div className="ns">
        {error ? <p className="prep-error" role="alert">{error}</p> : <p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p>}
      </div>
    );
  }

  const stepDone = Object.fromEntries(progress.steps.map(s => [s.id, s.done]));
  const secretsInfo = progress.steps.find(s => s.id === 'secrets');
  const saveText = { saved: t(lang, '✓ Salvo', '✓ Saved'), dirty: t(lang, 'Alterado…', 'Edited…'), saving: t(lang, 'Salvando…', 'Saving…'), error: t(lang, 'Erro ao salvar', 'Save failed') }[saveState];
  const pct = Math.round((progress.done / progress.total) * 100);

  return (
    <div className="ns">
      <header className="ns-hero" style={{ '--ns-art': `url(${HERO_ART})` }}>
        <div className="ns-hero-text">
          <p className="ns-kicker">{t(lang, 'Preparar', 'Prepare')}</p>
          <h2>{t(lang, 'Próxima sessão', 'Next session')}</h2>
          <p className="ns-lead">{t(lang,
            'Prepare o que importa e improvise o resto. Cada campo se salva sozinho — preencha na ordem que quiser.',
            'Prepare what matters and improvise the rest. Every field saves itself — fill them in any order.')}</p>
        </div>
        <div className="ns-ring" style={{ '--pct': pct }} role="img"
          aria-label={t(lang, `${progress.done} de ${progress.total} passos prontos`, `${progress.done} of ${progress.total} steps ready`)}>
          <span><strong>{progress.done}</strong>/{progress.total}</span>
        </div>
        <span className={`ns-save s-${saveState}`} role="status">{saveText}</span>
      </header>

      <nav className="ns-steps" aria-label={t(lang, 'Passos', 'Steps')}>
        {STEPS.map(s => (
          <a key={s.id} href={`#ns-${s.id}`} className={`ns-step-pill ${stepDone[s.id] ? 'is-done' : ''}`}
            onClick={(e) => { e.preventDefault(); document.getElementById(`ns-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
            <span aria-hidden="true">{stepDone[s.id] ? '✓' : s.icon}</span> {t(lang, s.pt, s.en)}
          </a>
        ))}
      </nav>

      {error && <p className="prep-error" role="alert">{error} <button type="button" className="linklike" onClick={() => setError('')}>ok</button></p>}
      {flash && <p className="prep-msg ns-flash" role="status">{flash}</p>}

      {/* 1. O grupo */}
      <Step id="party" n={1} lang={lang} hint={t(lang, 'Olhe quem estará na mesa: o que cada personagem quer?', 'Look at who will be at the table: what does each character want?')}>
        {party.length === 0 ? (
          <p className="muted small">{t(lang, 'Ninguém entrou ainda. Convide os jogadores em Grupo.', 'Nobody has joined yet. Invite players under Party.')}
            {goTo && <> <button type="button" className="linklike" onClick={() => goTo('group', 'players')}>{t(lang, 'Ir para Grupo', 'Go to Party')} →</button></>}</p>
        ) : (
          <ul className="ns-party">
            {party.map(m => {
              const d = m.character?.data || {};
              const sum = m.character?.summary || {};
              const cls = d.className || sum.className;
              const avatar = d.avatar || sum.avatar;
              return (
                <li key={m.id}>
                  {avatar ? <img src={avatar} alt="" /> : <span className="ns-party-ph" aria-hidden="true">🛡</span>}
                  <span>
                    <strong>{m.character?.name || m.user?.displayName || '?'}</strong>
                    <span className="muted small">{m.character
                      ? ` ${cls ? tName('class', cls, lang) : ''} ${t(lang, 'nível', 'level')} ${d.level || sum.level || 1}`
                      : ` ${t(lang, 'sem personagem', 'no character')}`}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Step>

      {/* 2. Começo forte */}
      <Step id="strongStart" n={2} lang={lang} done={stepDone.strongStart}
        hint={t(lang, 'Comece no meio da ação: algo acontece logo no primeiro minuto.', 'Start in the middle of the action: something happens in the first minute.')}>
        <textarea className="input ns-big" rows={3} maxLength={PLAN_LIMITS.long} value={plan.strongStart}
          aria-label={t(lang, 'Começo forte', 'Strong start')}
          placeholder={t(lang, 'Ex.: O sino da vila toca sozinho à meia-noite — e a água do poço começa a subir…', 'E.g. The village bell rings by itself at midnight — and the well water starts to rise…')}
          onChange={e => change(p => ({ ...p, strongStart: e.target.value }))} />
      </Step>

      {/* 3. Cenas */}
      <Step id="scenes" n={3} lang={lang} done={stepDone.scenes}
        hint={t(lang, 'Algumas cenas que podem acontecer. Não é roteiro: o grupo decide a ordem.', 'A few scenes that might happen. Not a script: the party picks the order.')}>
        <ol className="ns-list">
          {plan.scenes.map((s, i) => (
            <li key={s.id} className={`ns-row ${s.done ? 'is-done' : ''}`}>
              <label className="ns-tick" title={t(lang, 'Aconteceu', 'Happened')}>
                <input type="checkbox" checked={s.done} onChange={() => change(p => updateItem(p, 'scenes', s.id, { done: !s.done }))}
                  aria-label={t(lang, `Cena ${i + 1} aconteceu`, `Scene ${i + 1} happened`)} />
              </label>
              <div className="ns-row-body">
                <input className="input" value={s.text} maxLength={PLAN_LIMITS.text}
                  aria-label={t(lang, `Cena ${i + 1}`, `Scene ${i + 1}`)}
                  placeholder={t(lang, 'Ex.: Negociar com a sacerdotisa no templo alagado', 'E.g. Bargain with the priestess in the flooded temple')}
                  onChange={e => change(p => updateItem(p, 'scenes', s.id, { text: e.target.value }))} />
                <SceneLink value={s.nodeRef} adventures={adventures} lang={lang} loadNodes={loadNodes}
                  onChange={(ref) => change(p => updateItem(p, 'scenes', s.id, { nodeRef: ref }))}
                  onOpen={goTo ? (ref) => goTo('prepare', 'adventures', { adventureId: ref.adventureId, nodeId: ref.nodeId }) : null} />
              </div>
              <RowTools lang={lang} first={i === 0} last={i === plan.scenes.length - 1}
                onUp={() => change(p => moveItem(p, 'scenes', s.id, -1))} onDown={() => change(p => moveItem(p, 'scenes', s.id, 1))}
                onRemove={() => change(p => removeItem(p, 'scenes', s.id))} />
            </li>
          ))}
        </ol>
        {plan.scenes.length === 0 && <p className="muted small">{t(lang, 'Nenhuma cena ainda. Três ou quatro já bastam.', 'No scenes yet. Three or four are plenty.')}</p>}
        <button type="button" className="btn btn-ghost btn-sm" disabled={plan.scenes.length >= PLAN_LIMITS.scenes} onClick={() => change(p => addScene(p))}>＋ {t(lang, 'Cena', 'Scene')}</button>
      </Step>

      {/* 4. Segredos e pistas */}
      <Step id="secrets" n={4} lang={lang} done={stepDone.secrets}
        badge={`${secretsInfo.count}/${SECRET_GOAL}`}
        hint={t(lang,
          'Dez coisas que o grupo pode descobrir, sem dizer onde. Ligue uma pista ao segredo de um cartão do Mundo e, quando o grupo descobrir, você decide se revela no cartão.',
          'Ten things the party might discover, without deciding where. Link a clue to a World card secret and, when the party finds it, you decide whether to reveal it on the card.')}>
        <ol className="ns-list ns-secrets">
          {plan.secrets.map((s, i) => (
            <li key={s.id} className={`ns-row ${s.discovered ? 'is-done' : ''}`}>
              <label className="ns-tick" title={t(lang, 'Descoberta', 'Discovered')}>
                <input type="checkbox" checked={s.discovered} onChange={() => onDiscover(s.id)}
                  aria-label={t(lang, `Pista ${i + 1} descoberta`, `Clue ${i + 1} discovered`)} />
              </label>
              <div className="ns-row-body">
                <input className="input" value={s.text} maxLength={PLAN_LIMITS.text}
                  aria-label={t(lang, `Pista ${i + 1}`, `Clue ${i + 1}`)}
                  placeholder={i === 0
                    ? t(lang, 'Ex.: O taverneiro deve dinheiro ao culto do sino', 'E.g. The innkeeper owes money to the bell cult')
                    : t(lang, `Pista ${i + 1}`, `Clue ${i + 1}`)}
                  onChange={e => change(p => updateItem(p, 'secrets', s.id, { text: e.target.value }))} />
                <SecretLink value={s.ref} world={world} lang={lang} loadEntry={loadEntry}
                  onChange={(ref, entry, secret) => change(p => updateItem(p, 'secrets', s.id, { ref, text: ref ? textForRef(s.text, entry, secret) : s.text }))} />
                {asks[s.id] && (
                  <div className="ns-ask" role="group" aria-label={t(lang, 'Revelar no cartão?', 'Reveal on the card?')}>
                    <p>✨ {t(lang, 'Revelar também no cartão', 'Also reveal on the card')} <strong>{asks[s.id].entryName || '…'}</strong>?
                      {asks[s.id].secretText && <span className="muted small"> “{asks[s.id].secretText.slice(0, 120)}”</span>}</p>
                    <div className="ns-ask-actions">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => doReveal(s.id)}>👁 {t(lang, 'Revelar', 'Reveal')}</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => dismissAsk(s.id)}>{t(lang, 'Agora não', 'Not now')}</button>
                      <label className="ns-inline-check"><input type="checkbox" checked={logDiary} onChange={e => setLogDiary(e.target.checked)} /> {t(lang, "Registrar na Crônica", "Log to Chronicle")}</label>
                    </div>
                  </div>
                )}
              </div>
              <RowTools lang={lang} first={i === 0} last={i === plan.secrets.length - 1}
                onUp={() => change(p => moveItem(p, 'secrets', s.id, -1))} onDown={() => change(p => moveItem(p, 'secrets', s.id, 1))}
                onRemove={() => { dismissAsk(s.id); change(p => removeItem(p, 'secrets', s.id)); }} />
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-ghost btn-sm" disabled={plan.secrets.length >= PLAN_LIMITS.secrets} onClick={() => change(p => addSecret(p))}>＋ {t(lang, 'Pista', 'Clue')}</button>
      </Step>

      {/* 5. Lugares */}
      <Step id="places" n={5} lang={lang} done={stepDone.places}
        hint={t(lang, 'Onde as cenas acontecem? Um detalhe marcante por lugar já faz a mesa sonhar.', 'Where do the scenes happen? One striking detail per place gets the table dreaming.')}>
        <WorldRefs entries={world} ids={plan.placeIds} kinds={['place']} lang={lang} max={PLAN_LIMITS.ids}
          onToggle={(id) => change(p => toggleId(p, 'placeIds', id))} onCreate={createEntry} onOpen={openEntry}
          addLabel={t(lang, 'Escolher lugares', 'Pick places')}
          emptyText={worldError ? t(lang, 'Não consegui carregar o Mundo agora.', 'Could not load the World right now.') : t(lang, 'Nenhum lugar escolhido.', 'No places picked.')} />
      </Step>

      {/* 6. NPCs */}
      <Step id="npcs" n={6} lang={lang} done={stepDone.npcs}
        hint={t(lang, 'Quem o grupo pode encontrar? Pense no que cada um quer.', 'Who might the party meet? Think about what each one wants.')}>
        <WorldRefs entries={world} ids={plan.npcIds} kinds={['npc', 'faction']} lang={lang} max={PLAN_LIMITS.ids}
          onToggle={(id) => change(p => toggleId(p, 'npcIds', id))} onCreate={createEntry} onOpen={openEntry}
          addLabel={t(lang, 'Escolher NPCs', 'Pick NPCs')}
          emptyText={t(lang, 'Nenhum NPC escolhido.', 'No NPCs picked.')} />
      </Step>

      {/* 7. Monstros */}
      <Step id="monsters" n={7} lang={lang} done={stepDone.monsters}
        hint={t(lang, 'Que criaturas fazem sentido aqui? Os encontros completos ficam nas salas das Aventuras.', 'Which creatures fit here? Full encounters live in the Adventure rooms.')}>
        <textarea className="input" rows={3} maxLength={PLAN_LIMITS.long} value={plan.monsters}
          aria-label={t(lang, 'Monstros', 'Monsters')}
          placeholder={t(lang, 'Ex.: 4 goblins, 1 lobo atroz; o afogado do sino (chefe)', 'E.g. 4 goblins, 1 dire wolf; the drowned one of the bell (boss)')}
          onChange={e => change(p => ({ ...p, monsters: e.target.value }))} />
        {goTo && <button type="button" className="linklike small" onClick={() => goTo('prepare', 'adventures')}>{t(lang, 'Montar encontros nas Aventuras', 'Build encounters in Adventures')} →</button>}
      </Step>

      {/* 8. Recompensas */}
      <Step id="rewards" n={8} lang={lang} done={stepDone.rewards}
        hint={t(lang, 'Ouro, itens mágicos, favores, informação. Algo que conte a história do mundo.', 'Gold, magic items, favors, information. Something that tells the world’s story.')}>
        <textarea className="input" rows={3} maxLength={PLAN_LIMITS.long} value={plan.rewards}
          aria-label={t(lang, 'Recompensas', 'Rewards')}
          placeholder={t(lang, 'Ex.: 120 po no altar; a Lanterna da Maré (item da campanha); o favor da sacerdotisa', 'E.g. 120 gp on the altar; the Tide Lantern (campaign item); the priestess’s favor')}
          onChange={e => change(p => ({ ...p, rewards: e.target.value }))} />
        {goTo && <button type="button" className="linklike small" onClick={() => goTo('prepare', 'items')}>{t(lang, 'Ver itens da campanha', 'See campaign items')} →</button>}
      </Step>

      <footer className="ns-foot">
        <p className="muted small">{t(lang, 'Sessão jogada? Comece a próxima levando as pistas que ficaram para trás.', 'Session played? Start the next one carrying over the clues left behind.')}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={newSession}>↻ {t(lang, 'Preparar a próxima sessão', 'Prepare the next session')}</button>
      </footer>
      {confirmEl}
    </div>
  );
}

function Step({ id, n, lang, done, hint, badge, children }) {
  const s = STEPS.find(x => x.id === id);
  return (
    <section id={`ns-${id}`} className={`ns-step ${done ? 'is-done' : ''}`} aria-labelledby={`ns-h-${id}`}>
      <header>
        <span className="ns-num" aria-hidden="true">{done ? '✓' : n}</span>
        <h3 id={`ns-h-${id}`}><span aria-hidden="true">{s.icon}</span> {t(lang, s.pt, s.en)}</h3>
        {badge && <span className="ns-badge">{badge}</span>}
      </header>
      {hint && <p className="ns-hint">{hint}</p>}
      <div className="ns-step-body">{children}</div>
    </section>
  );
}

function RowTools({ lang, first, last, onUp, onDown, onRemove }) {
  return (
    <div className="ns-row-tools">
      <button type="button" className="btn btn-ghost btn-icon" disabled={first} onClick={onUp} aria-label={t(lang, 'Subir', 'Move up')}>↑</button>
      <button type="button" className="btn btn-ghost btn-icon" disabled={last} onClick={onDown} aria-label={t(lang, 'Descer', 'Move down')}>↓</button>
      <button type="button" className="btn btn-ghost btn-icon danger" onClick={onRemove} aria-label={t(lang, 'Remover', 'Remove')}>×</button>
    </div>
  );
}

/** Liga uma cena a uma sala de aventura (opcional). */
function SceneLink({ value, adventures, lang, loadNodes, onChange, onOpen }) {
  const [editing, setEditing] = useState(false);
  const [advId, setAdvId] = useState('');
  const [nodes, setNodes] = useState(null);
  const [nodeName, setNodeName] = useState('');
  const adv = value ? adventures.find(a => a.id === value.adventureId) : null;

  useEffect(() => {
    let alive = true;
    setNodeName('');
    if (value?.adventureId) {
      loadNodes(value.adventureId).then(list => {
        if (alive) setNodeName(list.find(n => n.id === value.nodeId)?.name || '');
      }).catch(() => {});
    }
    return () => { alive = false; };
  }, [value?.adventureId, value?.nodeId, loadNodes]);

  const pickAdventure = async (id) => {
    setAdvId(id);
    setNodes(null);
    if (!id) return;
    try { setNodes(await loadNodes(Number(id))); } catch { setNodes([]); }
  };

  if (!editing) {
    return (
      <div className="ns-link">
        {value ? (
          <>
            <span className="ns-link-tag">🗺 {adv ? adv.name : t(lang, 'Aventura apagada', 'Deleted adventure')}{nodeName ? ` › ${nodeName}` : ''}</span>
            {onOpen && adv && <button type="button" className="linklike small" onClick={() => onOpen(value)}>{t(lang, 'Abrir', 'Open')}</button>}
            <button type="button" className="linklike small" onClick={() => onChange(null)}>{t(lang, 'Desligar', 'Unlink')}</button>
          </>
        ) : adventures.length > 0 && (
          <button type="button" className="linklike small" onClick={() => setEditing(true)}>🔗 {t(lang, 'Ligar a uma sala de aventura', 'Link to an adventure room')}</button>
        )}
      </div>
    );
  }
  return (
    <div className="ns-link-edit">
      <select className="input" value={advId} onChange={e => pickAdventure(e.target.value)} aria-label={t(lang, 'Aventura', 'Adventure')}>
        <option value="">{t(lang, 'Aventura…', 'Adventure…')}</option>
        {adventures.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      {advId && (
        <select className="input" defaultValue="" disabled={!nodes} aria-label={t(lang, 'Sala', 'Room')}
          onChange={e => { if (e.target.value) { onChange({ adventureId: Number(advId), nodeId: e.target.value }); setEditing(false); } }}>
          <option value="">{nodes ? (nodes.length ? t(lang, 'Sala…', 'Room…') : t(lang, 'Sem salas ainda', 'No rooms yet')) : t(lang, 'Carregando…', 'Loading…')}</option>
          {(nodes || []).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      )}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>{t(lang, 'Cancelar', 'Cancel')}</button>
    </div>
  );
}

/** Liga uma pista a um segredo de um cartão do Mundo (ou ao cartão inteiro). */
function SecretLink({ value, world, lang, loadEntry, onChange }) {
  const [editing, setEditing] = useState(false);
  const [entryId, setEntryId] = useState('');
  const [entry, setEntry] = useState(null);
  const [failed, setFailed] = useState(false);
  const linked = value && (world || []).find(e => e.id === value.entryId);
  const [secretText, setSecretText] = useState('');

  useEffect(() => {
    let alive = true;
    setSecretText('');
    if (value?.entryId && value.secretId) {
      loadEntry(value.entryId).then(en => {
        if (alive) setSecretText(en?.secrets?.find(s => s.id === value.secretId)?.text || '');
      }).catch(() => {});
    }
    return () => { alive = false; };
  }, [value?.entryId, value?.secretId, loadEntry]);

  const pickEntry = async (id) => {
    setEntryId(id); setEntry(null); setFailed(false);
    if (!id) return;
    try { setEntry(await loadEntry(Number(id))); } catch { setFailed(true); }
  };

  if (!editing) {
    if (value) {
      return (
        <div className="ns-link">
          <span className="ns-link-tag">{linked ? kindIcon(linked.kind) : '🔗'} {linked ? linked.name : t(lang, 'Cartão apagado', 'Deleted card')}
            {value.secretId ? <> › 🗝 {secretText ? `“${secretText.slice(0, 40)}${secretText.length > 40 ? '…' : ''}”` : t(lang, 'segredo', 'secret')}</> : ''}</span>
          <button type="button" className="linklike small" onClick={() => onChange(null)}>{t(lang, 'Desligar', 'Unlink')}</button>
        </div>
      );
    }
    if (!world || world.length === 0) return null;
    return (
      <div className="ns-link">
        <button type="button" className="linklike small" onClick={() => setEditing(true)}>🔗 {t(lang, 'Ligar a um segredo do Mundo', 'Link to a World secret')}</button>
      </div>
    );
  }

  return (
    <div className="ns-link-edit">
      <select className="input" value={entryId} onChange={e => pickEntry(e.target.value)} aria-label={t(lang, 'Cartão do Mundo', 'World card')}>
        <option value="">{t(lang, 'Cartão…', 'Card…')}</option>
        {WORLD_KINDS.map(k => {
          const list = (world || []).filter(e => e.kind === k.id);
          if (!list.length) return null;
          return (
            <optgroup key={k.id} label={`${kindIcon(k.id)} ${kindLabel(k.id, lang, true)}`}>
              {list.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </optgroup>
          );
        })}
      </select>
      {entryId && !entry && !failed && <span className="muted small">{t(lang, 'Carregando…', 'Loading…')}</span>}
      {failed && <span className="prep-error small">{t(lang, 'Não consegui abrir o cartão.', 'Could not open the card.')}</span>}
      {entry && (
        <div className="ns-secret-choices" role="group" aria-label={t(lang, 'Qual segredo?', 'Which secret?')}>
          {(entry.secrets || []).map(sc => (
            <button type="button" key={sc.id} className="ns-secret-choice" onClick={() => { onChange({ entryId: entry.id, secretId: sc.id }, entry, sc); setEditing(false); }}>
              🗝 {sc.text.slice(0, 90)}{sc.text.length > 90 ? '…' : ''} {sc.revealed && <span className="muted small">({t(lang, 'já revelado', 'already revealed')})</span>}
            </button>
          ))}
          <button type="button" className="ns-secret-choice is-card" onClick={() => { onChange({ entryId: entry.id, secretId: null }, entry, null); setEditing(false); }}>
            {kindIcon(entry.kind)} {t(lang, 'O cartão inteiro (revelar o cartão)', 'The whole card (reveal the card)')}
          </button>
          {(entry.secrets || []).length === 0 && <p className="muted small">{t(lang, 'Este cartão ainda não tem segredos. Escreva-os no Mundo.', 'This card has no secrets yet. Write them in the World.')}</p>}
        </div>
      )}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>{t(lang, 'Cancelar', 'Cancel')}</button>
    </div>
  );
}

