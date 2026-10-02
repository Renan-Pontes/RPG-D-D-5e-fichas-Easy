/* Assistente de criação de personagem (só fichas novas). Ver README.md. */
import { useState, useCallback, useEffect, useMemo } from 'react';
import Icon from '../../components/Icons.jsx';
import { STEPS } from './steps.js';
import { newCharacter, finalizeCharacter } from './creation.js';
import { L, IssueList } from './ui.jsx';

export default function CreatorWizard({ lang, onSave, onCancel }) {
  const [char, setChar] = useState(() => newCharacter());
  const set = useCallback((patch) => setChar(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) })), []);

  // Só as etapas que se aplicam a este personagem (ex.: magias só para conjuradores).
  const steps = useMemo(() => STEPS.filter(s => !s.applies || s.applies(char)), [char]);
  const [stepId, setStepId] = useState(STEPS[0].id);
  const index = Math.max(0, steps.findIndex(s => s.id === stepId));
  const step = steps[index];
  const issues = step.issues ? step.issues(char) : [];
  const isLast = index === steps.length - 1;

  // Se a etapa atual deixou de se aplicar (ex.: trocou para classe sem magia), volta para a anterior válida.
  useEffect(() => { if (!steps.some(s => s.id === stepId)) setStepId(steps[Math.min(index, steps.length - 1)].id); }, [steps, stepId, index]);
  useEffect(() => { window.scrollTo(0, 0); }, [stepId]);

  const goTo = useCallback((id) => setStepId(id), []);
  const next = () => (isLast ? onSave(finalizeCharacter(char, lang)) : setStepId(steps[index + 1].id));
  const back = () => (index === 0 ? onCancel() : setStepId(steps[index - 1].id));
  // Pode pular para qualquer etapa já liberada (todas as anteriores sem pendência).
  const firstBlocked = steps.findIndex(s => s.issues && s.issues(char).length);
  const reachable = (i) => firstBlocked === -1 || i <= firstBlocked;

  const Comp = step.Comp;
  return (
    <>
      <div className="wizard no-print">
        <nav className="cr-progress" aria-label={L(lang, 'Etapas', 'Steps')}>
          {steps.map((s, i) => (
            <button key={s.id} type="button"
              className={`cr-progress-step ${i === index ? 'active' : i < index ? 'done' : ''}`}
              disabled={!reachable(i)} onClick={() => goTo(s.id)} aria-current={i === index ? 'step' : undefined}>
              <span className="cr-progress-dot">{i < index ? '✓' : i + 1}</span>
              <span className="cr-progress-label">{s.title[lang]}</span>
            </button>
          ))}
        </nav>
        <div className="wizard-meta">
          <div className="eyebrow">{step.title[lang]}</div>
          <div className="mono text-xs">{L(lang, 'Etapa', 'Step')} {index + 1} {L(lang, 'de', 'of')} {steps.length}</div>
        </div>
      </div>

      <Comp char={char} set={set} lang={lang} goTo={goTo} steps={steps} />

      <div className="wizard-footer no-print">
        {issues.length > 0 && (
          <div className="wizard-hint" role="status" aria-live="polite">
            <IssueList issues={issues.slice(0, 2)} lang={lang} />
          </div>
        )}
        <div className="wizard-footer-inner">
          <button className="btn btn-ghost" onClick={back}>
            <Icon name="chevron-left" size={16}/>
            {index === 0 ? L(lang, 'Cancelar', 'Cancel') : L(lang, 'Voltar', 'Back')}
          </button>
          <button className="btn btn-primary" onClick={next} disabled={issues.length > 0}>
            {isLast ? L(lang, 'Criar personagem', 'Create character') : L(lang, 'Avançar', 'Next')}
            <Icon name={isLast ? 'check' : 'chevron-right'} size={16}/>
          </button>
        </div>
      </div>
    </>
  );
}
