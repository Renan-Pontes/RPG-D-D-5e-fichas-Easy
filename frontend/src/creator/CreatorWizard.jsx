/* Assistente de criação de personagem (só fichas novas). Ver README.md. */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Icon from '../../components/Icons.jsx';
import { tName } from '../../data/i18n.js';
import { STEPS } from './steps.js';
import { planLimitFrom, limitShortText, creatorLimitNotice } from '../plans/plans-logic.js';
import useMyPlan from '../plans/useMyPlan.js';
import { openMyPlan } from '../plans/plans-api.js';
import { newCharacter, finalizeCharacter, loadDraft, saveDraft, clearDraft, saveErrorMessage, joinPatch, creationJoin } from './creation.js';
import { L, IssueList } from './ui.jsx';
import { CHAPTERS, chapterIndexOf, journeyChapters } from './journey.js';
import { scarLine } from './chronicle.js';
import { DecisionContext, JourneyMap, TitleCard, HeroPanel, Chronicle, MiniHero, HoldButton, Reveal, Forge, FORGE_MS, prefersReduced } from './journey-ui.jsx';
import './creator.css';

const safeIssues = (s, char) => {
  if (!s.issues) return [];
  try { return s.issues(char) || []; } catch { return [{ pt: 'Revise esta etapa.', en: 'Review this step.' }]; }
};

/**
 * initialJoin: mesa já verificada (rota /join/<código>) — o personagem nasce com ela.
 * joinEnabled: dá para entrar numa mesa (logado e com servidor)? Senão o bloco só explica.
 * onSave(char, { join }) — join = mesa escolhida na etapa Começo (ou null).
 * planCheck: consulta o plano (GET /api/me/plan) para avisar, sem bloquear, se
 *   o limite de personagens já foi atingido.
 */
export default function CreatorWizard({ lang, onSave, onCancel, initialJoin = null, joinEnabled = true, planCheck = false }) {
  const myPlan = useMyPlan(planCheck);
  // Rascunho salvo (F5 no meio da criação): oferece continuar antes de começar outro.
  const [draft, setDraft] = useState(() => loadDraft());
  const withInitialJoin = (c) => (initialJoin ? { ...c, ...joinPatch(c, initialJoin) } : c);
  const [char, setChar] = useState(() => withInitialJoin(newCharacter()));
  const set = useCallback((patch) => setChar(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) })), []);

  // Só as etapas que se aplicam a este personagem (ex.: magias só para conjuradores).
  const steps = useMemo(() => STEPS.filter(s => !s.applies || s.applies(char)), [char]);
  const [stepId, setStepId] = useState(STEPS[0].id);
  const [visited, setVisited] = useState(() => [STEPS[0].id]);
  const index = Math.max(0, steps.findIndex(s => s.id === stepId));
  const step = steps[index];
  const stepIssues = useMemo(() => steps.map(s => safeIssues(s, char)), [steps, char]);
  const issues = stepIssues[index] || [];
  const isLast = index === steps.length - 1;

  // Visual "jornada": decisão em análise (selada pelo botão de segurar), cartão
  // de capítulo, revelação, painel do herói no celular e a forja ao concluir.
  const [pending, setPending] = useState(null);
  const [titleChapter, setTitleChapter] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [forging, setForging] = useState(false);
  const [advanceReq, setAdvanceReq] = useState(0);
  const decision = useMemo(() => ({
    pending,
    propose: (d) => setPending(d && d.id !== d.current ? d : null),
    cancel: () => setPending(null),
  }), [pending]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Se a etapa atual deixou de se aplicar (ex.: trocou para classe sem magia), volta para a anterior válida.
  useEffect(() => { if (!steps.some(s => s.id === stepId)) setStepId(steps[Math.min(index, steps.length - 1)].id); }, [steps, stepId, index]);
  useEffect(() => { window.scrollTo(0, 0); setPending(null); setSideOpen(false); }, [stepId]);
  // Cartão de título ao entrar (para a frente) num capítulo novo.
  const chapterRef = useRef(chapterIndexOf(stepId, steps));
  useEffect(() => {
    const ci = chapterIndexOf(stepId, steps);
    if (ci > chapterRef.current && ci > 0 && !prefersReduced()) setTitleChapter(CHAPTERS[ci]);
    chapterRef.current = ci;
  }, [stepId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Selar e avançar: anda uma etapa depois que as etapas se recalculam com a escolha.
  useEffect(() => {
    if (!advanceReq) return;
    const i = steps.findIndex(s => s.id === stepId);
    if (i >= 0 && i < steps.length - 1) setStepId(steps[i + 1].id);
  }, [advanceReq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setVisited(v => (v.includes(stepId) ? v : [...v, stepId])); }, [stepId]);

  // Barra de progresso: mantém a etapa atual à vista (celular com 15 etapas).
  const navRef = useRef(null);
  useEffect(() => {
    const el = navRef.current?.querySelector('[aria-current="step"]');
    if (el && typeof el.scrollIntoView === 'function') {
      try { el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch { el.scrollIntoView(); }
    }
  }, [stepId, steps.length]);

  // Guarda o rascunho a cada mudança (depois de o jogador decidir sobre o rascunho antigo).
  useEffect(() => {
    if (draft) return;
    saveDraft({ char, stepId, visited });
  }, [char, stepId, visited, draft]);

  const resumeDraft = () => {
    setChar(withInitialJoin(draft.char));
    const ok = STEPS.some(s => s.id === draft.stepId);
    setStepId(ok ? draft.stepId : STEPS[0].id);
    setVisited(draft.visited.length ? draft.visited : [STEPS[0].id]);
    setDraft(null);
  };
  const discardDraft = () => { clearDraft(); setDraft(null); };

  const goTo = useCallback((id) => setStepId(id), []);
  const finish = async () => {
    if (savingRef.current) return; // duplo clique: uma ficha só
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    // A forja toca antes de salvar: ao salvar, o app troca de tela e o assistente some.
    if (!prefersReduced()) {
      setForging(true);
      await new Promise(r => setTimeout(r, FORGE_MS));
    }
    try {
      await onSave(finalizeCharacter(char, lang), { join: joinEnabled ? creationJoin(char) : null });
      clearDraft();
    } catch (err) {
      console.error('creator save failed', err);
      // Limite do plano: o aviso (LimitDialog) já abriu; aqui fica a linha curta.
      const lim = planLimitFrom(err);
      if (mounted.current) {
        setForging(false);
        setSaveError(lim ? { pt: limitShortText(lim, 'pt'), en: limitShortText(lim, 'en') } : saveErrorMessage(err, char));
      }
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const next = () => (isLast ? finish() : setStepId(steps[index + 1].id));
  const back = () => (index === 0 ? onCancel() : setStepId(steps[index - 1].id));
  // Pode ir a qualquer etapa já visitada, ou às liberadas (todas as anteriores sem pendência).
  const firstBlocked = stepIssues.findIndex(list => list.length);
  const reachable = (i) => visited.includes(steps[i].id) || firstBlocked === -1 || i <= firstBlocked;

  // Selar a escolha em análise: aplica o patch da etapa (o mesmo do clique de
  // antes), guarda a "cicatriz" na crônica se quebrou um selo, mostra a
  // revelação e avança se a etapa ficou completa.
  const pendingAfter = useMemo(() => { try { return pending ? { ...char, ...pending.patch(char) } : null; } catch { return null; } }, [pending, char]);
  const pendingAdvances = !!pendingAfter && !isLast && safeIssues(step, pendingAfter).length === 0;
  const seal = () => {
    const d = pending;
    if (!d) return;
    const advance = pendingAdvances;
    set(prev => {
      const p = d.patch(prev) || {};
      if (!(d.current && d.scar)) return p;
      const name = d.currentName || {};
      const creation = { ...(p.creation || prev.creation || {}) };
      creation.scars = { ...(creation.scars || {}), [d.scar]: { pt: scarLine(d.scar, name.pt || name, 'pt'), en: scarLine(d.scar, name.en || name, 'en') } };
      return { ...p, creation };
    });
    setPending(null);
    const go = () => { if (advance) setAdvanceReq(n => n + 1); };
    if (d.reveal && !prefersReduced()) setReveal({ ...d.reveal, then: go });
    else go();
  };
  const chapters = journeyChapters({ steps, index, visited, stepIssues, reachable });
  const chapter = chapters.find(c => c.now);

  const Comp = step.Comp;
  const closeTitle = useCallback(() => setTitleChapter(null), []);
  const revealRef = useRef(null);
  revealRef.current = reveal;
  const closeReveal = useCallback(() => { const r = revealRef.current; setReveal(null); r?.then?.(); }, []);
  const draftStep = draft && STEPS.find(s => s.id === draft.stepId);
  return (
    <DecisionContext.Provider value={decision}>
      <div className="wizard no-print">
        <JourneyMap chapters={chapters} steps={steps} index={index} stepIssues={stepIssues} visited={visited} reachable={reachable} goTo={goTo} lang={lang} navRef={navRef} />
        <MiniHero char={char} lang={lang} onOpen={() => setSideOpen(true)} />
      </div>

      <div className={`cr-shell ${sideOpen ? 'side-open' : ''}`}>
      <div className="cr-stage">
      {chapter && (
        <header className="cr-chapter-head">
          <div className="eyebrow">{chapter.num[lang] || chapter.num.pt} · {step.title[lang]}</div>
          <div className="cr-chapter-title cr-foil">{chapter.title[lang] || chapter.title.pt}</div>
          <p className="cr-narr">{chapter.narr[lang] || chapter.narr.pt}</p>
        </header>
      )}
      {draft && (
        <div className="card cr-draft" role="region" aria-label={L(lang, 'Criação em andamento', 'Creation in progress')}>
          <strong>{L(lang, 'Você tem uma criação em andamento.', 'You have a character in progress.')}</strong>
          <p className="muted text-sm" style={{ margin: '4px 0 10px' }}>
            {[
              String(draft.char.name || '').trim(),
              draft.char.className && tName('class', draft.char.className, lang),
              draftStep && L(lang, `parou em "${draftStep.title.pt}"`, `stopped at "${draftStep.title.en}"`),
            ].filter(Boolean).join(' · ')}
          </p>
          <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={resumeDraft}>{L(lang, 'Continuar de onde parei', 'Continue where I left off')}</button>
            <button type="button" className="btn btn-ghost" onClick={discardDraft}>{L(lang, 'Começar de novo', 'Start over')}</button>
          </div>
        </div>
      )}

      {!draft && index === 0 && !creationJoin(char) && creatorLimitNotice(myPlan, lang) && (
        <div className="card cr-plan-notice" role="note">
          <p className="text-sm" style={{ margin: 0 }}>🛡 {creatorLimitNotice(myPlan, lang)}</p>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={openMyPlan}>
            {L(lang, 'Ver meu plano', 'See my plan')}
          </button>
        </div>
      )}

      {!draft && <Comp char={char} set={set} lang={lang} goTo={goTo} steps={steps} joinEnabled={joinEnabled} />}
      </div>
      <aside className="cr-side no-print" aria-label={L(lang, 'Seu herói', 'Your hero')}>
        <button type="button" className="btn btn-ghost cr-side-close" onClick={() => setSideOpen(false)}>{L(lang, 'Voltar à jornada', 'Back to the journey')}</button>
        <HeroPanel char={char} lang={lang} />
        <Chronicle char={char} lang={lang} />
      </aside>
      </div>

      <div className="wizard-footer no-print">
        {saveError && (
          <div className="wizard-hint cr-save-error" role="alert">{saveError[lang] || saveError.pt}</div>
        )}
        {pending ? (
          <div className="wizard-hint cr-seal-status" role="status" aria-live="polite">
            {L(lang, 'Segure o selo até a forja brilhar. No teclado, Enter.', 'Hold the seal until the forge glows. On a keyboard, Enter.')}
          </div>
        ) : issues.length > 0 && (
          <div className="wizard-hint" role="status" aria-live="polite">
            <IssueList issues={issues.slice(0, 2)} lang={lang} />
          </div>
        )}
        <div className="wizard-footer-inner">
          <button className="btn btn-ghost" onClick={back} disabled={saving}>
            <Icon name="chevron-left" size={16}/>
            {index === 0 ? L(lang, 'Cancelar', 'Cancel') : L(lang, 'Voltar', 'Back')}
          </button>
          {pending ? (
            <HoldButton lang={lang} onComplete={seal} disabled={saving || !!draft}
              label={pending.current ? L(lang, 'Quebrar o selo', 'Break the seal') : pendingAdvances ? L(lang, 'Selar e avançar', 'Seal and continue') : L(lang, 'Selar', 'Seal')} />
          ) : (
          <button className="btn btn-primary" onClick={next} disabled={issues.length > 0 || saving || !!draft} aria-busy={saving || undefined}>
            {isLast
              ? (saving ? L(lang, 'Salvando…', 'Saving…')
                : joinEnabled && creationJoin(char) ? L(lang, 'Criar e entrar na mesa', 'Create and join table')
                : L(lang, 'Criar personagem', 'Create character'))
              : L(lang, 'Avançar', 'Next')}
            <Icon name={isLast ? 'check' : 'chevron-right'} size={16}/>
          </button>
          )}
        </div>
      </div>

      <TitleCard chapter={titleChapter} lang={lang} onDone={closeTitle} />
      <Reveal data={reveal} lang={lang} onDone={closeReveal} />
      {forging && <Forge char={char} lang={lang} />}
    </DecisionContext.Provider>
  );
}
