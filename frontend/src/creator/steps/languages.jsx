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
  const extra = Utils.extraLanguages(char);
  const chosen = chosenLanguages(char);
  // Idiomas a mais combinados com o mestre: mudam o limite; ao diminuir, corta o excesso.
  const setExtra = (n) => {
    const creation = { ...(char.creation || {}), extraLanguages: Math.max(0, Math.min(10, n)) };
    set({ creation, languages: Utils.trimLanguages({ ...char, creation }) });
  };
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
          {L(lang, 'Idiomas para escolher', 'Languages to choose')} <Counter n={chosen.length} of={need + extra} />
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
        <LanguagePicker char={char} lang={lang} chosen={chosen} limit={need + extra} onChange={(next) => set({ languages: next })} />
      </div>

      <div className="card cr-extra-langs" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 200px' }}>
            <strong>{L(lang, 'Idiomas a mais', 'Extra languages')}</strong>
            <span className="text-sm muted"> {L(lang, '— combinados com o mestre (história, região, criação do herói).', '— agreed with your DM (backstory, region, upbringing).')}</span>
          </span>
          <span className="row" style={{ alignItems: 'center', gap: 6 }}>
            <button type="button" className="btn btn-ghost" style={{ minWidth: 44, minHeight: 44 }} disabled={extra <= 0} onClick={() => setExtra(extra - 1)}
              aria-label={L(lang, 'Um idioma a mais a menos', 'One fewer extra language')}>−</button>
            <b aria-live="polite" style={{ minWidth: 20, textAlign: 'center' }}>{extra}</b>
            <button type="button" className="btn btn-ghost" style={{ minWidth: 44, minHeight: 44 }} disabled={extra >= 10} onClick={() => setExtra(extra + 1)}
              aria-label={L(lang, 'Mais um idioma a mais', 'One more extra language')}>+</button>
          </span>
        </div>
        <div className="text-xs muted" style={{ marginTop: 6 }}>
          {L(lang, 'Depois de criar, a ficha também deixa adicionar idiomas a qualquer momento (em campanha, o mestre vê no registro).',
            'After creating, the sheet also lets you add languages at any time (in a campaign, the DM sees it in the log).')}
        </div>
      </div>

      {need + extra > 0 && chosen.length >= need && languagesIssues(char).length === 0 && (
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
