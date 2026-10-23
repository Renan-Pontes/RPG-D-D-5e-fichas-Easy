/* Tela do Grimório: livro de regras com capa, trilha para iniciantes, busca e
 * páginas encadeadas. Carregada via React.lazy (app.jsx) — dados e estilos num chunk próprio.
 *
 * Três vistas: capa, lista (busca, capítulo ou índice completo) e página. A busca é
 * um campo só, sempre montado no mesmo lugar da barra fixa: trocar de vista não tira
 * o foco nem fecha o teclado do celular. Cada vista é uma entrada no histórico, então
 * o "voltar" do celular/navegador anda dentro do Grimório e, da 1ª entrada, volta à
 * tela de origem. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Icon from '../../components/Icons.jsx';
import { ARTICLES, CATEGORIES } from '../../data/grimoire/index.js';
import { buildIndex, search, findArticle, grimoireHash, parseGrimoireHash } from './search.js';
import { snippetFor, markRanges } from './snippet.js';
import ArticleView from './ArticleView.jsx';
import ChapterIcon from './ChapterIcon.jsx';
import { GRIMOIRE_ART, hideOnError } from '../art.js';
import './grimoire.css';

const TXT = {
  title: { pt: 'Grimório', en: 'Grimoire' },
  sub: {
    pt: 'O livro de regras da mesa, explicado como um amigo explicaria — com exemplos.',
    en: 'The table\'s rulebook, explained the way a friend would — with examples.',
  },
  search: { pt: 'O que você quer saber? (ex.: vantagem, agarrado, concentração)', en: 'What do you want to know? (e.g. advantage, grappled, concentration)' },
  searchPh: { pt: 'Buscar regra (ex.: vantagem, agarrado)', en: 'Search a rule (e.g. advantage, grappled)' },
  find: { pt: 'Buscar outra regra', en: 'Search another rule' },
  clear: { pt: 'Limpar a busca', en: 'Clear search' },
  all: { pt: 'Tudo', en: 'All' },
  none: { pt: 'Nenhuma página fala disso. Tente outra palavra (PT ou EN).', en: 'No page mentions that. Try another word (EN or PT).' },
  back: { pt: 'Voltar', en: 'Back' },
  cover: { pt: 'Capa', en: 'Cover' },
  coverAria: { pt: 'Capa do Grimório', en: 'Grimoire cover' },
  copy: { pt: 'Copiar link', en: 'Copy link' },
  copyShort: { pt: 'Link', en: 'Link' },
  copied: { pt: 'Link copiado!', en: 'Link copied!' },
  copiedShort: { pt: 'Copiado!', en: 'Copied!' },
  start: { pt: 'Primeira vez? Comece por aqui', en: 'First time? Start here' },
  startShort: { pt: 'Primeira vez? 5 páginas para começar', en: 'First time? 5 pages to start' },
  startSub: { pt: 'Cinco páginas que explicam quase tudo o que acontece numa sessão.', en: 'Five pages that explain almost everything that happens in a session.' },
  chapters: { pt: 'Capítulos', en: 'Chapters' },
  listAria: { pt: 'Páginas do Grimório', en: 'Grimoire pages' },
  chapter: { pt: 'Capítulo', en: 'Chapter' },
  random: { pt: 'Página aleatória', en: 'Random page' },
  index: { pt: 'Índice completo', en: 'Full index' },
  indexShort: { pt: 'Índice', en: 'Index' },
  indexSub: { pt: 'Todas as páginas, na ordem dos capítulos.', en: 'Every page, in chapter order.' },
  recent: { pt: 'Continuar lendo', en: 'Continue reading' },
  results: { pt: (n) => `${n} página${n === 1 ? '' : 's'}`, en: (n) => `${n} page${n === 1 ? '' : 's'}` },
  resultsN: { pt: (n) => `Resultados (${n})`, en: (n) => `Results (${n})` },
  backResults: { pt: 'Voltar aos resultados', en: 'Back to results' },
  backChapter: { pt: 'Voltar ao capítulo', en: 'Back to the chapter' },
  backIndex: { pt: 'Voltar ao índice', en: 'Back to the index' },
  openFirst: { pt: 'Abrir a primeira página', en: 'Open the first page' },
  best: { pt: 'Melhor resultado', en: 'Best match' },
  openThis: { pt: 'Abrir esta página', en: 'Open this page' },
  pickHint: { pt: 'Ou escolha outra na lista ao lado.', en: 'Or pick another one from the list.' },
  tryThese: { pt: 'Tente:', en: 'Try:' },
  seeChapters: { pt: 'Ver capítulos', en: 'See chapters' },
  notHere: {
    pt: 'Procurando uma magia, um monstro ou um item? Eles ficam na ficha do personagem e nas campanhas, não no Grimório.',
    en: 'Looking for a spell, monster or item? They live in the character sheet and in campaigns, not in the Grimoire.',
  },
  zeroChip: { pt: 'Nenhuma página com essa busca neste capítulo', en: 'No page with this search in this chapter' },
  shortcut: { pt: 'Dica: aperte / para buscar', en: 'Tip: press / to search' },
  srdNote: {
    pt: 'Explicações e exemplos são originais da Forja. Citações marcadas vêm do SRD 5.2.1 (CC-BY-4.0).',
    en: 'Explanations and examples are original to Hero Forge. Marked quotes come from SRD 5.2.1 (CC-BY-4.0).',
  },
};

// "← Voltar …" diz para onde volta (a tela de origem guardada pelo app).
const BACK_TO = {
  home: { pt: 'Voltar ao início', en: 'Back to home' },
  sheet: { pt: 'Voltar à ficha', en: 'Back to the sheet' },
  campaign: { pt: 'Voltar à mesa', en: 'Back to the table' },
  campaigns: { pt: 'Voltar às campanhas', en: 'Back to campaigns' },
  create: { pt: 'Voltar à criação', en: 'Back to creation' },
  edit: { pt: 'Voltar à edição', en: 'Back to editing' },
  plan: { pt: 'Voltar ao plano', en: 'Back to the plan' },
  admin: { pt: 'Voltar ao admin', en: 'Back to admin' },
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

// Sugestões do estado vazio (tocam e viram a busca).
const SUGGEST = {
  pt: ['vantagem', 'agarrado', 'concentração', 'descanso', 'cobertura', 'iniciativa'],
  en: ['advantage', 'grappled', 'concentration', 'rest', 'cover', 'initiative'],
};

const RECENT_KEY = 'forja:grimoire-recent';
const loadRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter(Boolean); } catch { return []; } };
const saveRecent = (ids) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids)); } catch { /* sem storage: tudo bem */ } };
// Trilha "Primeira vez?" aberta/fechada pela pessoa (no celular); sem escolha, abre só na 1ª visita.
const PATH_KEY = 'forja:grimoire-path-open';
const loadPathPref = () => { try { const v = localStorage.getItem(PATH_KEY); return v === '1' ? true : v === '0' ? false : null; } catch { return null; } };
const savePathPref = (open) => { try { localStorage.setItem(PATH_KEY, open ? '1' : '0'); } catch { /* sem storage: tudo bem */ } };

// Celular e tablet (<860): uma vista por vez. Desktop: lista ao lado da página.
const DESK = '(min-width: 860px)';
const isDeskNow = () => typeof window !== 'undefined' && !!window.matchMedia?.(DESK).matches;
const calmNow = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function useDesk() {
  const [desk, setDesk] = useState(isDeskNow);
  useEffect(() => {
    const mq = window.matchMedia?.(DESK);
    if (!mq) return undefined;
    const on = () => setDesk(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return desk;
}

// Degradê nas pontas de uma fileira que rola de lado: indica que há mais.
function useEdgeFade(ref, deps) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const upd = () => {
      el.dataset.l = el.scrollLeft > 4 ? '1' : '';
      el.dataset.r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4 ? '1' : '';
    };
    upd();
    el.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    return () => { el.removeEventListener('scroll', upd); window.removeEventListener('resize', upd); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// Estado de navegação: página aberta, busca, capítulo, índice completo e de onde a página veio.
const EMPTY = { id: null, q: '', cat: null, all: false, ret: null };
const viewOf = (s) => (s.id ? 'article' : (s.q.trim() || s.cat || s.all) ? 'list' : 'cover');
const hashOf = (s) => (s.id ? grimoireHash(s.id) : s.q.trim() ? `#grimorio?q=${encodeURIComponent(s.q.trim())}` : '#grimorio');
const fromEntry = (st) => ({ ...EMPTY, id: st.id || null, q: st.q || '', cat: st.cat || null, all: !!st.all, ret: st.ret || null });
const here = () => window.location.pathname + window.location.search;
const isGrimHash = () => /^#grimo/i.test(window.location.hash);
const clearHash = () => { try { if (isGrimHash()) history.replaceState(null, '', here()); } catch { /* ok */ } };
// Entrada do Grimório de verdade: tem o nosso estado E ainda está num #grimorio… (outras
// telas reaproveitam history.state ao trocar o hash, como a campanha).
const isGrimEntry = (st) => !!st && st.grim != null && isGrimHash();

// Lupa (o conjunto de ícones do app não tem uma).
const SearchGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" />
  </svg>
);

// Destaca todos os termos buscados num texto curto (sem acento/maiúsculas).
function Marked({ text, query }) {
  const plain = String(text || '');
  const ranges = markRanges(plain, query);
  if (!ranges.length) return plain;
  const out = [];
  let at = 0;
  ranges.forEach(([s, e], i) => {
    if (s > at) out.push(plain.slice(at, s));
    out.push(<mark key={i}>{plain.slice(s, e)}</mark>);
    at = e;
  });
  if (at < plain.length) out.push(plain.slice(at));
  return <>{out}</>;
}

const Gem = () => <i className="grim-gem" aria-hidden />;
const PTitle = ({ id, children }) => <h2 className="grim-ptitle" id={id}><Gem />{children}</h2>;

function Cover({ lang, tx, isDesk, recent, byId, catCount, pathOpen, onTogglePath, openArticle, openCat, openIndex, openRandom }) {
  const recentRef = useRef(null);
  const recentList = recent.map((id) => byId.get(id)).filter(Boolean);
  const path = START_PATH.map((id) => byId.get(id)).filter(Boolean);
  useEdgeFade(recentRef, [recentList.length, lang]);
  const link = (a, className, children) => (
    <a key={a.id} className={className} href={grimoireHash(a.id)} onClick={(e) => { e.preventDefault(); openArticle(a.id); }}>{children}</a>
  );
  return (
    <div className="grim-cover">
      {recentList.length > 0 && (
        <section className="grim-recent" aria-labelledby="grim-recent-h">
          <PTitle id="grim-recent-h">{tx('recent')}</PTitle>
          <div className="grim-runes grim-fade" ref={recentRef}>
            {recentList.map((a) => link(a, 'grim-rune', a.title[lang]))}
          </div>
        </section>
      )}

      <div className="grim-cover-grid">
        <section className={`grim-path ${pathOpen ? 'is-open' : ''}`} aria-labelledby="grim-path-h">
          {isDesk ? (
            <h2 className="grim-path-h" id="grim-path-h">{tx('start')}</h2>
          ) : (
            <h2 className="grim-path-h" id="grim-path-h">
              <button type="button" className="grim-path-toggle" aria-expanded={pathOpen} aria-controls="grim-path-list" onClick={onTogglePath}>
                <span>✦ {pathOpen ? tx('start') : tx('startShort')}</span>
                <Icon name="chevron-down" size={18} />
              </button>
            </h2>
          )}
          {pathOpen && (
            <div id="grim-path-list">
              <p className="grim-path-sub">{tx('startSub')}</p>
              <ol>
                {path.map((a, i) => (
                  <li key={a.id}>
                    {link(a, 'grim-path-step', <><span className="grim-wax" aria-hidden>{i + 1}</span><span className="grim-path-t">{a.title[lang]}</span></>)}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <section className="grim-chapters-box" aria-labelledby="grim-chapters-h">
          <PTitle id="grim-chapters-h">{tx('chapters')}</PTitle>
          <div className="grim-chapters">
            {CATEGORIES.map((c) => (
              <div key={c.id} className="grim-chapter">
                <ChapterIcon cat={c} size={52} className="grim-chapter-art" />
                <div className="grim-chapter-body">
                  <h3 className="grim-chapter-name">
                    <button type="button" className="grim-chapter-btn" onClick={() => openCat(c.id)}>{c.name[lang]}</button>
                  </h3>
                  <p className="grim-chapter-blurb">{CAT_BLURB[c.id]?.[lang]}</p>
                  <p className="grim-chapter-n">{TXT.results[lang](catCount.get(c.id) || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grim-cover-actions">
        <button type="button" className="btn btn-ghost grim-act" onClick={openIndex}>
          <span aria-hidden>☰</span> <span className="grim-l-short">{tx('indexShort')}</span><span className="grim-l-long">{tx('index')}</span> · {TXT.results[lang](ARTICLES.length)}
        </button>
        <button type="button" className="btn btn-ghost grim-act" onClick={openRandom}>
          <span aria-hidden>✦</span> {tx('random')}
        </button>
      </div>
    </div>
  );
}

// Cabeçalho do capítulo (ou do índice) na lista; no desktop, também na área principal.
function ListHead({ lang, tx, cat, count, onOpenFirst }) {
  return (
    <section className="grim-lhead grim-panel">
      {cat ? <ChapterIcon cat={cat} size={64} className="grim-lhead-art" /> : <span className="grim-lhead-art grim-lhead-index" aria-hidden>☰</span>}
      <div className="grim-lhead-body">
        <p className="grim-eyebrow">{cat ? tx('chapter') : tx('title')}</p>
        <h2 className="grim-lhead-title"><span className="grim-foil">{cat ? cat.name[lang] : tx('index')}</span></h2>
        <p className="grim-lhead-blurb">{cat ? CAT_BLURB[cat.id]?.[lang] : tx('indexSub')}</p>
        <p className="grim-lhead-n">{TXT.results[lang](count)}</p>
        {onOpenFirst && count > 0 && (
          <button type="button" className="btn btn-primary grim-lhead-go" onClick={onOpenFirst}>{tx('openFirst')}</button>
        )}
      </div>
    </section>
  );
}

function Empty({ lang, tx, onPick, onCover }) {
  return (
    <div className="grim-empty">
      <p className="grim-empty-msg">{tx('none')}</p>
      <div className="grim-empty-more">
        <p className="grim-empty-try">{tx('tryThese')}</p>
        <div className="grim-runes is-wrap">
          {SUGGEST[lang].map((w) => <button key={w} type="button" className="grim-rune" onClick={() => onPick(w)}>{w}</button>)}
        </div>
        <button type="button" className="btn btn-ghost grim-btn" onClick={onCover}><Icon name="book" size={16} /> {tx('seeChapters')}</button>
        <p className="grim-nothere">{tx('notHere')}</p>
      </div>
    </div>
  );
}

export default function GrimoireScreen({ lang, initialId = null, initialQuery = '', openSeq = 0, backTo = null, onBack }) {
  const tx = (k, ...args) => { const v = TXT[k][lang] ?? TXT[k].en; return typeof v === 'function' ? v(...args) : v; };
  const isDesk = useDesk();
  const [s, setS] = useState(() => ({ ...EMPTY, id: findArticle(ARTICLES, initialId)?.id || null, q: initialQuery || '' }));
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState(loadRecent);
  const [pathPref, setPathPref] = useState(loadPathPref);
  const [finding, setFinding] = useState(false); // celular, página aberta: o campo de busca abriu pelo 🔍
  const [popN, setPopN] = useState(0);
  const [stuck, setStuck] = useState(false);

  const sRef = useRef(s);
  sRef.current = s;
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  // Histórico: nível da entrada atual (0 = a 1ª do Grimório), como o Grimório começou
  // ('push' = empurrou uma entrada ao abrir; 'hash' = chegou por um link #grimorio…),
  // em que nível está a capa (se estiver na pilha) e se o "Voltar" está saindo.
  const depth = useRef(0);
  const base = useRef('push');
  const coverAt = useRef(null);
  const leaving = useRef(false);
  const leaveTimer = useRef(null);
  const pendingY = useRef(null); // rolagem a aplicar depois de um "voltar"
  const searchRef = useRef(null);
  const chipsRef = useRef(null);
  const sentinelRef = useRef(null);

  const index = useMemo(() => buildIndex(ARTICLES, lang), [lang]);
  const byId = useMemo(() => new Map(ARTICLES.map((a) => [a.id, a])), []);
  const catById = useMemo(() => new Map(CATEGORIES.map((c) => [c.id, c])), []);
  const results = useMemo(() => search(index, s.q, { cat: s.cat }), [index, s.q, s.cat]);
  const open = s.id ? byId.get(s.id) : null;
  const view = viewOf(s);
  const hasQuery = !!s.q.trim();
  const browsing = view !== 'cover' && !!(hasQuery || s.cat || s.all);
  const curCat = s.cat ? catById.get(s.cat) : null;

  // Contagem por capítulo: depende só da busca (não do capítulo escolhido).
  const catCount = useMemo(() => {
    const m = new Map();
    for (const a of search(index, s.q)) m.set(a.cat, (m.get(a.cat) || 0) + 1);
    return m;
  }, [index, s.q]);

  // Página anterior/próxima dentro do mesmo capítulo, e "3 de 14".
  const [prev, next, pos] = useMemo(() => {
    if (!open) return [null, null, null];
    const same = ARTICLES.filter((a) => a.cat === open.cat);
    const i = same.findIndex((a) => a.id === open.id);
    return [same[i - 1] || null, same[i + 1] || null, { i: i + 1, n: same.length }];
  }, [open]);

  const entry = (n) => ({ grim: depth.current, base: base.current, c0: coverAt.current, id: n.id, q: n.q, cat: n.cat, all: n.all, ret: n.ret });

  /* Muda de vista. Empurra uma entrada no histórico quando a vista (ou a página)
   * muda; dentro da mesma vista (digitar, trocar de chip) só substitui a atual. */
  const go = (patch, mode = 'auto') => {
    const cur = sRef.current;
    const n = { ...EMPTY, ...patch };
    const push = mode === 'push' || (mode === 'auto' && (viewOf(n) !== viewOf(cur) || (!!n.id && n.id !== cur.id)));
    try {
      if (push) {
        // A entrada que fica para trás guarda a rolagem (o "voltar" devolve a pessoa ao mesmo ponto).
        history.replaceState({ ...(history.state || {}), y: window.scrollY }, '');
        depth.current += 1;
        if (coverAt.current != null && coverAt.current >= depth.current) coverAt.current = null;
      }
      if (viewOf(n) === 'cover') coverAt.current = depth.current;
      else if (!push && coverAt.current === depth.current) coverAt.current = null;
      if (push) history.pushState(entry(n), '', hashOf(n));
      else history.replaceState({ ...entry(n), y: history.state?.y }, '', hashOf(n));
    } catch { /* sem histórico (ex.: sandbox): segue só com o estado */ }
    setS(n);
  };

  const toTop = (smooth = false) => requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: smooth && !calmNow() ? 'smooth' : 'auto' });
  });

  const openArticle = (id) => {
    const cur = sRef.current;
    const v = viewOf(cur);
    // Da lista, a página lembra o nível e a rolagem dela ("‹ Resultados").
    const ret = v === 'list' ? { level: depth.current, y: window.scrollY } : v === 'article' ? cur.ret : null;
    go({ id, q: cur.q, cat: cur.cat, all: cur.all, ret });
    setCopied(false);
    setFinding(false);
    setRecent((r) => { const nr = [id, ...r.filter((x) => x !== id)].slice(0, 6); saveRecent(nr); return nr; });
    toTop(!isDeskNow());
  };

  // "Capa" volta pelo histórico até a capa (se ela estiver na pilha). Com forcePush (botão
  // "Grimório" do cabeçalho), empurra uma capa nova: o "voltar" devolve a página.
  const toCover = (forcePush = false) => {
    forcePush = forcePush === true;
    setFinding(false);
    const cur = sRef.current;
    if (viewOf(cur) === 'cover') { toTop(); return; }
    const k = coverAt.current != null ? depth.current - coverAt.current : 0;
    if (k > 0 && !forcePush) {
      pendingY.current = 0;
      try { history.go(-k); return; } catch { pendingY.current = null; }
    }
    go({}, 'push');
    toTop();
  };

  const backToList = () => {
    setFinding(false);
    const cur = sRef.current;
    const lvl = cur.ret?.level;
    if (lvl != null && depth.current > lvl) {
      try { history.go(-(depth.current - lvl)); return; } catch { /* segue */ }
    }
    const y = cur.ret?.y ?? 0;
    go({ q: cur.q, cat: cur.cat, all: cur.all }, 'push');
    requestAnimationFrame(() => window.scrollTo(0, y));
  };

  const openCat = (id) => { go({ cat: id }); toTop(); };
  const openIndex = () => { go({ all: true }); toTop(); };
  const openRandom = () => openArticle(ARTICLES[Math.floor(Math.random() * ARTICLES.length)].id);
  const pickAll = () => go({ ...sRef.current, cat: null, all: true });
  // Tocar de novo no capítulo ativo desmarca (e a lista vira o índice, em vez de sumir).
  const pickCat = (id) => {
    const cur = sRef.current;
    go(cur.cat === id ? { ...cur, cat: null, all: true } : { ...cur, cat: id });
  };

  const onType = (v) => {
    const cur = sRef.current;
    if (cur.id && !isDeskNow()) {
      // Celular: a 1ª letra com a página aberta fecha a página e mostra a lista (o "voltar" devolve a página).
      go({ q: v, cat: cur.cat, all: cur.all });
      setFinding(false);
      return;
    }
    const n = { ...cur, q: v };
    // Apagou tudo na lista: esta entrada vira a capa (sem empurrar a cada tecla).
    go(n, !cur.id && viewOf(n) === 'cover' ? 'replace' : 'auto');
  };

  const clearQuery = () => {
    const cur = sRef.current;
    if (!cur.id && !cur.cat && !cur.all) toCover();
    else go({ ...cur, q: '' }, 'replace');
    searchRef.current?.focus();
  };

  // 🔍 na página (celular): abre o MESMO campo e foca dentro do toque (o iOS só abre o teclado assim).
  const openFind = () => {
    flushSync(() => setFinding(true));
    const el = searchRef.current;
    if (el) { el.focus(); el.select(); }
  };

  const leave = () => {
    const d = depth.current;
    clearTimeout(leaveTimer.current);
    const hashAt = window.location.hash;
    // Se o histórico não responder (nada mudou), sai mesmo assim.
    const fallback = () => {
      leaveTimer.current = setTimeout(() => {
        if (window.location.hash !== hashAt || history.state?.grim !== d) return;
        leaving.current = false;
        clearHash();
        onBackRef.current();
      }, 800);
    };
    try {
      if (base.current === 'push') { history.go(-(d + 1)); fallback(); return; }
      if (d > 0) { leaving.current = true; history.go(-d); fallback(); return; }
    } catch { leaving.current = false; }
    clearHash();
    onBack();
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${grimoireHash(sRef.current.id)}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { window.prompt(tx('copy'), url); }
  };
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  // Ao montar: a 1ª entrada do Grimório. Pelo cabeçalho/atalhos, empurra uma entrada
  // nova; por link (#grimorio/…), assume a entrada do próprio link. O StrictMode monta
  // duas vezes em dev: o ref impede a 2ª entrada.
  const inited = useRef(false);
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const cur = sRef.current;
    try {
      const st = history.state;
      if (isGrimEntry(st)) {
        // Voltou (ou recarregou) numa entrada do Grimório: ela manda.
        depth.current = st.grim;
        base.current = st.base || 'push';
        coverAt.current = st.c0 ?? null;
        if (!st.id || st.id === cur.id) setS(fromEntry(st));
      } else if (isGrimHash()) {
        base.current = 'hash';
        coverAt.current = viewOf(cur) === 'cover' ? 0 : null;
        history.replaceState(entry(cur), '', hashOf(cur));
      } else {
        base.current = 'push';
        coverAt.current = viewOf(cur) === 'cover' ? 0 : null;
        history.pushState(entry(cur), '', hashOf(cur));
      }
    } catch { /* sem histórico: tudo bem */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // "Voltar" do celular/navegador.
  useEffect(() => {
    const onPop = (e) => {
      clearTimeout(leaveTimer.current);
      const st = e.state;
      if (leaving.current) { leaving.current = false; clearHash(); onBackRef.current(); return; }
      if (isGrimEntry(st)) {
        depth.current = st.grim;
        base.current = st.base || base.current;
        coverAt.current = st.c0 ?? null;
        if (pendingY.current == null) pendingY.current = st.y ?? 0;
        setFinding(false);
        setCopied(false);
        setS(fromEntry(st));
        setPopN((x) => x + 1);
        return;
      }
      // Um #grimorio… novo sem estado (digitado na barra de endereço): continua aqui.
      const h = parseGrimoireHash(window.location.hash);
      if (h) {
        depth.current += 1;
        const n = { ...EMPTY, id: findArticle(ARTICLES, h.id)?.id || null, q: h.q || '' };
        try { history.replaceState(entry(n), '', hashOf(n)); } catch { /* ok */ }
        pendingY.current = 0;
        setS(n);
        setPopN((x) => x + 1);
        return;
      }
      onBackRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rolagem guardada da entrada para onde o "voltar" levou.
  useLayoutEffect(() => {
    if (pendingY.current == null) return;
    const y = pendingY.current;
    pendingY.current = null;
    window.scrollTo(0, y);
  }, [popN]);

  // A rolagem quem cuida é o Grimório. Saiu por outro caminho (logo, Campanhas, menu da
  // conta)? A tela nova ganha uma entrada sem o #grimo… — a URL fica limpa e o "voltar"
  // reabre a última página do Grimório. O alive separa a saída de verdade da desmontagem
  // de teste do StrictMode (que remonta na hora).
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    let prevRestore = null;
    try { prevRestore = history.scrollRestoration; history.scrollRestoration = 'manual'; } catch { /* ok */ }
    return () => {
      alive.current = false;
      clearTimeout(leaveTimer.current);
      try { if (prevRestore) history.scrollRestoration = prevRestore; } catch { /* ok */ }
      setTimeout(() => {
        if (alive.current || !isGrimHash()) return;
        try { history.pushState(null, '', here()); } catch { /* ok */ }
      }, 0);
    };
  }, []);

  // Link novo enquanto a tela está aberta: abre a página.
  const firstId = useRef(true);
  useEffect(() => {
    if (firstId.current) { firstId.current = false; return; }
    const a = findArticle(ARTICLES, initialId);
    if (a && a.id !== sRef.current.id) go({ ...sRef.current, id: a.id }, 'replace');
  }, [initialId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Botão "Grimório" do cabeçalho com o Grimório aberto: volta para a capa (ignora o valor da montagem).
  const seq = useRef(openSeq);
  useEffect(() => {
    if (openSeq === seq.current) return;
    seq.current = openSeq;
    toCover(true);
  }, [openSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // "/" foca a busca (fora de campos de texto).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
      e.preventDefault();
      if (sRef.current.id && !isDeskNow()) openFind();
      else searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Barra fixa "presa" no topo: ganha fundo de ponta a ponta e filete.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // O chip ativo fica à vista na fileira (celular).
  useEdgeFade(chipsRef, [view, lang]);
  useEffect(() => {
    const row = chipsRef.current;
    if (!row || row.scrollWidth <= row.clientWidth) return;
    const on = row.querySelector('.grim-chip.on');
    if (on) row.scrollLeft = Math.max(0, on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2);
  }, [s.cat, view]);

  const pathOpen = isDesk || (pathPref ?? recent.length === 0);
  const togglePath = () => { const v = !pathOpen; setPathPref(v); savePathPref(v); };

  const listLabel = hasQuery ? tx('resultsN', results.length) : curCat ? curCat.name[lang] : s.all ? tx('indexShort') : tx('cover');
  const backLabel = hasQuery ? tx('backResults') : curCat ? tx('backChapter') : tx('backIndex');
  const backHome = BACK_TO[backTo]?.[lang] || tx('back');
  const showHead = !hasQuery && (curCat || s.all);
  const grouped = !hasQuery && !s.cat;

  const rows = useMemo(() => {
    if (view === 'cover') return null; // a capa não tem lista
    const out = [];
    let lastCat = null;
    for (const a of results) {
      if (grouped && a.cat !== lastCat) {
        const c = catById.get(a.cat);
        out.push(<li key={`g-${a.cat}`} className="grim-group"><ChapterIcon cat={c} size={20} /> {c?.name[lang]}</li>);
      }
      lastCat = a.cat;
      const c = catById.get(a.cat);
      out.push(
        <li key={a.id}>
          <a href={grimoireHash(a.id)} className={`grim-item ${a.id === s.id ? 'on' : ''}`} aria-current={a.id === s.id ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); openArticle(a.id); }}>
            {hasQuery && !s.cat && <span className="grim-item-cat"><ChapterIcon cat={c} size={16} /> {c?.name[lang]}</span>}
            <span className="grim-item-title"><Marked text={a.title[lang]} query={s.q} /></span>
            <span className="grim-item-snip"><Marked text={snippetFor(a, s.q, lang)} query={s.q} /></span>
          </a>
        </li>,
      );
    }
    return out;
  }, [view, results, s.q, s.cat, s.id, lang, grouped]); // eslint-disable-line react-hooks/exhaustive-deps

  const best = hasQuery ? results[0] : null;

  return (
    <div className={`grim v-${view} ${browsing ? 'is-browsing' : ''} ${finding ? 'is-finding' : ''}`}>
      <div className="grim-sky" aria-hidden />

      <div className="grim-top">
        <button type="button" className="btn btn-ghost grim-btn grim-leave" onClick={leave}>
          <Icon name="arrow-back" size={16} /> <span>{backHome}</span>
        </button>
        {view !== 'cover' && <h1 className="grim-mini-title"><span className="grim-foil">{tx('title')}</span></h1>}
        {view !== 'cover' && (
          <button type="button" className="btn btn-ghost grim-btn grim-tocover" onClick={toCover} aria-label={tx('coverAria')} title={tx('coverAria')}>
            <span className="grim-sigil-mini" aria-hidden>✦</span> {tx('cover')}
          </button>
        )}
      </div>

      {view === 'cover' && (
        <header className="grim-band grim-panel has-corners">
          <img className="grim-band-art" src={GRIMOIRE_ART} alt="" decoding="async" onError={hideOnError} />
          <div className="grim-band-text">
            <div className="grim-sigil" aria-hidden><span>✦</span></div>
            <div className="grim-band-words">
              <h1 className="grim-title"><span className="grim-foil">{tx('title')}</span></h1>
              <p className="grim-sub">{tx('sub')}</p>
            </div>
          </div>
        </header>
      )}

      <div className="grim-sentinel" ref={sentinelRef} aria-hidden />
      <form className={`grim-bar ${stuck ? 'is-stuck' : ''}`} role="search"
        onSubmit={(e) => { e.preventDefault(); if (!isDeskNow()) searchRef.current?.blur(); }}>
        {view !== 'cover' && (
          <button type="button" className="btn btn-ghost grim-btn grim-bar-back"
            onClick={view === 'list' ? toCover : browsing ? backToList : toCover}
            aria-label={view === 'list' ? tx('coverAria') : undefined} title={view === 'list' ? tx('coverAria') : undefined}>
            <Icon name="chevron-left" size={18} />
            {view === 'article' && <span>{listLabel}</span>}
          </button>
        )}
        <div className="grim-search">
          <SearchGlyph />
          <input
            ref={searchRef}
            type="search"
            enterKeyHint="search"
            value={s.q}
            onChange={(e) => onType(e.target.value)}
            onBlur={() => { if (sRef.current.id) setFinding(false); }}
            placeholder={tx('searchPh')}
            aria-label={tx('search')}
            autoComplete="off"
            spellCheck={false}
          />
          {s.q && (
            <button type="button" className="grim-clear" onClick={clearQuery} aria-label={tx('clear')} title={tx('clear')}
              onMouseDown={(e) => e.preventDefault()}>
              <Icon name="x" size={18} />
            </button>
          )}
          <kbd className="grim-kbd" title={tx('shortcut')}>/</kbd>
        </div>
        {view === 'article' && (
          <>
            <button type="button" className="btn btn-ghost grim-btn grim-bar-find" onClick={openFind} aria-label={tx('find')} title={tx('find')}>
              <SearchGlyph />
            </button>
            <button type="button" className={`btn btn-ghost grim-btn grim-bar-copy ${copied ? 'is-done' : ''}`} onClick={copyLink} title={tx('copy')}>
              <Icon name={copied ? 'check' : 'share'} size={16} />
              <span className="grim-l-short">{copied ? tx('copiedShort') : tx('copyShort')}</span>
              <span className="grim-l-long">{copied ? tx('copied') : tx('copy')}</span>
            </button>
          </>
        )}
      </form>

      <div className="grim-layout">
        {view !== 'cover' && (
          <aside className="grim-side" aria-label={tx('listAria')}>
            <div className="grim-chips grim-fade" ref={chipsRef} role="group" aria-label={tx('chapters')}>
              <button type="button" className={`grim-chip ${!s.cat ? 'on' : ''}`} aria-pressed={!s.cat} onClick={pickAll}>
                {tx('all')} <span className="grim-chip-n">{[...catCount.values()].reduce((x, y) => x + y, 0)}</span>
              </button>
              {CATEGORIES.map((c) => {
                const n = catCount.get(c.id) || 0;
                return (
                  <button key={c.id} type="button" className={`grim-chip ${s.cat === c.id ? 'on' : ''}`} aria-pressed={s.cat === c.id}
                    onClick={() => pickCat(c.id)} disabled={!n} title={!n ? tx('zeroChip') : undefined}>
                    <ChapterIcon cat={c} size={18} /> {c.name[lang]} <span className="grim-chip-n">{n}</span>
                  </button>
                );
              })}
            </div>
            {showHead && <ListHead lang={lang} tx={tx} cat={curCat} count={results.length} />}
            <div className="grim-count">{TXT.results[lang](results.length)}</div>
            <ul className="grim-list">
              {rows}
              {hasQuery && results.length > 0 && <li className="grim-nothere">{tx('notHere')}</li>}
              {!results.length && (
                <li><Empty lang={lang} tx={tx} onPick={(w) => { onType(w); searchRef.current?.focus(); }} onCover={toCover} /></li>
              )}
            </ul>
          </aside>
        )}

        <div className="grim-main">
          {view === 'article' && open && (
            <>
              <ArticleView article={open} lang={lang} categories={CATEGORIES} byId={byId} onOpen={openArticle} prev={prev} next={next} pos={pos} />
              <div className="grim-article-foot">
                {browsing && (
                  <button type="button" className="btn btn-ghost grim-btn grim-foot-back" onClick={backToList}>
                    <Icon name="chevron-left" size={16} /> {backLabel}
                  </button>
                )}
                <button type="button" className="btn btn-ghost grim-btn" onClick={toCover}>
                  <Icon name="book" size={16} /> {tx('cover')}
                </button>
              </div>
            </>
          )}
          {view === 'list' && (
            <div className="grim-guide">
              {showHead && (
                <ListHead lang={lang} tx={tx} cat={curCat} count={results.length} onOpenFirst={() => results[0] && openArticle(results[0].id)} />
              )}
              {best && (
                <section className="grim-best grim-panel has-corners">
                  <p className="grim-eyebrow">{tx('best')}</p>
                  <div className="grim-best-cat"><ChapterIcon cat={catById.get(best.cat)} size={18} /> {catById.get(best.cat)?.name[lang]}</div>
                  <h2 className="grim-best-title">
                    <a href={grimoireHash(best.id)} onClick={(e) => { e.preventDefault(); openArticle(best.id); }}>
                      <Marked text={best.title[lang]} query={s.q} />
                    </a>
                  </h2>
                  <p className="grim-best-snip"><Marked text={snippetFor(best, s.q, lang)} query={s.q} /></p>
                  <button type="button" className="btn btn-primary grim-lhead-go" onClick={() => openArticle(best.id)}>{tx('openThis')}</button>
                  <p className="grim-best-hint">{tx('pickHint')}</p>
                  <p className="grim-nothere">{tx('notHere')}</p>
                </section>
              )}
              {hasQuery && !results.length && (
                <section className="grim-panel grim-guide-empty">
                  <Empty lang={lang} tx={tx} onPick={(w) => { onType(w); searchRef.current?.focus(); }} onCover={toCover} />
                </section>
              )}
            </div>
          )}
          {view === 'cover' && (
            <Cover lang={lang} tx={tx} isDesk={isDesk} recent={recent} byId={byId} catCount={catCount}
              pathOpen={pathOpen} onTogglePath={togglePath}
              openArticle={openArticle} openCat={openCat} openIndex={openIndex} openRandom={openRandom} />
          )}
          <p className="grim-foot">{tx('srdNote')}</p>
        </div>
      </div>
    </div>
  );
}
