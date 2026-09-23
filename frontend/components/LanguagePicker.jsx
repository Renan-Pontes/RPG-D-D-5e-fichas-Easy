// Seletor de idiomas compartilhado (Criador e ficha).
// Idiomas fixos (espécie/classe) aparecem travados; os escolhidos respeitam
// o total vindo da espécie + antecedente (ou origem, nas regras de 2024).
import Utils from '../utils.js';
import Icon from './Icons.jsx';

const SOURCE_LABEL = {
  race: { pt: 'da espécie', en: 'from species' },
  background: { pt: 'do antecedente', en: 'from background' },
  origin: { pt: 'da origem', en: 'from origin' },
};

export const chosenLanguages = (char) => {
  const fixed = Utils.fixedLanguages(char);
  return (char.languages || []).filter(l => !fixed.includes(l) && !/^\+\d/.test(l));
};

export default function LanguagePicker({ char, lang, chosen, onChange, limit }) {
  const pt = lang === 'pt';
  const fixed = Utils.fixedLanguages(char);
  const sources = Utils.languageChoiceSources(char);
  const max = limit ?? Utils.languageChoiceCount(char);
  const left = Number.isFinite(max) ? Math.max(0, max - chosen.length) : null;

  // Idiomas digitados em fichas antigas que não estão no catálogo continuam selecionáveis.
  const custom = chosen.filter(id => !Utils.LANGUAGES.some(l => l.id === id)).map(id => ({ id, pt: id, rare: false }));
  const options = [...Utils.LANGUAGES.filter(l => !fixed.includes(l.id) && !l.secret), ...custom];
  const toggle = (id) => {
    if (chosen.includes(id)) onChange(chosen.filter(l => l !== id));
    else if (left === null || left > 0) onChange([...chosen, id]);
  };

  const group = (title, list) => list.length > 0 && (
    <div className="lang-group">
      <div className="lang-group-title">{title}</div>
      <div className="lang-grid">
        {list.map(l => {
          const on = chosen.includes(l.id);
          const blocked = !on && left === 0;
          return (
            <button key={l.id} type="button" className={`lang-option ${on ? 'on' : ''}`} disabled={blocked} onClick={() => toggle(l.id)}>
              <span className="lang-check">{on && <Icon name="check" size={12}/>}</span>
              {Utils.languageLabel(l.id, lang)}
            </button>
          );
        })}
      </div>
    </div>
  );

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
            ? sources.map(s => `+${s.n} ${SOURCE_LABEL[s.source][lang]}`).join(' · ')
            : (pt ? 'Nenhum idioma extra à escolha' : 'No extra languages to choose')}
        </span>
        {left !== null && max > 0 && (
          <span className={`mono ${left === 0 ? 'done' : ''}`}>{chosen.length}/{max}</span>
        )}
      </div>

      {(max > 0 || chosen.length > 0) && (
        <>
          {group(pt ? 'Comuns' : 'Standard', options.filter(l => !l.rare))}
          {group(pt ? 'Raros · com aval do mestre' : 'Rare · DM approval', options.filter(l => l.rare))}
        </>
      )}
    </div>
  );
}
