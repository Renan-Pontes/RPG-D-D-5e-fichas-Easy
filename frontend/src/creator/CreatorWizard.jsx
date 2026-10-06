/* Assistente de criação de personagem (só fichas novas). Ver README.md. */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Icon from '../../components/Icons.jsx';
import { tName } from '../../data/i18n.js';
import { STEPS } from './steps.js';
import { newCharacter, finalizeCharacter, loadDraft, saveDraft, clearDraft, saveErrorMessage, joinPatch, creationJoin } from './creation.js';
import { L, IssueList } from './ui.jsx';

const safeIssues = (s, char) => {
  if (!s.issues) return [];
  try { return s.issues(char) || []; } catch { return [{ pt: 'Revise esta etapa.', en: 'Review this step.' }]; }
};

/**
 * initialJoin: mesa já verificada (rota /join/<código>) — o personagem nasce com ela.
 * joinEnabled: dá para entrar numa mesa (logado e com servidor)? Senão o bloco só explica.
 * onSave(char, { join }) — join = mesa escolhida na etapa Começo (ou null).
 */
export default function CreatorWizard({ lang, onSave, onCancel, initialJoin = null, joinEnabled = true }) {
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

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Se a etapa atual deixou de se aplicar (ex.: trocou para classe sem magia), volta para a anterior válida.
  useEffect(() => { if (!steps.some(s => s.id === stepId)) setStepId(steps[Math.min(index, steps.length - 1)].id); }, [steps, stepId, index]);
  useEffect(() => { window.scrollTo(0, 0); }, [stepId]);
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
    try {
      await onSave(finalizeCharacter(char, lang), { join: joinEnabled ? creationJoin(char) : null });
      clearDraft();
    } catch (err) {
      console.error('creator save failed', err);
      if (mounted.current) setSaveError(saveErrorMessage(err, char));
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

  const Comp = step.Comp;
  const draftStep = draft && STEPS.find(s => s.id === draft.stepId);
  return (
    <>
      <div className="wizard no-print">
        <nav className="cr-progress" aria-label={L(lang, 'Etapas', 'Steps')} ref={navRef}>
          {steps.map((s, i) => {
            const seen = visited.includes(s.id) && i !== index;
            const pending = seen && stepIssues[i].length > 0;
            const done = seen && !pending;
            return (
              <button key={s.id} type="button"
                className={`cr-progress-step ${i === index ? 'active' : done ? 'done' : pending ? 'pending' : ''}`}
                disabled={!reachable(i)} onClick={() => goTo(s.id)} aria-current={i === index ? 'step' : undefined}
                title={pending ? L(lang, `${s.title.pt}: falta resolver algo`, `${s.title.en}: something is missing`) : s.title[lang]}>
                <span className="cr-progress-dot">{done ? '✓' : pending ? '!' : i + 1}</span>
                <span className="cr-progress-label">{s.title[lang]}</span>
              </button>
            );
          })}
        </nav>
        <div className="wizard-meta">
          <div className="eyebrow">{step.title[lang]}</div>
          <div className="mono text-xs">{L(lang, 'Etapa', 'Step')} {index + 1} {L(lang, 'de', 'of')} {steps.length}</div>
        </div>
      </div>

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

      {!draft && <Comp char={char} set={set} lang={lang} goTo={goTo} steps={steps} joinEnabled={joinEnabled} />}

      <div className="wizard-footer no-print">
        {saveError && (
          <div className="wizard-hint cr-save-error" role="alert">{saveError[lang] || saveError.pt}</div>
        )}
        {issues.length > 0 && (
          <div className="wizard-hint" role="status" aria-live="polite">
            <IssueList issues={issues.slice(0, 2)} lang={lang} />
          </div>
        )}
        <div className="wizard-footer-inner">
          <button className="btn btn-ghost" onClick={back} disabled={saving}>
            <Icon name="chevron-left" size={16}/>
            {index === 0 ? L(lang, 'Cancelar', 'Cancel') : L(lang, 'Voltar', 'Back')}
          </button>
          <button className="btn btn-primary" onClick={next} disabled={issues.length > 0 || saving || !!draft} aria-busy={saving || undefined}>
            {isLast
              ? (saving ? L(lang, 'Salvando…', 'Saving…')
                : joinEnabled && creationJoin(char) ? L(lang, 'Criar e entrar na mesa', 'Create and join table')
                : L(lang, 'Criar personagem', 'Create character'))
              : L(lang, 'Avançar', 'Next')}
            <Icon name={isLast ? 'check' : 'chevron-right'} size={16}/>
          </button>
        </div>
      </div>
    </>
  );
}
