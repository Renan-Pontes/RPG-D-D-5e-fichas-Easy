// Jogar › Cena: o plano da sessão (Preparar › Próxima sessão) à mão, num painel
// recolhível — começo forte, cenas com "aconteceu", pistas com "descoberta" e
// um lembrete dos NPCs preparados (os cartões ficam em "Nesta cena"). Marcar uma pista NUNCA revela nada: se ela está ligada a
// um cartão do Mundo, o painel só PERGUNTA "Revelar no cartão?".
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePolling } from '../api/polling.js';
import { getEntry, getSessionPlan, listWorld, revealEntry, saveSessionPlan, worldErrorText } from '../world/world-api.js';
import { getAdventure } from './play-api.js';
import { normalizePlan, revealBodyFor, toggleDiscovered, updateItem } from '../prep/next-session.js';
import { nextScene, playPlanView, sceneFieldText } from './plan-model.js';
import { flash } from './flash.js';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const OPEN_KEY = (id) => `forja.play.planOpen.${id}`;

function readOpen(id) {
  try { const v = window.localStorage.getItem(OPEN_KEY(id)); return v == null ? true : v === '1'; } catch { return true; }
}
function writeOpen(id, open) {
  try { window.localStorage.setItem(OPEN_KEY(id), open ? '1' : '0'); } catch { /* sem storage */ }
}

export default function SessionPlanPanel({ campaign, lang = 'pt', goTo, onSaveState }) {
  const [plan, setPlan] = useState(undefined);   // undefined = carregando; null = erro
  const [entries, setEntries] = useState([]);
  const [rooms, setRooms] = useState({});        // `${advId}:${nodeId}` → nome
  const [open, setOpen] = useState(() => readOpen(campaign.id));
  const [ask, setAsk] = useState(null);          // pergunta "revelar no cartão?"
  const [busy, setBusy] = useState(false);
  const saving = useRef(0);
  const loadedAdv = useRef(new Set());

  const load = useCallback(async () => {
    if (saving.current) return; // não atropela uma marcação em curso
    const [p, w] = await Promise.allSettled([getSessionPlan(campaign.id), listWorld(campaign.id)]);
    if (p.status === 'fulfilled') setPlan(normalizePlan(p.value));
    else setPlan(prev => (prev === undefined ? null : prev));
    if (w.status === 'fulfilled') setEntries(w.value.entries || []);
  }, [campaign.id]);
  usePolling(load, 12000, [campaign.id]);

  // Nomes das salas ligadas às cenas (uma leitura por aventura).
  useEffect(() => {
    const ids = [...new Set((plan?.scenes || []).map(s => s.nodeRef?.adventureId).filter(Boolean))];
    ids.filter(id => !loadedAdv.current.has(id)).forEach(id => {
      loadedAdv.current.add(id);
      getAdventure(campaign.id, id).then(r => {
        const adv = r.adventure || r;
        const names = {};
        for (const n of adv?.data?.nodes || []) names[`${id}:${n.id}`] = n.name;
        setRooms(prev => ({ ...prev, ...names }));
      }).catch(() => loadedAdv.current.delete(id));
    });
  }, [plan, campaign.id]);

  const view = useMemo(() => (plan ? playPlanView(plan, {
    entries, nodeName: (a, n) => rooms[`${a}:${n}`] || null,
  }) : null), [plan, entries, rooms]);

  const toggleOpen = (e) => {
    const next = e.currentTarget.open;
    setOpen(next);
    writeOpen(campaign.id, next);
  };

  // Salva só a chave mudada (o servidor faz merge por chave).
  const save = async (next, key) => {
    const prev = plan;
    setPlan(next);
    saving.current += 1;
    try {
      const saved = await saveSessionPlan(campaign.id, { [key]: next[key] });
      if (saved) setPlan(normalizePlan(saved));
      return true;
    } catch (e) {
      setPlan(prev);
      flash(worldErrorText(e, lang), { error: true });
      return false;
    } finally { saving.current -= 1; }
  };

  const toggleScene = (id) => {
    const s = plan.scenes.find(x => x.id === id);
    if (s) save(updateItem(plan, 'scenes', id, { done: !s.done }), 'scenes');
  };

  const toggleClue = async (id) => {
    const { plan: next, ask: question } = toggleDiscovered(plan, id);
    const ok = await save(next, 'secrets');
    if (!ok) return;
    if (!question) { if (ask?.secretItemId === id) setAsk(null); return; }
    // Já revelado no cartão? Então não há o que perguntar.
    try {
      const entry = await getEntry(question.entryId);
      const already = question.secretId
        ? entry?.secrets?.find(x => x.id === question.secretId)?.revealed
        : entry?.visibility === 'revealed';
      if (already) return;
      setAsk({ ...question, entryName: entry?.name || '' });
    } catch {
      setAsk(question);
    }
  };

  const doReveal = async () => {
    if (!ask) return;
    setBusy(true);
    try {
      const body = revealBodyFor(ask, { logDiary: true, lang });
      await revealEntry(ask.entryId, body);
      flash(L(lang, `Revelado aos jogadores em “${ask.entryName || '…'}”.`, `Revealed to the players on “${ask.entryName || '…'}”.`));
      setAsk(null);
    } catch (e) {
      flash(worldErrorText(e, lang), { error: true });
    } finally { setBusy(false); }
  };

  const applyScene = async (scene) => {
    const text = sceneFieldText(scene);
    if (!text || !onSaveState) return;
    try {
      await onSaveState({ scene: text });
      flash(L(lang, `Cena atual: ${text}`, `Current scene: ${text}`));
    } catch { flash(L(lang, 'Não consegui salvar a cena.', 'Could not save the scene.'), { error: true }); }
  };

  if (plan === undefined) return null;
  if (plan === null) return null; // erro de leitura: o resto da Cena continua
  const currentScene = String(campaign.state?.scene || '').trim();

  if (!view.hasContent) {
    return (
      <section className="spp spp-empty" aria-label={L(lang, 'Plano da sessão', 'Session plan')}>
        <span>📜 {L(lang, 'Sem plano para esta sessão.', 'No plan for this session.')}</span>
        {goTo && (
          <button type="button" className="btn-link" onClick={() => goTo('prepare', 'next')}>
            {L(lang, 'Preparar a próxima sessão →', 'Prepare the next session →')}
          </button>
        )}
      </section>
    );
  }

  const suggestion = nextScene(view);
  const pg = view.progress;

  return (
    <details className="spp" open={open} onToggle={toggleOpen}>
      <summary className="spp-summary">
        <span className="spp-title">📜 {L(lang, 'Plano da sessão', 'Session plan')}</span>
        <span className="spp-progress muted small">
          {pg.scenes > 0 && <span>🎬 {pg.scenesDone}/{pg.scenes}</span>}
          {pg.clues > 0 && <span>🗝 {pg.cluesFound}/{pg.clues}</span>}
        </span>
      </summary>

      <div className="spp-body">
        {view.strongStart && (
          <div className="spp-block spp-strong">
            <span className="spp-eyebrow">⚡ {L(lang, 'Começo forte', 'Strong start')}</span>
            <p>{view.strongStart}</p>
          </div>
        )}

        {view.scenes.length > 0 && (
          <div className="spp-block">
            <span className="spp-eyebrow">🎬 {L(lang, 'Cenas', 'Scenes')}</span>
            <ul className="spp-list">
              {view.scenes.map(s => {
                const isCurrent = currentScene && sceneFieldText(s) === currentScene;
                return (
                  <li key={s.id} className={`spp-item ${s.done ? 'is-done' : ''}`}>
                    <label className="spp-check">
                      <input type="checkbox" checked={s.done} onChange={() => toggleScene(s.id)} />
                      <span className="spp-check-label">{L(lang, 'aconteceu', 'happened')}</span>
                    </label>
                    <div className="spp-text">
                      {s.text && <span className="spp-pre">{s.text}</span>}
                      {s.room && <span className="spp-room">📍 {s.room}</span>}
                    </div>
                    {onSaveState && !s.done && (
                      isCurrent
                        ? <span className="spp-now">{L(lang, 'cena atual', 'current')}</span>
                        : <button type="button" className="btn btn-ghost btn-sm spp-use"
                            title={L(lang, 'Põe esta cena no campo “Cena” lá em cima', 'Puts this scene in the “Scene” field above')}
                            onClick={() => applyScene(s)}>
                            {suggestion?.id === s.id ? '▶ ' : ''}{L(lang, 'Usar como cena', 'Use as scene')}
                          </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {view.clues.length > 0 && (
          <div className="spp-block">
            <span className="spp-eyebrow">🗝 {L(lang, 'Pistas', 'Clues')}</span>
            <ul className="spp-list">
              {view.clues.map(c => (
                <li key={c.id} className={`spp-item ${c.discovered ? 'is-done' : ''}`}>
                  <label className="spp-check">
                    <input type="checkbox" checked={c.discovered} onChange={() => toggleClue(c.id)} />
                    <span className="spp-check-label">{L(lang, 'descoberta', 'found')}</span>
                  </label>
                  <div className="spp-text">
                    {c.text && <span className="spp-pre">{c.text}</span>}
                    {c.entryName && <span className="spp-room">🔗 {c.entryName}</span>}
                  </div>
                  {ask?.secretItemId === c.id && (
                    <div className="spp-ask" role="group" aria-label={L(lang, 'Revelar no cartão?', 'Reveal on the card?')}>
                      <span>{L(lang, `Revelar também no cartão “${ask.entryName || '…'}”?`, `Also reveal it on “${ask.entryName || '…'}”?`)}</span>
                      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={doReveal}>👁 {L(lang, 'Revelar no cartão', 'Reveal on card')}</button>
                      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setAsk(null)}>{L(lang, 'Agora não', 'Not now')}</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(view.npcs.length > 0 || view.places.length > 0) && (
          <p className="muted small spp-note">
            🧑 {L(lang, `${view.npcs.length + view.places.length} NPC(s)/lugar(es) preparados — os cartões estão logo abaixo, em “Nesta cena”.`,
              `${view.npcs.length + view.places.length} prepared NPC(s)/place(s) — their cards are just below, in “In this scene”.`)}
          </p>
        )}

        {(view.monsters || view.rewards) && (
          <div className="spp-block spp-two">
            {view.monsters && <div><span className="spp-eyebrow">🐉 {L(lang, 'Monstros', 'Monsters')}</span><p className="spp-pre">{view.monsters}</p></div>}
            {view.rewards && <div><span className="spp-eyebrow">💎 {L(lang, 'Recompensas', 'Rewards')}</span><p className="spp-pre">{view.rewards}</p></div>}
          </div>
        )}

        {goTo && (
          <button type="button" className="btn-link spp-edit" onClick={() => goTo('prepare', 'next')}>
            ✎ {L(lang, 'Editar o plano em Preparar', 'Edit the plan in Prepare')}
          </button>
        )}
      </div>
    </details>
  );
}
