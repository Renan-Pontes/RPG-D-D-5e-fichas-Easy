/* Corpo de um artigo do Grimório (usado na tela e no popup da ficha). */
import { Fragment, useMemo } from 'react';
import { ARTICLES } from '../../data/grimoire/index.js';
import { buildTermMap, termTarget } from './terms.js';
import { grimoireHash } from './search.js';
import ChapterIcon from './ChapterIcon.jsx';

const termMaps = {};
const termMapFor = (lang) => (termMaps[lang] ||= buildTermMap(ARTICLES, lang));

// Só **negrito** é aceito como marcação. Com onOpen, termos que têm artigo próprio viram links.
export const Rich = ({ text, lang = 'pt', selfId = null, onOpen = null }) => {
  const parts = String(text || '').split(/\*\*(.+?)\*\*/g);
  const map = onOpen ? termMapFor(lang) : null;
  return parts.map((p, i) => {
    if (!(i % 2)) return <Fragment key={i}>{p}</Fragment>;
    const target = map && termTarget(map, p, selfId);
    if (!target) return <strong key={i}>{p}</strong>;
    return (
      <a key={i} className="grim-term" href={grimoireHash(target)}
        onClick={(e) => { e.preventDefault(); onOpen(target); }}>{p}</a>
    );
  });
};

const L = {
  simple: { pt: 'Explicação simples', en: 'In plain words' },
  example: { pt: 'Exemplo na mesa', en: 'Example at the table' },
  sheet: { pt: 'Na sua ficha', en: 'On your sheet' },
  versions: { pt: '2014 × 2024', en: '2014 vs 2024' },
  srd: { pt: 'Texto oficial (SRD 5.2.1, em inglês)', en: 'Official text (SRD 5.2.1)' },
  related: { pt: 'Veja também', en: 'See also' },
  prev: { pt: 'Página anterior', en: 'Previous page' },
  next: { pt: 'Próxima página', en: 'Next page' },
};

// Título de seção: losango dourado + rótulo + filete até o fim.
const SecTitle = ({ children }) => <h3 className="grim-h"><i className="grim-gem" aria-hidden />{children}</h3>;

/* pos (opcional, só na tela): { i, n } vira "3 de 14 em <capítulo>" embaixo do pager. */
export default function ArticleView({ article: a, lang, categories, byId, onOpen, compact = false, prev = null, next = null, pos = null }) {
  const cat = categories.find((c) => c.id === a.cat);
  const lbl = (k) => L[k][lang] || L[k].en;
  const related = (a.related || []).map((id) => byId.get(id)).filter(Boolean);
  const rich = (text) => <Rich text={text} lang={lang} selfId={a.id} onOpen={onOpen} />;
  // Letra capitular: só no começo da explicação (quando ele não começa com marcação).
  const simple = String(a.simple?.[lang] || '');
  const cap = useMemo(() => (/^[A-Za-zÀ-ú]/.test(simple) ? simple[0] : ''), [simple]);
  const alt = lang === 'pt' ? a.title.en : a.title.pt;
  return (
    <article className={`grim-article ${compact ? 'compact' : 'grim-panel has-corners'}`} key={a.id}>
      {cat && <div className="grim-article-cat"><ChapterIcon cat={cat} size={18} /> {cat.name[lang]}</div>}
      {/* tabIndex -1: no celular, o Grimório leva o foco ao título ao abrir uma página pela lista */}
      <h2 className="grim-article-title" tabIndex={compact ? undefined : -1}><span className="grim-foil">{a.title[lang]}</span></h2>
      {alt && <div className="grim-article-alt" lang={lang === 'pt' ? 'en' : 'pt'}>{alt}</div>}
      <div className="grim-ornament" aria-hidden><span>✦ ❖ ✦</span></div>

      <section className="grim-sec grim-simple">
        <SecTitle>{lbl('simple')}</SecTitle>
        <p className={cap && !compact ? 'grim-dropcap' : ''}>
          {cap && !compact ? <><span className="grim-cap grim-foil">{cap}</span>{rich(simple.slice(1))}</> : rich(simple)}
        </p>
      </section>

      <section className="grim-sec grim-example">
        <SecTitle>{lbl('example')}</SecTitle>
        <p>{rich(a.example[lang])}</p>
      </section>

      {a.sheet?.[lang] && (
        <section className="grim-sec grim-sheet">
          <SecTitle>{lbl('sheet')}</SecTitle>
          <p>{rich(a.sheet[lang])}</p>
        </section>
      )}

      {a.versions?.[lang] && (
        <section className="grim-sec grim-versions">
          <SecTitle>{lbl('versions')}</SecTitle>
          <p>{rich(a.versions[lang])}</p>
        </section>
      )}

      {a.srd?.text && !compact && (
        <details className="grim-sec grim-srd">
          <summary><SecTitle>{lbl('srd')}</SecTitle></summary>
          <div className="grim-parchment">
            <blockquote lang="en">{a.srd.text}</blockquote>
            <cite>{a.srd.ref || 'SRD 5.2.1'} · CC-BY-4.0, Wizards of the Coast</cite>
          </div>
        </details>
      )}

      {related.length > 0 && (
        <section className="grim-sec">
          <SecTitle>{lbl('related')}</SecTitle>
          <div className="grim-runes is-wrap">
            {related.map((r) => (
              <a key={r.id} className="grim-rune" href={grimoireHash(r.id)}
                onClick={(e) => { if (onOpen) { e.preventDefault(); onOpen(r.id); } }}>
                {r.title[lang]}
              </a>
            ))}
          </div>
        </section>
      )}

      {(prev || next) && !compact && (
        <nav className="grim-pager" aria-label={lang === 'pt' ? 'Páginas do capítulo' : 'Chapter pages'}>
          {prev ? (
            <a className="grim-page grim-page-prev" href={grimoireHash(prev.id)} onClick={(e) => { e.preventDefault(); onOpen(prev.id); }}>
              <span className="grim-page-dir">← {lbl('prev')}</span>
              <span className="grim-page-title">{prev.title[lang]}</span>
            </a>
          ) : <span className="grim-page-none" />}
          {next ? (
            <a className="grim-page grim-page-next" href={grimoireHash(next.id)} onClick={(e) => { e.preventDefault(); onOpen(next.id); }}>
              <span className="grim-page-dir">{lbl('next')} →</span>
              <span className="grim-page-title">{next.title[lang]}</span>
            </a>
          ) : <span className="grim-page-none" />}
          {pos && cat && (
            <p className="grim-pos">
              {lang === 'pt' ? `${pos.i} de ${pos.n} em ${cat.name.pt}` : `${pos.i} of ${pos.n} in ${cat.name.en}`}
            </p>
          )}
        </nav>
      )}
    </article>
  );
}
