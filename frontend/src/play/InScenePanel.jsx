// "Nesta cena" (Jogar › Cena): os cartões do Mundo ligados à sala onde o grupo
// está (nó ativo da aventura em "Conduzir"), mais os NPCs e lugares escolhidos
// no plano da próxima sessão. Cada cartão tem 👁 Revelar e o 📺 único
// (ShowOnTable: oculto pergunta "Só a imagem / Revelar e mostrar").
// Regra: nada é revelado nem mostrado sem o toque do mestre.
// V8: a sala com combate ganha a linha "⚔ 2 Goblin Guerreiro [Começar o combate]"
// (SceneFight), que abre a folha Começar o combate (StartCombatSheet) e leva a
// Jogar › Combate. Com `onScene`, quem chama (Jogar › Cena) recebe a sala em jogo e
// põe essa linha no topo da tela — aqui ficam só os cartões.
// No celular, cada cartão é uma linha (EntryRow): o toque abre o cartão no
// Mundo e os botões ficam à direita, com 44 px; "Quem vê…" abre uma folha.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePolling } from '../api/polling.js';
import { EntryImage, VisibilitySeal } from '../world/EntryCard.jsx';
import RevealControl from '../world/RevealControl.jsx';
import { getEntry, getSessionPlan, listWorld, worldErrorText } from '../world/world-api.js';
import { KIND_META, kindLabel, subtitleOf } from '../world/world-model.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import ShowOnTable from '../stage/ShowOnTable.jsx';
import { getAdventure, listAdventures } from './play-api.js';
import { activeScene, sceneEntries } from './scene-model.js';
import { flash } from './flash.js';
import StartCombatSheet, { sceneOfNode } from './StartCombatSheet.jsx';
import { fightLine } from '../combat/encounter-setup.js';
import { findMonster } from '../../data/bestiary.js';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

/**
 * "⚔ 2 Goblin Guerreiro [Começar o combate]": a sala em jogo (`scene` = {adventure,
 * node}) tem combate. O nome dos monstros vem do catálogo, na língua do app (o salvo
 * na sala fica de reserva). Nada sem combate na sala.
 */
export function SceneFight({ campaign, scene, lang = 'pt', goTo }) {
  const [starting, setStarting] = useState(null);
  const enc = scene?.node?.encounter || [];
  if (!enc.length) return null;
  return (
    <>
      <div className="mesa-row ins-fight">
        <span className="mesa-row-main">
          <span className="mesa-row-title"><span aria-hidden="true">⚔</span> {fightLine(enc, { resolve: findMonster, lang })}</span>
          <span className="mesa-row-sub">{L(lang, `o combate de ${scene.node.name || 'desta cena'}`, `the combat of ${scene.node.name || 'this scene'}`)}</span>
        </span>
        <span className="mesa-row-act">
          <button type="button" className="mesa-btn is-primary ins-fight-go" onClick={() => setStarting(sceneOfNode(scene.adventure, scene.node, lang))}>
            {L(lang, 'Começar o combate', 'Start combat')}
          </button>
        </span>
      </div>
      {starting && (
        <StartCombatSheet campaign={campaign} lang={lang} scene={starting} onClose={() => setStarting(null)}
          onStarted={() => goTo?.('play', 'combat')} />
      )}
    </>
  );
}

/**
 * Linha de um cartão do Mundo (modo mestre): miniatura, nome, tipo e quem vê;
 * o toque na linha chama onOpen. À direita, 👁 Quem vê…/Revelar e o 📺 único
 * (com `campaign`), cada um com 44 px e o nome escrito.
 */
export function EntryRow({ entry, lang = 'pt', onOpen, onReveal, campaign, onShown, onRevealed, busy = false, openLabel }) {
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
      {(onReveal || campaign) && (
        <span className="mesa-row-act ins-row-act">
          {onReveal && (
            <button type="button" className="ins-act" disabled={busy} onClick={stop(onReveal)}
              title={vis === 'hidden' ? L(lang, 'Revelar aos jogadores', 'Reveal to players') : L(lang, 'Mudar quem vê este cartão', 'Change who sees this card')}>
              <span aria-hidden="true">👁</span>
              <span className="ins-act-label">{vis === 'hidden' ? L(lang, 'Revelar', 'Reveal') : L(lang, 'Quem vê…', 'Who sees…')}</span>
            </button>
          )}
          {campaign && (
            <ShowOnTable campaign={campaign} target={{ kind: 'card', entry }} lang={lang} className="ins-act" reason="short"
              disabled={busy} onShown={onShown} onRevealed={onRevealed} ariaLabel={`${L(lang, 'Mostrar na Tela', 'Show on screen')}: ${entry.name}`}>
              <span aria-hidden="true">📺</span>
              <span className="ins-act-label" aria-hidden="true">{L(lang, 'Mostrar', 'Show')}</span>
            </ShowOnTable>
          )}
        </span>
      )}
    </div>
  );
}

export default function InScenePanel({ campaign, lang = 'pt', goTo, onScene }) {
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
  // a sala em jogo para quem chama (a linha do combate vai para o topo da Cena)
  useEffect(() => { onScene?.(scene); }, [scene, onScene]);

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

  const open = goTo ? (entry) => goTo('world', 'atlas', { entryId: entry.id }) : undefined;
  const total = groups.scene.length + groups.planned.length;
  const openLabel = L(lang, 'Abrir no Mundo', 'Open in the World');
  const row = (e) => (
    <EntryRow key={e.id} entry={e} lang={lang} onOpen={open} openLabel={openLabel}
      onReveal={openReveal} campaign={campaign} onRevealed={patchLocal} busy={busyId === e.id} />
  );

  return (
    <section className="mesa-panel ins" aria-labelledby="ins-h">
      <div className="ins-top">
        <p className="mesa-eyebrow ins-eyebrow">{L(lang, 'Nesta cena', 'In this scene')}</p>
        {scene && (
          <ShowOnTable campaign={campaign} lang={lang} className="mesa-btn ins-show-scene"
            target={{ kind: 'scene', advId: scene.adventure.id, nodeId: scene.node.id, name: scene.node.name }}>
            📺 {L(lang, 'Mostrar a cena', 'Show the scene')}
          </ShowOnTable>
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

      {!onScene && <SceneFight campaign={campaign} scene={scene} lang={lang} goTo={goTo} />}

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
        <MesaSheet title={revealing.name} icon="👁" dock="play"
          size="auto" width="md" lang={lang} onClose={() => setRevealing(null)} className="ins-reveal"
          footer={(
            <div className="mesa-actions">
              <ShowOnTable campaign={campaign} lang={lang} className="mesa-btn" target={{ kind: 'card', entry: revealing }}
                onRevealed={(next) => { setRevealing(next); patchLocal(next); }}>
                📺 {L(lang, 'Mostrar na Tela', 'Show on screen')}
              </ShowOnTable>
              <button type="button" className="mesa-btn is-primary" onClick={() => setRevealing(null)}>{L(lang, 'Pronto', 'Done')}</button>
            </div>
          )}>
          {revealing.visibility === 'hidden' && (
            <p className="mesa-hint ins-reveal-hint">{L(lang, 'Oculto: o 📺 pergunta se vai só a imagem (sem o nome) ou se você revela antes.', 'Hidden: 📺 asks whether only the image goes (without the name) or whether you reveal it first.')}</p>
          )}
          <RevealControl entry={revealing} lang={lang} showSecrets
            onChange={(next) => { setRevealing(next); patchLocal(next); }} />
        </MesaSheet>
      )}
    </section>
  );
}
