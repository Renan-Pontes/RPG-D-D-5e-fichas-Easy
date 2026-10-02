// Seletor de idiomas compartilhado (Criador e ficha).
// Idiomas fixos (espécie/classe) aparecem travados; os escolhidos respeitam
// o total vindo da espécie + antecedente (2014) ou da origem + classe (2024).
// 2024: os 2 idiomas da origem saem só da tabela Padrão; raros só nas vagas que
// permitem (ex.: o idioma extra do Ladino). 2014: exóticos com aval do mestre.
import Utils from '../utils.js';
import Icon from './Icons.jsx';
// Sugestões de idioma para iniciantes (lógica pura em language-hints.js).
import { speciesLanguageHint, languageSuggestions } from './language-hints.js';

export { speciesLanguageHint, languageSuggestions };

const SOURCE_LABEL = {
  race: { pt: 'da espécie', en: 'from species' },
  background: { pt: 'do antecedente', en: 'from background' },
  origin: { pt: 'da origem', en: 'from origin' },
  class: { pt: 'da classe', en: 'from class' },
};

export const chosenLanguages = (char) => {
  const fixed = Utils.fixedLanguages(char);
  return (char.languages || []).filter(l => !fixed.includes(l) && !/^\+\d/.test(l));
};

export default function LanguagePicker({ char, lang, chosen, onChange, limit }) {
  const pt = lang === 'pt';
  const is2024 = char.rulesVersion === '2024';
  const fixed = Utils.fixedLanguages(char);
  const sources = Utils.languageChoiceSources(char);
  const max = limit ?? Utils.languageChoiceCount(char);
  const left = Number.isFinite(max) ? Math.max(0, max - chosen.length) : null;
  // Modo livre (limite infinito) não limita raros.
  const rareAllow = Number.isFinite(max) ? Utils.rareLanguageAllowance(char) : Infinity;
  const catalog = Utils.languageCatalog(char);
  const isRare = (id) => !!catalog.find(l => l.id === id)?.rare;
  const rareChosen = chosen.filter(isRare).length;
  const suggest = languageSuggestions(char);

  // Idiomas digitados em fichas antigas que não estão no catálogo continuam selecionáveis.
  const custom = chosen.filter(id => !catalog.some(l => l.id === id)).map(id => ({ id, pt: id, rare: false }));
  const options = [...catalog.filter(l => !fixed.includes(l.id) && !l.secret), ...custom];
  const toggle = (id) => {
    if (chosen.includes(id)) onChange(chosen.filter(l => l !== id));
    else if ((left === null || left > 0) && !(isRare(id) && rareChosen >= rareAllow)) onChange([...chosen, id]);
  };

  const group = (title, list, note) => list.length > 0 && (
    <div className="lang-group">
      <div className="lang-group-title">{title}</div>
      {note && <div className="text-xs muted" style={{ marginBottom: 6 }}>{note}</div>}
      <div className="lang-grid">
        {list.map(l => {
          const on = chosen.includes(l.id);
          const blocked = !on && (left === 0 || (isRare(l.id) && rareChosen >= rareAllow));
          return (
            <button key={l.id} type="button" className={`lang-option ${on ? 'on' : ''}`} disabled={blocked} aria-pressed={on} onClick={() => toggle(l.id)}>
              <span className="lang-check">{on && <Icon name="check" size={12}/>}</span>
              {Utils.languageLabel(l.id, lang)}
              {suggest.ids.includes(l.id) && (
                <span className="cr-badge">
                  {suggest.kind === 'species' ? (pt ? 'Combina com sua espécie' : 'Fits your species') : (pt ? 'Recomendado' : 'Recommended')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const standard = options.filter(l => !isRare(l.id));
  // 2024 sem vaga para raro: só mostra os raros já marcados (para poder desmarcar).
  const rare = options.filter(l => isRare(l.id) && (rareAllow > 0 || chosen.includes(l.id)));
  let rareTitle;
  let rareNote = null;
  if (!is2024) {
    rareTitle = pt ? 'Exóticos · com aval do mestre' : 'Exotic · DM approval';
  } else if (rareAllow > 0) {
    rareTitle = pt ? 'Raros' : 'Rare';
    rareNote = pt
      ? `Você pode escolher até ${rareAllow} idioma${rareAllow > 1 ? 's' : ''} raro${rareAllow > 1 ? 's' : ''} (vaga ${SOURCE_LABEL.class.pt}). Os da origem vêm da lista Padrão.`
      : `You may pick up to ${rareAllow} rare language${rareAllow > 1 ? 's' : ''} (${SOURCE_LABEL.class.en} slot). Origin languages come from the Standard list.`;
  } else {
    rareTitle = pt ? 'Raros · não valem para a origem' : 'Rare · not allowed for origin';
    rareNote = pt ? 'Desmarque e troque por um idioma da lista Padrão.' : 'Unselect and swap for a Standard language.';
  }

  return (
    <div className="lang-picker">
      <div className="lang-known">
        <span className="text-xs muted">{pt ? 'Você já fala' : 'You already speak'}</span>
        <div className="lang-chips">
          {fixed.map(id => <span key={id} className="lang-chip locked">{Utils.languageLabel(id, lang)}</span>)}
        </div>
      </div>

      <div className="lang-counter">
        <span>
          {sources.length
            ? sources.map(s => `+${s.n} ${SOURCE_LABEL[s.source]?.[lang] || s.source}`).join(' · ')
            : (pt ? 'Nenhum idioma extra à escolha' : 'No extra languages to choose')}
        </span>
        {left !== null && max > 0 && (
          <span className={`mono ${left === 0 ? 'done' : ''}`}>{chosen.length}/{max}</span>
        )}
      </div>

      {(max > 0 || chosen.length > 0) && (
        <>
          {group(pt ? 'Padrão' : 'Standard', standard)}
          {group(rareTitle, rare, rareNote)}
        </>
      )}
    </div>
  );
}
