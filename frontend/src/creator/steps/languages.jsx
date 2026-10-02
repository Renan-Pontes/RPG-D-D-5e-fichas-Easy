/* Etapa Idiomas. Lógica em ../species-helpers.js e utils.js (languageIssues/trimLanguages). */
import Utils from '../../../utils.js';
import LanguagePicker from '../../../components/LanguagePicker.jsx';
import { languageSuggestions } from '../../../components/language-hints.js';
import { StepIntro, Term, Callout, Counter, L } from '../ui.jsx';
import {
  chosenLanguages, languagesApply, languagesIssues, fixedLanguageReasons, languageSlotReasons,
} from '../species-helpers.js';

function LanguagesStep({ char, set, lang }) {
  const is2024 = char.rulesVersion !== '2014';
  const fixed = fixedLanguageReasons(char);
  const slots = languageSlotReasons(char);
  const need = Utils.languageChoiceCount(char);
  const chosen = chosenLanguages(char);
  const suggest = languageSuggestions(char);
  const names = (l) => {
    const xs = suggest.ids.map(id => Utils.languageLabel(id, l));
    const and = l === 'pt' ? ' e ' : ' and ';
    return xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')}${and}${xs[xs.length - 1]}`;
  };
  let hint = null;
  if (suggest.kind === 'species' && suggest.ids.length) {
    hint = L(lang, `Se não souber o que escolher, pegue ${names('pt')}, o idioma do seu povo (marcado como "Combina com sua espécie").`,
      `If unsure, pick ${names('en')}, the language of your people (marked "Fits your species").`);
  } else if (suggest.ids.length) {
    hint = L(lang, `Se não souber o que escolher, ${names('pt')} ${suggest.ids.length > 1 ? 'são úteis' : 'é útil'} em muitas aventuras (marcados como "Recomendado").`,
      `If unsure, ${names('en')} ${suggest.ids.length > 1 ? 'are' : 'is'} useful in many adventures (marked "Recommended").`);
  }
  return (
    <div>
      <StepIntro title={L(lang, 'Idiomas', 'Languages')}>
        <p>
          <Term id="language" lang={lang}>{L(lang, 'Idiomas', 'Languages')}</Term>
          {L(lang, ' são as línguas que seu herói fala, lê e escreve. Servem para conversar com outros povos e ler pistas na aventura.',
            ' are the tongues your hero speaks, reads and writes. They let you talk to other peoples and read clues on the adventure.')}
        </p>
        {hint && <p>{hint}</p>}
      </StepIntro>

      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>{L(lang, 'Você já fala', 'You already speak')}</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {fixed.map(f => (
            <li key={f.id}><strong>{Utils.languageLabel(f.id, lang)}</strong> <span className="muted">— {f.why[lang]}</span></li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          {L(lang, 'Idiomas para escolher', 'Languages to choose')} <Counter n={chosen.length} of={need} />
        </div>
        {slots.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {slots.map((s, k) => <li key={k}><strong>+{s.n}</strong> {s.text[lang]}</li>)}
          </ul>
        ) : (
          <div className="muted">{L(lang, 'Você não tem idiomas extras para escolher.', 'You have no extra languages to choose.')}</div>
        )}
        {is2024 && (
          <div className="text-xs muted" style={{ marginTop: 6 }}>
            {L(lang, 'Idiomas raros (Abissal, Celestial…) só entram por características especiais, como a do Ladino.',
              'Rare languages (Abyssal, Celestial…) only come from special features, like the Rogue\'s.')}
          </div>
        )}
        {!is2024 && (
          <div className="text-xs muted" style={{ marginTop: 6 }}>
            {L(lang, 'Idiomas exóticos (Abissal, Dracônico…) precisam do aval do mestre.', 'Exotic languages (Abyssal, Draconic…) need DM approval.')}
          </div>
        )}
      </div>

      {/* O resumo "Você já fala" e o contador do LanguagePicker ficam escondidos (cr-languages): já aparecem acima, com a origem. */}
      <div className="cr-languages">
        <LanguagePicker char={char} lang={lang} chosen={chosen} onChange={(next) => set({ languages: next })} />
      </div>

      {need > 0 && chosen.length === need && languagesIssues(char).length === 0 && (
        <Callout kind="ok">{L(lang, 'Pronto! Seus idiomas estão escolhidos.', 'Done! Your languages are set.')}</Callout>
      )}
    </div>
  );
}

export default {
  id: 'languages',
  title: { pt: 'Idiomas', en: 'Languages' },
  applies: languagesApply,
  issues: languagesIssues,
  Comp: LanguagesStep,
};
