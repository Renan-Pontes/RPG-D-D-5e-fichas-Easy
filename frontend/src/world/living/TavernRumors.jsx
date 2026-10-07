// Rumores da taverna: o que se ouve hoje no balcão — uma pergunta de
// inspiração por dia (a mesma o dia inteiro para esta campanha), recolhida por
// padrão. "Outro boato" passa para o seguinte; "Escrever esta página" cria o
// cartão oculto com o boato como frase.
import { useState } from 'react';
import { KIND_META, kindLabel } from '../world-model.js';
import { RUMORS } from './rumors.js';
import { rumorOfDay } from './living-logic.js';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function TavernRumors({ lang = 'pt', campaignId, onCreate }) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const [busy, setBusy] = useState(false);
  const rumor = rumorOfDay(RUMORS, campaignId, lang, new Date(), shift);
  if (!rumor) return null;
  const meta = KIND_META[rumor.k] || KIND_META.lore;

  const write = async () => {
    setBusy(true);
    try {
      await onCreate?.({ kind: rumor.k, name: rumor.name, summary: rumor.text, visibility: 'hidden' });
    } finally { setBusy(false); }
  };

  return (
    <section className={`lv-rumors${open ? ' is-open' : ''}`}>
      <button type="button" className="lv-fold" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="lv-fold-ico" aria-hidden="true">🍺</span>
        <span className="lv-fold-title">{t(lang, 'Rumores da taverna', 'Tavern rumors')}</span>
        <span className="lv-fold-hint">{t(lang, 'o que se ouve hoje no balcão', 'what the bar is whispering today')}</span>
        <span className="lv-fold-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="lv-rumor">
          <blockquote className="lv-rumor-q" style={{ '--lv-k': meta.color }}>
            <span className="lv-rumor-kind"><span aria-hidden="true">{meta.icon}</span> {kindLabel(rumor.k, lang)}</span>
            “{rumor.text}”
          </blockquote>
          <div className="lv-page-acts">
            <button type="button" className="lv-btn lv-btn-ink" disabled={busy} onClick={write}>
              <span aria-hidden="true">✒</span> {busy ? t(lang, 'Escrevendo…', 'Writing…') : t(lang, 'Escrever esta página', 'Write this page')}
            </button>
            <button type="button" className="lv-btn lv-btn-quiet" onClick={() => setShift(s => s + 1)}>
              {t(lang, 'Ouvir outro boato', 'Hear another rumor')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
