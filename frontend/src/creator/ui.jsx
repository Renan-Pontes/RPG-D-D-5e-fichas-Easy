/* Peças comuns das etapas da criação. Ver README.md. */
import { useState } from 'react';
import { GLOSSARY } from './glossary.js';

export const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

/** Título da etapa + explicação curta em linguagem simples. */
export function StepIntro({ title, children }) {
  return (
    <div className="cr-intro">
      <h2>{title}</h2>
      {children && <div className="cr-intro-text">{children}</div>}
    </div>
  );
}

/** Termo técnico com explicação ao tocar (glossary.js). */
export function Term({ id, lang, children }) {
  const [open, setOpen] = useState(false);
  const g = GLOSSARY[id];
  if (!g) return <>{children}</>;
  return (
    <span className="cr-term">
      <button type="button" className="cr-term-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        aria-expanded={open}>
        {children || g.name[lang]}<span className="cr-term-q" aria-hidden>?</span>
      </button>
      {open && <span className="cr-term-pop" role="note">{g.desc[lang]}</span>}
    </span>
  );
}

/** Caixa de destaque: 'info' (dica), 'warn' (atenção), 'ok' (tudo certo). */
export function Callout({ kind = 'info', children }) {
  return <div className={`cr-callout cr-${kind}`}>{children}</div>;
}

/** Grade de cartões escolhíveis. */
export function ChoiceGrid({ children, cols = 2 }) {
  return <div className={`options-list ${cols === 2 ? 'cols-2' : ''}`}>{children}</div>;
}

/**
 * Cartão de opção. `badge` = selo curto (ex.: "Bom para começar"); `details`
 * aparece só quando selecionado.
 */
export function ChoiceCard({ selected, disabled, onClick, title, subtitle, badge, children, details, image }) {
  // div com papel de botão: os detalhes podem ter botões próprios (botão dentro de botão é inválido).
  const activate = () => { if (!disabled) onClick?.(); };
  return (
    <div role="button" tabIndex={disabled ? -1 : 0} className={`option ${selected ? 'selected' : ''}`}
      aria-pressed={!!selected} aria-disabled={disabled || undefined}
      onClick={(e) => { if (e.target.closest('button, input, select, textarea, a') && e.target !== e.currentTarget) return; activate(); }}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); activate(); } }}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
      {image && <img className="cr-card-art" src={image} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      <div className="option-title">
        {title}
        {badge && <span className="cr-badge">{badge}</span>}
      </div>
      {subtitle && <div className="option-meta">{subtitle}</div>}
      {children}
      {selected && details && <div className="cr-details">{details}</div>}
    </div>
  );
}

/** Lista de pendências ({pt,en}). */
export function IssueList({ issues, lang }) {
  if (!issues?.length) return null;
  return (
    <ul className="cr-issues">
      {issues.map((i, k) => <li key={k}>{i[lang] || i.pt}</li>)}
    </ul>
  );
}

/** Contador "2/4" com cor de completo/incompleto. */
export function Counter({ n, of }) {
  return <span className={`cr-counter ${n === of ? 'done' : n > of ? 'over' : ''}`}>{n}/{of}</span>;
}
