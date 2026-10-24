/* Traços de classe espalhados pela ficha: src/sheet/feature-placement.js diz em que seção
 * cada um mora; aqui só o desenho (src/sheet/ficha.css: .fh-cf).
 * - Uma linha por traço: losango + nome + etiqueta "Nv. X" (na multiclasse, "Nv. X · Classe").
 *   Tocar abre a descrição e as escolhas dele (invocações, metamagia…).
 * - <details> nativo: abre com toque, Enter ou espaço, sem estado; o <summary> tem 44px
 *   de altura no mínimo (alvo de toque). */
import { levelTag, PLACE_LABEL } from './feature-placement.js';

const lk = (lang) => (lang === 'pt' ? 'pt' : 'en');

// item: { key, name: {pt,en}, desc: {pt,en}, picks: [{name, desc}], level, classId }.
// `tag` troca a etiqueta de nível (ex.: "antecedente").
export function FhFeatureItem({ item, multi, lang, tag }) {
  const l = lk(lang);
  const desc = item.desc?.[l];
  return (
    <li className="fh-cf-item">
      <details>
        <summary>
          <span className="fh-cf-name">{item.name?.[l]}</span>
          <span className="fh-origin">{tag || levelTag(item, multi, lang)}</span>
        </summary>
        <div className="fh-cf-body">
          {desc && <p className="fh-cf-text">{desc}</p>}
          {item.picks?.length > 0 && (
            <ul className="fh-cf-picks">
              {item.picks.map((p, i) => (
                <li key={i}><strong>{p.name[l]}</strong>{p.desc?.[l] ? <>: {p.desc[l]}</> : null}</li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </li>
  );
}

// Lista de traços de uma seção. `place` dá o rótulo padrão (PLACE_LABEL); `label` troca;
// `label={null}` tira (ex.: embaixo da linha de um recurso, que já diz o que é).
// `is-multi`: no celular a etiqueta longa ("Nv. 3 · Paladino") desce para baixo do nome.
export default function FhFeatures({ items, multi, lang, place, label, className = '', children }) {
  if (!items?.length && !children) return null;
  const head = label === undefined ? PLACE_LABEL[place]?.[lk(lang)] : label;
  return (
    <div className={`fh-cf${multi ? ' is-multi' : ''}${className ? ` ${className}` : ''}`} role="group" aria-label={head || undefined}>
      {head && <div className="fh-cf-label" aria-hidden="true">{head}</div>}
      <ul className="fh-cf-list">
        {(items || []).map(item => <FhFeatureItem key={item.key} item={item} multi={multi} lang={lang} />)}
        {children}
      </ul>
    </div>
  );
}
