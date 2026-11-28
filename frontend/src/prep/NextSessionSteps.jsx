import NextStepCard from '../shell/NextStepCard.jsx';
import { PLAN_LIMITS, PLAN_STEPS, moveItem, nextStepId, stepLabel, stepSummary, updateItem } from './next-session.js';
import { prepSession, reminderText } from '../shell/next-step.js';
import { AccStep, PartyStep } from './SessionSummaryHeader.jsx';
import { ScenesStep, CluesStep } from './SceneChecklistDrawer.jsx';
import { ReadyToPlay } from './EncounterLauncher.jsx';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export function NextSessionDoors({ lang, worldCount, world, busy, onReady, onStepByStep, onSample }) {
  return (
    <ul className="ns-doors">
      <li><button type="button" className="ns-door" onClick={onReady}>
        <span className="ns-door-title">📖 {t(lang, 'Usar uma aventura pronta', 'Use a ready adventure')}</span>
        <span className="ns-door-sub">{t(lang, 'Cenas, pessoas, combates e imagens já prontos. 2 toques.', 'Scenes, people, fights and images ready. 2 taps.')}</span>
        <span className="ns-door-go" aria-hidden="true">›</span>
      </button></li>
      <li><button type="button" className="ns-door" onClick={onStepByStep}>
        <span className="ns-door-title">✎ {t(lang, 'Montar a minha, passo a passo', 'Build my own, step by step')}</span>
        <span className="ns-door-sub">{t(lang, '5 passos curtos.', '5 short steps.')}</span>
        <span className="ns-door-go" aria-hidden="true">›</span>
      </button></li>
      <li><button type="button" className="ns-door" onClick={onSample} disabled={worldCount > 0 || world == null || busy === 'sample'}
        aria-describedby={worldCount > 0 ? 'ns-door-why' : undefined}>
        <span className="ns-door-title">✨ {busy === 'sample' ? t(lang, 'Criando o exemplo…', 'Creating the example…') : t(lang, 'Começar com um exemplo', 'Start with an example')}</span>
        <span className="ns-door-sub" id={worldCount > 0 ? 'ns-door-why' : undefined}>{worldCount > 0
          ? t(lang, 'Seu Mundo já tem cartões: o exemplo só entra num Mundo vazio.', 'Your World already has cards: the example only goes into an empty World.')
          : t(lang, 'Uma vila pronta para você mexer.', 'A village ready for you to play with.')}</span>
        <span className="ns-door-go" aria-hidden="true">›</span>
      </button></li>
    </ul>
  );
}

export function buildStepBodies({
  plan, lang, campaign, heading, party, raiox, insights, rx, closed, reorder, setReorder,
  narrow, world, worldError, handyIds, sceneInfo, toggleHandy, createEntry, openEntry,
  addSceneAndFocus, openScene, clues, asks, logDiary, setLogDiary, loadEntry, onDiscover,
  doReveal, dismissAsk, removeWithUndo, addClueAndFocus, openRewardItem, openStep, copyInvite,
  copy, setSheet, change, goTo,
}) {
  return {
    party: (
      <PartyStep party={party} lang={lang} raiox={raiox} insights={insights} rx={rx} onInvite={copyInvite}
        onRemind={(names) => copy(reminderText({ names, campaign: campaign.name, session: prepSession(heading), link: window.location.origin, lang }),
          t(lang, 'Lembrete copiado. Cole no grupo da mesa.', 'Reminder copied. Paste it in your group chat.'))}
        onMoments={(charId) => setSheet({ kind: 'moments', charId })}
        onXray={goTo ? () => goTo('group', 'insights') : null} />
    ),
    start: (
      <div className="ns-start">
        <label className="ns-label" htmlFor="ns-start">{t(lang, 'Algo acontece no 1º minuto.', 'Something happens in the first minute.')}</label>
        <textarea id="ns-start" className="input ns-big" rows={3} maxLength={PLAN_LIMITS.long} value={plan.strongStart} disabled={closed}
          placeholder={t(lang, 'Ex.: o sino toca sozinho à meia-noite — e a água do poço começa a subir…', 'E.g. the bell rings by itself at midnight — and the well water starts to rise…')}
          onChange={e => change(p => ({ ...p, strongStart: e.target.value }))} />
      </div>
    ),
    scenes: (
      <ScenesStep plan={plan} lang={lang} closed={closed} reorder={reorder} setReorder={setReorder} narrow={narrow}
        world={world} worldError={worldError} handyIds={handyIds} sceneInfo={sceneInfo}
        onToggleHandy={toggleHandy} onCreateEntry={createEntry} onOpenEntry={openEntry}
        onAdd={addSceneAndFocus} onOpenScene={(id) => openScene(id)}
        onChange={(id, patch) => change(p => updateItem(p, 'scenes', id, patch))}
        onMove={(id, dir) => change(p => moveItem(p, 'scenes', id, dir))} />
    ),
    clues: (
      <CluesStep plan={plan} lang={lang} closed={closed} clues={clues} world={world} asks={asks} logDiary={logDiary}
        setLogDiary={setLogDiary} loadEntry={loadEntry} onCreateEntry={createEntry}
        onDiscover={onDiscover} onReveal={doReveal} onDismissAsk={dismissAsk}
        onChange={(id, patch) => change(p => updateItem(p, 'secrets', id, patch))}
        onMove={(id, dir) => change(p => moveItem(p, 'secrets', id, dir))}
        onRemove={(s) => removeWithUndo('secrets', s, t(lang, 'Pista apagada', 'Clue deleted'))}
        onAdd={addClueAndFocus} />
    ),
    rewards: (
      <div className="ns-rewards">
        <label className="ns-label" htmlFor="ns-rewards">{t(lang, 'Recompensas', 'Rewards')}</label>
        <textarea id="ns-rewards" className="input" rows={3} maxLength={PLAN_LIMITS.long} value={plan.rewards} disabled={closed}
          placeholder={t(lang, 'Ex.: 120 po no altar; a Lanterna da Maré; o favor da sacerdotisa', 'E.g. 120 gp on the altar; the Tide Lantern; the priestess’s favor')}
          onChange={e => change(p => ({ ...p, rewards: e.target.value }))} />
        {!closed && (
          <button type="button" className="mesa-btn ns-link-btn" onClick={openRewardItem}>＋ {t(lang, 'Item cadastrado', 'Saved item')}</button>
        )}
        <p className="ns-hint">{t(lang, 'O item escolhido entra numa linha das recompensas. Para pôr numa cena, use 💰 Tesouro na cena.', 'The chosen item goes on a line of the rewards. To put it in a scene, use 💰 Treasure in the scene.')}</p>
        {goTo && <button type="button" className="mesa-btn is-quiet ns-link-btn" onClick={() => goTo('prepare', 'items')}>{t(lang, 'Ver itens da campanha', 'See campaign items')} →</button>}
        <details className="ns-monsters" open={!!plan.monsters.trim()}>
          <summary className="ns-fold-sum"><span className="ns-fold-mark" aria-hidden="true">▸</span> {t(lang, 'Anotações de monstros (opcional)', 'Monster notes (optional)')}</summary>
          <textarea className="input" rows={3} maxLength={PLAN_LIMITS.long} value={plan.monsters} disabled={closed}
            aria-label={t(lang, 'Anotações de monstros', 'Monster notes')}
            placeholder={t(lang, 'Ex.: 4 goblins, 1 lobo atroz; o afogado do sino (chefe)', 'E.g. 4 goblins, 1 dire wolf; the drowned one of the bell (boss)')}
            onChange={e => change(p => ({ ...p, monsters: e.target.value }))} />
          <p className="ns-hint">{t(lang, 'Para um combate de verdade, use ⚔ Combate dentro da cena.', 'For a real fight, use ⚔ Combat inside the scene.')}</p>
          <button type="button" className="mesa-btn is-quiet ns-link-btn" onClick={() => openStep('scenes')}>⚔ {t(lang, 'Pôr um combate numa cena', 'Put a fight in a scene')} →</button>
          {goTo && <button type="button" className="mesa-btn is-quiet ns-link-btn" onClick={() => goTo('prepare', 'adventures')}>{t(lang, 'Montar combates nas Aventuras', 'Build combats in Adventures')} →</button>}
        </details>
      </div>
    ),
  };
}

export function NextSessionStepsColumn({
  step, lang, busy, onAction, onSkip, doors, desk, sheetSide, shownOpen, plan, party, totalMoments,
  setOpen, goNext, body, heading, closed, withImage, recap, recapOf, insights, setSheet, openStep,
  campaign, table, copyTv, startSession, goTo,
}) {
  return (
    <>
      {step && (
        <NextStepCard step={step} lang={lang} busy={busy} onAction={onAction} onSkip={onSkip}>
          {step.doors ? doors : null}
        </NextStepCard>
      )}
      <div className="ns-acc">
        {PLAN_STEPS.map(s => {
          const side = desk && !sheetSide;
          return (
            <AccStep key={s.id} id={s.id} n={s.n} lang={lang} open={shownOpen === s.id} side={side}
              summary={stepSummary(s.id, plan, { party, moments: totalMoments, lang })}
              onToggle={() => setOpen(shownOpen === s.id && !side ? null : s.id)}
              onNext={() => goNext(s.id)}>
              {side ? null : body[s.id]}
            </AccStep>
          );
        })}
      </div>
      <ReadyToPlay plan={plan} lang={lang} party={party} heading={heading} closed={closed} compact={!desk && !!shownOpen} withImage={withImage}
        primary={!step}
        recap={recap} recapOf={recapOf} moments={insights?.chars || null}
        onRecap={() => setSheet({ kind: 'recap' })} onStep={(id) => openStep(id)}
        tv={!!(campaign.onboarding?.tv || table?.tvLive)} busy={busy === 'startSession'}
        onCopyTv={copyTv} onStart={startSession} onRehearse={goTo ? () => goTo('play', 'scene') : null} />
    </>
  );
}

export function NextSessionSidePanel({ desk, sheetSide, sideStep, body, goNext, lang }) {
  if (!desk || sheetSide) return null;
  return (
    <aside className="ns-side mesa-panel" aria-labelledby={sideStep ? 'ns-side-h' : undefined} aria-label={sideStep ? undefined : t(lang, 'Passo aberto', 'Open step')}>
      {sideStep ? (
        <>
          <h3 className="ns-side-h" id="ns-side-h"><span aria-hidden="true">{sideStep.n}</span> {stepLabel(sideStep.id, lang)}</h3>
          <div className="ns-step-body">{body[sideStep.id]}</div>
          <div className="ns-side-next">
            <button type="button" className="mesa-btn mesa-btn-lg" onClick={() => goNext(sideStep.id)}>
              {nextStepId(sideStep.id)
                ? t(lang, `Próximo passo: ${stepLabel(nextStepId(sideStep.id), lang, true)} →`, `Next step: ${stepLabel(nextStepId(sideStep.id), lang, true)} →`)
                : t(lang, 'Pronto para jogar →', 'Ready to play →')}
            </button>
          </div>
        </>
      ) : (
        <p className="ns-hint ns-side-empty">{t(lang, 'Escolha um passo à esquerda: ele abre aqui.', 'Pick a step on the left: it opens here.')}</p>
      )}
    </aside>
  );
}
