/* Tela do Grimório: busca de regras com explicação simples e exemplos.
 * Carregada via React.lazy (app.jsx) — dados e estilos ficam num chunk próprio. */
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icons.jsx';
import { ARTICLES, CATEGORIES } from '../../data/grimoire/index.js';
import { buildIndex, search, findArticle, grimoireHash } from './search.js';
import ArticleView from './ArticleView.jsx';
import './grimoire.css';

const TXT = {
  title: { pt: 'Grimório', en: 'Grimoire' },
  sub: {
    pt: 'Regras de D&D explicadas em linguagem de mesa, com exemplos. Toque num termo para ler.',
    en: 'D&D rules explained in plain table talk, with examples. Tap a term to read it.',
  },
  search: { pt: 'Buscar regra (ex.: vantagem, agarrado, concentração)', en: 'Search a rule (e.g. advantage, grappled, concentration)' },
  all: { pt: 'Tudo', en: 'All' },
  none: { pt: 'Nada encontrado. Tente outra palavra (PT ou EN).', en: 'Nothing found. Try another word (EN or PT).' },
  back: { pt: 'Voltar', en: 'Back' },
  list: { pt: 'Lista', en: 'List' },
  copy: { pt: 'Copiar link', en: 'Copy link' },
  copied: { pt: 'Link copiado!', en: 'Link copied!' },
  pick: { pt: 'Escolha uma regra na lista.', en: 'Pick a rule from the list.' },
  count: { pt: (n) => `${n} regra${n === 1 ? '' : 's'}`, en: (n) => `${n} rule${n === 1 ? '' : 's'}` },
  srdNote: {
    pt: 'Explicações e exemplos são originais da Forja. Citações marcadas vêm do SRD 5.2.1 (CC-BY-4.0).',
    en: 'Explanations and examples are original to Hero Forge. Marked quotes come from SRD 5.2.1 (CC-BY-4.0).',
  },
};

export default function GrimoireScreen({ lang, initialId = null, initialQuery = '', onBack }) {
  const tx = (k) => TXT[k][lang] || TXT[k].en;
  const [query, setQuery] = useState(initialQuery);
  const [cat, setCat] = useState(null);
  const [openId, setOpenId] = useState(() => findArticle(ARTICLES, initialId)?.id || null);
  const [copied, setCopied] = useState(false);
  const articleRef = useRef(null);

  const index = useMemo(() => buildIndex(ARTICLES, lang), [lang]);
  const byId = useMemo(() => new Map(ARTICLES.map((a) => [a.id, a])), []);
  const results = useMemo(() => search(index, query, { cat }), [index, query, cat]);
  const open = openId ? byId.get(openId) : null;

  // Link externo (#grimorio/...) enquanto a tela já está aberta.
  useEffect(() => {
    const a = findArticle(ARTICLES, initialId);
    if (a) setOpenId(a.id);
  }, [initialId]);

  // Mantém o hash em sincronia para o link poder ser copiado/enviado.
  useEffect(() => {
    const h = grimoireHash(openId);
    if (window.location.hash !== h) history.replaceState(null, '', h);
  }, [openId]);

  // Ao sair da tela, limpa o hash do Grimório.
  useEffect(() => () => {
    if (/^#grimo/i.test(window.location.hash)) history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  const openArticle = (id) => {
    setOpenId(id);
    setCopied(false);
    requestAnimationFrame(() => {
      const el = articleRef.current;
      if (!el) return;
      el.scrollTop = 0;
      if (window.matchMedia('(max-width: 859px)').matches) window.scrollTo({ top: 0 });
    });
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${grimoireHash(openId)}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { window.prompt(tx('copy'), url); }
  };

  const catCount = useMemo(() => {
    const m = new Map();
    for (const a of search(index, query)) m.set(a.cat, (m.get(a.cat) || 0) + 1);
    return m;
  }, [index, query]);

  return (
    <div className={`grim ${open ? 'has-open' : ''}`}>
      <div className="grim-head">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="arrow-back" size={14} /> {tx('back')}
        </button>
        <h1 className="grim-title"><Icon name="book" size={22} /> {tx('title')}</h1>
        <p className="grim-sub">{tx('sub')}</p>
      </div>

      <div className="grim-layout">
        <aside className="grim-side">
          <div className="grim-search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tx('search')}
              aria-label={tx('search')}
              autoComplete="off"
            />
          </div>
          <div className="grim-cats" role="group">
            <button className={`grim-cat ${!cat ? 'on' : ''}`} onClick={() => setCat(null)}>{tx('all')}</button>
            {CATEGORIES.map((c) => (
              <button key={c.id} className={`grim-cat ${cat === c.id ? 'on' : ''}`}
                onClick={() => setCat(cat === c.id ? null : c.id)} disabled={!catCount.get(c.id)}>
                {c.icon} {c.name[lang]} <span className="grim-cat-n">{catCount.get(c.id) || 0}</span>
              </button>
            ))}
          </div>
          <div className="grim-count text-xs muted">{TXT.count[lang] ? TXT.count[lang](results.length) : results.length}</div>
          <ul className="grim-list">
            {results.map((a) => (
              <li key={a.id}>
                <a href={grimoireHash(a.id)} className={`grim-item ${a.id === openId ? 'on' : ''}`}
                  onClick={(e) => { e.preventDefault(); openArticle(a.id); }}>
                  <span className="grim-item-title">{a.title[lang]}</span>
                  <span className="grim-item-snip">{snippet(a.simple[lang])}</span>
                </a>
              </li>
            ))}
            {!results.length && <li className="grim-empty">{tx('none')}</li>}
          </ul>
        </aside>

        <div className="grim-main" ref={articleRef}>
          {open ? (
            <>
              <div className="grim-main-bar">
                <button className="btn btn-ghost btn-sm grim-back-list" onClick={() => setOpenId(null)}>
                  <Icon name="chevron-left" size={14} /> {tx('list')}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={copyLink}>
                  <Icon name="share" size={14} /> {copied ? tx('copied') : tx('copy')}
                </button>
              </div>
              <ArticleView article={open} lang={lang} categories={CATEGORIES} byId={byId} onOpen={openArticle} />
            </>
          ) : (
            <div className="grim-placeholder">
              <Icon name="book" size={40} />
              <p>{tx('pick')}</p>
            </div>
          )}
          <p className="grim-foot text-xs muted">{tx('srdNote')}</p>
        </div>
      </div>
    </div>
  );
}

function snippet(s) {
  const plain = String(s || '').replace(/\*\*/g, '');
  const cut = plain.split(/(?<=[.!?])\s/)[0];
  return cut.length > 110 ? `${cut.slice(0, 107)}…` : cut;
}
