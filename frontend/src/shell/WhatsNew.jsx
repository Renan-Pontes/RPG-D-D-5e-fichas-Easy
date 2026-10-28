// "O que mudou" (§2.6): um cartão dispensável no topo de Jogar e de Preparar, na 1ª visita
// depois dos nomes novos — "Telão → Tela; Cena → Agora; Próxima sessão → Plano; Encontro →
// Combate; o turno e o Próximo ficam na barra da mesa, embaixo". "Entendi" (ou ✕) vale
// para as duas áreas e não volta neste aparelho (guide-model.js). Lido do aparelho já no
// 1º desenho: o cartão nunca aparece depois e empurra a tela. "📘 Guia do mestre" abre o
// guia (com a casca). Só apresentação.
import { useState } from 'react';
import { useArea } from './useArea.js';
import { dismissWhatsNew, whatsNewLines, whatsNewVisible } from './guide-model.js';
import './guide.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function WhatsNew({ lang = 'pt' }) {
  const area = useArea();
  const [open, setOpen] = useState(() => whatsNewVisible());
  if (!open) return null;
  const close = () => { dismissWhatsNew(); setOpen(false); };
  const lines = whatsNewLines(lang);
  return (
    <section className="mesa-panel whats-new" aria-labelledby="whats-new-title">
      <div className="whats-new-head">
        <p className="mesa-eyebrow" id="whats-new-title">{t(lang, 'O que mudou', "What's new")}</p>
        <button type="button" className="mesa-icon-btn" onClick={close} aria-label={t(lang, 'Fechar: não mostrar de novo', "Close: don't show again")}>✕</button>
      </div>
      <ul className="whats-new-list">
        {lines.map(l => (
          <li key={l.now} className="whats-new-item">
            {l.was
              ? <><span className="whats-new-was">{l.was}</span> → <span className="whats-new-now">{l.now}</span>{l.note ? ` (${l.note})` : ''}</>
              : <><span className="whats-new-now">{l.now}</span>: {l.note}</>}
          </li>
        ))}
      </ul>
      <div className="mesa-actions whats-new-actions">
        <button type="button" className="mesa-btn is-primary" onClick={close}>{t(lang, 'Entendi', 'Got it')}</button>
        {area?.openGuide && (
          <button type="button" className="mesa-btn" onClick={() => area.openGuide(0)}>📘 {t(lang, 'Guia do mestre', 'GM guide')}</button>
        )}
      </div>
    </section>
  );
}
