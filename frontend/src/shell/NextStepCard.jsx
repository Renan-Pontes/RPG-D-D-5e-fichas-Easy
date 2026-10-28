// O cartão "O que fazer agora" (especificação §1.2): moldura de couro com filete dourado
// duplo, sobretítulo "O QUE FAZER AGORA", 1 frase, 1 motivo, 1 botão principal dourado de
// 48 px (às vezes 1 secundário), "Pular" (texto, 44 px, no alto, ao lado do "?" de 44 px:
// longe do botão principal e sem uma linha só para ele). Só apresentação:
// a regra vem de next-step.js. Nunca mais de 1 por tela.
// - Quando a regra muda com o cartão à vista, o texto troca com um fade de 150 ms e os
//   botões ficam 400 ms sem aceitar toque (princípio 8: nada muda debaixo do dedo).
// - `children` entra no lugar do botão (as 3 portas do N2).
// - `step.items` (J1 da Agora): a lista "✓ plano (3 cenas) · ○ Tela [Copiar link]" entre a
//   frase e o botão; `step.note`, uma linha de texto embaixo do botão; `step.lead`, um texto
//   inteiro em destaque sob a frase (o ⚡ Começo forte do J4).
import { useEffect, useRef, useState } from 'react';
import MesaSheet from './MesaSheet.jsx';
import './mesa.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);
const SETTLE_MS = 400;

export default function NextStepCard({ step, lang, onAction, onSkip, busy = null, children }) {
  const [help, setHelp] = useState(false);
  const [freshAt, setFreshAt] = useState(0);
  const shown = useRef(step?.id ? `${step.id}:${step.text}` : '');
  const key = step?.id ? `${step.id}:${step.text}` : '';
  useEffect(() => {
    if (key && shown.current && key !== shown.current) setFreshAt(Date.now());
    shown.current = key;
  }, [key]);
  if (!step) return null;
  // o botão que acabou de mudar de sentido ignora toques por 400 ms
  const guard = (fn) => () => { if (Date.now() - freshAt < SETTLE_MS) return; fn(); };
  const canShare = step.secondary?.id !== 'share' || (typeof navigator !== 'undefined' && !!navigator.share);
  return (
    <section className="mesa-panel next-card" aria-labelledby="next-card-title" aria-live="polite">
      <div className="next-card-head">
        <p className="mesa-eyebrow" id="next-card-title">{t(lang, 'O que fazer agora', 'What to do now')}</p>
        {step.canSkip && (
          <button type="button" className="mesa-btn is-quiet next-card-skip" onClick={guard(() => onSkip(step))}>
            {t(lang, 'Pular', 'Skip')}
          </button>
        )}
        {step.help && (
          <button type="button" className="mesa-icon-btn next-card-help" onClick={() => setHelp(true)}
            aria-label={t(lang, 'Ajuda: o que fazer agora', 'Help: what to do now')}>?</button>
        )}
      </div>
      <div className="next-card-msg" key={key}>
        <p className="next-card-text">{step.text}</p>
        {step.why && <p className="next-card-why">{step.why}</p>}
        {step.lead && <p className="next-card-lead">{step.lead}</p>}
      </div>
      {step.items?.length > 0 && (
        <ul className="next-card-items">
          {step.items.map(it => (
            <li key={it.id} className={`next-card-item ${it.ok ? 'is-ok' : 'is-todo'}`}>
              <span className="next-card-mark" aria-hidden="true">{it.ok ? '✓' : '○'}</span>
              <span className="next-card-item-text">{it.text}<span className="sr-only">{it.ok ? t(lang, ' (pronto)', ' (ready)') : t(lang, ' (falta)', ' (to do)')}</span></span>
              {it.action && (
                <button type="button" className="mesa-btn next-card-item-act" disabled={busy === it.action.id}
                  onClick={guard(() => onAction(it.action.id, step))}>{it.action.label}</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {children || (
        <div className="next-card-actions">
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" disabled={busy === step.action.id}
            onClick={guard(() => onAction(step.action.id, step))}>
            {busy === step.action.id ? '…' : step.action.label}
          </button>
          {step.secondary && canShare && (
            <button type="button" className="mesa-btn mesa-btn-lg" disabled={busy === step.secondary.id}
              onClick={guard(() => onAction(step.secondary.id, step))}>{step.secondary.label}</button>
          )}
        </div>
      )}
      {step.note && <p className="next-card-note">{step.note}</p>}
      {help && (
        <MesaSheet title={t(lang, 'O que fazer agora', 'What to do now')} icon="?" size="auto" width="sm" lang={lang}
          onClose={() => setHelp(false)}
          footer={<button type="button" className="mesa-btn mesa-btn-lg" onClick={() => setHelp(false)}>{t(lang, 'Entendi', 'Got it')}</button>}>
          <p className="mesa-sheet-text">{step.help}</p>
          {step.canSkip && (
            <p className="mesa-sheet-text">{t(lang,
              '“Pular” esconde esta dica neste aparelho até a situação mudar.',
              '“Skip” hides this tip on this device until things change.')}</p>
          )}
        </MesaSheet>
      )}
    </section>
  );
}
