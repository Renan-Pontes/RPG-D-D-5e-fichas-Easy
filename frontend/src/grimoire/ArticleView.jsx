/* Corpo de um artigo do Grimório (usado na tela e no popup da ficha). */
import { Fragment } from 'react';

// Só **negrito** é aceito como marcação nos textos.
export const Rich = ({ text }) => {
  const parts = String(text || '').split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>));
};

const L = {
  simple: { pt: 'Explicação simples', en: 'In plain words' },
  example: { pt: 'Exemplo prático', en: 'Example at the table' },
  sheet: { pt: 'Na ficha', en: 'On your sheet' },
  versions: { pt: '2014 × 2024', en: '2014 vs 2024' },
  srd: { pt: 'Texto oficial (SRD 5.2.1, em inglês)', en: 'Official text (SRD 5.2.1)' },
  related: { pt: 'Veja também', en: 'See also' },
};

export default function ArticleView({ article: a, lang, categories, byId, onOpen, compact = false }) {
  const cat = categories.find((c) => c.id === a.cat);
  const lbl = (k) => L[k][lang] || L[k].en;
  const related = (a.related || []).map((id) => byId.get(id)).filter(Boolean);
  return (
    <article className={`grim-article ${compact ? 'compact' : ''}`}>
      {cat && <div className="eyebrow grim-article-cat">{cat.icon} {cat.name[lang]}</div>}
      <h2 className="grim-article-title">{a.title[lang]}</h2>
      {lang === 'pt' && a.title.en && <div className="grim-article-alt">{a.title.en}</div>}
      {lang === 'en' && a.title.pt && <div className="grim-article-alt">{a.title.pt}</div>}

      <section className="grim-sec">
        <h3>{lbl('simple')}</h3>
        <p><Rich text={a.simple[lang]} /></p>
      </section>

      <section className="grim-sec grim-example">
        <h3>🎲 {lbl('example')}</h3>
        <p><Rich text={a.example[lang]} /></p>
      </section>

      {a.sheet?.[lang] && (
        <section className="grim-sec grim-sheet">
          <h3>📋 {lbl('sheet')}</h3>
          <p><Rich text={a.sheet[lang]} /></p>
        </section>
      )}

      {a.versions?.[lang] && (
        <section className="grim-sec grim-versions">
          <h3>⚖️ {lbl('versions')}</h3>
          <p><Rich text={a.versions[lang]} /></p>
        </section>
      )}

      {a.srd?.text && !compact && (
        <section className="grim-sec grim-srd">
          <h3>{lbl('srd')}</h3>
          <blockquote lang="en">{a.srd.text}</blockquote>
          <cite>{a.srd.ref || 'SRD 5.2.1'} · CC-BY-4.0, Wizards of the Coast</cite>
        </section>
      )}

      {related.length > 0 && (
        <section className="grim-sec">
          <h3>{lbl('related')}</h3>
          <div className="grim-related">
            {related.map((r) => (
              <a key={r.id} className="chip" href={`#grimorio/${r.id}`}
                onClick={(e) => { if (onOpen) { e.preventDefault(); onOpen(r.id); } }}>
                {r.title[lang]}
              </a>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
