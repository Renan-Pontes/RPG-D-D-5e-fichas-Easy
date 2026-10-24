// Seletor de idiomas compartilhado (Criador e ficha).
// Idiomas fixos (espécie/classe) aparecem travados; os escolhidos respeitam
// o total vindo da espécie + antecedente (2014) ou da origem + classe (2024).
// 2024: os 2 idiomas da origem saem só da tabela Padrão; raros só nas vagas que
// permitem (ex.: o idioma extra do Ladino). 2014: exóticos com aval do mestre.
// Além do catálogo: grupo recolhido "Outros livros" (contam como raros/exóticos) e
// "Outro idioma…" para digitar um idioma personalizado (lógica em utils.js:
// resolveLanguageInput). `free` (ficha): sem limite, para idiomas aprendidos em jogo.
import { useState } from 'react';
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

export default function LanguagePicker({ char, lang, chosen, onChange, limit, free = false }) {
  const pt = lang === 'pt';
  const is2024 = char.rulesVersion === '2024';
  const fixed = Utils.fixedLanguages(char);
  const sources = Utils.languageChoiceSources(char);
  const count = Utils.languageChoiceCount(char);
  const max = free ? Infinity : (limit ?? count);
  const left = Number.isFinite(max) ? Math.max(0, max - chosen.length) : null;
  // Modo livre (limite infinito) não limita raros.
  const rareAllow = Number.isFinite(max) ? Utils.rareLanguageAllowance(char) : Infinity;
  const catalog = Utils.languageCatalog(char);
  const isRare = (id) => Utils.isRareLanguage(char, id);
  const rareChosen = chosen.filter(isRare).length;
  const suggest = languageSuggestions(char);
  const others = Utils.OTHER_BOOK_LANGUAGES;
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  const [moreOpen, setMoreOpen] = useState(() => chosen.some(id => others.some(l => l.id === id)));

  // Secretos (Druídico…) só aparecem se já marcados, para poder desmarcar.
  const visible = (l) => !fixed.includes(l.id) && (!l.secret || chosen.includes(l.id));
  const options = catalog.filter(visible);
  // Fora do catálogo desta regra e dos outros livros: personalizados ("Féerico") e
  // ids antigos (ex.: Língua de Sinais Comum numa ficha 2014) — sempre removíveis.
  const custom = chosen.filter(id => !catalog.some(l => l.id === id) && !others.some(l => l.id === id));
  const blockedBy = (id) => (left === 0 ? 'limit' : (isRare(id) && rareChosen >= rareAllow ? 'rare' : null));
  const toggle = (id) => {
    setMsg(null); // o aviso do último digitado não vale mais
    if (chosen.includes(id)) onChange(chosen.filter(l => l !== id));
    else if (!blockedBy(id)) onChange([...chosen, id]);
  };

  const label = (id) => Utils.languageLabel(id, lang);
  const addTyped = () => {
    const r = Utils.resolveLanguageInput(char, text, chosen);
    if (r.kind === 'empty') return;
    if (r.kind === 'known') {
      setMsg({ pt: `Você já fala ${Utils.languageLabel(r.id, 'pt')}.`, en: `You already speak ${r.id}.` });
    } else if (r.kind === 'chosen') {
      setMsg({ pt: `${Utils.languageLabel(r.id, 'pt')} já está na sua lista.`, en: `${r.id} is already on your list.` });
    } else if (blockedBy(r.id) === 'limit') {
      setMsg({ pt: 'Você já escolheu todos os idiomas. Desmarque um para trocar.', en: 'You already picked all your languages. Unselect one to swap.' });
      return;
    } else if (blockedBy(r.id) === 'rare') {
      setMsg({
        pt: `${Utils.languageLabel(r.id, 'pt')} é um idioma raro: só entra numa vaga que aceite raros.`,
        en: `${r.id} is a rare language: it only fits a slot that allows rare ones.`,
      });
      return;
    } else {
      onChange([...chosen, r.id]);
      if (others.some(l => l.id === r.id)) setMoreOpen(true);
      setMsg(r.kind === 'catalog'
        ? { pt: `${Utils.languageLabel(r.id, 'pt')} marcado na lista.`, en: `${r.id} checked on the list.` }
        : { pt: `${r.id} adicionado.`, en: `${r.id} added.` });
    }
    setText('');
  };

  const option = (l, { removable = false } = {}) => {
    const on = chosen.includes(l.id);
    const blocked = !on && !!blockedBy(l.id);
    return (
      <button key={l.id} type="button" className={`lang-option ${on ? 'on' : ''} ${removable ? 'is-custom' : ''}`} disabled={blocked}
        aria-pressed={removable ? undefined : on} onClick={() => toggle(l.id)}
        aria-label={removable ? (pt ? `Remover ${label(l.id)}` : `Remove ${label(l.id)}`) : undefined}>
        <span className="lang-check">{on && <Icon name="check" size={12}/>}</span>
        <span className="lang-name">{label(l.id)}</span>
        {removable && <Icon name="x" size={14} className="lang-remove" />}
        {suggest.ids.includes(l.id) && (
          <span className="cr-badge">
            {suggest.kind === 'species' ? (pt ? 'Combina com sua espécie' : 'Fits your species') : (pt ? 'Recomendado' : 'Recommended')}
          </span>
        )}
      </button>
    );
  };

  const group = (title, list, note) => list.length > 0 && (
    <div className="lang-group">
      <div className="lang-group-title">{title}</div>
      {note && <div className="text-xs muted" style={{ marginBottom: 6 }}>{note}</div>}
      <div className="lang-grid">{list.map(l => option(l))}</div>
    </div>
  );

  const standard = options.filter(l => !isRare(l.id));
  // 2024 sem vaga para raro: só mostra os raros já marcados (para poder desmarcar).
  const showRare = (l) => rareAllow > 0 || chosen.includes(l.id);
  const rare = options.filter(l => isRare(l.id) && showRare(l));
  const more = others.filter(l => !fixed.includes(l.id) && showRare(l));
  const moreChosen = more.filter(l => chosen.includes(l.id)).length;
  let rareTitle;
  let rareNote = null;
  if (!is2024) {
    rareTitle = pt ? 'Exóticos · com aval do mestre' : 'Exotic · DM approval';
  } else if (!Number.isFinite(rareAllow)) {
    rareTitle = pt ? 'Raros · com aval do mestre' : 'Rare · DM approval';
  } else if (rareAllow > 0) {
    rareTitle = pt ? 'Raros' : 'Rare';
    rareNote = pt
      ? `Você pode escolher até ${rareAllow} idioma${rareAllow > 1 ? 's' : ''} raro${rareAllow > 1 ? 's' : ''} (vaga ${SOURCE_LABEL.class.pt}). Os da origem vêm da lista Padrão.`
      : `You may pick up to ${rareAllow} rare language${rareAllow > 1 ? 's' : ''} (${SOURCE_LABEL.class.en} slot). Origin languages come from the Standard list.`;
  } else {
    rareTitle = pt ? 'Raros · não valem para a origem' : 'Rare · not allowed for origin';
    rareNote = pt ? 'Desmarque e troque por um idioma da lista Padrão.' : 'Unselect and swap for a Standard language.';
  }
  // Contador: no modo livre mostra as escolhas iniciais e quantos vieram além delas.
  const extra = free ? Math.max(0, chosen.length - count) : 0;
  const counter = free
    ? (count > 0 ? `${Math.min(chosen.length, count)}/${count}${extra ? ` +${extra}` : ''}` : (chosen.length ? `+${chosen.length}` : null))
    : (left !== null && max > 0 ? `${chosen.length}/${max}` : null);
  const inputId = `lang-custom-${char.id ?? 'new'}`;

  return (
    <div className="lang-picker">
      <div className="lang-known">
        <span className="text-xs muted">{pt ? 'Você já fala' : 'You already speak'}</span>
        <div className="lang-chips">
          {fixed.map(id => <span key={id} className="lang-chip locked">{label(id)}</span>)}
        </div>
      </div>

      <div className="lang-counter">
        <span>
          {sources.length
            ? sources.map(s => `+${s.n} ${SOURCE_LABEL[s.source]?.[lang] || s.source}`).join(' · ')
            : (pt ? 'Nenhum idioma extra à escolha' : 'No extra languages to choose')}
        </span>
        {counter && <span className={`mono ${chosen.length >= count ? 'done' : ''}`}>{counter}</span>}
      </div>
      {free && (
        <div className="text-xs muted lang-free-note">
          {pt
            ? 'Aprendeu um idioma em jogo (item, treino, mestre)? Pode adicionar além das escolhas iniciais.'
            : 'Learned a language in play (item, training, DM)? You can add it beyond your starting choices.'}
        </div>
      )}

      {(free || max > 0 || chosen.length > 0) && (
        <>
          {group(pt ? 'Padrão' : 'Standard', standard)}
          {group(rareTitle, rare, rareNote)}

          {more.length > 0 && (
            <details className="lang-more" open={moreOpen} onToggle={e => setMoreOpen(e.currentTarget.open)}>
              <summary>
                <Icon name="chevron-right" size={14} className="lang-more-caret" />
                <span>{pt ? 'Outros livros' : 'Other books'}</span>
                <span className="muted text-xs">
                  {moreChosen ? (pt ? `${moreChosen} marcado${moreChosen > 1 ? 's' : ''}` : `${moreChosen} checked`) : `${more.length}`}
                </span>
              </summary>
              <div className="text-xs muted" style={{ margin: '6px 0' }}>
                {pt
                  ? `Livro dos Monstros, Volo, Mordenkainen, Ravnica, Theros e Eberron. Contam como ${is2024 ? 'raros' : 'exóticos'}: com aval do mestre.`
                  : `Monster Manual, Volo, Mordenkainen, Ravnica, Theros and Eberron. They count as ${is2024 ? 'rare' : 'exotic'}: DM approval.`}
              </div>
              <div className="lang-grid">{more.map(l => option(l))}</div>
            </details>
          )}

          <div className="lang-group lang-custom">
            <label className="lang-group-title" htmlFor={inputId}>{pt ? 'Outro idioma' : 'Other language'}</label>
            {custom.length > 0 && <div className="lang-grid" style={{ marginBottom: 8 }}>{custom.map(id => option({ id }, { removable: true }))}</div>}
            <div className="lang-custom-row">
              <input id={inputId} type="text" value={text} maxLength={Utils.CUSTOM_LANGUAGE_MAX} autoComplete="off" disabled={left === 0}
                placeholder={pt ? 'Ex.: Féerico' : 'E.g. Fey'}
                onChange={e => { setText(e.target.value); setMsg(null); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTyped(); } }} />
              <button type="button" className="btn btn-ghost" onClick={addTyped} disabled={!text.trim() || left === 0}>
                <Icon name="plus" size={14}/> {pt ? 'Adicionar' : 'Add'}
              </button>
            </div>
            <div className="text-xs muted lang-custom-msg" role="status" aria-live="polite">
              {msg ? msg[lang] || msg.pt : (left === 0
                ? (pt ? 'Todas as escolhas feitas: desmarque um idioma para trocar.' : 'All choices made: unselect a language to swap.')
                : null)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
