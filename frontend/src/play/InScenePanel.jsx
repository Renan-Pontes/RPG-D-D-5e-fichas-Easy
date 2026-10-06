// "Nesta cena" (Jogar › Cena): os cartões do Mundo ligados à sala onde o grupo
// está (nó ativo da aventura em "Conduzir"), mais os NPCs e lugares escolhidos
// no plano da próxima sessão. Cada cartão tem 👁 Revelar e 📺 Mostrar no telão.
// Regra: nada é revelado nem mostrado sem o toque do mestre.
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePolling } from '../api/polling.js';
import EntryCard from '../world/EntryCard.jsx';
import RevealControl from '../world/RevealControl.jsx';
import { getEntry, getSessionPlan, listWorld, showEntryOnScreen, worldErrorText } from '../world/world-api.js';
import { getAdventure, listAdventures, setScreenCard } from './play-api.js';
import { activeScene, sceneEntries } from './scene-model.js';
import { flash } from './flash.js';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function InScenePanel({ campaign, lang = 'pt', goTo }) {
  const [entries, setEntries] = useState(null);       // WorldEntryLight[] | null (carregando)
  const [scene, setScene] = useState(null);           // {adventure, node} | null
  const [plan, setPlan] = useState(null);
  const [revealing, setRevealing] = useState(null);   // WorldEntryFull em revelação
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const [w, advs, p] = await Promise.allSettled([
      listWorld(campaign.id), listAdventures(campaign.id), getSessionPlan(campaign.id),
    ]);
    if (w.status === 'fulfilled') setEntries(w.value.entries || []);
    else setEntries(prev => prev || []);
    if (p.status === 'fulfilled') setPlan(p.value || null);
    if (advs.status === 'fulfilled') {
      const pickAdv = activeScene(advs.value.adventures || []);
      if (pickAdv) {
        try {
          const full = await getAdventure(campaign.id, pickAdv.id);
          const adv = full.adventure || full;
          const node = (adv.data?.nodes || []).find(n => n.id === (adv.play?.current || pickAdv.currentNodeId));
          setScene(node ? { adventure: adv, node } : null);
        } catch { /* mantém a última */ }
      } else {
        setScene(null);
      }
    }
  }, [campaign.id]);
  usePolling(load, 8000, [campaign.id]);

  const groups = useMemo(() => sceneEntries({ entries: entries || [], node: scene?.node, plan }), [entries, scene, plan]);

  const patchLocal = (full) => {
    if (!full) return;
    setEntries(list => (list || []).map(e => (e.id === full.id
      ? { ...e, visibility: full.visibility, revealedAt: full.revealedAt, version: full.version,
        secretsRevealed: (full.secrets || []).filter(s => s.revealed).length }
      : e)));
  };

  const openReveal = async (entry) => {
    setBusyId(entry.id);
    try {
      setRevealing(await getEntry(entry.id));
    } catch (e) {
      flash(worldErrorText(e, lang), { error: true });
    } finally { setBusyId(null); }
  };

  const show = async (entry) => {
    setBusyId(entry.id);
    try {
      await showEntryOnScreen(campaign.id, entry.id);
      flash(L(lang, `No telão: ${entry.name}`, `On screen: ${entry.name}`));
    } catch (e) {
      flash(worldErrorText(e, lang), { error: true });
    } finally { setBusyId(null); }
  };

  const showScene = async () => {
    if (!scene) return;
    try {
      await setScreenCard(campaign.id, { type: 'scene', adventureId: scene.adventure.id, nodeId: scene.node.id });
      flash(L(lang, `No telão: ${scene.node.name}`, `On screen: ${scene.node.name}`));
    } catch (e) {
      flash(worldErrorText(e, lang), { error: true });
    }
  };

  const open = (entry) => goTo?.('world', 'atlas', { entryId: entry.id });
  const total = groups.scene.length + groups.planned.length;

  return (
    <section className="ins" aria-labelledby="ins-h">
      <header className="ins-head">
        <div className="ins-title">
          <span className="ins-eyebrow">{L(lang, 'Nesta cena', 'In this scene')}</span>
          <h3 id="ins-h">{scene ? scene.node.name : L(lang, 'Quem e o que está por perto', 'Who and what is around')}</h3>
          {scene && <span className="muted small">{scene.adventure.name}</span>}
        </div>
        <div className="ins-head-actions">
          {scene && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={showScene}
              title={L(lang, 'Mostra o nome e o texto da sala no telão', 'Shows the room name and text on screen')}>
              📺 {L(lang, 'Mostrar a cena', 'Show the scene')}
            </button>
          )}
        </div>
      </header>

      {entries === null && <p className="muted small">{L(lang, 'Carregando o mundo…', 'Loading the world…')}</p>}

      {entries !== null && total === 0 && (
        <div className="ins-empty">
          <p>
            {scene
              ? L(lang, 'Nenhum cartão do Mundo ligado a esta sala ainda.', 'No World card linked to this room yet.')
              : L(lang, 'Nenhuma sala em jogo agora.', 'No room in play right now.')}
          </p>
          <p className="muted small">
            {L(lang,
              'Em Preparar › Aventuras, ligue NPCs e lugares às salas e use "Conduzir" para marcar onde o grupo está. Os cartões aparecem aqui, prontos para revelar.',
              'In Prepare › Adventures, link NPCs and places to rooms and use "Run" to mark where the party is. The cards show up here, ready to reveal.')}
          </p>
          {goTo && (
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => goTo('prepare', 'adventures')}>📜 {L(lang, 'Ir para Aventuras', 'Go to Adventures')}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => goTo('world', 'atlas')}>🗺️ {L(lang, 'Abrir o Mundo', 'Open the World')}</button>
            </div>
          )}
        </div>
      )}

      {groups.scene.length > 0 && (
        <div className="ins-grid">
          {groups.scene.map(e => (
            <EntryCard key={e.id} entry={e} mode="dm" lang={lang} compact onOpen={open}
              onReveal={busyId === e.id ? undefined : openReveal} onShow={busyId === e.id ? undefined : show} />
          ))}
        </div>
      )}

      {groups.planned.length > 0 && (
        <>
          <div className="ins-sub">{L(lang, 'Preparados para a sessão', 'Prepared for the session')}</div>
          <div className="ins-grid">
            {groups.planned.map(e => (
              <EntryCard key={e.id} entry={e} mode="dm" lang={lang} compact onOpen={open}
                onReveal={busyId === e.id ? undefined : openReveal} onShow={busyId === e.id ? undefined : show} />
            ))}
          </div>
        </>
      )}

      {revealing && createPortal(
        <div className="modal-backdrop combat-modal-backdrop" onClick={() => setRevealing(null)}>
          <div className="modal ins-reveal" role="dialog" aria-label={L(lang, `Revelar ${revealing.name}`, `Reveal ${revealing.name}`)} onClick={e => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setRevealing(null)} aria-label={L(lang, 'Fechar', 'Close')}>×</button>
            <h2 style={{ marginTop: 0 }}>👁 {revealing.name}</h2>
            <RevealControl entry={revealing} lang={lang} showSecrets
              onChange={(next) => { setRevealing(next); patchLocal(next); }} />
            <div className="row gap-2" style={{ justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost btn-sm" disabled={revealing.visibility === 'hidden'}
                title={revealing.visibility === 'hidden' ? L(lang, 'Revele antes de mostrar no telão', 'Reveal before showing on screen') : undefined}
                onClick={() => show(revealing)}>
                📺 {L(lang, 'Mostrar no telão', 'Show on screen')}
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setRevealing(null)}>{L(lang, 'Pronto', 'Done')}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
