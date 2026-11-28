import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import MesaSheet from '../shell/MesaSheet.jsx';
import { addScene, freshSceneId, planExport, removeItem, rewardWithItem, updateItem } from './next-session.js';
import { carryText, leftoverCounts } from '../play/end-session.js';
import { partyLevels } from './prep-graph.js';
import { toLight } from '../world/world-model.js';
import ReadySheet from './ReadySheet.jsx';
import { IdeaSheet, MomentsSheet } from './EncounterLauncher.jsx';

const SceneSheet = lazy(() => import('./SceneSheet.jsx'));
const EntrySheet = lazy(() => import('./EntrySheet.jsx'));
const RecapEditor = lazy(() => import('../play/RecapEditor.jsx'));
const ItemPickerModal = lazy(() => import('../items/ItemPickerModal.jsx'));

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const SETTLE_MS = 600;

export function useSettled(value, keyOf) {
  const [shown, setShown] = useState(value);
  const touchedAt = useRef(0);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    const mark = () => { touchedAt.current = Date.now(); };
    document.addEventListener('pointerdown', mark, true);
    return () => document.removeEventListener('pointerdown', mark, true);
  }, []);
  const key = keyOf(value);
  const shownKey = keyOf(shown);
  useEffect(() => {
    if (key === shownKey) { if (value !== shown) setShown(value); return undefined; }
    let id = null;
    const tick = () => {
      const wait = touchedAt.current + SETTLE_MS - Date.now();
      if (wait <= 0) setShown(latest.current);
      else id = setTimeout(tick, wait);
    };
    tick();
    return () => clearTimeout(id);
  }, [key, shownKey, value, shown]);
  const release = useCallback(() => { touchedAt.current = 0; }, []);
  return [key === shownKey ? value : shown, release];
}

export function downloadPlan(plan, campaign, heading) {
  try {
    const blob = new Blob([planExport(plan, { campaign: campaign.name, heading })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plano-sessao-${heading?.n || 'x'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { /* sem download neste navegador */ }
}

export default function NextSessionOverlays({
  campaign, lang, plan, planRef, heading, closed, busy, world, adventures, entryAdventures, recapOf,
  raiox, rx, ins, insights, insOk, countSession, momentsOf, saveMoments, wantRx, sheet, setSheet,
  sceneSheet, setSceneSheet, entrySheet, setEntrySheet, saveState, oldPlan, lostPockets,
  change, flush, say, startNewPlan, newPlanTitle, onReadyImported, removeWithUndo, createEntry,
  upsertWorld, openEntry, onRoomSaved, setWorld, setAdventures, details, goTo,
}) {
  const momentApi = raiox && insOk ? {
    facts: raiox.facts, firstName: rx.PM.firstName, kindIcon: rx.S.kindIcon,
    nameOf: (id) => raiox.byId[id]?.name || '?',
    styleOf: (id) => (ins?.style?.[String(id)] || []).map(x => rx.S.styleLabel(x, lang)),
    ideasFor: (id) => insights?.chars.find(c => c.id === id)?.ideas || [],
    dismissedOf: (id) => ins?.dismissed?.[String(id)] || [],
    momentsOf, accept: rx.S.acceptMoment, write: rx.S.writeMoment, save: saveMoments,
    spotlights: ins?.spotlights || {},
  } : null;
  const momentsNote = !wantRx
    ? t(lang, 'Os momentos vêm do Raio-X do grupo: precisam de personagens com ficha.', 'Moments come from the party X-ray: they need characters with sheets.')
    : !rx ? t(lang, 'Carregando o Raio-X do grupo…', 'Loading the party X-ray…')
      : t(lang, 'Os momentos precisam do servidor atualizado.', 'Moments need the updated server.');

  return (
    <>
      {sheet?.kind === 'newPlan' && (
        <MesaSheet title={newPlanTitle.replace(/^↻\s*/, '')} icon="↻"
          size="auto" width="sm" lang={lang} onClose={() => setSheet(null)} className="ns-newplan"
          footer={(
            <div className="mesa-actions is-stack">
              <button type="button" className="mesa-btn" disabled={busy === 'newPlan'} onClick={() => startNewPlan(false)}>
                {t(lang, 'Começar do zero', 'Start from scratch')}
              </button>
              <button type="button" className="mesa-btn mesa-btn-lg is-primary" disabled={busy === 'newPlan'} onClick={() => startNewPlan(true)}>
                {busy === 'newPlan' ? '…' : t(lang, 'Levar o que sobrou', 'Carry over what’s left')}
              </button>
            </div>
          )}>
          <p className="mesa-sheet-text">{t(lang,
            'Este plano fica guardado na Crônica (⋯ da sessão › Ver o plano desta sessão), com Restaurar.',
            'This plan is kept in the Chronicle (session ⋯ › See this session’s plan), with Restore.')}</p>
          <p className="mesa-sheet-text"><strong>{t(lang, 'Levar o que sobrou', 'Carry over what’s left')}:</strong>{' '}
            {leftoverCounts(plan) ? carryText(leftoverCounts(plan), lang) : t(lang, 'nada sobrou', 'nothing left')}
            {t(lang, ' (as cenas não jogadas, as pistas não achadas, as pessoas e os lugares).', ' (scenes not played, clues not found, people and places).')}</p>
          <p className="mesa-sheet-text"><strong>{t(lang, 'Começar do zero', 'Start from scratch')}:</strong>{' '}
            {t(lang, 'o plano novo vem em branco.', 'the new plan starts blank.')}</p>
        </MesaSheet>
      )}
      {sheet?.kind === 'rewardItem' && (
        <Suspense fallback={null}>
          <ItemPickerModal lang={lang} sheet icon="💎" title={t(lang, 'Item para as recompensas', 'Item for the rewards')}
            confirmLabel={t(lang, 'Pôr nas recompensas', 'Add to the rewards')} campaignItems={sheet.items || []}
            onClose={() => setSheet(null)}
            onPick={async (instance) => change(p => ({ ...p, rewards: rewardWithItem(p.rewards, instance) }))} />
        </Suspense>
      )}
      {sheet?.kind === 'recap' && recapOf > 0 && (
        <Suspense fallback={null}>
          <RecapEditor campaign={campaign} lang={lang} session={recapOf} onClose={() => setSheet(null)} onSaved={() => setSheet(null)} />
        </Suspense>
      )}
      {sheet?.kind === 'ready' && (
        <ReadySheet campaign={campaign} lang={lang} onClose={() => setSheet(null)}
          onImported={onReadyImported}
          onOpen={(adventureId) => { setSheet(null); goTo?.('prepare', 'adventures', { adventureId }); }} />
      )}
      {sheet?.kind === 'idea' && raiox && (
        <IdeaSheet lang={lang} plan={plan} step={sheet.step} rx={rx}
          onClose={() => setSheet(null)}
          onPick={async (sceneId, newName) => {
            const { charId, name, idea: sug } = sheet.step.payload;
            let target = sceneId;
            if (!target) {
              target = freshSceneId(planRef.current.scenes);
              change(p => addScene(p, newName, null, target));
              await flush();
            }
            const list = rx.S.acceptMoment(momentsOf(charId), sug);
            const added = list[list.length - 1];
            const ok = await saveMoments(charId, list.map(m => (m === added ? { ...m, plan: target } : m)));
            setSheet(null);
            if (ok) say(t(lang, `Momento de ${rx.PM.firstName(name)} ligado à cena.`, `${rx.PM.firstName(name)}'s moment linked to the scene.`));
          }} />
      )}
      {sheet?.kind === 'moments' && raiox && (
        <MomentsSheet lang={lang} rx={rx} plan={plan} fact={raiox.byId[sheet.charId]} closed={closed || !insOk}
          moments={momentsOf(sheet.charId)} session={countSession} suggestions={insights?.chars.find(c => c.id === sheet.charId)?.ideas || []}
          style={(ins?.style?.[String(sheet.charId)] || []).map(x => rx.S.styleLabel(x, lang))}
          onSave={(list) => saveMoments(sheet.charId, list)}
          onXray={goTo ? () => { setSheet(null); goTo('group', 'insights', { focus: sheet.charId }); } : null}
          onClose={() => setSheet(null)} />
      )}
      {sceneSheet && (
        <Suspense fallback={null}>
          <SceneSheet key={sceneSheet.id} campaign={campaign} lang={lang} plan={plan} sceneId={sceneSheet.id} closed={closed}
            planSave={saveState} oldServer={oldPlan} lostPockets={lostPockets} world={world} adventures={adventures} levels={partyLevels(campaign)}
            moments={momentApi} momentsNote={momentsNote} autoFocusName={sceneSheet.fresh}
            onChange={(id, patch) => change(p => updateItem(p, 'scenes', id, patch))}
            onRemove={(sc) => { setSceneSheet(null); removeWithUndo('scenes', sc, t(lang, 'Cena apagada', 'Scene deleted')); }}
            onDiscard={(sc) => change(p => removeItem(p, 'scenes', sc.id))}
            onClose={() => setSceneSheet(null)}
            onCreateEntry={createEntry} onWorldEntry={upsertWorld} onOpenEntry={openEntry}
            onWorldRemoved={(id) => setWorld(w => (w || []).filter(e => e.id !== id))}
            onRoomSaved={onRoomSaved} onAdventureCreated={(a) => setAdventures(l => [a, ...(l || [])])}
            goTo={goTo} flushPlan={flush} />
        </Suspense>
      )}
      {entrySheet && (
        <Suspense fallback={null}>
          <EntrySheet entryId={entrySheet} campaign={campaign} world={world} adventures={entryAdventures} plan={plan} lang={lang}
            onClose={() => setEntrySheet(null)}
            onSaved={(full) => { if (full?.id) { details.current.delete(full.id); upsertWorld(toLight(full)); } }}
            onDeleted={(id) => { setWorld(w => (w || []).filter(e => e.id !== id)); setEntrySheet(null); }}
            onOpenEntry={(id) => setEntrySheet(id)}
            onOpenMap={goTo ? (id) => { setEntrySheet(null); goTo('world', 'map', { mapId: id }); } : undefined} />
        </Suspense>
      )}
    </>
  );
}
