// "Nesta cena" (Jogar › Cena): os cartões do Mundo ligados à sala onde o grupo
// está (nó ativo da aventura em "Conduzir"), mais os NPCs e lugares escolhidos
// no plano da próxima sessão. Cada cartão tem 👁 Revelar e 📺 Mostrar no telão.
// Regra: nada é revelado nem mostrado sem o toque do mestre.
// No celular, cada cartão é uma linha (EntryRow): o toque abre o cartão no
// Mundo e os botões ficam à direita, com 44 px; "Quem vê…" abre uma folha.
import { useCallback, useMemo, useState } from 'react';
import { usePolling } from '../api/polling.js';
import { EntryImage, VisibilitySeal } from '../world/EntryCard.jsx';
import RevealControl from '../world/RevealControl.jsx';
import { getEntry, getSessionPlan, listWorld, showEntryOnScreen, worldErrorText } from '../world/world-api.js';
import { KIND_META, kindLabel, subtitleOf } from '../world/world-model.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import { getAdventure, listAdventures, setScreenCard } from './play-api.js';
import { activeScene, sceneEntries } from './scene-model.js';
import { flash } from './flash.js';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

/**
 * Linha de um cartão do Mundo (modo mestre): miniatura, nome, tipo e quem vê;
 * o toque na linha chama onOpen. À direita, 👁 Quem vê…/Revelar e 📺 Mostrar
 * (desabilitado se oculto), cada um com 44 px e o nome escrito.
 */
export function EntryRow({ entry, lang = 'pt', onOpen, onReveal, onShow, busy = false, openLabel }) {
  const vis = entry.visibility || 'hidden';
  const meta = KIND_META[entry.kind] || KIND_META.lore;
  const sub = subtitleOf(entry, lang) || entry.summary || kindLabel(entry.kind, lang);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(entry); };
  return (
    <div className={`mesa-row ins-row wl-vis-${vis}`} style={{ '--wl-kind': meta.color }}>
      <button type="button" className="ins-row-open" onClick={() => onOpen?.(entry)} disabled={!onOpen}
        aria-label={openLabel ? `${openLabel}: ${entry.name}` : entry.name}>
        <span className="ins-row-pic"><EntryImage entry={entry} className="ins-row-img" /></span>
        <span className="mesa-row-main">
          <span className="mesa-row-title ins-row-name"><span aria-hidden="true">{meta.icon}</span> {entry.name}</span>
          <span className="mesa-row-sub ins-row-sub">
            <VisibilitySeal visibility={vis} lang={lang} />
            <span className="ins-row-kind">{sub}</span>
          </span>
        </span>
      </button>
      {(onReveal || onShow) && (
        <span className="mesa-row-act ins-row-act">
          {onReveal && (
            <button type="button" className="ins-act" disabled={busy} onClick={stop(onReveal)}
              title={vis === 'hidden' ? L(lang, 'Revelar aos jogadores', 'Reveal to players') : L(lang, 'Mudar quem vê este cartão', 'Change who sees this card')}>
              <span aria-hidden="true">👁</span>
              <span className="ins-act-label">{vis === 'hidden' ? L(lang, 'Revelar', 'Reveal') : L(lang, 'Quem vê…', 'Who sees…')}</span>
            </button>
          )}
          {onShow && (
            <button type="button" className="ins-act" disabled={busy || vis === 'hidden'} onClick={stop(onShow)}
              aria-label={vis === 'hidden' ? L(lang, `Mostrar ${entry.name} no telão (revele antes)`, `Show ${entry.name} on screen (reveal first)`) : L(lang, `Mostrar ${entry.name} no telão`, `Show ${entry.name} on screen`)}
              title={vis === 'hidden' ? L(lang, 'Revele antes de mostrar no telão', 'Reveal before showing on screen') : L(lang, 'Mostrar no telão', 'Show on screen')}>
              <span aria-hidden="true">📺</span>
              <span className="ins-act-label" aria-hidden="true">{L(lang, 'Mostrar', 'Show')}</span>
            </button>
          )}
        </span>
      )}
    </div>
  );
}

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

  const open = goTo ? (entry) => goTo('world', 'atlas', { entryId: entry.id }) : undefined;
  const total = groups.scene.length + groups.planned.length;
  const openLabel = L(lang, 'Abrir no Mundo', 'Open in the World');
  const row = (e) => (
    <EntryRow key={e.id} entry={e} lang={lang} onOpen={open} openLabel={openLabel}
      onReveal={openReveal} onShow={show} busy={busyId === e.id} />
  );

  return (
    <section className="mesa-panel ins" aria-labelledby="ins-h">
      <div className="ins-top">
        <p className="mesa-eyebrow ins-eyebrow">{L(lang, 'Nesta cena', 'In this scene')}</p>
        {scene && (
          <button type="button" className="mesa-btn ins-show-scene" onClick={showScene}
            title={L(lang, 'Mostra o nome e o texto da sala no telão', 'Shows the room name and text on screen')}>
            📺 {L(lang, 'Mostrar a cena', 'Show the scene')}
          </button>
        )}
      </div>
      <MesaTitle id="ins-h" className="ins-title"
        sub={(scene || (total > 0 && open)) ? (
          <>
            {scene && <span>{scene.adventure.name}</span>}
            {total > 0 && open && <span className="ins-tip">{L(lang, 'toque no nome abre o cartão', 'tap a name to open it')}</span>}
          </>
        ) : null}>
        {scene ? scene.node.name : L(lang, 'Quem e o que está por perto', 'Who and what is around')}
      </MesaTitle>

      {entries === null && <p className="muted small">{L(lang, 'Carregando o mundo…', 'Loading the world…')}</p>}

      {entries !== null && total === 0 && (
        <div className="ins-empty">
          <p>
            {scene
              ? L(lang, 'Nenhum cartão do Mundo ligado a esta sala ainda.', 'No World card linked to this room yet.')
              : L(lang, 'Nenhuma sala em jogo agora.', 'No room in play right now.')}
          </p>
          <p className="mesa-hint">
            {L(lang,
              'Em Preparar › Aventuras, ligue NPCs e lugares às salas e use "Conduzir" para marcar onde o grupo está. Os cartões aparecem aqui, prontos para revelar.',
              'In Prepare › Adventures, link NPCs and places to rooms and use "Run" to mark where the party is. The cards show up here, ready to reveal.')}
          </p>
          {goTo && (
            <div className="mesa-actions ins-empty-actions">
              <button type="button" className="mesa-btn" onClick={() => goTo('prepare', 'adventures')}>📜 {L(lang, 'Ir para Aventuras', 'Go to Adventures')}</button>
              <button type="button" className="mesa-btn" onClick={() => goTo('world', 'atlas')}>🗺️ {L(lang, 'Abrir o Mundo', 'Open the World')}</button>
            </div>
          )}
        </div>
      )}

      {groups.scene.length > 0 && <div className="ins-list">{groups.scene.map(row)}</div>}

      {groups.planned.length > 0 && (
        <>
          <div className="ins-sub">{L(lang, 'Preparados para a sessão', 'Prepared for the session')}</div>
          <div className="ins-list">{groups.planned.map(row)}</div>
        </>
      )}

      {revealing && (
        <MesaSheet title={revealing.name} icon="👁"
          size="auto" width="md" lang={lang} onClose={() => setRevealing(null)} className="ins-reveal"
          footer={(
            <div className="mesa-actions">
              <button type="button" className="mesa-btn" disabled={revealing.visibility === 'hidden'}
                title={revealing.visibility === 'hidden' ? L(lang, 'Revele antes de mostrar no telão', 'Reveal before showing on screen') : undefined}
                onClick={() => show(revealing)}>
                📺 {L(lang, 'Mostrar no telão', 'Show on screen')}
              </button>
              <button type="button" className="mesa-btn is-primary" onClick={() => setRevealing(null)}>{L(lang, 'Pronto', 'Done')}</button>
            </div>
          )}>
          {revealing.visibility === 'hidden' && (
            <p className="mesa-hint ins-reveal-hint">{L(lang, 'Oculto: revele antes de mostrar no telão.', 'Hidden: reveal it before showing it on screen.')}</p>
          )}
          <RevealControl entry={revealing} lang={lang} showSecrets
            onChange={(next) => { setRevealing(next); patchLocal(next); }} />
        </MesaSheet>
      )}
    </section>
  );
}
