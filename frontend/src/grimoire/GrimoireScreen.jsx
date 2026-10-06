/* Tela do Grimório: livro de regras com capa, trilha para iniciantes, busca e
 * páginas encadeadas. Carregada via React.lazy (app.jsx) — dados e estilos num chunk próprio. */
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icons.jsx';
import { ARTICLES, CATEGORIES } from '../../data/grimoire/index.js';
import { buildIndex, search, findArticle, grimoireHash, normalize } from './search.js';
import ArticleView from './ArticleView.jsx';
import './grimoire.css';

const TXT = {
  title: { pt: 'Grimório', en: 'Grimoire' },
  sub: {
    pt: 'O livro de regras da mesa, explicado como um amigo explicaria — com exemplos.',
    en: 'The table\'s rulebook, explained the way a friend would — with examples.',
  },
  search: { pt: 'O que você quer saber? (ex.: vantagem, agarrado, concentração)', en: 'What do you want to know? (e.g. advantage, grappled, concentration)' },
  all: { pt: 'Tudo', en: 'All' },
  none: { pt: 'Nenhuma página fala disso. Tente outra palavra (PT ou EN).', en: 'No page mentions that. Try another word (EN or PT).' },
  back: { pt: 'Voltar', en: 'Back' },
  cover: { pt: 'Capa', en: 'Cover' },
  copy: { pt: 'Copiar link', en: 'Copy link' },
  copied: { pt: 'Link copiado!', en: 'Link copied!' },
  start: { pt: 'Primeira vez? Comece por aqui', en: 'First time? Start here' },
  startSub: { pt: 'Cinco páginas que explicam quase tudo o que acontece numa sessão.', en: 'Five pages that explain almost everything that happens in a session.' },
  chapters: { pt: 'Capítulos', en: 'Chapters' },
  random: { pt: 'Abrir numa página aleatória', en: 'Open a random page' },
  recent: { pt: 'Lidas por último', en: 'Recently read' },
  results: { pt: (n) => `${n} página${n === 1 ? '' : 's'}`, en: (n) => `${n} page${n === 1 ? '' : 's'}` },
  shortcut: { pt: 'Dica: aperte / para buscar', en: 'Tip: press / to search' },
  srdNote: {
    pt: 'Explicações e exemplos são originais da Forja. Citações marcadas vêm do SRD 5.2.1 (CC-BY-4.0).',
    en: 'Explanations and examples are original to Hero Forge. Marked quotes come from SRD 5.2.1 (CC-BY-4.0).',
  },
};

// Trilha para quem nunca jogou: na ordem em que as regras aparecem na mesa.
const START_PATH = ['teste-d20', 'atributos', 'vantagem-desvantagem', 'rodada-e-turno', 'conjurar-magia'];

const CAT_BLURB = {
  checks: { pt: 'Rolar o d20, perícias, vantagem', en: 'Rolling the d20, skills, advantage' },
  actions: { pt: 'O que dá para fazer no seu turno', en: 'What you can do on your turn' },
  combat: { pt: 'Turnos, ataque, CA e dano', en: 'Turns, attacks, AC and damage' },
  health: { pt: 'PV, cair a 0, descansar', en: 'HP, dropping to 0, resting' },
  conditions: { pt: 'Cego, agarrado, caído…', en: 'Blinded, grappled, prone…' },
  magic: { pt: 'Espaços, truques, concentração', en: 'Slots, cantrips, concentration' },
  exploration: { pt: 'Luz, viagem, armadilhas', en: 'Light, travel, traps' },
  character: { pt: 'Criar e evoluir o herói', en: 'Building and growing your hero' },
  equipment: { pt: 'Armas, armaduras, itens', en: 'Weapons, armor, items' },
};

const RECENT_KEY = 'forja:grimoire-recent';
const loadRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter(Boolean); } catch { return []; } };
const saveRecent = (ids) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids)); } catch { /* sem storage: tudo bem */ } };

// Destaca o termo buscado num texto curto (sem acento/maiúsculas).
function Highlight({ text, query }) {
  const q = normalize(query);
  if (!q) return text;
  const plain = String(text);
  const norm = plain.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tok = q.split(' ').sort((a, b) => b.length - a.length)[0];
  const i = tok.length >= 2 ? norm.indexOf(tok) : -1;
  if (i < 0) return plain;
  return <>{plain.slice(0, i)}<mark>{plain.slice(i, i + tok.length)}</mark>{plain.slice(i + tok.length)}</>;
}

function Cover({ lang, tx, openArticle, setCat, recent, byId, catCount }) {
  const pick = (id) => byId.get(id);
  return (
    <div className="grim-cover">
      <section className="grim-path">
        <h3>{tx('start')}</h3>
        <p className="muted">{tx('startSub')}</p>
        <ol>
          {START_PATH.map(pick).filter(Boolean).map((a, i) => (
            <li key={a.id}>
              <a href={grimoireHash(a.id)} onClick={(e) => { e.preventDefault(); openArticle(a.id); }}>
                <span className="grim-path-n">{i + 1}</span>
                <span className="grim-path-t">{a.title[lang]}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="grim-cover-h">{tx('chapters')}</h3>
        <div className="grim-chapters">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className="grim-chapter" onClick={() => setCat(c.id)}>
              <span className="grim-chapter-icon" aria-hidden>{c.icon}</span>
              <span className="grim-chapter-name">{c.name[lang]}</span>
              <span className="grim-chapter-blurb">{CAT_BLURB[c.id]?.[lang]}</span>
              <span className="grim-chapter-n">{catCount.get(c.id) || 0} {lang === 'pt' ? 'páginas' : 'pages'}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grim-cover-actions">
        <button type="button" className="btn btn-ghost btn-sm grim-random"
          onClick={() => openArticle(ARTICLES[Math.floor(Math.random() * ARTICLES.length)].id)}>
          ✦ {tx('random')}
        </button>
      </div>

      {recent.length > 0 && (
        <section>
          <h3 className="grim-cover-h">{tx('recent')}</h3>
          <div className="grim-related">
            {recent.map(pick).filter(Boolean).map((a) => (
              <a key={a.id} className="grim-rune" href={grimoireHash(a.id)} onClick={(e) => { e.preventDefault(); openArticle(a.id); }}>
                {a.title[lang]}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function GrimoireScreen({ lang, initialId = null, initialQuery = '', onBack }) {
  const tx = (k) => TXT[k][lang] || TXT[k].en;
  const [query, setQuery] = useState(initialQuery);
  const [cat, setCat] = useState(null);
  const [openId, setOpenId] = useState(() => findArticle(ARTICLES, initialId)?.id || null);
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState(loadRecent);
  const articleRef = useRef(null);
  const searchRef = useRef(null);

  const index = useMemo(() => buildIndex(ARTICLES, lang), [lang]);
  const byId = useMemo(() => new Map(ARTICLES.map((a) => [a.id, a])), []);
  const results = useMemo(() => search(index, query, { cat }), [index, query, cat]);
  const open = openId ? byId.get(openId) : null;
  const browsing = !!(query.trim() || cat);

  // Página anterior/próxima dentro do mesmo capítulo.
  const [prev, next] = useMemo(() => {
    if (!open) return [null, null];
    const same = ARTICLES.filter((a) => a.cat === open.cat);
    const i = same.findIndex((a) => a.id === open.id);
    return [same[i - 1] || null, same[i + 1] || null];
  }, [open]);

  useEffect(() => {
    const a = findArticle(ARTICLES, initialId);
    if (a) setOpenId(a.id);
  }, [initialId]);

  useEffect(() => {
    const h = grimoireHash(openId);
    if (window.location.hash !== h) history.replaceState(null, '', h);
  }, [openId]);

  useEffect(() => () => {
    if (/^#grimo/i.test(window.location.hash)) history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  // "/" foca a busca (fora de campos de texto).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || /input|textarea|select/i.test(e.target.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openArticle = (id) => {
    setOpenId(id);
    setCopied(false);
    setRecent((r) => { const nr = [id, ...r.filter((x) => x !== id)].slice(0, 6); saveRecent(nr); return nr; });
    requestAnimationFrame(() => {
      if (articleRef.current) articleRef.current.scrollTop = 0;
      if (window.matchMedia('(max-width: 859px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const toCover = () => { setOpenId(null); setQuery(''); setCat(null); };

  return (
    <div className={`grim ${open ? 'has-open' : ''} ${browsing ? 'is-browsing' : ''}`}>
      <div className="grim-sky" aria-hidden />
      <div className="grim-head">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="arrow-back" size={14} /> {tx('back')}
        </button>
        <div className="grim-hero">
          <div className="grim-sigil" aria-hidden><span>✦</span></div>
          <div>
            <h1 className="grim-title">{tx('title')}</h1>
            <p className="grim-sub">{tx('sub')}</p>
          </div>
        </div>
        <div className="grim-search">
          <Icon name="sparkle" size={16} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tx('search')}
            aria-label={tx('search')}
            autoComplete="off"
          />
          <kbd className="grim-kbd" title={tx('shortcut')}>/</kbd>
        </div>
      </div>

      <div className="grim-layout">
        <aside className="grim-side">
          <div className="grim-cats" role="group">
            <button className={`grim-cat ${!cat ? 'on' : ''}`} onClick={() => setCat(null)}>{tx('all')}</button>
            {CATEGORIES.map((c) => (
              <button key={c.id} className={`grim-cat ${cat === c.id ? 'on' : ''}`}
                onClick={() => setCat(cat === c.id ? null : c.id)} disabled={!catCount.get(c.id)}>
                {c.icon} {c.name[lang]} <span className="grim-cat-n">{catCount.get(c.id) || 0}</span>
              </button>
            ))}
          </div>
          <div className="grim-count text-xs muted">{TXT.results[lang](results.length)}</div>
          <ul className="grim-list">
            {results.map((a) => (
              <li key={a.id}>
                <a href={grimoireHash(a.id)} className={`grim-item ${a.id === openId ? 'on' : ''}`}
                  onClick={(e) => { e.preventDefault(); openArticle(a.id); }}>
                  <span className="grim-item-title"><Highlight text={a.title[lang]} query={query} /></span>
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
                <button className="btn btn-ghost btn-sm" onClick={toCover}>
                  <Icon name="book" size={14} /> {tx('cover')}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={copyLink}>
                  <Icon name="share" size={14} /> {copied ? tx('copied') : tx('copy')}
                </button>
              </div>
              <ArticleView article={open} lang={lang} categories={CATEGORIES} byId={byId} onOpen={openArticle} prev={prev} next={next} />
            </>
          ) : (
            <Cover lang={lang} tx={tx} openArticle={openArticle} setCat={setCat} recent={recent} byId={byId} catCount={catCount} />
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
