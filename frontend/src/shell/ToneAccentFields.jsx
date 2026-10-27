// Chips de tom + cores de destaque (⚙ Ajustes e assistente de criação).
// Alvos de 44 px (mesa-chip); cada cor tem o nome escrito ao lado da amostra.
import { ACCENTS, TONES, accentName, t } from './shell-logic.js';

/** Chips de tom + cores de destaque (usado também no assistente de criação). */
export default function ToneAccentFields({ lang, tone, accent, onTone, onAccent }) {
  return (
    <>
      <div className="col gap-1">
        <span className="shell-label" aria-hidden="true">{t(lang, 'Tom', 'Tone')}</span>
        <div className="shell-chip-row" role="radiogroup" aria-label={t(lang, 'Tom', 'Tone')}>
          {TONES.map(x => (
            <button key={x.id} type="button" role="radio" aria-checked={tone === x.id}
              className={`mesa-chip shell-chip ${tone === x.id ? 'active' : ''}`}
              onClick={() => { onTone(tone === x.id ? '' : x.id); if (tone !== x.id && !accent) onAccent(x.accent); }}>
              {lang === 'en' ? x.en : x.pt}
            </button>
          ))}
        </div>
      </div>
      <div className="col gap-1">
        <span className="shell-label" aria-hidden="true">{t(lang, 'Cor de destaque', 'Accent color')}</span>
        <div className="shell-swatches" role="radiogroup" aria-label={t(lang, 'Cor de destaque', 'Accent color')}>
          {ACCENTS.map(c => (
            <button key={c} type="button" role="radio" aria-checked={accent === c}
              className={`mesa-chip shell-swatch-chip ${accent === c ? 'active' : ''}`} style={{ '--sw': c }} onClick={() => onAccent(c)}>
              <span className="shell-swatch" aria-hidden="true" />
              <span className="shell-swatch-name">{accentName(c, lang)}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
