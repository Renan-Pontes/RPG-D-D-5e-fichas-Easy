// Ecos da mesa (mestre): o que os jogadores sussurraram sobre o que você
// revelou — arrepios, afetos, desconfianças, vontade de enfrentar, lugares a
// que querem voltar e cartões que releram — contado como cronista. Clicar
// numa linha abre o cartão. Sem placar: só frases.
import { useMemo, useState } from 'react';
import { echoLinesFrom } from './living-logic.js';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function EchoesPanel({ echoes, entries, lang = 'pt', onOpen, defaultOpen = true }) {
  const lines = useMemo(() => echoLinesFrom(echoes, entries, lang, 6), [echoes, entries, lang]);
  const [userOpen, setOpen] = useState(null);
  const open = userOpen ?? (defaultOpen && lines.length > 0);
  const anyRevealed = (entries || []).some(e => e.visibility === 'revealed' || e.visibility === 'partial');

  return (
    <section className={`lv-echoes${open ? ' is-open' : ''}`}>
      <button type="button" className="lv-fold" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="lv-fold-ico" aria-hidden="true">🕯</span>
        <span className="lv-fold-title">{t(lang, 'Ecos da mesa', 'Echoes from the table')}</span>
        {lines.length > 0 && !open && <span className="lv-fold-hint">{t(lang, 'a mesa sussurrou…', 'the table whispered…')}</span>}
        <span className="lv-fold-caret" aria-hidden="true">▾</span>
      </button>
      {open && (lines.length ? (
        <ul className="lv-echo-list">
          {lines.map(l => (
            <li key={l.key}>
              <button type="button" className="lv-echo" onClick={() => onOpen?.(l.entryId)}>
                <span className="lv-echo-ico" aria-hidden="true">{l.icon}</span>
                <span className="lv-echo-text">{l.text}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="lv-quiet">
          {anyRevealed
            ? t(lang, 'A mesa ainda não sussurrou nada. Quando os jogadores se arrepiarem, desconfiarem ou quiserem voltar a algum lugar, você ouve aqui.',
              'The table has not whispered yet. When players shiver, doubt or long to return somewhere, you will hear it here.')
            : t(lang, 'Nada revelado ainda — sem plateia, não há ecos. Revele um lugar ou um rosto e escute.',
              'Nothing revealed yet — no audience, no echoes. Reveal a place or a face and listen.')}
        </p>
      ))}
    </section>
  );
}
